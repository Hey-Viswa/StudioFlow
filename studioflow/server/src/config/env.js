
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to find the .env file by checking multiple levels upwards
const searchPaths = [
    path.resolve(__dirname, '../../'), // server root
    path.resolve(__dirname, '../../../'), // studioflow root
    path.resolve(__dirname, '../../../../') // outer root
];

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
let loaded = false;

for (const dir of searchPaths) {
    const envPath = path.resolve(dir, envFile);
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`[Config] Loaded environment variables from ${envPath}`);
        loaded = true;
        break;
    }
}

// Fallback to default .env if specific one wasn't found
if (!loaded && envFile !== '.env') {
    for (const dir of searchPaths) {
        const fallBackPath = path.resolve(dir, '.env');
        if (fs.existsSync(fallBackPath)) {
            dotenv.config({ path: fallBackPath });
            console.log(`[Config] Loaded fallback environment variables from ${fallBackPath}`);
            loaded = true;
            break;
        }
    }
}

if (!loaded) {
    console.log(`[Config] No .env file found in expected locations.`);
}
