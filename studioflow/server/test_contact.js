import http from 'http';

const data = JSON.stringify({
    name: 'Test Debugger',
    email: 'debug@studioflow.studio',
    subject: 'API Test',
    message: 'Testing API connectivity from server-side script.'
});

const options = {
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/contact',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => console.log('BODY:', body));
});

req.on('error', (e) => {
    console.error('PROBLEM:', e);
});

req.write(data);
req.end();
