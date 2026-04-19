import React, { useState } from 'react';
import { Download, FileText, Mail, Settings, CheckCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { generatePDFReport } from '../utils/pdfGenerator';
import { exportToExcel, exportToCSV, exportTableToExcel } from '../utils/excelExporter';

interface ExportReportsProps {
  portfolioSummary?: any;
  countryRisks?: Record<string, number>;
  holdings?: Array<any>;
  trends?: Array<any>;
}

export function ExportReports({
  portfolioSummary,
  countryRisks,
  holdings,
  trends,
}: ExportReportsProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [reportTitle, setReportTitle] = useState('Geopolitical Risk Report');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setSuccessMessage('');

    try {
      const exportData = {
        portfolioSummary,
        countryRisks,
        holdings,
        trends,
      };

      switch (selectedFormat) {
        case 'pdf':
          await generatePDFReport({
            title: reportTitle,
            includeCharts,
            portfolioSummary,
            countryRisks,
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
                      onClick={() => setSelectedFormat(format as any)}
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

              {/* Generate Button */}
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-100 py-2 rounded-lg font-medium"
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
                <div className="p-3 bg-green-900 border border-green-700 text-green-100 rounded-lg flex items-center gap-2">
                  <CheckCircle size={16} />
                  {successMessage}
                </div>
              )}
            </div>
          </Card>

          {/* Report Templates */}
          <Card className="p-6 bg-zinc-950 border border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Quick Templates</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { title: 'Portfolio Summary', desc: 'Holdings & risk' },
                { title: 'Country Analysis', desc: 'Risk by country' },
                { title: 'Historical Trends', desc: 'Risk evolution' },
                { title: 'Full Report', desc: 'All data & charts' },
              ].map((template) => (
                <button
                  key={template.title}
                  onClick={() => {
                    setReportTitle(template.title);
                    setSelectedFormat('pdf');
                    handleGenerateReport();
                  }}
                  className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition text-left"
                >
                  <p className="text-sm font-medium text-zinc-100">{template.title}</p>
                  <p className="text-xs text-zinc-400">{template.desc}</p>
                </button>
              ))}
            </div>
          </Card>
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
