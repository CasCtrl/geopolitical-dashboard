// Web Worker for parsing large CSV files off the main thread
import { DatasetRecord } from '../data/csvLoader';

interface WorkerMessage {
  type: 'parse';
  csvText: string;
}

interface WorkerResult {
  records: DatasetRecord[];
  error?: string;
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

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  try {
    const { type, csvText } = event.data;
    
    if (type === 'parse') {
      const lines = csvText.split("\n").filter((line) => line.trim());
      
      if (lines.length < 2) {
        throw new Error("CSV is empty or invalid");
      }

      const headers = lines[0].split(",").map((h) => h.trim());
      const records: DatasetRecord[] = [];

      // Process in chunks to allow for progress updates
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

      const result: WorkerResult = { records };
      self.postMessage(result);
    }
  } catch (error) {
    const result: WorkerResult = { 
      records: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    self.postMessage(result);
  }
};

export {};
