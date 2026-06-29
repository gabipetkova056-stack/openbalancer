/**
 * Tests for invoiceParser.js — run with `npm test` (node:test, no deps).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInvoiceText, isInvoiceText } from '../src/lib/parsers/invoiceParser.js';

test('English invoice: dot decimals + sum validation', () => {
  const t = 'Invoice No: INV-7\nVendor: Acme Ltd\nInvoice date: 2026-06-21\nSubtotal: 1,000.00\nVAT 20%: 200.00\nTotal: 1,200.00 USD';
  const r = parseInvoiceText(t, 'a.pdf');
  assert.equal(r.vendor, 'Acme Ltd');
  assert.equal(r.invoiceNumber, 'INV-7');
  assert.equal(r.subtotal, 1000);
  assert.equal(r.tax, 200);
  assert.equal(r.total, 1200);
  assert.equal(r.currency, 'USD');
  assert.equal(r.confidence, 1); // sum balances → full confidence
});

test('Bulgarian invoice: comma decimals, BG date, ДДС, ЕИК, BGN', () => {
  const t = 'Фактура № 12\nЕИК: 123456789\nДата на издаване: 21.06.2026\nДанъчна основа: 1000,00\nДДС (20%): 200,00\nОбща сума: 1200,00 лв.';
  const r = parseInvoiceText(t, 'b.pdf');
  assert.equal(r.eik, '123456789');
  assert.equal(r.subtotal, 1000);
  assert.equal(r.tax, 200);
  assert.equal(r.total, 1200);
  assert.equal(r.currency, 'BGN');
  assert.equal(r.invoiceDate, '2026-06-21'); // DD.MM.YYYY normalized
});

test('total does not pick up Subtotal value', () => {
  const t = 'Vendor: X\nInvoice No: 9\nSubtotal: 500.00\nTotal: 600.00';
  const r = parseInvoiceText(t, 'c.txt');
  assert.equal(r.subtotal, 500);
  assert.equal(r.total, 600);
});

test('non-invoice text is rejected', () => {
  assert.equal(isInvoiceText('hello world, just a note'), false);
  assert.equal(isInvoiceText(''), false);
});

test('invoice text is detected', () => {
  assert.equal(isInvoiceText('Invoice number 5 — total due 100 VAT'), true);
});
