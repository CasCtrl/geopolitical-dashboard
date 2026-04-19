import React, { useMemo, useState } from 'react';
import { AlertTriangle, Bell, Plus, Trash2, Eye, CheckCircle2 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
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

export function AlertsAndNotifications() {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>(getAllThresholds());
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>(getAllAlertEvents());
  const [showCreateThreshold, setShowCreateThreshold] = useState(false);
  const [newThresholdData, setNewThresholdData] = useState({
    name: '',
    target: '',
    threshold: 60,
    type: 'country' as const,
  });

  const unreadCount = useMemo(() => getUnreadAlertEvents().length, [alertEvents]);

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
              <p className="text-xs font-semibold text-zinc-300">Active Alerts</p>
              <p className="text-lg font-bold text-orange-400">
                {unreadCount} {unreadCount === 1 ? 'notification' : 'notifications'}
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
                      type: e.target.value as any,
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
