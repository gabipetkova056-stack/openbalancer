/**
 * ChatReplay.jsx — Virtualized chat replay view with syntax highlighting.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { List } from 'react-window';
import { User, Bot, Clipboard, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { format } from 'date-fns';
import useStore from '../../store/useStore.js';

/* Inline code renderer with copy */
function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="code-block" role="region" aria-label="Code block">
      <div className="code-block-header">
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
          {language || 'code'}
        </span>
        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={copyCode} aria-label="Copy code">
          <Clipboard size={13} aria-hidden="true" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="code-block-body" tabIndex={0}><code>{code}</code></pre>
    </div>
  );
}

/* Render message text — detect code fences */
function MessageText({ text }) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        const fenceMatch = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
        if (fenceMatch) {
          return <CodeBlock key={i} language={fenceMatch[1]} code={fenceMatch[2]} />;
        }
        return (
          <p key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
            {part}
          </p>
        );
      })}
    </>
  );
}

function MessageBubble({ message }) {
  const isHuman = message.role === 'human';
  const [expanded, setExpanded] = useState(false);
  const text = message.content || message.text || '';
  const TRUNCATE_LEN = 800;
  const truncated = text.length > TRUNCATE_LEN && !expanded;
  const display = truncated ? text.slice(0, TRUNCATE_LEN) + '…' : text;
  const ts = message.created_at || message.timestamp;

  return (
    <div className={`message-bubble ${isHuman ? 'human' : 'assistant'}`}>
      <div className="message-avatar" aria-hidden="true">
        {isHuman ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className="message-body">
        {ts && (
          <div className="message-meta">
            <span>{isHuman ? 'You' : 'AI'}</span>
            <span>{format(new Date(ts), 'MMM d, HH:mm')}</span>
            {message.wasCopied && (
              <span className="badge badge-gray" style={{ fontSize: '0.6rem' }}>copy-pasted</span>
            )}
          </div>
        )}
        <div className="message-content">
          <MessageText text={display} />
        </div>
        {text.length > TRUNCATE_LEN && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 4, padding: '2px 8px', fontSize: 'var(--text-xs)' }}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show more ({text.length.toLocaleString()} chars)</>}
          </button>
        )}
      </div>
    </div>
  );
}

/* Row renderer for react-window */
const ROW_HEIGHT = 120; // Approximate; we use variable height via overscanCount

function ChatMessageRow({ index, style, data }) {
  return (
    <div style={style}>
      <MessageBubble message={data[index]} />
    </div>
  );
}

export default function ChatReplay() {
  const { documents, activeDoc, setActiveDoc, setActiveView } = useStore();
  const [filterRole, setFilterRole] = useState('all');
  const [showInsights, setShowInsights] = useState(false);

  const doc = useMemo(
    () => (activeDoc ? documents.find((d) => d.id === activeDoc) : documents[0]),
    [documents, activeDoc]
  );

  const messages = useMemo(() => {
    if (!doc) return [];
    return filterRole === 'all'
      ? doc.messages || []
      : (doc.messages || []).filter((m) => m.role === filterRole);
  }, [doc, filterRole]);

  if (documents.length === 0) {
    return (
      <div className="view-content empty-state">
        <Bot size={52} strokeWidth={1} style={{ margin: '0 auto var(--space-4)', color: 'var(--text-faint)', display: 'block' }} />
        <p>No documents loaded yet.</p>
        <button className="btn btn-primary" onClick={() => setActiveView('home')}>Upload a file</button>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="view-content empty-state">
        <p>Select a document to view.</p>
        <button className="btn btn-primary" onClick={() => setActiveView('home')}>Go to Home</button>
      </div>
    );
  }

  const aiCount    = doc.messages?.filter((m) => m.role === 'assistant').length ?? 0;
  const humanCount = doc.messages?.filter((m) => m.role === 'human').length ?? 0;

  return (
    <div className="view-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Doc selector */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
        <select
          className="select"
          value={activeDoc || ''}
          onChange={(e) => setActiveDoc(e.target.value)}
          aria-label="Select document"
        >
          {documents.map((d) => (
            <option key={d.id} value={d.id}>{d.title}</option>
          ))}
        </select>
      </div>

      {/* Metadata header */}
      <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              {doc.title}
            </h2>
            <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span className={`badge badge-${doc.source === 'claude' ? 'purple' : doc.source === 'chatgpt' ? 'green' : 'gray'}`}>{doc.source || 'generic'}</span>
              <span>{(doc.messages || []).length} messages</span>
              <span>{humanCount} human · {aiCount} AI</span>
              {doc.created_at && <span>{format(new Date(doc.created_at), 'PPP')}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {doc.metadata?.topics?.map((t) => (
              <span key={t} className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Tag size={11} aria-hidden="true" />{t}
              </span>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>Depth</span>
          <div className="progress-bar" style={{ flex: 1 }}>
            <div className="progress-fill" style={{ width: `${Math.min(100, ((doc.messages?.length ?? 0) / 200) * 100)}%` }} />
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
            {(doc.messages?.length ?? 0)} msg
          </span>
        </div>

        {/* Action items dropdown */}
        {doc.insights?.actionItems?.length > 0 && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowInsights((v) => !v)}
              aria-expanded={showInsights}
            >
              {showInsights ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {doc.insights.actionItems.length} action item{doc.insights.actionItems.length !== 1 ? 's' : ''}
            </button>
            {showInsights && (
              <ul style={{ marginTop: 'var(--space-2)', paddingLeft: 'var(--space-4)', listStyle: 'disc', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                {doc.insights.actionItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Filter buttons */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }} role="group" aria-label="Filter messages">
        {['all', 'human', 'assistant'].map((role) => (
          <button
            key={role}
            className={`btn btn-sm ${filterRole === role ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilterRole(role)}
            aria-pressed={filterRole === role}
          >
            {role === 'all' ? 'All' : role === 'human' ? '👤 You' : '🤖 AI'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--text-faint)', alignSelf: 'center' }}>
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Message list — virtualized for large histories */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} role="log" aria-label="Chat messages" aria-live="off">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>No messages match this filter.</p>
          </div>
        ) : messages.length > 300 ? (
          /* Virtualized list for very long conversations */
          <List
            height={600}
            itemCount={messages.length}
            itemSize={ROW_HEIGHT}
            itemData={messages}
            overscanCount={5}
          >
            {ChatMessageRow}
          </List>
        ) : (
          /* Direct render for shorter lists */
          messages.map((msg, i) => (
            <MessageBubble key={msg.id || i} message={msg} />
          ))
        )}
      </div>
    </div>
  );
}
