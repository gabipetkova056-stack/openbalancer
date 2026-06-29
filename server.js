// server.js — OpenBalancer static server
// Zero dependencies — Node.js built-ins only
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');   // Built React dashboard

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

const server = http.createServer(function (req, res) {
  // Security: strip query string and prevent directory traversal
  var urlPath = req.url.split('?')[0];
  var safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');

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
