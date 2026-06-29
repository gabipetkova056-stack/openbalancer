/**
 * ToastContainer.jsx — Slide-up toast notifications.
 */
import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';
import useStore from '../../store/useStore.js';

const ICONS = {
  success: <CheckCircle size={16} aria-hidden="true" />,
  error:   <AlertCircle size={16} aria-hidden="true" />,
  warning: <AlertTriangle size={16} aria-hidden="true" />,
};
const COLORS = {
  success: 'var(--green)',
  error:   'var(--red)',
  warning: 'var(--amber)',
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} role="status">
          <span style={{ color: COLORS[t.type] || 'var(--blue)' }}>{ICONS[t.type]}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            className="btn btn-icon btn-ghost"
            style={{ width: 24, height: 24, padding: 0 }}
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
