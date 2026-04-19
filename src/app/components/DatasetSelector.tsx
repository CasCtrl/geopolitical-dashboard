import * as React from "react";
import { ChevronDown } from "lucide-react";

interface Dataset {
  id: string;
  name: string;
  description: string;
}

interface DatasetSelectorProps {
  datasets: Dataset[];
  selectedDataset: string;
  onDatasetChange: (datasetId: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DatasetSelector({
  datasets,
  selectedDataset,
  onDatasetChange,
  isOpen: controlledIsOpen,
  onOpenChange,
}: DatasetSelectorProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const selected = datasets.find((d) => d.id === selectedDataset);

  const handleSelect = (datasetId: string) => {
    onDatasetChange(datasetId);
    setOpen(false);
  };

  return (
    <div className="relative w-full md:w-80">
      <button
        onClick={() => setOpen(!isOpen)}
        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-between hover:bg-zinc-800 transition-colors text-sm text-white"
      >
        <span className="truncate">
          <span className="text-zinc-500 mr-2">Dataset:</span>
          {selected?.name || "Select a dataset"}
        </span>
        <ChevronDown className="size-4 text-zinc-500 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded shadow-lg z-50 overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {datasets.map((dataset) => (
              <button
                key={dataset.id}
                onClick={() => handleSelect(dataset.id)}
                className={`w-full text-left px-3 py-2 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-b-0 ${
                  selectedDataset === dataset.id ? "bg-zinc-800" : ""
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">
                    {dataset.name}
                  </span>
                  <span className="text-xs text-zinc-500">{dataset.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
