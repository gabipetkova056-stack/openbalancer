import test from 'node:test';
import assert from 'node:assert/strict';
import { toAjurCsv } from '../src/lib/parsers/ajurCsvExport.js';
import { toPlusMinusXml } from '../src/lib/parsers/plusMinusXmlExport.js';
import { validateBulgarianEik } from '../src/lib/parsers/bgValidation.js';

const sample = [{
  invoiceNumber: 'INV-100',
  invoiceDate: '2026-06-29',
  vendor: 'Demo ЕООД',
  eik: '123456789',
  subtotal: 100,
  tax: 20,
  total: 120,
  currency: 'BGN',
}];

test('Ajur CSV exports BG header and semicolon payload', () => {
  const csv = toAjurCsv(sample);
  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'Номер;Дата;Контрагент;ЕИК;Данъчна основа;ДДС;Общо;Валута');
  assert.equal(lines[1], 'INV-100;29.06.2026;Demo ЕООД;123456789;100,00;20,00;120,00;BGN');
});

test('Plus Minus XML exports invoice nodes', () => {
  const xml = toPlusMinusXml(sample);
  assert.match(xml, /<PlusMinusInvoices>/);
  assert.match(xml, /<Invoice Id="1" Number="INV-100" Date="2026-06-29" Partner="Demo ЕООД" Bulstat="123456789">/);
  assert.match(xml, /<Amounts TaxBase="100.00" Vat="20.00" Total="120.00" Currency="BGN" \/>/);
});

test('BG EIK validator flags invalid values', () => {
  const bad = validateBulgarianEik('123456789');
  assert.equal(bad.isValid, false);
  assert.equal(bad.reason, 'invalid_checksum');
});

test('BG EIK validator accepts known-good sample', () => {
  const ok = validateBulgarianEik('175074752');
  assert.equal(ok.isValid, true);
  assert.equal(ok.reason, 'ok');
});
