/**
 * Header.jsx — Top bar with title, search shortcut, and doc count.
 */
import React from 'react';
import { Search, Menu, Trash2 } from 'lucide-react';
import useStore from '../../store/useStore.js';

const VIEW_TITLES = {
  home:     'Home — Upload & Import',
  health:   'Workflow Health',
  replay:   'Chat Replay',
  insights: 'Insights Timeline',
  crossref: 'Cross-Reference Engine',
  logs:     'Error Log',
};

export default function Header({ onMenuToggle }) {
  const { activeView, documents, openCmd, clearAllDocuments, addToast } = useStore();

  function handleClearAll() {
    if (documents.length === 0) return;
    if (window.confirm(`Remove all ${documents.length} loaded documents?`)) {
      clearAllDocuments();
      addToast('All documents cleared.', 'warning');
    }
  }

  return (
    <header className="topbar" role="banner">
      {/* Mobile menu button */}
      <button
        className="btn btn-icon btn-ghost"
        onClick={onMenuToggle}
        aria-label="Toggle sidebar"
        style={{ display: 'none' }}
        id="mobile-menu-btn"
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      <h1 className="topbar-title">
        {VIEW_TITLES[activeView] || 'Dashboard'}
      </h1>

      <div className="topbar-actions">
        {documents.length > 0 && (
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
            }}
            aria-label={`${documents.length} documents loaded`}
          >
            {documents.length} doc{documents.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* Search shortcut */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={openCmd}
          aria-label="Open search (Cmd+K)"
          title="Search (⌘K)"
        >
          <Search size={15} aria-hidden="true" />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
            <kbd style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>
              ⌘K
            </kbd>
          </span>
        </button>

        {documents.length > 0 && (
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={handleClearAll}
            aria-label="Clear all documents"
            title="Clear all"
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </header>
  );
}
