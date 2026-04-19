import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { sectors, PortfolioAsset } from "../data/sectorData";
import { Plus, Trash2, TrendingUp, AlertCircle } from "lucide-react";

interface PortfolioPanelProps {
  assets: PortfolioAsset[];
  onAssetsChange: (assets: PortfolioAsset[]) => void;
  portfolioMetrics: {
    totalRisk: number;
    volatilityScore: number;
  };
}

export function PortfolioPanel({
  assets,
  onAssetsChange,
  portfolioMetrics,
}: PortfolioPanelProps) {
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetSector, setNewAssetSector] = useState("");
  const [newAssetAllocation, setNewAssetAllocation] = useState("");
  const [newAssetValue, setNewAssetValue] = useState("");

  const addAsset = () => {
    if (!newAssetName || !newAssetSector || !newAssetAllocation) return;

    const asset: PortfolioAsset = {
      id: Date.now().toString(),
      name: newAssetName,
      sector: newAssetSector,
      allocation: parseFloat(newAssetAllocation),
      currentValue: parseFloat(newAssetValue) || 0,
    };

    onAssetsChange([...assets, asset]);
    setNewAssetName("");
    setNewAssetSector("");
    setNewAssetAllocation("");
    setNewAssetValue("");
  };

  const removeAsset = (id: string) => {
    onAssetsChange(assets.filter((a) => a.id !== id));
  };

  const totalAllocation = assets.reduce((sum, a) => sum + a.allocation, 0);
  const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);

  const getRiskLevel = (score: number) => {
    if (score > 80) return { label: "Critical", color: "text-red-700" };
    if (score > 60) return { label: "High", color: "text-red-600" };
    if (score > 40) return { label: "Moderate", color: "text-orange-600" };
    if (score > 20) return { label: "Low", color: "text-yellow-600" };
    if (score > 5) return { label: "Minimal", color: "text-yellow-400" };
    return { label: "None", color: "text-green-400" };
  };

  const riskLevel = getRiskLevel(portfolioMetrics.volatilityScore);

  return (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg">Portfolio Risk Analysis</h3>
            <TrendingUp className="size-5" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400">Total Value</p>
              <p className="text-2xl mt-1">
                ${totalValue.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Assets</p>
              <p className="text-2xl mt-1">{assets.length}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-400">Geopolitical Risk Score</p>
              <span className={`text-sm ${riskLevel.color}`}>
                {riskLevel.label}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-2 rounded-full transition-all"
                style={{ width: `${portfolioMetrics.volatilityScore}%` }}
              />
            </div>
            <p className="text-xl">
              {portfolioMetrics.volatilityScore}/100
            </p>
          </div>

          {portfolioMetrics.volatilityScore >= 60 && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="size-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                High geopolitical risk detected. Consider diversifying away from high-risk regions.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Add New Asset */}
      <Card className="p-6 bg-white">
        <h3 className="text-lg mb-4 text-slate-900">Add Asset</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Asset Name</Label>
            <Input
              placeholder="e.g., AAPL, Tech Fund"
              value={newAssetName}
              onChange={(e) => setNewAssetName(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label className="text-xs">Sector</Label>
            <Select value={newAssetSector} onValueChange={setNewAssetSector}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select sector" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sectors).map(([key, sector]) => (
                  <SelectItem key={key} value={key}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Allocation %</Label>
              <Input
                type="number"
                placeholder="0"
                value={newAssetAllocation}
                onChange={(e) => setNewAssetAllocation(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Value ($)</Label>
              <Input
                type="number"
                placeholder="0"
                value={newAssetValue}
                onChange={(e) => setNewAssetValue(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <Button onClick={addAsset} className="w-full" size="sm">
            <Plus className="size-4 mr-2" />
            Add to Portfolio
          </Button>
        </div>

        {totalAllocation !== 100 && assets.length > 0 && (
          <div className="mt-3 text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="size-3" />
            Allocation total: {totalAllocation.toFixed(1)}% (should be 100%)
          </div>
        )}
      </Card>

      {/* Portfolio Holdings */}
      {assets.length > 0 && (
        <Card className="p-6 bg-white">
          <h3 className="text-lg mb-4 text-slate-900">Holdings</h3>
          <div className="space-y-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm">{asset.name}</p>
                  <p className="text-xs text-slate-600">
                    {sectors[asset.sector]?.name}
                  </p>
                </div>
                <div className="text-right mr-3">
                  <p className="text-sm">{asset.allocation}%</p>
                  <p className="text-xs text-slate-600">
                    ${asset.currentValue.toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAsset(asset.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
