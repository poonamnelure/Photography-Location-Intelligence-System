export const commonParameters = [
    "crowdDensity",
    "lightingCondition",
    "weatherSuitability",
    "noiseLevel",
    "spaceOpeness",
    "accessibility",
    "aestheticBackground",
    "timeSuitability",
    "lightPollution",
    "windCondition"
];

export const photographyConfig = {
    astrophotography: {
    placeCategories: [
      "park",
      "campground",
      "natural_feature",
      "point_of_interest"
    ],
    excludeTypes: [
      "hospital",
      "health",
      "bank",
      "atm",
      "finance",
      "restaurant",
      "food",
      "lodging",
      "hotel",
      "store",
      "shopping_mall",
      "car_dealer",
      "car_repair",
      "school",
      "university",
      "insurance_agency",
      "travel_agency",
      "office"
    ],
    weights: {
      typeAffinity: 0.3,
      crowdDensity: 0.10,
      lightingCondition: 0.05,
      weatherSuitability: 0.15,
      noiseLevel: 0.05,
      spaceOpenness: 0.10,
      accessibility: 0.05,
      aestheticBackground: 0.05,
      timeSuitability: 0.15,
      lightPollution: 0.25,
      windCondition: 0.05
    }

  },

  landscape: {
    placeCategories: [
      "tourist_attraction",
      "park",
      "natural_feature",
      "viewpoint"
    ],
    excludeTypes: [
      "hospital",
      "bank",
      "atm",
      "finance",
      "school",
      "university",
      "insurance_agency",
      "office",
      "car_dealer",
      "car_repair"
    ],
    weights: {
      crowdDensity: 0.05,
      lightingCondition: 0.20,
      weatherSuitability: 0.15,
      noiseLevel: 0.05,
      spaceOpenness: 0.10,
      accessibility: 0.10,
      aestheticBackground: 0.20,
      timeSuitability: 0.05,
      lightPollution: 0.03,
      windCondition: 0.02
    }
  },

  // Unified celebration type covers weddings, birthdays and all event photography
  celebration: {
    placeCategories: [
      "banquet_hall",
      "wedding_venue",
      "event_venue",
      "resort",
      "park",
      "restaurant"
    ],
    excludeTypes: [
      "hospital",
      "bank",
      "atm",
      "school",
      "university",
      "insurance_agency",
      "car_dealer",
      "car_repair",
      "factory",
      "warehouse"
    ],
    weights: {
      crowdDensity: 0.10,
      lightingCondition: 0.15,
      weatherSuitability: 0.10,
      noiseLevel: 0.10,
      spaceOpenness: 0.12,
      accessibility: 0.15,
      aestheticBackground: 0.15,
      timeSuitability: 0.08,
      lightPollution: 0.03,
      windCondition: 0.02
    }
  },

  street: {
    placeCategories: [
      "tourist_attraction",
      "neighborhood",
      "market",
      "point_of_interest"
    ],
    excludeTypes: [
      "hospital",
      "school",
      "university",
      "insurance_agency",
      "office",
      "factory",
      "warehouse",
      "car_dealer"
    ],
    weights: {
      typeAffinity: 0.25,
      crowdDensity: 0.20,
      lightingCondition: 0.15,
      weatherSuitability: 0.10,
      noiseLevel: 0.10,
      spaceOpenness: 0.05,
      accessibility: 0.10,
      aestheticBackground: 0.10,
      timeSuitability: 0.15,
      lightPollution: 0.03,
      windCondition: 0.02
    }
  }
};