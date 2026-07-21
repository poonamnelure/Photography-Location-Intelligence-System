import axios from "axios";

const apiKey = process.env.OPENWEATHER_API_KEY;

/**
 * Fetch weather data — uses the 5-day/3-hour forecast API for future dates,
 * falls back to current weather API for today or if forecast unavailable.
 */
export const fetchWeatherDetails = async (lat, lng, dateTime) => {
    const targetDate = dateTime ? new Date(dateTime) : new Date();
    const now = new Date();
    const hoursAhead = (targetDate - now) / (1000 * 60 * 60);

    // If the selected date is in the future (and within the 5-day forecast window)
    if (hoursAhead > 3 && hoursAhead <= 120) {
        try {
            const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
            const resp = await axios.get(forecastUrl);
            const forecasts = resp.data.list || [];

            // Find the closest 3-hour window to the target date
            const targetTs = targetDate.getTime();
            let closest = forecasts[0];
            let minDiff = Infinity;

            for (const entry of forecasts) {
                const diff = Math.abs(new Date(entry.dt_txt).getTime() - targetTs);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = entry;
                }
            }

            console.log(`🌤️ Using forecast for ${closest.dt_txt} (target: ${dateTime})`);
            return closest;
        } catch (err) {
            console.error("Forecast API failed, falling back to current weather:", err.message);
        }
    }

    // Current weather (for today or fallback)
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
    const resp = await axios.get(url);
    return resp.data;
};