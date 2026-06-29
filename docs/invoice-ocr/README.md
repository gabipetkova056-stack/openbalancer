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
| Microinvest Delta Pro **TransferData XML** export | `src/lib/parsers/microinvestXmlExport.js` | Source-backed (provisional, tested) |
| Plus Minus XML export template | `src/lib/parsers/plusMinusXmlExport.js` | Production template |
| Ajur CSV export template | `src/lib/parsers/ajurExport.js` | Production template |
| JSON API payload export | `src/lib/parsers/jsonApiExport.js` | Production template |
| Delta Pro CSV reference/manual template | `src/lib/parsers/deltaProExport.js` | Reference/legacy template (not canonical) |
| Supabase schema (`invoices`, `invoice_templates`) | `supabase-schema.sql` | Reference example |
| Hermes OCR sub-agent definition | `hermes-ocr-agent.yaml` | Reference example |
| Copilot ACP client for Hermes | `copilot-acp/hermes_copilot_acp.py` | Reference example |
| n8n pipeline template | `n8n-invoice-pipeline.json` | Reference example |

> **Note:** The dashboard view performs **text-based parsing**, not scanned-image
> OCR. It reads UTF-8 text in-browser (`.txt`/`.json`/`.csv`); binary PDFs and
> scanned/image invoices need the n8n + OpenAI Vision path (`file.text()` cannot
> extract page text from a PDF). The Supabase
> schema, Hermes YAML, ACP client, and n8n JSON are **reference examples** for the
> server side — they are not exercised by the dashboard build.

## Dashboard usage

Open `/dashboard` → **Invoice Parser**. Upload `.txt`/`.json`/`.csv` invoices;
fields are extracted client-side, validated (`subtotal + tax = total` + local
EIK/VAT checks with VIES eligibility flag), listed with a confidence score, and
exportable to:

- Microinvest TransferData XML
- Plus Minus XML
- Ajur CSV
- Universal CSV
- JSON API payload

Direct push helpers are included for Email and Telegram summary handoff.
No data leaves the browser unless you use those external links.

## Pricing (Bulgaria 2026)

- **Starter**: 29 EUR / month — up to 200 invoices, CSV + JSON API
- **Pro**: 79 EUR / month — up to 1000 invoices, all exports, API, 5 users
- **Enterprise**: 299 EUR / month — unlimited, white-label, team workspace

## Integrations / partners

- Zapier + Make webhook-oriented integration surface (`/api/invoices/*`)
- Reseller/partner mode in UI (white-label branding in export payloads/files)

### Microinvest Delta Pro XML / TransferData export

The **Delta Pro XML** button is the source-backed path for Microinvest Delta
Pro. It generates a `TransferData` import document — double-entry bookkeeping
mode (`<Accountings>`) — modelled on the `FINTECT-PRO/MICROINVEST-OCR` pipeline
(`pipeline/transform_ocr_to_delta.py`), which is the **stronger implementation
reference** than a best-effort `;` CSV. Structure:

```
<TransferData xmlns="urn:Transfer">
  <Accountings>
    <Accounting Number="1" AccountingDate="2026-06-21" Term="Покупка" VatTerm="1">
      <Document DocumentType="1" Number="INV-7" Date="2026-06-21" />
      <Company Name="Acme ЕООД" Bulstat="123456789" VatNumber="BG123456789" />
      <AccountingDetails>
        <AccountingDetail AccountNumber="602"   Amount="1000.00" Direction="Debit"  VatTerm="1" />
        <AccountingDetail AccountNumber="453/1" Amount="200.00"  Direction="Debit"  VatTerm="1" />
        <AccountingDetail AccountNumber="401"   Amount="1200.00" Direction="Credit" VatTerm="0" />
      </AccountingDetails>
    </Accounting>
  </Accountings>
</TransferData>
```

Mappings (purchase default): Dr 602 net, Dr 453/1 VAT, Cr 401 gross. Sale: Dr
411 gross, Cr 703 net, Cr 453/2 VAT. `DocumentType` 1 invoice / 2 debit note / 3
credit note. `VatTerm` purchase 20% → 1, sale 20% → 7, exempt → 6, none → 0.
Detail rows use `Amount` + `Direction="Debit|Credit"` + per-line `VatTerm`; dates
are **ISO `YYYY-MM-DD`** and amounts use **dot decimals**. When no line items exist, a
single summary line is synthesised from totals and postings are balanced by
construction. The exporter XML-escapes vendor/document data. A **Покупка/Продажба**
selector by the button switches postings/VatTerm between purchase and sale.

> **Provisional, based on FINTECT-PRO/MICROINVEST-OCR TransferData profile.**
> Not yet live-validated against a real Delta Pro import / golden file. Confirm
> account numbers and posting rules with an accountant and the target Delta Pro
> version before production use.

### Delta Pro CSV (reference / legacy template)

The **Delta Pro CSV (reference)** button keeps the earlier `;`-delimited export
as a manual import template — it is **not** a vendor-verified canonical Delta Pro
integration; prefer the XML TransferData path above. This format is **based on best-effort research and regional BG
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

`/upload_invoice` · `/ocr_status` · `/invoices` · `/export_csv` · `/export_deltapro_csv` · `/export_deltapro_xml` · `/ocr_stats`

## Reference

- invoice-x/invoice2data — template-based extraction
- n8n workflow #2320 — LlamaParse + OpenAI invoice data
