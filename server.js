// RuView Dashboard — zero-dependency local server.
// Serves index.html and proxies /api, /health and /ws to the RuView sensing server,
// so the browser stays same-origin and the API token never reaches the page.
//
//   set RUVIEW_API_TOKEN=...            (same token you started the sensing server with)
//   node server.js                      -> http://localhost:8090
//
// Env: RUVIEW_URL (default http://localhost:3000), PORT (default 8090)

const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const TARGET = new URL(process.env.RUVIEW_URL || 'http://localhost:3000');
const PORT = Number(process.env.PORT || 8090);
const TOKEN = process.env.RUVIEW_API_TOKEN || '';
const targetHost = `${TARGET.hostname}:${TARGET.port || 80}`;

function upstreamHeaders(h) {
  const out = { ...h, host: targetHost };
  delete out.origin;
  delete out.referer;
  if (TOKEN) out.authorization = `Bearer ${TOKEN}`;
  return out;
}

const isProxied = (u) => u.startsWith('/api') || u.startsWith('/health') || u.startsWith('/ws');

// Laptop WiFi status for the health checklist (Windows: netsh). Read-only; returns SSID/signal, never passwords.
function localWifi(res) {
  const send = (o) => { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(o)); };
  if (process.platform !== 'win32') return send({ available: false, reason: 'WiFi check is Windows-only' });
  execFile('netsh', ['wlan', 'show', 'interfaces'], { timeout: 4000, windowsHide: true }, (err, out) => {
    if (err) return send({ available: false, reason: 'netsh failed' });
    const f = {};
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/^\s*([^:]+?)\s*:\s*(.*)$/);
      if (m && !(m[1] in f)) f[m[1].toLowerCase()] = m[2].trim();
    }
    send({
      available: true,
      state: f.state || null,
      ssid: f.ssid || null,
      signal: f.signal ? parseInt(f.signal, 10) : null,
      radio: f['radio type'] || null,
      band: f.band || null,
      channel: f.channel || null,
      rx_mbps: f['receive rate (mbps)'] || null,
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/local/wifi') return localWifi(res);
  if (isProxied(req.url)) {
    const up = http.request(
      { hostname: TARGET.hostname, port: TARGET.port || 80, path: req.url, method: req.method, headers: upstreamHeaders(req.headers), timeout: 4000 },
      (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); }
    );
    up.on('timeout', () => up.destroy(new Error('timeout')));
    up.on('error', (e) => {
      if (res.headersSent) return res.end();
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'sensing server unreachable', target: TARGET.href, detail: e.message }));
    });
    return req.pipe(up);
  }
  if (req.url === '/' || req.url.startsWith('/index.html') || req.url.startsWith('/?')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    return fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
  }
  res.writeHead(404); res.end('not found');
});

// WebSocket pass-through: replay the upgrade request upstream with rewritten headers, then pipe raw bytes.
server.on('upgrade', (req, socket, head) => {
  if (!req.url.startsWith('/ws')) return socket.destroy();
  const up = net.connect(Number(TARGET.port || 80), TARGET.hostname, () => {
    const h = upstreamHeaders(req.headers);
    let raw = `GET ${req.url} HTTP/1.1\r\n`;
    for (const [k, v] of Object.entries(h)) raw += `${k}: ${v}\r\n`;
    up.write(raw + '\r\n');
    if (head && head.length) up.write(head);
    up.pipe(socket); socket.pipe(up);
  });
  up.on('error', () => socket.destroy());
  socket.on('error', () => up.destroy());
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`RuView Dashboard  ->  http://localhost:${PORT}`);
  console.log(`Proxying to         ${TARGET.href}${TOKEN ? '  (with API token)' : '  (no RUVIEW_API_TOKEN set)'}`);
  console.log('No sensing server running? The dashboard falls back to DEMO data.');
});
