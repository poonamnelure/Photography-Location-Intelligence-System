// src/workers/photo.worker.js
// ─────────────────────────────────────────────────────────────────────────────
// BullMQ worker that processes photo-analysis jobs.
//
// Architecture (two-step pipeline per photo):
//   Step 1: aiProcessor.processImage()  → raw analysis (Vision API + sharp)
//   Step 2: scoringEngine.scoreImage()  → type-aware scores + category + feedback
//
// Runs as a standalone Node process: `node src/workers/photo.worker.js`
// ─────────────────────────────────────────────────────────────────────────────

// ✅ FIX 1: Use absolute path for .env so worker finds it no matter where it runs from
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// This walks up from src/workers/ → src/ → backend/ → finds .env
// When spawned by server.js on Render, env vars are already injected — this is a no-op
config({ path: resolve(__dirname, '../../.env') });

// ✅ FIX: On Render, write the Google Vision JSON key from a base64 env var
// Add GOOGLE_CREDENTIALS_BASE64 to your Render environment variables
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  const keyPath = resolve(__dirname, '../../keys/google-vision-key.json');
  const keysDir = resolve(__dirname, '../../keys');
  if (!existsSync(keysDir)) mkdirSync(keysDir, { recursive: true });
  if (!existsSync(keyPath)) {
    writeFileSync(keyPath, Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8'));
    console.log('✅ Worker: Google Vision key written from env var');
  }
  process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
}


import mongoose from 'mongoose';
import { Worker } from 'bullmq';

import { redisConnection, QUEUE_NAME } from '../config/redis.js';
import Photo from '../models/Photo.js';
import Job from '../models/Job.js';
import { processImage } from '../utils/aiProcessor.js';
import { scoreImage } from '../utils/scoringEngine.js';

/* ── DB connection ── */
// ✅ FIX 2: Log which DB the worker is connecting to so you can verify
console.log('🔗 Worker connecting to:', process.env.MONGO_URI);
await mongoose.connect(process.env.MONGO_URI);
console.log('🟢 Worker: MongoDB connected');

