export function toInvoiceApiPayload(invoices = [], options = {}) {
  const now = new Date().toISOString();
  const normalized = (invoices || []).map((rec) => ({
    id: rec.id,
    vendor: rec.vendor || '',
    invoiceNumber: rec.invoiceNumber || '',
    invoiceDate: rec.invoiceDate || '',
    dueDate: rec.dueDate || '',
    eik: rec.eik || '',
    vatNumber: rec.vatNumber || '',
    subtotal: Number(rec.subtotal || 0),
    tax: Number(rec.tax || 0),
    total: Number(rec.total || 0),
    currency: rec.currency || 'BGN',
    fileType: rec.fileType || 'unknown',
    status: rec.status || 'processed',
  }));

  return {
    version: '2026-06',
    generatedAt: now,
    system: options.system || 'openbalancer',
    whiteLabel: {
      enabled: Boolean(options.whiteLabel?.enabled),
      brandName: options.whiteLabel?.brandName || null,
    },
    invoices: normalized,
  };
}
