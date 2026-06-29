/**
 * deltaProExport.js — export parsed invoices for Microinvest Delta Pro import.
 *
 * Delta Pro's "Импорт на документи" expects a text file with regional/BG
 * conventions that differ from the generic CSV export:
 *   - semicolon (`;`) field delimiter (Delta Pro default)
 *   - decimal comma for amounts (1200.00 → "1200,00")
 *   - dd.MM.yyyy dates (2026-06-21 → "21.06.2026")
 *   - amounts/EIK only — no header row, one invoice per line
 *
 * The file should be saved in Windows-1251 encoding before import (the browser
 * download is UTF-8; convert on disk if Delta Pro mis-renders Cyrillic).
 * This formatter is a best-effort reference — confirm column order against your
 * Delta Pro version's import template.
 */

const DP_COLUMNS = [
  'invoiceNumber',
  'invoiceDate',
  'vendor',
  'eik',
  'subtotal',
  'tax',
  'total',
  'currency',
];

/** Format a number with BG decimal comma and 2 decimals, or '' if missing. */
function dpNumber(v) {
  if (v == null || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(2).replace('.', ',');
}

/** Convert ISO YYYY-MM-DD to Delta Pro dd.MM.yyyy, or '' if missing/invalid. */
function dpDate(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** Escape a text field for a semicolon-delimited Delta Pro line. */
function dpText(v) {
  return String(v ?? '').replace(/[;\r\n]+/g, ' ').trim();
}

/**
 * Build a Delta Pro import file (semicolon-delimited, no header).
 * @param {object[]} rows InvoiceRecord-shaped objects from invoiceParser
 * @returns {string}
 */
export function toDeltaProCsv(rows) {
  return (rows || [])
    .map((r) =>
      DP_COLUMNS.map((c) => {
        if (c === 'invoiceDate') return dpDate(r[c]);
        if (c === 'subtotal' || c === 'tax' || c === 'total') return dpNumber(r[c]);
        return dpText(r[c]);
      }).join(';')
    )
    .join('\r\n');
}

export { DP_COLUMNS };
