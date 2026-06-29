/**
 * ErrorBoundary.jsx
 * Class-based React Error Boundary with Glassmorphism fallback UI.
 * Wraps every major section to prevent full-page crashes.
 */
import React from 'react';
import { AlertTriangle, RotateCcw, Eye } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showRaw: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (this.props.onError) {
      this.props.onError(error.message, info.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, showRaw: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-state" role="alert" aria-live="assertive">
          <AlertTriangle size={40} className="error-icon" aria-hidden="true" />
          <div>
            <p className="error-title">
              {this.props.title || 'Something went wrong'}
            </p>
            <p className="error-msg">
              {this.props.description ||
                'This component crashed. You can retry or view the raw error details.'}
            </p>
          </div>

          {this.state.error && (
            <code
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--red)',
                background: 'rgba(255,71,87,0.08)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                maxWidth: '100%',
                overflow: 'auto',
                display: 'block',
              }}
            >
              {this.state.error.message}
            </code>
          )}

          <div className="error-actions">
            <button className="btn btn-ghost btn-sm" onClick={this.handleRetry}>
              <RotateCcw size={14} aria-hidden="true" />
              Retry
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => this.setState((s) => ({ showRaw: !s.showRaw }))}
            >
              <Eye size={14} aria-hidden="true" />
              {this.state.showRaw ? 'Hide' : 'Raw View'}
            </button>
          </div>

          {this.state.showRaw && this.state.error && (
            <pre
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                maxWidth: '100%',
                overflow: 'auto',
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
              }}
            >
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * Functional wrapper for convenience — auto-reports to store.
 */
export function SafeZone({ children, title, description, onError }) {
  return (
    <ErrorBoundary title={title} description={description} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}
