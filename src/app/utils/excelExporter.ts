import * as XLSX from 'xlsx';

interface ExportData {
  portfolioSummary?: Record<string, any>;
  countryRisks?: Record<string, number>;
  holdings?: Array<Record<string, any>>;
  trends?: Array<Record<string, any>>;
}

export function exportToCSV(data: ExportData, filename: string): void {
  const csvData: string[] = [];

  // Portfolio Summary
  if (data.portfolioSummary) {
    csvData.push('PORTFOLIO SUMMARY');
    csvData.push('');
    Object.entries(data.portfolioSummary).forEach(([key, value]) => {
      csvData.push(`${key},${value}`);
    });
    csvData.push('');
  }

  // Country Risks
  if (data.countryRisks && Object.keys(data.countryRisks).length > 0) {
    csvData.push('COUNTRY RISK ANALYSIS');
    csvData.push('Country,Risk Score');
    Object.entries(data.countryRisks)
      .sort((a, b) => b[1] - a[1])
      .forEach(([country, risk]) => {
        csvData.push(`${country},${risk.toFixed(2)}`);
      });
    csvData.push('');
  }

  // Holdings
  if (data.holdings && data.holdings.length > 0) {
    csvData.push('PORTFOLIO HOLDINGS');
    const headers = Object.keys(data.holdings[0]);
    csvData.push(headers.join(','));
    data.holdings.forEach((holding) => {
      const values = headers.map((header) => {
        const value = holding[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvData.push(values.join(','));
    });
    csvData.push('');
  }

  // Trends
  if (data.trends && data.trends.length > 0) {
    csvData.push('HISTORICAL TRENDS');
    const headers = Object.keys(data.trends[0]);
    csvData.push(headers.join(','));
    data.trends.forEach((trend) => {
      const values = headers.map((header) => trend[header]);
      csvData.push(values.join(','));
    });
  }

  const csv = csvData.join('\n');
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function exportToExcel(data: ExportData, filename: string): void {
  const workbook = XLSX.utils.book_new();

  // Portfolio Summary Sheet
  if (data.portfolioSummary) {
    const summaryData = Object.entries(data.portfolioSummary).map(([key, value]) => ({
      Metric: key,
      Value: value,
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Portfolio Summary');
  }

  // Country Risks Sheet
  if (data.countryRisks && Object.keys(data.countryRisks).length > 0) {
    const countryData = Object.entries(data.countryRisks)
      .sort((a, b) => b[1] - a[1])
      .map(([country, risk]) => ({
        Country: country,
        'Risk Score': parseFloat(risk.toFixed(2)),
      }));
    const countrySheet = XLSX.utils.json_to_sheet(countryData);
    XLSX.utils.book_append_sheet(workbook, countrySheet, 'Country Risks');
  }

  // Holdings Sheet
  if (data.holdings && data.holdings.length > 0) {
    const holdingsSheet = XLSX.utils.json_to_sheet(data.holdings);
    XLSX.utils.book_append_sheet(workbook, holdingsSheet, 'Holdings');
  }

  // Trends Sheet
  if (data.trends && data.trends.length > 0) {
    const trendsSheet = XLSX.utils.json_to_sheet(data.trends);
    XLSX.utils.book_append_sheet(workbook, trendsSheet, 'Trends');
  }

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportTableToExcel(
  data: Array<Record<string, any>>,
  sheetName: string,
  filename: string
): void {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(data);
  
  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length, 12),
  }));
  sheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportMultipleSheets(
  sheets: Array<{
    name: string;
    data: Array<Record<string, any>>;
  }>,
  filename: string
): void {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ name, data }) => {
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  });

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const element = document.createElement('a');
  element.setAttribute('href', `data:${mimeType},${encodeURIComponent(content)}`);
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export function generateReportMetadata(): Record<string, any> {
  return {
    'Generated Date': new Date().toISOString(),
    'Report Type': 'Geopolitical Risk Dashboard',
    'Software Version': '1.0.0',
  };
}
