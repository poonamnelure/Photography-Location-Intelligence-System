export const buildParameterBreakdown = (parameters, weights) => {
  const breakdown = {};

  Object.keys(parameters).forEach(key => {
    const score = parameters[key];
    const weight = weights[key] || 0;

    breakdown[key] = {
      score,
      weight,
      contribution: score * weight
    };
  });

  return breakdown;
};