export const calculateDistanceKm = ( lat1, lon1, lat2, lon2 ) => {
    const R = 6371
    const dLat = ( ( lat2 - lat1 ) * Math.PI ) / 180;
    const dLon = ( ( lon2 - lon1 ) * Math.PI ) / 180;

    const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2( Math.sqrt(a), Math.sqrt( 1 - a));
};

export const computeLightPollutionDensity = ( { currentPlace, allPlaces }) => {
    const densityRadiusKM = 1
    let neighborCount = 0

    allPlaces.forEach( otherPlace => {
        if ( otherPlace.placeId === currentPlace.id ){
            return
        }
        const dist = calculateDistanceKm(
            currentPlace.location.lat,
            currentPlace.location.lng,
            otherPlace.location.lat,
            otherPlace.location.lng
        );

        if ( dist <= densityRadiusKM ){
            neighborCount++;
        }
    });

    const normalizedDensity = Math.min( neighborCount / 50, 1);

    return normalizedDensity;

};