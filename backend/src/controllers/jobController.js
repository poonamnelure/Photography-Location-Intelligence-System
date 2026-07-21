// src/controllers/jobController.js
import Job from '../models/Job.js';

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/jobs/:id/status
   Lightweight polling endpoint — returns job state & progress.
   Frontend polls this every 2–3 s while the worker runs.
───────────────────────────────────────────────────────────────────────── */
export const getJobStatus = async (req, res) => {
  
  // ✅ FIX: restrict job access to logged-in user
  const job = await Job.findOne({
    _id: req.params.id,
    userId: req.user.id   // 🔥 IMPORTANT LINE
  }).select(
    'status progress stage photographyType summary createdAt updatedAt'
  );

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found.' });
  }

  return res.json({
    success:         true,
    jobId:           job._id,
    status:          job.status,
    progress:        job.progress,    // 0–100
    stage:           job.stage,       // human-readable current step
    photographyType: job.photographyType,
    summary:         job.summary,     // { total, best, average, rejected, failed }
    createdAt:       job.createdAt,
    updatedAt:       job.updatedAt,
  });
};