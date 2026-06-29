/**
 * Sidebar.jsx — Collapsible navigation sidebar.
 */
import React from 'react';
import {
  LayoutDashboard, MessageSquare, Lightbulb, GitCompare,
  AlertCircle, Upload, ChevronLeft, ChevronRight,
  Layers, ExternalLink, Activity, FileText,
} from 'lucide-react';
import useStore from '../../store/useStore.js';

const NAV = [
  { id: 'home',      icon: LayoutDashboard, label: 'Home / Upload' },
  { id: 'health',    icon: Activity,        label: 'Workflow Health' },
  { id: 'invoices',  icon: FileText,        label: 'Invoice OCR' },
  { id: 'replay',    icon: MessageSquare,   label: 'Chat Replay' },
  { id: 'insights',  icon: Lightbulb,       label: 'Insights' },
  { id: 'crossref',  icon: GitCompare,      label: 'Cross-Reference' },
  { id: 'logs',      icon: AlertCircle,     label: 'Error Log' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { activeView, setActiveView, documents, invoices } = useStore();

  return (
    <aside
      className={`sidebar${collapsed ? ' collapsed' : ''}`}
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="sidebar-header">
        <a href="/dashboard/" className="sidebar-logo" aria-label="OpenBalancer Dashboard home">
          {/* Logo SVG */}
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink: 0 }}>
            <rect width="32" height="32" rx="6" fill="var(--blue)"/>
            <rect x="4" y="13.5" width="8" height="5" rx="2" fill="white" opacity="0.9"/>
            <line x1="12" y1="16" x2="17" y2="10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="12" y1="16" x2="17" y2="16" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="12" y1="16" x2="17" y2="22" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="17" y="7" width="10" height="5.5" rx="2" fill="none" stroke="white" strokeWidth="1.5" opacity="0.6"/>
            <rect x="17" y="13.25" width="10" height="5.5" rx="2" fill="white" opacity="0.9"/>
            <rect x="17" y="19.5" width="10" height="5.5" rx="2" fill="none" stroke="white" strokeWidth="1.5" opacity="0.6"/>
          </svg>
          {!collapsed && (
            <span className="sidebar-logo-text">
              Open<span>Balancer</span>
            </span>
          )}
        </a>

        <button
          className="sidebar-collapse-btn"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-section">
        {!collapsed && (
          <div className="sidebar-section-label">Navigation</div>
        )}
        {NAV.map(({ id, icon: Icon, label }) => {
          let count = 0;
          if (id === 'replay' || id === 'insights')   count = documents.length;
          if (id === 'crossref') count = documents.filter((d) => d.type === 'note').length;
          if (id === 'invoices') count = invoices.length;

          return (
            <button
              key={id}
              className={`nav-item${activeView === id ? ' active' : ''}`}
              onClick={() => setActiveView(id)}
              aria-current={activeView === id ? 'page' : undefined}
              title={collapsed ? label : undefined}
            >
              <Icon size={17} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>{label}</span>
              {count > 0 && !collapsed && (
                <span className="badge-count" aria-label={`${count} items`}>{count}</span>
              )}
            </button>
          );
        })}

        {!collapsed && <div className="divider" />}
        {!collapsed && (
          <div className="sidebar-section-label">External</div>
        )}
        <a
          href="/"
          className="nav-item"
          title={collapsed ? 'Landing page' : undefined}
          style={{ textDecoration: 'none' }}
          aria-label="Back to landing page"
        >
          <ExternalLink size={17} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>Landing Page</span>
        </a>
      </nav>
    </aside>
  );
}
