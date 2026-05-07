import fs from 'fs';
import path from 'path';
import os from 'os';

const LOG_DIR = path.join(os.homedir(), '.monitor-logs');
const MAX_AGE_DAYS = 30;

function dir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  return LOG_DIR;
}

function fileName(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}.jsonl`;
}

export function append(entry) {
  const file = path.join(dir(), fileName(new Date()));
  fs.appendFileSync(file, JSON.stringify(entry) + '\n');
}

export function query(since, until) {
  const results = [];
  const files = fs.readdirSync(dir()).filter(f => f.endsWith('.jsonl')).sort();
  for (const file of files) {
    const fileDate = file.replace('.jsonl', '');
    const fileTs = Math.floor(new Date(fileDate + 'T00:00:00Z').getTime() / 1000);
    if (fileTs + 86400 < since) continue;
    if (fileTs > until) continue;
    const content = fs.readFileSync(path.join(dir(), file), 'utf8');
    for (const line of content.trim().split('\n')) {
      if (!line) continue;
      try {
        const e = JSON.parse(line);
        if (e.ts >= since && e.ts <= until) results.push(e);
      } catch (_) {}
    }
  }
  return results;
}

export function latest() {
  const files = fs.readdirSync(dir()).filter(f => f.endsWith('.jsonl')).sort().reverse();
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir(), file), 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    if (lines.length > 0) return JSON.parse(lines[lines.length - 1]);
  }
  return null;
}

export function cleanup() {
  const cutoff = Date.now() - MAX_AGE_DAYS * 86400 * 1000;
  const files = fs.readdirSync(dir()).filter(f => f.endsWith('.jsonl'));
  for (const file of files) {
    const filePath = path.join(dir(), file);
    const stat = fs.statSync(filePath);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(filePath);
    }
  }
}

setInterval(cleanup, 3600_000);
