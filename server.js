// server.js — OpenBalancer static server
// Zero dependencies — Node.js built-ins only
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');   // Built React dashboard
const N8N_BASE_URL = process.env.N8N_BASE_URL || '';
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const N8N_INVOICE_WEBHOOK_URL = process.env.N8N_INVOICE_WEBHOOK_URL || '';
const N8N_TIMEOUT_MS = 8000;

const MIME_TYPES = {
  '.html':  'text/html; charset=utf-8',
  '.css':   'text/css; charset=utf-8',
  '.js':    'application/javascript; charset=utf-8',
  '.json':  'application/json; charset=utf-8',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.webp':  'image/webp',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.txt':   'text/plain; charset=utf-8',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options':        'SAMEORIGIN',
  'Referrer-Policy':        'strict-origin-when-cross-origin',
};

const ACTIVE_EXECUTION_STATUSES = new Set(['active', 'new', 'running', 'waiting']);
const FAILED_EXECUTION_STATUSES = new Set(['error', 'failed', 'crashed']);

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  }, SECURITY_HEADERS));
  res.end(JSON.stringify(payload));
}

function normalizeCollection(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

function trimSlash(value) {
  return value.replace(/\/+$/, '');
}

function getN8NDisplayUrl() {
  if (!N8N_BASE_URL) return null;
  try {
    const parsed = new URL(N8N_BASE_URL);
    return trimSlash(parsed.origin + parsed.pathname);
  } catch (err) {
    return N8N_BASE_URL;
  }
}

function parseJsonBody(req) {
  return new Promise(function (resolve, reject) {
    let body = '';
    req.on('data', function (chunk) {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', function () {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

async function fetchJson(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(function () {
    controller.abort();
  }, N8N_TIMEOUT_MS);

  try {
    const response = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
    const raw = await response.text();
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (err) {
        data = { raw: raw };
      }
    }

    if (!response.ok) {
      const message = data && data.message ? data.message : 'HTTP ' + response.status;
      const err = new Error(message);
      err.statusCode = response.status;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchN8N(pathname, searchParams) {
  const base = trimSlash(N8N_BASE_URL);
  const url = new URL(base + pathname);
  if (searchParams) {
    Object.keys(searchParams).forEach(function (key) {
      if (searchParams[key] !== undefined && searchParams[key] !== null) {
        url.searchParams.set(key, searchParams[key]);
      }

      function buildInvoiceWebhookUrl(webhookPath) {
        if (N8N_INVOICE_WEBHOOK_URL) return N8N_INVOICE_WEBHOOK_URL;
        if (!N8N_BASE_URL) return null;
        const base = trimSlash(N8N_BASE_URL);
        const pathValue = String(webhookPath || '/webhook/invoice-processing');
        const fixedPath = pathValue.startsWith('/') ? pathValue : '/' + pathValue;
        return base + fixedPath;
      }
    });
  }

  return fetchJson(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'API-KEY': N8N_API_KEY,
    },
  });
}

function getExecutionStatus(execution) {
  return String(execution && execution.status ? execution.status : 'unknown').toLowerCase();
}

function formatTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map(function (tag) {
      if (typeof tag === 'string') return tag;
      if (tag && typeof tag.name === 'string') return tag.name;
      return null;
    })
    .filter(Boolean);
}

function summarizeExecutions(executions) {
  const summary = {
    sampleSize: executions.length,
    success: 0,
    failed: 0,
    running: 0,
    unknown: 0,
    successRate: null,
  };

  executions.forEach(function (execution) {
    const status = getExecutionStatus(execution);
    if (status === 'success') summary.success += 1;
    else if (FAILED_EXECUTION_STATUSES.has(status)) summary.failed += 1;
    else if (ACTIVE_EXECUTION_STATUSES.has(status)) summary.running += 1;
    else summary.unknown += 1;
  });

  const completed = summary.success + summary.failed;
  if (completed > 0) {
    summary.successRate = Number(((summary.success / completed) * 100).toFixed(1));
  }

  return summary;
}

function statusFromOverview(overview) {
  if (!overview.configured) return 'not_configured';
  if (!overview.connected) return 'offline';
  if (overview.executionSummary.successRate !== null && overview.executionSummary.successRate < 80) return 'degraded';
  if (overview.workflowSummary.inactive > 0 || overview.executionSummary.failed > 0) return 'warning';
  return 'healthy';
}

function buildPlatformRoutes() {
  return [
    {
      id: 'trial-auto-registrar',
      platform: 'AI Trial Auto-Registrar',
      strategy: 'latency-first with fallback',
      primaryModel: 'gpt-4.1',
      fallbackModel: 'claude-sonnet-4.6',
      notes: 'Optimized for structured form filling, short control loops, and fast retries.',
    },
    {
      id: 'rag-chatbot',
      platform: 'Knowledge Base RAG Chatbot',
      strategy: 'quality-first',
      primaryModel: 'claude-sonnet-4',
      fallbackModel: 'gemini-2.5-pro',
      notes: 'Prefer longer-context reasoning for retrieval synthesis and citation-heavy answers.',
    },
    {
      id: 'social-content-farm',
      platform: 'Social Media Content Farm',
      strategy: 'cost-optimized',
      primaryModel: 'gemini-2.5-pro',
      fallbackModel: 'gpt-4.1-mini',
      notes: 'Balances volume generation with multimodal drafting and lower-cost batch throughput.',
    },
    {
      id: 'wallestars-finops',
      platform: 'Wallestars FinOps Automation',
      strategy: 'quality-first with guardrails',
      primaryModel: 'claude-sonnet-4',
      fallbackModel: 'gpt-4.1',
      notes: 'Use strict JSON response schemas for invoice extraction, reconciliation, and exception review.',
    },
  ];
}

async function handleN8NOverview(res) {
  const baseUrl = getN8NDisplayUrl();
  const setup = {
    baseUrlEnv: 'N8N_BASE_URL',
    apiKeyEnv: 'N8N_API_KEY',
    example: 'N8N_BASE_URL=https://n8n.example.com N8N_API_KEY=*** node server.js',
  };

  if (!N8N_BASE_URL || !N8N_API_KEY) {
    writeJson(res, 503, {
      configured: false,
      connected: false,
      status: 'not_configured',
      fetchedAt: new Date().toISOString(),
      instance: baseUrl,
      setup: setup,
      platformRoutes: buildPlatformRoutes(),
      error: 'n8n API credentials are not configured on the server.',
    });
    return;
  }

  async function handleInvoiceProcessing(req, res) {
    try {
      const payload = await parseJsonBody(req);
      const invoices = Array.isArray(payload.invoices) ? payload.invoices : [];
      const webhookUrl = buildInvoiceWebhookUrl(payload.webhookPath);

      if (!webhookUrl) {
        writeJson(res, 503, {
          error: 'n8n webhook is not configured. Set N8N_BASE_URL or N8N_INVOICE_WEBHOOK_URL.',
        });
        return;
      }

      const upstream = await fetchJson(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          source: 'openbalancer',
          direction: payload.direction === 'sale' ? 'sale' : 'purchase',
          invoices: invoices,
        }),
      });

      writeJson(res, 200, {
        ok: true,
        sent: invoices.length,
        webhookUrl: webhookUrl,
        upstream,
      });
    } catch (err) {
      writeJson(res, err.statusCode || 502, {
        ok: false,
        error: err.message || 'Failed to send invoices to n8n webhook.',
      });
    }
  }

  try {
    const results = await Promise.all([
      fetchN8N('/rest/workflows', { limit: 250 }),
      fetchN8N('/rest/executions', { limit: 100 }),
    ]);

    const workflows = normalizeCollection(results[0]);
    const executions = normalizeCollection(results[1]);
    const workflowSummary = {
      total: workflows.length,
      active: workflows.filter(function (workflow) { return Boolean(workflow && workflow.active); }).length,
      inactive: workflows.filter(function (workflow) { return workflow && workflow.active === false; }).length,
    };
    const executionSummary = summarizeExecutions(executions);
    const activeWorkflows = workflows
      .filter(function (workflow) { return Boolean(workflow && workflow.active); })
      .slice(0, 8)
      .map(function (workflow) {
        return {
          id: workflow.id,
          name: workflow.name || 'Untitled workflow',
          tags: formatTags(workflow.tags),
          updatedAt: workflow.updatedAt || workflow.updated_at || null,
        };
      });
    const recentFailures = executions
      .filter(function (execution) { return FAILED_EXECUTION_STATUSES.has(getExecutionStatus(execution)); })
      .slice(0, 8)
      .map(function (execution) {
        return {
          id: execution.id,
          workflowId: execution.workflowId || execution.workflow_id || null,
          workflowName: execution.workflowName || execution.workflow_name || 'Unknown workflow',
          status: getExecutionStatus(execution),
          startedAt: execution.startedAt || execution.started_at || null,
          stoppedAt: execution.stoppedAt || execution.stopped_at || null,
          mode: execution.mode || 'unknown',
        };
      });

    const payload = {
      configured: true,
      connected: true,
      fetchedAt: new Date().toISOString(),
      instance: baseUrl,
      workflowSummary: workflowSummary,
      executionSummary: executionSummary,
      activeWorkflows: activeWorkflows,
      recentFailures: recentFailures,
      platformRoutes: buildPlatformRoutes(),
    };

    payload.status = statusFromOverview(payload);
    writeJson(res, 200, payload);
  } catch (err) {
    writeJson(res, err.statusCode || 502, {
      configured: true,
      connected: false,
      status: 'offline',
      fetchedAt: new Date().toISOString(),
      instance: baseUrl,
      setup: setup,
      platformRoutes: buildPlatformRoutes(),
      error: err.message || 'Failed to query the n8n API.',
    });
  }
}

function serveFile(filePath, res) {
  var ext = path.extname(filePath).toLowerCase();
  var contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, function (err, data) {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 — Not Found</h1>');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
      return;
    }
    res.writeHead(200, Object.assign({ 'Content-Type': contentType, 'Cache-Control': 'no-cache' }, SECURITY_HEADERS));
    res.end(data);
  });
}

