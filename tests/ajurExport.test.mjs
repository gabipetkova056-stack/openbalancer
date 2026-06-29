import test from 'node:test';
import assert from 'node:assert/strict';
import { toAjurCsv, AJUR_COLUMNS } from '../src/lib/parsers/ajurExport.js';

test('ajur csv export uses expected columns and semicolon delimiter', () => {
  const csv = toAjurCsv([{
    invoiceNumber: 'INV-1',
    invoiceDate: '2026-06-20',
    vendor: 'Vendor',
    eik: '123456789',
    vatNumber: 'BG123456789',
    subtotal: 100,
    tax: 20,
    total: 120,
    currency: 'BGN',
  }]);
  const [head, row] = csv.split('\n');
  assert.equal(head, AJUR_COLUMNS.join(';'));
  assert.match(row, /"INV-1";"2026-06-20";"Vendor";"123456789"/);
});
