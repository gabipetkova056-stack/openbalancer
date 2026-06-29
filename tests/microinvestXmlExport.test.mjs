/**
 * Tests for microinvestXmlExport.js — Microinvest Delta Pro TransferData XML.
 * Source-backed reference: FINTECT-PRO/MICROINVEST-OCR (provisional profile).
 * Run with `npm test` (node:test, ESM via .mjs).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { toMicroinvestTransferXml } from '../src/lib/parsers/microinvestXmlExport.js';

const sample = {
  invoiceNumber: 'INV-7', invoiceDate: '2026-06-21', vendor: 'Acme ЕООД',
  eik: '123456789', subtotal: 1000, tax: 200, taxRate: 20, total: 1200, currency: 'BGN',
};

function sumAttr(xml, attr) {
  return [...xml.matchAll(new RegExp(`${attr}="([\\d.]+)"`, 'g'))]
    .reduce((a, m) => a + Number(m[1]), 0);
}

test('root namespace is urn:Transfer and uses Accountings/Accounting', () => {
  const xml = toMicroinvestTransferXml([sample]);
  assert.match(xml, /<TransferData xmlns="urn:Transfer">/);
  assert.match(xml, /<Accountings>/);
  assert.match(xml, /<Accounting [^>]*VatTerm="1"/);
});

test('purchase invoice balances debit == credit', () => {
  const xml = toMicroinvestTransferXml([sample], { direction: 'purchase' });
  assert.equal(sumAttr(xml, 'Debit'), sumAttr(xml, 'Credit'));
  assert.equal(sumAttr(xml, 'Debit'), 1200);
});

test('VAT line generated when tax present; dot decimals used', () => {
  const xml = toMicroinvestTransferXml([sample]);
  assert.match(xml, /AccountNumber="453\/1" Debit="200.00"/);
  assert.match(xml, /Debit="1000.00"/);
});

test('no VAT line when tax absent', () => {
  const xml = toMicroinvestTransferXml([{ subtotal: 100, total: 100 }]);
  assert.ok(!xml.includes('453/1'));
});

test('company carries Bulstat/EIK', () => {
  const xml = toMicroinvestTransferXml([sample]);
  assert.match(xml, /<Company [^>]*Bulstat="123456789"/);
});

test('special chars are XML-escaped', () => {
  const xml = toMicroinvestTransferXml([{ vendor: 'A&B <"x"> ЕООД', total: 5 }]);
  assert.match(xml, /Name="A&amp;B &lt;&quot;x&quot;&gt; ЕООД"/);
  assert.ok(!xml.includes('<"x">'));
});

test('missing fields never produce undefined', () => {
  const xml = toMicroinvestTransferXml([{ invoiceNumber: '9' }]);
  assert.ok(!xml.includes('undefined'));
});

test('sale direction uses 411/703 mapping and balances', () => {
  const xml = toMicroinvestTransferXml([sample], { direction: 'sale' });
  assert.match(xml, /VatTerm="7"/);
  assert.match(xml, /AccountNumber="411"/);
  assert.equal(sumAttr(xml, 'Debit'), sumAttr(xml, 'Credit'));
});
