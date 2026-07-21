import Groq from "groq-sdk";

let _groq;
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

export const generateLLMExplanation = async ({
  placeData,
  photographyType,
  dateTime,
  parameterBreakdown,
  astronomyAndWeather
}) => {

  const prompt = `
You are a professional, highly skilled photography evaluation assistant with an engaging, lighthearted, yet authoritative tone.

Generate a highly structured, emotionally engaging evaluation report for the given location in robust JSON format so it can be parsed safely. Do NOT output markdown outside of the JSON block.

Photography Type: ${photographyType}
Location: ${placeData.name}
Distance from user: ${astronomyAndWeather.distanceKm} km
Evaluation Date: ${dateTime}
Overall Score (0-1): ${(placeData.finalScore ?? 0).toFixed(2)}
Weather Forecast: ${astronomyAndWeather.weatherDesc}, ${astronomyAndWeather.temp}°C, Cloud Cover: ${astronomyAndWeather.clouds}%
Astronomical Data: Sunrise at ${astronomyAndWeather.sunrise}, Sunset at ${astronomyAndWeather.sunset}, Golden Hour at ${astronomyAndWeather.goldenHour}. Moon fraction is ${astronomyAndWeather.moonFraction}% (Phase ${astronomyAndWeather.moonPhase}).

Parameter Breakdown (Score 0-1, Weight, Contribution):
${JSON.stringify(parameterBreakdown, null, 2)}

Produce a JSON object ONLY with the following keys. Write them in a light, easily understandable, non-dry tone. Use actual statistics and astronomical/weather data provided above!
- "executiveSummary": A beautifully written paragraph summarizing why this spot rocks (or fails) for this photography style. Mention distance, temp, and overall score casually.
- "comparativeReasoning": Text explaining why it beat others. Be statistical and trustable! Reference specific high-scoring parameters.
- "bestTimeRecommendation": Recommend the best exact timing based directly on the sunrise, sunset, or moonlight data provided! If astro, mention the moon phase.
- "warnings": A string containing warnings. Warn them about the specific cloud cover or weather conditions mentioned above, and safety notes.

Return ONLY valid JSON.
`;

  try {
    console.log("🤖 [LLM] Calling Groq API | Place:", placeData.name, "| finalScore:", placeData.finalScore);
    console.log("🤖 [LLM] parameterBreakdown keys:", Object.keys(parameterBreakdown || {}));

    const response = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",  // Updated: llama3-70b-8192 was decommissioned by Groq
      messages: [
        { role: "system", content: "You are an expert photography planning assistant. You output only JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    console.log("✅ [LLM] Groq API responded successfully");
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("❌ [LLM] Groq API FAILED — Status:", error?.status, "| Message:", error?.message);
    console.error("❌ [LLM] Full error:", JSON.stringify(error?.error || {}, null, 2));
    // Dynamic Fallback Text generating human-like reports with actual data using the lightweight tone
    const highestParam = Object.entries(parameterBreakdown).sort((a, b) => b[1].score - a[1].score)[0] || ['lighting', {score: 0.8}];
    const paramName = highestParam[0].replace(/([A-Z])/g, ' $1').toLowerCase();
    const isAstro = photographyType.toLowerCase().includes('astro');
    const moonDesc = astronomyAndWeather.moonPhase > 0.45 && astronomyAndWeather.moonPhase < 0.55 ? "a glowing full moon" : "beautiful dark skies";

    const timeRec = isAstro ? "You currently have " + astronomyAndWeather.moonFraction + "% lunar illumination—meaning " + moonDesc + " to work with for your night shots." : "Aim to be on-site about 45 minutes before golden hour to catch the best lighting ratios.";

    return {
      executiveSummary: `This spot (${placeData.name || "selected venue"}) is a fantastic choice for ${photographyType}. Currently sitting roughly ${astronomyAndWeather.distanceKm}km away from your position, it earned a stellar ${(placeData.finalScore * 100).toFixed(0)}% overall score. With the weather forecast looking like ${astronomyAndWeather.weatherDesc} and temperatures hovering around ${astronomyAndWeather.temp}°C, the ambient conditions definitely work in your favor here.`,
      comparativeReasoning: `Why this location? The numbers speak for themselves. Its impressive ${paramName} score of ${Math.round(highestParam[1].score * 10)}/10 provided a massive boost. Compared to regional alternatives, this optimal balance of environmental metrics makes it one of the absolute safest bets for a shoot today.`,
      bestTimeRecommendation: `Based on precise astronomical tracking for ${dateTime.split('T')[0]}, sunrise kicks off at ${astronomyAndWeather.sunrise} and sunset hits at ${astronomyAndWeather.sunset}, with golden hour starting precisely around ${astronomyAndWeather.goldenHour}. ${timeRec}`,
      warnings: `Heads up: don't forget that ${astronomyAndWeather.weatherDesc} weather can be unpredictable. You currently have a ${astronomyAndWeather.clouds}% cloud cover forecast, so pack your equipment appropriately for ${astronomyAndWeather.temp}°C. If this is a popular municipal zone, double-check local guidelines regarding commercial permits!`
    };
  }
};

/**
 * Generate unique, concise highlights for all ranked locations in a single LLM call.
 * Uses the fast 8B model for speed (~0.5-1s). Falls back to null on failure.
 */
export const generateQuickHighlights = async (locations, photographyType) => {
  const locSummaries = locations.map((loc, i) => {
    const p = loc.rawParameters || loc.parameters || {};
    return `Location ${i + 1}: "${loc.name}" (Score: ${Math.round((loc.finalScore || 0) * 100)}%)
  - lightPollution: ${(p.lightPollution ?? 0).toFixed(2)}, crowdDensity: ${(p.crowdDensity ?? 0).toFixed(2)}
  - weatherSuitability: ${(p.weatherSuitability ?? 0).toFixed(2)}, accessibility: ${(p.accessibility ?? 0).toFixed(2)}
  - lightingCondition: ${(p.lightingCondition ?? 0).toFixed(2)}, timeSuitability: ${(p.timeSuitability ?? 0).toFixed(2)}`;
  }).join("\n");

  const prompt = `You are a photography location scout. For each location below, generate exactly 3 short, UNIQUE bullet-point highlights relevant to ${photographyType} photography. Each bullet should be max 10 words, start with a fitting emoji, and mention something SPECIFIC to that location's strengths or weaknesses (based on its scores). Do NOT repeat the same bullets across locations — differentiate them.

${locSummaries}

Return ONLY valid JSON: { "1": ["bullet1", "bullet2", "bullet3"], "2": [...], "3": [...] }`;

  try {
    const response = await getGroq().chat.completions.create({
      model: "llama-3.1-8b-instant",   // fast model for quick highlights
      messages: [
        { role: "system", content: "Output only JSON. No markdown." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 400,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    console.log("✅ [LLM] Quick highlights generated");
    return result;
  } catch (error) {
    console.error("❌ [LLM] Quick highlights failed:", error?.message);
    return null;
  }
};