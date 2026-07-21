export const generateSearchGrid = (lat, lng, radiusKm) => {
    const points = []

    // grid density based on radius i.e no of divisions
    let divisions = 1

    if ( radiusKm <= 10 )
        divisions = 1 
    else if( radiusKm <= 50 ) 
        divisions = 2
    else
        divisions = 2

    const step = radiusKm / divisions
    const delta = step / 111  // degree conversion

    for(let i = -divisions; i <= divisions; i++){
        for(let j = -divisions; j <= divisions; j++){
            points.push({lat: lat + i * delta, lng: lng + j * delta})
        }
    }

    return points
}