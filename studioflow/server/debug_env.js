
import dotenv from 'dotenv';
dotenv.config();

console.log('--- ENV DEBUG ---');
console.log('ENABLE_REDIS_QUEUE:', process.env.ENABLE_REDIS_QUEUE);
console.log('REDIS_URL:', process.env.REDIS_URL || 'Not Set');
console.log('REDIS_HOST:', process.env.REDIS_HOST || 'Not Set');
console.log('REDIS_PORT:', process.env.REDIS_PORT || 'Not Set');
console.log('REDIS_TLS:', process.env.REDIS_TLS || 'Not Set');
console.log('-----------------');
