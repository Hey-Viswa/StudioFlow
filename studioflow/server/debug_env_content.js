import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

try {
    const content = fs.readFileSync(envPath, 'utf8');
    console.log(`Successfully read .env from ${envPath} (${content.length} bytes)`);

    // Split lines and print keys
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const parts = trimmed.split('=');
        const key = parts[0];
        const val = parts.slice(1).join('=');
        console.log(`Line ${i + 1}: ${key} = ${val ? (val.substring(0, 5) + '...') : 'EMPTY'}`);
    });
} catch (err) {
    console.error('Failed to read .env:', err.message);
}
