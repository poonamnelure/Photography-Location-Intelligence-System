// src/utils/scoringEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// Converts raw aiProcessor analysis into photography-type-aware scores,
// category (BEST / AVERAGE / REJECTED) and human-readable photographer feedback.
//
// Each type has its own scoring function that weights factors the way a
// professional photographer of that genre would:
//   - Landscape photographer cares about golden hour & saturation
//   - Portrait photographer rejects any image without a face
//   - Astrophotographer wants a dark sky and sharp stars
//   - Wildlife shooter demands a sharp animal and golden light
// ─────────────────────────────────────────────────────────────────────────────

import { PHOTOGRAPHY_CONFIG } from './photographyConfig.js';

/* ═══════════════════════ UTILITIES ═══════════════════════════════════════ */

const clamp = (v) => Math.max(0, Math.min(1, v || 0));
const r3    = (v) => Number(clamp(v).toFixed(3));

/**
 * labelMatchScore – how well the detected labels match the expected scene.
 * Returns 0.1 (baseline) when no labels match; caps near 1.0 at ≥3 matches.
 */
const labelMatchScore = (labelMap, preferredLabels) => {
  if (!preferredLabels || preferredLabels.length === 0) return 0.50;
  let score = 0;
  let matched = 0;
  for (const label of preferredLabels) {
    if (labelMap[label]) {
      score  += labelMap[label];
      matched++;
    }
  }
  if (matched === 0) return 0.10;
  // cap contribution at 3 label matches so a single tag-stuffed image
  // does not cheat its way to a high label score
  return r3(score / Math.min(matched, 3));
};

/* ═══════════════════════ PUBLIC API ═══════════════════════════════════════ */

/**
 * scoreImage(analysis, photographyType)
 *
 * @param {Object} analysis       – raw output from aiProcessor.processImage()
 * @param {string} photographyType – one of the PHOTOGRAPHY_TYPES keys
 * @returns {Object} { qualityScore, aestheticScore, category, breakdown, reasons, warnings }
 */
export const scoreImage = (analysis, photographyType = 'GENERAL') => {
  const config = PHOTOGRAPHY_CONFIG[photographyType] || PHOTOGRAPHY_CONFIG.GENERAL;

  // Dispatch to the correct per-type scorer
  let scores;
  switch (photographyType) {
    case 'LANDSCAPE':        scores = scoreLandscape(analysis, config);    break;
    case 'PORTRAIT':         scores = scorePortrait(analysis, config);     break;
    case 'STREET':           scores = scoreStreet(analysis, config);       break;
    case 'ASTROPHOTOGRAPHY': scores = scoreAstro(analysis, config);        break;
    case 'WILDLIFE':         scores = scoreWildlife(analysis, config);     break;
    case 'ARCHITECTURE':     scores = scoreArchitecture(analysis, config); break;
    default:                 scores = scoreGeneral(analysis, config);
  }

  const { category, reasons, warnings } =
    classifyImage(analysis, scores, config, photographyType);

  return {
    qualityScore:  r3(scores.qualityScore),
    aestheticScore: r3(scores.aestheticScore),
    category,
    breakdown: scores.breakdown,
    reasons,
    warnings,
  };
};

/* ═══════════════════════ PER-TYPE SCORERS ════════════════════════════════ */

