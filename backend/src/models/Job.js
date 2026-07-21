// src/models/Job.js
import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    userId: { type: String, required: false, default: null },  // ← ADD

    photoIds: [mongoose.Schema.Types.ObjectId],

    photographyType: {
      type:    String,
      enum:    ['LANDSCAPE', 'PORTRAIT', 'STREET', 'ASTROPHOTOGRAPHY', 'WILDLIFE', 'ARCHITECTURE', 'GENERAL'],
      default: 'GENERAL',
    },

    status: {
      type:    String,
      enum:    ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },

    progress: {
      type:    Number,
      default: 0,
    },

    stage: {
      type:    String,
      default: 'Queued',
    },

    // Result breakdown populated after completion
    summary: {
      total:    { type: Number, default: 0 },
      best:     { type: Number, default: 0 },
      average:  { type: Number, default: 0 },
      rejected: { type: Number, default: 0 },
      failed:   { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Job', jobSchema);