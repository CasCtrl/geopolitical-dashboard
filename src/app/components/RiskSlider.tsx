import { Slider } from "./ui/slider";
import { Label } from "./ui/label";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface RiskSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  icon: React.ReactNode;
  description?: string;
}

export function RiskSlider({ label, value, onChange, icon, description }: RiskSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-zinc-500">{icon}</div>
        <Label className="text-sm text-zinc-400">{label}</Label>
        {description ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex size-4 items-center justify-center rounded-full border border-zinc-700 text-zinc-500 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
                aria-label={`${label} description`}
              >
                <Info className="size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={8}
              className="max-w-xs border border-zinc-700 bg-zinc-950 text-zinc-200 px-3 py-2"
            >
              <p className="text-[11px] leading-relaxed">{description}</p>
            </TooltipContent>
          </Tooltip>
        ) : null}
        <span className="ml-auto text-sm font-medium text-white">
          {value}%
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        min={0}
        max={100}
        step={1}
        className="w-full"
      />
    </div>
  );
}