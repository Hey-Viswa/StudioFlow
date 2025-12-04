import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env');
console.log('Reading .env from:', envPath);

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    console.log('--- Keys in .env ---');
    lines.forEach(line => {
        const match = line.match(/^([^=]+)=/);
        if (match) {
            console.log(match[1]);
        }
    });

    const mongoLine = lines.find(line => line.trim().startsWith('MONGODB_URI='));
    if (mongoLine) {
        console.log('MONGODB_URI found:', mongoLine.substring(0, 20) + '...');
    } else {
        console.log('MONGODB_URI not found in .env (checked with trim)');
    }
} catch (err) {
    console.error('Error reading .env:', err);
}
