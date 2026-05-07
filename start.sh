#!/bin/bash
cd "$(dirname "$0")"
pkill -f server.mjs 2>/dev/null
nohup node server.mjs > /tmp/monitor.log 2>&1 &
echo "Monitor started on http://100.91.253.30:3099"
echo "API: http://100.91.253.30:3099/api/current"
echo "Dashboard: http://100.91.253.30:3099/"
