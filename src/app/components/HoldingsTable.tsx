import { Card } from "./ui/card";
import { Asset } from "../data/portfolioData";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface HoldingsTableProps {
  assets: Asset[];
  assetContributions: { ticker: string; riskScore: number; mainRisk?: string }[];
}

export function HoldingsTable({ assets, assetContributions }: HoldingsTableProps) {
  const getContributionColor = (riskScore: number) => {
    if (riskScore >= 8) return "text-red-400 bg-red-950/30";
    if (riskScore >= 6) return "text-orange-400 bg-orange-950/30";
    if (riskScore >= 4) return "text-yellow-400 bg-yellow-950/30";
    return "text-green-400 bg-green-950/30";
  };

  return (
    <Card className="p-3 md:p-4 bg-zinc-950 border-zinc-900">
      <h3 className="text-sm md:text-base mb-3 text-white">Holdings Risk Analysis</h3>
      <div className="overflow-x-auto -mx-3 md:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-zinc-900">
                <th className="text-left py-2 px-3 text-xs text-zinc-500 whitespace-nowrap">Asset</th>
                <th className="text-left py-2 px-3 text-xs text-zinc-500 whitespace-nowrap">Sector</th>
                <th className="text-right py-2 px-3 text-xs text-zinc-500 whitespace-nowrap">Value</th>
                <th className="text-right py-2 px-3 text-xs text-zinc-500 whitespace-nowrap">Allocation</th>
                <th className="text-right py-2 px-3 text-xs text-zinc-500 whitespace-nowrap">Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => {
                const assetContribution = assetContributions.find((c) => c.ticker === asset.ticker);
                const riskScore = assetContribution?.riskScore || 0;
                return (
                  <tr
                    key={asset.ticker}
                    className="border-b border-zinc-900/50 hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div>
                        <p className="font-mono text-xs md:text-sm text-white">{asset.ticker}</p>
                        <p className="text-[10px] md:text-xs text-slate-400">{asset.name}</p>
                      </div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="text-xs md:text-sm text-slate-300">{asset.sector}</span>
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <span className="text-xs md:text-sm text-slate-300">${asset.value.toLocaleString()}</span>
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <span className="text-xs md:text-sm text-slate-300">{asset.weight}%</span>
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs md:text-sm ${getContributionColor(
                          riskScore
                        )}`}
                      >
                        {riskScore.toFixed(2)}
                        {riskScore >= 6 ? (
                          <ArrowUpRight className="size-3" />
                        ) : (
                          <ArrowDownRight className="size-3" />
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}