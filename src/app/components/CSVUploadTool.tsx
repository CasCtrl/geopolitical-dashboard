import React, { useRef, useState } from 'react';
import { Upload, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  parseCSVHoldings,
  validateCSVHoldings,
  generateSampleCSV,
  HoldingAsset,
} from '../utils/portfolioFilters';

interface CSVUploadProps {
  onAssetsLoaded?: (assets: HoldingAsset[]) => void;
}

export function CSVUploadTool({ onAssetsLoaded }: CSVUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<HoldingAsset[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrors(['Please upload a CSV file']);
      return;
    }

    setLoading(true);
    const text = await file.text();
    const parsedAssets = parseCSVHoldings(text);
    const validation = validateCSVHoldings(parsedAssets);

    if (!validation.valid) {
      setErrors(validation.errors);
      setAssets([]);
    } else {
      setAssets(parsedAssets);
      setErrors([]);
      onAssetsLoaded?.(parsedAssets);
    }
    setLoading(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const downloadTemplate = () => {
    const csv = generateSampleCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'holdings_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-4">
      <Card className="p-6 bg-zinc-950 border border-zinc-800">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Bulk Upload Holdings</h3>

        {/* Template Download */}
        <div className="mb-4 p-3 bg-zinc-900 border border-zinc-700 rounded-lg">
          <p className="text-sm text-zinc-300 mb-2">Need a template?</p>
          <Button
            onClick={downloadTemplate}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-100 py-2 rounded-lg font-medium text-sm"
          >
            <Download size={16} className="mr-2" />
            Download CSV Template
          </Button>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`p-8 rounded-lg border-2 border-dashed transition text-center cursor-pointer ${
            dragActive
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-zinc-600 bg-zinc-900 hover:border-zinc-500'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={32} className="mx-auto mb-2 text-zinc-400" />
          <p className="text-sm font-medium text-zinc-200">
            Drop your CSV file here or click to browse
          </p>
          <p className="text-xs text-zinc-400 mt-1">CSV format with columns: Symbol, Name, Country, Sector, Value, Allocation</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="mt-4 p-4 bg-red-950 border border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 mt-1 flex-shrink-0" />
              <div className="text-sm text-red-200">
                {errors.map((error, i) => (
                  <div key={i}>{error}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {assets.length > 0 && errors.length === 0 && (
          <div className="mt-4 p-4 bg-green-950 border border-green-800 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-200">
                  Successfully loaded {assets.length} holdings
                </p>
                <div className="text-xs text-green-300 mt-2 space-y-1">
                  {assets.slice(0, 5).map((asset, i) => (
                    <div key={i}>
                      {asset.symbol} - {asset.country} ({asset.sector})
                    </div>
                  ))}
                  {assets.length > 5 && <div>... and {assets.length - 5} more</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-4 p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-center">
            <p className="text-sm text-zinc-300">Processing file...</p>
          </div>
        )}
      </Card>
    </div>
  );
}
