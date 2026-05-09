#!/bin/bash
cd "$(dirname "$0")"
pkill -f server.mjs 2>/dev/null
nohup node server.mjs > /tmp/monitor.log 2>&1 &
BIND="${BIND:-0.0.0.0}"
PORT="${MONITOR_PORT:-3099}"
echo "Monitor started on http://${BIND}:${PORT}"
echo "API: http://${BIND}:${PORT}/api/current"
echo "Dashboard: http://${BIND}:${PORT}/"
