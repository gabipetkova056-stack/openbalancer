function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function amount(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

/**
 * XML export suitable as an import template for Plus Minus accounting flows.
 */
export function toPlusMinusXml(invoices = []) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<PlusMinusInvoices>'];
  for (const rec of invoices) {
    lines.push(`  <Invoice Number="${xmlEscape(rec.invoiceNumber)}" Date="${xmlEscape(rec.invoiceDate)}">`);
    lines.push(`    <Vendor>${xmlEscape(rec.vendor)}</Vendor>`);
    lines.push(`    <EIK>${xmlEscape(rec.eik)}</EIK>`);
    lines.push(`    <VatNumber>${xmlEscape(rec.vatNumber)}</VatNumber>`);
    lines.push(`    <Subtotal>${amount(rec.subtotal)}</Subtotal>`);
    lines.push(`    <Vat>${amount(rec.tax)}</Vat>`);
    lines.push(`    <Total>${amount(rec.total)}</Total>`);
    lines.push(`    <Currency>${xmlEscape(rec.currency || 'BGN')}</Currency>`);
    lines.push('  </Invoice>');
  }
  lines.push('</PlusMinusInvoices>');
  return lines.join('\n');
}
