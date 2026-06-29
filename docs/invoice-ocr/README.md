# Invoice OCR + Hermes Agent + Copilot ACP

Implementation of the Invoice OCR system: a Hermes-orchestrated invoice
extraction pipeline (OCR Agent + DB Agent + Copilot ACP) with a dashboard
front-end. **VPS / server provisioning is intentionally out of scope** — there
are no SSH steps, server IPs, or credentials here. Everything below is the
application + integration layer.

## Architecture

```
Telegram  →  Hermes Agent (orchestrator)  →  OCR Agent (invoice2data + Vision)
                                          →  DB Agent (Supabase)
                                          →  Copilot ACP (review / auto-fix)
            n8n: webhook → OCR → store → notify → export
```

## What ships in this repo

| Piece | Location | Status |
|---|---|---|
| In-browser invoice **text** parser view | `src/components/views/InvoiceOCRView.jsx` | Production (wired into app) |
| Invoice field extractor (BG/EN, ДДС, ЕИК, BGN) | `src/lib/parsers/invoiceParser.js` | Production (wired + tested) |
| Supabase schema (`invoices`, `invoice_templates`) | `supabase-schema.sql` | Reference example |
| Hermes OCR sub-agent definition | `hermes-ocr-agent.yaml` | Reference example |
| Copilot ACP client for Hermes | `copilot-acp/hermes_copilot_acp.py` | Reference example |
| n8n pipeline template | `n8n-invoice-pipeline.json` | Reference example |

> **Note:** The dashboard view performs **text-based parsing**, not scanned-image
> OCR. It reads file text in-browser (`.txt`/`.json`/`.csv` and text-readable
> PDFs); scanned/image invoices need the n8n + OpenAI Vision path. The Supabase
> schema, Hermes YAML, ACP client, and n8n JSON are **reference examples** for the
> server side — they are not exercised by the dashboard build.

## Dashboard usage

Open `/dashboard` → **Invoice Parser**. Upload text-readable invoices;
fields are extracted client-side, validated (`subtotal + tax = total`),
listed with a confidence score, and exportable to CSV. No data leaves the browser.

## Copilot ACP

`copilot-acp/hermes_copilot_acp.py` talks to a Copilot ACP server via the
`COPILOT_ACP_BASE` env var (default `http://localhost:9090`). To run the server:
`gh copilot acp serve --port 9090`.

## Telegram commands

`/upload_invoice` · `/ocr_status` · `/invoices` · `/export_csv` · `/ocr_stats`

## Reference

- invoice-x/invoice2data — template-based extraction
- n8n workflow #2320 — LlamaParse + OpenAI invoice data
