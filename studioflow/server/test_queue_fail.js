
import Queue from 'bull';
import Redis from 'ioredis';

const queueName = 'crash-test-queue';

console.log('Test: Initializing Queue...');

const createClient = (type) => {
    // Force connection to bad port
    const client = new Redis({
        port: 9999,
        host: 'localhost',
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => 100 // retry fast
    });

    client.on('error', (err) => {
        console.log(`[Redis ${type}] Error caught: ${err.message.substring(0, 20)}...`);
    });

    return client;
};

const queue = new Queue(queueName, {
    createClient
});

queue.on('error', (error) => {
    console.log(`[Queue] Error caught: ${error.message}`);
});

console.log('Test: Queue initialized. Waiting...');

setTimeout(() => {
    console.log('Test: 5 seconds passed. Exiting.');
    process.exit(0);
}, 5000);