/* ── LANDSCAPE ─────────────────────────────────────────────────────────── */
function scoreLandscape(a, config) {
  const w = config.weights;

  // Lighting is the single biggest differentiator for landscape
  let lightingScore;
  if      (a.isGoldenHour)           lightingScore = 0.96;
  else if (a.isBlueHour)             lightingScore = 0.88;
  else if (a.lightingStyle === 'NIGHT' && a.contrast > 0.35)
                                      lightingScore = 0.75; // dramatic night scene
  else if (a.isOverexposed)          lightingScore = 0.18;
  else if (a.isUnderexposed)         lightingScore = 0.30;
  else                               lightingScore = 0.52 + a.contrast * 0.22;

  // Color vibrancy: saturation + dynamic range together
  const colorVibrancy = clamp(a.saturation * 0.68 + a.dynamicRange * 0.32);

  // How many landscape-relevant labels were detected
  const subjectRelevance = labelMatchScore(a.labelMap, config.preferredLabels);

  // Composition bonus if composition-related labels also present
  const composition = clamp(subjectRelevance * 0.70 + a.compositionScore * 0.30);

  // Penalty multiplier
  let penalty = 1.0;
  if (a.hasExcessiveText) penalty -= config.textPenalty;
  if (a.isOverexposed)    penalty -= 0.12;
  if (a.saturation < config.thresholds.minSaturation) penalty -= 0.10;

  const aestheticScore =
    (a.sharpnessScore  * w.sharpness        +
     lightingScore      * w.lighting         +
     colorVibrancy      * w.colorVibrancy    +
     subjectRelevance   * w.subjectRelevance +
     a.dynamicRange     * w.dynamicRange)    * penalty;

  const qualityScore =
    a.sharpnessScore * 0.42 +
    (a.isBlurry ? 0 : 0.20) +
    a.dynamicRange   * 0.22 +
    a.saturation     * 0.16;

  return {
    qualityScore:  clamp(qualityScore),
    aestheticScore: clamp(aestheticScore),
    breakdown: {
      sharpness:        r3(a.sharpnessScore),
      lighting:         r3(lightingScore),
      colorVibrancy:    r3(colorVibrancy),
      subjectRelevance: r3(subjectRelevance),
      dynamicRange:     r3(a.dynamicRange),
      penalty:          r3(penalty),
    },
  };
}

/* ── PORTRAIT ──────────────────────────────────────────────────────────── */
function scorePortrait(a, config) {
  const w = config.weights;

  // Hard gate: portrait without a face scores near zero
  if (a.faces.count === 0) {
    return {
      qualityScore:  0.08,
      aestheticScore: 0.04,
      breakdown: { faceQuality: 0, note: 'No face detected' },
    };
  }

  const t = config.thresholds;
  const faceBright = a.faces.brightness;

  // Is the face within the ideal exposure window?
  const faceBrightOk =
    faceBright >= t.minFaceBrightness && faceBright <= t.maxFaceBrightness;

  // Penalise deviation from the ideal brightness (0.60)
  const exposureScore = faceBrightOk
    ? clamp(1 - Math.abs(faceBright - t.idealFaceBrightness) * 1.5)
    : 0.15;

  // Eye sharpness weighted more than overall frame sharpness for portraits
  const combinedSharpness = clamp(
    a.faces.eyeSharpness * 0.62 + a.sharpnessScore * 0.38
  );

  // Overall face quality composite
  const faceQuality = clamp(
    exposureScore            * 0.35 +
    combinedSharpness        * 0.40 +
    a.faces.score            * 0.25   // emotion & technical confidence
  );

  // Lighting style
  let lightingScore;
  if      (a.isLowKey)                           lightingScore = 0.90; // dramatic
  else if (faceBrightOk && !a.isOverexposed)     lightingScore = 0.80; // well-lit
  else if (a.isGoldenHour && faceBright > 0.35)  lightingScore = 0.85; // golden environmental
  else if (a.isOverexposed)                       lightingScore = 0.22;
  else if (faceBright < t.minFaceBrightness)      lightingScore = 0.28;
  else                                            lightingScore = 0.55;

  // Composition bonus for portrait-specific labels
  const composition = labelMatchScore(a.labelMap, config.preferredLabels);

  let penalty = 1.0;
  if (a.hasExcessiveText) penalty -= config.textPenalty;

  const aestheticScore =
    (faceQuality   * w.faceQuality  +
     combinedSharpness * w.sharpness   +
     lightingScore  * w.lighting     +
     composition    * w.composition) * penalty;

  const qualityScore =
    combinedSharpness * 0.35 +
    (a.isBlurry ? 0 : 0.20) +
    faceQuality        * 0.30 +
    (faceBrightOk ? 0.15 : 0.05);

  return {
    qualityScore:  clamp(qualityScore),
    aestheticScore: clamp(aestheticScore),
    breakdown: {
      faceQuality:     r3(faceQuality),
      eyeSharpness:    r3(a.faces.eyeSharpness),
      faceExposure:    r3(exposureScore),
      lighting:        r3(lightingScore),
      composition:     r3(composition),
      penalty:         r3(penalty),
    },
  };
}

