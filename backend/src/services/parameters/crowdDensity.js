export const computeCrowdDensity = ({userRatingsTotal = 0, types = [], hour}) => {
    // review based score - normalization
    const reviewScore = Math.log10(userRatingsTotal + 1) / Math.log10(10000)

    // type based factor 
    const typeCrowdFactor = {
        park: 0.6,
        tourist_attraction: 0.8,
        market: 0.9,
        neighborhood: 0.7,
        campground: 0.2,
        natural_feature: 0.3,
        point_of_interest: 0.5
    };

    let typeFactor = 0.4  // neutral assumption
    types.forEach(t => {
        if ( typeCrowdFactor[t]){
            typeFactor = Math.max(typeFactor, typeCrowdFactor[t])
        }
    });

    // time based factoring
    let timeFactor = 0.6;  // neutral
    if ( hour >= 5 && hour < 9 ) timeFactor = 0.4
    else if ( hour >= 9 && hour < 16 ) timeFactor = 0.6
    else if ( hour >= 16 && hour < 21 ) timeFactor = 0.9
    else timeFactor = 0.2

    // final crowd density
    const crowdDensity = (( 0.5 * reviewScore ) + ( 0.3 * typeFactor ) + ( 0.2 * timeFactor ));

    // 0.5 , 0.3 , 0.2 - indicating importance of each factor   

    return Math.min(1, Math.max(0, crowdDensity));
};