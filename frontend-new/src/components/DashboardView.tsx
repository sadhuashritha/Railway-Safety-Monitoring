import React from 'react';
import { SafetyAlert, Incident, DetectionEvent, CameraFeed } from '../types';
import { NavModule } from './Sidebar';

interface DashboardViewProps {
  currentRole: string;
  userName: string;
  onRoleChange: (role: string) => void;
  alerts: SafetyAlert[];
  incidents: Incident[];
  events: DetectionEvent[];
  cameras: CameraFeed[];
  onNavigate: (module: NavModule, incidentId?: string) => void;
  onTriggerCabAlert: () => void;
  onDispatchTeam: () => void;
  onResolveAlert: (id: string) => void;
  onLogBrief: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentRole,
  userName,
  alerts,
  incidents,
  events,
  cameras,
  onNavigate,
  onTriggerCabAlert,
  onDispatchTeam,
  onResolveAlert,
  onLogBrief,
}) => {
  const unresolvedAlerts = alerts.filter((alert) => !alert.resolved);
  const activeIncidents = incidents.filter((incident) =>
    !['Resolved & Cleared', 'Archived', 'Cleared / Resolved'].includes(incident.status)
  );
  // Camera entries are frontend configuration, not verified live camera telemetry.
  const cameraCount = cameras.length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const todayEvents = events.filter((event) => {
    const time = new Date(event.timestamp).getTime();
    return Number.isFinite(time) && time >= todayStart.getTime() && time < tomorrowStart.getTime();
  });
  const averageConfidence = todayEvents.length
    ? (todayEvents.reduce((sum, event) => sum + event.confidence, 0) / todayEvents.length).toFixed(1)
    : null;

  const criticalAlerts = unresolvedAlerts.filter(
    (alert) => alert.type === 'CRITICAL'
  );

  const highRiskAlerts = unresolvedAlerts.filter(
    (alert) => alert.type === 'HIGH RISK'
  );

  const cautionAlerts = unresolvedAlerts.filter(
    (alert) => alert.type === 'CAUTION'
  );

  const maxAlertCategoryCount = Math.max(
    criticalAlerts.length,
    highRiskAlerts.length,
    cautionAlerts.length,
    1
  );
  const alertBarWidth = (count: number) => `${(count / maxAlertCategoryCount) * 100}%`;

  const roleLabel =
    currentRole === 'safety_officer'
      ? 'Safety Officer'
      : currentRole === 'administrator' || currentRole === 'admin'
      ? 'Administrator'
      : currentRole === 'operator'
      ? 'Operator'
      : 'Maintenance';

  const getAlertStyle = (type: string) => {
    if (type === 'CRITICAL') {
      return {
        border: 'border-error/50',
        badge: 'bg-error-container text-on-error-container',
        icon: 'error',
        iconColor: 'text-error',
      };
    }

    if (type === 'HIGH RISK') {
      return {
        border: 'border-secondary/50',
        badge: 'bg-surface-container-highest text-secondary',
        icon: 'warning',
        iconColor: 'text-secondary',
      };
    }

    return {
      border: 'border-primary/50',
      badge: 'bg-surface-container-highest text-primary',
      icon: 'info',
      iconColor: 'text-primary',
    };
  };

  return (
    <div className="w-full max-w-[1500px] mx-auto p-space-lg space-y-space-lg">

      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}

      <section className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-space-lg shadow-sm">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-lg">

          <div className="flex items-center gap-space-md">

            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[30px] text-primary">
                dashboard
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">

                <h1 className="font-headline-lg text-on-surface">
                  Welcome, {userName || 'User'}
                </h1>

                <span className="font-badge-label uppercase px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {roleLabel} View
                </span>

              </div>

              <p className="font-body-md text-on-surface-variant mt-1">
                Operational overview based on the data currently available to the application.
              </p>
            </div>

          </div>

          <div className="flex items-center gap-2">

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/20">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span>

              <span className="font-data-mono-sm text-tertiary">
                SYSTEM HEALTH NOT MONITORED
              </span>
            </div>

            <div className="px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/20">
              <span className="font-data-mono-sm text-on-surface-variant">
                Corridor not configured
              </span>
            </div>

          </div>

        </div>

      </section>


      {/* ========================================================= */}
      {/* KPI CARDS */}
      {/* ========================================================= */}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">

        {/* Alerts */}

        <button
          onClick={() => onNavigate('safety-alerts')}
          className="text-left bg-surface-container-low hover:bg-surface-container rounded-xl border border-outline-variant/20 p-space-lg transition-all hover:-translate-y-0.5 hover:border-error/30"
        >
          <div className="flex items-center justify-between">

            <span className="font-body-sm uppercase tracking-wider text-on-surface-variant">
              Active Alerts
            </span>

            <span className="material-symbols-outlined text-error">
              warning
            </span>

          </div>

          <div className="flex items-end gap-2 mt-space-md">

            <span className="font-display-lg text-on-surface leading-none">
              {unresolvedAlerts.length}
            </span>

            <span className="font-body-sm text-on-surface-variant mb-1">
              unresolved
            </span>

          </div>

          <div className="flex gap-2 mt-space-md flex-wrap">

            <span className="px-2 py-1 rounded bg-error-container text-on-error-container font-badge-label">
              {criticalAlerts.length} Critical
            </span>

            <span className="px-2 py-1 rounded bg-surface-container-highest text-secondary font-badge-label">
              {highRiskAlerts.length} High Risk
            </span>

          </div>
        </button>


        {/* Incidents */}

        <button
          onClick={() => onNavigate('incident-management')}
          className="text-left bg-surface-container-low hover:bg-surface-container rounded-xl border border-outline-variant/20 p-space-lg transition-all hover:-translate-y-0.5 hover:border-primary/30"
        >
          <div className="flex items-center justify-between">

            <span className="font-body-sm uppercase tracking-wider text-on-surface-variant">
              Active Incidents
            </span>

            <span className="material-symbols-outlined text-primary">
              emergency
            </span>

          </div>

          <div className="flex items-end gap-2 mt-space-md">

            <span className="font-display-lg text-on-surface leading-none">
              {activeIncidents.length}
            </span>

            <span className="font-body-sm text-primary mb-1 font-medium">
              in progress
            </span>

          </div>

          <div className="flex items-center gap-1.5 mt-space-md">

            <span className="material-symbols-outlined text-[16px] text-tertiary">
              schedule
            </span>

            <span className="font-body-sm text-on-surface-variant">
              Avg. resolution
            </span>

            <span className="font-data-mono-sm text-on-surface">
              Not available
            </span>

          </div>
        </button>


        {/* Cameras */}

        <button
          onClick={() => onNavigate('cctv-and-ai-detection')}
          className="text-left bg-surface-container-low hover:bg-surface-container rounded-xl border border-outline-variant/20 p-space-lg transition-all hover:-translate-y-0.5 hover:border-tertiary/30"
        >
          <div className="flex items-center justify-between">

            <span className="font-body-sm uppercase tracking-wider text-on-surface-variant">
              Camera Network
            </span>

            <span className="material-symbols-outlined text-tertiary">
              videocam
            </span>

          </div>

          <div className="flex items-end gap-2 mt-space-md">

            <span className="font-display-lg text-on-surface leading-none">
              {cameraCount}
            </span>

            <span className="font-data-mono-sm text-on-surface-variant mb-1">
              configured feeds
            </span>

          </div>

          <div className="flex items-center gap-2 mt-space-md">

            <div className="flex-1 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-outline-variant rounded-full" style={{ width: '0%' }}></div>
            </div>

            <span className="font-data-mono-sm text-tertiary">
              N/A
            </span>

          </div>
        </button>


        {/* Detections */}

        <button
          onClick={() => onNavigate('detection-history')}
          className="text-left bg-surface-container-low hover:bg-surface-container rounded-xl border border-outline-variant/20 p-space-lg transition-all hover:-translate-y-0.5 hover:border-secondary/30"
        >
          <div className="flex items-center justify-between">

            <span className="font-body-sm uppercase tracking-wider text-on-surface-variant">
              Detections Today
            </span>

            <span className="material-symbols-outlined text-secondary">
              analytics
            </span>

          </div>

          <div className="flex items-end gap-2 mt-space-md">

            <span className="font-display-lg text-on-surface leading-none">
              {todayEvents.length.toLocaleString()}
            </span>

            <span className="font-body-sm text-tertiary mb-1">
              recorded today
            </span>

          </div>

          <div className="flex items-center justify-between mt-space-md">

            <span className="font-body-sm text-on-surface-variant">
              Detection confidence
            </span>

            <span className="font-data-mono-sm text-on-surface font-semibold">
              {averageConfidence === null ? 'N/A' : `${averageConfidence}%`}
            </span>

          </div>
        </button>

      </section>


      {/* ========================================================= */}
      {/* MAIN CONTENT */}
      {/* ========================================================= */}

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-gutter">

        {/* ======================================================= */}
        {/* RECENT SAFETY ALERTS */}
        {/* ======================================================= */}

        <div className="xl:col-span-8 bg-surface-container-low rounded-2xl border border-outline-variant/20 p-space-lg">

          <div className="flex items-center justify-between mb-space-lg">

            <div>

              <div className="flex items-center gap-2">

                <span className="material-symbols-outlined text-primary">
                  notifications_active
                </span>

                <h2 className="font-headline-md text-on-surface">
                  Recent Safety Alerts
                </h2>

              </div>

              <p className="font-body-sm text-on-surface-variant mt-1">
                Latest events requiring operational attention.
              </p>

            </div>

            <button
              onClick={() => onNavigate('safety-alerts')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-body-sm font-medium transition-colors"
            >
              View All

              <span className="material-symbols-outlined text-[17px]">
                arrow_forward
              </span>
            </button>

          </div>


          <div className="space-y-3">

            {unresolvedAlerts.length === 0 ? (

              <div className="py-10 flex flex-col items-center justify-center text-center">

                <span className="material-symbols-outlined text-[42px] text-tertiary">
                  check_circle
                </span>

                <p className="font-headline-sm text-on-surface mt-3">
                  No active safety alerts
                </p>

                <p className="font-body-sm text-on-surface-variant mt-1">
                  All monitored events are currently resolved.
                </p>

              </div>

            ) : (

              unresolvedAlerts.slice(0, 4).map((alert) => {

                const style = getAlertStyle(alert.type);

                return (
                  <div
                    key={alert.id}
                    className={`bg-surface-container rounded-xl border ${style.border} p-space-md`}
                  >

                    <div className="flex items-center justify-between gap-3">

                      <div className="flex items-center gap-3 min-w-0">

                        <div className={`w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 ${style.iconColor}`}>
                          <span className="material-symbols-outlined">
                            {style.icon}
                          </span>
                        </div>

                        <div className="min-w-0">

                          <div className="flex items-center gap-2 flex-wrap">

                            <span className={`px-2 py-0.5 rounded font-badge-label uppercase ${style.badge}`}>
                              {alert.type}
                            </span>

                            <span className="font-data-mono-sm text-outline">
                              {alert.id}
                            </span>

                          </div>

                          <p className="font-body-md font-medium text-on-surface mt-1">
                            {alert.type === 'CRITICAL'
                              ? 'Critical safety event requires immediate attention'
                              : alert.type === 'HIGH RISK'
                              ? 'High-risk event requires operational review'
                              : 'Safety event detected near monitored corridor'}
                          </p>

                        </div>

                      </div>

                      <button
                        onClick={() =>
                          onNavigate('safety-alerts')
                        }
                        className="hidden md:flex items-center gap-1 px-3 py-2 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface font-body-sm transition-colors shrink-0"
                      >
                        Review

                        <span className="material-symbols-outlined text-[16px]">
                          arrow_forward
                        </span>
                      </button>

                    </div>

                  </div>
                );
              })

            )}

          </div>


          <button
            onClick={() => onNavigate('safety-alerts')}
            className="sm:hidden w-full mt-4 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-body-sm font-semibold"
          >
            View All Safety Alerts
          </button>

        </div>


        {/* ======================================================= */}
        {/* SYSTEM STATUS */}
        {/* ======================================================= */}

        <div className="xl:col-span-4 bg-surface-container-low rounded-2xl border border-outline-variant/20 p-space-lg">

          <div className="flex items-center gap-2 mb-space-lg">

            <span className="material-symbols-outlined text-tertiary">
              monitoring
            </span>

            <div>

              <h2 className="font-headline-md text-on-surface">
                System Status
              </h2>

              <p className="font-body-sm text-on-surface-variant">
                Current platform health
              </p>

            </div>

          </div>


          <div className="space-y-3">

            {/* System */}

            <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container">

              <div className="flex items-center gap-3">

                <span className="w-9 h-9 rounded-lg bg-tertiary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary text-[20px]">
                    dns
                  </span>
                </span>

                <div>

                  <p className="font-body-md text-on-surface">
                    System
                  </p>

                  <p className="font-body-sm text-on-surface-variant">
                    Core services
                  </p>

                </div>

              </div>

              <span className="flex items-center gap-1.5 font-badge-label text-tertiary">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                Status not monitored
              </span>

            </div>


            {/* Detection */}

            <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container">

              <div className="flex items-center gap-3">

                <span className="w-9 h-9 rounded-lg bg-tertiary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary text-[20px]">
                    visibility
                  </span>
                </span>

                <div>

                  <p className="font-body-md text-on-surface">
                    Detection Engine
                  </p>

                  <p className="font-body-sm text-on-surface-variant">
                    Railway vision model
                  </p>

                </div>

              </div>

              <span className="flex items-center gap-1.5 font-badge-label text-tertiary">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
Status not monitored
              </span>

            </div>


            {/* Cameras */}

            <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container">

              <div className="flex items-center gap-3">

                <span className="w-9 h-9 rounded-lg bg-tertiary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary text-[20px]">
                    videocam
                  </span>
                </span>

                <div>

                  <p className="font-body-md text-on-surface">
                    CCTV Network
                  </p>

                  <p className="font-body-sm text-on-surface-variant">
                    {cameraCount} configured feeds; live status unavailable
                  </p>

                </div>

              </div>

              <span className="font-data-mono-sm text-tertiary">
                N/A
              </span>

            </div>


            {/* Database */}

            <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container">

              <div className="flex items-center gap-3">

                <span className="w-9 h-9 rounded-lg bg-tertiary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary text-[20px]">
                    database
                  </span>
                </span>

                <div>

                  <p className="font-body-md text-on-surface">
                    Data Store
                  </p>

                  <p className="font-body-sm text-on-surface-variant">
                    Event records
                  </p>

                </div>

              </div>

              <span className="flex items-center gap-1.5 font-badge-label text-tertiary">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
Status not monitored
              </span>

            </div>

          </div>

        </div>

      </section>


      {/* ========================================================= */}
      {/* OPERATIONAL SUMMARY */}
      {/* ========================================================= */}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">

        {/* Alert Breakdown */}

        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-space-lg">

          <div className="flex items-center gap-2 mb-space-lg">

            <span className="material-symbols-outlined text-error">
              priority_high
            </span>

            <h2 className="font-headline-sm text-on-surface">
              Alert Breakdown
            </h2>

          </div>

          <div className="space-y-4">

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="font-body-sm text-on-surface-variant">
                  Critical
                </span>

                <span className="font-data-mono-sm text-error">
                  {criticalAlerts.length}
                </span>
              </div>

              <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                <div
                  className="h-full bg-error rounded-full"
                  style={{
                    width: alertBarWidth(criticalAlerts.length),
                  }}
                />
              </div>
            </div>


            <div>
              <div className="flex justify-between mb-1.5">
                <span className="font-body-sm text-on-surface-variant">
                  High Risk
                </span>

                <span className="font-data-mono-sm text-secondary">
                  {highRiskAlerts.length}
                </span>
              </div>

              <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                <div
                  className="h-full bg-secondary rounded-full"
                  style={{
                    width: alertBarWidth(highRiskAlerts.length),
                  }}
                />
              </div>
            </div>


            <div>
              <div className="flex justify-between mb-1.5">
                <span className="font-body-sm text-on-surface-variant">
                  Caution
                </span>

                <span className="font-data-mono-sm text-primary">
                  {cautionAlerts.length}
                </span>
              </div>

              <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{
                    width: alertBarWidth(cautionAlerts.length),
                  }}
                />
              </div>
            </div>

          </div>

        </div>


        {/* Quick Actions */}

        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-space-lg">

          <div className="flex items-center gap-2 mb-space-lg">

            <span className="material-symbols-outlined text-primary">
              bolt
            </span>

            <h2 className="font-headline-sm text-on-surface">
              Quick Actions
            </h2>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">

            <button
              onClick={() => onNavigate('cctv-and-ai-detection')}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-left transition-colors"
            >
              <span className="material-symbols-outlined text-primary">
                videocam
              </span>

              <div>
                <p className="font-body-md text-on-surface font-medium">
                  Open CCTV
                </p>

                <p className="font-body-sm text-on-surface-variant">
                  Monitor live feeds
                </p>
              </div>
            </button>


            <button
              onClick={() => onNavigate('safety-alerts')}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-left transition-colors"
            >
              <span className="material-symbols-outlined text-error">
                warning
              </span>

              <div>
                <p className="font-body-md text-on-surface font-medium">
                  Review Alerts
                </p>

                <p className="font-body-sm text-on-surface-variant">
                  {unresolvedAlerts.length} need attention
                </p>
              </div>
            </button>


            <button
              onClick={onLogBrief}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-left transition-colors"
            >
              <span className="material-symbols-outlined text-secondary">
                edit_note
              </span>

              <div>
                <p className="font-body-md text-on-surface font-medium">
                  Log Safety Brief
                </p>

                <p className="font-body-sm text-on-surface-variant">
                  Record operational notes
                </p>
              </div>
            </button>

          </div>

        </div>


        {/* Emergency Actions */}

        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-space-lg">

          <div className="flex items-center gap-2 mb-space-lg">

            <span className="material-symbols-outlined text-error">
              emergency
            </span>

            <h2 className="font-headline-sm text-on-surface">
              Emergency Actions
            </h2>

          </div>

          <p className="font-body-sm text-on-surface-variant mb-4">
            Use only when immediate operational intervention is required.
          </p>

          <div className="space-y-2">

            <button
              onClick={onTriggerCabAlert}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-error text-on-error font-body-md font-bold hover:bg-error/90 transition-colors"
            >
              <span className="material-symbols-outlined">
                train
              </span>

              Trigger Cab Alert
            </button>


            <button
              onClick={onDispatchTeam}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-on-primary font-body-md font-semibold hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined">
                groups
              </span>

              Dispatch Field Team
            </button>

          </div>

        </div>

      </section>


      {/* ========================================================= */}
      {/* MOBILE / SMALL FOOTER STATUS */}
      {/* ========================================================= */}

      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-2">

        <div className="flex items-center gap-2">

          <span className="w-2 h-2 rounded-full bg-tertiary"></span>

          <span className="font-data-mono-sm text-on-surface-variant">
Dashboard data reflects the latest successful fetch
          </span>

        </div>

        <span className="font-data-mono-sm text-outline">
          RailWatch Control Platform
        </span>

      </div>

    </div>
  );
};