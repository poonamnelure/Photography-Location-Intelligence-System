// src/utils/aiProcessor.js
// ─────────────────────────────────────────────────────────────────────────────
// Raw image analysis engine — type-agnostic. Returns everything measurable
// about an image. The scoringEngine.js then applies photography-type logic.
//
// Pipeline:
//   1. Google Vision  → labels, faces, colors, text, objects, safe-search
//   2. Sharp (local)  → Laplacian sharpness, histogram, noise, face crops
// ─────────────────────────────────────────────────────────────────────────────

import vision from '@google-cloud/vision';
import sharp from 'sharp';
import path from 'path';

const client = new vision.ImageAnnotatorClient();

/* ═══════════════════════ INTERNAL HELPERS ════════════════════════════════ */

/** Convert R,G,B integers → CSS hex string */
const rgbToHex = (r, g, b) =>
  '#' + [r, g, b]
    .map(v => Math.round(Math.max(0, Math.min(255, v || 0)))
      .toString(16).padStart(2, '0'))
    .join('');

/** Map Vision API likelihood strings → [0, 1] probability */
const likelihoodScore = (val) =>
({
  VERY_LIKELY: 1.00,
  LIKELY: 0.75,
  POSSIBLE: 0.50,
  UNLIKELY: 0.15,
  VERY_UNLIKELY: 0.05,
  UNKNOWN: 0.00,
}[val] ?? 0.00);

/**
 * Compute Laplacian variance — the gold-standard blur metric used in
 * professional image processing.  High variance = sharp; low = blurry.
 *
 * Uses the full 3×3 Laplacian kernel:
 *   -1 -1 -1
 *   -1  8 -1
 *   -1 -1 -1
 */
const computeLaplacianVariance = (data, width, height) => {
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const c = y * width + x;
      const lap =
        -data[c - width - 1] - data[c - width] - data[c - width + 1]
        - data[c - 1] + 8 * data[c] - data[c + 1]
        - data[c + width - 1] - data[c + width] - data[c + width + 1];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean; // variance of Laplacian
};

/** Build a 256-bin greyscale histogram from a raw buffer */
const buildHistogram = (data) => {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < data.length; i++) hist[data[i]]++;
  return hist;
};

/** Find the pixel value at percentile p (0–1) from a histogram */
const histogramPercentile = (hist, total, p) => {
  let cum = 0;
  const target = total * p;
  for (let i = 0; i < 256; i++) {
    cum += hist[i];
    if (cum >= target) return i;
  }
  return 255;
};

/* ═══════════════════════ MAIN PROCESSOR ═════════════════════════════════ */

/**
 * processImage(imagePath)
 *
 * Returns a rich, type-agnostic analysis object covering:
 *  - Sharpness (Laplacian variance)
 *  - Exposure, contrast, dynamic range, noise
 *  - Color palette, temperature, saturation, brightness
 *  - Lighting style (golden hour, blue hour, low-key, night …)
 *  - Face details (brightness, eye sharpness, emotions)
 *  - Scene labels, detected objects, text
 *  - Safe-search flags
 */
