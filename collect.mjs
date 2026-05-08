import os from 'os';

const platform = os.platform();
const mod = await import(`./collectors/${platform}.mjs`).catch(() => {
  console.error(`[monitor] unsupported platform: ${platform}`);
  process.exit(1);
});

export function collect() {
  const [l1, l5, l15] = os.loadavg();
  const c = mod.cpu();
  const r = ram();
  const d = mod.disk();
  const n = mod.net();

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

function ram() {
  const total = os.totalmem();
  const free = os.freemem();
  return {
    used: total - free,
    total,
    percent: Math.round(((total - free) / total) * 1000) / 10
  };
}
