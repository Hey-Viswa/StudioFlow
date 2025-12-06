import { createQueue } from './QueueFactory.js';

const paymentQueue = createQueue('payment', {
    defaultJobOptions: {
        attempts: 5, // Higher attempts for payments
        backoff: {
            type: 'exponential',
            delay: 5000 // Start with 5s delay
        }
    }
});

// Backward compatibility export if needed (though named export is preferred)
export { paymentQueue };
export default paymentQueue;

