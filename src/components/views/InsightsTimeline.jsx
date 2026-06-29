/**
 * InsightsTimeline.jsx — Extracted action items, decisions, and code blocks.
 */
import React, { useMemo, useState } from 'react';
import { CheckSquare, Zap, Code, FileText, Filter } from 'lucide-react';
import { format } from 'date-fns';
import useStore from '../../store/useStore.js';

const TYPE_META = {
  action:   { icon: CheckSquare, color: 'var(--blue)',   label: 'Action Item', badgeClass: 'badge-blue' },
  decision: { icon: Zap,         color: 'var(--green)',  label: 'Decision',    badgeClass: 'badge-green' },
  code:     { icon: Code,        color: 'var(--purple)', label: 'Code Block',  badgeClass: 'badge-purple' },
};

function InsightItem({ type, text, docTitle, docDate, docSource }) {
  const { icon: Icon, color, label, badgeClass } = TYPE_META[type] || TYPE_META.action;
  return (
    <div className="card" style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)' }}>
      <div style={{ color, flexShrink: 0, marginTop: 2 }}>
        <Icon size={16} aria-hidden="true" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {type === 'code'
            ? <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{text.slice(0, 300)}{text.length > 300 ? '…' : ''}</code>
            : text}
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 4, display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <span className={`badge ${badgeClass}`} style={{ fontSize: '0.6rem' }}>{label}</span>
          <span>{docTitle}</span>
          {docDate && <span>{format(new Date(docDate), 'MMM d, yyyy')}</span>}
        </div>
      </div>
    </div>
  );
}

export default function InsightsTimeline() {
  const { documents, setActiveView } = useStore();
  const [filter, setFilter] = useState('all');

  const allInsights = useMemo(() => {
    const items = [];
    for (const doc of documents) {
      const ins = doc.insights || {};
      for (const text of ins.actionItems || []) {
        items.push({ type: 'action', text, docTitle: doc.title, docDate: doc.created_at, docSource: doc.source });
      }
      for (const text of ins.decisions || []) {
        items.push({ type: 'decision', text, docTitle: doc.title, docDate: doc.created_at, docSource: doc.source });
      }
      for (const cb of ins.codeBlocks || []) {
        items.push({ type: 'code', text: cb.code || cb, docTitle: doc.title, docDate: doc.created_at, docSource: doc.source });
      }
    }
    return items;
  }, [documents]);

  const filtered = filter === 'all' ? allInsights : allInsights.filter((i) => i.type === filter);

  if (documents.length === 0) {
    return (
      <div className="view-content empty-state">
        <Zap size={52} strokeWidth={1} style={{ margin: '0 auto var(--space-4)', color: 'var(--text-faint)', display: 'block' }} />
        <p>No documents loaded. Upload a file to extract insights.</p>
        <button className="btn btn-primary" onClick={() => setActiveView('home')}>Upload</button>
      </div>
    );
  }

  const counts = {
    all:      allInsights.length,
    action:   allInsights.filter((i) => i.type === 'action').length,
    decision: allInsights.filter((i) => i.type === 'decision').length,
    code:     allInsights.filter((i) => i.type === 'code').length,
  };

  return (
    <div className="view-content">
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={15} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
        {['all', 'action', 'decision', 'code'].map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
          >
            {f === 'all' ? 'All' : f === 'action' ? '✅ Actions' : f === 'decision' ? '⚡ Decisions' : '💻 Code'}
            {counts[f] > 0 && <span className="badge-count">{counts[f]}</span>}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <FileText size={36} strokeWidth={1} style={{ margin: '0 auto var(--space-3)', color: 'var(--text-faint)', display: 'block' }} />
          <p>No {filter !== 'all' ? filter + ' ' : ''}insights extracted from loaded documents.</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
            Try loading a Claude or ChatGPT conversation export.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {filtered.map((item, i) => (
            <InsightItem key={i} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}
