/**
 * CrossReference.jsx — Detect conflicts between MEMORY, TASKS, CALENDAR docs.
 */
import React, { useMemo } from 'react';
import { GitCompare, AlertTriangle, CheckCircle, UploadCloud } from 'lucide-react';
import useStore from '../../store/useStore.js';

/* Find tasks that appear to be Done in one doc and Pending in another */
function detectConflicts(docs) {
  const taskMap = {}; // key: normalized task text  →  [{docTitle, status}]

  for (const doc of docs) {
    // Match markdown checklist items: "- [x] task" or "- [ ] task"
    const lines = (doc.rawSource || '').split('\n');
    for (const line of lines) {
      const checked  = line.match(/^\s*-\s*\[x\]\s+(.+)/i);
      const unchecked = line.match(/^\s*-\s*\[\s\]\s+(.+)/i);
      if (checked) {
        const key = checked[1].toLowerCase().trim().replace(/[^a-z0-9 ]/g, '');
        (taskMap[key] = taskMap[key] || []).push({ docTitle: doc.title, status: 'done' });
      } else if (unchecked) {
        const key = unchecked[1].toLowerCase().trim().replace(/[^a-z0-9 ]/g, '');
        (taskMap[key] = taskMap[key] || []).push({ docTitle: doc.title, status: 'pending' });
      }
    }
  }

  const conflicts = [];
  for (const [task, entries] of Object.entries(taskMap)) {
    const hasDone    = entries.some((e) => e.status === 'done');
    const hasPending = entries.some((e) => e.status === 'pending');
    if (hasDone && hasPending) {
      conflicts.push({ task, entries });
    }
  }
  return conflicts;
}

function MatchMatrix({ docs }) {
  if (docs.length < 2) return null;
  // Build an overlap matrix: how many common words > 5 chars between pairs
  const shortList = docs.slice(0, 6); // Cap for display
  return (
    <div style={{ overflowX: 'auto', marginTop: 'var(--space-4)' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 'var(--text-xs)', minWidth: 320 }}>
        <caption style={{ captionSide: 'bottom', color: 'var(--text-faint)', marginTop: 8, textAlign: 'left' }}>
          Document overlap matrix (shared significant words)
        </caption>
        <thead>
          <tr>
            <th style={{ padding: '6px 10px', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}></th>
            {shortList.map((d) => (
              <th key={d.id} style={{ padding: '6px 10px', color: 'var(--text-muted)', textAlign: 'center', borderBottom: '1px solid var(--border)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.title.slice(0, 16)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shortList.map((docA) => {
            const wordsA = new Set(
              (docA.rawSource || '')
                .toLowerCase()
                .split(/\W+/)
                .filter((w) => w.length > 5)
            );
            return (
              <tr key={docA.id}>
                <td style={{ padding: '6px 10px', color: 'var(--text-muted)', borderRight: '1px solid var(--border)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {docA.title.slice(0, 16)}
                </td>
                {shortList.map((docB) => {
                  if (docA.id === docB.id) {
                    return <td key={docB.id} style={{ padding: '6px 10px', textAlign: 'center', background: 'var(--bg-card)', color: 'var(--text-faint)' }}>—</td>;
                  }
                  const wordsB = (docB.rawSource || '').toLowerCase().split(/\W+/).filter((w) => w.length > 5);
                  const overlap = wordsB.filter((w) => wordsA.has(w)).length;
                  const intensity = Math.min(1, overlap / 30);
                  return (
                    <td
                      key={docB.id}
                      style={{
                        padding: '6px 10px',
                        textAlign: 'center',
                        background: `rgba(108,156,255,${intensity * 0.25})`,
                        color: 'var(--text)',
                      }}
                      title={`${overlap} shared words`}
                    >
                      {overlap}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CrossReference() {
  const { documents, setActiveView } = useStore();

  const mdDocs = useMemo(
    () => documents.filter((d) => d.source === 'generic' || d.fileName?.match(/\.(md|txt)$/i)),
    [documents]
  );
  const conflicts = useMemo(() => detectConflicts(mdDocs), [mdDocs]);

  if (documents.length === 0) {
    return (
      <div className="view-content empty-state">
        <GitCompare size={52} strokeWidth={1} style={{ margin: '0 auto var(--space-4)', color: 'var(--text-faint)', display: 'block' }} />
        <p>Upload MEMORY.md, TASKS.md, or CALENDAR.md to detect conflicts.</p>
        <button className="btn btn-primary" onClick={() => setActiveView('home')}>Upload</button>
      </div>
    );
  }

  return (
    <div className="view-content">
      <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text)', marginBottom: 'var(--space-2)' }}>
          Conflict Detection
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Scans for tasks marked Done in one document but Pending in another.
          {mdDocs.length} note-type document{mdDocs.length !== 1 ? 's' : ''} analysed.
        </p>
      </div>

      {conflicts.length === 0 ? (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', color: 'var(--green)' }}>
          <CheckCircle size={22} aria-hidden="true" />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>No conflicts detected</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {mdDocs.length === 0
                ? 'Upload Markdown/TXT documents with checklist items to scan.'
                : 'All checklist items are consistent across your documents.'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {conflicts.map(({ task, entries }, i) => (
            <div key={i} className="card error-card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <AlertTriangle size={16} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 'var(--text-sm)' }}>
                    "{task}"
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                    Status conflict across documents
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 'var(--space-5)' }}>
                {entries.map((e, j) => (
                  <div key={j} style={{ display: 'flex', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', alignItems: 'center' }}>
                    <span
                      className={`badge ${e.status === 'done' ? 'badge-green' : 'badge-gray'}`}
                      style={{ minWidth: 52, textAlign: 'center' }}
                    >
                      {e.status === 'done' ? '✅ Done' : '⏳ Pending'}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>in</span>
                    <span style={{ color: 'var(--text)' }}>{e.docTitle}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overlap matrix */}
      {documents.length >= 2 && (
        <div className="card" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)', marginBottom: 'var(--space-2)' }}>
            Content Overlap Matrix
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
            Higher numbers indicate more shared vocabulary between documents.
          </p>
          <MatchMatrix docs={documents} />
        </div>
      )}

      {documents.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)', marginBottom: 'var(--space-3)' }}>
            All Documents ({documents.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-2)' }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: 'var(--space-3)',
                  fontSize: 'var(--text-xs)',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.title}
                </div>
                <div style={{ color: 'var(--text-faint)', marginTop: 2 }}>
                  {doc.messages?.length ?? 0} msgs · {doc.source || 'generic'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
