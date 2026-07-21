import SunCalc from "suncalc";

export const computeLightingCondition = ({
  lat,
  lng,
  dateTime,
  photographyType
}) => {
  const date = new Date(dateTime);
  if (isNaN(date)) return 0.5;

  const sunPosition = SunCalc.getPosition(date, lat, lng);
  const altitudeDeg = sunPosition.altitude * (180 / Math.PI);

  // Night
  if (altitudeDeg <= 0) {
    return photographyType === "astrophotography" ? 1 : 0.1;
  }

  // Ideal altitude for golden light ~ 6°–15°
  const idealLow = 6;
  const idealHigh = 15;

  if (altitudeDeg >= idealLow && altitudeDeg <= idealHigh) {
    return 0.95; // strong but not absolute 1
  }

  // Soft low light
  if (altitudeDeg > 0 && altitudeDeg < idealLow) {
    return 0.85;
  }

  // Balanced daylight
  if (altitudeDeg > idealHigh && altitudeDeg <= 50) {
    return 0.75;
  }

  // Harsh overhead sun
  if (altitudeDeg > 50) {
    return 0.5;
  }

  return 0.4;
};
