import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface RiskScoreInfoProps {
  meaning: string;
  calculation: string;
}

export function RiskScoreInfo({ meaning, calculation }: RiskScoreInfoProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-4 items-center justify-center rounded-full border border-zinc-600 text-zinc-400 hover:text-zinc-100 hover:border-zinc-400 transition-colors"
          aria-label="Risk score calculation info"
        >
          <Info className="size-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-xs border border-zinc-700 bg-zinc-950 text-zinc-100 px-3 py-2"
      >
        <p className="text-[11px] leading-relaxed text-zinc-200">{meaning}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
          <span className="font-semibold text-zinc-300">How calculated:</span> {calculation}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}