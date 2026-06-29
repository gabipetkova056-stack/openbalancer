/**
 * Tests for microinvestXmlExport.js — Microinvest Delta Pro TransferData XML.
 * Source-backed reference: FINTECT-PRO/MICROINVEST-OCR (provisional profile).
 * Detail rows use Amount + Direction + VatTerm, ISO dates, label Term.
 * Run with `npm test` (node:test, ESM via .mjs).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { toMicroinvestTransferXml } from '../src/lib/parsers/microinvestXmlExport.js';

const sample = {
  invoiceNumber: 'INV-7', invoiceDate: '2026-06-21', vendor: 'Acme ЕООД',
  eik: '123456789', subtotal: 1000, tax: 200, taxRate: 20, total: 1200, currency: 'BGN',
};

/** Sum Amount attributes for rows with a given Direction. */
function sumByDirection(xml, dir) {
  return [...xml.matchAll(/Amount="([\d.]+)" Direction="(\w+)"/g)]
    .filter((m) => m[2] === dir)
    .reduce((a, m) => a + Number(m[1]), 0);
}

test('root namespace is urn:Transfer and uses Accountings/Accounting', () => {
  const xml = toMicroinvestTransferXml([sample]);
  assert.match(xml, /<TransferData xmlns="urn:Transfer">/);
  assert.match(xml, /<Accountings>/);
  assert.match(xml, /<Accounting [^>]*VatTerm="1"/);
});

test('detail rows use Amount/Direction/VatTerm, never Debit/Credit attrs', () => {
  const xml = toMicroinvestTransferXml([sample]);
  assert.match(xml, /AccountNumber="602" Amount="1000.00" Direction="Debit" VatTerm="1"/);
  assert.ok(!/Debit="/.test(xml));
  assert.ok(!/Credit="/.test(xml));
});

test('purchase invoice balances debit == credit by Amount/Direction', () => {
  const xml = toMicroinvestTransferXml([sample], { direction: 'purchase' });
  assert.equal(sumByDirection(xml, 'Debit'), sumByDirection(xml, 'Credit'));
  assert.equal(sumByDirection(xml, 'Debit'), 1200);
  assert.match(xml, /AccountNumber="453\/1" Amount="200.00" Direction="Debit" VatTerm="1"/);
  assert.match(xml, /AccountNumber="401" Amount="1200.00" Direction="Credit" VatTerm="0"/);
});

test('no VAT line when tax absent', () => {
  const xml = toMicroinvestTransferXml([{ subtotal: 100, total: 100 }]);
  assert.ok(!xml.includes('453/1'));
});

test('company carries Bulstat/EIK', () => {
  const xml = toMicroinvestTransferXml([sample]);
  assert.match(xml, /<Company [^>]*Bulstat="123456789"/);
});

test('XML dates stay ISO; Term is a label not a date', () => {
  const xml = toMicroinvestTransferXml([sample]);
  assert.match(xml, /AccountingDate="2026-06-21"/);
  assert.match(xml, /<Document [^>]*Date="2026-06-21"/);
  assert.match(xml, /Term="Покупка"/);
  assert.ok(!/Term="21\.06\.2026"/.test(xml));
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

test('sale: 411/703/453-2 mapping, Продажба term, balances', () => {
  const xml = toMicroinvestTransferXml([sample], { direction: 'sale' });
  assert.match(xml, /Term="Продажба"/);
  assert.match(xml, /AccountNumber="411" Amount="1200.00" Direction="Debit"/);
  assert.match(xml, /AccountNumber="703" Amount="1000.00" Direction="Credit"/);
  assert.match(xml, /AccountNumber="453\/2" Amount="200.00" Direction="Credit"/);
  assert.equal(sumByDirection(xml, 'Debit'), sumByDirection(xml, 'Credit'));
});
