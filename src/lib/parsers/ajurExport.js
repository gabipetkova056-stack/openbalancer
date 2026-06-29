function esc(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function asMoney(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

const AJUR_COLUMNS = [
  'doc_no',
  'doc_date',
  'partner_name',
  'partner_bulstat',
  'partner_vat',
  'tax_base',
  'vat_amount',
  'total_amount',
  'currency',
];

/**
 * CSV export template for Ajur accounting import mappings.
 */
export function toAjurCsv(invoices = []) {
  const head = AJUR_COLUMNS.join(';');
  const rows = invoices.map((rec) => ([
    rec.invoiceNumber,
    rec.invoiceDate,
    rec.vendor,
    rec.eik,
    rec.vatNumber,
    asMoney(rec.subtotal),
    asMoney(rec.tax),
    asMoney(rec.total),
    rec.currency || 'BGN',
  ].map(esc).join(';')));
  return [head, ...rows].join('\n');
}

export { AJUR_COLUMNS };
