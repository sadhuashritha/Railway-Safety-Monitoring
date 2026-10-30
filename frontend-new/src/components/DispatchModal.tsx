import React, { useState } from 'react';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  location: string;
  onDispatched: (teamName: string) => void;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  isOpen,
  onClose,
  incidentId,
  location,
  onDispatched
}) => {
  const [selectedUnit, setSelectedUnit] = useState('Squad 3 (Heavy Winch Truck)');
  const [priorityLevel, setPriorityLevel] = useState('HIGH_PRIORITY_CODE_3');
  const [notes, setNotes] = useState('Immediate foul zone clearance required. Tow vehicle and inspect rail head score marks.');
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const handleDispatch = () => {
    setIsDone(true);
    onDispatched(selectedUnit);
    setTimeout(() => {
      setIsDone(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-low border border-primary/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-surface-container p-4 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">send_time_extension</span>
            <div>
              <h3 className="font-headline-md text-on-surface text-base">Dispatch Ground Unit</h3>
              <p className="font-data-mono-sm text-outline">Target: {incidentId} • {location}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {isDone ? (
            <div className="py-6 text-center space-y-2">
              <span className="material-symbols-outlined text-5xl text-tertiary">verified</span>
              <h4 className="font-headline-sm text-on-surface">Field Unit Dispatched</h4>
              <p className="font-data-mono-sm text-on-surface-variant">
                {selectedUnit} en route with dynamic GPS telemetry linked to desk.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="font-body-sm text-on-surface-variant block">Available Field Units</label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/40 rounded-lg p-2.5 text-on-surface font-data-mono-sm text-sm"
                >
                  <option value="Squad 3 (Heavy Winch Truck)">Squad 3 (Heavy Winch Truck - Depot 2 - ETA 4m)</option>
                  <option value="Tree Clearing Unit 2">Tree Clearing Unit 2 (Bucket Rig - Substation 4 - ETA 12m)</option>
                  <option value="Track Geometry Gang 5">Track Geometry Gang 5 (Hi-Railer - MP 38 - ETA 8m)</option>
                  <option value="Signal & Catenary Crew 1">Signal & Catenary Crew 1 (Rapid Response - ETA 15m)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-body-sm text-on-surface-variant block">Dispatch Priority Tier</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriorityLevel('HIGH_PRIORITY_CODE_3')}
                    className={`p-2.5 rounded-lg border text-left text-xs font-data-mono-sm transition-all ${
                      priorityLevel === 'HIGH_PRIORITY_CODE_3'
                        ? 'border-error bg-error-container/30 text-error font-bold'
                        : 'border-outline-variant/30 bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    CODE 3: CRITICAL (Sirens/Lights)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriorityLevel('STANDARD_URGENT')}
                    className={`p-2.5 rounded-lg border text-left text-xs font-data-mono-sm transition-all ${
                      priorityLevel === 'STANDARD_URGENT'
                        ? 'border-primary bg-primary-container/30 text-primary font-bold'
                        : 'border-outline-variant/30 bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    STANDARD URGENT (Expedited)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-body-sm text-on-surface-variant block">Dispatcher Instructions & Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/40 rounded-lg p-2 text-on-surface font-body-sm text-xs focus:border-primary outline-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isDone && (
          <div className="p-4 bg-surface-container-low border-t border-outline-variant/30 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleDispatch}
              className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-headline-sm text-sm font-semibold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              Confirm & Dispatch
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
