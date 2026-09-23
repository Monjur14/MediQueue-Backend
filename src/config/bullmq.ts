import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

// BullMQ needs its own Redis connection
// maxRetriesPerRequest must be null for BullMQ
export const bullmqConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const noShowQueue = new Queue('no-show', {
  connection: bullmqConnection,
});

console.log('✅ BullMQ queues initialized');