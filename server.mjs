import http from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { collect } from './collect.mjs';
import { append, query, latest, cleanup } from './store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3099');
const BIND = process.env.BIND || '0.0.0.0';
const INTERVAL = parseInt(process.env.INTERVAL || '30000');
const HOSTNAME = os.hostname();

const DASHBOARD = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8')
  .replace('{{HOSTNAME}}', HOSTNAME);

function html(s) { return Buffer.from(s); }
function json(obj) { return JSON.stringify(obj); }
function err(code, msg) { return { code, body: json({ error: msg }) }; }

function parseRange(req) {
  const segments = req.url.split('/').pop();
  const map = { '1h': 3600, '24h': 86400, '7d': 604800 };
  const seconds = map[segments];
  if (seconds) {
    const until = Math.floor(Date.now() / 1000);
    const since = until - seconds;
    return { since, until };
  }
  const u = new URL(req.url, `http://${req.headers.host}`);
  const since = parseInt(u.searchParams.get('since'));
  const until = parseInt(u.searchParams.get('until'));
  if (since && until && since < until) return { since, until };
  return null;
}

function handleAPI(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/current') {
    const cur = latest() || collect();
    return { code: 200, body: json(cur) };
  }

  if (url.pathname.startsWith('/api/range/')) {
    const range = parseRange(req);
    if (!range) return err(400, 'Invalid range. Use /api/range/1h|24h|7d or ?since=&until=');
    const data = query(range.since, range.until);
    return { code: 200, body: json(data) };
  }

  if (url.pathname === '/api/history') {
    const range = parseRange(req);
    if (!range) return err(400, 'Missing ?since=&until=');
    const data = query(range.since, range.until);
    return { code: 200, body: json(data) };
  }

  return err(404, 'Not found');
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(DASHBOARD);
    return;
  }

  if (req.url.startsWith('/api/')) {
    const { code, body } = handleAPI(req);
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(body);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(json({ error: 'Not found' }));
});

function start() {
  server.listen(PORT, BIND, () => {
    console.log(`[monitor] listening on http://${BIND}:${PORT}`);
    console.log(`[monitor] interval=${INTERVAL}ms, hostname=${HOSTNAME}`);

    collect();
    append(collect());
    setInterval(() => {
      const stats = collect();
      append(stats);
    }, INTERVAL);
  });
}

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });

start();
