export const computeSpaceOpeness = ( {
    densityScore,
    types
}) => {
    const openTypes = ["natural_feature", "campground", "park", "tourist_attraction", "beach"];

    let typeOpenessFactor = 0.3

    types.forEach(t => {
        if ( openTypes.includes(t)) {
            typeOpenessFactor = 0.9
        }
    })

    const spaceOpeness = 0.6 * ( 1 - densityScore ) + (0.4 * typeOpenessFactor);
    
    return Math.max(0, Math.min(1, spaceOpeness))
}