import React, { useState } from 'react';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmHalt: () => void;
}

export const SosModal: React.FC<SosModalProps> = ({ isOpen, onClose, onConfirmHalt }) => {
  const [broadHaltArmed, setBroadHaltArmed] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('Ch 14 - Dispatch Emergency Priority');
  const [haltTriggered, setHaltTriggered] = useState(false);

  if (!isOpen) return null;

  const handleExecute = () => {
    setHaltTriggered(true);
    onConfirmHalt();
    setTimeout(() => {
      setHaltTriggered(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-low border-2 border-error/60 rounded-2xl w-full max-w-xl overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.3)]">
        {/* Header */}
        <div className="bg-error-container/40 p-4 border-b border-error/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-error text-surface-container-lowest material-symbols-outlined text-[24px] animate-pulse">
              crisis_alert
            </span>
            <div>
              <h2 className="font-headline-md text-error font-bold tracking-tight">
                SOS Safety Dispatch Hotline
              </h2>
              <p className="font-data-mono-sm text-on-error-container">
                Emergency Priority Cab Halt & Wayside Siren Interface
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {haltTriggered ? (
            <div className="py-8 text-center space-y-3">
              <div className="inline-flex p-4 rounded-full bg-error-container text-error animate-bounce">
                <span className="material-symbols-outlined text-4xl">notification_important</span>
              </div>
              <h3 className="font-headline-md text-on-surface text-lg font-bold">
                EMERGENCY STOP BROADCAST TRANSMITTED
              </h3>
              <p className="font-body-md text-on-surface-variant">
                All locomotive throttle cut signals sent via Positive Train Control (PTC) across Northern Mainline (MP 0–180).
              </p>
            </div>
          ) : (
            <>
              <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-badge-label uppercase text-outline">Target Operating Sector</span>
                  <span className="font-data-mono-sm text-tertiary">LIVE LINK READY</span>
                </div>
                <div className="text-on-surface font-headline-sm font-semibold">
                  Northern Mainline Corridor (MP 0.00 – 180.00)
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20 font-data-mono-sm text-xs">
                  <div>Active Trains in Block: <span className="text-error font-bold">4 Locomotives</span></div>
                  <div>Nearest Approach: <span className="text-error font-bold">Freight #4402 (2.9 mi)</span></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-body-sm text-on-surface-variant block">
                  Radio Intercom Channel Override
                </label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/40 rounded-lg p-2.5 text-on-surface font-data-mono-sm text-sm"
                >
                  <option>Ch 14 - Dispatch Emergency Priority (All Trains)</option>
                  <option>Ch 16 - Track Maintenance & Field Crews</option>
                  <option>Ch 02 - State Emergency Services & 911 Bridge</option>
                </select>
              </div>

              <div className="p-3 bg-surface-container-high/60 rounded-lg flex items-center gap-3">
                <input
                  type="checkbox"
                  id="armHalt"
                  checked={broadHaltArmed}
                  onChange={(e) => setBroadHaltArmed(e.target.checked)}
                  className="w-5 h-5 accent-error rounded cursor-pointer"
                />
                <label htmlFor="armHalt" className="font-body-sm text-on-surface cursor-pointer select-none">
                  Arm system-wide <strong>Emergency Stop / Slow Order Override</strong> for immediate transmission.
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!haltTriggered && (
          <div className="p-4 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-body-md"
            >
              Cancel
            </button>
            <button
              disabled={!broadHaltArmed}
              onClick={handleExecute}
              className={`px-5 py-2 rounded-lg font-data-mono-md font-bold uppercase transition-all flex items-center gap-2 ${
                broadHaltArmed
                  ? 'bg-error text-surface-container-lowest hover:bg-error/90 cursor-pointer shadow-lg shadow-error/40'
                  : 'bg-surface-container-highest text-outline cursor-not-allowed opacity-60'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">emergency</span>
              Trigger Emergency Stop
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
