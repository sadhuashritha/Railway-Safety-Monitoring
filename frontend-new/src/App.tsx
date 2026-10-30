
import React, { useCallback, useEffect, useState } from 'react';

import { Sidebar, NavModule } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { IncidentManagementView } from './components/IncidentManagementView';
import { CctvDetectionView } from './components/CctvDetectionView';
import { SafetyAlertsView } from './components/SafetyAlertsView';
import { DetectionHistoryView } from './components/DetectionHistoryView';
import { AnalyticsView } from './components/AnalyticsView';
import { AdminCamerasView } from './components/AdminCamerasView';
import { UserManagementView } from './components/UserManagementView';
import { SosModal } from './components/SosModal';
import { CabAlertModal } from './components/CabAlertModal';
import { DispatchModal } from './components/DispatchModal';
import { AuthView } from './components/AuthView';

import { INITIAL_INCIDENTS, CAMERA_FEEDS } from './data/mockData';
import { Incident, SafetyAlert, DetectionEvent } from './types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

interface BackendAlert {
  id: string;
  detection_record_id?: string;
  filename?: string;
  source_type?: string;
  hazard_type?: string;
  risk_level?: string;
  confidence?: number;
  message?: string;
  status?: string;
  created_at?: string;
  resolved_at?: string | null;
  incident_id?: string | null;
}

interface BackendHistoryRecord {
  id: string;
  filename?: string;
  source_type?: string;
  object_names?: string[];
  total_objects?: number;
  highest_confidence?: number;
  detections?: {
    object: string;
    confidence: number;
    bounding_box?: number[];
    frame?: number;
    timestamp_seconds?: number;
  }[];
  detected_at?: string;
}

interface BackendIncident {
  id: string;
  incident_number?: string;
  alert_id?: string;
  detection_record_id?: string;
  hazard_type?: string;
  risk_level?: string;
  confidence?: number;
  assigned_team?: string;
  assigned_to?: string;
  location?: string;
  description?: string;
  remarks?: string;
  status?: string;
  created_at?: string | null;
  updated_at?: string | null;
  resolved_at?: string | null;

  // Railway location context
  state_id?: string;
  district_id?: string;
  station_id?: string;
  milepost?: string | number | null;

  // Detection source
  filename?: string;
  source_type?: string;

  // Original detection uploader
  created_by_user_id?: string;
  created_by_name?: string;
  created_by_email?: string;
  created_by_role?: string;

  // User who created the incident dossier
  incident_created_by_user_id?: string;
  incident_created_by_name?: string;
  incident_created_by_email?: string;
  incident_created_by_role?: string;
}

const getToken = () => localStorage.getItem('railway_access_token');

async function readResponse(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : `Request failed (${response.status})`
    );
  }

  return data;
}

function unwrapIncident(data: any): BackendIncident | null {
  if (data?.incident?.id) return data.incident;
  if (data?.data?.incident?.id) return data.data.incident;
  if (data?.id) return data;
  if (data?.data?.id) return data.data;
  return null;
}

