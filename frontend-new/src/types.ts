
export type Priority = 'P1 Critical' | 'P2 High' | 'P3 Medium' | 'P4 Low';

export type IncidentStatus =
  | 'Field En Route'
  | 'Crew On-Site Active'
  | 'Resolved & Cleared'
  | 'Archived'
  | 'En Route'
  | 'On-Site Mitigating'
  | 'Cleared / Resolved';

export interface Incident {
  id: string; // Display ID, e.g. "INC-00004"
  backendId?: string; // MongoDB ID used for backend API requests
  title: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  priorityLabel: 'P1 CRITICAL' | 'P2 HIGH' | 'P3 MEDIUM' | 'P4 LOW';
  slaRemaining?: string;
  status: IncidentStatus;
  hazardDescription: string;
  location: string;
  milepost: string;
  cameraSensor: string;
  detectionTimestamp: string;
  verifiedSource: string;
  imageSnapshot: string;
  crossTrackFouling: string;
  sectorSpeedLimit: string;
  inboundTrain?: {
    trainNumber: string;
    eta: string;
    speed: string;
    distance: string;
  };
  dispatchedUnit: {
    name: string;
    lead: string;
    driver?: string;
    equipment: string;
    telemetricStatus: string;
    eta: string;
    gps: string;
    interventionProtocol: string;
  };
  timeline: {
    time: string;
    title: string;
    detail: string;
    type?: 'detection' | 'verification' | 'dispatch' | 'telemetry' | 'mitigation';
  }[];
  resolutionNotes: string;
  verifiedSafe?: boolean;
}

export interface SafetyAlert {
  id: string; // e.g. "INC-9402" or "ALT-842"
  type: 'CRITICAL' | 'HIGH RISK' | 'CAUTION' | 'INFO';
  title: string;
  milepost: string;
  description: string;
  detectedTimeAgo: string;
  assignedTo?: string;
  actionStatus: string;
  slaExpiring?: string;
  icon: string;
  resolved: boolean;
}

export interface CameraFeed {
  id: string; // "CAM-105-MP44B-EAST"
  shortName: string;
  milepost: string;
  locationName: string;
  sector: string;
  fps: number;
  fov: string;
  status: 'ONLINE' | 'OFFLINE' | 'WARNING';
  hasActiveHazard: boolean;
  hazardType?: string;
  confidence?: number;
  image: string;
  resolution: string;
  latencyMs: number;
  lastDetection?: string;
  ptzSupport: boolean;
}

export interface DetectionEvent {
  id: string;
  timestamp: string;
  frame?: number;
  videoTimestampSeconds?: number;
  cameraId: string;
  milepost: string;
  objectClass:
    | 'VEHICLE_OBSTACLE'
    | 'PEDESTRIAN'
    | 'TREE_BRANCH'
    | 'LIVESTOCK'
    | 'DEBRIS'
    | 'COUPLER_DEFECT';
  confidence: number;
  riskScore: number;
  actionTaken: string;
  verified: boolean;
}
