export const windCondition = ( {
    weatherData, 
    photographyType
}) => {
    const windSpeed = weatherData.wind?.speed ?? 3;  // m/s

    let baseScore;

    if ( windSpeed <= 2 ){
        baseScore = 1;
    }else if( windSpeed <= 5 ){
        baseScore = 0.8
    }else if( windSpeed <= 8 ){
        baseScore = 0.5
    }else{
        baseScore = 0.2
    }

    if ( photographyType === "astrophotography"){
        baseScore *= 0.9
    }

    return Math.max(0, Math.min(1, baseScore))
}