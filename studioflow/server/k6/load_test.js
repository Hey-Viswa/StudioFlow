import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
    stages: [
        { duration: '30s', target: 50 },   // Warm up
        { duration: '1m', target: 200 },  // Ramp to 200
        { duration: '2m', target: 500 },  // Ramp to 500
        { duration: '1m', target: 1000 }, // Peak at 1000
        { duration: '30s', target: 0 },   // Cool down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
        errors: ['rate<0.01'],            // Error rate < 1%
    },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api';
// Pass token via CLI: k6 run -e AUTH_TOKEN=ey... load_test.js
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export default function () {
    // Group 1: Public Health Checks (High frequency)
    group('Health Checks', () => {
        const healthRes = http.get(`${BASE_URL}/health`);
        check(healthRes, {
            'health status is 200': (r) => r.status === 200,
        });
        if (healthRes.status !== 200) errorRate.add(1);
    });

    // Group 2: Protected Endpoints (Only if token provided)
    if (AUTH_TOKEN) {
        group('Protected Actions', () => {
            const params = {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            };

            // 1. Fetch User Profile (Simulate dashboard load)
            // Note: Adjust endpoint if needed (may receive 401 if token invalid)
            const meRes = http.get(`${BASE_URL}/auth/me`, params);
            check(meRes, {
                'auth me status is 200': (r) => r.status === 200,
            });

            // 2. List Projects (Core activity)
            const projectsRes = http.get(`${BASE_URL}/projects`, params);
            check(projectsRes, {
                'projects list status is 200': (r) => r.status === 200,
            });

            if (projectsRes.status !== 200) errorRate.add(1);
        });
    }

    // Randomized sleep to simulate user think time
    sleep(Math.random() * 2 + 1); // 1-3 seconds
}
