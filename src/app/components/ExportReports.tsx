import { useState } from 'react';
import { Download, FileText, Mail, Settings, CheckCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { generatePDFReport } from '../utils/pdfGenerator';
import { exportToExcel, exportToCSV } from '../utils/excelExporter';

interface ExportReportsProps {
  portfolioSummary?: {
    totalRiskScore?: number;
    countryExposures?: Array<{ country: string; riskContribution: number; contributingAssets: string[] }>;
    assetContributions?: Array<{ ticker: string; riskScore: number; mainRisk?: string }>;
    topRiskAssets?: string[];
    topRiskCountries?: string[];
  };
  countryRisks?: Record<string, number>;
  holdings?: Array<unknown>;
  trends?: Array<unknown>;
  weights?: {
    political: number;
    economic: number;
    conflict: number;
    corruption: number;
    terrorism: number;
  };
}

type ReportPageKey = 'portfolioSummary' | 'countryAnalysis' | 'holdings' | 'historicalTrends';

type LossScenario = {
  key: 'conservative' | 'base' | 'aggressive';
  label: string;
  drawdownPct: number;
  potentialLossUsd: number;
  remainingValueUsd: number;
};

export function ExportReports({
  portfolioSummary,
  countryRisks,
  holdings,
  trends,
  weights,
}: ExportReportsProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [selectedLossScenario, setSelectedLossScenario] = useState<'auto' | 'conservative' | 'base' | 'aggressive'>('auto');
  const [reportTitle, setReportTitle] = useState('Geopolitical Risk Report');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedPages, setSelectedPages] = useState<Record<ReportPageKey, boolean>>({
    portfolioSummary: true,
    countryAnalysis: true,
    holdings: true,
    historicalTrends: true,
  });

  const pageDefinitions: Array<{ key: ReportPageKey; title: string; desc: string }> = [
    { key: 'portfolioSummary', title: 'Portfolio Summary', desc: 'Overview metrics and risk score' },
    { key: 'countryAnalysis', title: 'Country Analysis', desc: 'Country-level geopolitical risk' },
    { key: 'holdings', title: 'Portfolio Holdings', desc: 'Asset-level holdings table' },
    { key: 'historicalTrends', title: 'Historical Trends', desc: 'Risk trend and time series data' },
  ];

  const togglePage = (key: ReportPageKey) => {
    setSelectedPages((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const heatmapCountries = Object.entries(countryRisks || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const trendPoints = (trends || []).slice(0, 30).map((point, index) => ({
    index,
    value: Number((point as Record<string, unknown>)?.value ?? (point as Record<string, unknown>)?.risk ?? (point as Record<string, unknown>)?.score ?? 0),
  }));

  const getHeatColor = (score: number) => {
    if (score >= 80) return '#7f1d1d';
    if (score >= 60) return '#b45309';
    if (score >= 40) return '#a16207';
    return '#166534';
  };

  const buildTrendPath = (points: Array<{ index: number; value: number }>) => {
    if (points.length === 0) return '';
    const width = 680;
    const height = 220;
    const pad = 20;
    const xStep = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
    return points
      .map((p, i) => {
        const x = pad + i * xStep;
        const y = pad + (100 - Math.max(0, Math.min(100, p.value))) * ((height - pad * 2) / 100);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  };

  const trendPath = buildTrendPath(trendPoints);

  const computePotentialLossAnalysis = (
    scenarioOverride: 'auto' | 'conservative' | 'base' | 'aggressive'
  ) => {
    const totalRiskScore = Number(portfolioSummary?.totalRiskScore || 0);
    const totalPortfolioValueUsd =
      holdings?.reduce(
        (sum: number, asset: unknown) => sum + Number((asset as { value?: unknown })?.value || 0),
        0
      ) ?? 0;

    const exposures = (portfolioSummary?.countryExposures || []) as Array<{
      country?: string;
      totalExposure?: number;
      riskContribution?: number;
    }>;

    const exposureWeightSum = exposures.reduce((sum, exposure) => {
      const basis = Number(exposure.totalExposure ?? exposure.riskContribution ?? 0);
      return sum + Math.max(basis, 0);
    }, 0);

    const weightedCountryRiskScore = exposureWeightSum > 0
      ? exposures.reduce((sum, exposure) => {
          const basis = Math.max(Number(exposure.totalExposure ?? exposure.riskContribution ?? 0), 0);
          const country = String(exposure.country || '');
          const risk = Number(countryRisks?.[country] ?? 0);
          return sum + basis * risk;
        }, 0) / exposureWeightSum
      : totalRiskScore;

    const topExposureBasis = exposures.length > 0
      ? Math.max(Number(exposures[0].totalExposure ?? exposures[0].riskContribution ?? 0), 0)
      : 0;
    const topCountryExposureShare = exposureWeightSum > 0 ? topExposureBasis / exposureWeightSum : 0;

    const scenarioPolicies = [
      {
        key: 'conservative' as const,
        label: 'Conservative',
        stressFactor: 0.22,
        concentrationWeight: 0.35,
        minLossPct: 0.015,
        maxLossPct: 0.3,
      },
      {
        key: 'base' as const,
        label: 'Base',
        stressFactor: 0.35,
        concentrationWeight: 0.6,
        minLossPct: 0.03,
        maxLossPct: 0.45,
      },
      {
        key: 'aggressive' as const,
        label: 'Aggressive',
        stressFactor: 0.5,
        concentrationWeight: 0.85,
        minLossPct: 0.05,
        maxLossPct: 0.6,
      },
    ];

    const scenarios: LossScenario[] = scenarioPolicies.map((scenario) => {
      const rawLossPct =
        (weightedCountryRiskScore / 100) *
        scenario.stressFactor *
        (1 + topCountryExposureShare * scenario.concentrationWeight);
      const drawdownPct = Math.min(scenario.maxLossPct, Math.max(scenario.minLossPct, rawLossPct));
      const potentialLossUsd = totalPortfolioValueUsd * drawdownPct;
      const remainingValueUsd = Math.max(0, totalPortfolioValueUsd - potentialLossUsd);

      return {
        key: scenario.key,
        label: scenario.label,
        drawdownPct,
        potentialLossUsd,
        remainingValueUsd,
      };
    });

    const autoPrimaryScenario = totalRiskScore >= 70
      ? scenarios.find((scenario) => scenario.key === 'aggressive')
      : totalRiskScore >= 45
      ? scenarios.find((scenario) => scenario.key === 'base')
      : scenarios.find((scenario) => scenario.key === 'conservative');

    const primaryScenario = scenarioOverride === 'auto'
      ? autoPrimaryScenario || scenarios[1]
      : scenarios.find((scenario) => scenario.key === scenarioOverride) || autoPrimaryScenario || scenarios[1];

    return {
      totalPortfolioValueUsd,
      weightedCountryRiskScore,
      topCountryExposureShare,
      selectedScenario: scenarioOverride,
      autoScenario: autoPrimaryScenario?.key || 'base',
      primaryScenario,
      scenarios,
      topExposureCountry: exposures[0]?.country || null,
    };
  };

  const handleGenerateReport = async () => {
    const selectedKeys = (Object.keys(selectedPages) as ReportPageKey[]).filter((key) => selectedPages[key]);
    if (selectedKeys.length === 0) {
      setSuccessMessage('Please select at least one reporting page.');
      return;
    }

    setIsGenerating(true);
    setSuccessMessage('');

    try {
      const potentialLossAnalysis = computePotentialLossAnalysis(selectedLossScenario);
      const exportData = {
        portfolioSummary: selectedPages.portfolioSummary
          ? {
              totalRiskScore: portfolioSummary?.totalRiskScore,
              totalAssets: holdings?.length ?? 0,
              totalCountries: portfolioSummary?.countryExposures?.length ?? 0,
              averageCountryRisk:
                countryRisks && Object.keys(countryRisks).length > 0
                  ? Object.values(countryRisks).reduce((sum, val) => sum + val, 0) / Object.keys(countryRisks).length
                  : undefined,
              totalPortfolioValue:
                holdings?.reduce(
                  (sum: number, asset: unknown) =>
                    sum + Number((asset as { value?: unknown })?.value || 0),
                  0
                ) ?? 0,
            }
          : undefined,
        countryRisks: selectedPages.countryAnalysis ? countryRisks : undefined,
        holdings: selectedPages.holdings
          ? (holdings as Array<Record<string, unknown>>)
          : undefined,
        trends: selectedPages.historicalTrends
          ? (trends as Array<Record<string, unknown>>)
          : undefined,
        countryExposures: selectedPages.countryAnalysis
          ? (portfolioSummary?.countryExposures as Array<Record<string, unknown>> | undefined)
          : undefined,
        assetContributions: selectedPages.portfolioSummary
          ? (portfolioSummary?.assetContributions as Array<Record<string, unknown>> | undefined)
          : undefined,
        topRiskAssets: selectedPages.portfolioSummary ? portfolioSummary?.topRiskAssets : undefined,
        topRiskCountries: selectedPages.countryAnalysis ? portfolioSummary?.topRiskCountries : undefined,
        weights: selectedPages.portfolioSummary ? weights : undefined,
        potentialLossAnalysis: selectedPages.portfolioSummary ? potentialLossAnalysis : undefined,
      };

      switch (selectedFormat) {
        case 'pdf':
          await generatePDFReport({
            title: reportTitle,
            includeCharts,
            portfolioSummary: exportData.portfolioSummary,
            countryRisks: exportData.countryRisks,
            holdings: exportData.holdings,
            trends: exportData.trends,
            countryExposures: exportData.countryExposures,
            assetContributions: exportData.assetContributions,
            topRiskAssets: exportData.topRiskAssets,
            topRiskCountries: exportData.topRiskCountries,
            weights: exportData.weights,
            potentialLossAnalysis: exportData.potentialLossAnalysis,
          });
          setSuccessMessage('PDF report generated successfully!');
          break;

        case 'excel':
          exportToExcel(exportData, reportTitle);
          setSuccessMessage('Excel report generated successfully!');
          break;

        case 'csv':
          exportToCSV(exportData, reportTitle);
          setSuccessMessage('CSV report generated successfully!');
          break;
      }

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error generating report:', error);
      setSuccessMessage('Error generating report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      alert('Please enter an email address');
      return;
    }

    try {
      const response = await fetch('/api/reports/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          subject: `${reportTitle} - ${new Date().toLocaleDateString()}`,
          reportData: {
            portfolioSummary,
            countryRisks,
          },
        }),
      });

      if (response.ok) {
        setSuccessMessage('Report sent successfully!');
        setRecipientEmail('');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error sending report:', error);
      setSuccessMessage('Error sending report. Please try again.');
    }
  };

  return (
    <div className="w-full space-y-4">
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="generate" className="text-sm">
            <Download size={16} className="mr-2" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="email" className="text-sm">
            <Mail size={16} className="mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="schedule" className="text-sm">
            <Settings size={16} className="mr-2" />
            Schedule
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-4">
          {/* Reporting Pages Selection */}
          <Card className="p-6 bg-zinc-950 border border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Select Reporting Pages</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pageDefinitions.map((page) => (
                <label
                  key={page.key}
                  className="flex items-start gap-3 p-3 bg-zinc-900 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPages[page.key]}
                    onChange={() => togglePage(page.key)}
                    className="mt-1 w-4 h-4 rounded bg-zinc-900 border border-zinc-700"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{page.title}</p>
                    <p className="text-xs text-zinc-400">{page.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-zinc-950 border border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Generate Report</h3>

            <div className="space-y-4">
              {/* Report Title */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Report Title
                </label>
                <Input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Enter report title"
                  className="bg-zinc-900 border border-zinc-700 text-zinc-100"
                />
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Report Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['pdf', 'excel', 'csv'].map((format) => (
                    <button
                      key={format}
                      onClick={() => setSelectedFormat(format as 'pdf' | 'excel' | 'csv')}
                      className={`p-3 rounded-lg border transition ${
                        selectedFormat === format
                          ? 'bg-zinc-700 border-zinc-600 text-zinc-100'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      <FileText size={18} className="mx-auto mb-1" />
                      <span className="text-xs uppercase">{format}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Include Charts Option */}
              {selectedFormat === 'pdf' && (
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCharts}
                      onChange={(e) => setIncludeCharts(e.target.checked)}
                      className="w-4 h-4 rounded bg-zinc-900 border border-zinc-700"
                    />
                    <span className="text-sm text-zinc-300">Include charts in PDF</span>
                  </label>
                </div>
              )}

              {/* Loss Scenario Driver */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Loss Scenario Driver
                </label>
                <div className="inline-flex flex-wrap rounded border border-zinc-800 overflow-hidden">
                  {[
                    { key: 'auto', label: 'Auto' },
                    { key: 'conservative', label: 'Conservative' },
                    { key: 'base', label: 'Base' },
                    { key: 'aggressive', label: 'Aggressive' },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setSelectedLossScenario(option.key as 'auto' | 'conservative' | 'base' | 'aggressive')}
                      className={`px-3 py-1.5 text-xs border-r last:border-r-0 border-zinc-800 transition-colors ${
                        selectedLossScenario === option.key
                          ? 'bg-zinc-700 text-zinc-100'
                          : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  This sets which scenario drives the Potential Losses narrative in generated reports.
                </p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium disabled:bg-blue-600/70 disabled:text-blue-100"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download size={16} className="mr-2" />
                    Generate Report
                  </>
                )}
              </Button>

              {/* Success Message */}
              {successMessage && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${successMessage.startsWith('Error') || successMessage.startsWith('Please') ? 'bg-red-900 border border-red-700 text-red-100' : 'bg-green-900 border border-green-700 text-green-100'}`}>
                  <CheckCircle size={16} />
                  {successMessage}
                </div>
              )}
            </div>
          </Card>

          {/* Hidden export-only snapshots for PDF capture */}
          {selectedFormat === 'pdf' && includeCharts && (
            <div className="fixed left-0 top-0 w-[760px] bg-white p-6 opacity-0 pointer-events-none -z-10">
              {selectedPages.countryAnalysis && heatmapCountries.length > 0 && (
                <div data-export-chart className="bg-white border border-zinc-200 rounded-lg p-4 mb-4">
                  <h4 className="text-base font-semibold text-zinc-900 mb-3">Country Risk Heatmap Snapshot</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {heatmapCountries.map(([country, score]) => (
                      <div
                        key={country}
                        className="rounded px-2 py-1.5 text-white text-xs font-medium"
                        style={{ backgroundColor: getHeatColor(score) }}
                      >
                        <div className="truncate">{country}</div>
                        <div>{score.toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPages.historicalTrends && trendPoints.length > 1 && (
                <div data-export-chart className="bg-white border border-zinc-200 rounded-lg p-4">
                  <h4 className="text-base font-semibold text-zinc-900 mb-3">Portfolio Risk Trend Snapshot</h4>
                  <svg width="100%" height="240" viewBox="0 0 720 240" role="img" aria-label="Portfolio risk trend">
                    <rect x="0" y="0" width="720" height="240" fill="#ffffff" />
                    <line x1="20" y1="220" x2="700" y2="220" stroke="#d4d4d8" strokeWidth="1" />
                    <line x1="20" y1="20" x2="20" y2="220" stroke="#d4d4d8" strokeWidth="1" />
                    <path d={trendPath} fill="none" stroke="#dc2626" strokeWidth="3" />
                  </svg>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4">
          <Card className="p-6 bg-zinc-950 border border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Email Report</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Recipient Email
                </label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="bg-zinc-900 border border-zinc-700 text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Report Format
                </label>
                <select className="w-full p-2 bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg">
                  <option>PDF - Professional & Polished</option>
                  <option>Excel - For Modeling</option>
                  <option>CSV - Data Only</option>
                </select>
              </div>

              <Button
                onClick={handleSendEmail}
                className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-100 py-2 rounded-lg font-medium"
              >
                <Mail size={16} className="mr-2" />
                Send Report
              </Button>

              <p className="text-xs text-zinc-400 text-center">
                Report will be generated and sent to the specified email address
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card className="p-6 bg-zinc-950 border border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Schedule Reports</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Recipient Email
                </label>
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  className="bg-zinc-900 border border-zinc-700 text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Frequency
                </label>
                <select className="w-full p-2 bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg">
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Report Type
                </label>
                <select className="w-full p-2 bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg">
                  <option>Portfolio Summary</option>
                  <option>Country Analysis</option>
                  <option>Comprehensive</option>
                </select>
              </div>

              <Button className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-100 py-2 rounded-lg font-medium">
                <Settings size={16} className="mr-2" />
                Schedule Report
              </Button>
            </div>
          </Card>

          {/* Active Schedules */}
          <Card className="p-6 bg-zinc-950 border border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">Active Schedules</h3>
            <div className="space-y-2">
              <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg">
                <p className="text-sm text-zinc-300">Weekly Portfolio Summary</p>
                <p className="text-xs text-zinc-500">Every Monday at 09:00 AM</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