/* ── STREET ────────────────────────────────────────────────────────────── */
function scoreStreet(a, config) {
  const w = config.weights;

  // Scene interest: how many street/urban labels detected
  const sceneInterest = labelMatchScore(a.labelMap, config.preferredLabels);

  // High contrast is a positive in street — it creates mood
  let lightingScore;
  if      (a.isGoldenHour)    lightingScore = 0.88;
  else if (a.contrast > 0.55) lightingScore = 0.82; // dramatic street contrast
  else if (a.isBlueHour)      lightingScore = 0.78;
  else if (a.isOverexposed)   lightingScore = 0.28;
  else                        lightingScore = 0.52 + a.contrast * 0.28;

  // Composition from scene labels + general composition score
  const composition = clamp(
    sceneInterest * 0.55 + a.compositionScore * 0.45
  );

  // Sharpness: blurry main subject is still rejected; selective motion blur is ok
  const sharpness = a.isBlurry
    ? a.sharpnessScore * 0.35  // severe global blur = harsh penalty
    : a.sharpnessScore;

  // Street text (signs, storefronts) adds to authenticity — no text penalty
  let penalty = 1.0;
  if (a.isOverexposed) penalty -= 0.12;

  const aestheticScore =
    (composition  * w.composition   +
     sharpness    * w.sharpness     +
     sceneInterest * w.sceneInterest +
     lightingScore * w.lighting)    * penalty;

  const qualityScore =
    a.sharpnessScore * 0.48 +
    (a.isBlurry ? 0 : 0.22) +
    a.dynamicRange   * 0.16 +
    a.contrast       * 0.14;

  return {
    qualityScore:  clamp(qualityScore),
    aestheticScore: clamp(aestheticScore),
    breakdown: {
      sharpness:     r3(sharpness),
      sceneInterest: r3(sceneInterest),
      composition:   r3(composition),
      lighting:      r3(lightingScore),
    },
  };
}

/* ── ASTROPHOTOGRAPHY ──────────────────────────────────────────────────── */
function scoreAstro(a, config) {
  const w   = config.weights;
  const t   = config.thresholds;

  // Darkness of the sky — inversely related to brightness
  const darknessScore = a.brightness < t.maxBrightness
    ? clamp(1 - a.brightness / t.maxBrightness)
    : 0.08;

  // Night-sky label detection
  const nightSkyScore = labelMatchScore(a.labelMap, config.preferredLabels);

  // Sharpness is king for astrophotography — stars must be pinpoints
  const sharpness = a.sharpnessScore;

  // Composition: foreground + sky balance
  const composition = clamp(
    nightSkyScore * 0.60 + a.compositionScore * 0.40
  );

  // Noise penalty: high ISO astrophotography is naturally noisy,
  // but extreme noise is still a quality concern
  const noisePenalty = a.noiseLevel > 0.75 ? 0.85 : 1.0;

  let penalty = 1.0 * noisePenalty;
  if (a.brightness > 0.35) penalty -= 0.30; // light pollution
  if (a.hasExcessiveText)  penalty -= config.textPenalty;

  const aestheticScore =
    (sharpness      * w.sharpness          +
     darknessScore  * w.backgroundDarkness +
     nightSkyScore  * w.nightSkyDetection  +
     composition    * w.composition)       * penalty;

  // Noise is acceptable (high ISO night shots) but blurriness is not
  const qualityScore =
    sharpness       * 0.55 +
    (a.isBlurry ? 0 : 0.20) +
    darknessScore   * 0.15 +
    (1 - Math.min(a.noiseLevel, 0.80)) * 0.10;

  return {
    qualityScore:  clamp(qualityScore),
    aestheticScore: clamp(aestheticScore),
    breakdown: {
      sharpness:         r3(sharpness),
      darkness:          r3(darknessScore),
      nightSkyDetection: r3(nightSkyScore),
      composition:       r3(composition),
      penalty:           r3(penalty),
    },
  };
}

