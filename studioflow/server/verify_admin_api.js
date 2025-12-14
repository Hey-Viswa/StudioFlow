import http from 'http';

const testAdminAPI = () => {
    console.log('🧪 Testing Contact Admin API...');

    const options = {
        hostname: 'localhost',
        port: 5000, // Assuming server runs on 5000? Let's check. Usually 5000.
        path: '/api/contact',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        console.log(`GET /api/contact Status Code: ${res.statusCode}`);
        if (res.statusCode === 401 || res.statusCode === 403) {
            console.log('✅ Route exists and is protected (Expected without token)');
        } else if (res.statusCode === 200) {
            console.log('⚠️ Route is accessible publicly (Check middleware)');
        } else {
            console.log(`❓ Unexpected status: ${res.statusCode}`);
        }

        res.on('data', (d) => {
            // process.stdout.write(d);
        });
    });

    req.on('error', (error) => {
        console.error('❌ Request error:', error);
    });

    req.end();
};

testAdminAPI();
