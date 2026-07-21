import { photographyConfig, commonParameters } from "../config/photographyConfig.js";
import { fetchPlacesByCategory } from "../services/places.service.js";
import { generateSearchGrid } from "../utils/searchGrid.js";
import { preprocessPlaces  } from "../services/preprocess.service.js";
import { computeCrowdDensity } from "../services/parameters/crowdDensity.js";
import { computeTimeSuitability } from "../services/parameters/timeSuitability.js";
import { computeLightPollutionDensity } from "../services/parameters/lightPollution.js";
import { computeAccessibility } from "../services/parameters/accessibility.js";
import { calculateDistanceKm } from "../services/parameters/lightPollution.js";
import { computeLightingCondition } from "../services/parameters/lightingCondition.js";
import { fetchWeatherDetails } from "../services/weather.service.js"
import { computeWeatherSuitability } from "../services/parameters/weatherSuitability.js";
import { computeSpaceOpeness } from "../services/parameters/spaceOpeness.js";
import { windCondition } from "../services/parameters/windConditions.js";
import { computerFinalScore } from "../services/scoring.services.js";
import { computeTypeAffinity } from "../services/parameters/typeAffinity.js";
import { buildParameterBreakdown } from "../services/reportUtils.js";
import { generateLLMExplanation, generateQuickHighlights } from "../services/llm.service.js";
import { generatePDF } from "../services/pdf.service.js";
export const searchLocations = async ( req, res ) => {
    try {
        const { lat, lng, radius, dateTime } = req.body;
        let { photographyType } = req.body;

        if ( !lat || !lng || !radius || !photographyType ){
            return res.status(400).json({
                success: false,
                message: "Missing required inputs"
            });  
        }

        // Normalize legacy/frontend type IDs to canonical config keys
        // birthday_event, birthday, and wedding all map to the unified "celebration" type
        const typeAliases = {
            birthday_event: "celebration",
            birthday: "celebration",
            wedding: "celebration"
        };
        photographyType = typeAliases[photographyType] ?? photographyType;

        // maping
        const config = photographyConfig[photographyType]

        if ( !config ) {
            return res.status(400).json({
                success: false,
                message: "Invalid photography type"
            });
        }
        
        // // temporary response
        // return res.status(200).json({
        //     success: true,
        //     photographyType,
        //     commonParameters: commonParameters,
        //     placeCategories: config.placeCategories, 
        //     weights:config.weights
        // });

        // tentative places
        const allPlaces = [];
        const fetchPromises = [];
        const radiusKm = radius / 1000
        const searchPoints = generateSearchGrid(lat, lng, radiusKm).slice(0, 3)

        for(const point of searchPoints){
            const limitedCategory = config.placeCategories.slice(0, 2)
            for(const category of limitedCategory){
                fetchPromises.push(
                    fetchPlacesByCategory({
                        lat: point.lat, 
                        lng: point.lng,
                        radius,
                        category,
                        apikey: "YOUR_GOOGLE_API_KEY"
                    })
                )
            }
        }


for (let i = 0; i < fetchPromises.length; i += 5) {
    const batch = fetchPromises.slice(i, i + 5);

    const results = await Promise.all(batch);

    results.forEach(arr => allPlaces.push(...arr));
}

        console.log("Total raw places: ", allPlaces.length);
        
        // removing duplicates 
        const uniquePlacesMap = new Map()
        allPlaces.forEach(place => {
            uniquePlacesMap.set(
                place.place_id, {
                    placeId: place.place_id,
                    name: place.name,
                    types: place.types,
                    location: place.geometry.location,
                    rating: place.rating || null, 
                    userRatingTotal: place.user_rating_total || 0,
                    vicinity: place.vicinity || "Unknown Area"
                }
            );
        });

        const tentativeLocations = Array.from(uniquePlacesMap.values());

        console.log("Total raw places: ", tentativeLocations.length);

        //refiend locations 
        const refinedLocations = tentativeLocations.filter(place => {
            return !place.types.some(type => 
                config.excludeTypes.includes(type)
            );
        });

        //preprocessing locations 
        const cleanedLocations = preprocessPlaces({
            places:refinedLocations,
            origin: {lat, lng},
            radius
        })

        // Use the user's selected dateTime — NOT the current system clock
        const selectedDate = new Date(dateTime);
        const hour = isNaN(selectedDate) ? new Date().getHours() : selectedDate.getHours();
        const weatherData = await fetchWeatherDetails(lat, lng, dateTime);

        console.log("Incoming dateTime:", dateTime);
        console.log("Parsed date:", selectedDate, "→ hour:", hour);
        const evaluatedLocations = cleanedLocations.map( place => {
            const distanceKm = calculateDistanceKm(
                lat, lng, place.location.lat, place.location.lng
            )

            return{
                ...place,
                parameters: {
                    typeAffinity: computeTypeAffinity({
                        photographyType,
                        types: place.types
                    }),

                    crowdDensity: computeCrowdDensity( {
                        userRatingsTotal: place.userRatingsTotal,
                        types: place.types,
                        hour
                    }),

                    timeSuitability: computeTimeSuitability({
                        photographyType,
                        hour, 
                        openingHours: null
                    }),

                    lightPollution: computeLightPollutionDensity( {
                        currentPlace: place,
                        allPlaces: cleanedLocations
                    }),

                    accessibility: computeAccessibility( {
                        distanceKm,
                        types: place.types
                    }),

                    lightingCondition: computeLightingCondition({
                        lat: place.location.lat,
                        lng: place.location.lng,
                        dateTime: dateTime,
                        photographyType
                    }),

                    weatherSuitability: computeWeatherSuitability({
                        weatherData,
                        photographyType
                    })
                }
            }
        })

        const scoredLocations = evaluatedLocations.map(place => {
            const finalScore = computerFinalScore({
                parameters: place.parameters,
                weights: config.weights,
                photographyType
            });

            return {
                ...place,
                finalScore
            };
        })
        
        const rankedLocations = scoredLocations.sort((a, b) => b.finalScore - a.finalScore).slice(0, 3).map(place => {
            // Use the user's real location for distance if provided, otherwise use search center
            const distOriginLat = req.body.userLat ?? lat;
            const distOriginLng = req.body.userLng ?? lng;
            const distance = calculateDistanceKm(distOriginLat, distOriginLng, place.location.lat, place.location.lng);
            
            const score100 = Math.round(place.finalScore * 100);
            let label = "Skip";
            let color = "red";
            if (score100 >= 80) { label = "Perfect"; color = "green"; }
            else if (score100 >= 60) { label = "Go for it"; color = "orange"; }
            else if (score100 >= 30) { label = "Timepass"; color = "yellow"; }

            // Photography-type-aware highlights — contextual bullets per genre
            const highlights = [];
            const p = place.parameters;
            const type = photographyType;

            // Light pollution highlights
            if (p.lightPollution < 0.3) {
                if (type === "astrophotography") highlights.push("🌌 Pristine dark skies — ideal for long exposures & star trails");
                else if (type === "landscape") highlights.push("🌅 Minimal light pollution — vivid sunset/sunrise colors");
                else if (type === "celebration") highlights.push("🌙 Soft ambient light — flattering, cinematic atmosphere");
                else highlights.push("🌙 Low ambient light — moody, cinematic backdrop");
            } else if (p.lightPollution >= 0.7) {
                if (type === "astrophotography") highlights.push("⚠️ Heavy light pollution — challenging for stargazing");
                else if (type === "street") highlights.push("💡 Well-lit area — vibrant urban energy");
                else if (type === "celebration") highlights.push("💡 Bright surroundings — plan artificial lighting carefully");
            }

            // Crowd density highlights  
            if (p.crowdDensity < 0.3) {
                if (type === "celebration") highlights.push("💒 Quiet setting — intimate & distraction-free");
                else if (type === "landscape") highlights.push("🏞️ Uncrowded — clean, unobstructed compositions");
                else if (type === "astrophotography") highlights.push("🔭 Secluded spot — no light interference from crowds");
                else highlights.push("👤 Low footfall — peaceful shooting environment");
            } else if (p.crowdDensity > 0.7) {
                if (type === "street") highlights.push("🔥 Bustling atmosphere — rich street life & candid moments");
                else if (type === "celebration") highlights.push("🎉 Lively area — festive, energetic vibe");
                else highlights.push("👥 Expect crowds — plan compositions accordingly");
            }

            // Weather highlights
            if (p.weatherSuitability > 0.7) {
                if (type === "celebration") highlights.push("☀️ Clear skies forecast — perfect for outdoor celebrations");
                else if (type === "landscape") highlights.push("🌤️ Excellent weather — sharp visibility & vivid colors");
                else if (type === "astrophotography") highlights.push("✨ Cloud-free skies — optimal stargazing window");
                else highlights.push("🌤️ Favorable weather conditions expected");
            } else if (p.weatherSuitability < 0.4) {
                highlights.push("🌧️ Weather may be unpredictable — have backup plans");
            }

            // Accessibility highlights
            if (p.accessibility > 0.7) {
                if (type === "celebration") highlights.push("🚗 Easy access — convenient for guests & equipment");
                else highlights.push("🛣️ Easily accessible — gear-friendly location");
            } else if (p.accessibility < 0.3) {
                if (type === "landscape") highlights.push("🥾 Remote spot — scout in advance, worth the trek");
                else highlights.push("🚶 Limited access — may require walking");
            }

            // Lighting condition highlights
            if (p.lightingCondition > 0.7) {
                if (type === "celebration") highlights.push("✨ Beautiful natural light — flattering for portraits & events");
                else if (type === "landscape") highlights.push("🌅 Golden hour quality light — stunning depth & warmth");
                else if (type === "street") highlights.push("💡 Great ambient lighting — dynamic shadows & contrast");
                else highlights.push("☀️ Outstanding natural light quality");
            } else if (p.lightingCondition < 0.3) {
                highlights.push("🔦 Low ambient light — bring additional lighting");
            }

            // Time suitability
            if (p.timeSuitability > 0.7) {
                if (type === "astrophotography") highlights.push("🌃 Optimal night window — peak darkness hours");
                else if (type === "street") highlights.push("⏰ Prime hours — peak activity & atmosphere");
                else if (type === "celebration") highlights.push("⏰ Great timing — ideal hours for event photography");
            }

            if (highlights.length === 0) highlights.push("📋 Standard conditions — suitable for this shoot type");
            
            return {
                placeId: place.placeId,
                name: place.name,
                distanceKm: distance.toFixed(2),
                area: place.vicinity,
                photographyType,
                suitabilityMeter: {
                    score: score100,
                    label,
                    color
                },
                keyHighlights: highlights.slice(0, 4), // max 4 bullets
                routeUrl: `https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}&travelmode=driving`,
                // Needed for PDF generation endpoint later
                rawParameters: place.parameters,
                finalScore: place.finalScore,
                location: place.location
            };
        });

        // Enrich highlights with LLM — single fast call for all 3 locations
        try {
            const llmHighlights = await generateQuickHighlights(rankedLocations, photographyType);
            if (llmHighlights) {
                rankedLocations.forEach((loc, i) => {
                    const key = String(i + 1);
                    if (llmHighlights[key] && Array.isArray(llmHighlights[key]) && llmHighlights[key].length > 0) {
                        loc.keyHighlights = llmHighlights[key].slice(0, 4);
                    }
                });
            }
        } catch (err) {
            console.error("LLM highlights enrichment failed, using rule-based:", err.message);
        }

        return res.status(200).json({
            success: true,
            photographyType,
            totalFetched: tentativeLocations.length,
            rankedLocations,
            breakdownPreview: rankedLocations.map(place => ({
                placeId: place.placeId,
                name: place.name,
                finalScore: place.finalScore,
                parameters: place.parameters    
            }))
        })
    }catch(error){
        console.error("Search preprocessing error: ", error);
        return res.status(400).json({
            success: false, 
            message: "Internal Server Error "
        })
    }
};

    