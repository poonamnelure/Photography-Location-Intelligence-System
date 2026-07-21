export const computerFinalScore = ({
    parameters,
    weights,
    photographyType
}) => {
    const { crowdDensity, timeSuitability, lightPollution, accessibility, lightingCondition, weatherSuitability,
        spaceOpeness, windCondition
    } = parameters

    let utility = {}

    switch(photographyType){
        case "astrophotography":
            utility = {
                crowdDensity: 1 - crowdDensity,
                lightPollution: 1 - lightPollution,
                windCondition,
                lightingCondition,
                weatherSuitability,
                spaceOpeness,
                accessibility,
                timeSuitability
            };
            break
        case "street":
            utility= {
                crowdDensity, 
                lightPollution: 1 - lightPollution,
                windCondition,
                lightingCondition,
                weatherSuitability,
                spaceOpeness,
                accessibility,
                timeSuitability
            };
            break;
        default:
            utility = {
                crowdDensity: 1 - crowdDensity,
                lightPollution: 1 - lightPollution,
                windCondition,
                lightingCondition,
                weatherSuitability,
                spaceOpeness,
                accessibility,
                timeSuitability
            };
    }

    let finalScore = 0;
    Object.keys(weights).forEach(key => {
        if ( utility[key] !== undefined ){
            finalScore += weights[key] * utility[key];
        }
    });

    return Math.max(0, Math.min(1, finalScore))
}