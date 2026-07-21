import { photographyConfig } from "../config/photographyConfig.js";
import { buildParameterBreakdown } from "../services/reportUtils.js";
import { generateLLMExplanation } from "../services/llm.service.js";
import { generatePDF } from "../services/pdf.service.js";
import { fetchWeatherDetails } from "../services/weather.service.js";
import { calculateDistanceKm } from "../services/parameters/lightPollution.js";
import SunCalc from "suncalc";

export const generateReport = async (req, res) => {
  try {

    const { placeData, dateTime, userLat, userLng } = req.body;
    let { photographyType } = req.body;

    // Normalize legacy/frontend type IDs to canonical config keys
    // birthday_event, birthday, and wedding all map to the unified "celebration" type
    const typeAliases = {
      birthday_event: "celebration",
      birthday: "celebration",
      wedding: "celebration"
    };
    photographyType = typeAliases[photographyType] ?? photographyType;

    const config = photographyConfig[photographyType];
    if (!config) {
      return res.status(400).json({ success: false, message: `Unsupported photography type: ${photographyType}` });
    }
    const weights = config.weights;

    const parameterBreakdown = buildParameterBreakdown(
      placeData.parameters || placeData.rawParameters,
      weights
    );

    // Recalculate distance from user's real location if available
    let distanceKm = placeData.distanceKm || "Unknown";
    if (userLat != null && userLng != null && placeData.location?.lat && placeData.location?.lng) {
      distanceKm = calculateDistanceKm(userLat, userLng, placeData.location.lat, placeData.location.lng).toFixed(2);
    }
    placeData.distanceKm = distanceKm;

    // Fetch Astronomy and Weather Data dynamically for the report!
    let weatherData = {};
    try {
      weatherData = await fetchWeatherDetails(placeData.location.lat, placeData.location.lng, dateTime);
    } catch (err) {
      console.error("Failed to fetch weather for report", err);
    }
    
    const dateObj = new Date(dateTime);
    const sunTimes = SunCalc.getTimes(dateObj, placeData.location.lat, placeData.location.lng);
    const moonIllumin = SunCalc.getMoonIllumination(dateObj);

    const formatTime = (d) => {
      return d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A";
    };

    const astronomyAndWeather = {
      weatherDesc: weatherData.weather?.[0]?.description || "clear skies",
      temp: weatherData.main?.temp ? Math.round(weatherData.main.temp) : "15",
      clouds: weatherData.clouds?.all || 0,
      sunrise: formatTime(sunTimes.sunrise),
      sunset: formatTime(sunTimes.sunset),
      goldenHour: formatTime(sunTimes.goldenHour),
      moonPhase: moonIllumin?.phase || 0,
      moonFraction: moonIllumin?.fraction ? (moonIllumin.fraction * 100).toFixed(0) : 50,
      distanceKm
    };

    // 1️⃣ Test LLM Output in Console
    const explanation = await generateLLMExplanation({
      placeData,
      photographyType,
      dateTime,
      parameterBreakdown,
      astronomyAndWeather
    });

    console.log("LLM OUTPUT:\n", explanation);

    // 2️⃣ Generate PDF (returns in-memory buffer — no disk I/O)
    const { buffer: pdfBuffer, fileName } = await generatePDF({
      placeData,
      photographyType,
      dateTime,
      parameterBreakdown,
      explanation
    });

    // Stream the PDF bytes directly — works on Render / Vercel / any cloud host
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": pdfBuffer.length,
      // Allow the browser to read this header cross-origin
      "Access-Control-Expose-Headers": "Content-Disposition",
    });
    return res.end(pdfBuffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};