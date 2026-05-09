import os from 'os';
import { execSync } from 'child_process';

let prevCpu = null;
let prevNet = null;

function cpuTicks() {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + (cpu.times.irq || 0);
  }
  return { total, idle };
}

export function cpu() {
  const cur = cpuTicks();
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

export function disk() {
  const out = execSync('df -k /', { encoding: 'utf8' });
  const cols = out.split('\n')[1].split(/\s+/);
  const total = parseInt(cols[1]) * 1024;
  const used = parseInt(cols[2]) * 1024;
  return { used, total, percent: Math.round((used / total) * 1000) / 10 };
}

function readNetStat() {
  const out = execSync('netstat -ib', { encoding: 'utf8' });
  let rx = 0, tx = 0;
  for (const line of out.split('\n').slice(1)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 10) continue;
    const iface = cols[0].replace(/\*$/, '');
    if (iface === 'lo0') continue;
    rx += parseInt(cols[6]) || 0;
    tx += parseInt(cols[9]) || 0;
  }
  return { rx, tx };
}

export function net() {
  const cur = readNetStat();
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