/* ── WILDLIFE ──────────────────────────────────────────────────────────── */
function scoreWildlife(a, config) {
  const w = config.weights;

  // Animal detection: combine label score + object detection
  const animalLabelScore  = labelMatchScore(a.labelMap, config.preferredLabels);
  const animalObjectScore = a.objects.some(o =>
    config.preferredLabels.some(l => l.toLowerCase() === o.name?.toLowerCase())
  ) ? 0.80 : 0;
  const animalDetection = clamp(
    animalLabelScore * 0.60 + animalObjectScore * 0.40
  );

  // Sharpness of subject — the animal's eye must be sharp
  const subjectSharpness = clamp(
    a.sharpnessScore * 0.65 + a.faces.eyeSharpness * 0.35
  );

  // Natural light preferred; golden hour is spectacular for wildlife
  let lightingScore;
  if      (a.isGoldenHour)    lightingScore = 0.92;
  else if (a.isBlueHour)      lightingScore = 0.74;
  else if (a.lightingStyle === 'NORMAL' && a.contrast > 0.40) lightingScore = 0.72;
  else if (a.isOverexposed)   lightingScore = 0.22;
  else                        lightingScore = 0.50 + a.contrast * 0.22;

  // Composition: space around subject, environmental context
  const composition = clamp(
    animalDetection * 0.50 + a.compositionScore * 0.50
  );

  let penalty = 1.0;
  if (a.hasExcessiveText) penalty -= config.textPenalty;

  const aestheticScore =
    (subjectSharpness * w.subjectSharpness +
     animalDetection  * w.animalDetection  +
     composition      * w.composition      +
     lightingScore    * w.lighting)        * penalty;

  const qualityScore =
    a.sharpnessScore * 0.48 +
    (a.isBlurry ? 0 : 0.20) +
    animalDetection  * 0.18 +
    lightingScore    * 0.14;

  return {
    qualityScore:  clamp(qualityScore),
    aestheticScore: clamp(aestheticScore),
    breakdown: {
      subjectSharpness: r3(subjectSharpness),
      animalDetection:  r3(animalDetection),
      composition:      r3(composition),
      lighting:         r3(lightingScore),
    },
  };
}

/* ── ARCHITECTURE ──────────────────────────────────────────────────────── */
function scoreArchitecture(a, config) {
  const w = config.weights;

  // Building / landmark labels
  const relevance = labelMatchScore(a.labelMap, config.preferredLabels);

  // Every line and detail must be resolved
  const sharpness = a.sharpnessScore;

  // Blue hour + lit buildings = iconic; golden hour facades also excellent
  let lightingScore;
  if      (a.isBlueHour)      lightingScore = 0.92;  // classic architecture shot
  else if (a.isGoldenHour)    lightingScore = 0.88;
  else if (a.isNight && a.contrast > 0.40) lightingScore = 0.80; // lit at night
  else if (a.isOverexposed)   lightingScore = 0.22;
  else                        lightingScore = 0.55 + a.contrast * 0.20;

  // Neutral or complementary colour balance is preferred over colour casts
  const colorBalance = a.colorTemperature === 'NEUTRAL'
    ? 0.72
    : (a.isGoldenHour || a.isBlueHour) ? 0.85 : 0.58;

  // Geometric composition from labels
  const composition = clamp(
    relevance * 0.65 + a.compositionScore * 0.35
  );

  let penalty = 1.0;
  if (a.hasExcessiveText) penalty -= config.textPenalty;

  const aestheticScore =
    (sharpness    * w.sharpness    +
     composition  * w.composition  +
     lightingScore * w.lighting    +
     colorBalance * w.colorBalance) * penalty;

  const qualityScore =
    sharpness      * 0.55 +
    (a.isBlurry ? 0 : 0.22) +
    a.dynamicRange * 0.14 +
    a.contrast     * 0.09;

  return {
    qualityScore:  clamp(qualityScore),
    aestheticScore: clamp(aestheticScore),
    breakdown: {
      sharpness:    r3(sharpness),
      composition:  r3(composition),
      lighting:     r3(lightingScore),
      colorBalance: r3(colorBalance),
      relevance:    r3(relevance),
    },
  };
}

