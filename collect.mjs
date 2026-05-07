import os from 'os';
import { execSync } from 'child_process';
import fs from 'fs';

let prevCpu = null;
let prevNet = null;

function readCpuStat() {
  const stat = fs.readFileSync('/proc/stat', 'utf8');
  const line = stat.split('\n').find(l => l.startsWith('cpu '));
  const parts = line.split(/\s+/).filter(Boolean);
  const times = parts.slice(1).map(Number);
  const total = times.reduce((a, b) => a + b, 0);
  const idle = times[3] + (times[4] || 0);
  return { total, idle };
}

function cpu() {
  const cur = readCpuStat();
  if (!prevCpu) { prevCpu = cur; return { percent: 0, cores: os.cpus().length }; }
  const tDiff = cur.total - prevCpu.total;
  const iDiff = cur.idle - prevCpu.idle;
  prevCpu = cur;
  if (tDiff <= 0) return { percent: 0, cores: os.cpus().length };
  return {
    percent: Math.round((1 - iDiff / tDiff) * 1000) / 10,
    cores: os.cpus().length
  };
}

function ram() {
  const total = os.totalmem();
  const free = os.freemem();
  return {
    used: total - free,
    total,
    percent: Math.round(((total - free) / total) * 1000) / 10
  };
}

function disk() {
  const out = execSync('df -k /', { encoding: 'utf8' });
  const cols = out.split('\n')[1].split(/\s+/);
  const total = parseInt(cols[1]) * 1024;
  const used = parseInt(cols[2]) * 1024;
  return { used, total, percent: Math.round((used / total) * 1000) / 10 };
}

function readNetDev() {
  const dev = fs.readFileSync('/proc/net/dev', 'utf8');
  let rx = 0, tx = 0;
  for (const line of dev.split('\n').slice(2)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 10) continue;
    const iface = cols[0].replace(':', '');
    if (iface === 'lo') continue;
    rx += parseInt(cols[1]);
    tx += parseInt(cols[9]);
  }
  return { rx, tx };
}

function net() {
  const cur = readNetDev();
  if (!prevNet) { prevNet = cur; return { rx_rate: 0, tx_rate: 0, rx_total: cur.rx, tx_total: cur.tx }; }
  const rxRate = cur.rx - prevNet.rx;
  const txRate = cur.tx - prevNet.tx;
  prevNet = cur;
  return {
    rx_rate: rxRate,
    tx_rate: txRate,
    rx_total: cur.rx,
    tx_total: cur.tx
  };
}

export function collect() {
  const [l1, l5, l15] = os.loadavg();
  const c = cpu();
  const r = ram();
  const d = disk();
  const n = net();

  return {
    ts: Math.floor(Date.now() / 1000),
    cpu_percent: c.percent,
    cpu_cores: c.cores,
    ram_used: r.used,
    ram_total: r.total,
    ram_percent: r.percent,
    disk_used: d.used,
    disk_total: d.total,
    disk_percent: d.percent,
    net_rx_rate: n.rx_rate,
    net_tx_rate: n.tx_rate,
    net_rx_total: n.rx_total,
    net_tx_total: n.tx_total,
    load_1m: Math.round(l1 * 100) / 100,
    load_5m: Math.round(l5 * 100) / 100,
    load_15m: Math.round(l15 * 100) / 100,
    uptime: os.uptime()
  };
}
