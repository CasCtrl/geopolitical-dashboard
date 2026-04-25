import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { getCountryIntelligence } from "../utils/riskIntelligence";
import { buildAlertSummary, severityLabel, RiskWeights } from "../utils/riskAlertSummary";

export interface RiskAlertDetail {
  country: string;
  riskScore: number;
  riskContribution: number;
  exposureType?: string;
  contributingAssets: string[];
}

interface RiskAlertDetailDialogProps {
  alert: RiskAlertDetail | null;
  weights: RiskWeights;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RiskAlertDetailDialog({
  alert,
  weights,
  open,
  onOpenChange,
}: RiskAlertDetailDialogProps) {
  const summary = useMemo(() => (alert ? buildAlertSummary(alert, weights) : ""), [alert, weights]);
  const intelligence = useMemo(
    () => (alert ? getCountryIntelligence(alert.country, weights) : null),
    [alert, weights]
  );

  if (!alert) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {alert.country} &middot; Risk score {alert.riskScore.toFixed(0)} / 100
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            A plain-English explanation of why this alert is showing up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-zinc-200 leading-relaxed">
          <p>{summary}</p>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-2 border-t border-zinc-800">
            <p>
              <span className="text-zinc-500">Risk level:</span>{" "}
              <span className="capitalize">{severityLabel(alert.riskScore)}</span>
            </p>
            <p>
              <span className="text-zinc-500">Share of your portfolio risk:</span>{" "}
              {alert.riskContribution.toFixed(1)}%
            </p>
            {intelligence && (
              <>
                <p>
                  <span className="text-zinc-500">How sure we are:</span> {intelligence.confidence}%
                </p>
                <p>
                  <span className="text-zinc-500">Last updated:</span>{" "}
                  {new Date(intelligence.lastUpdated).toLocaleDateString()}
                </p>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
