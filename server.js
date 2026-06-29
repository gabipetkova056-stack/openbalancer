// server.js — OpenBalancer static server
// Zero dependencies — Node.js built-ins only
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

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

const server = http.createServer(function (req, res) {
  // Security: prevent directory traversal
  var safePath = path.normalize(req.url.split('?')[0]).replace(/^(\.\.[/\\])+/, '');
  var filePath = path.join(ROOT, safePath === '/' ? 'index.html' : safePath);

  // Serve index.html for paths with no file extension (SPA-style)
  if (!path.extname(filePath)) {
    filePath = path.join(ROOT, 'index.html');
  }

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

    res.writeHead(200, {
      'Content-Type':           contentType,
      'Cache-Control':          'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options':        'DENY',
      'Referrer-Policy':        'strict-origin-when-cross-origin',
    });
    res.end(data);
  });
});

server.listen(PORT, function () {
  console.log('\u2713 OpenBalancer server running at http://localhost:' + PORT);
  console.log('  Root: ' + ROOT);
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
