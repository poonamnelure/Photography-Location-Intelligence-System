import { Queue } from 'bullmq';
import { redisConnection, QUEUE_NAME } from '../config/redis.js';

const imageProcessingQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
});

export default imageProcessingQueue;