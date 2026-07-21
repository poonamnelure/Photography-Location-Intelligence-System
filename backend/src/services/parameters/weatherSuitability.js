export const computeWeatherSuitability = ({
    weatherData,
    photographyType
}) => {
    const cloud = weatherData.clouds?.all ?? 50 // %
    const visibility = weatherData.visibility ?? 10000 // meters
    const rain = weatherData.rain ? 1 : 0;


    // normalize
    const cloudeScore = 1 - cloud / 100 // less cloud = better scoring
    const visibilityScore = Math.min(visibility / 10000, 1)
    const rainPenalty = rain ? 0.2 : 1

    let baseScore = 0

    switch(photographyType){

        case "astrophotography":
            baseScore = 0.6 * cloudeScore + 0.3 * visibilityScore + 0.1 * rainPenalty
            break;

        case "landscape":
            baseScore = 0.4 * cloudeScore + 0.4 * visibilityScore + 0.2 * rainPenalty
            break

        case "celebration":
            baseScore = 0.3 * cloudeScore + 0.4 * visibilityScore + 0.3 * rainPenalty
            break

        case "street":
            baseScore = 0.3 * cloudeScore + 0.3 * visibilityScore + 0.4 * rainPenalty
            break

        default:
            baseScore = 0.5
    }

    return Math.max(0, Math.min(1, baseScore))
}