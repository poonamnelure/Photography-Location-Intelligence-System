import IORedis from "ioredis";

console.log(process.env.REDIS_URL)
if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set. Add it to backend/.env');
}

export const redisConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // 🔥 REQUIRED for BullMQ
  tls: {},                   // 🔥 REQUIRED for Upstash TLS connections
});

export const QUEUE_NAME = "photo-processing";