const server = http.createServer(async function (req, res) {
  // Security: strip query string and prevent directory traversal
  var urlPath = req.url.split('?')[0];
  var safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');

  if (req.method === 'GET' && safePath === '/api/n8n/overview') {
    await handleN8NOverview(res);
    return;
  }

  if (req.method === 'POST' && safePath === '/api/invoices/process') {
    await handleInvoiceProcessing(req, res);
    return;
  }

  // ── Dashboard SPA (/dashboard and /dashboard/*) ──────────────────────────────
  // Route all /dashboard/* requests into the built Vite output in dist/.
  if (safePath === '/dashboard' || safePath.startsWith('/dashboard/')) {
    // Strip the /dashboard prefix for file lookup inside dist/
    var subPath = safePath.slice('/dashboard'.length) || '/';
    var ext = path.extname(subPath);

    if (ext) {
      // Static asset request (JS, CSS, etc.) — serve from dist/
      var assetFile = path.join(DIST, subPath.replace(/^\/+/, ''));
      serveFile(assetFile, res);
    } else {
      // HTML/SPA fallback — serve dist/dashboard.html
      serveFile(path.join(DIST, 'dashboard.html'), res);
    }
    return;
  }

  // ── Landing page and other static files ──────────────────────────────────────
  var filePath = path.join(ROOT, safePath === '/' ? 'index.html' : safePath);

  // SPA fallback for landing page routes without extensions
  if (!path.extname(filePath)) {
    filePath = path.join(ROOT, 'index.html');
  }

  serveFile(filePath, res);
});

server.listen(PORT, function () {
  console.log('\u2713 OpenBalancer server running at http://localhost:' + PORT);
  console.log('  Landing page :  http://localhost:' + PORT + '/');
  console.log('  Dashboard    :  http://localhost:' + PORT + '/dashboard');
  console.log('  Press Ctrl+C to stop.\n');
});

server.on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    console.error('Error: Port ' + PORT + ' is already in use. Try PORT=' + (parseInt(PORT) + 1) + ' node server.js');
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});
