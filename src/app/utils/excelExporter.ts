import * as XLSX from 'xlsx';

interface ExportData {
  portfolioSummary?: Record<string, any>;
  countryRisks?: Record<string, number>;
  holdings?: Array<Record<string, any>>;
  trends?: Array<Record<string, any>>;
  countryExposures?: Array<Record<string, any>>;
  assetContributions?: Array<Record<string, any>>;
  topRiskAssets?: Array<string>;
  topRiskCountries?: Array<string>;
  weights?: Record<string, number>;
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

  // Country Exposures
  if (data.countryExposures && data.countryExposures.length > 0) {
    csvData.push('COUNTRY EXPOSURES');
    const headers = Object.keys(data.countryExposures[0]);
    csvData.push(headers.join(','));
    data.countryExposures.forEach((exposure) => {
      const values = headers.map((header) => {
        const value = exposure[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvData.push(values.join(','));
    });
    csvData.push('');
  }

  // Asset Contributions
  if (data.assetContributions && data.assetContributions.length > 0) {
    csvData.push('ASSET RISK CONTRIBUTIONS');
    const headers = Object.keys(data.assetContributions[0]);
    csvData.push(headers.join(','));
    data.assetContributions.forEach((asset) => {
      const values = headers.map((header) => {
        const value = asset[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvData.push(values.join(','));
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

  // Top Risk Assets
  if (data.topRiskAssets && data.topRiskAssets.length > 0) {
    csvData.push('TOP RISK ASSETS');
    csvData.push('Asset');
    data.topRiskAssets.forEach((asset) => csvData.push(asset));
    csvData.push('');
  }

  // Top Risk Countries
  if (data.topRiskCountries && data.topRiskCountries.length > 0) {
    csvData.push('TOP RISK COUNTRIES');
    csvData.push('Country');
    data.topRiskCountries.forEach((country) => csvData.push(country));
    csvData.push('');
  }

  // Weights
  if (data.weights && Object.keys(data.weights).length > 0) {
    csvData.push('RISK FACTOR WEIGHTS');
    csvData.push('Factor,Weight');
    Object.entries(data.weights).forEach(([factor, weight]) => {
      csvData.push(`${factor},${weight}`);
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

  // Country Exposures Sheet
  if (data.countryExposures && data.countryExposures.length > 0) {
    const exposuresSheet = XLSX.utils.json_to_sheet(data.countryExposures);
    XLSX.utils.book_append_sheet(workbook, exposuresSheet, 'Country Exposures');
  }

  // Asset Contributions Sheet
  if (data.assetContributions && data.assetContributions.length > 0) {
    const contributionsSheet = XLSX.utils.json_to_sheet(data.assetContributions);
    XLSX.utils.book_append_sheet(workbook, contributionsSheet, 'Asset Contributions');
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

  // Top Risk Assets Sheet
  if (data.topRiskAssets && data.topRiskAssets.length > 0) {
    const topRiskAssetsSheet = XLSX.utils.json_to_sheet(data.topRiskAssets.map((asset) => ({ Asset: asset })));
    XLSX.utils.book_append_sheet(workbook, topRiskAssetsSheet, 'Top Risk Assets');
  }

  // Top Risk Countries Sheet
  if (data.topRiskCountries && data.topRiskCountries.length > 0) {
    const topRiskCountriesSheet = XLSX.utils.json_to_sheet(data.topRiskCountries.map((country) => ({ Country: country })));
    XLSX.utils.book_append_sheet(workbook, topRiskCountriesSheet, 'Top Risk Countries');
  }

  // Weights Sheet
  if (data.weights && Object.keys(data.weights).length > 0) {
    const weightsSheet = XLSX.utils.json_to_sheet(
      Object.entries(data.weights).map(([factor, weight]) => ({ Factor: factor, Weight: weight }))
    );
    XLSX.utils.book_append_sheet(workbook, weightsSheet, 'Risk Weights');
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
