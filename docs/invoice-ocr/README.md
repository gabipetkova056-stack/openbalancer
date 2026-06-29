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

### Microinvest Delta Pro export

The **Delta Pro** button exports invoices for Microinvest Delta Pro's *Импорт на
документи*. This format is **based on best-effort research and regional BG
conventions, and should be confirmed against the target Delta Pro version /
import template before production use.** It is a practical reference/default for
manual import — not a vendor-verified canonical contract for all versions.

| Aspect | Value | Source confidence |
|---|---|---|
| Field delimiter | `;` (semicolon) | BG regional default; Delta Pro lets you pick the delimiter at import |
| Decimal separator | comma (`1200,00`) | BG regional convention; must match Delta Pro's base/locale |
| Date format | `dd.MM.yyyy` | BG regional default; depends on Delta Pro regional settings |
| Encoding | Windows-1251 (UTF-8 download) | BG legacy convention; convert on disk if Cyrillic mis-renders |
| Column order | `invoiceNumber; invoiceDate; vendor; eik; subtotal; tax; total; currency` | **Not strongly source-backed** — Delta Pro import is template/version dependent and column mapping is set during import |

> Delimiter, decimal, and date formats follow common BG regional conventions, but
> the **exact column order is not confirmed against an official Delta Pro template**.
> Generate a sample export from your Delta Pro version and align the columns before
> relying on this for real imports.

## Copilot ACP

`copilot-acp/hermes_copilot_acp.py` talks to a Copilot ACP server via the
`COPILOT_ACP_BASE` env var (default `http://localhost:9090`). To run the server:
`gh copilot acp serve --port 9090`.

## Telegram commands

`/upload_invoice` · `/ocr_status` · `/invoices` · `/export_csv` · `/ocr_stats`

## Reference

- invoice-x/invoice2data — template-based extraction
- n8n workflow #2320 — LlamaParse + OpenAI invoice data
