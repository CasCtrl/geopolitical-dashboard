import { useMemo, useState } from 'react';
import { AlertTriangle, Bell, Plus, Trash2, Eye, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { RiskLegend } from './RiskLegend';
import { buildAlertSummary, RiskWeights } from '../utils/riskAlertSummary';
import {
  getAllThresholds,
  getUnreadAlertEvents,
  getAllAlertEvents,
  createThreshold,
  deleteThreshold,
  toggleThreshold,
  markAlertEventAsRead,
  markAllAlertEventsAsRead,
  type AlertThreshold,
  type AlertEvent,
} from '../data/alertsManager';

interface AlertsAndNotificationsProps {
  activeAlertCount?: number;
  activeRiskAlerts?: Array<{
    country: string;
    exposureType: string;
    riskContribution: number;
    riskScore: number;
    contributingAssets: string[];
  }>;
  weights?: RiskWeights;
}

const DEFAULT_WEIGHTS: RiskWeights = {
  political: 20,
  economic: 20,
  conflict: 20,
  corruption: 20,
  terrorism: 20,
};

type AlertUrgency = 'critical' | 'high' | 'medium' | 'low';
const MIN_ALERT_RISK_SCORE = 25;
const HIGH_RISK_SCORE_THRESHOLD = 51;
const CRITICAL_RISK_SCORE_THRESHOLD = 75;

function getAlertUrgency(riskScore: number): AlertUrgency {
  if (riskScore >= CRITICAL_RISK_SCORE_THRESHOLD) return 'critical';
  if (riskScore >= HIGH_RISK_SCORE_THRESHOLD) return 'high';
  if (riskScore >= 26) return 'medium';
  return 'low';
}

function getUrgencyBadgeClass(urgency: AlertUrgency): string {
  if (urgency === 'critical') return 'bg-red-900/40 border-red-800 text-red-200';
  if (urgency === 'high') return 'bg-orange-900/40 border-orange-800 text-orange-200';
  if (urgency === 'medium') return 'bg-yellow-900/40 border-yellow-800 text-yellow-200';
  return 'bg-emerald-900/40 border-emerald-800 text-emerald-200';
}

export function AlertsAndNotifications({ activeAlertCount, activeRiskAlerts = [], weights = DEFAULT_WEIGHTS }: AlertsAndNotificationsProps) {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>(getAllThresholds());
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>(getAllAlertEvents());
  const [showCreateThreshold, setShowCreateThreshold] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});
  const toggleAlertExpanded = (key: string) => {
    setExpandedAlerts((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const [newThresholdData, setNewThresholdData] = useState<{
    name: string;
    target: string;
    threshold: number;
    type: 'country' | 'portfolio' | 'sector';
  }>({
    name: '',
    target: '',
    threshold: 60,
    type: 'country' as const,
  });

  const unreadCount = useMemo(() => getUnreadAlertEvents().length, [alertEvents]);
  const displayedActiveCount = activeAlertCount ?? activeRiskAlerts.length;
  const detailedRiskAlerts = useMemo(() => {
    return activeRiskAlerts
      .filter((alert) => alert.riskScore > MIN_ALERT_RISK_SCORE)
      .map((alert) => ({
        ...alert,
        urgency: getAlertUrgency(alert.riskScore),
      }))
      .sort((a, b) => b.riskContribution - a.riskContribution);
  }, [activeRiskAlerts]);

  const urgencyCounts = useMemo(() => {
    const counts: Record<AlertUrgency, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    detailedRiskAlerts.forEach((alert) => {
      counts[alert.urgency] += 1;
    });

    return counts;
  }, [detailedRiskAlerts]);

  const handleCreateThreshold = () => {
    if (newThresholdData.name && newThresholdData.target) {
      const threshold = createThreshold(
        newThresholdData.name,
        newThresholdData.type,
        newThresholdData.target,
        newThresholdData.threshold
      );
      setThresholds([...thresholds, threshold]);
      setNewThresholdData({
        name: '',
        target: '',
        threshold: 60,
        type: 'country',
      });
      setShowCreateThreshold(false);
    }
  };

  const handleToggleThreshold = (id: string) => {
    const updated = toggleThreshold(id);
    if (updated) {
      setThresholds(thresholds.map((t) => (t.id === id ? updated : t)));
    }
  };

  const handleDeleteThreshold = (id: string) => {
    if (deleteThreshold(id)) {
      setThresholds(thresholds.filter((t) => t.id !== id));
    }
  };

  const handleMarkAsRead = (eventId: string) => {
    const updated = markAlertEventAsRead(eventId);
    if (updated) {
      setAlertEvents(alertEvents.map((e) => (e.id === eventId ? updated : e)));
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAlertEventsAsRead();
    setAlertEvents(alertEvents.map((e) => ({ ...e, read: true })));
  };

  return (
    <div className="w-full space-y-4">
      {/* Alerts Summary */}
      <Card className="p-4 bg-zinc-950 border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="text-orange-500" size={20} />
            <div>
              <p className="text-xs font-semibold text-zinc-300">Risk Alerts</p>
              <p className="text-lg font-bold text-orange-400">
                {displayedActiveCount} {displayedActiveCount === 1 ? 'alert' : 'alerts'}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Mark All Read
            </Button>
          )}
        </div>
        <p className="text-[10px] text-zinc-500 mt-2">
          Logic: includes portfolio-exposed countries with country risk score &gt; {MIN_ALERT_RISK_SCORE}. High risk is {HIGH_RISK_SCORE_THRESHOLD}-74. Critical starts at {CRITICAL_RISK_SCORE_THRESHOLD}+.
        </p>
        <div className="mt-2">
          <RiskLegend compact={true} showTitle={true} />
        </div>
      </Card>

      {/* Portfolio Risk Alerts Feed (News-style detailed cards) */}
      <Card className="p-4 bg-zinc-950 border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-100">Portfolio Risk Alerts Feed</h3>
          <span className="text-xs text-zinc-400">{detailedRiskAlerts.length} shown</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 bg-zinc-900 rounded border border-zinc-800 mb-3">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded px-2 py-1 text-center">
            <p className="text-[10px] text-zinc-500">Risk Alerts</p>
            <p className="text-sm font-bold text-orange-400">{displayedActiveCount}</p>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded px-2 py-1 text-center">
            <p className="text-[10px] text-zinc-500">Critical</p>
            <p className="text-sm font-bold text-red-400">{urgencyCounts.critical}</p>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded px-2 py-1 text-center">
            <p className="text-[10px] text-zinc-500">High</p>
            <p className="text-sm font-bold text-orange-400">{urgencyCounts.high}</p>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded px-2 py-1 text-center">
            <p className="text-[10px] text-zinc-500">Medium</p>
            <p className="text-sm font-bold text-yellow-400">{urgencyCounts.medium}</p>
          </div>
          <div className="md:col-span-4 grid grid-cols-1 gap-2 mt-1">
            <Button
              size="sm"
              className="text-xs h-7"
              onClick={() => setAlertEvents(getAllAlertEvents())}
            >
              Refresh
            </Button>
          </div>
        </div>

        {detailedRiskAlerts.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-3">No active alerts found.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {detailedRiskAlerts.map((alert, index) => {
              const alertKey = `${alert.country}-${alert.exposureType}-${index}`;
              const isExpanded = !!expandedAlerts[alertKey];
              const summaryId = `risk-alert-summary-${alertKey}`;
              return (
                <div
                  key={alertKey}
                  className="p-3 rounded-lg border bg-zinc-900/80 border-zinc-700"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-100 truncate">{alert.country}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-zinc-100">Country Risk {alert.riskScore.toFixed(0)}</p>
                      <p className="text-[10px] text-zinc-400">Contribution {alert.riskContribution.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] border border-zinc-700 bg-zinc-800 text-zinc-200">
                      RISK ALERT
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getUrgencyBadgeClass(alert.urgency)}`}>
                      RISK LEVEL: {alert.urgency.toUpperCase()}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] border border-zinc-700 bg-zinc-800 text-zinc-300">
                      {alert.contributingAssets.length} stock{alert.contributingAssets.length === 1 ? '' : 's'} impacted
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] text-zinc-500 mb-1">Affected Stocks</p>
                    <div className="flex flex-wrap gap-1">
                      {alert.contributingAssets.length > 0 ? (
                        alert.contributingAssets.map((asset) => (
                          <span
                            key={`${alertKey}-${asset}`}
                            className="px-1.5 py-0.5 rounded text-[10px] border border-zinc-700 bg-zinc-800/80 text-zinc-200"
                          >
                            {asset}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-500">No stock details available</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 border-t border-zinc-800 pt-2">
                    <button
                      type="button"
                      onClick={() => toggleAlertExpanded(alertKey)}
                      aria-expanded={isExpanded}
                      aria-controls={summaryId}
                      className="flex w-full items-center justify-between gap-2 text-left text-[11px] text-zinc-300 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-600/60 rounded"
                    >
                      <span className="flex items-center gap-1.5">
                        {isExpanded ? (
                          <ChevronDown size={12} className="text-zinc-400" />
                        ) : (
                          <ChevronRight size={12} className="text-zinc-400" />
                        )}
                        Why is this flagged?
                      </span>
                      <span className="text-[10px] text-zinc-500">{isExpanded ? 'Hide' : 'Show'}</span>
                    </button>
                    {isExpanded && (
                      <p
                        id={summaryId}
                        className="mt-2 text-[12px] leading-relaxed text-zinc-200"
                      >
                        {buildAlertSummary(alert, weights)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Recent Alert Events */}
      {alertEvents.length > 0 && (
        <Card className="p-4 bg-zinc-950 border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
            <span className="text-xs text-zinc-400">{alertEvents.length} events</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {alertEvents.slice().reverse().slice(0, 10).map((event) => (
              <div
                key={event.id}
                className={`p-3 rounded-lg border transition-all ${
                  event.read
                    ? 'bg-zinc-900 border-zinc-700'
                    : 'bg-red-950 border-red-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {event.type === 'breach' ? (
                        <AlertTriangle size={14} className="text-red-500" />
                      ) : (
                        <CheckCircle2 size={14} className="text-green-500" />
                      )}
                      <p className="text-xs font-semibold">{event.message}</p>
                    </div>
                    <p className="text-xs text-zinc-500 ml-6">
                      {new Date(event.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {!event.read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMarkAsRead(event.id)}
                      className="text-xs"
                    >
                      <Eye size={12} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Alert Thresholds */}
      <Card className="p-4 bg-zinc-950 border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Risk Thresholds</h3>
          <Button
            size="sm"
            onClick={() => setShowCreateThreshold(!showCreateThreshold)}
            className="text-xs"
          >
            <Plus size={14} className="mr-1" /> Add Alert
          </Button>
        </div>

        {/* Create New Threshold */}
        {showCreateThreshold && (
          <div className="mb-4 p-3 bg-zinc-900 rounded-lg space-y-2">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Alert Name</label>
              <Input
                placeholder="e.g., High China Risk"
                value={newThresholdData.name}
                onChange={(e) =>
                  setNewThresholdData({ ...newThresholdData, name: e.target.value })
                }
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-zinc-300">Type</label>
                <select
                  value={newThresholdData.type}
                  onChange={(e) =>
                    setNewThresholdData({
                      ...newThresholdData,
                      type: e.target.value as 'country' | 'portfolio' | 'sector',
                    })
                  }
                  className="w-full px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-white"
                >
                  <option value="country">Country</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="sector">Sector</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-300">Target</label>
                <Input
                  placeholder="e.g., China"
                  value={newThresholdData.target}
                  onChange={(e) =>
                    setNewThresholdData({ ...newThresholdData, target: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">
                Risk Threshold: {newThresholdData.threshold}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={newThresholdData.threshold}
                onChange={(e) =>
                  setNewThresholdData({
                    ...newThresholdData,
                    threshold: Number(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreateThreshold}
                className="text-xs flex-1"
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateThreshold(false)}
                className="text-xs flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Existing Thresholds */}
        {thresholds.length > 0 ? (
          <div className="space-y-2">
            {thresholds.map((threshold) => (
              <div
                key={threshold.id}
                className="p-3 bg-zinc-900 rounded-lg border border-zinc-700 flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="text-xs font-semibold text-white">{threshold.name}</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {threshold.target} • Threshold: {threshold.threshold}
                    {threshold.triggered && (
                      <span className="ml-2 px-2 py-0.5 bg-red-950 text-red-400 rounded text-xs font-semibold">
                        TRIGGERED
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={threshold.enabled ? 'default' : 'outline'}
                    onClick={() => handleToggleThreshold(threshold.id)}
                    className="text-xs"
                  >
                    {threshold.enabled ? 'ON' : 'OFF'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteThreshold(threshold.id)}
                    className="text-xs text-red-500 hover:bg-red-900/20"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 text-center py-4">
            No thresholds set. Create one to start monitoring.
          </p>
        )}
      </Card>

      {/* Alert Tips */}
      <Card className="p-3 bg-blue-900/20 border-blue-900/30">
        <p className="text-xs text-blue-300">
          💡 <strong>Tip:</strong> Set portfolio-level alerts to monitor overall risk, and
          country-level alerts for specific exposures.
        </p>
      </Card>
    </div>
  );
}
