/**
 * ErrorLogView.jsx — Shows ingestion and runtime errors.
 */
import React from 'react';
import { AlertCircle, Trash2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import useStore from '../../store/useStore.js';

export default function ErrorLogView() {
  const { errorLog, clearErrorLog } = useStore();

  return (
    <div className="view-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text)' }}>Error Log</h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
            Parsing and runtime errors captured in-session.
          </p>
        </div>
        {errorLog.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={clearErrorLog} aria-label="Clear all errors">
            <Trash2 size={14} /> Clear all
          </button>
        )}
      </div>

      {errorLog.length === 0 ? (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', color: 'var(--green)' }}>
          <CheckCircle size={20} aria-hidden="true" />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>No errors</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>The error log is empty — great!</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {errorLog.map((entry, i) => (
            <div
              key={i}
              className="card"
              style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', borderLeft: '3px solid var(--red)' }}
              role="log"
            >
              <AlertCircle size={16} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text)', wordBreak: 'break-word' }}>
                  {typeof entry === 'string' ? entry : entry.message || JSON.stringify(entry)}
                </div>
                {entry.context && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                    Context: {entry.context}
                  </div>
                )}
                {entry.timestamp && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 2 }}>
                    {format(new Date(entry.timestamp), 'PPpp')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
