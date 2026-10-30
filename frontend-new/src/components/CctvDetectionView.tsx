import React, { useEffect, useRef, useState } from 'react';
import { CameraFeed } from '../types';

interface DetectionAlert {
  id: string;
  hazard_type: string;
  risk_level: string;
  confidence: number;
  status: string;
  message: string;
}
interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  state_id?: string | null;
  district_id?: string | null;
  subdistrict_id?: string | null;
  station_id?: string | null;
  station_name?: string | null;
  state_name?: string | null;
  district_name?: string | null;
  subdistrict_name?: string | null;
  assigned_location?: string | null;
}

interface CctvDetectionViewProps {
  cameras: CameraFeed[];
  onOpenIncidentDossier: (data: {
    detectionId: string;
    filename: string;
    sourceType: 'image' | 'video';
    location: {
      state_id?: string;
      district_id?: string;
      subdistrict_id?: string;
      station_id?: string;
      locationLabel: string;
    };
    
    alerts: DetectionAlert[];
  }) => void;
}

interface DetectionResult {
  object: string;
  confidence: number;
  bounding_box?: number[];
  frame?: number;
  timestamp_seconds?: number;
}

interface LocationItem {
  state_id?: string;
  district_id?: string;
  district_name?: string;
  subdistrict_id?: string;
  station_id?: string;
  station_code?: string;
  code?: string;
  name: string;
}

interface LocationResponse {
  items?: LocationItem[];
  stations?: LocationItem[];
  districts?: LocationItem[];
  subdistricts?: LocationItem[];
  count?: number;
}

type UploadKind = 'image' | 'video';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

const FALLBACK_STATES: LocationItem[] = [
  { state_id: 'telangana', name: 'Telangana' },
  { state_id: 'andhra-pradesh', name: 'Andhra Pradesh' },
  { state_id: 'maharashtra', name: 'Maharashtra' },
  { state_id: 'karnataka', name: 'Karnataka' },
  { state_id: 'tamil-nadu', name: 'Tamil Nadu' },
];

const DEMO_CAMERA_NAMES = [
  'Platform 1',
  'Platform 2',
  'Station Entrance',
  'Track-side View',
  'Foot Overbridge',
  'Yard / Crossing',
  'North Approach',
  'South Approach',
  'Concourse',
];

