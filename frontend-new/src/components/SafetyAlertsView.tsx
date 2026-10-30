import React, { useMemo, useState } from 'react';
import { SafetyAlert } from '../types';
import { NavModule } from './Sidebar';

interface SafetyAlertsViewProps {
  alerts: SafetyAlert[];
  onResolveAlert: (id: string) => void;
  onNavigate: (module: NavModule, incidentId?: string) => void;
  onTriggerCabAlert: () => void;
  onCreateIncident: (alertId: string) => void;
}

export const SafetyAlertsView: React.FC<SafetyAlertsViewProps> = ({
  alerts,
  onResolveAlert,
  onNavigate,
  onTriggerCabAlert,
  onCreateIncident,
}) => {
  const [filterSeverity, setFilterSeverity] =
    useState<string>('ALL');

  const [soundMuted, setSoundMuted] =
    useState(false);

  // =========================================
  // COUNTS
  // =========================================

  const activeCount = useMemo(
    () =>
      alerts.filter(
        alert => !alert.resolved
      ).length,
    [alerts]
  );

  const criticalCount = useMemo(
    () =>
      alerts.filter(
        alert =>
          !alert.resolved &&
          alert.type === 'CRITICAL'
      ).length,
    [alerts]
  );

  const highRiskCount = useMemo(
    () =>
      alerts.filter(
        alert =>
          !alert.resolved &&
          alert.type === 'HIGH RISK'
      ).length,
    [alerts]
  );

  // =========================================
  // FILTER
  // =========================================

  const filtered = alerts.filter(alert => {
    if (filterSeverity === 'ALL') {
      return true;
    }

    return alert.type === filterSeverity;
  });

  // =========================================
  // RENDER
  // =========================================

  return (
    <div className="w-full max-w-[1700px] mx-auto px-5 lg:px-7 py-6 space-y-5">

      {/* =====================================
          PAGE HEADER
      ====================================== */}

      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">

        <div>
          <div className="flex items-center gap-3 mb-2">

            <h1 className="font-display-lg text-on-surface text-2xl lg:text-3xl font-bold tracking-tight">
              Safety Alerts
            </h1>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container/40 border border-error/30 text-error font-data-mono-sm text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
              {activeCount} ACTIVE
            </span>

          </div>

          <p className="font-body-sm text-on-surface-variant max-w-2xl">
            Monitor railway hazards requiring operator
            attention and immediate safety action.
          </p>
        </div>

        <div className="flex items-center gap-3">

          {/* Audio */}

          <button
            onClick={() =>
              setSoundMuted(!soundMuted)
            }
            className={`
              h-10 px-3.5 rounded-lg border
              flex items-center gap-2
              text-xs font-data-mono-sm
              transition-all cursor-pointer
              ${
                soundMuted
                  ? 'bg-surface-container-low border-outline-variant/40 text-outline'
                  : 'bg-error-container/20 border-error/40 text-error hover:bg-error-container/30'
              }
            `}
          >
            <span className="material-symbols-outlined text-[17px]">
              {soundMuted
                ? 'volume_off'
                : 'volume_up'}
            </span>

            <span className="hidden sm:inline">
              {soundMuted
                ? 'Muted'
                : 'Alert Sound'}
            </span>
          </button>

          {/* Refresh */}

          <button
            onClick={() => window.location.reload()}
            className="h-10 w-10 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container-high text-on-surface-variant hover:text-primary flex items-center justify-center transition-all cursor-pointer"
            title="Refresh alerts"
          >
            <span className="material-symbols-outlined text-[19px]">
              refresh
            </span>
          </button>

        </div>
      </div>

      {/* =====================================
          SUMMARY STRIP
      ====================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {/* Active */}

        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 flex items-center justify-between">

          <div>
            <div className="font-badge-label text-outline uppercase tracking-wider">
              Active Alerts
            </div>

            <div className="font-display-md text-on-surface text-xl font-bold mt-1">
              {activeCount}
            </div>
          </div>

          <div className="w-9 h-9 rounded-lg bg-error-container/30 text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[19px]">
              warning
            </span>
          </div>

        </div>

        {/* Critical */}

        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 flex items-center justify-between">

          <div>
            <div className="font-badge-label text-outline uppercase tracking-wider">
              Critical
            </div>

            <div className="font-display-md text-error text-xl font-bold mt-1">
              {criticalCount}
            </div>
          </div>

          <div className="w-9 h-9 rounded-lg bg-error-container/25 text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[19px]">
              emergency
            </span>
          </div>

        </div>

        {/* High */}

        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 flex items-center justify-between">

          <div>
            <div className="font-badge-label text-outline uppercase tracking-wider">
              High Risk
            </div>

            <div className="font-display-md text-secondary text-xl font-bold mt-1">
              {highRiskCount}
            </div>
          </div>

          <div className="w-9 h-9 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
            <span className="material-symbols-outlined text-[19px]">
              priority_high
            </span>
          </div>

        </div>

      </div>

      {/* =====================================
          FILTER BAR
      ====================================== */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">

        <div className="flex items-center gap-2">

          <span className="font-badge-label text-outline uppercase tracking-wider mr-1">
            Filter
          </span>

          <div className="flex items-center bg-surface-container-low border border-outline-variant/25 rounded-lg p-1">

            {[
              'ALL',
              'CRITICAL',
              'HIGH RISK',
              'CAUTION',
              'INFO',
            ].map(severity => {

              const active =
                filterSeverity === severity;

              return (
                <button
                  key={severity}
                  onClick={() =>
                    setFilterSeverity(severity)
                  }
                  className={`
                    px-3 py-1.5 rounded-md
                    text-[11px]
                    font-data-mono-sm
                    transition-all
                    cursor-pointer
                    ${
                      active
                        ? 'bg-surface-container-highest text-primary shadow-sm'
                        : 'text-outline hover:text-on-surface'
                    }
                  `}
                >
                  {severity}
                </button>
              );
            })}

          </div>

        </div>

        <div className="font-data-mono-sm text-outline text-[11px]">
          Showing {filtered.length} alert
          {filtered.length !== 1 ? 's' : ''}
        </div>

      </div>

      {/* =====================================
          EMPTY
      ====================================== */}

      {filtered.length === 0 && (
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl py-20 flex flex-col items-center justify-center text-center">

          <div className="w-14 h-14 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined text-[30px]">
              verified
            </span>
          </div>

          <h3 className="mt-4 text-base font-semibold text-on-surface">
            No Safety Alerts
          </h3>

          <p className="mt-1 text-sm text-on-surface-variant">
            No alerts match the selected severity.
          </p>

        </div>
      )}

      {/* =====================================
          ALERT GRID
      ====================================== */}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {filtered.map(alert => {

            const isCritical =
              alert.type === 'CRITICAL';

            const isHigh =
              alert.type === 'HIGH RISK';

            return (
              <div
                key={alert.id}
                className={`
                  group
                  relative
                  bg-surface-container-low
                  rounded-xl
                  border
                  overflow-hidden
                  transition-all
                  duration-200
                  hover:-translate-y-[1px]
                  hover:shadow-lg
                  ${
                    alert.resolved
                      ? 'border-outline-variant/20 opacity-65'
                      : isCritical
                        ? 'border-error/45 hover:border-error/70'
                        : isHigh
                          ? 'border-secondary/35 hover:border-secondary/55'
                          : 'border-outline-variant/25 hover:border-outline-variant/50'
                  }
                `}
              >

                {/* Critical indicator */}

                {isCritical &&
                  !alert.resolved && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-error" />
                  )}

                <div className="p-4">

                  {/* Top row */}

                  <div className="flex items-center justify-between gap-3">

                    <div className="flex items-center gap-2 min-w-0">

                      <span
                        className={`
                          px-2 py-1
                          rounded-md
                          text-[10px]
                          font-data-mono-sm
                          font-bold
                          tracking-wide
                          whitespace-nowrap
                          ${
                            isCritical
                              ? 'bg-error-container text-error'
                              : isHigh
                                ? 'bg-secondary/10 text-secondary'
                                : 'bg-surface-container-highest text-primary'
                          }
                        `}
                      >
                        {alert.type}
                      </span>

                      <span className="font-data-mono-sm text-outline text-[10px] truncate">
                        {alert.id}
                      </span>

                    </div>

                    <span className="font-data-mono-sm text-outline text-[10px] whitespace-nowrap">
                      {alert.detectedTimeAgo}
                    </span>

                  </div>

                  {/* Main content */}

                  <div className="mt-4 flex gap-3">

                    <div
                      className={`
                        w-10 h-10
                        rounded-lg
                        shrink-0
                        flex items-center justify-center
                        ${
                          isCritical
                            ? 'bg-error-container/25 text-error'
                            : isHigh
                              ? 'bg-secondary/10 text-secondary'
                              : 'bg-primary/10 text-primary'
                        }
                      `}
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        {alert.icon}
                      </span>
                    </div>

                    <div className="min-w-0">

                      <h3 className="text-[15px] font-semibold text-on-surface capitalize">
                        {alert.title}
                      </h3>

                      <div className="mt-1 font-data-mono-sm text-[10px] text-outline truncate">
                        {alert.milepost}
                      </div>

                      <p className="mt-2 text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                        {alert.description}
                      </p>

                    </div>

                  </div>

                  {/* Status */}

                  <div className="mt-4 flex items-center justify-between gap-3 py-2.5 border-y border-outline-variant/15">

                    {alert.resolved ? (
                      <div className="flex items-center gap-1.5 text-tertiary text-xs font-semibold">

                        <span className="material-symbols-outlined text-[16px]">
                          check_circle
                        </span>

                        Resolved

                      </div>
                    ) : alert.slaExpiring ? (
                      <div className="flex items-center gap-1.5 text-error text-xs font-semibold">

                        <span className="material-symbols-outlined text-[16px]">
                          timer
                        </span>

                        SLA: {alert.slaExpiring}

                      </div>
                    ) : (
                      <div className="text-xs text-on-surface-variant">
                        {alert.actionStatus}
                      </div>
                    )}

                    {!alert.resolved &&
                      isCritical && (
                        <span className="flex items-center gap-1 text-[10px] text-error font-data-mono-sm">

                          <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />

                          IMMEDIATE ACTION

                        </span>
                      )}

                  </div>

                  {/* Actions */}

                  <div className="mt-3 flex items-center justify-end gap-2">

                    
<button
  disabled={alert.resolved}
  onClick={() => onCreateIncident(alert.id)}
  className="h-8 px-3 rounded-md bg-primary text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
>
  Create Incident
</button>


                    {isCritical &&
                      !alert.resolved && (
                        <button
                          onClick={
                            onTriggerCabAlert
                          }
                          className="h-8 px-3 rounded-md bg-error hover:bg-error/90 text-surface-container-lowest text-[10px] font-data-mono-sm font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            campaign
                          </span>

                          Cab Halt
                        </button>
                      )}

                    <button
                      disabled={alert.resolved}
                      onClick={() =>
                        onResolveAlert(
                          alert.id
                        )
                      }
                      className={`
                        h-8 px-3 rounded-md
                        text-xs font-semibold
                        transition-colors
                        ${
                          alert.resolved
                            ? 'text-outline cursor-default'
                            : 'bg-surface-container-high hover:bg-surface-bright text-on-surface cursor-pointer'
                        }
                      `}
                    >
                      {alert.resolved
                        ? 'Cleared'
                        : 'Mark Resolved'}
                    </button>

                  </div>

                </div>
              </div>
            );
          })}

        </div>
      )}

    </div>
  );
};