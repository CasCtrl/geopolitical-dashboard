import { X } from "lucide-react";

interface RiskMethodologyModalProps {
  open: boolean;
  onClose: () => void;
}

const DIMENSIONS = [
  {
    name: "Political",
    color: "text-blue-400",
    dot: "bg-blue-400",
    description: "Instability in government institutions, regulatory changes, policy uncertainty, and political transitions.",
    factors: ["Government stability & legitimacy", "Regulatory predictability", "Policy continuity across administrations", "Democratic institution strength"],
    examples: [{ country: "United States", score: 30 }, { country: "Syria", score: 95 }],
  },
  {
    name: "Economic",
    color: "text-emerald-400",
    dot: "bg-emerald-400",
    description: "Macroeconomic vulnerabilities, currency instability, debt crises, and trade disruptions.",
    factors: ["Currency stability & forex reserves", "Debt-to-GDP ratio & credit risk", "Economic growth volatility", "Trade dependency & diversification"],
    examples: [{ country: "Germany", score: 15 }, { country: "Venezuela", score: 90 }],
  },
  {
    name: "Conflict",
    color: "text-orange-400",
    dot: "bg-orange-400",
    description: "Military conflicts, border disputes, insurgency, and security threats.",
    factors: ["Active military conflicts", "Border disputes or territorial claims", "Insurgent or extremist activity", "Historical conflict patterns"],
    examples: [{ country: "Canada", score: 10 }, { country: "Yemen", score: 95 }],
  },
  {
    name: "Corruption",
    color: "text-yellow-400",
    dot: "bg-yellow-400",
    description: "Institutional corruption, lack of rule of law, and governance failures.",
    factors: ["Corruption Perceptions Index (CPI) scores", "Judicial independence", "Law enforcement effectiveness", "Bureaucratic transparency"],
    examples: [{ country: "Norway", score: 10 }, { country: "Somalia", score: 90 }],
  },
  {
    name: "Terrorism",
    color: "text-red-400",
    dot: "bg-red-400",
    description: "Terrorist attacks, extremist activity, and security incidents.",
    factors: ["Frequency & severity of attacks", "Active terrorist organizations", "Security force effectiveness", "Border security & control"],
    examples: [{ country: "United States", score: 20 }, { country: "Afghanistan", score: 95 }],
  },
];

const WEIGHT_PRESETS = [
  { name: "Balanced", political: 20, economic: 20, conflict: 20, corruption: 20, terrorism: 20 },
  { name: "Conservative", political: 30, economic: 25, conflict: 20, corruption: 15, terrorism: 10 },
  { name: "Growth-Focused", political: 15, economic: 30, conflict: 15, corruption: 25, terrorism: 15 },
  { name: "ESG-Focused", political: 25, economic: 20, conflict: 15, corruption: 35, terrorism: 5 },
  { name: "Conflict-Sensitive", political: 20, economic: 15, conflict: 40, corruption: 15, terrorism: 10 },
];

const RISK_TIERS = [
  { label: "Low", range: "0–25", color: "bg-green-500", textColor: "text-green-400", desc: "Stable, minimal geopolitical exposure" },
  { label: "Medium", range: "26–50", color: "bg-yellow-500", textColor: "text-yellow-400", desc: "Moderate concerns, monitor closely" },
  { label: "High", range: "51–74", color: "bg-orange-500", textColor: "text-orange-400", desc: "Significant instability, elevated risk" },
  { label: "Critical", range: "75–100", color: "bg-red-500", textColor: "text-red-400", desc: "Severe risk, active crisis conditions" },
];