/* ══════════════════════════════════════════════════════════════════════════
   JOB PROCESSOR
══════════════════════════════════════════════════════════════════════════ */
const worker = new Worker(
  QUEUE_NAME,

  async (bullJob) => {
    const { jobId, photoIds, photographyType } = bullJob.data;

    console.log(
      `\n🟡 Job ${jobId} started` +
      ` | type: ${photographyType}` +
      ` | photos: ${photoIds.length}`
    );

    const summary = {
      total: photoIds.length,
      best: 0,
      average: 0,
      rejected: 0,
      failed: 0,
    };

    try {
      await Job.findByIdAndUpdate(jobId, {
        status: 'PROCESSING',
        progress: 0,
        stage: 'Starting AI analysis',
      });

      /* ── Process each photo ── */
      for (let i = 0; i < photoIds.length; i++) {
        const photoId = photoIds[i];

        try {
          const photo = await Photo.findById(photoId);
          if (!photo) {
            console.warn(`⚠️  Photo ${photoId} not found — skipping`);
            summary.failed++;
            continue;
          }

          await Photo.findByIdAndUpdate(photoId, { status: 'PROCESSING' });

          // ✅ FIX 3: Use absolute path from project root (backend/)
          // photo.imageUrl is like "/uploads/1234567890.jpg"
          // We need absolute path: /path/to/backend/uploads/1234567890.jpg
          const backendRoot = resolve(__dirname, '../../');
          const imagePath = resolve(
            backendRoot,
            photo.imageUrl.replace(/^\//, '') // remove leading slash → "uploads/filename.jpg"
          );

          console.log(`  🖼️  [${i + 1}/${photoIds.length}] ${imagePath}`);

          /* ─── Step 1: Raw analysis ─── */
          const rawAnalysis = await processImage(imagePath);

          /* ─── Step 2: Type-aware scoring ─── */
          const scored = scoreImage(rawAnalysis, photographyType);

          /* ─── Step 3: Persist ─── */
          await Photo.findByIdAndUpdate(photoId, {
            status: 'PROCESSED',
            category: scored.category,
            scores: {
              qualityScore: scored.qualityScore,
              aestheticScore: scored.aestheticScore,
              breakdown: scored.breakdown,
            },
            feedback: {
              reasons: scored.reasons,
              warnings: scored.warnings,
            },
            analysis: {
              sharpnessScore: rawAnalysis.sharpnessScore,
              lapVariance: rawAnalysis.lapVariance,
              isBlurry: rawAnalysis.isBlurry,

              dynamicRange: rawAnalysis.dynamicRange,
              contrast: rawAnalysis.contrast,
              medianBrightness: rawAnalysis.medianBrightness,
              isOverexposed: rawAnalysis.isOverexposed,
              isUnderexposed: rawAnalysis.isUnderexposed,
              noiseLevel: rawAnalysis.noiseLevel,

              megapixels: rawAnalysis.megapixels,
              width: rawAnalysis.width,
              height: rawAnalysis.height,
              aspectRatio: rawAnalysis.aspectRatio,

              colorPalette: rawAnalysis.colorPalette,
              colorTemperature: rawAnalysis.colorTemperature,
              saturation: rawAnalysis.saturation,
              brightness: rawAnalysis.brightness,

              lightingStyle: rawAnalysis.lightingStyle,
              isGoldenHour: rawAnalysis.isGoldenHour,
              isBlueHour: rawAnalysis.isBlueHour,
              isNight: rawAnalysis.isNight,
              isHighKey: rawAnalysis.isHighKey,
              isLowKey: rawAnalysis.isLowKey,

              faces: rawAnalysis.faces,
              labels: rawAnalysis.labels,
              objects: rawAnalysis.objects,
              scene: rawAnalysis.scene,
              compositionScore: rawAnalysis.compositionScore,

              text: rawAnalysis.text,
              hasExcessiveText: rawAnalysis.hasExcessiveText,
              isSafe: rawAnalysis.isSafe,
            },
          });

          // Tally category
          const key = scored.category.toLowerCase();
          if (key in summary) summary[key]++;

          console.log(
            `  ✅ ${photoId} → ${scored.category}` +
            ` | Q:${scored.qualityScore} A:${scored.aestheticScore}` +
            (scored.reasons[0] ? ` | "${scored.reasons[0]}"` : '')
          );

        } catch (photoErr) {
          console.error(`  ❌ Photo ${photoId} failed:`, photoErr.message);
          await Photo.findByIdAndUpdate(photoId, { status: 'FAILED' });
          summary.failed++;
        }

        /* ── Progress update ── */
        const progress = Math.round(((i + 1) / photoIds.length) * 100);
        await Job.findByIdAndUpdate(jobId, {
          progress,
          stage: `Analysed ${i + 1} of ${photoIds.length} photos`,
          summary,
        });
        await bullJob.updateProgress(progress);
      }

      /* ── Final job completion ── */
      await Job.findByIdAndUpdate(jobId, {
        status: 'COMPLETED',
        progress: 100,
        stage: 'Completed',
        summary,
      });

      console.log(`\n🎉 Job ${jobId} completed:`, summary);
      return { success: true, summary };

    } catch (fatalErr) {
      console.error(`\n💥 Job ${jobId} crashed:`, fatalErr);
      await Job.findByIdAndUpdate(jobId, {
        status: 'FAILED',
        stage: 'Job crashed — see worker logs',
      });
      throw fatalErr;
    }
  },

  {
    connection: redisConnection,
    concurrency: 3,
  }
);

/* ── Event hooks ── */
worker.on('completed', (job) =>
  console.log(`✅ BullMQ job ${job.id} completed`)
);
worker.on('failed', (job, err) =>
  console.error(`❌ BullMQ job ${job?.id} failed:`, err.message)
);

console.log('🚀 Photo worker running | concurrency: 3');