function mapBackendAlert(alert: BackendAlert): SafetyAlert {
  const risk = (alert.risk_level || 'LOW').toUpperCase();

  const type: SafetyAlert['type'] =
    risk === 'CRITICAL' ? 'CRITICAL' :
    risk === 'HIGH' ? 'HIGH RISK' :
    risk === 'MEDIUM' ? 'CAUTION' : 'INFO';

  const resolved =
    alert.status?.toUpperCase() === 'RESOLVED' ||
    !!alert.resolved_at;

  let detectedTimeAgo = 'Time unavailable';

  if (alert.created_at) {
    const created = new Date(alert.created_at).getTime();

    if (!Number.isNaN(created)) {
      const minutes = Math.max(
        0,
        Math.floor((Date.now() - created) / 60000)
      );

      detectedTimeAgo =
        minutes < 1 ? 'Just now' :
        minutes < 60 ? `${minutes}m ago` :
        minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` :
        `${Math.floor(minutes / 1440)}d ago`;
    }
  }

  const hazard = (alert.hazard_type || '').toLowerCase();

  const icon =
    hazard.includes('person') ? 'person' :
    hazard.includes('animal') ? 'pets' :
    hazard.includes('tree') ? 'park' :
    hazard.includes('car') ? 'directions_car' :
    hazard.includes('rock') || hazard.includes('trash') ? 'warning' :
    'report_problem';

  return {
    id: alert.id,
    type,
    resolved,
    detectedTimeAgo,
    title: alert.hazard_type || 'Safety Detection',
    milepost: alert.filename
      ? `Source: ${alert.filename}`
      : 'Location not provided',
    description: alert.message || 'Potential safety hazard detected.',
    icon,
    slaExpiring:
      !resolved && (risk === 'HIGH' || risk === 'CRITICAL')
        ? 'Immediate'
        : undefined,
    actionStatus: resolved
      ? 'Resolved'
      : alert.status === 'ACKNOWLEDGED'
        ? 'Acknowledged'
        : 'Action Required',
  };
}

function mapBackendIncident(item: BackendIncident): Incident {
  const risk = (item.risk_level || 'LOW').toUpperCase();

  const priority: Incident['priority'] =
    risk === 'CRITICAL' ? 'P1' :
    risk === 'HIGH' ? 'P2' :
    risk === 'MEDIUM' ? 'P3' : 'P4';

  const statusMap: Record<string, Incident['status']> = {
    OPEN: 'Field En Route',
    ASSIGNED: 'Field En Route',
    IN_PROGRESS: 'Crew On-Site Active',
    RESOLVED: 'Resolved & Cleared',
    CLOSED: 'Archived',
  };

  // Presentation placeholders: the backend does not currently provide
  // camera-feed or image URLs.
  const template = INITIAL_INCIDENTS[0];

  return {
    ...template,

    // Keep the human-readable number for display and selection.
    id: item.incident_number || item.id,

    // Preserve the actual MongoDB ID for API requests.
    backendId: item.id,

    title: item.hazard_type || 'Safety Incident',
    priority,
    priorityLabel:
      priority === 'P1' ? 'P1 CRITICAL' :
      priority === 'P2' ? 'P2 HIGH' :
      priority === 'P3' ? 'P3 MEDIUM' : 'P4 LOW',
    status: statusMap[(item.status || 'OPEN').toUpperCase()] || 'Field En Route',
    hazardDescription:
      item.description || item.hazard_type || 'No description provided',
    location: item.location || 'Location not provided',
    milepost: item.location || 'Not provided',
    cameraSensor: 'Camera data unavailable',
    detectionTimestamp: item.created_at || 'Time unavailable',
    verifiedSource: 'Backend incident record',
    imageSnapshot: '',
    resolutionNotes: item.remarks || '',
    verifiedSafe: ['RESOLVED', 'CLOSED'].includes(
      (item.status || '').toUpperCase()
    ),
    timeline: [],
    dispatchedUnit: {
      name: item.assigned_team || 'Unassigned',
      lead: item.assigned_to || 'Not assigned',
      equipment: 'Not provided',
      telemetricStatus: 'Not available',
      eta: 'Not available',
      gps: 'Not available',
      interventionProtocol: 'Follow railway safety procedures',
    },
  };
}

function mapHistoryRecord(record: BackendHistoryRecord): DetectionEvent[] {
  const detections = record.detections || [];

  const classMap: Record<string, DetectionEvent['objectClass']> = {
    person: 'PEDESTRIAN',
    tree: 'TREE_BRANCH',
    animal: 'LIVESTOCK',
    cow: 'LIVESTOCK',
    horse: 'LIVESTOCK',
    car: 'VEHICLE_OBSTACLE',
    rock: 'DEBRIS',
    trash: 'DEBRIS',
    obstacle: 'DEBRIS',
  };

  if (!detections.length) {
    return [{
      id: record.id,
      timestamp: record.detected_at || 'Time unavailable',
      cameraId: record.filename || 'Manual upload',
      milepost: 'Not provided',
      objectClass: 'DEBRIS',
      confidence: Math.round((record.highest_confidence || 0) * 100),
      riskScore: 0,
      actionTaken: 'Detection record saved; object details unavailable',
      verified: false,
    }];
  }

  return detections.map((detection, index) => {
    const name = (detection.object || 'unknown').toLowerCase();

    return {
      id: `${record.id}-${index + 1}`,
      timestamp: record.detected_at || 'Time unavailable',
      ...(typeof detection.frame === 'number' ? { frame: detection.frame } : {}),
      ...(typeof detection.timestamp_seconds === 'number' ? { videoTimestampSeconds: detection.timestamp_seconds } : {}),
      cameraId: record.filename || 'Manual upload',
      milepost: 'Not provided',
      objectClass: classMap[name] || 'DEBRIS',
      confidence: Math.round((detection.confidence || 0) * 100),
      riskScore: 0,
      actionTaken: 'Detection recorded',
      verified: false,
    };
  });
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!getToken()
  );

  const [authUser, setAuthUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('railway_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentModule, setCurrentModule] =
    useState<NavModule>('dashboard');

  const [adminSection, setAdminSection] = useState<'cameras' | 'users'>('cameras');

  const currentRole = String(authUser?.role || 'safety_officer').toLowerCase();
  // The visible role is derived from the authenticated account; UI controls
  // cannot elevate privileges by changing a local role selector.

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [cameras] = useState(CAMERA_FEEDS);
  const [events, setEvents] = useState<DetectionEvent[]>([]);

  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isCabAlertOpen, setIsCabAlertOpen] = useState(false);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchAlerts = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem('railway_access_token');
        localStorage.removeItem('railway_auth_user');
        setIsAuthenticated(false);
        return;
      }

      if (response.status === 403) {
        console.warn('Current role cannot view alerts.');
        return;
      }

      const data = await readResponse(response);
      setAlerts(
        ((data.alerts || []) as BackendAlert[]).map(mapBackendAlert)
      );
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await readResponse(response);

      if (data.success) {
        const records: BackendHistoryRecord[] = data.records || [];
        setEvents(records.flatMap(mapHistoryRecord));
      }
    } catch (error) {
      console.error('Error loading detection history:', error);
    }
  }, []);

  const fetchIncidents = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/incidents`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem('railway_access_token');
        localStorage.removeItem('railway_auth_user');
        setIsAuthenticated(false);
        return;
      }

      if (response.status === 403) {
        console.warn('Current role cannot view incidents.');
        showToast('Your role does not have permission to view incidents.');
        return;
      }

      const data = await readResponse(response);

      const records: BackendIncident[] = Array.isArray(data)
        ? data
        : data.incidents || data.data?.incidents || [];

      const mapped = records.map(mapBackendIncident);
      setIncidents(mapped);

      setSelectedIncidentId(current => {
        if (mapped.some(item => item.id === current)) return current;
        return mapped[0]?.id || '';
      });
    } catch (error) {
      console.error('Error loading incidents:', error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    void fetchAlerts();
    void fetchHistory();
    void fetchIncidents();

    const interval = window.setInterval(() => {
      void fetchAlerts();
      void fetchHistory();
      void fetchIncidents();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, fetchAlerts, fetchHistory, fetchIncidents]);

  const handleNavigate = (
    module: NavModule,
    incidentId?: string
  ) => {
    setCurrentModule(module);
    if (incidentId) setSelectedIncidentId(incidentId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResolveAlert = async (alertId: string) => {
    const token = getToken();
    if (!token) {
      showToast('Authentication required.');
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/alerts/${encodeURIComponent(alertId)}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'RESOLVED' }),
        }
      );

      await readResponse(response);
      await fetchAlerts();
      showToast('Alert resolved and saved.');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Unable to resolve alert.'
      );
    }
  };

  const handleCreateIncident = async (alertId: string) => {
    const token = getToken();

    if (!token) {
      showToast('Authentication required.');
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/incidents/from-alert/${encodeURIComponent(alertId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            assigned_team: 'Safety Team',
            assigned_to: '',
            location: 'Not specified',
            description: 'Created from a safety alert.',
            remarks: '',
          }),
        }
      );

      const data = await readResponse(response);
      const created = unwrapIncident(data);

      await fetchIncidents();

      if (created?.id) {
        const mapped = mapBackendIncident(created);

        setIncidents(current => {
          const exists = current.some(item => item.id === mapped.id);

          if (exists) {
            return current.map(item =>
              item.id === mapped.id ? mapped : item
            );
          }

          return [mapped, ...current];
        });

        setSelectedIncidentId(mapped.id);
        handleNavigate('incident-management', mapped.id);

        const status = (created.status || 'OPEN').toUpperCase();

        showToast(
          ['RESOLVED', 'CLOSED'].includes(status)
            ? 'This alert already has a resolved incident. Reopen it through the incident workflow if appropriate.'
            : `Incident ${created.incident_number || created.id} opened.`
        );
      } else {
        await fetchIncidents();
        handleNavigate('incident-management');
        showToast('Incident list refreshed. Check the latest record.');
      }

      await fetchAlerts();
    } catch (error) {
      console.error('Create incident error:', error);
      showToast(
        error instanceof Error ? error.message : 'Unable to create incident.'
      );
    }
  };

  const handleUpdateIncidentStatus = async (
    id: string,
    newStatus: string,
    notes?: string
  ) => {
    const token = getToken();

    if (!token) {
      showToast('Authentication required.');
      return;
    }

    // Resolve the displayed incident number to its MongoDB ID.
    const incident = incidents.find(item => item.id === id);
    const apiIncidentId = incident?.backendId || id;

    const statusMap: Record<string, string> = {
      OPEN: 'OPEN',
      Open: 'OPEN',
      'Field En Route': 'ASSIGNED',
      'En Route': 'ASSIGNED',
      ASSIGNED: 'ASSIGNED',
      'Crew On-Site Active': 'IN_PROGRESS',
      'On-Site Mitigating': 'IN_PROGRESS',
      IN_PROGRESS: 'IN_PROGRESS',
      'Resolved & Cleared': 'RESOLVED',
      'Cleared / Resolved': 'RESOLVED',
      RESOLVED: 'RESOLVED',
      Archived: 'CLOSED',
      CLOSED: 'CLOSED',
    };

    const status = statusMap[newStatus];

    if (!status) {
      showToast(`Unsupported status: ${newStatus}`);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/incidents/${encodeURIComponent(apiIncidentId)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
            ...(notes !== undefined ? { remarks: notes } : {}),
          }),
        }
      );

      await readResponse(response);
      await fetchIncidents();
      showToast(`Incident status saved: ${status}`);
    } catch (error) {
      console.error('Incident update error:', error);
      showToast(
        error instanceof Error ? error.message : 'Unable to update incident.'
      );
    }
  };

  const handleDispatchTeam = () => setIsDispatchOpen(true);
  const handleTriggerCabAlert = () => setIsCabAlertOpen(true);

  const handleConfirmHalt = () => {
    showToast(
      'Emergency cab halt requested. This prototype does not control railway signalling.'
    );
  };

  const handleLogBrief = () => showToast('Shift brief logged.');

  if (!isAuthenticated) {
    return (
      <AuthView
        onAuthenticated={user => {
          localStorage.setItem('railway_auth_user', JSON.stringify(user));
          setAuthUser(user);
          setIsAuthenticated(true);
          
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-surface-container border border-primary text-on-surface px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[20px]">
            info
          </span>
          <span className="font-body-md text-sm font-semibold">
            {toastMessage}
          </span>
        </div>
      )}

      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        onConfirmHalt={handleConfirmHalt}
      />

      <CabAlertModal
        isOpen={isCabAlertOpen}
        onClose={() => setIsCabAlertOpen(false)}
        trainNumber="Freight #4402"
        onSent={() => showToast('Cab alert action submitted.')}
      />

      <DispatchModal
        isOpen={isDispatchOpen}
        onClose={() => setIsDispatchOpen(false)}
        incidentId={selectedIncidentId}
        location={
          incidents.find(item => item.id === selectedIncidentId)?.location ||
          'Not specified'
        }
        onDispatched={unit => showToast(`${unit} dispatch action submitted.`)}
      />

      
<Sidebar
  currentModule={currentModule}
  currentRole={currentRole}
  onNavigate={setCurrentModule}
 onOpenSos={() => setIsSosOpen(true)}
  activeAlertCount={alerts.filter(alert => !alert.resolved).length}

userLocation={
  authUser?.assigned_location ||
  authUser?.assignedLocation ||
  authUser?.location ||
  authUser?.station_name ||
  authUser?.assigned_station ||
  authUser?.assignedStation ||
  authUser?.subdistrict_name ||
  authUser?.assigned_subdistrict ||
  authUser?.district_name ||
  authUser?.assigned_district ||
  undefined
}

/>


      <div className="pl-72">
<Header
userName={authUser?.name || authUser?.username || authUser?.email?.split('@')[0] || 'User'}
  currentRole={currentRole}
  onRoleChange={() => {}}
  alerts={alerts}
  onOpenAlert={(id) => {
    if (incidents.some((incident) => incident.id === id)) {
      handleNavigate('incident-management', id);
    } else {
      handleNavigate('safety-alerts');
    }
  }}
/>

        <main className="relative pt-16 bg-surface min-h-screen pb-16">
          {currentModule === 'dashboard' && (
            <DashboardView
              userName={authUser?.name || authUser?.username || authUser?.email?.split('@')[0] || 'User'}
              currentRole={currentRole}
              onRoleChange={() => {}}
              alerts={alerts}
              incidents={incidents}
              events={events}
              cameras={cameras}
              onNavigate={handleNavigate}
              onTriggerCabAlert={handleTriggerCabAlert}
              onDispatchTeam={handleDispatchTeam}
              onResolveAlert={handleResolveAlert}
              onLogBrief={handleLogBrief}
            />
          )}

          {currentModule === 'cctv-and-ai-detection' && (
  <CctvDetectionView
    cameras={cameras}
    onOpenIncidentDossier={data => {
      if (!data.detectionId) {
        showToast('Detection was not saved. Please run detection again.');
        return;
      }

      if (!data.alerts || data.alerts.length === 0) {
        showToast(
          'No safety alerts were generated for this detection. An incident cannot be created yet.'
        );
        return;
      }

      void handleCreateIncident(data.alerts[0].id);
    }}
  />
)}


          {currentModule === 'incident-management' && (
            <IncidentManagementView
              incidents={incidents}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={setSelectedIncidentId}
              onUpdateStatus={handleUpdateIncidentStatus}
              onTriggerCabAlert={handleTriggerCabAlert}
              onInspectCamera={cameraId => {
                showToast(`Camera feed is not connected: ${cameraId}`);
                handleNavigate('cctv-and-ai-detection');
              }}
            />
          )}

          {currentModule === 'safety-alerts' && (
            <SafetyAlertsView
              alerts={alerts}
              onResolveAlert={handleResolveAlert}
              onNavigate={handleNavigate}
              onTriggerCabAlert={handleTriggerCabAlert}
              onCreateIncident={handleCreateIncident}
            />
          )}

          {currentModule === 'detection-history' && (
            <DetectionHistoryView events={events} />
          )}

          {currentModule === 'analytics-and-performance' && (
            <AnalyticsView />
          )}

          {currentModule === 'admin-and-cameras' && (
            <section className="p-6 lg:p-8 space-y-6">
              {String(authUser?.role || '').toUpperCase() === 'ADMIN' && (
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setAdminSection('cameras')} className={`rounded-xl px-4 py-2 text-sm font-semibold border ${adminSection === 'cameras' ? 'bg-primary text-white border-primary' : 'bg-surface border-outline-variant text-on-surface'}`}>Cameras</button>
                  <button type="button" onClick={() => setAdminSection('users')} className={`rounded-xl px-4 py-2 text-sm font-semibold border ${adminSection === 'users' ? 'bg-primary text-white border-primary' : 'bg-surface border-outline-variant text-on-surface'}`}>User Management</button>
                </div>
              )}
              {adminSection === 'users' && String(authUser?.role || '').toUpperCase() === 'ADMIN'
                ? <UserManagementView apiUrl={API_URL} token={getToken() || ''} onMessage={showToast} />
                : <AdminCamerasView cameras={cameras} />}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

