import { Asset } from "./portfolioData";

export interface DatasetMetadata {
  id: string;
  name: string;
  description: string;
}

export interface DatasetRecord {
  datasetId: string;
  datasetName: string;
  datasetDescription: string;
  ticker: string;
  assetName: string;
  weight: number;
  value: number;
  sector: string;
  country: string;
  dependencyWeight: number;
  dependencyType: "direct" | "indirect" | "macro";
  dependencyReason: string;
}

// CSV Parsing Cache
let csvParserWorker: Worker | null = null;
let csvParseCache: { [key: string]: { datasets: DatasetMetadata[]; assetsByDataset: { [datasetId: string]: Asset[] } } } = {};

function getCSVWorker(): Worker {
  if (!csvParserWorker) {
    csvParserWorker = new Worker(new URL('../workers/csvWorker.ts', import.meta.url), { type: 'module' });
  }
  return csvParserWorker;
}

export async function loadDatasetsFromCSV(csvPath: string): Promise<{
  datasets: DatasetMetadata[];
  assetsByDataset: { [datasetId: string]: Asset[] };
}> {
  try {
    // Check cache first
    if (csvParseCache[csvPath]) {
      return csvParseCache[csvPath];
    }

    const response = await fetch(csvPath);
    if (!response.ok) throw new Error(`Failed to load CSV: ${response.statusText}`);
    
    const csvText = await response.text();
    
    // Use Web Worker to parse CSV off the main thread
    const records = await new Promise<DatasetRecord[]>((resolve, reject) => {
      const worker = getCSVWorker();
      const timeout = setTimeout(() => {
        reject(new Error('CSV parsing timeout'));
      }, 30000);
      
      const handleMessage = (event: MessageEvent) => {
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.records);
        }
      };
      
      worker.addEventListener('message', handleMessage);
      worker.postMessage({ type: 'parse', csvText });
    });

    // Group records by dataset and build assets
    const datasetMap = new Map<string, DatasetMetadata>();
    const assetsByDataset: { [datasetId: string]: Asset[] } = {};

    records.forEach((record) => {
      // Store dataset metadata
      if (!datasetMap.has(record.datasetId)) {
        datasetMap.set(record.datasetId, {
          id: record.datasetId,
          name: record.datasetName,
          description: record.datasetDescription,
        });
        assetsByDataset[record.datasetId] = [];
      }

      // Find or create asset
      const assetList = assetsByDataset[record.datasetId];
      let asset = assetList.find((a) => a.ticker === record.ticker);

      if (!asset) {
        asset = {
          ticker: record.ticker,
          name: record.assetName,
          weight: record.weight,
          value: record.value,
          sector: record.sector,
          countryDependencies: [],
        };
        assetList.push(asset);
      }

      // Add country dependency if it doesn't already exist
      if (
        record.country &&
        !asset.countryDependencies.find((d) => d.country === record.country)
      ) {
        asset.countryDependencies.push({
          country: record.country,
          weight: record.dependencyWeight,
          type: record.dependencyType,
          reason: record.dependencyReason,
        });
      }
    });

    const datasets = Array.from(datasetMap.values());
    const result = { datasets, assetsByDataset };
    
    // Cache the result
    csvParseCache[csvPath] = result;
    
    return result;
  } catch (error) {
    console.error("Error loading datasets from CSV:", error);
    throw error;
  }
}

function headerIndex(headers: string[], name: string): number {
  return headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
