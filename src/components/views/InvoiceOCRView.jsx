/**
 * InvoiceOCRView.jsx — in-browser Invoice OCR dashboard.
 *
 * The OCR Agent leg of the Hermes orchestration: upload invoice text/PDF-text
 * exports, extract structured fields with invoiceParser, validate, and export
 * to CSV. 100% client-side — no data leaves the browser. The Telegram command
 * surface and Supabase schema are documented in docs/invoice-ocr/.
 */
import React, { useMemo, useRef, useState } from 'react';
import { FileText, Upload, Download, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import useStore from '../../store/useStore.js';
import { parseInvoiceText, isInvoiceText } from '../../lib/parsers/invoiceParser.js';

const COMMANDS = [
  ['/upload_invoice', 'Качи фактура (PDF/снимка) за OCR обработка'],
  ['/ocr_status', 'Статус на последната OCR задача'],
  ['/invoices', 'Списък обработени фактури'],
  ['/export_csv', 'Експорт на фактури в CSV'],
  ['/ocr_stats', 'Статистика: точност, обработени, грешки'],
];

function money(v, ccy) {
  if (v == null) return '—';
  return `${v.toFixed(2)} ${ccy || ''}`.trim();
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
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoices.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="view-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text)' }}>Invoice OCR</h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
            invoice2data-style extraction, in-browser. Tuned for BG фактури (ДДС, ЕИК/БУЛСТАТ, BGN).
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> {busy ? 'Processing…' : 'Upload'}
          </button>
          {invoices.length > 0 && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={exportCsv}><Download size={14} /> Export CSV</button>
              <button className="btn btn-ghost btn-sm" onClick={clearInvoices}><Trash2 size={14} /> Clear</button>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.txt,.json,.csv" multiple hidden
          onChange={(e) => { handleFiles([...e.target.files]); e.target.value = ''; }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <StatCard label="Processed" value={stats.n} />
        <StatCard label="Total value" value={money(stats.sumTotal, 'BGN')} />
        <StatCard label="Avg confidence" value={`${(stats.avgConf * 100).toFixed(0)}%`} />
        <StatCard label="Low confidence" value={stats.errors} />
      </div>

      {invoices.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <FileText size={20} style={{ color: 'var(--text-faint)' }} aria-hidden="true" />
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Upload PDF-to-text exports, .txt, .json or .csv invoices to extract vendor, number, dates, ДДС and total.
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
