
import React, { useMemo, useState } from 'react';
import { Incident } from '../types';

interface IncidentManagementViewProps {
  incidents: Incident[];
  selectedIncidentId: string;
  onSelectIncident: (id: string) => void;
  onUpdateStatus: (
    id: string,
    newStatus: any,
    notes?: string
  ) => void;
  onTriggerCabAlert: () => void;
  onInspectCamera: (cameraId: string) => void;
}

type FilterTab = 'all' | 'active' | 'resolved';

export const IncidentManagementView: React.FC<
  IncidentManagementViewProps
> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  onUpdateStatus,
  onTriggerCabAlert,
  onInspectCamera,
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState<
    Record<string, string>
  >({});
  const [showEvidence, setShowEvidence] = useState(false);

  const selectedIncident =
    incidents.find((item) => item.id === selectedIncidentId) ??
    incidents[0];

  const isResolved = (incident: Incident) =>
    [
      'Resolved & Cleared',
      'Cleared / Resolved',
      'Archived',
    ].includes(incident.status) || !!incident.verifiedSafe;

  const activeIncidents = useMemo(
    () => incidents.filter((item) => !isResolved(item)),
    [incidents]
  );

  const resolvedIncidents = useMemo(
    () => incidents.filter(isResolved),
    [incidents]
  );

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return incidents.filter((incident) => {
      const matchesTab =
        filterTab === 'all' ||
        (filterTab === 'active' && !isResolved(incident)) ||
        (filterTab === 'resolved' && isResolved(incident));

      const matchesSearch =
        !query ||
        [
          incident.id,
          incident.title,
          incident.hazardDescription,
          incident.location,
          incident.milepost,
        ].some((value) => value?.toLowerCase().includes(query));

      return matchesTab && matchesSearch;
    });
  }, [incidents, filterTab, search]);

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'P1':
        return 'border-red-400/30 bg-red-400/10 text-red-300';
      case 'P2':
        return 'border-orange-400/30 bg-orange-400/10 text-orange-300';
      case 'P3':
        return 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300';
      default:
        return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
    }
  };

  const getStatusClass = (incident: Incident) => {
    if (isResolved(incident)) {
      return 'bg-emerald-400/10 text-emerald-300';
    }

    if (
      incident.status === 'On-Site Mitigating' ||
      incident.status === 'Crew On-Site Active'
    ) {
      return 'bg-orange-400/10 text-orange-300';
    }

    return 'bg-cyan-400/10 text-cyan-300';
  };

  const updateStatus = (
    status: 'En Route' | 'On-Site Mitigating'
  ) => {
    if (!selectedIncident) return;

    onUpdateStatus(
      selectedIncident.id,
      status,
      resolutionNotes[selectedIncident.id]?.trim() || undefined
    );
  };

  const handleResolve = () => {
    if (!selectedIncident) return;

    const notes = resolutionNotes[selectedIncident.id]?.trim();

    if (!notes) {
      window.alert('Please enter resolution notes before resolving this incident.');
      return;
    }

    onUpdateStatus(
      selectedIncident.id,
      'Cleared / Resolved',
      notes
    );
  };

  if (!incidents.length) {
    return (
      <div className="mx-auto w-full max-w-7xl p-6 md:p-8">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 px-6 py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
            <span className="material-symbols-outlined text-3xl">
              verified
            </span>
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-100">
            No incidents recorded
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Incidents created from safety alerts will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 md:px-7 md:py-8">

      {/* Header */}
      <header className="flex flex-col gap-5 border-b border-slate-700/60 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            Operations / Incident Control
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-100 md:text-4xl">
            Incident Management
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Review hazards, track response progress, and record resolution.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            ['all', 'All incidents', incidents.length],
            ['active', 'Active', activeIncidents.length],
            ['resolved', 'Resolved', resolvedIncidents.length],
          ] as const).map(([tab, label, count]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                filterTab === tab
                  ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300'
                  : 'border-slate-700 bg-slate-900/70 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              {label}
              <span className="ml-2 rounded-md bg-slate-800 px-1.5 py-0.5">
                {count}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Total incidents"
          value={incidents.length}
          icon="assignment"
          accent="text-cyan-300"
        />
        <SummaryCard
          label="Active incidents"
          value={activeIncidents.length}
          icon="warning"
          accent="text-orange-300"
        />
        <SummaryCard
          label="Resolved incidents"
          value={resolvedIncidents.length}
          icon="task_alt"
          accent="text-emerald-300"
        />
      </section>

      {/* Main workspace */}
      <section className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.65fr)]">

        {/* Incident list */}
        <aside className="min-w-0 overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70">
          <div className="border-b border-slate-700/60 p-4 md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-100">
                Incident queue
              </h2>
              <span className="text-xs text-slate-500">
                {filteredIncidents.length} records
              </span>
            </div>

            <div className="relative mt-4">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-500">
                search
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search incidents or hazards..."
                aria-label="Search incidents"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400/60"
              />
            </div>
          </div>

          <div className="max-h-[650px] space-y-2 overflow-y-auto p-3">
            {filteredIncidents.map((incident) => {
              const selected = incident.id === selectedIncident?.id;
              const resolved = isResolved(incident);

              return (
                <button
                  key={incident.id}
                  type="button"
                  onClick={() => onSelectIncident(incident.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selected
                      ? 'border-cyan-400/60 bg-cyan-400/[0.07] shadow-[inset_3px_0_0_#22d3ee]'
                      : 'border-slate-700/50 bg-slate-950/20 hover:border-slate-600 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${getPriorityClass(incident.priority)}`}>
                      {incident.priorityLabel}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getStatusClass(incident)}`}>
                      {resolved ? 'Resolved' : incident.status}
                    </span>
                  </div>

                  <div className="mt-3 break-words text-sm font-semibold text-slate-100">
                    {incident.title}
                  </div>
                  <div className="mt-1 break-all font-mono text-[10px] text-slate-500">
                    {incident.id}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                    {incident.hazardDescription}
                  </p>

                  <div className="mt-3 flex items-center gap-2 border-t border-slate-700/50 pt-3 text-[11px] text-slate-500">
                    <span className="material-symbols-outlined text-sm">
                      location_on
                    </span>
                    <span className="truncate">
                      {incident.location || incident.milepost || 'Location not provided'}
                    </span>
                  </div>
                </button>
              );
            })}

            {filteredIncidents.length === 0 && (
              <div className="px-4 py-12 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-600">
                  search_off
                </span>
                <p className="mt-3 text-sm text-slate-400">
                  No matching incidents found.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setFilterTab('all');
                  }}
                  className="mt-3 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Selected incident */}
        <div className="min-w-0 space-y-5">
          {!selectedIncident ? (
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-12 text-center text-sm text-slate-400">
              Select an incident to inspect its details.
            </div>
          ) : (
            <>
              {/* Incident heading */}
              <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70">
                <div className="p-5 md:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md border px-2.5 py-1.5 text-[10px] font-bold ${getPriorityClass(selectedIncident.priority)}`}>
                      {selectedIncident.priorityLabel}
                    </span>
                    <span className="break-all font-mono text-xs text-slate-400">
                      {selectedIncident.id}
                    </span>
                    <span className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${getStatusClass(selectedIncident)}`}>
                      {isResolved(selectedIncident)
                        ? 'Resolved'
                        : selectedIncident.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="break-words text-2xl font-bold capitalize tracking-tight text-slate-100 md:text-3xl">
                        {selectedIncident.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {selectedIncident.hazardDescription}
                      </p>
                    </div>

                    {selectedIncident.priority === 'P1' &&
                      !isResolved(selectedIncident) && (
                        <button
                          type="button"
                          onClick={onTriggerCabAlert}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs font-bold text-red-300 transition hover:bg-red-400/20"
                        >
                          <span className="material-symbols-outlined text-base">
                            campaign
                          </span>
                          Trigger cab alert
                        </button>
                      )}
                  </div>
                </div>

                {/* Key information */}
                <div className="grid grid-cols-1 gap-px border-t border-slate-700/60 bg-slate-700/50 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoCell
                    label="Location"
                    value={selectedIncident.location || 'Not provided'}
                    icon="location_on"
                  />
                  <InfoCell
                    label="Milepost"
                    value={selectedIncident.milepost || 'Not provided'}
                    icon="route"
                  />
                  <InfoCell
                    label="Camera / source"
                    value={selectedIncident.cameraSensor || 'Not provided'}
                    icon="videocam"
                  />
                  <InfoCell
                    label="Detected at"
                    value={selectedIncident.detectionTimestamp || 'Not provided'}
                    icon="schedule"
                  />
                </div>
              </div>

              {/* Evidence */}
              <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-5">
                  <div>
                    <h3 className="font-semibold text-slate-100">
                      Detection evidence
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Review the available snapshot associated with this incident.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEvidence(!showEvidence)}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                    >
                      {showEvidence ? 'Hide snapshot' : 'Show snapshot'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onInspectCamera(
                          selectedIncident.cameraSensor?.split(' ')[0] || ''
                        )
                      }
                      disabled={!selectedIncident.cameraSensor}
                      className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-base">
                        videocam
                      </span>
                      Inspect source
                    </button>
                  </div>
                </div>

                {showEvidence && (
                  <div className="border-t border-slate-700/60 bg-slate-950/40 p-4">
                    {selectedIncident.imageSnapshot ? (
                      <img
                        src={selectedIncident.imageSnapshot}
                        alt={`Evidence for ${selectedIncident.title}`}
                        className="mx-auto max-h-[440px] w-full rounded-xl object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 px-5 py-12 text-center">
                        <span className="material-symbols-outlined text-3xl text-slate-600">
                          image_not_supported
                        </span>
                        <p className="mt-3 text-sm font-medium text-slate-300">
                          No incident snapshot available
                        </p>
                        <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                          This incident record does not contain an evidence image. The interface will not substitute unrelated camera imagery.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status and notes */}
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">
                      Response workflow
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Record progress and document the action taken.
                    </p>
                  </div>

                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClass(selectedIncident)}`}>
                    {isResolved(selectedIncident)
                      ? 'Resolved'
                      : selectedIncident.status}
                  </span>
                </div>

                {isResolved(selectedIncident) ? (
                  <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                    <span className="material-symbols-outlined text-emerald-300">
                      task_alt
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-emerald-300">
                        Incident resolved
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {selectedIncident.resolutionNotes ||
                          'No resolution notes were supplied.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-5">
                      <label className="mb-2 block text-xs font-semibold text-slate-300">
                        Response status
                      </label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <StatusButton
                          active={selectedIncident.status === 'En Route'}
                          icon="local_shipping"
                          label="En Route"
                          onClick={() => updateStatus('En Route')}
                        />
                        <StatusButton
                          active={selectedIncident.status === 'On-Site Mitigating'}
                          icon="engineering"
                          label="On-Site Mitigating"
                          onClick={() => updateStatus('On-Site Mitigating')}
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      <label
                        htmlFor="incident-resolution-notes"
                        className="mb-2 block text-xs font-semibold text-slate-300"
                      >
                        Response / resolution notes
                      </label>
                      <textarea
                        id="incident-resolution-notes"
                        rows={4}
                        value={resolutionNotes[selectedIncident.id] ?? selectedIncident.resolutionNotes ?? ''}
                        onChange={(event) =>
                          setResolutionNotes((previous) => ({
                            ...previous,
                            [selectedIncident.id]: event.target.value,
                          }))
                        }
                        placeholder="Describe the inspection, action taken, or reason for resolution..."
                        className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400/60"
                      />
                    </div>

                    <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] leading-5 text-slate-500">
                        Status and notes are sent through the incident update handler.
                      </p>
                      <button
                        type="button"
                        onClick={handleResolve}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-xs font-bold text-slate-950 transition hover:bg-emerald-300"
                      >
                        <span className="material-symbols-outlined text-base">
                          task_alt
                        </span>
                        Mark resolved
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

interface SummaryCardProps {
  label: string;
  value: number;
  icon: string;
  accent: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  icon,
  accent,
}) => (
  <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className={`mt-2 text-3xl font-bold tracking-tight ${accent}`}>
          {value}
        </p>
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 ${accent}`}>
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
    </div>
  </div>
);

interface InfoCellProps {
  label: string;
  value: string;
  icon: string;
}

const InfoCell: React.FC<InfoCellProps> = ({ label, value, icon }) => (
  <div className="min-w-0 bg-slate-900/70 p-4">
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
      <span className="material-symbols-outlined text-sm">{icon}</span>
      {label}
    </div>
    <p className="mt-2 break-words text-sm font-medium leading-5 text-slate-200">
      {value}
    </p>
  </div>
);

interface StatusButtonProps {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}

const StatusButton: React.FC<StatusButtonProps> = ({
  active,
  icon,
  label,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
      active
        ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300'
        : 'border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
    }`}
  >
    <span className="material-symbols-outlined text-base">{icon}</span>
    {label}
  </button>
);
