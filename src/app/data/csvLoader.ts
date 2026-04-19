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

export async function loadDatasetsFromCSV(csvPath: string): Promise<{
  datasets: DatasetMetadata[];
  assetsByDataset: { [datasetId: string]: Asset[] };
}> {
  try {
    const response = await fetch(csvPath);
    if (!response.ok) throw new Error(`Failed to load CSV: ${response.statusText}`);
    
    const csvText = await response.text();
    const lines = csvText.split("\n").filter((line) => line.trim());
    
    if (lines.length < 2) throw new Error("CSV is empty or invalid");

    const headers = lines[0].split(",").map((h) => h.trim());
    const records: DatasetRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const record: DatasetRecord = {
        datasetId: values[headerIndex(headers, "datasetId")] || "",
        datasetName: values[headerIndex(headers, "datasetName")] || "",
        datasetDescription: values[headerIndex(headers, "datasetDescription")] || "",
        ticker: values[headerIndex(headers, "ticker")] || "",
        assetName: values[headerIndex(headers, "assetName")] || "",
        weight: parseFloat(values[headerIndex(headers, "weight")]) || 0,
        value: parseFloat(values[headerIndex(headers, "value")]) || 0,
        sector: values[headerIndex(headers, "sector")] || "",
        country: values[headerIndex(headers, "country")] || "",
        dependencyWeight: parseFloat(values[headerIndex(headers, "dependencyWeight")]) || 0,
        dependencyType: (values[headerIndex(headers, "dependencyType")] || "direct") as
          | "direct"
          | "indirect"
          | "macro",
        dependencyReason: values[headerIndex(headers, "dependencyReason")] || "",
      };

      records.push(record);
    }

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
    return { datasets, assetsByDataset };
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
