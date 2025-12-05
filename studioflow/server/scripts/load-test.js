import ws from 'k6/ws';
import { check } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.1.0/index.js';

export const options = {
    stages: [
        { duration: '30s', target: 100 }, // Ramp to 100 users
        { duration: '1m', target: 500 }, // Ramp to 500 users
        { duration: '1m', target: 1000 }, // Peak at 1000 users
        { duration: '30s', target: 0 },   // Ramp down
    ],
};

export default function () {
    const url = 'ws://localhost:5000/socket.io/?EIO=4&transport=websocket';
    const params = { tags: { my_tag: 'hello' } };

    const res = ws.connect(url, params, function (socket) {
        socket.on('open', function open() {
            // socket.io handshake (simplified)
            socket.send('40'); // Connect

            socket.setInterval(function timeout() {
                socket.send('2'); // Ping
            }, 20000);

            // Join Project
            const projectId = 'test-project-' + (Math.floor(Math.random() * 10) + 1);
            socket.send(`42["join-project", {"projectId": "${projectId}"}]`);

            // Send Presence Heartbeat
            socket.setInterval(function heartbeat() {
                socket.send(`42["heartbeat", {"projectId": "${projectId}"}]`);
            }, 20000);

            // Simulate Comment (Throttle test)
            // Send 6 comments rapidly
            for (let i = 0; i < 6; i++) {
                socket.send(`42["comment.create", {"projectId": "${projectId}", "body": "Load test comment ${i}"}]`);
            }
        });

        socket.on('message', function (message) {
            if (message.startsWith('44')) {
                // Error
                console.log(`Error received: ${message}`);
            }
        });

        socket.on('close', function () {
            console.log('disconnected');
        });
    });

    check(res, { 'status is 101': (r) => r && r.status === 101 });
}
