/**
 * microinvestXmlExport.js — export parsed invoices to a Microinvest Delta Pro
 * `TransferData` XML import file (double-entry / `<Accountings>` mode).
 *
 * Source-backed implementation reference: the `FINTECT-PRO/MICROINVEST-OCR`
 * pipeline (`pipeline/transform_ocr_to_delta.py`) transforms canonical OCR JSON
 * into Microinvest-compatible XML rather than a best-effort `;` CSV:
 *
 *   <TransferData xmlns="urn:Transfer">
 *     <Accountings>
 *       <Accounting Number=".." AccountingDate=".." Term=".." VatTerm="..">
 *         <Document DocumentType=".." Number=".." Date=".." />
 *         <Company Name=".." Bulstat=".." VatNumber=".." />
 *         <AccountingDetails>
 *           <AccountingDetail AccountNumber=".." Debit=".." Credit=".." />
 *           ...balanced...
 *         </AccountingDetails>
 *       </Accounting>
 *     </Accountings>
 *   </TransferData>
 *
 * This profile is PROVISIONAL: it mirrors the MICROINVEST-OCR TransferData
 * profile but is not yet live-validated against a Delta Pro import / golden
 * file. Account numbers and posting rules should be confirmed by an accountant
 * and the target Delta Pro version. Amounts use dot decimals (XML convention),
 * unlike the comma-decimal CSV reference export.
 */

/** DocumentType codes (MICROINVEST-OCR TransferData profile). */
const DOCUMENT_TYPE = { invoice: 1, debit_note: 2, credit_note: 3 };

/**
 * Default posting accounts (provisional; confirm with accountant / Delta Pro):
 *   purchase: Dr 602 net, Dr 453/1 VAT, Cr 401 gross
 *   sale:     Dr 411 gross, Cr 703 net, Cr 453/2 VAT
 */
const ACCOUNTS = {
  purchase: { net: '602', vat: '453/1', partner: '401' },
  sale: { net: '703', vat: '453/2', partner: '411' },
};

/** VatTerm: purchase 20% → 1, sale 20% → 7, exempt → 6, none → 0. */
function vatTerm(direction, taxRate, tax) {
  const hasVat = Number(tax) > 0 || Number(taxRate) > 0;
  if (!hasVat) return Number(taxRate) === 0 && tax != null ? 6 : 0;
  return direction === 'sale' ? 7 : 1;
}

function docTypeFor(rec) {
  const t = String(rec?.documentType || rec?.docType || '').toLowerCase();
  if (t.includes('credit')) return DOCUMENT_TYPE.credit_note;
  if (t.includes('debit')) return DOCUMENT_TYPE.debit_note;
  return DOCUMENT_TYPE.invoice;
}

/** Escape text for use in XML element/attribute values. */
export function xmlEscape(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Format an amount with dot decimals (XML convention), '' if missing. */
function xmlAmount(v) {
  if (v == null || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(2);
}

/** ISO YYYY-MM-DD → dd.MM.yyyy; passthrough/empty if not ISO. */
function xmlDate(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}

/** Build balanced double-entry detail rows for one invoice. */
function buildDetails(rec, direction) {
  const acc = ACCOUNTS[direction] || ACCOUNTS.purchase;
  const subtotal = Number(rec.subtotal);
  const tax = Number(rec.tax);
  const total = Number(rec.total);
  // Synthesize totals when only a single value is present (summary line).
  const net = Number.isFinite(subtotal) ? subtotal : Number.isFinite(total) && Number.isFinite(tax) ? total - tax : Number.isFinite(total) ? total : 0;
  const vat = Number.isFinite(tax) ? tax : 0;
  const gross = Number.isFinite(total) ? total : net + vat;
  const rows = [];
  if (direction === 'sale') {
    rows.push({ account: acc.partner, debit: gross, credit: 0 });
    rows.push({ account: acc.net, debit: 0, credit: net });
    if (vat > 0) rows.push({ account: acc.vat, debit: 0, credit: vat });
  } else {
    rows.push({ account: acc.net, debit: net, credit: 0 });
    if (vat > 0) rows.push({ account: acc.vat, debit: vat, credit: 0 });
    rows.push({ account: acc.partner, debit: 0, credit: gross });
  }
  return rows;
}

/**
 * Build a Microinvest Delta Pro `TransferData` XML import string.
 * @param {object[]} invoices InvoiceRecord-shaped objects from invoiceParser
 * @param {{direction?: 'purchase'|'sale'}} [options] posting direction (default purchase)
 * @returns {string} XML document
 */
export function toMicroinvestTransferXml(invoices, options = {}) {
  const direction = options.direction === 'sale' ? 'sale' : 'purchase';
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<TransferData xmlns="urn:Transfer">', '  <Accountings>'];
  (invoices || []).forEach((rec, i) => {
    const number = i + 1;
    const date = xmlDate(rec.invoiceDate);
    const term = vatTerm(direction, rec.taxRate, rec.tax);
    lines.push(
      `    <Accounting Number="${number}" AccountingDate="${xmlEscape(date)}" Term="${xmlEscape(date)}" VatTerm="${term}">`
    );
    lines.push(
      `      <Document DocumentType="${docTypeFor(rec)}" Number="${xmlEscape(rec.invoiceNumber)}" Date="${xmlEscape(date)}" />`
    );
    lines.push(
      `      <Company Name="${xmlEscape(rec.vendor)}" Bulstat="${xmlEscape(rec.eik)}" VatNumber="${xmlEscape(rec.eik ? 'BG' + rec.eik : '')}" />`
    );
    lines.push('      <AccountingDetails>');
    for (const r of buildDetails(rec, direction)) {
      lines.push(
        `        <AccountingDetail AccountNumber="${xmlEscape(r.account)}" Debit="${xmlAmount(r.debit)}" Credit="${xmlAmount(r.credit)}" />`
      );
    }
    lines.push('      </AccountingDetails>');
    lines.push('    </Accounting>');
  });
  lines.push('  </Accountings>', '</TransferData>');
  return lines.join('\n');
}

export { DOCUMENT_TYPE, ACCOUNTS };
