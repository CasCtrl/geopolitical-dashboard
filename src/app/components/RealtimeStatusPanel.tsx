import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Zap, Clock, Activity } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  getUpdateStats,
  getRecentUpdates,
  simulateGeopoliticalEvents,
  getTimeUntilNextUpdate,
  type RealTimeUpdate,
} from '../data/realtimeUpdateManager';

interface RealtimeStatusPanelProps {
  onUpdateDetected?: (update: RealTimeUpdate) => void;
}

export function RealtimeStatusPanel({ onUpdateDetected }: RealtimeStatusPanelProps) {
  const [stats, setStats] = useState(() => getUpdateStats());
  const [recentUpdates, setRecentUpdates] = useState(() => getRecentUpdates(5));
  const [timeUntilNext, setTimeUntilNext] = useState(() => getTimeUntilNextUpdate());

  const refreshStats = useCallback(() => {
    setStats(getUpdateStats());
    setRecentUpdates(getRecentUpdates(5));
    setTimeUntilNext(getTimeUntilNextUpdate());
  }, []);

  // Update time until next update every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeUntilNext(getTimeUntilNextUpdate());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleSimulateEvent = () => {
    simulateGeopoliticalEvents((update) => {
      if (onUpdateDetected) onUpdateDetected(update);
      refreshStats();
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* Status Overview */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <h3 className="text-sm font-semibold mb-4 text-zinc-100 flex items-center gap-2">
          <Zap size={16} className="text-amber-400 animate-pulse" />
          Real-Time Update Status
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Total Updates</div>
            <div className="text-2xl font-bold text-zinc-100">{stats.totalUpdates}</div>
          </div>

          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Scheduled</div>
            <div className="text-2xl font-bold text-blue-400">{stats.scheduledUpdates}</div>
            <div className="text-[10px] text-zinc-500">Hourly</div>
          </div>

          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Event-Driven</div>
            <div className="text-2xl font-bold text-orange-400">{stats.eventDrivenUpdates}</div>
            <div className="text-[10px] text-zinc-500">Breaking news</div>
          </div>

          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Next Update</div>
            <div className="text-sm font-bold text-green-400">{timeUntilNext}</div>
            <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1">
              <Clock size={10} /> Auto-refresh
            </div>
          </div>
        </div>

        {stats.lastUpdateTime && (
          <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-400">
            Last update: {new Date(stats.lastUpdateTime).toLocaleTimeString()}
          </div>
        )}
      </Card>

      {/* Recent Updates Feed */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <h3 className="text-sm font-semibold mb-3 text-zinc-100 flex items-center gap-2">
          <Activity size={16} className="text-green-400" />
          Recent Updates
        </h3>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recentUpdates.length === 0 ? (
            <div className="text-xs text-zinc-500 py-4 text-center">
              No updates yet. Updates will appear here as they occur.
            </div>
          ) : (
            recentUpdates.map((update, idx) => (
              <div
                key={idx}
                className={`p-3 rounded border text-xs ${
                  update.updateType === 'event-driven'
                    ? 'bg-orange-900/10 border-orange-700'
                    : 'bg-blue-900/10 border-blue-700'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="font-semibold text-zinc-200">
                    {update.updateType === 'event-driven' ? (
                      <span className="text-orange-400">⚡ {update.eventDescription}</span>
                    ) : (
                      <span className="text-blue-400">🔄 Hourly Update</span>
                    )}
                  </div>
                  <div className="text-zinc-500">
                    {new Date(update.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                {update.affectedCountries && update.affectedCountries.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {update.affectedCountries.slice(0, 3).map((country) => (
                      <span key={country} className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300">
                        {country}
                      </span>
                    ))}
                    {update.affectedCountries.length > 3 && (
                      <span className="px-2 py-0.5 text-zinc-500">
                        +{update.affectedCountries.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {update.riskAdjustment !== undefined && (
                  <div className="mt-2">
                    <span className="text-zinc-400">Risk adjustment: </span>
                    <span className={update.riskAdjustment > 0 ? 'text-orange-500' : 'text-green-500'}>
                      {update.riskAdjustment > 0 ? '+' : ''}{update.riskAdjustment}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Controls */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <h3 className="text-sm font-semibold mb-3 text-zinc-100">Update Controls</h3>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={refreshStats}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            <RefreshCw size={14} className="mr-2" />
            Refresh Stats
          </Button>

          <Button
            onClick={handleSimulateEvent}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-sm"
          >
            <Zap size={14} className="mr-2" />
            Simulate Event
          </Button>
        </div>

        <div className="mt-3 p-3 bg-blue-900/20 border border-blue-800 rounded text-xs text-blue-200">
          <p>
            <strong>Note:</strong> Real-time updates will be sourced from news APIs and geopolitical
            event feeds in production. Currently showing simulated events for demonstration.
          </p>
        </div>
      </Card>
    </div>
  );
}
