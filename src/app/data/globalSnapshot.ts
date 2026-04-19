/**
 * Global Geopolitical Risk Snapshot
 * 
 * Defines the current default weight distribution based on the global
 * geopolitical situation. These weights reflect real-time assessments
 * of which risk dimensions pose the greatest threat to portfolios.
 * 
 * Updated: April 19, 2026
 */

export interface RiskWeights {
  political: number;
  economic: number;
  conflict: number;
  corruption: number;
  terrorism: number;
}

export interface GlobalSnapshot {
  name: string;
  description: string;
  weights: RiskWeights;
  updatedDate: string;
  rationale: {
    political: string;
    economic: string;
    conflict: string;
    corruption: string;
    terrorism: string;
  };
}

/**
 * Current Global Snapshot (April 2026)
 * 
 * This snapshot reflects heightened geopolitical tensions with focus on:
 * - Trade conflicts and economic instability
 * - Regional military escalations
 * - Sanctions and economic disruption
 */
export const currentGlobalSnapshot: GlobalSnapshot = {
  name: "Current Global Snapshot",
  description: "Default weights based on April 2026 geopolitical assessment",
  weights: {
    political: 25,    // Baseline political stability concerns
    economic: 28,     // Elevated due to trade tensions and sanctions
    conflict: 30,     // High due to multiple regional conflicts
    corruption: 12,   // Lower priority relative to acute risks
    terrorism: 5,     // Localized terrorism concerns
  },
  updatedDate: "2026-04-19",
  rationale: {
    political: "Moderate emphasis on political risk; key transitions in major economies require monitoring",
    economic: "Elevated weight reflects trade disputes, currency volatility, and sanctions impact",
    conflict: "Highest weight due to active regional conflicts in Middle East, Eastern Europe, and Asia-Pacific",
    corruption: "Lower weight as institutional corruption is slower-moving than acute geopolitical risks",
    terrorism: "Lowest weight; terrorism remains localized despite elevated regional conflicts",
  },
};

/**
 * Preset Risk Weight Profiles
 * 
 * Pre-configured weight distributions for common investment strategies
 */
export const riskProfiles = {
  balanced: {
    name: "Balanced",
    description: "Equal weight across all dimensions",
    weights: {
      political: 20,
      economic: 20,
      conflict: 20,
      corruption: 20,
      terrorism: 20,
    },
  },
  conservative: {
    name: "Conservative",
    description: "Emphasizes political and corruption risk; downplays terrorism",
    weights: {
      political: 30,
      economic: 25,
      conflict: 20,
      corruption: 15,
      terrorism: 10,
    },
  },
  growthFocused: {
    name: "Growth-Focused",
    description: "Emphasizes economic opportunity; minimizes conflict risk",
    weights: {
      political: 15,
      economic: 35,
      conflict: 15,
      corruption: 25,
      terrorism: 10,
    },
  },
  esgFocused: {
    name: "ESG-Focused",
    description: "Emphasizes corruption and governance; incorporates conflict",
    weights: {
      political: 25,
      economic: 15,
      conflict: 20,
      corruption: 35,
      terrorism: 5,
    },
  },
  conflictSensitive: {
    name: "Conflict-Sensitive",
    description: "Prioritizes conflict and terrorism risk assessment",
    weights: {
      political: 20,
      economic: 15,
      conflict: 40,
      corruption: 15,
      terrorism: 10,
    },
  },
  customCrisis: {
    name: "Crisis Response",
    description: "For acute geopolitical crises; maximizes all risk factors",
    weights: {
      political: 30,
      economic: 30,
      conflict: 25,
      corruption: 10,
      terrorism: 5,
    },
  },
};

/**
 * Historical Snapshots
 * 
 * Archive of previous global snapshots for comparison and trend analysis
 */
export const historicalSnapshots: GlobalSnapshot[] = [
  {
    name: "March 2026",
    description: "Previous month snapshot",
    weights: {
      political: 24,
      economic: 26,
      conflict: 28,
      corruption: 13,
      terrorism: 9,
    },
    updatedDate: "2026-03-19",
    rationale: {
      political: "Moderate political risk",
      economic: "Trade tensions ongoing",
      conflict: "Elevated regional conflicts",
      corruption: "Standard monitoring",
      terrorism: "Localized concerns",
    },
  },
  {
    name: "February 2026",
    description: "Early year snapshot",
    weights: {
      political: 22,
      economic: 25,
      conflict: 25,
      corruption: 15,
      terrorism: 13,
    },
    updatedDate: "2026-02-19",
    rationale: {
      political: "Low political risk",
      economic: "Standard economic uncertainty",
      conflict: "Normal regional tensions",
      corruption: "Baseline governance concerns",
      terrorism: "Elevated terrorism assessment",
    },
  },
];

/**
 * Get the default weights (current global snapshot)
 */
export function getDefaultWeights(): RiskWeights {
  return { ...currentGlobalSnapshot.weights };
}

/**
 * Get the snapshot description for display
 */
export function getSnapshotDescription(): string {
  return `Default weights based on ${currentGlobalSnapshot.name} (${currentGlobalSnapshot.updatedDate})`;
}

/**
 * Check if weights match the default snapshot
 */
export function isDefaultWeights(weights: RiskWeights): boolean {
  const defaults = currentGlobalSnapshot.weights;
  return (
    weights.political === defaults.political &&
    weights.economic === defaults.economic &&
    weights.conflict === defaults.conflict &&
    weights.corruption === defaults.corruption &&
    weights.terrorism === defaults.terrorism
  );
}

/**
 * Get total weight sum (should equal 100 for valid distributions)
 */
export function getTotalWeight(weights: RiskWeights): number {
  return (
    weights.political +
    weights.economic +
    weights.conflict +
    weights.corruption +
    weights.terrorism
  );
}

/**
 * Format weights for display (percentage of total)
 */
export function formatWeightsAsPercentages(
  weights: RiskWeights
): Record<string, string> {
  const total = getTotalWeight(weights);
  if (total === 0) {
    return {
      political: "0%",
      economic: "0%",
      conflict: "0%",
      corruption: "0%",
      terrorism: "0%",
    };
  }

  return {
    political: `${((weights.political / total) * 100).toFixed(1)}%`,
    economic: `${((weights.economic / total) * 100).toFixed(1)}%`,
    conflict: `${((weights.conflict / total) * 100).toFixed(1)}%`,
    corruption: `${((weights.corruption / total) * 100).toFixed(1)}%`,
    terrorism: `${((weights.terrorism / total) * 100).toFixed(1)}%`,
  };
}
