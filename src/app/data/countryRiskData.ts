// Base risk values for countries across different categories
// These are mock values for demonstration purposes

export interface CountryRisk {
  political: number;
  economic: number;
  conflict: number;
  corruption: number;
  terrorism: number;
}

export const baseRiskData: { [key: string]: CountryRisk } = {
  // Americas
  "United States": { political: 30, economic: 20, conflict: 15, corruption: 25, terrorism: 20 },
  "Canada": { political: 15, economic: 15, conflict: 10, corruption: 15, terrorism: 10 },
  "Mexico": { political: 55, economic: 45, conflict: 60, corruption: 70, terrorism: 35 },
  "Brazil": { political: 60, economic: 50, conflict: 45, corruption: 65, terrorism: 25 },
  "Argentina": { political: 50, economic: 60, conflict: 20, corruption: 60, terrorism: 15 },
  "Colombia": { political: 45, economic: 40, conflict: 50, corruption: 55, terrorism: 40 },
  "Venezuela": { political: 85, economic: 90, conflict: 60, corruption: 85, terrorism: 30 },
  "Chile": { political: 30, economic: 25, conflict: 15, corruption: 30, terrorism: 10 },
  "Peru": { political: 45, economic: 40, conflict: 35, corruption: 55, terrorism: 30 },
  
  // Europe
  "United Kingdom": { political: 25, economic: 20, conflict: 15, corruption: 20, terrorism: 25 },
  "France": { political: 30, economic: 25, conflict: 20, corruption: 25, terrorism: 35 },
  "Germany": { political: 20, economic: 15, conflict: 10, corruption: 15, terrorism: 20 },
  "Spain": { political: 25, economic: 30, conflict: 15, corruption: 30, terrorism: 20 },
  "Italy": { political: 40, economic: 35, conflict: 15, corruption: 45, terrorism: 25 },
  "Russia": { political: 75, economic: 60, conflict: 80, corruption: 75, terrorism: 50 },
  "Ukraine": { political: 70, economic: 70, conflict: 90, corruption: 65, terrorism: 45 },
  "Poland": { political: 30, economic: 25, conflict: 20, corruption: 30, terrorism: 15 },
  "Turkey": { political: 65, economic: 55, conflict: 60, corruption: 60, terrorism: 55 },
  "Greece": { political: 40, economic: 50, conflict: 20, corruption: 45, terrorism: 20 },
  "Netherlands": { political: 15, economic: 15, conflict: 10, corruption: 15, terrorism: 15 },
  "Belgium": { political: 20, economic: 20, conflict: 10, corruption: 20, terrorism: 25 },
  "Sweden": { political: 15, economic: 15, conflict: 10, corruption: 15, terrorism: 15 },
  "Norway": { political: 10, economic: 10, conflict: 10, corruption: 10, terrorism: 10 },
  "Finland": { political: 15, economic: 15, conflict: 15, corruption: 10, terrorism: 10 },
  "Switzerland": { political: 10, economic: 10, conflict: 10, corruption: 10, terrorism: 10 },
  "Austria": { political: 20, economic: 15, conflict: 10, corruption: 20, terrorism: 15 },
  "Portugal": { political: 20, economic: 25, conflict: 10, corruption: 25, terrorism: 15 },
  "Romania": { political: 40, economic: 35, conflict: 20, corruption: 55, terrorism: 20 },
  "Hungary": { political: 45, economic: 35, conflict: 15, corruption: 50, terrorism: 15 },
  "Belarus": { political: 80, economic: 60, conflict: 50, corruption: 70, terrorism: 25 },
  
  // Middle East
  "Syria": { political: 95, economic: 85, conflict: 95, corruption: 80, terrorism: 90 },
  "Iraq": { political: 75, economic: 70, conflict: 80, corruption: 75, terrorism: 85 },
  "Iran": { political: 70, economic: 65, conflict: 60, corruption: 65, terrorism: 50 },
  "Israel": { political: 45, economic: 25, conflict: 70, corruption: 30, terrorism: 60 },
  "Saudi Arabia": { political: 60, economic: 40, conflict: 50, corruption: 55, terrorism: 50 },
  "Yemen": { political: 90, economic: 85, conflict: 95, corruption: 80, terrorism: 90 },
  "United Arab Emirates": { political: 35, economic: 20, conflict: 25, corruption: 30, terrorism: 25 },
  "Jordan": { political: 45, economic: 50, conflict: 40, corruption: 45, terrorism: 40 },
  "Lebanon": { political: 80, economic: 85, conflict: 65, corruption: 80, terrorism: 60 },
  
  // Africa
  "Egypt": { political: 60, economic: 55, conflict: 50, corruption: 65, terrorism: 55 },
  "South Africa": { political: 45, economic: 45, conflict: 40, corruption: 55, terrorism: 25 },
  "Nigeria": { political: 65, economic: 60, conflict: 70, corruption: 75, terrorism: 75 },
  "Kenya": { political: 50, economic: 45, conflict: 55, corruption: 60, terrorism: 60 },
  "Ethiopia": { political: 70, economic: 65, conflict: 75, corruption: 65, terrorism: 50 },
  "Somalia": { political: 95, economic: 90, conflict: 95, corruption: 90, terrorism: 95 },
  "Sudan": { political: 85, economic: 80, conflict: 85, corruption: 80, terrorism: 70 },
  "Libya": { political: 85, economic: 80, conflict: 85, corruption: 80, terrorism: 75 },
  "Algeria": { political: 55, economic: 50, conflict: 45, corruption: 60, terrorism: 50 },
  "Morocco": { political: 40, economic: 35, conflict: 30, corruption: 45, terrorism: 35 },
  "Tunisia": { political: 50, economic: 55, conflict: 35, corruption: 50, terrorism: 45 },
  
  // Asia
  "China": { political: 55, economic: 35, conflict: 30, corruption: 60, terrorism: 25 },
  "India": { political: 50, economic: 40, conflict: 55, corruption: 60, terrorism: 50 },
  "Japan": { political: 20, economic: 20, conflict: 15, corruption: 20, terrorism: 10 },
  "South Korea": { political: 30, economic: 25, conflict: 35, corruption: 30, terrorism: 15 },
  "Taiwan": { political: 35, economic: 25, conflict: 45, corruption: 25, terrorism: 15 },
  "North Korea": { political: 95, economic: 85, conflict: 75, corruption: 90, terrorism: 30 },
  "Pakistan": { political: 70, economic: 65, conflict: 75, corruption: 75, terrorism: 80 },
  "Afghanistan": { political: 95, economic: 90, conflict: 95, corruption: 90, terrorism: 95 },
  "Bangladesh": { political: 60, economic: 55, conflict: 45, corruption: 70, terrorism: 50 },
  "Myanmar": { political: 85, economic: 70, conflict: 85, corruption: 75, terrorism: 55 },
  "Thailand": { political: 50, economic: 35, conflict: 40, corruption: 50, terrorism: 35 },
  "Vietnam": { political: 45, economic: 35, conflict: 25, corruption: 55, terrorism: 20 },
  "Malaysia": { political: 35, economic: 30, conflict: 25, corruption: 45, terrorism: 30 },
  "Indonesia": { political: 40, economic: 35, conflict: 35, corruption: 50, terrorism: 40 },
  "Philippines": { political: 55, economic: 45, conflict: 60, corruption: 65, terrorism: 60 },
  "Singapore": { political: 15, economic: 10, conflict: 10, corruption: 10, terrorism: 15 },
  "Australia": { political: 15, economic: 15, conflict: 10, corruption: 15, terrorism: 15 },
  "New Zealand": { political: 10, economic: 10, conflict: 10, corruption: 10, terrorism: 10 },
};

export function calculateRiskIndex(
  country: string,
  weights: {
    political: number;
    economic: number;
    conflict: number;
    corruption: number;
    terrorism: number;
  }
): number {
  // Calculate total weight to check if all are zero
  const totalWeight = 
    weights.political + 
    weights.economic + 
    weights.conflict + 
    weights.corruption + 
    weights.terrorism;

  // If all weights are zero, return zero risk (all countries should be green)
  if (totalWeight === 0) {
    return 0;
  }

  const baseRisk = baseRiskData[country];
  
  if (!baseRisk) {
    // Default risk for countries not in our database
    return 30;
  }

  // Calculate risk as weighted sum normalized to 0-100 scale
  // Each base risk (0-100) is multiplied by its weight (0-100)
  // Then we divide by 500 (5 factors * 100 max weight) to normalize to 0-100
  const weightedRisk =
    (baseRisk.political * weights.political +
      baseRisk.economic * weights.economic +
      baseRisk.conflict * weights.conflict +
      baseRisk.corruption * weights.corruption +
      baseRisk.terrorism * weights.terrorism) /
    500;

  return Math.round(weightedRisk);
}