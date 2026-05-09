function numEnv(key, fallback) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

const THRESHOLDS = {
  cpu: numEnv('ALERT_CPU', 90),
  ram: numEnv('ALERT_RAM', 90),
  disk: numEnv('ALERT_DISK', 85)
};

const COOLDOWN_MS = numEnv('ALERT_COOLDOWN', 15) * 60 * 1000;
const CONSECUTIVE = numEnv('ALERT_CONSECUTIVE', 3);

const state = {
  lastAlerted: {},
  triggered: { cpu: 0, ram: 0, disk: 0 },
  resolved: {}
};

export function check(stats) {
  const webhook = process.env.DISCORD_WEBHOOK;
  if (!webhook) return null;

  const alerts = [];

  if (stats.cpu_percent > THRESHOLDS.cpu) {
    state.triggered.cpu++;
    if (state.triggered.cpu >= CONSECUTIVE && clear('cpu')) {
      alerts.push({ type: 'cpu', value: stats.cpu_percent, threshold: THRESHOLDS.cpu });
    }
  } else {
    state.triggered.cpu = 0;
    markResolved('cpu');
  }

  if (stats.ram_percent > THRESHOLDS.ram) {
    state.triggered.ram++;
    if (state.triggered.ram >= CONSECUTIVE && clear('ram')) {
      alerts.push({ type: 'ram', value: stats.ram_percent, threshold: THRESHOLDS.ram });
    }
  } else {
    state.triggered.ram = 0;
    markResolved('ram');
  }

  if (stats.disk_percent > THRESHOLDS.disk) {
    if (clear('disk')) {
      alerts.push({ type: 'disk', value: stats.disk_percent, threshold: THRESHOLDS.disk });
    }
  } else {
    markResolved('disk');
  }

  return alerts;
}

function clear(type) {
  const now = Date.now();
  const last = state.lastAlerted[type] || 0;
  if (now - last > COOLDOWN_MS) {
    state.lastAlerted[type] = now;
    return true;
  }
  return false;
}

function markResolved(type) {
  if (state.resolved[type]) return;
  state.resolved[type] = true;
}

export async function send(webhook, alert, hostname) {
  const emoji = { cpu: '🔥', ram: '🧠', disk: '💾' };
  const color = { cpu: 0xf0883e, ram: 0x58a6ff, disk: 0x3fb950 };
  const name = { cpu: 'CPU', ram: 'RAM', disk: 'Disk' };

  const body = {
    username: `Server Monitor — ${hostname}`,
    embeds: [{
      title: `${emoji[alert.type]} High ${name[alert.type]} Usage`,
      description: `**${alert.value}%** (threshold: ${alert.threshold}%)`,
      color: color[alert.type],
      timestamp: new Date().toISOString(),
      footer: { text: hostname }
    }]
  };

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (_) {}
}
