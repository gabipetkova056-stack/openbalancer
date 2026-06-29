/**
 * InvoiceOCRView.jsx — in-browser invoice text-parsing dashboard.
 *
 * The OCR Agent leg of the Hermes orchestration: upload text-readable invoices
 * (exported/text PDFs, .txt, .json, .csv), extract structured fields with
 * invoiceParser, validate, and export to CSV. This is text parsing, not
 * scanned-image OCR — image invoices go through the n8n + OpenAI Vision path.
 * 100% client-side — no data leaves the browser. The Telegram command surface
 * and Supabase schema are reference examples in docs/invoice-ocr/.
 */
import React, { useMemo, useRef, useState } from 'react';
import { FileText, Upload, Download, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import useStore from '../../store/useStore.js';
import { parseInvoiceText, isInvoiceText } from '../../lib/parsers/invoiceParser.js';
import { toDeltaProCsv } from '../../lib/parsers/deltaProExport.js';
import { toMicroinvestTransferXml } from '../../lib/parsers/microinvestXmlExport.js';
import { toPlusMinusXml } from '../../lib/parsers/plusMinusXmlExport.js';
import { toAjurCsv } from '../../lib/parsers/ajurExport.js';
import { toInvoiceApiPayload } from '../../lib/parsers/jsonApiExport.js';

const COMMANDS = [
  ['/upload_invoice', 'Качи фактура (PDF/снимка) за OCR обработка'],
  ['/ocr_status', 'Статус на последната OCR задача'],
  ['/invoices', 'Списък обработени фактури'],
  ['/export_csv', 'Експорт на фактури в CSV'],
  ['/export_deltapro_csv', 'Експорт Delta Pro CSV (reference/manual import)'],
  ['/export_deltapro_xml', 'Експорт Microinvest TransferData XML'],
  ['/export_plusminus_xml', 'Експорт Plus Minus XML template'],
  ['/export_ajur_csv', 'Експорт Ajur CSV template'],
  ['/export_json_api', 'Експорт JSON API payload'],
  ['/push_email', 'Изпращане на summary по email'],
  ['/push_telegram', 'Пращане на summary към Telegram'],
  ['/ocr_stats', 'Статистика: точност, обработени, грешки'],
];

const EXPORT_FORMATS = ['Microinvest XML', 'Plus Minus XML', 'Ajur CSV', 'CSV', 'JSON API'];

const PRICING_PLANS = [
  { name: 'Starter', price: '29€ / месец', details: '200 фактури · CSV + JSON API' },
  { name: 'Pro', price: '79€ / месец', details: '1000 фактури · всички експорти · API · 5 потребители' },
  { name: 'Enterprise', price: '299€ / месец', details: 'Неограничени · white-label · team workspace' },
];

function money(v, ccy) {
  if (v == null) return '—';
  return `${v.toFixed(2)} ${ccy || ''}`.trim();
}

function sanitizeBrand(value) {
  return (value || 'partner').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function toCsv(rows) {
  const cols = ['vendor', 'invoiceNumber', 'invoiceDate', 'dueDate', 'eik', 'subtotal', 'tax', 'taxRate', 'total', 'currency', 'confidence', 'status'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = cols.join(',');
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(',')).join('\n');
  return `${head}\n${body}`;
}

export default function InvoiceOCRView() {
  const { invoices, addInvoices, removeInvoice, clearInvoices, addToast, addError } = useStore();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [direction, setDirection] = useState('purchase');
  const [resellerMode, setResellerMode] = useState(false);
  const [brandName, setBrandName] = useState('');

  const stats = useMemo(() => {
    const n = invoices.length;
    const sumTotal = invoices.reduce((a, r) => a + (r.total || 0), 0);
    const avgConf = n ? invoices.reduce((a, r) => a + (r.confidence || 0), 0) / n : 0;
    const errors = invoices.filter((r) => (r.confidence || 0) < 0.6).length;
    return { n, sumTotal, avgConf, errors };
  }, [invoices]);

  async function handleFiles(files) {
    setBusy(true);
    const records = [];
    try {
      for (const file of files) {
        const text = await file.text();
        // file.text() reads UTF-8 only; .txt/.json/.csv work, real PDFs do not
        // (you'd get PDF object source, not page text). isInvoiceText filters those.
        if (!isInvoiceText(text)) {
          addToast(`${file.name}: не изглежда като фактура`, 'error');
          continue;
        }
        records.push(parseInvoiceText(text, file.name));
      }
      if (records.length) {
        addInvoices(records);
        addToast(`✅ Обработени ${records.length} фактури`);
      }
    } catch (err) {
      addError({ message: `Invoice OCR failed: ${err.message}`, context: 'invoice-ocr' }, 'invoice-ocr');
      addToast('OCR грешка', 'error');
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const csv = toCsv(invoices);
    downloadBlob(csv, 'text/csv', fileName('invoices.csv'));
  }

  function exportDeltaProCsv() {
    const txt = toDeltaProCsv(invoices);
    downloadBlob(txt, 'text/plain;charset=windows-1251', fileName('invoices-deltapro.csv'));
  }

  function exportDeltaProXml() {
    const xml = toMicroinvestTransferXml(invoices, { direction });
    downloadBlob(xml, 'application/xml', fileName('invoices-deltapro.xml'));
  }

  function exportPlusMinusXml() {
    const xml = toPlusMinusXml(invoices);
    downloadBlob(xml, 'application/xml', fileName('invoices-plusminus.xml'));
  }

  function exportAjurCsv() {
    const csv = toAjurCsv(invoices);
    downloadBlob(csv, 'text/csv', fileName('invoices-ajur.csv'));
  }

  function exportJsonApi() {
    const payload = toInvoiceApiPayload(invoices, {
      system: 'openbalancer-invoice-automation',
      whiteLabel: { enabled: resellerMode, brandName: brandName.trim() || null },
    });
    downloadBlob(JSON.stringify(payload, null, 2), 'application/json', fileName('invoices-api.json'));
  }

  function pushEmail() {
    const payload = toInvoiceApiPayload(invoices, {
      system: 'openbalancer-invoice-automation',
      whiteLabel: { enabled: resellerMode, brandName: brandName.trim() || null },
    });
    const subject = encodeURIComponent(`[OpenBalancer] Invoice export (${payload.invoices.length})`);
    const body = encodeURIComponent(JSON.stringify(payload, null, 2).slice(0, 1500));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
  }

  function pushTelegram() {
    const total = invoices.reduce((sum, rec) => sum + Number(rec.total || 0), 0).toFixed(2);
    const summary = [
      `Invoice batch: ${invoices.length}`,
      `Total: ${total} BGN`,
      `Exports: ${EXPORT_FORMATS.join(', ')}`,
      resellerMode ? `Partner mode: ${brandName.trim() || 'enabled'}` : 'Partner mode: off',
    ].join('\n');
    const text = encodeURIComponent(summary);
    window.open(`https://t.me/share/url?url=&text=${text}`, '_blank', 'noopener,noreferrer');
  }

  function fileName(base) {
    if (!resellerMode) return base;
    const safeBrand = sanitizeBrand(brandName);
    return `${safeBrand || 'partner'}-${base}`;
  }

  function downloadBlob(content, type, file) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = file;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="view-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text)' }}>Invoice Parser</h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
            Универсална платформа за автоматизация на фактури за всяка счетоводна система. Работи с .txt/.json/.csv и експортира към Microinvest, Plus Minus, Ajur, CSV и JSON API.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> {busy ? 'Processing…' : 'Upload'}
          </button>
          {invoices.length > 0 && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={exportCsv}><Download size={14} /> Export CSV</button>
              <button className="btn btn-ghost btn-sm" onClick={exportDeltaProCsv}><Download size={14} /> Delta Pro CSV (reference)</button>
              <select className="btn btn-ghost btn-sm" value={direction} onChange={(e) => setDirection(e.target.value)} aria-label="XML posting direction" title="Posting direction for Delta Pro XML">
                <option value="purchase">Покупка</option>
                <option value="sale">Продажба</option>
              </select>
              <button className="btn btn-ghost btn-sm" onClick={exportDeltaProXml}><Download size={14} /> Delta Pro XML</button>
              <button className="btn btn-ghost btn-sm" onClick={exportPlusMinusXml}><Download size={14} /> Plus Minus XML</button>
              <button className="btn btn-ghost btn-sm" onClick={exportAjurCsv}><Download size={14} /> Ajur CSV</button>
              <button className="btn btn-ghost btn-sm" onClick={exportJsonApi}><Download size={14} /> JSON API</button>
              <button className="btn btn-ghost btn-sm" onClick={pushEmail}><Download size={14} /> Push Email</button>
              <button className="btn btn-ghost btn-sm" onClick={pushTelegram}><Download size={14} /> Push Telegram</button>
              <button className="btn btn-ghost btn-sm" onClick={clearInvoices}><Trash2 size={14} /> Clear</button>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".txt,.json,.csv" multiple hidden
          onChange={(e) => { handleFiles([...e.target.files]); e.target.value = ''; }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <StatCard label="Processed" value={stats.n} />
        <StatCard label="Total value" value={money(stats.sumTotal, 'BGN')} />
        <StatCard label="Avg confidence" value={`${(stats.avgConf * 100).toFixed(0)}%`} />
        <StatCard label="Low confidence" value={stats.errors} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        {PRICING_PLANS.map((plan) => (
          <div key={plan.name} className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{plan.name}</div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text)' }}>{plan.price}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>{plan.details}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>Integrations (B2B)</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
          Zapier/Make webhook endpoints: <code>/api/invoices/import</code>, <code>/api/invoices/export</code>, <code>/api/invoices/notify</code>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>Reseller / White-label mode</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
              Активира branded експорти и партньорски workspace контекст за счетоводни кантори.
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-xs)', color: 'var(--text)' }}>
            <input type="checkbox" checked={resellerMode} onChange={(e) => setResellerMode(e.target.checked)} />
            Enable
          </label>
        </div>
        {resellerMode && (
          <input
            placeholder="Brand name (e.g. Accounting Studio)"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            style={{
              marginTop: 'var(--space-3)',
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text)',
              fontSize: 'var(--text-xs)',
              padding: '8px 10px',
            }}
          />
        )}
      </div>

      {invoices.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <FileText size={20} style={{ color: 'var(--text-faint)' }} aria-hidden="true" />
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Upload invoice text exports (.txt, .json, .csv) to extract vendor, number, dates, ДДС and total.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {invoices.map((r) => {
            const ok = (r.confidence || 0) >= 0.6;
            return (
              <div key={r.id} className="card" style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                {ok ? <CheckCircle2 size={16} style={{ color: 'var(--green)' }} /> : <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{r.vendor || 'Unknown vendor'} · {r.invoiceNumber || '—'}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {r.invoiceDate || '—'} · subtotal {money(r.subtotal, r.currency)} · ДДС {money(r.tax, r.currency)} · total {money(r.total, r.currency)} · {(r.confidence * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 2 }}>
                    EIK: {r.registryValidation?.eikValid ? 'valid' : 'invalid'} · VAT: {r.registryValidation?.vatValid ? 'valid' : 'invalid'} · VIES: {r.registryValidation?.viesEligible ? 'eligible' : 'not-eligible'}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => removeInvoice(r.id)} aria-label="Remove invoice"><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}

      <div className="card" style={{ marginTop: 'var(--space-5)', padding: 'var(--space-4)' }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)', marginBottom: 'var(--space-2)' }}>Telegram commands</div>
        {COMMANDS.map(([cmd, desc]) => (
          <div key={cmd} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
            <code>{cmd}</code> — {desc}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  );
}
