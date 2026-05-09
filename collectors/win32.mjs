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
  const drive = (process.env.MONITOR_DISK || process.env.SystemDrive || 'C:').replace(/\\$/, '');
  const out = execSync(`wmic logicaldisk where "caption='${drive}'" get size,freespace`, { encoding: 'utf8' });
  const lines = out.trim().split('\n').filter(l => l.trim());
  const cols = lines[1].trim().split(/\s+/);
  const total = parseInt(cols[1]) || parseInt(cols[0]) || 0;
  const free = parseInt(cols[0]) || 0;
  const used = total - free;
  return { used, total, percent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0 };
}

function readNetStat() {
  const out = execSync('netstat -e', { encoding: 'utf8' });
  for (const line of out.split('\n')) {
    if (line.includes('Bytes')) {
      const nums = line.match(/\d+/g);
      if (nums && nums.length >= 2) {
        return { rx: parseInt(nums[0]), tx: parseInt(nums[1]) };
      }
    }
  }
  return { rx: 0, tx: 0 };
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
