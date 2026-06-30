import { baseRiskData, CountryRisk } from "../data/countryRiskData";

export interface RiskAlertLike {
  country: string;
  riskScore: number;
  riskContribution: number;
  contributingAssets: string[];
}

export interface RiskWeights {
  political: number;
  economic: number;
  conflict: number;
  corruption: number;
  terrorism: number;
}

const FACTOR_LABELS: Record<keyof CountryRisk, string> = {
  political: "political",
  economic: "economic",
  conflict: "conflict",
  corruption: "corruption",
  terrorism: "terrorism",
};

const FACTOR_PLAIN: Record<keyof CountryRisk, string> = {
  political: "political instability (elections, policy shifts, sanctions)",
  economic: "economic stress (inflation, currency, growth)",
  conflict: "armed conflict or military tension",
  corruption: "corruption and weak rule of law",
  terrorism: "terrorism and security threats",
};

export function severityLabel(score: number): string {
  if (score >= 75) return "very high";
  if (score >= 51) return "high";
  if (score >= 26) return "moderate";
  return "low";
}

export function buildAlertSummary(
  alert: RiskAlertLike,
  weights: RiskWeights,
  blendedDimensions?: CountryRisk
): string {
  const country = alert.country;
  const base = blendedDimensions || baseRiskData[country];
  const assets = alert.contributingAssets;
  const hasAssets = assets.length > 0;
  const isOne = assets.length === 1;
  const stockList = hasAssets ? assets.join(", ") : "your holdings linked to this country";
  const stockNoun = isOne ? "stock" : "stocks";
  const verbIs = isOne ? "is" : "are";
  const possessive = isOne ? "its" : "their";
  const severity = severityLabel(alert.riskScore);
  const contribution = alert.riskContribution.toFixed(1);

  if (!base) {
    return (
      `${stockList} ${verbIs} flagged because ${country} is currently rated ${severity} risk (score ${alert.riskScore.toFixed(0)} out of 100), ` +
      `and exposure to it accounts for about ${contribution}% of your portfolio's overall geopolitical risk. ` +
      `Your current weight settings tell the dashboard which kinds of risk to care about most, so any change in conditions there flows straight into ${possessive} risk score.`
    );
  }

  const weightedFactors = (Object.keys(base) as Array<keyof CountryRisk>)
    .map((factor) => ({
      factor,
      label: FACTOR_LABELS[factor],
      plain: FACTOR_PLAIN[factor],
      score: base[factor],
      weight: weights[factor],
      weightedImpact: base[factor] * (weights[factor] / 100),
    }))
    .sort((a, b) => b.weightedImpact - a.weightedImpact);

  const top = weightedFactors[0];
  const second = weightedFactors[1];

  return (
    `${stockList} ${verbIs} flagged because ${country} is currently rated ${severity} risk (score ${alert.riskScore.toFixed(0)} out of 100), ` +
    `and your exposure to it makes up about ${contribution}% of the portfolio's overall geopolitical risk. ` +
    `The biggest reason is ${top.plain}\u2014${country}'s level there is ${severityLabel(top.score)}, and you've told the dashboard to weight that area heavily (${top.weight}% of your sensitivity), so it has the largest pull on the score. ` +
    `${second.plain.charAt(0).toUpperCase() + second.plain.slice(1)} is the next biggest factor (${severityLabel(second.score)} in ${country}, weighted ${second.weight}%). ` +
    `In short: the ${stockNoun} ${verbIs} tied to ${country}, and the things you care most about right now are the things ${country} struggles with\u2014so if you turn the ${top.label} slider down, this alert will ease; turn it up and it will get stronger.`
  );
}
