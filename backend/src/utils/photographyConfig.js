// src/utils/photographyConfig.js
// ─────────────────────────────────────────────────────────────────────────────
// Central configuration for all photography types.
// Each type defines its own scoring weights, thresholds, preferred scene labels,
// and behavioural flags (e.g. faceRequired, textOk, expectDark).
// ─────────────────────────────────────────────────────────────────────────────

export const PHOTOGRAPHY_TYPES = {
  LANDSCAPE: 'LANDSCAPE',
  PORTRAIT: 'PORTRAIT',
  STREET: 'STREET',
  ASTROPHOTOGRAPHY: 'ASTROPHOTOGRAPHY',
  WILDLIFE: 'WILDLIFE',
  ARCHITECTURE: 'ARCHITECTURE',
  GENERAL: 'GENERAL',
};

export const PHOTOGRAPHY_CONFIG = {

  /* ── LANDSCAPE ─────────────────────────────────────────────────────────── */
  LANDSCAPE: {
    displayName: 'Landscape',
    description: 'Mountains, beaches, sunsets, forests, oceans',
    weights: {
      sharpness: 0.30,      // Entire frame must be sharp (no selective focus)
      lighting: 0.28,       // Golden hour / blue hour transforms a landscape
      colorVibrancy: 0.22,  // Saturated, rich tones sell a landscape
      subjectRelevance: 0.12, // How well detected labels match landscape scenes
      dynamicRange: 0.08,   // Sky + foreground detail = wide dynamic range
    },
    thresholds: {
      best:    { quality: 0.62, aesthetic: 0.60 },
      average: { quality: 0.40, aesthetic: 0.38 },
      minSaturation: 0.25,
      maxBrightness: 0.90,  // Blown-out sky = rejected
    },
    preferredLabels: [
      'Sky', 'Horizon', 'Mountain', 'Ocean', 'Sea', 'Forest', 'Sunset',
      'Sunrise', 'Lake', 'River', 'Field', 'Nature', 'Landscape', 'Cloud',
      'Beach', 'Valley', 'Hill', 'Coast', 'Waterfall', 'Desert', 'Glacier',
      'Canyon', 'Plateau', 'Fog', 'Mist', 'Reflection', 'Autumn', 'Scenery',
    ],
    faceRequired: false,
    textPenalty: 0.20,       // Text detracts from the natural scene
    allowedBlur: false,
  },

  /* ── PORTRAIT ──────────────────────────────────────────────────────────── */
  PORTRAIT: {
    displayName: 'Portrait',
    description: 'People, faces, studio, environmental portraits',
    weights: {
      faceQuality: 0.35,    // Face brightness, eye sharpness, expression
      sharpness: 0.25,      // Eyes must be tack-sharp — a soft portrait fails
      lighting: 0.25,       // Catchlights, Rembrandt, soft-box quality matters
      composition: 0.15,    // Head-room, subject placement
    },
    thresholds: {
      best:    { quality: 0.58, aesthetic: 0.55 },
      average: { quality: 0.38, aesthetic: 0.36 },
      minFaceBrightness: 0.32,  // Underlit face = reject
      maxFaceBrightness: 0.88,  // Blown-out face = reject
      idealFaceBrightness: 0.60,
    },
    preferredLabels: [
      'Portrait', 'Person', 'Face', 'Model', 'Photography',
      'Head', 'Smile', 'Hair', 'Eye', 'Beauty', 'Fashion', 'People',
    ],
    faceRequired: true,       // Portrait without a face is rejected
    textPenalty: 0.25,
    allowedBlur: false,
  },

  /* ── STREET ────────────────────────────────────────────────────────────── */
  STREET: {
    displayName: 'Street',
    description: 'Urban life, markets, candid moments, culture',
    weights: {
      composition: 0.28,    // Decisive moment — framing is everything
      sharpness: 0.25,      // Main subject sharp (motion blur on bg is artistic)
      sceneInterest: 0.27,  // Urban/cultural labels confirm the scene
      lighting: 0.20,       // Harsh shadows & backlight are acceptable here
    },
    thresholds: {
      best:    { quality: 0.52, aesthetic: 0.50 },
      average: { quality: 0.35, aesthetic: 0.33 },
    },
    preferredLabels: [
      'Street', 'City', 'Urban', 'Market', 'Road', 'Building', 'Culture',
      'Architecture', 'People', 'Crowd', 'Store', 'Traffic', 'Transport',
      'Alley', 'Pedestrian', 'Graffiti', 'Vendor', 'Sign', 'Shop',
    ],
    faceRequired: false,
    textOk: true,           // Storefront text, street signs = authentic context
    motionBlurOk: true,     // Panning shots, busy crowds — artistically valid
    allowedBlur: false,     // Global blur (out of focus) is still rejected
  },

  /* ── ASTROPHOTOGRAPHY ──────────────────────────────────────────────────── */
  ASTROPHOTOGRAPHY: {
    displayName: 'Astrophotography',
    description: 'Stars, Milky Way, moon, night sky, galaxies',
    weights: {
      sharpness: 0.38,          // Stars must be pinpoints, not trails (unless intentional)
      backgroundDarkness: 0.30, // Bright sky = light pollution = bad astro image
      nightSkyDetection: 0.22,  // Night / Star / Galaxy labels confirm the scene
      composition: 0.10,        // Silhouetted foreground adds depth
    },
    thresholds: {
      best:    { quality: 0.55, aesthetic: 0.50 },
      average: { quality: 0.35, aesthetic: 0.32 },
      maxBrightness: 0.30,      // Must be a dark image overall
    },
    preferredLabels: [
      'Night', 'Sky', 'Star', 'Galaxy', 'Astronomy', 'Space', 'Milky Way',
      'Moon', 'Nebula', 'Cosmos', 'Atmosphere', 'Darkness', 'Silhouette',
      'Horizon', 'Celestial', 'Constellation',
    ],
    faceRequired: false,
    textPenalty: 0.30,
    expectDark: true,           // Low brightness is a quality indicator here
    allowedBlur: false,
  },

  /* ── WILDLIFE ──────────────────────────────────────────────────────────── */
  WILDLIFE: {
    displayName: 'Wildlife',
    description: 'Animals, birds, insects, natural habitat',
    weights: {
      subjectSharpness: 0.35,  // The animal must be tack-sharp (eyes especially)
      animalDetection: 0.27,   // Was an animal actually detected by Vision AI?
      composition: 0.22,       // Rule of thirds, subject space, environmental context
      lighting: 0.16,          // Golden hour wildlife = stunning
    },
    thresholds: {
      best:    { quality: 0.60, aesthetic: 0.55 },
      average: { quality: 0.40, aesthetic: 0.38 },
    },
    preferredLabels: [
      'Animal', 'Wildlife', 'Bird', 'Mammal', 'Nature', 'Dog', 'Cat',
      'Lion', 'Tiger', 'Elephant', 'Deer', 'Eagle', 'Fox', 'Bear',
      'Wolf', 'Monkey', 'Reptile', 'Insect', 'Butterfly', 'Fish',
      'Horse', 'Giraffe', 'Zebra', 'Cheetah', 'Leopard', 'Owl', 'Hawk',
    ],
    faceRequired: false,
    textPenalty: 0.25,
    allowedBlur: false,
  },

  /* ── ARCHITECTURE ──────────────────────────────────────────────────────── */
  ARCHITECTURE: {
    displayName: 'Architecture',
    description: 'Buildings, monuments, skylines, interiors',
    weights: {
      sharpness: 0.35,    // Every brick and line must be resolved
      composition: 0.28,  // Symmetry, leading lines, perspective
      lighting: 0.24,     // Blue hour magic on buildings is iconic
      colorBalance: 0.13, // HDR-balanced tones vs. colour casts
    },
    thresholds: {
      best:    { quality: 0.62, aesthetic: 0.58 },
      average: { quality: 0.42, aesthetic: 0.40 },
    },
    preferredLabels: [
      'Architecture', 'Building', 'Structure', 'Monument', 'Bridge',
      'Skyscraper', 'Temple', 'Church', 'Tower', 'Facade', 'Skyline',
      'Historic', 'Landmark', 'Arch', 'Column', 'Cathedral', 'Mosque',
      'Palace', 'Museum', 'Stadium', 'Interior', 'Exterior', 'Corridor',
    ],
    faceRequired: false,
    textPenalty: 0.15,  // Some building signage is acceptable
    allowedBlur: false,
  },

  /* ── GENERAL ────────────────────────────────────────────────────────────── */
  GENERAL: {
    displayName: 'General',
    description: 'Any photography — balanced scoring',
    weights: {
      sharpness: 0.30,
      lighting: 0.25,
      composition: 0.25,
      faceQuality: 0.20,
    },
    thresholds: {
      best:    { quality: 0.68, aesthetic: 0.65 },
      average: { quality: 0.45, aesthetic: 0.42 },
    },
    preferredLabels: [],
    faceRequired: false,
    textPenalty: 0.15,
    allowedBlur: false,
  },
};