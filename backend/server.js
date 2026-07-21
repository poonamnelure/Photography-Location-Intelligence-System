// Env vars are loaded via --env-file=.env in the npm start/dev scripts
// (Node v20+ built-in, runs before any module is evaluated)

import app from './src/app.js';
import connectDB from './src/config/db.js';
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

await connectDB();

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);

    // ── Spawn photo worker as a child process ─────────────────────────────
    // This runs alongside the API so we only need one Render Web Service.
    const workerPath = resolve(__dirname, 'src/workers/photo.worker.js');
    const worker = spawn(process.execPath, [workerPath], {
        stdio: 'inherit',   // pipe worker logs directly to server stdout
        env: process.env,   // share all env vars (Render injects them here)
    });

    worker.on('exit', (code, signal) => {
        console.warn(`[Worker] Photo worker exited (code=${code}, signal=${signal}). API continues running.`);
    });

    worker.on('error', (err) => {
        console.error('[Worker] Failed to start photo worker:', err.message);
    });

    console.log(`[Worker] Photo worker spawned (PID: ${worker.pid})`);
});