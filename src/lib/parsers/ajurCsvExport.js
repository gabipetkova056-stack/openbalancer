/**
 * ajurCsvExport.js — export parsed invoices to Ajur-friendly CSV.
 *
 * Format follows BG regional conventions commonly used by accounting imports:
 * semicolon delimiter, dd.MM.yyyy dates, comma decimals, UTF-8 text.
 */

const AJUR_COLUMNS = [
  'number',
  'date',
  'vendor',
  'eik',
  'taxBase',
  'vat',
  'total',
  'currency',
];

function ajurText(v) {
  return String(v ?? '').replace(/[;\r\n]+/g, ' ').trim();
}

function ajurNumber(v) {
  if (v == null || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(2).replace('.', ',');
}

function ajurDate(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/**
 * @param {object[]} rows InvoiceRecord-shaped objects from invoiceParser
 * @returns {string}
 */
export function toAjurCsv(rows) {
  const header = 'Номер;Дата;Контрагент;ЕИК;Данъчна основа;ДДС;Общо;Валута';
  const lines = (rows || []).map((r) => (
    [
      ajurText(r.invoiceNumber),
      ajurDate(r.invoiceDate),
      ajurText(r.vendor),
      ajurText(r.eik),
      ajurNumber(r.subtotal),
      ajurNumber(r.tax),
      ajurNumber(r.total),
      ajurText(r.currency || 'BGN'),
    ].join(';')
  ));
  return [header, ...lines].join('\r\n');
}

export { AJUR_COLUMNS };
