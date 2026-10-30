import React, { useState } from 'react';
import { CameraFeed } from '../types';

interface AdminCamerasViewProps {
  cameras: CameraFeed[];
}

export const AdminCamerasView: React.FC<AdminCamerasViewProps> = ({ cameras }) => {
  const [rebootingId, setRebootingId] = useState<string | null>(null);
  const [calibratedId, setCalibratedId] = useState<string | null>(null);

  const handleReboot = (id: string) => {
    setRebootingId(id);
    setTimeout(() => setRebootingId(null), 2000);
  };

  const handleCalibrate = (id: string) => {
    setCalibratedId(id);
    setTimeout(() => setCalibratedId(null), 1800);
  };

  return (
    <div className="p-space-lg max-w-[1720px] mx-auto w-full space-y-space-md">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-sm border-b border-outline-variant/20">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display-lg text-on-surface text-2xl font-bold">Admin & Camera Fleet Management</h1>
            <span className="font-badge-label px-2 py-0.5 rounded bg-surface-container-highest text-outline uppercase">
              Admin Only Access
            </span>
          </div>
          <p className="font-body-sm text-on-surface-variant mt-0.5">
            144 Trackside Optical Rigs • Hardware Health • TPU Edge Accelerators • RTSP Telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-data-mono-sm text-tertiary font-bold bg-surface-container-low px-3 py-1.5 rounded border border-outline-variant/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-tertiary"></span>
            142 / 144 Online (98.6%)
          </span>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="bg-surface-container-low rounded-xl border border-outline-variant/30 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-body-sm">
            <thead className="bg-surface-container border-b border-outline-variant/30 font-badge-label uppercase text-outline">
              <tr>
                <th className="p-3">Rig ID</th>
                <th className="p-3">Location & Milepost</th>
                <th className="p-3">Sensor Health</th>
                <th className="p-3">Stream Spec</th>
                <th className="p-3">TPU Latency</th>
                <th className="p-3">PTZ Support</th>
                <th className="p-3">Firmware</th>
                <th className="p-3 text-right">Hardware Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-data-mono-sm">
              {cameras.map(cam => (
                <tr key={cam.id} className="hover:bg-surface-container/60 transition-colors">
                  <td className="p-3 font-bold text-primary">{cam.id}</td>
                  <td className="p-3">
                    <div className="text-on-surface font-semibold">{cam.locationName}</div>
                    <div className="text-outline text-[11px]">{cam.milepost}</div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-badge-label ${
                      cam.status === 'ONLINE' ? 'bg-tertiary/20 text-tertiary' : 'bg-error/20 text-error'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cam.status === 'ONLINE' ? 'bg-tertiary' : 'bg-error'}`}></span>
                      {cam.status}
                    </span>
                  </td>
                  <td className="p-3 text-on-surface">
                    {cam.resolution} • {cam.fps} FPS
                  </td>
                  <td className="p-3 text-tertiary font-bold">
                    {cam.latencyMs > 0 ? `${cam.latencyMs}ms` : 'N/A'}
                  </td>
                  <td className="p-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      cam.ptzSupport ? 'bg-surface-container-high text-primary' : 'text-outline'
                    }`}>
                      {cam.ptzSupport ? 'PTZ Motorized' : 'Fixed Lens'}
                    </span>
                  </td>
                  <td className="p-3 text-outline">v2.4.1-RT</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleCalibrate(cam.id)}
                        className="px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface text-[11px] font-body-sm transition-colors cursor-pointer"
                      >
                        {calibratedId === cam.id ? 'Calibrated!' : 'Calibrate PTZ'}
                      </button>
                      <button
                        onClick={() => handleReboot(cam.id)}
                        className="px-2.5 py-1 rounded bg-surface-container-high hover:bg-error-container/40 hover:text-error text-outline text-[11px] font-body-sm transition-colors cursor-pointer"
                      >
                        {rebootingId === cam.id ? 'Rebooting...' : 'Reboot Unit'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
