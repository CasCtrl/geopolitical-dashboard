import { Slider } from "./ui/slider";
import { Label } from "./ui/label";

interface RiskSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  icon: React.ReactNode;
}

export function RiskSlider({ label, value, onChange, icon }: RiskSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-zinc-500">{icon}</div>
        <Label className="text-sm text-zinc-400">{label}</Label>
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