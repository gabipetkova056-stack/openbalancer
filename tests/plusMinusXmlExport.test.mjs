import test from 'node:test';
import assert from 'node:assert/strict';
import { toPlusMinusXml } from '../src/lib/parsers/plusMinusXmlExport.js';

test('plus minus xml export contains invoice fields', () => {
  const xml = toPlusMinusXml([{
    invoiceNumber: 'INV-7',
    invoiceDate: '2026-06-21',
    vendor: 'Acme ЕООД',
    eik: '123456789',
    vatNumber: 'BG123456789',
    subtotal: 1000,
    tax: 200,
    total: 1200,
    currency: 'BGN',
  }]);
  assert.match(xml, /<PlusMinusInvoices>/);
  assert.match(xml, /Number="INV-7"/);
  assert.match(xml, /<EIK>123456789<\/EIK>/);
  assert.match(xml, /<VatNumber>BG123456789<\/VatNumber>/);
  assert.match(xml, /<Total>1200.00<\/Total>/);
});
