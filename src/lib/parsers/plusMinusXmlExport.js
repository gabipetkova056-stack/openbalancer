/**
 * plusMinusXmlExport.js — export parsed invoices to Plus Minus style XML.
 */

import { xmlEscape } from './microinvestXmlExport.js';

function amount(v) {
  if (v == null || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(2);
}

function dateIso(v) {
  if (!v) return '';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[0] : '';
}

/**
 * @param {object[]} invoices InvoiceRecord-shaped objects from invoiceParser
 * @returns {string}
 */
export function toPlusMinusXml(invoices) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<PlusMinusInvoices>'];
  (invoices || []).forEach((inv, idx) => {
    lines.push(
      `  <Invoice Id="${idx + 1}" Number="${xmlEscape(inv.invoiceNumber)}" Date="${xmlEscape(dateIso(inv.invoiceDate))}" Partner="${xmlEscape(inv.vendor)}" Bulstat="${xmlEscape(inv.eik)}">`
    );
    lines.push(
      `    <Amounts TaxBase="${amount(inv.subtotal)}" Vat="${amount(inv.tax)}" Total="${amount(inv.total)}" Currency="${xmlEscape(inv.currency || 'BGN')}" />`
    );
    lines.push('  </Invoice>');
  });
  lines.push('</PlusMinusInvoices>');
  return lines.join('\n');
}