export function RiskMethodologyModal({ open, onClose }: RiskMethodologyModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Risk methodology"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Risk Score Methodology</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">How geopolitical risk is measured and aggregated</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            aria-label="Close methodology"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-6">
          {/* Formula summary */}
          <section>
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Calculation Chain</h3>
            <div className="space-y-2 rounded border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-bold text-zinc-300">1</span>
                <div>
                  <p className="text-[11px] font-medium text-zinc-200">Country Risk Score</p>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    = Σ(Dimension<sub>i</sub> × Weight<sub>i</sub>) ÷ 500
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Each slider is 0–100; divisor 500 = 5 factors × 100 (max weight). Scores are normalized to 0–100. Live World Bank WGI data is blended in when available (6-hour cache).</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-bold text-zinc-300">2</span>
                <div>
                  <p className="text-[11px] font-medium text-zinc-200">Portfolio Risk Score</p>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    = Σ(Allocation<sub>i</sub> × δ<sub>i</sub> × CountryRisk<sub>i</sub>)
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Allocation = asset weight ÷ 100. δ = country dependency weight (0–1) per asset. Summed across all asset–country pairs; capped at 100.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 5 Dimensions */}
          <section>
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Five Risk Dimensions (each 0–100)</h3>
            <div className="space-y-2">
              {DIMENSIONS.map((dim) => (
                <div key={dim.name} className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`size-2 rounded-full ${dim.dot}`} />
                    <span className={`text-[11px] font-semibold ${dim.color}`}>{dim.name}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mb-2">{dim.description}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mb-2">
                    {dim.factors.map((f) => (
                      <p key={f} className="text-[10px] text-zinc-500 before:content-['·'] before:mr-1">{f}</p>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 pt-1.5 border-t border-zinc-800">
                    <p className="text-[10px] text-zinc-500">Examples:</p>
                    {dim.examples.map((ex) => (
                      <span key={ex.country} className="text-[10px] text-zinc-400">
                        {ex.country} <span className="font-semibold text-zinc-300">{ex.score}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Risk tiers */}
          <section>
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Risk Tiers</h3>
            <div className="grid grid-cols-2 gap-2">
              {RISK_TIERS.map((tier) => (
                <div key={tier.label} className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-2.5">
                  <div className={`size-2.5 rounded-full ${tier.color}`} />
                  <div>
                    <p className={`text-[11px] font-semibold ${tier.textColor}`}>{tier.label} <span className="text-zinc-500 font-normal">{tier.range}</span></p>
                    <p className="text-[10px] text-zinc-500">{tier.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Weight presets */}
          <section>
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Dimension Weight Presets</h3>
            <div className="overflow-x-auto rounded border border-zinc-800">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60">
                    <th className="text-left px-3 py-2 text-zinc-400 font-semibold">Profile</th>
                    {DIMENSIONS.map((d) => (
                      <th key={d.name} className={`text-center px-2 py-2 font-semibold ${d.color}`}>{d.name.slice(0, 4)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WEIGHT_PRESETS.map((preset, i) => (
                    <tr key={preset.name} className={i < WEIGHT_PRESETS.length - 1 ? "border-b border-zinc-800/60" : ""}>
                      <td className="px-3 py-2 text-zinc-300 font-medium">{preset.name}</td>
                      <td className="text-center px-2 py-2 text-zinc-400">{preset.political}</td>
                      <td className="text-center px-2 py-2 text-zinc-400">{preset.economic}</td>
                      <td className="text-center px-2 py-2 text-zinc-400">{preset.conflict}</td>
                      <td className="text-center px-2 py-2 text-zinc-400">{preset.corruption}</td>
                      <td className="text-center px-2 py-2 text-zinc-400">{preset.terrorism}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Data source */}
          <section className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 space-y-1.5">
            <p className="text-[10px] text-zinc-500">
              <span className="font-semibold text-zinc-400">Base risk data:</span> Research-calibrated static estimates (80+ countries) derived from CPI, Global Peace Index, and WGI baselines.
            </p>
            <p className="text-[10px] text-zinc-500">
              <span className="font-semibold text-zinc-400">Live overrides:</span> World Bank WGI (GOV_WGI_ indicators — Government Effectiveness, Voice &amp; Accountability, Political Stability, Control of Corruption, Rule of Law) refreshed every 6 hours; 75 countries.
            </p>
            <p className="text-[10px] text-zinc-500">
              <span className="font-semibold text-zinc-400">Market data:</span> S&amp;P 500 daily top performers via Yahoo Finance (15-minute cache). News via Bloomberg RSS (live). Last data refresh shown in the Portfolio Snapshot header.
            </p>
          </section>
        </div>

        {/* Footer close button */}
        <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
