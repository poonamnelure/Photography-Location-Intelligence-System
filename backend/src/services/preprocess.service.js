const genericTypes = ["point_of_interest", "establishment"]

const noiceWords = ["chowk", "circle", "junction", "road", "lane", "nagar"];

const calculateDistancesKM = ( lat1, lon1, lat2, lon2 ) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const preprocessPlaces = ({ places, origin, radius }) => {
    return places.filter(place => {
        const rating = place.rating ?? null;
        const reviewCount = place.userRatingsTotal || 0
        const types = place.types || [];
        const name = (place.name || "").toLowerCase()

        const onlyGenericTypes = types.length > 0 && types.every(t => genericTypes.includes(t))

        if ( onlyGenericTypes && ( !rating || reviewCount === 0 )){
            return false;
        }

        const hasNoiceWords = noiceWords.some(k => {
            name.includes(k);
        })

        if ( hasNoiceWords && onlyGenericTypes && reviewCount === 0 ){
            return false    
        }

        const distKM = calculateDistancesKM(origin.lat, origin.lng, place.location.lat, place.location.lng)

        if ( distKM > ( radius / 1000) * 1.1 ){
            return false
        }

        return true 
    })
}