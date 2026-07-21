// src/models/Photo.js
import mongoose from 'mongoose';

const faceDetailSchema = new mongoose.Schema({
  confidence:       Number,
  emotions: {
    joy:      Number,
    sorrow:   Number,
    anger:    Number,
    surprise: Number,
  },
  dominant_emotion: String,
  blurred:          String,
  underexposed:     String,
  faceArea:         Number,
}, { _id: false });

const colorSwatchSchema = new mongoose.Schema({
  hex:           String,
  score:         Number,
  pixelFraction: Number,
}, { _id: false });

const photoSchema = new mongoose.Schema(
  {
    userId: { type: String, required: false, default: null },
    imageUrl: {
      type:     String,
      required: true,
    },

    photographyType: {
      type:    String,
      enum:    ['LANDSCAPE', 'PORTRAIT', 'STREET', 'ASTROPHOTOGRAPHY', 'WILDLIFE', 'ARCHITECTURE', 'GENERAL'],
      default: 'GENERAL',
    },

    status: {
      type:    String,
      enum:    ['UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED'],
      default: 'UPLOADED',
    },

    category: {
      type:    String,
      enum:    ['BEST', 'AVERAGE', 'REJECTED'],
      default: 'AVERAGE',
    },

    /* ── Scores produced by scoringEngine.js ── */
    scores: {
      qualityScore:   Number,   // 0–1 technical quality
      aestheticScore: Number,   // 0–1 type-specific aesthetic quality
      breakdown:      mongoose.Schema.Types.Mixed, // per-factor scores
    },

    /* ── Photographer feedback ── */
    feedback: {
      reasons:  [String],  // why it scored well
      warnings: [String],  // what could be improved
    },

    /* ── Raw analysis from aiProcessor.js ── */
    analysis: {
      // Sharpness
      sharpnessScore:    Number,
      lapVariance:       Number,
      isBlurry:          Boolean,

      // Exposure & tone
      dynamicRange:      Number,
      contrast:          Number,
      medianBrightness:  Number,
      isOverexposed:     Boolean,
      isUnderexposed:    Boolean,
      noiseLevel:        Number,

      // Resolution
      megapixels:        Number,
      width:             Number,
      height:            Number,
      aspectRatio:       Number,

      // Color
      colorPalette:      [colorSwatchSchema],
      colorTemperature:  String,
      saturation:        Number,
      brightness:        Number,

      // Lighting
      lightingStyle:     String,
      isGoldenHour:      Boolean,
      isBlueHour:        Boolean,
      isNight:           Boolean,
      isHighKey:         Boolean,
      isLowKey:          Boolean,

      // Faces
      faces: {
        count:       Number,
        details:     [faceDetailSchema],
        brightness:  Number,
        eyeSharpness: Number,
        score:       Number,
      },

      // Scene
      labels:           [String],
      objects:          mongoose.Schema.Types.Mixed,
      scene:            String,
      compositionScore: Number,

      // Text
      text:             String,
      hasExcessiveText: Boolean,

      // Safety
      isSafe:           Boolean,
    },
  },
  { timestamps: true }
);

// Useful indexes for gallery queries
photoSchema.index({ photographyType: 1, category: 1 });
photoSchema.index({ category: 1, 'scores.aestheticScore': -1 });
photoSchema.index({ status: 1 });

export default mongoose.model('Photo', photoSchema);