
import React, { useEffect, useState } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

interface AnalyticsData {
  summary: {
    detection_records: number;
    total_objects: number;
    total_alerts: number;
    high_risk_alerts: number;
    new_alerts: number;
    total_incidents: number;
    open_incidents: number;
    resolved_incidents: number;
    average_confidence: number;
    image_detections: number;
    video_detections: number;
  };
  risk_breakdown: Record<string, number>;
  top_hazards: { object: string; count: number }[];
  trends: { date: string; objects: number; records: number }[];
}

const EMPTY_DATA: AnalyticsData = {
  summary: {
    detection_records: 0,
    total_objects: 0,
    total_alerts: 0,
    high_risk_alerts: 0,
    new_alerts: 0,
    total_incidents: 0,
    open_incidents: 0,
    resolved_incidents: 0,
    average_confidence: 0,
    image_detections: 0,
    video_detections: 0,
  },
  risk_breakdown: {},
  top_hazards: [],
  trends: [],
};

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<AnalyticsData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchAnalytics = async () => {
      const token = localStorage.getItem('railway_access_token');

      if (!token) {
        if (active) {
          setError('Please log in to view analytics.');
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`${API_URL}/analytics`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.detail || result.error || 'Unable to load analytics.'
          );
        }

        if (active) {
          setData({
            summary: { ...EMPTY_DATA.summary, ...result.summary },
            risk_breakdown: result.risk_breakdown || {},
            top_hazards: result.top_hazards || [],
            trends: result.trends || [],
          });
          setError('');
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load analytics.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const { summary, risk_breakdown, top_hazards, trends } = data;

  const totalRisk = Object.values(risk_breakdown).reduce(
    (sum, count) => sum + count,
    0
  );

  const maxHazardCount = Math.max(
    1,
    ...top_hazards.map((item) => item.count)
  );

  const maxTrendObjects = Math.max(
    1,
    ...trends.map((item) => item.objects)
  );

  return (
    <div className="p-space-lg max-w-[1720px] mx-auto w-full space-y-space-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-sm border-b border-outline-variant/20">
        <div>
          <h1 className="font-display-lg text-on-surface text-2xl font-bold">
            Analytics & Performance Telemetry
          </h1>
          <p className="font-body-sm text-on-surface-variant mt-0.5">
            Analytics calculated from actual detection, alert, and incident records.
          </p>
        </div>
        <span className="font-data-mono-sm text-primary font-bold bg-surface-container-low px-3 py-2 rounded border border-outline-variant/30">
          {loading ? 'Loading...' : 'Live database metrics'}
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-error/30 bg-error-container text-on-error-container text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {[
          {
            label: 'Detection Records',
            value: summary.detection_records,
            detail: `${summary.image_detections} images Â· ${summary.video_detections} videos`,
          },
          {
            label: 'Objects Detected',
            value: summary.total_objects,
            detail: `${summary.average_confidence}% average AI confidence`,
          },
          {
            label: 'High-Risk Alerts',
            value: summary.high_risk_alerts,
            detail: `${summary.new_alerts} new alerts`,
          },
          {
            label: 'Open Incidents',
            value: summary.open_incidents,
            detail: `${summary.resolved_incidents} resolved Â· ${summary.total_incidents} total`,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-surface-container-low p-space-md rounded-xl border border-outline-variant/30 space-y-1"
          >
            <span className="font-badge-label uppercase text-outline">
              {item.label}
            </span>
            <div className="text-2xl font-display-lg font-bold text-on-surface">
              {item.value.toLocaleString()}
            </div>
            <div className="text-xs text-on-surface-variant">
              {item.detail}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <div className="bg-surface-container-low p-space-lg rounded-xl border border-outline-variant/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-on-surface text-sm font-semibold">
              Most Detected Objects
            </h3>
            <span className="font-badge-label text-outline uppercase">
              {top_hazards.reduce((sum, item) => sum + item.count, 0)} detections in listed classes
            </span>
          </div>

          {top_hazards.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              No detection records available yet.
            </p>
          ) : (
            top_hazards.map((item) => (
              <div key={item.object} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface">{item.object}</span>
                  <span className="text-on-surface-variant font-bold">
                    {item.count}
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${(item.count / maxHazardCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-surface-container-low p-space-lg rounded-xl border border-outline-variant/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-on-surface text-sm font-semibold">
              Alert Risk Distribution
            </h3>
            <span className="font-badge-label text-outline uppercase">
              {totalRisk} alerts
            </span>
          </div>

          {['HIGH', 'MEDIUM', 'LOW'].map((risk) => {
            const count = risk_breakdown[risk] || 0;
            const percentage = totalRisk
              ? (count / totalRisk) * 100
              : 0;

            return (
              <div key={risk} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface">{risk}</span>
                  <span className="text-on-surface-variant font-bold">
                    {count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}

          <div className="pt-2 text-xs text-on-surface-variant">
            Total alerts: {summary.total_alerts}
          </div>
        </div>
      </div>

      <div className="bg-surface-container-low p-space-lg rounded-xl border border-outline-variant/30 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-on-surface text-sm font-semibold">
            Detection Activity â€” Last 7 Days
          </h3>
          <span className="font-badge-label text-outline uppercase">
            Objects per day
          </span>
        </div>

        {trends.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            No recent detection activity.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {trends.map((item) => (
              <div
                key={item.date}
                className="bg-surface-container rounded-lg p-3 border border-outline-variant/20"
              >
                <div className="text-xs text-on-surface-variant">
                  {item.date.slice(5)}
                </div>
                <div className="text-xl font-bold text-on-surface mt-1">
                  {item.objects}
                </div>
                <div className="text-[11px] text-outline">
                  {item.records} records
                </div>
                <div className="h-2 bg-surface-container-high rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${(item.objects / maxTrendObjects) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

