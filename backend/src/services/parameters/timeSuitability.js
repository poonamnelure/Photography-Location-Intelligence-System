export const computeTimeSuitability = ( { photographyType, hour, openingHours } ) => {
    if ( openingHours && openingHours.isOpen == false ){
        return 0;
    }

    const timePreferences = {
        astrophotography: [21, 22, 23, 0, 1, 2, 3, 4],
        landscape: [5, 6, 7, 16, 17, 18],
        // celebration covers weddings (morning/afternoon) and birthday events (evening)
        celebration: [9, 10, 11, 12, 16, 17, 18, 19, 20, 21],
        street: [9, 10, 11, 16, 17, 18, 19]
    }

    const preferredHours = timePreferences[photographyType] || [];

    if ( preferredHours.includes(hour) ){
        return 1;
    }

    if ( preferredHours.some( h => Math.abs(h - hour) <= 1 )){
        return 0.6;
    }

    return 0.2
}