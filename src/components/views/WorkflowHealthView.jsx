/**
 * WorkflowHealthView.jsx — n8n observation/control plane view.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity, AlertTriangle, Bot, CheckCircle2, RefreshCw, Server, Workflow, XCircle,
} from 'lucide-react';
import useStore from '../../store/useStore.js';

function statusMeta(status) {
  if (status === 'healthy') return { label: 'Healthy', color: 'var(--green)', badgeClass: 'badge-green', Icon: CheckCircle2 };
  if (status === 'warning') return { label: 'Needs attention', color: 'var(--amber)', badgeClass: 'badge-amber', Icon: AlertTriangle };
  if (status === 'degraded') return { label: 'Degraded', color: 'var(--amber)', badgeClass: 'badge-amber', Icon: AlertTriangle };
  if (status === 'offline') return { label: 'Offline', color: 'var(--red)', badgeClass: 'badge-red', Icon: XCircle };
  return { label: 'Not configured', color: 'var(--text-muted)', badgeClass: 'badge-gray', Icon: Server };
}

function StatCard({ icon: Icon, label, value, subvalue, color }) {
  return (
    <div className="card" style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', padding: 'var(--space-4)' }}>
      <div style={{ color, background: `${color}18`, borderRadius: 'var(--radius)', padding: 'var(--space-2)', flexShrink: 0 }}>
        <Icon size={20} aria-hidden="true" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
        {subvalue && <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 2 }}>{subvalue}</div>}
      </div>
    </div>
  );
}

function EmptyCard({ title, children, icon: Icon = AlertTriangle }) {
  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
        <Icon size={18} style={{ color: 'var(--text-faint)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
        <div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>{title}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

function RelativeTime({ value }) {
  if (!value) return <span style={{ color: 'var(--text-faint)' }}>—</span>;
  try {
    return <span>{formatDistanceToNow(new Date(value), { addSuffix: true })}</span>;
  } catch (err) {
    return <span>{value}</span>;
  }
}

export default function WorkflowHealthView() {
  const { addError } = useStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async function loadOverview(background) {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/n8n/overview');
      const payload = await response.json();
      setData(payload);

      if (!response.ok && payload && payload.configured === false) return;
      if (!response.ok) throw new Error(payload.error || 'Failed to load n8n overview.');
    } catch (err) {
      setError(err.message || 'Failed to load n8n overview.');
      addError({ message: err.message || 'Failed to load n8n overview.', context: 'n8n-monitor' }, 'n8n-monitor');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addError]);

  useEffect(() => {
    loadOverview(false);
  }, [loadOverview]);

  const meta = statusMeta(data && data.status ? data.status : 'not_configured');
  const workflowSummary = data && data.workflowSummary ? data.workflowSummary : { total: 0, active: 0, inactive: 0 };
  const executionSummary = data && data.executionSummary ? data.executionSummary : {
    sampleSize: 0, success: 0, failed: 0, running: 0, successRate: null,
  };
  const recentFailures = data && Array.isArray(data.recentFailures) ? data.recentFailures : [];
  const activeWorkflows = data && Array.isArray(data.activeWorkflows) ? data.activeWorkflows : [];
  const platformRoutes = data && Array.isArray(data.platformRoutes) ? data.platformRoutes : [];
  const successRateLabel = executionSummary.successRate === null ? 'n/a' : `${executionSummary.successRate}%`;

  const summaryCards = useMemo(() => ([
    {
      icon: meta.Icon,
      label: 'System Status',
      value: meta.label,
      subvalue: data && data.instance ? data.instance : 'n8n observation/control plane',
      color: meta.color,
    },
    {
      icon: Workflow,
      label: 'Active Workflows',
      value: `${workflowSummary.active}/${workflowSummary.total}`,
      subvalue: workflowSummary.inactive > 0 ? `${workflowSummary.inactive} inactive` : 'No inactive workflows in current response',
      color: 'var(--blue)',
    },
    {
      icon: Activity,
      label: 'Recent Success Rate',
      value: successRateLabel,
      subvalue: executionSummary.sampleSize > 0 ? `Based on latest ${executionSummary.sampleSize} executions` : 'No recent execution sample returned',
      color: executionSummary.successRate !== null && executionSummary.successRate >= 95 ? 'var(--green)' : 'var(--amber)',
    },
    {
      icon: XCircle,
      label: 'Recent Failed Runs',
      value: executionSummary.failed,
      subvalue: executionSummary.running > 0 ? `${executionSummary.running} currently running` : 'No active executions reported',
      color: executionSummary.failed > 0 ? 'var(--red)' : 'var(--green)',
    },
  ]), [data, executionSummary.failed, executionSummary.running, executionSummary.sampleSize, executionSummary.successRate, meta.Icon, meta.color, meta.label, successRateLabel, workflowSummary.active, workflowSummary.inactive, workflowSummary.total]);

  return (
    <div className="view-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text)' }}>n8n Workflow Health</h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
            Same-origin dashboard for workflow inventory, execution health, and Nano Banana routing profiles.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => loadOverview(true)} aria-label="Refresh n8n overview">
          <RefreshCw size={14} style={refreshing ? { animation: 'spin 0.6s linear infinite' } : undefined} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {loading && !data ? (
        <div className="loading-overlay card">
          <div className="spinner" aria-hidden="true" />
          Loading n8n overview…
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--space-3)' }}>
            {summaryCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          {error && (
            <div className="card" style={{ padding: 'var(--space-4)', borderLeft: '3px solid var(--red)' }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{error}</div>
            </div>
          )}

          {data && data.configured === false && (
            <EmptyCard title="Server-side n8n credentials are required" icon={Server}>
              Set <code>{data.setup.baseUrlEnv}</code> and <code>{data.setup.apiKeyEnv}</code> before starting
              {' '}<code>node server.js</code>. Example: <code>{data.setup.example}</code>
            </EmptyCard>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text)' }}>Recent failed executions</h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                    Latest failures returned by the n8n REST API sample.
                  </p>
                </div>
                <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>
              </div>

              {recentFailures.length === 0 ? (
                <EmptyCard title="No failed executions in the current sample" icon={CheckCircle2}>
                  Either the latest runs are clean, or the upstream API did not return failed executions.
                </EmptyCard>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {recentFailures.map((failure) => (
                    <div key={failure.id} className="card" style={{ padding: 'var(--space-3)', background: 'rgba(255,71,87,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>
                          {failure.workflowName}
                        </div>
                        <span className="badge badge-red">{failure.status}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 6 }}>
                        <span>Execution #{failure.id}</span>
                        <span>Mode: {failure.mode}</span>
                        <span><RelativeTime value={failure.startedAt || failure.stoppedAt} /></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text)' }}>Active workflow inventory</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                  Active workflows exposed by the current n8n instance.
                </p>
              </div>

              {activeWorkflows.length === 0 ? (
                <EmptyCard title="No active workflows returned" icon={Workflow}>
                  Confirm the n8n API key has access to workflows and that active workflows exist.
                </EmptyCard>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {activeWorkflows.map((workflow) => (
                    <div key={workflow.id} className="card" style={{ padding: 'var(--space-3)' }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>{workflow.name}</div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 6 }}>
                        {workflow.tags.length > 0 ? workflow.tags.map((tag) => (
                          <span key={tag} className="badge badge-blue">{tag}</span>
                        )) : <span className="badge badge-gray">untagged</span>}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 6 }}>
                        Updated <RelativeTime value={workflow.updatedAt} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text)' }}>Nano Banana routing profiles</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                  Suggested OpenBalancer model strategies for the first platform slice from the master plan.
                </p>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                {data && data.fetchedAt ? <>Fetched <RelativeTime value={data.fetchedAt} /></> : 'Static recommendations'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
              {platformRoutes.map((route) => (
                <div key={route.id} className="card" style={{ padding: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <Bot size={16} style={{ color: 'var(--purple)' }} aria-hidden="true" />
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)' }}>{route.platform}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
                    <span className="badge badge-purple">{route.strategy}</span>
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'grid', gap: 4 }}>
                    <span><strong style={{ color: 'var(--text)' }}>Primary:</strong> {route.primaryModel}</span>
                    <span><strong style={{ color: 'var(--text)' }}>Fallback:</strong> {route.fallbackModel}</span>
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 'var(--space-2)' }}>
                    {route.notes}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
