-- Supabase schema for the Invoice OCR system (DB Agent).
-- Mirrors the InvoiceRecord shape produced by src/lib/parsers/invoiceParser.js.

CREATE TABLE IF NOT EXISTS invoices (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  file_url         TEXT NOT NULL,
  file_type        TEXT CHECK (file_type IN ('pdf', 'image', 'text', 'json', 'csv', 'unknown')),
  vendor           TEXT,
  invoice_number   TEXT,
  invoice_date     DATE,
  due_date         DATE,
  eik              TEXT,                     -- БУЛСТАТ / ЕИК
  subtotal         DECIMAL(12,2),
  tax_amount       DECIMAL(12,2),
  tax_rate         DECIMAL(5,2),
  total            DECIMAL(12,2),
  currency         TEXT DEFAULT 'BGN',
  items            JSONB,
  raw_ocr_text     TEXT,
  confidence_score DECIMAL(5,2),
  status           TEXT DEFAULT 'processed'
                     CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  processed_by     TEXT DEFAULT 'hermes-ocr-agent',
  trace_id         TEXT,
  metadata         JSONB
);

CREATE TABLE IF NOT EXISTS invoice_templates (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_name    TEXT NOT NULL,
  template_yaml  TEXT NOT NULL,
  created_by     TEXT,
  accuracy_score DECIMAL(5,2),
  usage_count    INTEGER DEFAULT 0,
  last_used      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor);
CREATE INDEX IF NOT EXISTS idx_invoices_date   ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
