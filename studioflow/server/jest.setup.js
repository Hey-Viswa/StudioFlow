// Set environment variables before any imports
process.env.ENABLE_REDIS_QUEUE = 'false';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/studioflow-test';