export const processImage = async (imagePath) => {
  const absolutePath = path.resolve(imagePath);

  /* ──────────────────── 1. GOOGLE VISION API ─────────────────────────── */
  const [result] = await client.annotateImage({
    image: { source: { filename: absolutePath } },
    features: [
      { type: 'LABEL_DETECTION',      maxResults: 25 },
      { type: 'FACE_DETECTION',       maxResults: 10 },
      { type: 'IMAGE_PROPERTIES' },
      { type: 'TEXT_DETECTION' },
      { type: 'SAFE_SEARCH_DETECTION' },
      { type: 'OBJECT_LOCALIZATION',  maxResults: 20 },
    ],
  });

  const labels      = result.labelAnnotations               || [];
  const faces       = result.faceAnnotations                || [];
  const colors      = result.imagePropertiesAnnotation
    ?.dominantColors?.colors                                || [];
  const rawText     = result.textAnnotations?.[0]?.description || '';
  const objects     = result.localizedObjectAnnotations     || [];
  const safeSearch  = result.safeSearchAnnotation           || {};

  /* ──────────────────── 2. IMAGE METADATA ────────────────────────────── */
  const meta      = await sharp(absolutePath).metadata();
  const imgW      = meta.width  || 1;
  const imgH      = meta.height || 1;
  const megapixels = (imgW * imgH) / 1_000_000;
  const aspectRatio = Number((imgW / imgH).toFixed(3));

  /* ──────────────────── 3. GREYSCALE BUFFER (normalised to 1000px) ───── */
  // Resize to a fixed width so Laplacian values are comparable across
  // images of wildly different resolutions.
  const { data: grayData, info: grayInfo } = await sharp(absolutePath)
    .resize(1000, null, { withoutEnlargement: true })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  /* ──────────────────── 4. SHARPNESS (Laplacian Variance) ────────────── */
  const lapVariance   = computeLaplacianVariance(grayData, grayInfo.width, grayInfo.height);
  //  Calibration guide (empirical for 1000 px images):
  //    < 80   → severely blurry
  //    80–200 → slightly blurry / soft
  //    200–600 → acceptable
  //    600–1500 → sharp
  //    > 1500 → very sharp
  const sharpnessScore = Number(Math.min(lapVariance / 1500, 1).toFixed(3));
  const isBlurry       = lapVariance < 120;

  /* ──────────────────── 5. HISTOGRAM / EXPOSURE ──────────────────────── */
  const histogram = buildHistogram(grayData);
  const total     = grayData.length;

  const p5   = histogramPercentile(histogram, total, 0.05);
  const p50  = histogramPercentile(histogram, total, 0.50);  // median brightness
  const p95  = histogramPercentile(histogram, total, 0.95);

  const dynamicRange   = Number(((p95 - p5) / 255).toFixed(3));
  const isOverexposed  = p95 > 248 && p5 > 110;
  const isUnderexposed = p95 < 140 && p5 < 25;
  const medianBrightness = p50 / 255;

  /* ──────────────────── 6. CONTRAST (RMS) ───────────────────────────── */
  let pixMean = 0;
  for (let i = 0; i < grayData.length; i++) pixMean += grayData[i];
  pixMean /= grayData.length;

  let pixVar = 0;
  for (let i = 0; i < grayData.length; i++) pixVar += (grayData[i] - pixMean) ** 2;
  pixVar /= grayData.length;

  const contrast = Number(Math.min(Math.sqrt(pixVar) / 80, 1).toFixed(3));

  /* ──────────────────── 7. NOISE ESTIMATION ──────────────────────────── */
  // Measure local (block-level) variance in shadow/midtone regions.
  // Real noise is random high-frequency content in areas that should be smooth.
  const { data: noiseData, info: noiseInfo } = await sharp(absolutePath)
    .resize(320, 320, { fit: 'cover' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let localVarSum = 0, blockCount = 0;
  const bSize = 8;
  for (let by = 0; by < Math.floor(noiseInfo.height / bSize); by++) {
    for (let bx = 0; bx < Math.floor(noiseInfo.width / bSize); bx++) {
      let bSum = 0, bSumSq = 0;
      for (let y = 0; y < bSize; y++) {
        for (let x = 0; x < bSize; x++) {
          const v = noiseData[(by * bSize + y) * noiseInfo.width + (bx * bSize + x)];
          bSum += v; bSumSq += v * v;
        }
      }
      const bMean = bSum / (bSize * bSize);
      const bVar  = bSumSq / (bSize * bSize) - bMean * bMean;
      // Only shadow / midtone blocks — noise is most visible there
      if (bMean < 180) { localVarSum += bVar; blockCount++; }
    }
  }
  const noiseLevel = Number(Math.min(blockCount > 0 ? (localVarSum / blockCount) / 500 : 0.5, 1).toFixed(3));

  /* ──────────────────── 8. COLOR ANALYSIS ───────────────────────────── */
  const domColor = colors[0]?.color || { red: 128, green: 128, blue: 128 };
  const r = domColor.red   || 0;
  const g = domColor.green || 0;
  const b = domColor.blue  || 0;

  // Global brightness from dominant colour (fast approximation)
  const globalBrightness = Number(((r + g + b) / (3 * 255)).toFixed(3));

  // HSV saturation
  const maxC = Math.max(r, g, b) / 255;
  const minC = Math.min(r, g, b) / 255;
  const saturation = Number((maxC > 0 ? (maxC - minC) / maxC : 0).toFixed(3));

  // Warm / cool / neutral colour temperature
  const warmth = r - b;
  const colorTemperature = warmth > 35 ? 'WARM' : warmth < -35 ? 'COOL' : 'NEUTRAL';

  // Top-5 colour swatches for the frontend
  const colorPalette = colors.slice(0, 5).map(c => ({
    hex:           rgbToHex(c.color.red, c.color.green, c.color.blue),
    score:         Number((c.score        || 0).toFixed(3)),
    pixelFraction: Number((c.pixelFraction || 0).toFixed(3)),
  }));

  /* ──────────────────── 9. LIGHTING STYLE DETECTION ─────────────────── */
  // Golden hour: warm orange-amber dominant, moderate brightness
  const isGoldenHour = r > 190 && g > 110 && g < 225 && b < 130 &&
    globalBrightness > 0.28 && globalBrightness < 0.75;

  // Blue hour: dominant blue, dim but not pitch-black
  const isBlueHour = b > r * 1.15 && b > 85 &&
    globalBrightness > 0.15 && globalBrightness < 0.60 &&
    !isGoldenHour;

  // Night: very dark overall
  const isNight     = globalBrightness < 0.20;
  const isHighKey   = globalBrightness > 0.75;
  const isLowKeyBg  = globalBrightness < 0.28;

  /* ──────────────────── 10. FACE ANALYSIS ───────────────────────────── */
  let faceBrightness = globalBrightness;
  let eyeSharpness   = 0;
  let maxFaceScore   = 0;
  const faceDetails  = [];

  for (const f of faces) {
    const joyScore      = likelihoodScore(f.joyLikelihood);
    const sorrowScore   = likelihoodScore(f.sorrowLikelihood);
    const angerScore    = likelihoodScore(f.angerLikelihood);
    const surpriseScore = likelihoodScore(f.surpriseLikelihood);
    const blurOk        = 1 - likelihoodScore(f.blurredLikelihood);
    const exposureOk    = 1 - likelihoodScore(f.underExposedLikelihood);
    const confidence    = f.detectionConfidence || 0.50;

    // Positive emotion weighted more than neutral or negative
    const emotionScore   = joyScore * 0.55 + surpriseScore * 0.15 +
      Math.max(0, 1 - sorrowScore) * 0.15 + Math.max(0, 1 - angerScore) * 0.15;
    const technicalScore = blurOk * 0.50 + exposureOk * 0.50;
    const faceScore      = (emotionScore * 0.45 + technicalScore * 0.55) * confidence;

    maxFaceScore = Math.max(maxFaceScore, faceScore);

    // Crop the face region for accurate brightness measurement
    const v  = f.boundingPoly?.vertices || [];
    if (v.length >= 3) {
      const left = Math.max(0, Math.round(v[0]?.x || 0));
      const top  = Math.max(0, Math.round(v[0]?.y || 0));
      const fw   = Math.max(1, Math.round((v[2]?.x || 0) - left));
      const fh   = Math.max(1, Math.round((v[2]?.y || 0) - top));

      if (fw > 10 && fh > 10) {
        try {
          // ── face brightness ──
          const safeW = Math.min(fw, imgW - left);
          const safeH = Math.min(fh, imgH - top);

          const faceBuf = await sharp(absolutePath)
            .extract({ left, top, width: safeW, height: safeH })
            .greyscale()
            .raw()
            .toBuffer();

          let fSum = 0;
          for (let i = 0; i < faceBuf.length; i++) fSum += faceBuf[i];
          faceBrightness = (fSum / faceBuf.length) / 255;

          // ── eye-region sharpness (upper ~28 % of face box) ──
          const eyeTop = top  + Math.floor(fh * 0.22);
          const eyeH   = Math.floor(fh * 0.28);
          if (eyeH > 5) {
            const { data: eyeData, info: eyeInfo } = await sharp(absolutePath)
              .extract({
                left,
                top:    eyeTop,
                width:  Math.min(fw, imgW - left),
                height: Math.min(eyeH, imgH - eyeTop),
              })
              .greyscale()
              .raw()
              .toBuffer({ resolveWithObject: true });

            const eyeLap = computeLaplacianVariance(eyeData, eyeInfo.width, eyeInfo.height);
            eyeSharpness = Number(Math.min(eyeLap / 800, 1).toFixed(3));
          }

          // ── face size fraction ──
          const faceArea = (safeW * safeH) / (imgW * imgH);

          faceDetails.push({
            confidence: Number(confidence.toFixed(3)),
            emotions: {
              joy:      Number(joyScore.toFixed(3)),
              sorrow:   Number(sorrowScore.toFixed(3)),
              anger:    Number(angerScore.toFixed(3)),
              surprise: Number(surpriseScore.toFixed(3)),
            },
            dominant_emotion: Object.entries({
              joy: joyScore, sorrow: sorrowScore,
              anger: angerScore, surprise: surpriseScore,
            }).sort((a, b) => b[1] - a[1])[0][0],
            blurred:     f.blurredLikelihood,
            underexposed: f.underExposedLikelihood,
            faceArea:    Number(faceArea.toFixed(4)),
          });
        } catch (_) { /* bounding box slightly out-of-range — skip gracefully */ }
      }
    }
  }

  // Low-key portrait: dark background but face is well-lit
  const isLowKey = isLowKeyBg && faceBrightness > 0.45 && faces.length > 0;

  // Final lighting style string
  let lightingStyle = 'NORMAL';
  if      (isLowKey)        lightingStyle = 'LOW_KEY';
  else if (isGoldenHour)    lightingStyle = 'GOLDEN_HOUR';
  else if (isBlueHour)      lightingStyle = 'BLUE_HOUR';
  else if (isNight)         lightingStyle = 'NIGHT';
  else if (isHighKey)       lightingStyle = 'HIGH_KEY';
  else if (isOverexposed)   lightingStyle = 'OVEREXPOSED';
  else if (isUnderexposed)  lightingStyle = 'UNDEREXPOSED';

  /* ──────────────────── 11. LABELS & OBJECTS ─────────────────────────── */
  const labelMap = {};
  labels.forEach(l => { labelMap[l.description] = Number((l.score || 0).toFixed(3)); });

  const compositionKeywords = [
    'Portrait', 'Photography', 'Model', 'Fashion', 'Landscape',
    'Architecture', 'Wildlife', 'Nature', 'Street', 'Art',
    'Light', 'Shadow', 'Reflection',
  ];
  let compositionScore = 0;
  for (const l of labels) {
    if (compositionKeywords.includes(l.description)) compositionScore += l.score;
  }
  compositionScore = Number(Math.min(compositionScore, 1).toFixed(3));

  const detectedObjects = objects.map(o => ({
    name:  o.name,
    score: Number((o.score || 0).toFixed(3)),
  }));

  /* ──────────────────── 12. SAFETY ──────────────────────────────────── */
  const isSafe =
    ['VERY_UNLIKELY', 'UNLIKELY'].includes(safeSearch.adult) &&
    ['VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE'].includes(safeSearch.violence);

  /* ──────────────────── 13. ASSEMBLE OUTPUT ──────────────────────────── */
  return {
    // ── Sharpness ──
    sharpnessScore,
    lapVariance:       Number(lapVariance.toFixed(1)),
    isBlurry,

    // ── Exposure & Tone ──
    dynamicRange,
    contrast,
    medianBrightness:  Number(medianBrightness.toFixed(3)),
    isOverexposed,
    isUnderexposed,
    noiseLevel,

    // ── Resolution ──
    megapixels:   Number(megapixels.toFixed(2)),
    width:        imgW,
    height:       imgH,
    aspectRatio,

    // ── Color ──
    colorPalette,
    colorTemperature,
    saturation,
    brightness: globalBrightness,

    // ── Lighting ──
    lightingStyle,
    isGoldenHour,
    isBlueHour,
    isNight,
    isHighKey,
    isLowKey,

    // ── Faces ──
    faces: {
      count:       faces.length,
      details:     faceDetails,
      brightness:  Number(faceBrightness.toFixed(3)),
      eyeSharpness,
      score:       Number(maxFaceScore.toFixed(3)),
    },

    // ── Scene ──
    labels:           labels.slice(0, 15).map(l => l.description),
    labelMap,
    objects:          detectedObjects,
    scene:            labels[0]?.description || 'Unknown',
    compositionScore,

    // ── Text ──
    text:             rawText.slice(0, 300),
    hasExcessiveText: rawText.length > 80,

    // ── Safety ──
    isSafe,
  };
};