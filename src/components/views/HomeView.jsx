/**
 * HomeView.jsx — Landing / upload screen.
 */
import React from 'react';
import { MessageSquare, Lightbulb, GitCompare, FileText, Trash2, BarChart2, Clock } from 'lucide-react';
import Dropzone from '../ingestion/Dropzone.jsx';
import useStore from '../../store/useStore.js';
import { format } from 'date-fns';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)' }}>
      <div style={{ color, background: `${color}18`, borderRadius: 'var(--radius)', padding: 'var(--space-2)' }}>
        <Icon size={22} aria-hidden="true" />
      </div>
      <div>
        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </div>
  );
}

function DocRow({ doc, onSelect, onRemove }) {
  const msgCount = doc.messages?.length ?? 0;
  const aiCount  = doc.messages?.filter((m) => m.role === 'assistant').length ?? 0;
  const actionItems = doc.insights?.actionItems?.length ?? 0;

  function sourceColor(s) {
    if (s === 'claude')   return 'var(--purple)';
    if (s === 'chatgpt')  return 'var(--green)';
    return 'var(--text-muted)';
  }

  return (
    <div className="card doc-row" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', padding: 'var(--space-3) var(--space-4)' }}>
      <div
        style={{ flex: 1, minWidth: 0 }}
        onClick={() => onSelect(doc.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onSelect(doc.id); }}
        aria-label={`Open ${doc.title}`}
      >
        <div style={{ fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.title}
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 'var(--space-3)' }}>
          <span style={{ color: sourceColor(doc.source) }}>{doc.source || 'generic'}</span>
          <span>{msgCount} messages · {aiCount} AI</span>
          {actionItems > 0 && <span style={{ color: 'var(--blue)' }}>{actionItems} action items</span>}
          {doc.created_at && <span style={{ color: 'var(--text-faint)' }}>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>}
        </div>
      </div>

      {/* Progress bar (message count relative to max) */}
      <div style={{ width: 64, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.min(100, (msgCount / 100) * 100)}%` }} />
        </div>
      </div>

      {doc.metadata?.topics?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', maxWidth: 160 }}>
          {doc.metadata.topics.slice(0, 3).map((t) => (
            <span key={t} className="badge badge-blue" style={{ fontSize: '0.6rem' }}>{t}</span>
          ))}
        </div>
      )}

      <button
        className="btn btn-icon btn-ghost"
        onClick={(e) => { e.stopPropagation(); onRemove(doc.id); }}
        aria-label={`Remove ${doc.title}`}
        style={{ width: 28, height: 28, flexShrink: 0 }}
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function HomeView() {
  const { documents, setActiveDoc, setActiveView, removeDocument } = useStore();

  const totalMessages = documents.reduce((s, d) => s + (d.messages?.length ?? 0), 0);
  const totalActions  = documents.reduce((s, d) => s + (d.insights?.actionItems?.length ?? 0), 0);
  const totalDecisions = documents.reduce((s, d) => s + (d.insights?.decisions?.length ?? 0), 0);

  function openDoc(id) {
    setActiveDoc(id);
    setActiveView('replay');
  }

  return (
    <div className="view-content">
      {/* Stats row */}
      {documents.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <StatCard icon={FileText}     label="Documents"   value={documents.length}  color="var(--blue)" />
          <StatCard icon={MessageSquare} label="Messages"   value={totalMessages}     color="var(--green)" />
          <StatCard icon={BarChart2}    label="Action Items" value={totalActions}     color="var(--amber)" />
          <StatCard icon={Lightbulb}   label="Decisions"   value={totalDecisions}    color="var(--purple)" />
        </div>
      )}

      {/* Dropzone */}
      <Dropzone />

      {/* Document list */}
      {documents.length > 0 && (
        <section style={{ marginTop: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)' }}>
              Loaded Documents
            </h2>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setActiveView('insights')}>
                <Lightbulb size={14} /> Insights
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setActiveView('crossref')}>
                <GitCompare size={14} /> Cross-Reference
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {documents.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                onSelect={openDoc}
                onRemove={removeDocument}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {documents.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-faint)' }}>
          <Clock size={48} strokeWidth={1} style={{ margin: '0 auto var(--space-4)', display: 'block' }} />
          <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
            Drop a file above to get started. Your data stays in the browser.
          </p>
        </div>
      )}
    </div>
  );
}
