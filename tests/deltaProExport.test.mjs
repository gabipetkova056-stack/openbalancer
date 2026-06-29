/**
 * Tests for deltaProExport.js — Microinvest Delta Pro invoice export format.
 * Run with `npm test` (node:test, ESM via .mjs).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { toDeltaProCsv, DP_COLUMNS } from '../src/lib/parsers/deltaProExport.js';

test('BG invoice: semicolon, comma decimals, dd.MM.yyyy', () => {
  const rows = [{
    invoiceNumber: 'INV-7', invoiceDate: '2026-06-21', vendor: 'Acme ЕООД',
    eik: '123456789', subtotal: 1000, tax: 200, total: 1200, currency: 'BGN',
  }];
  assert.equal(toDeltaProCsv(rows), 'INV-7;21.06.2026;Acme ЕООД;123456789;1000,00;200,00;1200,00;BGN');
});

test('missing fields render as empty, never undefined', () => {
  const out = toDeltaProCsv([{ invoiceNumber: '9' }]);
  assert.equal(out, '9;;;;;;;');
  assert.ok(!out.includes('undefined'));
});

test('semicolons/newlines in text are sanitized', () => {
  const out = toDeltaProCsv([{ vendor: 'A;B\nC', total: 5 }]);
  assert.equal(out.split(';').length, DP_COLUMNS.length);
  assert.ok(!out.includes('\n'));
});

test('rows are CRLF-separated; empty input yields empty string', () => {
  assert.equal(toDeltaProCsv([{ total: 1 }, { total: 2 }]).split('\r\n').length, 2);
  assert.equal(toDeltaProCsv([]), '');
});
