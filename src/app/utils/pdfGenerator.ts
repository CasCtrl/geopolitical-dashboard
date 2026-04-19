import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportOptions {
  title: string;
  includeCharts: boolean;
  dateRange?: string;
  portfolioSummary?: any;
  countryRisks?: Record<string, number>;
  holdings?: Array<Record<string, any>>;
  trends?: Array<Record<string, any>>;
  countryExposures?: Array<Record<string, any>>;
  assetContributions?: Array<Record<string, any>>;
  topRiskAssets?: Array<string>;
  topRiskCountries?: Array<string>;
  weights?: Record<string, number>;
}

export async function generatePDFReport(options: ReportOptions): Promise<void> {
  const {
    title,
    includeCharts,
    dateRange,
    portfolioSummary,
    countryRisks,
    holdings,
    trends,
    countryExposures,
    assetContributions,
    topRiskAssets,
    topRiskCountries,
    weights,
  } = options;
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let currentY = 20;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Header
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.text(title, margin, currentY);
  currentY += 15;

  // Date Range
  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Report Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin, currentY);
  if (dateRange) {
    currentY += 7;
    pdf.text(`Period: ${dateRange}`, margin, currentY);
  }
  currentY += 10;
  pdf.setTextColor(0, 0, 0);

  // Portfolio Summary
  if (portfolioSummary) {
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Portfolio Summary', margin, currentY);
    currentY += 10;

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(11);
    
    const summaryData = [
      [`Total Assets: ${portfolioSummary.totalAssets || 0}`],
      [`Portfolio Risk Score: ${portfolioSummary.totalRiskScore?.toFixed(2) || 'N/A'}`],
      [`Number of Countries: ${portfolioSummary.numberOfCountries || 0}`],
      [`Average Risk: ${portfolioSummary.averageRisk?.toFixed(2) || 'N/A'}`],
    ];

    summaryData.forEach((data) => {
      pdf.text(data[0], margin + 5, currentY);
      currentY += 7;
    });
    currentY += 5;
  }

  // Country Risks Table
  if (countryRisks && Object.keys(countryRisks).length > 0) {
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Country Risk Analysis', margin, currentY);
    currentY += 10;

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(10);

    const countries = Object.entries(countryRisks)
      .sort((a, b) => b[1] - a[1]);

    pdf.setDrawColor(200);
    pdf.rect(margin, currentY - 5, contentWidth, 6);
    pdf.setTextColor(255, 255, 255);
    pdf.setFillColor(66, 66, 66);
    pdf.text('Country', margin + 5, currentY - 1);
    pdf.text('Risk Score', margin + contentWidth - 30, currentY - 1);

    currentY += 7;
    pdf.setTextColor(0, 0, 0);
    pdf.setFillColor(255, 255, 255);

    countries.forEach(([country, risk], index) => {
      if (currentY > pageHeight - 30) {
        pdf.addPage();
        currentY = 20;
      }

      if (index % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(margin, currentY - 4, contentWidth, 6, 'F');
      }

      pdf.text(country, margin + 5, currentY);
      pdf.text(risk.toFixed(2), margin + contentWidth - 25, currentY);
      currentY += 7;
    });

    currentY += 5;
  }

  // Charts (if available in DOM)
  if (includeCharts) {
    const chartElements = document.querySelectorAll('[data-export-chart]');
    
    for (let i = 0; i < chartElements.length; i++) {
      if (currentY > pageHeight - 60) {
        pdf.addPage();
        currentY = 20;
      }

      try {
        const canvas = await html2canvas(chartElements[i] as HTMLElement, {
          backgroundColor: '#ffffff',
          scale: 2,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height / canvas.width) * imgWidth;

        if (currentY + imgHeight > pageHeight - 20) {
          pdf.addPage();
          currentY = 20;
        }

        pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 10;
      } catch (error) {
        console.error('Error capturing chart:', error);
      }
    }
  }

  // Data-driven chart fallback: ensure heatmap and trend charts are always rendered in PDF
  if (includeCharts && countryRisks && Object.keys(countryRisks).length > 0) {
    if (currentY > pageHeight - 90) {
      pdf.addPage();
      currentY = 20;
    }

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Country Risk Heatmap Snapshot', margin, currentY);
    currentY += 8;

    const heatCountries = Object.entries(countryRisks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    const cardW = (contentWidth - 6) / 4;
    const cardH = 12;

    const getHeatRgb = (score: number): [number, number, number] => {
      if (score >= 80) return [127, 29, 29];
      if (score >= 60) return [180, 83, 9];
      if (score >= 40) return [161, 98, 7];
      return [22, 101, 52];
    };

    heatCountries.forEach(([country, score], i) => {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const x = margin + col * (cardW + 2);
      const y = currentY + row * (cardH + 2);
      const [r, g, b] = getHeatRgb(score);

      pdf.setFillColor(r, g, b);
      pdf.rect(x, y, cardW, cardH, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      const label = country.length > 15 ? `${country.slice(0, 15)}...` : country;
      pdf.text(label, x + 1.5, y + 4.5);
      pdf.text(score.toFixed(0), x + 1.5, y + 9.5);
    });

    pdf.setTextColor(0, 0, 0);
    currentY += Math.ceil(heatCountries.length / 4) * (cardH + 2) + 6;
  }

  if (includeCharts && trends && trends.length > 1) {
    if (currentY > pageHeight - 95) {
      pdf.addPage();
      currentY = 20;
    }

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Portfolio Risk Trend Snapshot', margin, currentY);
    currentY += 8;

    const chartX = margin;
    const chartY = currentY;
    const chartW = contentWidth;
    const chartH = 55;
    const innerPad = 4;

    pdf.setDrawColor(210, 210, 210);
    pdf.rect(chartX, chartY, chartW, chartH);
    pdf.line(chartX + innerPad, chartY + chartH - innerPad, chartX + chartW - innerPad, chartY + chartH - innerPad);
    pdf.line(chartX + innerPad, chartY + innerPad, chartX + innerPad, chartY + chartH - innerPad);

    const normalized = trends.slice(-90).map((point: any, idx: number) => ({
      x: idx,
      y: Number(point?.value ?? point?.risk ?? point?.score ?? 0),
    }));

    const minX = 0;
    const maxX = Math.max(1, normalized.length - 1);
    const minY = 0;
    const maxY = 100;

    pdf.setDrawColor(220, 38, 38);
    pdf.setLineWidth(0.6);

    for (let i = 1; i < normalized.length; i++) {
      const p1 = normalized[i - 1];
      const p2 = normalized[i];

      const x1 = chartX + innerPad + ((p1.x - minX) / (maxX - minX)) * (chartW - innerPad * 2);
      const x2 = chartX + innerPad + ((p2.x - minX) / (maxX - minX)) * (chartW - innerPad * 2);
      const y1 = chartY + chartH - innerPad - ((p1.y - minY) / (maxY - minY)) * (chartH - innerPad * 2);
      const y2 = chartY + chartH - innerPad - ((p2.y - minY) / (maxY - minY)) * (chartH - innerPad * 2);

      pdf.line(x1, y1, x2, y2);
    }

    currentY += chartH + 8;
  }

  // Holdings Table
  if (holdings && holdings.length > 0) {
    if (currentY > pageHeight - 60) {
      pdf.addPage();
      currentY = 20;
    }

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Portfolio Holdings', margin, currentY);
    currentY += 10;

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(10);

    holdings.forEach((holding) => {
      if (currentY > pageHeight - 20) {
        pdf.addPage();
        currentY = 20;
      }

      const ticker = String(holding.ticker ?? holding.symbol ?? 'N/A');
      const name = String(holding.name ?? holding.assetName ?? '');
      const country = String(holding.country ?? '');
      const line = [ticker, name, country].filter(Boolean).join(' | ');
      pdf.text(line, margin + 2, currentY);
      currentY += 6;
    });
    currentY += 4;
  }

  // Historical Trends
  if (trends && trends.length > 0) {
    if (currentY > pageHeight - 50) {
      pdf.addPage();
      currentY = 20;
    }

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Historical Trends', margin, currentY);
    currentY += 10;

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(10);

    trends.forEach((point) => {
      if (currentY > pageHeight - 20) {
        pdf.addPage();
        currentY = 20;
      }

      const date = String(point.date ?? point.timestamp ?? point.label ?? 'N/A');
      const value = point.value ?? point.risk ?? point.score ?? 'N/A';
      pdf.text(`${date}: ${value}`, margin + 2, currentY);
      currentY += 6;
    });

    currentY += 4;
  }

  // Country Exposures
  if (countryExposures && countryExposures.length > 0) {
    if (currentY > pageHeight - 50) {
      pdf.addPage();
      currentY = 20;
    }

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Country Exposures', margin, currentY);
    currentY += 10;

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(10);

    countryExposures.forEach((exposure) => {
      if (currentY > pageHeight - 20) {
        pdf.addPage();
        currentY = 20;
      }
      const country = String(exposure.country ?? 'N/A');
      const contribution = Number(exposure.riskContribution ?? 0).toFixed(4);
      pdf.text(`${country}: ${contribution}`, margin + 2, currentY);
      currentY += 6;
    });

    currentY += 4;
  }

  // Asset Contributions
  if (assetContributions && assetContributions.length > 0) {
    if (currentY > pageHeight - 50) {
      pdf.addPage();
      currentY = 20;
    }

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Asset Risk Contributions', margin, currentY);
    currentY += 10;

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(10);

    assetContributions.forEach((asset) => {
      if (currentY > pageHeight - 20) {
        pdf.addPage();
        currentY = 20;
      }
      const ticker = String(asset.ticker ?? 'N/A');
      const score = Number(asset.riskScore ?? 0).toFixed(4);
      const mainRisk = String(asset.mainRisk ?? 'N/A');
      pdf.text(`${ticker}: score=${score}, risk=${mainRisk}`, margin + 2, currentY);
      currentY += 6;
    });

    currentY += 4;
  }

  // Top Risk Assets
  if (topRiskAssets && topRiskAssets.length > 0) {
    if (currentY > pageHeight - 50) {
      pdf.addPage();
      currentY = 20;
    }

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Top Risk Assets', margin, currentY);
    currentY += 10;

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(10);
    topRiskAssets.forEach((asset, idx) => {
      if (currentY > pageHeight - 20) {
        pdf.addPage();
        currentY = 20;
      }
      pdf.text(`${idx + 1}. ${asset}`, margin + 2, currentY);
      currentY += 6;
    });

    currentY += 4;
  }

  // Top Risk Countries
  if (topRiskCountries && topRiskCountries.length > 0) {
    if (currentY > pageHeight - 50) {
      pdf.addPage();
      currentY = 20;
    }

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Top Risk Countries', margin, currentY);
    currentY += 10;

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(10);
    topRiskCountries.forEach((country, idx) => {
      if (currentY > pageHeight - 20) {
        pdf.addPage();
        currentY = 20;
      }
      pdf.text(`${idx + 1}. ${country}`, margin + 2, currentY);
      currentY += 6;
    });

    currentY += 4;
  }

  // Risk Weights
  if (weights && Object.keys(weights).length > 0) {
    if (currentY > pageHeight - 50) {
      pdf.addPage();
      currentY = 20;
    }

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Risk Factor Weights', margin, currentY);
    currentY += 10;

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(10);
    Object.entries(weights).forEach(([factor, value]) => {
      if (currentY > pageHeight - 20) {
        pdf.addPage();
        currentY = 20;
      }
      pdf.text(`${factor}: ${value}`, margin + 2, currentY);
      currentY += 6;
    });

    currentY += 4;
  }

  // Footer
  const totalPages = (pdf as any).internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    (pdf as any).setPage(i);
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  pdf.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export async function generateDetailedPDFReport(
  title: string,
  sections: Array<{
    heading: string;
    content: string | Record<string, any>;
  }>
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let currentY = 20;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Header
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.text(title, margin, currentY);
  currentY += 15;

  // Sections
  sections.forEach((section) => {
    if (currentY > pageHeight - 40) {
      pdf.addPage();
      currentY = 20;
    }

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(section.heading, margin, currentY);
    currentY += 10;

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(11);

    if (typeof section.content === 'string') {
      const lines = pdf.splitTextToSize(section.content, contentWidth);
      lines.forEach((line: string) => {
        if (currentY > pageHeight - 20) {
          pdf.addPage();
          currentY = 20;
        }
        pdf.text(line, margin, currentY);
        currentY += 6;
      });
    } else {
      Object.entries(section.content).forEach(([key, value]) => {
        if (currentY > pageHeight - 20) {
          pdf.addPage();
          currentY = 20;
        }
        pdf.text(`${key}: ${value}`, margin + 5, currentY);
        currentY += 6;
      });
    }

    currentY += 8;
  });

  pdf.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}
