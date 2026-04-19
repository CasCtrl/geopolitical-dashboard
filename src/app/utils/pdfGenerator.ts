import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportOptions {
  title: string;
  includeCharts: boolean;
  dateRange?: string;
  portfolioSummary?: any;
  countryRisks?: Record<string, number>;
}

export async function generatePDFReport(options: ReportOptions): Promise<void> {
  const { title, includeCharts, dateRange, portfolioSummary, countryRisks } = options;
  
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
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

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
