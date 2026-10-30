import React, { useState } from 'react';

interface CabAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainNumber?: string;
  onSent: () => void;
}

export const CabAlertModal: React.FC<CabAlertModalProps> = ({
  isOpen,
  onClose,
  trainNumber = "Freight #4402",
  onSent
}) => {
  const [alertType, setAlertType] = useState<'SLOW_ORDER' | 'EMERGENCY_STOP'>('EMERGENCY_STOP');
  const [broadcastSent, setBroadcastSent] = useState(false);

  if (!isOpen) return null;

  const handleTransmit = () => {
    setBroadcastSent(true);
    onSent();
    setTimeout(() => {
      setBroadcastSent(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-low border border-error/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-surface-container p-4 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-[24px]">train</span>
            <div>
              <h3 className="font-headline-md text-on-surface text-base">Direct Cab Telemetry Broadcast</h3>
              <p className="font-data-mono-sm text-outline">Target Locomotive: {trainNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {broadcastSent ? (
            <div className="py-6 text-center space-y-2">
              <span className="material-symbols-outlined text-5xl text-tertiary">check_circle</span>
              <h4 className="font-headline-sm text-on-surface">Cab Signaling Packet Acknowledged</h4>
              <p className="font-data-mono-sm text-on-surface-variant">
                Engineer in {trainNumber} confirmed visual receipt of penalty braking notice.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30 space-y-2 text-sm font-data-mono-sm">
                <div className="flex justify-between">
                  <span className="text-outline">Inbound Train:</span>
                  <span className="text-on-surface font-bold">{trainNumber} (SD70ACe)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">Current Velocity:</span>
                  <span className="text-error font-bold">42 MPH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">Distance to Foul Zone:</span>
                  <span className="text-error font-bold">2.9 miles (ETA: 4m 12s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">PTC Enforcement:</span>
                  <span className="text-tertiary font-bold">SYNCHRONIZED</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-body-sm text-on-surface-variant block">Signal Instruction Command</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAlertType('EMERGENCY_STOP')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      alertType === 'EMERGENCY_STOP'
                        ? 'border-error bg-error-container/30 text-error font-semibold'
                        : 'border-outline-variant/30 bg-surface-container text-on-surface-variant hover:border-outline-variant'
                    }`}
                  >
                    <div className="font-data-mono-md uppercase">Penalty Stop</div>
                    <div className="text-[11px] text-on-surface-variant mt-1">Full pneumatic service application</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertType('SLOW_ORDER')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      alertType === 'SLOW_ORDER'
                        ? 'border-secondary bg-secondary-container/30 text-secondary font-semibold'
                        : 'border-outline-variant/30 bg-surface-container text-on-surface-variant hover:border-outline-variant'
                    }`}
                  >
                    <div className="font-data-mono-md uppercase">Slow Order (15 MPH)</div>
                    <div className="text-[11px] text-on-surface-variant mt-1">Approach prepared to stop at MP 44</div>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-surface-container rounded-lg text-xs font-body-sm text-on-surface-variant border border-outline-variant/20 flex gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0">info</span>
                <span>
                  Transmitting this signal logs an auditable safety event compliant with FRA Part 236 PTC regulations.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!broadcastSent && (
          <div className="p-4 bg-surface-container-low border-t border-outline-variant/30 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleTransmit}
              className="px-5 py-2 rounded-lg bg-error hover:bg-error/90 text-surface-container-lowest font-data-mono-md font-bold uppercase transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">cell_tower</span>
              Transmit Cab Alert
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
