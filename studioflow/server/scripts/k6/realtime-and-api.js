import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;
const SOCKET_URL = `${BASE_URL.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;
const PROJECT_ID = __ENV.PROJECT_ID || 'demo-project';
const TOKEN = __ENV.TOKEN; // Optional Bearer token for authenticated endpoints

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.02'],
    checks: ['rate>0.95'],
  },
  scenarios: {
    http_smoke: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 25 },
        { duration: '30s', target: 0 },
      ],
      exec: 'httpScenario',
    },
    ws_realtime: {
      executor: 'constant-vus',
      vus: Number(__ENV.WS_VUS || 10),
      duration: '1m',
      exec: 'wsScenario',
      startTime: '10s', // begin after HTTP ramp starts
    },
  },
};

export function httpScenario() {
  const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined;

  const health = http.get(`${API_URL}/health`, { headers });
  check(health, {
    'health is 200': (r) => r.status === 200,
  });

  // Auth-only call (skipped if no token provided)
  if (TOKEN) {
    const projects = http.get(`${API_URL}/projects`, { headers });
    check(projects, {
      'projects returns 200': (r) => r.status === 200,
    });
  }

  sleep(1);
}

export function wsScenario() {
  const res = ws.connect(SOCKET_URL, {}, (socket) => {
    socket.on('open', () => {
      // Socket.IO handshake open frame
      socket.send('40');

      // Keep the connection alive
      socket.setInterval(() => socket.send('2'), 15000);

      // Join the project room using the normalized payload
      socket.send(`42["join-project", {"projectId": "${PROJECT_ID}"}]`);

      // Presence heartbeat for the room
      socket.setInterval(
        () => socket.send(`42["heartbeat", {"projectId": "${PROJECT_ID}"}]`),
        15000
      );

      // End each VU session after a short dwell
      socket.setTimeout(() => socket.close(), 10000);
    });

    socket.on('message', (message) => {
      if (message.startsWith('44')) {
        console.log(`ws error: ${message}`);
      }
    });
  });

  check(res, {
    'ws connected': (r) => r && r.status === 101,
  });
}
