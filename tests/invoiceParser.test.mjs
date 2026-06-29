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
  const t = 'Фактура № 12\nЕИК: 175074752\nДата на издаване: 21.06.2026\nДанъчна основа: 1000,00\nДДС (20%): 200,00\nОбща сума: 1200,00 лв.';
  const r = parseInvoiceText(t, 'b.pdf');
  assert.equal(r.eik, '175074752');
  assert.equal(r.vatNumber, 'BG175074752');
  assert.equal(r.registryValidation.eikValid, true);
  assert.equal(r.registryValidation.viesEligible, true);
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

test('fileType reflects actual input, not pdf', () => {
  const t = 'Invoice No: INV-1\nTotal: 100.00 VAT';
  assert.equal(parseInvoiceText(t, 'a.txt').fileType, 'text');
  assert.equal(parseInvoiceText(t, 'a.json').fileType, 'json');
  assert.equal(parseInvoiceText(t, 'a.csv').fileType, 'csv');
  assert.equal(parseInvoiceText(t, 'a.png').fileType, 'image');
  assert.equal(parseInvoiceText(t, 'a.pdf').fileType, 'unknown');
  assert.notEqual(parseInvoiceText(t, 'a.txt').fileType, 'pdf');
});
