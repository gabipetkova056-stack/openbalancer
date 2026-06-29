import test from 'node:test';
import assert from 'node:assert/strict';
import { toInvoiceApiPayload } from '../src/lib/parsers/jsonApiExport.js';

test('json api payload contains white-label metadata and invoices', () => {
  const payload = toInvoiceApiPayload([{
    id: 'inv-1',
    vendor: 'Acme',
    invoiceNumber: 'INV-1',
    invoiceDate: '2026-06-21',
    eik: '123456789',
    vatNumber: 'BG123456789',
    subtotal: 100,
    tax: 20,
    total: 120,
    currency: 'BGN',
    fileType: 'text',
  }], {
    whiteLabel: { enabled: true, brandName: 'Studio' },
  });

  assert.equal(payload.whiteLabel.enabled, true);
  assert.equal(payload.whiteLabel.brandName, 'Studio');
  assert.equal(payload.invoices[0].invoiceNumber, 'INV-1');
  assert.equal(payload.invoices[0].total, 120);
});
