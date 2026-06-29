/**
 * invoiceParser.js — client-side Invoice OCR extraction.
 *
 * Inspired by invoice-x/invoice2data: extract structured fields from invoice
 * text (PDF-to-text output, plain text, CSV) entirely in-browser. Tuned for
 * Bulgarian invoices (ДДС / VAT, ЕИК / БУЛСТАТ, BGN) with English fallbacks.
 *
 * Produces an InvoiceRecord that mirrors the Supabase `invoices` schema, so the
 * same shape can later be written to the DB Agent or exported to CSV.
 */

/** Generate a stable invoice id. */
export function generateInvoiceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return 'inv-' + crypto.randomUUID();
  }
  const arr = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = (Date.now() + i) % 256;
  }
  return 'inv-' + Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

/** Heuristic: does this text look like an invoice? */
export function isInvoiceText(text) {
  if (!text) return false;
  const lc = text.toLowerCase();
  const signals = [
    'invoice', 'фактура', 'ддс', 'булстат', 'еик', 'vat',
    'invoice no', 'invoice number', '№ на фактура', 'total due',
    'subtotal', 'tax', 'данъчна основа', 'обща сума',
  ];
  const hits = signals.filter((s) => lc.includes(s)).length;
  return hits >= 2;
}

/** Parse a number written with either comma or dot decimals, with thousand seps. */
function toNumber(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/[^\d.,-]/g, '');
  if (!s) return null;
  // If both separators present, last one is the decimal separator.
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma > -1) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function firstMatch(text, patterns) {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

function normalizeDate(raw) {
  if (!raw) return null;
  const m = raw.match(/(\d{1,4})[.\-/](\d{1,2})[.\-/](\d{1,4})/);
  if (!m) return null;
  let [, a, b, c] = m;
  // YYYY-MM-DD already
  if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
  // DD.MM.YYYY → YYYY-MM-DD
  if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
  return null;
}

/** Map a file name to the actual input type that produced the record. */
function detectFileType(fileName = '') {
  if (/\.(png|jpe?g|webp|gif)$/i.test(fileName)) return 'image';
  if (/\.txt$/i.test(fileName)) return 'text';
  if (/\.json$/i.test(fileName)) return 'json';
  if (/\.csv$/i.test(fileName)) return 'csv';
  return 'unknown';
}

/**
 * Extract structured invoice fields from raw text.
 * @param {string} text
 * @param {string} fileName
 * @returns {object} InvoiceRecord
 */
export function parseInvoiceText(text, fileName = '') {
  const t = text || '';

  const vendor = firstMatch(t, [
    /(?:vendor|seller|supplier|продавач|доставчик|фирма)[:\s]+([^\n]{3,80})/i,
    /^([A-ZА-Я][^\n]{3,60}(?:ООД|ЕООД|АД|Ltd|LLC|Inc|GmbH))/m,
  ]);

  const invoiceNumber = firstMatch(t, [
    /(?:invoice\s*(?:no|number|#)|фактура\s*№|№\s*на\s*фактура|номер)[:\s#]*([A-Z0-9\-/]{3,30})/i,
  ]);

  const invoiceDate = normalizeDate(firstMatch(t, [
    /(?:invoice\s*date|дата(?:\s*на\s*издаване)?)[:\s]+([\d.\-/]{6,12})/i,
  ]));
  const dueDate = normalizeDate(firstMatch(t, [
    /(?:due\s*date|падеж|срок\s*за\s*плащане)[:\s]+([\d.\-/]{6,12})/i,
  ]));

  const subtotal = toNumber(firstMatch(t, [
    /(?:subtotal|данъчна\s*основа|сума\s*без\s*ддс)[:\s]+([\d.,]+)/i,
  ]));
  const tax = toNumber(firstMatch(t, [
    /(?:vat|tax|ддс)(?:\s*\(?\s*[\d.,]+\s*%\s*\)?)?[:\s]+([\d.,]+)/i,
  ]));
  const total = toNumber(firstMatch(t, [
    /(?:^|[^a-zа-я])(?:grand\s*)?total\s*(?:due)?[:\s]+([\d.,]+)/im,
    /(?:обща\s*сума|сума\s*за\s*плащане|всичко)[:\s]+([\d.,]+)/i,
  ]));
  const taxRate = toNumber(firstMatch(t, [
    /(?:vat|ддс)[:\s]*\(?\s*([\d.,]+)\s*%/i,
  ]));

  const eik = firstMatch(t, [/(?:еик|булстат|bulstat|eik)[:\s]*([0-9]{9,13})/i]);

  const currency = /\bbgn|лв\.?\b/i.test(t) ? 'BGN' : /\beur|€/i.test(t) ? 'EUR' : /\busd|\$/i.test(t) ? 'USD' : 'BGN';

  // Validation: subtotal + tax ≈ total
  let confidence = 0.5;
  if (vendor) confidence += 0.15;
  if (invoiceNumber) confidence += 0.1;
  if (total != null) confidence += 0.15;
  if (subtotal != null && tax != null && total != null) {
    if (Math.abs(subtotal + tax - total) <= 0.05) confidence += 0.1;
  }
  confidence = Math.min(1, confidence);

  return {
    id: generateInvoiceId(),
    fileName,
    fileType: detectFileType(fileName),
    vendor,
    invoiceNumber,
    invoiceDate,
    dueDate,
    eik,
    subtotal,
    tax,
    taxRate,
    total,
    currency,
    rawText: t.slice(0, 5000),
    confidence: Number(confidence.toFixed(2)),
    status: 'processed',
    processedBy: 'hermes-ocr-agent',
    createdAt: new Date().toISOString(),
  };
}
