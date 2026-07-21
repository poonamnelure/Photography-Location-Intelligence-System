export const computeAccessibility = ({
    distanceKm, 
    types
}) => {
    
    // distance score
    const distanceScore = 
    distanceKm < 2 ? 1 :
    distanceKm < 5 ? 0.8 :
    distanceKm < 10 ? 0.6 :
    distanceKm < 20 ? 0.4 : 0.2;
    
    const infraTypes = [ "park", "tourist_attraction", "market", "neighborhood" ]

    let infrastructureFactor = 0.4
    types.forEach( t => {
        if ( infraTypes.includes(t) ){
            infrastructureFactor = 0.8
        }
    })

    const accessibility = 0.7 * distanceScore + 0.3 * infrastructureFactor;

    return Math.min(1, Math.max(0, accessibility));
}