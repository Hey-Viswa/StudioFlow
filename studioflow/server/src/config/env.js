
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root (../../.env relative to this file's location in src/config)
// server is at studioflow/server
// this file is at studioflow/server/src/config
// so root is ../../../
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
// Wait, index.js used ../../.env from server/
// server/index.js -> ../../.env (StudioFlow/.env)
// server/src/config/env.js -> ../../../.env?
// server/src/config is 2 levels deeper than server/.
// So ../../../ is server/.
// ../../../../ is StudioFlow/.

console.log('[Config] Loaded environment variables from root');
