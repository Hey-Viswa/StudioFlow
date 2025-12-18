
import http from 'http';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/health',
  method: 'GET',
  timeout: 2000
};

console.log('Testing connectivity to localhost:5000...');

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`Checking 5000 failed: ${e.message}`);
  // Try 5001 just in case
   console.log('Testing connectivity to localhost:5001...');
    const req2 = http.request({...options, port: 5001}, (res) => {
        console.log(`STATUS 5001: ${res.statusCode}`);
    });
    req2.on('error', (e2) => {
        console.error(`Checking 5001 failed: ${e2.message}`);
    });
    req2.end();
});

req.end();