/* ── GENERAL ────────────────────────────────────────────────────────────── */
function scoreGeneral(a, config) {
  const w = config.weights;

  let lightingScore;
  if      (a.isGoldenHour)  lightingScore = 0.88;
  else if (a.isBlueHour)    lightingScore = 0.82;
  else if (a.isLowKey)      lightingScore = 0.80;
  else if (a.isOverexposed) lightingScore = 0.22;
  else                      lightingScore = 0.52 + a.contrast * 0.28;

  const faceQuality  = a.faces.count > 0 ? a.faces.score : 0.50;
  const composition  = a.compositionScore;

  let penalty = 1.0;
  if (a.hasExcessiveText) penalty -= config.textPenalty;

  const aestheticScore =
    (a.sharpnessScore * w.sharpness    +
     lightingScore    * w.lighting     +
     composition      * w.composition  +
     faceQuality      * w.faceQuality) * penalty;

  const qualityScore =
    a.sharpnessScore * 0.50 +
    (a.isBlurry ? 0 : 0.20) +
    a.dynamicRange   * 0.16 +
    a.saturation     * 0.14;

  return {
    qualityScore:  clamp(qualityScore),
    aestheticScore: clamp(aestheticScore),
    breakdown: {
      sharpness:    r3(a.sharpnessScore),
      lighting:     r3(lightingScore),
      composition:  r3(composition),
      faceQuality:  r3(faceQuality),
    },
  };
}

/* ═══════════════════════ CLASSIFICATION ══════════════════════════════════ */

/**
 * classifyImage – applies hard gates, then maps scores to BEST/AVERAGE/REJECTED
 * and generates photographer-friendly feedback.
 */
function classifyImage(analysis, scores, config, photographyType) {
  const reasons  = [];
  const warnings = [];
  const { best, average } = config.thresholds;

  /* ── Hard disqualifiers (type-agnostic) ── */

  if (!analysis.isSafe) {
    warnings.push('Image flagged by safe-search — hidden from results');
    return { category: 'REJECTED', reasons, warnings };
  }

  if (analysis.isBlurry) {
    warnings.push(
      `Image is blurry (sharpness score: ${analysis.sharpnessScore} — threshold: 0.08). ` +
      'Check focus, camera shake, or motion blur.'
    );
    return { category: 'REJECTED', reasons, warnings };
  }

  if (analysis.isOverexposed) {
    warnings.push('Highlights are blown out — consider reducing exposure by 1–2 stops.');
  }

  /* ── Type-specific hard gates ── */

  if (photographyType === 'PORTRAIT' && analysis.faces.count === 0) {
    warnings.push('No face detected — portraits require at least one visible face.');
    return { category: 'REJECTED', reasons, warnings };
  }

  if (photographyType === 'ASTROPHOTOGRAPHY' && analysis.brightness > 0.38) {
    warnings.push(
      'Image is too bright for astrophotography. ' +
      'Possible causes: light pollution, wrong white balance, or this is not a night-sky image.'
    );
    // Down-grade to AVERAGE rather than hard-reject if quality is otherwise decent
    if (scores.qualityScore >= average.quality) {
      return { category: 'AVERAGE', reasons, warnings };
    }
    return { category: 'REJECTED', reasons, warnings };
  }

  /* ── Category thresholds ── */

  if (scores.qualityScore >= best.quality && scores.aestheticScore >= best.aesthetic) {
    reasons.push(...generatePositiveReasons(analysis, photographyType));
    return { category: 'BEST', reasons, warnings: [...warnings, ...generateWarnings(analysis, photographyType, true)] };
  }

  if (scores.qualityScore >= average.quality && scores.aestheticScore >= average.aesthetic) {
    reasons.push(...generateMixedReasons(analysis, photographyType));
    warnings.push(...generateWarnings(analysis, photographyType, false));
    return { category: 'AVERAGE', reasons, warnings };
  }

  warnings.push(...generateWarnings(analysis, photographyType, false));
  return { category: 'REJECTED', reasons, warnings };
}

/* ═══════════════════════ REASON GENERATORS ══════════════════════════════ */

