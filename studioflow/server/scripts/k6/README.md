# k6 Load Tests

Scripts live in this folder. They exercise both HTTP and Socket.IO endpoints.

## Files
- `realtime-and-api.js` – hits `/api/health` (public), `/api/projects` (if a bearer token is provided), and opens Socket.IO connections that join a project room and send heartbeats.

## Prerequisites
- Install [k6](https://k6.io/docs/getting-started/installation/).
- Run the StudioFlow server locally or point `BASE_URL` to a deployed instance.
- Obtain a Clerk bearer token if you want to hit authenticated endpoints (optional for `/api/health`).

## Environment
- `BASE_URL` (default: `http://localhost:5000`)
- `TOKEN` (optional) – Bearer token for authenticated requests.
- `PROJECT_ID` (default: `demo-project`) – room to join over Socket.IO.
- `WS_VUS` (optional, default: `10`) – virtual users for the websocket scenario.

## Run
From the `server` directory:

```powershell
k6 run scripts/k6/realtime-and-api.js
```

Examples:

```powershell
# Local, public-only
k6 run scripts/k6/realtime-and-api.js

# Hitting authenticated endpoints and a specific project room
$env:BASE_URL="http://localhost:5000"; $env:TOKEN="<clerk_bearer_token>"; $env:PROJECT_ID="<projectId>"; $env:WS_VUS="20"; k6 run scripts/k6/realtime-and-api.js
```

## Notes
- The websocket flow mirrors the current server contract (`join-project` payload with `{ projectId }` and heartbeats).
- Thresholds are basic (`http_req_failed<2%`, `checks>95%`). Tune scenarios or stages to match your target RPS and soak duration.
- Keep an eye on server logs for rate limiting or 429s when increasing arrival rates.
