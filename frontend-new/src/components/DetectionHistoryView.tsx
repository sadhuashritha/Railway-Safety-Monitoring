import React, { useState } from 'react';
import { DetectionEvent } from '../types';

interface DetectionHistoryViewProps {
  events: DetectionEvent[];
}

export const DetectionHistoryView: React.FC<DetectionHistoryViewProps> = ({ events }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [minConfidence, setMinConfidence] = useState<number>(50);
  const [downloading, setDownloading] = useState(false);

  const filtered = events.filter(e => {
    const matchTerm =
      e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.cameraId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.milepost.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.actionTaken.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = selectedClass === 'ALL' || e.objectClass === selectedClass;
    const matchConf = e.confidence >= minConfidence;
    return matchTerm && matchClass && matchConf;
  });

  const handleExportCSV = () => {
    setDownloading(true);
    const headers = "ID,Timestamp,CameraID,Milepost,ObjectClass,Confidence,RiskScore,Verified,ActionTaken\n";
    const rows = filtered.map(e => `${e.id},${e.timestamp},${e.cameraId},${e.milepost},${e.objectClass},${e.confidence}%,${e.riskScore},${e.verified},"${e.actionTaken}"`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `railwatch_detections_${Date.now()}.csv`;
    a.click();
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <div className="p-space-lg max-w-[1720px] mx-auto w-full space-y-space-md">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-sm border-b border-outline-variant/20">
        <div>
          <h1 className="font-display-lg text-on-surface text-2xl font-bold">Detection History & Audit Log</h1>
          <p className="font-body-sm text-on-surface-variant mt-0.5">
            Immutable log of all edge YOLO inference events, bounding coordinates, and operator verifications.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-primary font-body-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-outline-variant/30 self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">
            {downloading ? 'downloading' : 'file_download'}
          </span>
          <span>{downloading ? 'Exporting...' : 'Export Audit CSV'}</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/30 grid grid-cols-1 md:grid-cols-3 gap-gutter items-center">
        {/* Search Input */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">search</span>
          <input
            type="text"
            placeholder="Search by ID, camera, or milepost..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant/40 rounded-lg pl-9 pr-3 py-2 text-on-surface font-body-sm text-xs focus:border-primary outline-none"
          />
        </div>

        {/* Class Filter */}
        <div className="flex items-center gap-2">
          <span className="font-body-sm text-on-surface-variant text-xs shrink-0">Object Class:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant/40 rounded-lg p-2 text-on-surface font-data-mono-sm text-xs outline-none"
          >
            <option value="ALL">All Track Classes</option>
            <option value="VEHICLE_OBSTACLE">VEHICLE_OBSTACLE</option>
            <option value="PEDESTRIAN">PEDESTRIAN</option>
            <option value="TREE_BRANCH">TREE_BRANCH</option>
            <option value="LIVESTOCK">LIVESTOCK</option>
            <option value="DEBRIS">DEBRIS</option>
          </select>
        </div>

        {/* Confidence Slider */}
        <div className="flex items-center gap-3">
          <div className="flex justify-between text-xs w-full">
            <span className="text-on-surface-variant">Min AI Confidence:</span>
            <span className="font-data-mono-sm text-primary font-bold">{minConfidence}%</span>
          </div>
          <input
            type="range"
            min="30"
            max="95"
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-low rounded-xl border border-outline-variant/30 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-body-sm">
            <thead className="bg-surface-container border-b border-outline-variant/30 font-badge-label uppercase text-outline">
              <tr>
                <th className="p-3">Event ID</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Camera Sensor</th>
                <th className="p-3">Milepost</th>
                <th className="p-3">Object Class</th>
                <th className="p-3">Confidence</th>
                <th className="p-3">Risk Score</th>
                <th className="p-3">Verification</th>
                <th className="p-3">Action Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-data-mono-sm">
              {filtered.map(row => (
                <tr key={row.id} className="hover:bg-surface-container/60 transition-colors">
                  <td className="p-3 font-bold text-primary">{row.id}</td>
                  <td className="p-3 text-on-surface-variant">{row.videoTimestampSeconds !== undefined ? `${row.timestamp} · ${row.videoTimestampSeconds.toFixed(2)}s${row.frame !== undefined ? ` (frame ${row.frame})` : ''}` : row.timestamp}</td>
                  <td className="p-3 text-on-surface font-semibold">{row.cameraId}</td>
                  <td className="p-3 text-outline">{row.milepost}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      row.objectClass === 'VEHICLE_OBSTACLE'
                        ? 'bg-error-container text-on-error-container'
                        : row.objectClass === 'PEDESTRIAN'
                        ? 'bg-surface-container-highest text-secondary'
                        : 'bg-surface-container-highest text-tertiary'
                    }`}>
                      {row.objectClass}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-on-surface">{row.confidence}%</td>
                  <td className="p-3">
                    <span className={row.riskScore > 80 ? 'text-error font-bold' : 'text-on-surface'}>
                      {row.riskScore}/100
                    </span>
                  </td>
                  <td className="p-3">
                    {row.verified ? (
                      <span className="text-tertiary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        Verified
                      </span>
                    ) : (
                      <span className="text-outline">Auto-Dismissed</span>
                    )}
                  </td>
                  <td className="p-3 font-body-sm text-on-surface-variant text-[11px] truncate max-w-xs">
                    {row.actionTaken}
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
