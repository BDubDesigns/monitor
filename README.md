# Server Monitor

Lightweight resource monitor for your VPS. REST API + web dashboard. Zero dependencies.

## Deploy

```bash
# Run locally
node server.mjs
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/current` | Latest snapshot |
| `GET /api/range/1h` | Last hour |
| `GET /api/history?since=TS&until=TS` | Custom range |

## Env Variables

| Variable | Default | Description |
|---|---|---|
| `BIND` | `0.0.0.0` | Bind address |
| `PORT` | `3099` | Port |
| `INTERVAL` | `30000` | Collection interval (ms) |