function generatePositiveReasons(a, type) {
  const r = [];

  // Sharpness
  if      (a.sharpnessScore > 0.75) r.push('Exceptional sharpness — crisp detail throughout');
  else if (a.sharpnessScore > 0.50) r.push('Good overall sharpness');

  // Lighting
  if      (a.isGoldenHour) r.push('Golden hour lighting — warm, directional, and cinematic');
  else if (a.isBlueHour)   r.push('Blue hour lighting — adds mood and atmosphere');
  else if (a.isLowKey)     r.push('Dramatic low-key lighting — strong subject separation');
  else if (a.isHighKey)    r.push('Clean high-key lighting');

  // Color
  if      (a.saturation > 0.60) r.push('Rich, vibrant colour palette');
  else if (a.dynamicRange > 0.65) r.push('Wide dynamic range — shadow and highlight detail preserved');

  // Type-specific
  if (type === 'PORTRAIT' && a.faces.count > 0) {
    if (a.faces.details[0]?.emotions?.joy > 0.70) r.push('Natural, joyful expression captured');
    if (a.faces.eyeSharpness > 0.60)              r.push('Eyes are sharp — the focal point of the portrait');
    if (a.faces.brightness > 0.45)               r.push('Face is well-exposed with good catchlight');
  }
  if (type === 'LANDSCAPE') {
    if (a.dynamicRange > 0.60)   r.push('Excellent tonal balance between sky and foreground');
    if (a.saturation > 0.45)     r.push('Vivid landscape colours — sky, foliage or water well-rendered');
  }
  if (type === 'WILDLIFE') {
    const hasAnimal = a.labels.some(l =>
      ['Animal', 'Wildlife', 'Bird', 'Mammal', 'Reptile'].includes(l));
    if (hasAnimal) r.push('Subject (animal) clearly identified and in focus');
    if (a.isGoldenHour) r.push('Golden hour rim light makes the animal pop from the background');
  }
  if (type === 'ASTROPHOTOGRAPHY') {
    if (a.brightness < 0.15) r.push('Dark sky with minimal light pollution');
    if (a.sharpnessScore > 0.50) r.push('Stars are sharp and well-resolved — no trailing');
  }
  if (type === 'ARCHITECTURE') {
    if (a.isBlueHour || a.isGoldenHour) r.push('Architectural details enhanced by natural magic-hour light');
    if (a.contrast > 0.50) r.push('Strong structural contrast and defined edges');
  }

  return r;
}

function generateMixedReasons(a, type) {
  const r = [];
  if (a.sharpnessScore > 0.35)  r.push('Acceptable sharpness for the type');
  if (a.saturation > 0.28)      r.push('Decent colour saturation');
  if (type === 'PORTRAIT' && a.faces.count > 0)
    r.push(`${a.faces.count} face(s) detected — composition meets portrait requirements`);
  if (type === 'WILDLIFE' &&
    a.objects.some(o => ['Animal', 'Bird', 'Dog', 'Cat'].includes(o.name)))
    r.push('Animal subject detected');
  return r;
}

function generateWarnings(a, type, isBest) {
  const w = [];
  if (!isBest) {
    if (a.noiseLevel > 0.65)      w.push('High noise/grain — consider reducing ISO or using noise reduction');
    if (a.dynamicRange < 0.30)    w.push('Narrow dynamic range — check exposure settings');
    if (a.hasExcessiveText)       w.push('Excessive on-screen text reduces visual impact');
    if (a.contrast < 0.20)        w.push('Low contrast — image appears flat');
  }
  if (type === 'PORTRAIT') {
    if (a.faces.brightness < 0.32) w.push('Face appears underexposed — add fill light or open aperture');
    if (a.faces.eyeSharpness < 0.30) w.push('Eyes are soft — ensure focus point is on the near eye');
  }
  if (type === 'LANDSCAPE' && a.saturation < 0.20)
    w.push('Colours appear dull — consider shooting at golden hour or adding vibrance in post');
  if (type === 'ASTROPHOTOGRAPHY' && a.noiseLevel > 0.70)
    w.push('High noise — use image stacking or a tracker to allow lower ISO');
  return w;
}