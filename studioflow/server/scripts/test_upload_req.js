import fs from 'fs';
import FormData from 'form-data';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const form = new FormData();
const filePath = path.join(__dirname, 'test_upload.txt');
form.append('files', fs.createReadStream(filePath));

const request = http.request({
    method: 'POST',
    host: 'localhost',
    port: 5000,
    path: '/api/upload',
    headers: form.getHeaders(),
}, (response) => {
    let data = '';
    response.on('data', (chunk) => {
        data += chunk;
    });
    response.on('end', () => {
        console.log('Status:', response.statusCode);
        console.log('Body:', data);
    });
});

form.pipe(request);
