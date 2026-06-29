/**
 * App.jsx — Root component. Wires layout: Sidebar + Header + View.
 */
import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar.jsx';
import Header from './components/layout/Header.jsx';
import CommandPalette from './components/search/CommandPalette.jsx';
import ToastContainer from './components/ui/ToastContainer.jsx';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';
import HomeView from './components/views/HomeView.jsx';
import ChatReplay from './components/views/ChatReplay.jsx';
import InsightsTimeline from './components/views/InsightsTimeline.jsx';
import CrossReference from './components/views/CrossReference.jsx';
import ErrorLogView from './components/views/ErrorLogView.jsx';
import WorkflowHealthView from './components/views/WorkflowHealthView.jsx';
import InvoiceOCRView from './components/views/InvoiceOCRView.jsx';
import useStore from './store/useStore.js';

const VIEWS = {
  home:     HomeView,
  health:   WorkflowHealthView,
  invoices: InvoiceOCRView,
  replay:   ChatReplay,
  insights: InsightsTimeline,
  crossref: CrossReference,
  logs:     ErrorLogView,
};

export default function App() {
  const { activeView, addError } = useStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const ActiveView = VIEWS[activeView] || HomeView;

  function handleError(message, componentStack) {
    addError({ message, context: 'render', stack: componentStack, timestamp: new Date().toISOString() }, 'render');
  }

  return (
    <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
      <div className="main-area">
        <Header onMenuToggle={() => setSidebarCollapsed((v) => !v)} />
        <main className="main-content" id="main-content" tabIndex={-1} role="main">
          <ErrorBoundary key={activeView} onError={handleError}>
            <ActiveView />
          </ErrorBoundary>
        </main>
      </div>
      <CommandPalette />
      <ToastContainer />
    </div>
  );
}
