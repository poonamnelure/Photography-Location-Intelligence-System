export const computeTypeAffinity = ({
    photographyType,
    types
}) => {
    const typeMap = {
        astrophotography: {
            strong: ["natural_feature", "campground"],
            medium: ["park"],
            weak: ["shopping_mall", "restaurant", "market"] 
        },

        street: {
            strong: ["neighborhood", "market", "tourist_attraction"],
            medium: ["park"],
            weak: ["natural_feature", "campground", "beach"]
        },

        landscape:{
            strong: ["natural_feature", "park", "tourist_attraction", "beach"],
            medium: ["neighborhood"],
            weak: ["shopping_mall", "market"]
        },

        celebration: {
            strong: ["banquet_hall", "wedding_venue", "event_venue"],
            medium: ["resort", "park", "restaurant"],
            weak: ["natural_feature", "campground"]
        }
    }
    const config = typeMap[photographyType];
    if ( !config ) return 0.5;

    let score = 0.3

    types.forEach(t => {
        if ( config.strong.includes(t) ) score = 1
        else if ( config.medium.includes(t)) score = Math.max(score, 0.7)
        else if ( config.weak.includes(t)) score = Math.min(score, 0.2)
    });

    return score
};



