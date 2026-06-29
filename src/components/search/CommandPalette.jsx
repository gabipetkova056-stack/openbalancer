/**
 * CommandPalette.jsx — Cmd+K fuzzy search across all loaded documents.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText, Zap, CheckSquare, Code, X } from 'lucide-react';
import { search } from '../../lib/search.js';
import useStore from '../../store/useStore.js';

const TYPE_ICONS = {
  document: <FileText size={15} />,
  action:   <CheckSquare size={15} />,
  decision: <Zap size={15} />,
  message:  <FileText size={15} />,
  code:     <Code size={15} />,
};

export default function CommandPalette() {
  const { cmdOpen, closeCmd, searchIndex, setActiveDoc, setActiveView } = useStore();
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  // Run search whenever query changes
  useEffect(() => {
    if (!searchIndex || !query.trim()) { setResults([]); setSelected(0); return; }
    const res = search(searchIndex, query, 12);
    setResults(res);
    setSelected(0);
  }, [query, searchIndex]);

  // Focus input when opened
  useEffect(() => {
    if (cmdOpen) {
      setQuery('');
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [cmdOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useStore.getState().toggleCmd();
      }
      if (!cmdOpen) return;
      if (e.key === 'Escape') closeCmd();
      if (e.key === 'ArrowDown') setSelected((s) => results.length === 0 ? s : Math.min(s + 1, results.length - 1));
      if (e.key === 'ArrowUp')   setSelected((s) => Math.max(s - 1, 0));
      if (e.key === 'Enter' && results[selected]) selectResult(results[selected]);
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cmdOpen, results, selected]);

  const selectResult = useCallback((item) => {
    setActiveDoc(item.docId);
    setActiveView('replay');
    closeCmd();
  }, [setActiveDoc, setActiveView, closeCmd]);

  if (!cmdOpen) return null;

  return (
    <div
      className="cmd-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) closeCmd(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Search documents"
    >
      <div className="cmd-palette">
        {/* Input */}
        <div className="cmd-input-wrap">
          <Search size={18} style={{ color: 'var(--text-faint)', flexShrink: 0 }} aria-hidden="true" />
          <input
            ref={inputRef}
            className="cmd-input"
            type="text"
            placeholder="Search documents, messages, insights…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search query"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              className="btn btn-icon btn-ghost"
              style={{ width: 28, height: 28 }}
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="cmd-results" role="listbox" aria-label="Search results">
          {query.trim() && results.length === 0 && (
            <div className="cmd-empty" role="status">
              No results for <strong>"{query}"</strong>
            </div>
          )}
          {!query.trim() && (
            <div className="cmd-empty">
              Start typing to search across all loaded documents…
            </div>
          )}
          {results.map((item, i) => (
            <div
              key={item.id}
              className={`cmd-result-item${i === selected ? ' selected' : ''}`}
              role="option"
              aria-selected={i === selected}
              onClick={() => selectResult(item)}
              onMouseEnter={() => setSelected(i)}
            >
              <span className="cmd-result-icon" style={{ color: 'var(--blue)' }}>
                {TYPE_ICONS[item.type] || TYPE_ICONS.document}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cmd-result-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </div>
                <div className="cmd-result-meta">{item.preview}</div>
              </div>
              <span
                className={`badge badge-${item.source === 'claude' ? 'purple' : item.source === 'chatgpt' ? 'green' : 'gray'}`}
                style={{ fontSize: '0.6rem' }}
              >
                {item.source}
              </span>
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div className="cmd-footer" aria-hidden="true">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
          <span style={{ marginLeft: 'auto' }}>
            {results.length > 0 && `${results.length} result${results.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>
    </div>
  );
}
