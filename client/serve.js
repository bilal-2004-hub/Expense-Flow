const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_DIR = __dirname;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  // Proxy /api requests to backend server on port 5001
  if (req.url.startsWith('/api')) {
    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: 5001,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: '127.0.0.1:5001' }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        message: 'Backend server is offline. Please start it on port 5001 (npm start in server directory).'
      }));
    });

    req.pipe(proxyReq, { end: true });
    return;
  }

  let filePath = path.join(BASE_DIR, req.url === '/' ? '/index.html' : req.url);

  // Strip query strings
  filePath = filePath.split('?')[0];

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Frontend running at http://localhost:${PORT}`);
  console.log(`  Login:    http://localhost:${PORT}/login.html`);
  console.log(`  Sign Up:  http://localhost:${PORT}/signup.html`);
  console.log(`  Dashboard:http://localhost:${PORT}/dashboard.html`);
});