export const CctvDetectionView: React.FC<CctvDetectionViewProps> = ({
  cameras,
  onOpenIncidentDossier,
}) => {
  const [layoutMode, setLayoutMode] = useState<
    '2x2' | 'spotlight' | '3x3'
  >('2x2');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const isAdmin = currentUser?.role?.trim().toUpperCase() === 'ADMIN';
  console.log("CURRENT USER:", currentUser);
console.log("ADMIN ROLE:", currentUser?.role);
console.log("IS ADMIN:", isAdmin);
useEffect(() => {
  let cancelled = false;

  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('railway_access_token');

      if (!token) {
        throw new Error('Authentication token missing. Please log in again.');
      }

      const response = await fetch(`${API_BASE}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to load your account.');
      }

      if (!data?.user || typeof data.user.role !== 'string') {
        throw new Error('Invalid user information returned by the server.');
      }

      if (!cancelled) {
        setCurrentUser(data.user);
      }
    } catch (error) {
      if (!cancelled) {
        setLocationError(
          error instanceof Error
            ? error.message
            : 'Unable to load your account.'
        );
      }
    } finally {
      if (!cancelled) {
        setUserLoading(false);
      }
    }
  };

  void loadCurrentUser();

  return () => {
    cancelled = true;
  };
}, []);

  // Location data
  const [states, setStates] = useState<LocationItem[]>(FALLBACK_STATES);
  const [districtRecords, setDistrictRecords] = useState<LocationItem[]>([]);
  const [subdistrictRecords, setSubdistrictRecords] = useState<LocationItem[]>([]);
  const [stationRecords, setStationRecords] = useState<LocationItem[]>([]);

  const [selectedState, setSelectedState] = useState('telangana');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedMandal, setSelectedMandal] = useState('');
  const [selectedStation, setSelectedStation] = useState('');

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  // CCTV display settings
  const [selectedCameraId, setSelectedCameraId] = useState(
    cameras[0]?.id || ''
  );
  const [overlayActive, setOverlayActive] = useState(true);

  // Detection state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadKind, setUploadKind] = useState<UploadKind>('image');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([]);
  const [savedDetectionId, setSavedDetectionId] = useState<string | null>(null);
  const [createdAlerts, setCreatedAlerts] = useState<DetectionAlert[]>([]);
  const [showAllResults, setShowAllResults] = useState(false);
  const [detectionError, setDetectionError] = useState('');
  const [videoInfo, setVideoInfo] = useState<Record<string, unknown> | null>(null);
  const [imageDimensions, setImageDimensions] = useState({
    width: 1,
    height: 1,
  });
  const [falsePositiveMarked, setFalsePositiveMarked] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const districts = districtRecords;
  const mandals = subdistrictRecords;
  const stations = stationRecords;

  const selectedCam =
    cameras.find((camera) => camera.id === selectedCameraId) || cameras[0];

  const selectedStationRecord = stationRecords.find(
    (station) => station.station_id === selectedStation
  );

  const selectedLocationLabel = isAdmin
  ? [
      selectedStationRecord?.name,
      districtRecords.find(
        (district) => district.district_id === selectedDistrict
      )?.name,
      states.find((state) => state.state_id === selectedState)?.name,
      'India',
    ]
        .filter(Boolean)
        .join(', ')
  : [
      currentUser?.station_name ||
        currentUser?.assigned_location ||
        currentUser?.station_id,
      currentUser?.district_name,
      currentUser?.state_name,
      'India',
    ]
        .filter(Boolean)
        .join(', ');

  const cameraDisplayName = (index: number) =>
    `CAM-DEMO-${String(index + 1).padStart(2, '0')} Â· ${
      DEMO_CAMERA_NAMES[index % DEMO_CAMERA_NAMES.length]
    }`;

  const cameraDisplayLocation = (index: number) =>
    `${selectedStationRecord?.name || 'Select station'} Â· ${
      DEMO_CAMERA_NAMES[index % DEMO_CAMERA_NAMES.length]
    }`;

  // Load states
  useEffect(() => {
    let cancelled = false;

    const loadStates = async () => {
  if (userLoading || !isAdmin) return;

  setLocationLoading(true);

      try {
        const response = await fetch(`${API_BASE}/api/locations/states`);

        if (!response.ok) {
          throw new Error(`Failed to load states: ${response.status}`);
        }

        const data: LocationResponse = await response.json();

        if (cancelled) return;

        const availableStates =
          Array.isArray(data.items) && data.items.length > 0
            ? data.items
            : FALLBACK_STATES;

        setStates(availableStates);

        setSelectedState((current) => {
          if (
            current &&
            availableStates.some((state) => state.state_id === current)
          ) {
            return current;
          }

          return (
            availableStates.find(
              (state) => state.state_id === 'telangana'
            )?.state_id ||
            availableStates[0]?.state_id ||
            ''
          );
        });
      } catch (error) {
        if (!cancelled) {
          setStates(FALLBACK_STATES);
          setLocationError(
            error instanceof Error
              ? error.message
              : 'Unable to load states'
          );
        }
      } finally {
        if (!cancelled) {
          setLocationLoading(false);
        }
      }
    };

    void loadStates();

    return () => {
      cancelled = true;
    };
  }, [userLoading, isAdmin]);

  // Load districts when the state changes
  useEffect(() => {
    let cancelled = false;

    if (userLoading || !isAdmin) {
  return;
}

if (!selectedState) {
  setDistrictRecords([]);
  setSubdistrictRecords([]);
  setStationRecords([]);
  setSelectedDistrict('');
  setSelectedMandal('');
  setSelectedStation('');
  return;
}

    const loadDistricts = async () => {
  if (userLoading || !isAdmin) return;

  setLocationLoading(true);
      setLocationError('');

      setDistrictRecords([]);
      setSubdistrictRecords([]);
      setStationRecords([]);
      setSelectedDistrict('');
      setSelectedMandal('');
      setSelectedStation('');

      try {
        const params = new URLSearchParams({
          state_id: selectedState,
        });

        const response = await fetch(
          `${API_BASE}/api/locations/districts?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error(`Failed to load districts: ${response.status}`);
        }

        const data: LocationResponse = await response.json();

        if (cancelled) return;

        const items = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.districts)
            ? data.districts
            : [];

        setDistrictRecords(
          [...items].sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch (error) {
        if (!cancelled) {
          setLocationError(
            error instanceof Error
              ? error.message
              : 'Unable to load districts'
          );
        }
      } finally {
        if (!cancelled) {
          setLocationLoading(false);
        }
      }
    };

    void loadDistricts();

    return () => {
      cancelled = true;
    };
  }, [selectedState, userLoading, isAdmin]);

  // Load local areas when the district changes
  useEffect(() => {
    let cancelled = false;

    if (!selectedDistrict || !selectedState) {
      setSubdistrictRecords([]);
      setSelectedMandal('');
      return;
    }

    const loadSubdistricts = async () => {
  if (userLoading || !isAdmin) return;

  setLocationError('');
      setSubdistrictRecords([]);
      setSelectedMandal('');

      try {
        const params = new URLSearchParams({
          state_id: selectedState,
          district_id: selectedDistrict,
          limit: '500',
        });

        const response = await fetch(
  `${API_BASE}/api/locations/subdistricts?${params.toString()}`
);

        if (!response.ok) {
          throw new Error(`Failed to load local areas: ${response.status}`);
        }

        const data: LocationResponse = await response.json();

        if (cancelled) return;

        const items = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.subdistricts)
            ? data.subdistricts
            : [];

        setSubdistrictRecords(
          items
            .filter((area) => Boolean(area.subdistrict_id))
            .sort((a, b) => a.name.localeCompare(b.name))
        );

        // Keep params constructed above available for future API filtering.
        void params;
      } catch (error) {
        if (!cancelled) {
          setLocationError(
            error instanceof Error
              ? error.message
              : 'Unable to load local areas'
          );
        }
      }
    };

    void loadSubdistricts();

    return () => {
      cancelled = true;
    };
  }, [selectedState, selectedDistrict, userLoading, isAdmin]);

  // Load stations when the state, district, or local area changes
  useEffect(() => {
    let cancelled = false;

    if (!selectedState) {
      setStationRecords([]);
      setSelectedStation('');
      return;
    }

    const loadStations = async () => {
  if (userLoading || !isAdmin) return;

  setLocationError('');
      setStationRecords([]);
      setSelectedStation('');

      try {
        const params = new URLSearchParams({
          state_id: selectedState,
          limit: '500',
        });

        if (selectedDistrict) {
          params.set('district_id', selectedDistrict);
        }

        if (selectedMandal) {
          params.set('subdistrict_id', selectedMandal);
        }

        const response = await fetch(
          `${API_BASE}/api/locations/stations?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error(`Failed to load stations: ${response.status}`);
        }

        const data: LocationResponse = await response.json();

        if (cancelled) return;

        const items = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.stations)
            ? data.stations
            : [];

        setStationRecords(items);
      } catch (error) {
        if (!cancelled) {
          setLocationError(
            error instanceof Error
              ? error.message
              : 'Unable to load stations'
          );
        }
      }
    };

    void loadStations();

    return () => {
      cancelled = true;
    };
  }, [selectedState, selectedDistrict, selectedMandal, userLoading, isAdmin]);
  // Set the assigned location for non-admin users
useEffect(() => {
  if (userLoading || !currentUser || isAdmin) return;

  const user = currentUser;

  setSelectedState(user.state_id || '');
  setSelectedDistrict(user.district_id || '');
  setSelectedMandal(user.subdistrict_id || '');
  setSelectedStation(user.station_id || '');

  setStates(
    user.state_id
      ? [
          {
            state_id: user.state_id,
            name: user.state_name || user.state_id,
          },
        ]
      : []
  );

  setDistrictRecords(
    user.district_id
      ? [
          {
            district_id: user.district_id,
            name: user.district_name || user.district_id,
          },
        ]
      : []
  );

  setSubdistrictRecords(
    user.subdistrict_id
      ? [
          {
            subdistrict_id: user.subdistrict_id,
            name: user.subdistrict_name || user.subdistrict_id,
          },
        ]
      : []
  );

  setStationRecords(
    user.station_id
      ? [
          {
            station_id: user.station_id,
            name:
              user.station_name ||
              user.assigned_location ||
              user.station_id,
            state_id: user.state_id || undefined,
            district_id: user.district_id || undefined,
            subdistrict_id: user.subdistrict_id || undefined,
          },
        ]
      : []
  );

  if (!user.station_id) {
    setLocationError(
      'No station is assigned to your account. Contact the administrator.'
    );
  } else {
    setLocationError('');
  }
}, [userLoading, currentUser, isAdmin]);

  // Release preview URLs when they are replaced or the component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Keep the selected camera valid when camera props change
  useEffect(() => {
    if (!cameras.some((camera) => camera.id === selectedCameraId)) {
      setSelectedCameraId(cameras[0]?.id || '');
    }
  }, [cameras, selectedCameraId]);

  const clearDetection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setDetectionResults([]);
    setSavedDetectionId(null);
    setCreatedAlerts([]);
    setDetectionError('');
    setVideoInfo(null);
    setShowAllResults(false);
    setFalsePositiveMarked(false);
    setImageDimensions({ width: 1, height: 1 });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const isVideoFile =
      file.type === 'video/mp4' ||
      file.name.toLowerCase().endsWith('.mp4');

    const isImageFile = file.type.startsWith('image/');

    if (!isVideoFile && !isImageFile) {
      setDetectionError('Please select an image or an MP4 video.');
      event.target.value = '';
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setUploadKind(isVideoFile ? 'video' : 'image');
    setPreviewUrl(URL.createObjectURL(file));
    setDetectionResults([]);
    setSavedDetectionId(null);
    setCreatedAlerts([]);
    setShowAllResults(false);
    setDetectionError('');
    setVideoInfo(null);
    setFalsePositiveMarked(false);
    setImageDimensions({ width: 1, height: 1 });
  };

  const runDetection = async () => {
    if (!selectedFile || detecting) return;
      if (userLoading) {
    setDetectionError('Please wait while your account is loading.');
    return;
  }

  if (!isAdmin && !currentUser?.station_id) {
    setDetectionError(
      'Your account has no assigned station. Contact the administrator before running detection.'
    );
    return;
  }

    setDetecting(true);
    setDetectionError('');
    setDetectionResults([]);
    setSavedDetectionId(null);
    setCreatedAlerts([]);
    setShowAllResults(false);
    setVideoInfo(null);

    try {
      const token = localStorage.getItem('railway_access_token');

      if (!token) {
        throw new Error(
          'Please login again. Authentication token is missing.'
        );
      }

      const formData = new FormData();
      formData.append('file', selectedFile);

      const endpoint =
        uploadKind === 'video' ? '/detect-video' : '/detect';

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      let data: any;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          'The detection server returned an invalid response.'
        );
      }

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === 'string'
            ? data.detail
            : 'Detection request failed.'
        );
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Detection failed.');
      }

      const results: DetectionResult[] = Array.isArray(data.detections)
        ? data.detections
        : [];

      setDetectionResults(results);

      if (data.database_saved === false) {
        throw new Error(
          'Detection completed, but it was not saved to the database. Please try again.'
        );
      }

      if (!data.id) {
        throw new Error(
          'The backend did not return a saved detection ID. Incident creation is unavailable.'
        );
      }

      setSavedDetectionId(String(data.id));

      const alerts: DetectionAlert[] = Array.isArray(data.alerts)
        ? data.alerts.filter(
            (alert: any) =>
              typeof alert?.id === 'string' &&
              alert.id.length > 0 &&
              typeof alert.hazard_type === 'string'
          )
        : [];

      setCreatedAlerts(alerts);

      if (uploadKind === 'video') {
        setVideoInfo(data.video_info || null);
      }
    } catch (error) {
      setDetectionError(
        error instanceof Error
          ? error.message
          : 'Unable to connect to detection server.'
      );
    } finally {
      setDetecting(false);
    }
  };

  const handleMarkFalsePositive = () => {
    // This is a UI-only acknowledgement. It does not update the backend.
    setFalsePositiveMarked(true);
    window.setTimeout(() => setFalsePositiveMarked(false), 2500);
  };

  const detectionSummary = !selectedFile
    ? 'No file selected for detection.'
    : detecting
      ? `Processing ${uploadKind}...`
      : `${detectionResults.length} detection${
          detectionResults.length === 1 ? '' : 's'
        } returned for the selected ${uploadKind}.`;

  const canCreateDossier =
    Boolean(savedDetectionId) &&
    createdAlerts.length > 0 &&
    !detecting;

  const openIncidentDossier = () => {
    if (
      !savedDetectionId ||
      !selectedFile ||
      createdAlerts.length === 0
    ) {
      return;
    }

    onOpenIncidentDossier({
      detectionId: savedDetectionId,
      filename: selectedFile.name,
      sourceType: uploadKind,
      location: {
        state_id: selectedState || undefined,
        district_id: selectedDistrict || undefined,
        subdistrict_id: selectedMandal || undefined,
        station_id: selectedStation || undefined,
        locationLabel: selectedLocationLabel,
      },
      alerts: createdAlerts,
    });
  };

  const videoDuration = Number(videoInfo?.duration_seconds || 0);

  return (
    <div className="p-4 lg:p-5 max-w-[1720px] mx-auto w-full space-y-4">
      {/* Page header and location filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-sm border-b border-outline-variant/20">
        <div className="flex items-center gap-space-md">
          <h1 className="font-display-lg text-on-surface text-2xl font-bold">
            CCTV &amp; Detection
          </h1>

          <span className="font-badge-label px-2 py-0.5 rounded bg-surface-container-high text-primary uppercase">
            Sector Feed Grid
          </span>
        </div>

        <div className="flex items-center gap-space-md flex-wrap">
          <div className="bg-surface-container-low p-1 rounded-xl flex items-center gap-1 border border-outline-variant/30">
            {(['2x2', 'spotlight', '3x3'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setLayoutMode(mode)}
                className={`px-3 py-1.5 rounded-lg font-data-mono-sm transition-colors cursor-pointer ${
                  layoutMode === mode
                    ? 'bg-surface-container-high text-primary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {mode === 'spotlight'
                  ? 'Spotlight'
                  : mode === '3x3'
                    ? '3x3 Matrix'
                    : '2x2'}
              </button>
            ))}
          </div>

          {userLoading ? (
  <div className="text-xs text-on-surface-variant">
    Loading account and assigned stationâ€¦
  </div>
) : isAdmin ? (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 w-full xl:w-auto">
    {/* State */}
    <select
      value={selectedState}
      onChange={(event) => setSelectedState(event.target.value)}
      disabled={locationLoading}
      className="min-w-0 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface"
    >
      <option value="">Select State</option>
      {states.map((state) => (
        <option key={state.state_id} value={state.state_id}>
          {state.name}
        </option>
      ))}
    </select>

    {/* District */}
    <select
      value={selectedDistrict}
      onChange={(event) => setSelectedDistrict(event.target.value)}
      disabled={!selectedState || locationLoading}
      className="min-w-0 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface"
    >
      <option value="">Select District</option>
      {districts.map((district) => (
        <option key={district.district_id} value={district.district_id}>
          {district.name}
        </option>
      ))}
    </select>

    {/* Local Area */}
    <select
      value={selectedMandal}
      onChange={(event) => setSelectedMandal(event.target.value)}
      disabled={!selectedDistrict || locationLoading}
      className="min-w-0 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface"
    >
      <option value="">Select Local Area</option>
      {mandals.map((mandal) => (
        <option key={mandal.subdistrict_id} value={mandal.subdistrict_id}>
          {mandal.name}
        </option>
      ))}
    </select>

    {/* Station */}
    <select
      value={selectedStation}
      onChange={(event) => setSelectedStation(event.target.value)}
      disabled={!selectedState || locationLoading}
      className="min-w-0 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface"
    >
      <option value="">Select Station</option>
      {stations.map((station) => (
        <option key={station.station_id} value={station.station_id}>
          {station.name}
        </option>
      ))}
    </select>
  </div>
) : (

  <div className="w-full xl:w-auto rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
    <div className="text-xs font-semibold text-on-surface">
      ðŸ“ Assigned station:{' '}
      {currentUser?.station_name ||
        currentUser?.assigned_location ||
        currentUser?.station_id ||
        'Not assigned'}
    </div>

    <div className="mt-1 text-[10px] text-on-surface-variant">
      Role: {currentUser?.role || 'Unknown'} Â· Station selection is restricted.
    </div>
  </div>
)}

          {(locationLoading || locationError) && (
            <div className="w-full text-xs mt-1">
              {locationLoading && (
                <span className="text-on-surface-variant">
                  Loading location dataâ€¦{' '}
                </span>
              )}
              {locationError && (
                <span className="text-error">{locationError}</span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setOverlayActive((current) => !current)}
            className="px-3 py-1.5 rounded-xl border border-outline-variant/30 text-xs cursor-pointer"
          >
            Detection Overlay: {overlayActive ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Location banner: fixed JSX structure */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-primary">
            location_on
          </span>

          <div className="min-w-0">
            <div className="text-xs font-semibold text-on-surface truncate">
              {selectedLocationLabel}
            </div>

            <div className="text-[10px] text-on-surface-variant">
              Station camera assignments are demonstration placeholders; no
              official CCTV inventory or live stream is connected.
            </div>
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-outline-variant/30 bg-surface-container-high px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-on-surface-variant">
          Demo configuration
        </span>
      </div>

      {/* Image and video detection */}
      <section className="bg-surface-container-low rounded-xl border border-outline-variant/30 p-space-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-headline-sm text-on-surface text-base font-semibold">
              Image &amp; Video Detection
            </h2>

            <p className="text-xs text-on-surface-variant mt-1">
              Upload a railway image or MP4 video. Videos are sampled by the
              backend for detections.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,.mp4"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface text-xs font-semibold border border-outline-variant/30 cursor-pointer"
            >
              Upload Image / MP4
            </button>

            <button
              type="button"
              onClick={runDetection}
              disabled={!selectedFile || detecting}
              className="px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 text-on-primary text-xs font-semibold cursor-pointer"
            >
              {detecting
                ? 'Processing...'
                : `Run ${uploadKind === 'video' ? 'Video' : 'Image'} Detection`}
            </button>

            {selectedFile && (
              <button
                type="button"
                onClick={clearDetection}
                className="px-3 py-2 rounded-lg bg-surface-container-high text-on-surface-variant text-xs font-semibold border border-outline-variant/30 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {!selectedFile || !previewUrl ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[140px] rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-lowest hover:border-primary/60 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-4xl text-outline">
              cloud_upload
            </span>

            <span className="text-sm font-semibold text-on-surface">
              Select an image or MP4 video
            </span>

            <span className="text-xs text-on-surface-variant">
              Images: JPG, JPEG, PNG, WEBP Â· Video: MP4
            </span>
          </button>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-center">
                {uploadKind === 'video' ? (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={previewUrl}
                      alt="Selected railway image"
                      className="w-full h-full object-contain"
                      onLoad={(event) => {
                        setImageDimensions({
                          width: event.currentTarget.naturalWidth || 1,
                          height: event.currentTarget.naturalHeight || 1,
                        });
                      }}
                    />

                    {overlayActive &&
                      detectionResults.map((detection, index) => {
                        if (
                          !detection.bounding_box ||
                          detection.bounding_box.length < 4
                        ) {
                          return null;
                        }

                        const [x1, y1, x2, y2] = detection.bounding_box;

                        return (
                          <div
                            key={`${detection.object}-${index}`}
                            className="absolute border-2 border-error pointer-events-none"
                            style={{
                              left: `${(x1 / imageDimensions.width) * 100}%`,
                              top: `${(y1 / imageDimensions.height) * 100}%`,
                              width: `${
                                ((x2 - x1) / imageDimensions.width) * 100
                              }%`,
                              height: `${
                                ((y2 - y1) / imageDimensions.height) * 100
                              }%`,
                            }}
                          >
                            <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-error px-2 py-0.5 text-[10px] font-bold text-white">
                              {detection.object} Â·{' '}
                              {(Number(detection.confidence) * 100).toFixed(1)}
                              %
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}

                {detecting && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-semibold">
                    Processing {uploadKind}â€¦ please wait
                  </div>
                )}
              </div>

              <p className="mt-2 text-xs text-outline truncate">
                {selectedFile.name} Â·{' '}
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>

              {videoInfo && (
                <div className="mt-2 text-xs text-on-surface-variant flex flex-wrap gap-3">
                  <span>
                    Duration:{' '}
                    {videoDuration.toFixed(1)}s
                  </span>

                  <span>
                    Frames processed:{' '}
                    {String(videoInfo.processed_frames ?? 'â€”')}
                  </span>

                  <span>
                    FPS: {String(videoInfo.fps ?? 'â€”')}
                  </span>
                </div>
              )}
            </div>

            {/* Detection results panel */}
            <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/20 p-3 h-fit lg:max-h-[480px] flex flex-col min-h-0">
              <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
                <span className="text-xs font-semibold text-on-surface">
                  Detection Results
                </span>

                <span className="text-[10px] font-data-mono-sm text-outline">
                  {detectionResults.length} OBJECTS
                </span>
              </div>

              {detectionError && (
                <div className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-xs text-error mb-3 shrink-0">
                  {detectionError}
                </div>
              )}

              {!detectionError &&
                detectionResults.length === 0 &&
                !detecting && (
                  <div className="min-h-[120px] flex flex-col items-center justify-center text-center gap-2">
                    <span className="text-xs text-on-surface-variant">
                      No detection results yet.
                    </span>

                    <span className="text-[10px] text-outline">
                      Click Run{' '}
                      {uploadKind === 'video' ? 'Video' : 'Image'} Detection.
                    </span>
                  </div>
                )}

              {detectionResults.length > 0 && (
                <div className="space-y-2 overflow-y-auto min-h-0 pr-1">
                  {(showAllResults
                    ? detectionResults
                    : detectionResults.slice(0, 4)
                  ).map((detection, index) => (
                    <div
                      key={`${detection.object}-${index}`}
                      className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-on-surface">
                          {detection.object}
                        </span>

                        <span className="text-[10px] text-primary font-semibold">
                          {(Number(detection.confidence) * 100).toFixed(1)}%
                        </span>
                      </div>

                      {uploadKind === 'video' && (
                        <div className="mt-1 text-[10px] text-outline">
                          Frame {detection.frame ?? 'â€”'} Â·{' '}
                          {detection.timestamp_seconds != null
                            ? `${Number(
                                detection.timestamp_seconds
                              ).toFixed(2)}s`
                            : 'timestamp unavailable'}
                        </div>
                      )}

                      {detection.bounding_box && (
                        <div className="text-[10px] text-outline mt-1">
                          BOX: [
                          {detection.bounding_box
                            .map((value) => Number(value).toFixed(0))
                            .join(', ')}
                          ]
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {detectionResults.length > 4 && (
                <button
                  type="button"
                  onClick={() =>
                    setShowAllResults((current) => !current)
                  }
                  className="mt-3 w-full rounded-lg border border-outline-variant/30 bg-surface-container-high px-3 py-2 text-xs font-semibold text-primary hover:bg-surface-bright shrink-0"
                >
                  {showAllResults
                    ? 'Show Less'
                    : `Show All ${detectionResults.length} Results`}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Selected detection and incident actions */}
      <section className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/40 flex flex-col md:flex-row md:items-center justify-between gap-space-md shadow-sm">
        <div>
          <span className="font-badge-label uppercase text-outline">
            SELECTED TARGET
          </span>

          <p className="text-on-surface text-sm mt-1">
            {detectionSummary}
          </p>

          <p className="text-[10px] text-on-surface-variant mt-1">
            Location context: {selectedLocationLabel}
          </p>

          {savedDetectionId && createdAlerts.length === 0 && (
            <p className="text-[10px] text-on-surface-variant mt-1">
              Detection saved, but no alert IDs were returned. An incident
              dossier cannot be opened from this result.
            </p>
          )}
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            type="button"
            disabled={!canCreateDossier}
            onClick={openIncidentDossier}
            className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold border border-outline-variant/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Create Incident Dossier
          </button>

          <button
            type="button"
            disabled={detectionResults.length === 0 || detecting}
            onClick={handleMarkFalsePositive}
            title="This is a UI-only acknowledgement and is not saved to the backend."
            className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface-variant text-xs border border-outline-variant/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {falsePositiveMarked
              ? 'Marked in this view'
              : 'Mark False Positive'}
          </button>
        </div>
      </section>

      {/* CCTV grid */}
      {layoutMode === 'spotlight' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-3 bg-surface-container-low rounded-xl p-3 border border-outline-variant/30">
            {selectedCam ? (
              <>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-semibold text-on-surface">
                      {cameraDisplayName(
                        Math.max(
                          0,
                          cameras.findIndex(
                            (camera) => camera.id === selectedCam.id
                          )
                        )
                      )}
                    </div>

                    <div className="text-xs text-on-surface-variant mt-1">
                      {cameraDisplayLocation(
                        Math.max(
                          0,
                          cameras.findIndex(
                            (camera) => camera.id === selectedCam.id
                          )
                        )
                      )}
                    </div>
                  </div>

                  <span className="rounded-full border border-outline-variant/30 bg-surface-container-high px-2.5 py-1 text-[10px] uppercase tracking-wider text-on-surface-variant">
                    Configured Â· stream unavailable
                  </span>
                </div>

                <div className="w-full min-h-[220px] md:min-h-[280px] rounded-lg border border-dashed border-primary/30 bg-[#041321] flex flex-col items-center justify-center gap-2 text-center px-4">
                  <div className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                    <span className="material-symbols-outlined text-2xl text-primary">
                      videocam_off
                    </span>
                  </div>

                  <span className="text-sm font-semibold text-on-surface">
                    No live stream connected
                  </span>

                  <span className="max-w-sm text-xs text-on-surface-variant">
                    This camera is configured in the interface, but no video
                    source is connected.
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-on-surface-variant">
                No cameras configured.
              </p>
            )}
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {cameras.map((cam, index) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => setSelectedCameraId(cam.id)}
                className={`w-full rounded-lg border p-2.5 text-left transition-colors ${
                  cam.id === selectedCameraId
                    ? 'border-primary bg-primary/10'
                    : 'border-outline-variant/20 bg-surface-container-low hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl text-primary">
                    videocam_off
                  </span>

                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-on-surface">
                    {cameraDisplayName(index)}
                  </span>
                </div>

                <div className="mt-1 pl-7 text-[10px] text-on-surface-variant">
                  {cameraDisplayLocation(index)} Â· No stream
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          className={`grid gap-3 ${
            layoutMode === '2x2'
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
          }`}
        >
          {cameras
            .slice(0, layoutMode === '2x2' ? 4 : 9)
            .map((cam, index) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => setSelectedCameraId(cam.id)}
                className={`group min-w-0 rounded-xl border p-3 text-left transition-all ${
                  cam.id === selectedCameraId
                    ? 'border-primary ring-1 ring-primary/60 bg-surface-container'
                    : 'border-outline-variant/25 bg-surface-container-low hover:border-primary/40'
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-on-surface">
                      {cameraDisplayName(index)}
                    </div>

                    <div className="mt-1 text-[10px] text-on-surface-variant">
                      {cameraDisplayLocation(index)}
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full border border-outline-variant/30 bg-surface-container-high px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Configured
                  </span>
                </div>

                <div className="relative flex min-h-[132px] flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed border-outline-variant/30 bg-[#041321] px-3 py-4 sm:min-h-[148px]">
                  <div className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <span className="material-symbols-outlined text-xl text-primary">
                      videocam_off
                    </span>
                  </div>

                  <span className="text-xs font-medium text-on-surface-variant">
                    No live stream connected
                  </span>

                  <span className="text-[10px] text-outline">
                    Video source unavailable
                  </span>

                  {overlayActive && cam.hasActiveHazard && (
                    <span className="absolute right-2 top-2 rounded-md border border-error/30 bg-error/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-error">
                      Demo hazard marker
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-on-surface-variant">
                  <span>{cameraDisplayLocation(index)}</span>
                  <span>FPS unavailable</span>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
