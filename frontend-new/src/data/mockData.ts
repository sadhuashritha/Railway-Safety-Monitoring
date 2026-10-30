import { Incident, SafetyAlert, CameraFeed, DetectionEvent } from '../types';

export const LOGO_URL = "/railwatch-logo.svg";
export const USER_AVATAR_URL = "/avatar.svg";
export const PRIORITY_FEED_IMAGE = "https://lh3.googleusercontent.com/aida-public/AB6AXuASuJNeOxjgpU5cdTpd9sJFsfzGIo-T_kzwkXWDybpKmSecP77zvCRoAWQTBUQYzgOsCnBGHnihWlSZpdFLLp17G_Ysx2zeuNWVJfSQXbaqabFPzqcD9aErzDb0NZZ1sdkYcO1tz_zltpNFgvUj1Cwr-jNWjb1isP4A2xywWF2CM5TySbeO0_-HcSkGSIVA5I4v3k977nRvNyioWSjE8JcrKnuh4n9ACeXreQxFiufnlqY1cobCxO4Obw";

export const INITIAL_INCIDENTS: Incident[] = [
  {
    id: "INC-9402",
    title: "Grade Crossing 44B Track Fouling",
    priority: "P1",
    priorityLabel: "P1 CRITICAL",
    slaRemaining: "12m rem",
    status: "En Route",
    hazardDescription: "Foreign Object (Stalled Pickup) & Pedestrian",
    location: "Oak Ridge X-ing",
    milepost: "MP 44.20",
    cameraSensor: "CAM-105-PTZ 30 FPS Stream",
    detectionTimestamp: "14:22:08 UTC (10 mins ago)",
    verifiedSource: "AI Engine + Ashritha Patel (Safety Desk Verified)",
    imageSnapshot: PRIORITY_FEED_IMAGE,
    crossTrackFouling: "100% Occlusion",
    sectorSpeedLimit: "55 MPH (Restricted)",
    inboundTrain: {
      trainNumber: "Freight #4402",
      eta: "4m 12s",
      speed: "42 mph",
      distance: "2.9 mi"
    },
    dispatchedUnit: {
      name: "Squad 3",
      lead: "Marcus Thorne",
      driver: "Tyler Kowalski (Unit 3A)",
      equipment: "Squad 3 (Heavy Winch Truck)",
      telemetricStatus: "ETA 4 mins (1.8 miles)",
      eta: "4 mins",
      gps: "En route via State Route 9 / Old Rail Road",
      interventionProtocol: "Winch push clear of envelope. Inspect rail heads for structural scoring."
    },
    timeline: [
      {
        time: "14:22:08 UTC",
        title: "YOLO Edge Vision detected stalled vehicle on Grade Crossing 44B",
        detail: "Bounding box generated • 92% confidence score • Alert flagged to desk",
        type: "detection"
      },
      {
        time: "14:22:24 UTC",
        title: "Safety Officer Ashritha verified True Positive",
        detail: "Automated slow-speed advisory transmitted to approaching Freight Cab #4402 (Dist: 6.4 mi)",
        type: "verification"
      },
      {
        time: "14:23:00 UTC",
        title: "Incident #INC-9402 logged. Maintenance Squad 3 auto-dispatched",
        detail: "Marcus Thorne assigned lead • Heavy Winch Unit deployed from Depot 2",
        type: "dispatch"
      },
      {
        time: "14:28:15 UTC",
        title: "Squad 3 acknowledged dispatch & telemetry link established",
        detail: "Real-time mobile tracking synchronized. ETA updating dynamically",
        type: "telemetry"
      }
    ],
    resolutionNotes: "Vehicle towed beyond right-of-way marker. Track visual check complete. Tie structural alignment verified safe for 55 MPH nominal freight passage."
  },
  {
    id: "INC-9389",
    title: "Tree Branch on Catenary Clearance",
    priority: "P2",
    priorityLabel: "P2 HIGH",
    slaRemaining: "48m rem",
    status: "Crew On-Site Active",
    hazardDescription: "Electrical Arching Risk & Overhead Clearance",
    location: "Milepost 184.2 Curve",
    milepost: "MP 184.20",
    cameraSensor: "CAM-128-STATIC 60 FPS",
    detectionTimestamp: "14:14:10 UTC (18 mins ago)",
    verifiedSource: "Optical Sensor Cluster + Ground Sub-station 4",
    imageSnapshot: "https://images.unsplash.com/photo-1541427468627-a89a96e5ca1d?auto=format&fit=crop&w=1200&q=80",
    crossTrackFouling: "35% Overhead Envelope",
    sectorSpeedLimit: "40 MPH (Slow Order)",
    dispatchedUnit: {
      name: "Tree Clearing Unit 2",
      lead: "Darren Boyd",
      driver: "Gary Jenkins",
      equipment: "Insulated Boom Bucket #07",
      telemetricStatus: "On-Site (Bucket Deployed)",
      eta: "0 mins (On-Site)",
      gps: "MP 184.2 Wayside Access Rd",
      interventionProtocol: "Depower catenary zone 4B. Lop branch 2m clear of tension wire. Restore feeder."
    },
    timeline: [
      {
        time: "14:14:10 UTC",
        title: "Edge Vision flagged high wind catenary vibration & branch sag",
        detail: "Clearance gap calculated at 0.8m below statutory safety threshold (Wind gust 34kts)",
        type: "detection"
      },
      {
        time: "14:16:02 UTC",
        title: "Power Dispatch & Track Safety notified",
        detail: "Slow order placed on Track 1 & 2 between MP 183 and 185",
        type: "verification"
      },
      {
        time: "14:21:40 UTC",
        title: "Tree Clearing Unit 2 arrived on location",
        detail: "Bucket arm deployed for manual pruning with fiberglass insulated pole pruner",
        type: "mitigation"
      }
    ],
    resolutionNotes: "Catenary wire inspected for scorch marks. 4-inch oak branch removed and stowed in brush truck. Line re-energized."
  },
  {
    id: "INC-9377",
    title: "Livestock Herd Near Perimeter Fence",
    priority: "P3",
    priorityLabel: "P3 MEDIUM",
    slaRemaining: "Resolved",
    status: "Resolved & Cleared",
    hazardDescription: "Intrusion breach boundary at MP 12.8",
    location: "Siding South Meadow",
    milepost: "MP 12.80",
    cameraSensor: "CAM-032-THERMAL",
    detectionTimestamp: "12:54:19 UTC (1h 38m ago)",
    verifiedSource: "Thermal AI Edge Ingest",
    imageSnapshot: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=1200&q=80",
    crossTrackFouling: "0% (Perimeter Buffer)",
    sectorSpeedLimit: "60 MPH (Nominal)",
    dispatchedUnit: {
      name: "Ranger Post 04",
      lead: "Sarah Lin",
      driver: "K. Vance",
      equipment: "All-Terrain Utility Rig 4",
      telemetricStatus: "Cleared & Back to Station",
      eta: "Completed (13:10 UTC)",
      gps: "Ranger Station West",
      interventionProtocol: "Herd cattle back past fence easement. Secure broken wire fence latch."
    },
    timeline: [
      {
        time: "12:54:19 UTC",
        title: "Thermal sensor detected 6 warm bodies moving toward boundary fence",
        detail: "AI classified as Bovine with 96.1% confidence",
        type: "detection"
      },
      {
        time: "13:02:11 UTC",
        title: "Local Rancher & Ranger Post 04 contacted",
        detail: "Livestock turned back into pasture before entering track ballast boundary",
        type: "mitigation"
      },
      {
        time: "13:10:00 UTC",
        title: "Perimeter boundary secured and verified via CAM-032",
        detail: "Incident closed with zero operational delays",
        type: "verification"
      }
    ],
    resolutionNotes: "Broken perimeter gate chain replaced by ranch owner. Cameras confirmed cattle moved 150m south of line.",
    verifiedSafe: true
  },
  {
    id: "INC-9351",
    title: "Discarded Ballast Sheeting",
    priority: "P4",
    priorityLabel: "P4 LOW",
    slaRemaining: "Archived",
    status: "Archived",
    hazardDescription: "Loose industrial plastic near siding rails",
    location: "North Spur Yard Switch",
    milepost: "MP 08.40",
    cameraSensor: "CAM-019-YARD-NORTH",
    detectionTimestamp: "09:30:15 UTC (5h ago)",
    verifiedSource: "Stationary Track Cam 19",
    imageSnapshot: "https://images.unsplash.com/photo-1509749837427-ac94a2553d0e?auto=format&fit=crop&w=1200&q=80",
    crossTrackFouling: "Negligible (Side Berm)",
    sectorSpeedLimit: "Nominal",
    dispatchedUnit: {
      name: "Section Gang 1",
      lead: "Tom Hernandez",
      equipment: "Maintenance Handcart",
      telemetricStatus: "Cleared Shift 1",
      eta: "Completed",
      gps: "Main Yard Depot",
      interventionProtocol: "Remove windblown polyethylene tarp from switch frogs."
    },
    timeline: [
      {
        time: "09:30:15 UTC",
        title: "Debris classification triggered on rail side ditch",
        detail: "Assessed as non-derailment risk",
        type: "detection"
      },
      {
        time: "10:15:00 UTC",
        title: "Cleared by Section Gang 1 during scheduled line walk",
        detail: "No damage to switches or track geometry",
        type: "mitigation"
      }
    ],
    resolutionNotes: "Tarp gathered and discarded. Track switch test cycling completed with no mechanical interference."
  }
];

export const INITIAL_SAFETY_ALERTS: SafetyAlert[] = [
  {
    id: "INC-9402",
    type: "CRITICAL",
    title: "Stalled Vehicle on Track 1",
    milepost: "Milepost 44B Crossing",
    description: "Pickup truck stalled angled across inner tracks with occupant near ballast shoulder.",
    detectedTimeAgo: "4m ago",
    assignedTo: "Maint Squad 3",
    actionStatus: "Open Incident",
    slaExpiring: "16m",
    icon: "car_crash",
    resolved: false
  },
  {
    id: "INC-9389",
    type: "HIGH RISK",
    title: "Tree Limb Near Outer Catenary",
    milepost: "Milepost 184.2 Curve",
    description: "Clearance gap: 0.8m (Wind gust 34kts). High risk of electrical arcing.",
    detectedTimeAgo: "18m ago",
    assignedTo: "Tree Clearing Unit 2",
    actionStatus: "Power Dispatch Notified",
    icon: "forest",
    resolved: false
  },
  {
    id: "ALT-842",
    type: "CAUTION",
    title: "Person Walking Near Right-of-Way",
    milepost: "Milepost 77 Siding",
    description: "Walking south parallel to Track 2 within 1.5m foul envelope.",
    detectedTimeAgo: "25m ago",
    actionStatus: "Automated Horn Sounded",
    icon: "directions_walk",
    resolved: false
  },
  {
    id: "ALT-840",
    type: "CAUTION",
    title: "Grade Crossing Barrier Arm Delay",
    milepost: "Milepost 91.4 River Road",
    description: "Sensor telemetry indicates barrier descent 3.2s slower than nominal curve.",
    detectedTimeAgo: "34m ago",
    actionStatus: "Technician Dispatched",
    icon: "warning",
    resolved: false
  },
  {
    id: "ALT-838",
    type: "INFO",
    title: "Ballast Thermistor Temperature Elevation",
    milepost: "Milepost 112.0 Sunken Cut",
    description: "Rail steel expansion reading 48°C (Threshold 52°C for heat order).",
    detectedTimeAgo: "52m ago",
    actionStatus: "Thermal Logging Active",
    icon: "speed",
    resolved: true
  }
];

export const CAMERA_FEEDS: CameraFeed[] = [
  {
    id: "CAM-105-MP44B-EAST",
    shortName: "CAM-105 MP44B Grade Crossing",
    milepost: "MP 44.20",
    locationName: "Main Line North • Grade X-ing",
    sector: "Corridor North Demo Zone (Milepost 40 - 55)",
    fps: 59.8,
    fov: "112°",
    status: "ONLINE",
    hasActiveHazard: true,
    hazardType: "VEHICLE_OBSTACLE (Stalled Pickup) + PEDESTRIAN",
    confidence: 94.2,
    image: PRIORITY_FEED_IMAGE,
    resolution: "4K (3840x2160)",
    latencyMs: 4,
    lastDetection: "14:32:19 UTC",
    ptzSupport: true
  },
  {
    id: "CAM-106-MP48.2-CURVE",
    shortName: "CAM-106 MP48.2 Highball Curve",
    milepost: "MP 48.20",
    locationName: "Eastbound Cantilever Portal",
    sector: "Corridor North Demo Zone (Milepost 40 - 55)",
    fps: 60.0,
    fov: "96°",
    status: "ONLINE",
    hasActiveHazard: false,
    image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=80",
    resolution: "1080p (1920x1080)",
    latencyMs: 6,
    lastDetection: "Nominal track",
    ptzSupport: true
  },
  {
    id: "CAM-107-MP51.0-YARD",
    shortName: "CAM-107 MP51.0 Marshall Freight Yard",
    milepost: "MP 51.00",
    locationName: "Classification Yard Throat",
    sector: "Corridor North Demo Zone (Milepost 40 - 55)",
    fps: 58.9,
    fov: "120°",
    status: "ONLINE",
    hasActiveHazard: false,
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
    resolution: "1080p (1920x1080)",
    latencyMs: 5,
    lastDetection: "Switch Clear",
    ptzSupport: false
  },
  {
    id: "CAM-108-MP53.7-OVERPASS",
    shortName: "CAM-108 MP53.7 Catenary Overpass",
    milepost: "MP 53.70",
    locationName: "Highway 12 Overpass Gantry",
    sector: "Corridor North Demo Zone (Milepost 40 - 55)",
    fps: 59.4,
    fov: "104°",
    status: "ONLINE",
    hasActiveHazard: false,
    image: "https://images.unsplash.com/photo-1541427468627-a89a96e5ca1d?auto=format&fit=crop&w=1200&q=80",
    resolution: "1440p (2560x1440)",
    latencyMs: 4,
    lastDetection: "Overhead nominal",
    ptzSupport: true
  },
  {
    id: "CAM-109-MP60.1-TUNNEL",
    shortName: "CAM-109 MP60.1 Blackwood Portal",
    milepost: "MP 60.10",
    locationName: "Tunnel Approach West",
    sector: "Mountain Pass Catenary",
    fps: 60.0,
    fov: "88°",
    status: "ONLINE",
    hasActiveHazard: false,
    image: "https://images.unsplash.com/photo-1509749837427-ac94a2553d0e?auto=format&fit=crop&w=1200&q=80",
    resolution: "1080p (1920x1080)",
    latencyMs: 7,
    lastDetection: "Clear Portal",
    ptzSupport: true
  },
  {
    id: "CAM-110-MP64.8-BRIDGE",
    shortName: "CAM-110 MP64.8 Clearwater Trestle",
    milepost: "MP 64.80",
    locationName: "River Truss Span North",
    sector: "Mountain Pass Catenary",
    fps: 0,
    fov: "110°",
    status: "OFFLINE",
    hasActiveHazard: false,
    image: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=1200&q=80",
    resolution: "1080p (1920x1080)",
    latencyMs: 0,
    lastDetection: "Connection lost 12m ago",
    ptzSupport: true
  }
];

export const DETECTION_HISTORY_DATA: DetectionEvent[] = [
  {
    id: "DET-84910",
    timestamp: "14:32:19 UTC",
    cameraId: "CAM-105-MP44B-EAST",
    milepost: "MP 44.20",
    objectClass: "VEHICLE_OBSTACLE",
    confidence: 94.2,
    riskScore: 98,
    actionTaken: "Incident Logged & Cab Alert #4402 Pushed",
    verified: true
  },
  {
    id: "DET-84909",
    timestamp: "14:32:19 UTC",
    cameraId: "CAM-105-MP44B-EAST",
    milepost: "MP 44.20",
    objectClass: "PEDESTRIAN",
    confidence: 87.1,
    riskScore: 92,
    actionTaken: "Foul Zone Alert Verified",
    verified: true
  },
  {
    id: "DET-84882",
    timestamp: "14:14:10 UTC",
    cameraId: "CAM-128-STATIC",
    milepost: "MP 184.20",
    objectClass: "TREE_BRANCH",
    confidence: 91.8,
    riskScore: 84,
    actionTaken: "Crew Dispatched & Power Dispatch Notified",
    verified: true
  },
  {
    id: "DET-84851",
    timestamp: "14:07:05 UTC",
    cameraId: "CAM-077-SIDING",
    milepost: "MP 77.00",
    objectClass: "PEDESTRIAN",
    confidence: 89.4,
    riskScore: 68,
    actionTaken: "Automated Wayside Horn Triggered",
    verified: true
  },
  {
    id: "DET-84720",
    timestamp: "12:54:19 UTC",
    cameraId: "CAM-032-THERMAL",
    milepost: "MP 12.80",
    objectClass: "LIVESTOCK",
    confidence: 96.1,
    riskScore: 72,
    actionTaken: "Ranger Contacted, Livestock Gathered",
    verified: true
  },
  {
    id: "DET-84611",
    timestamp: "11:20:44 UTC",
    cameraId: "CAM-105-MP44B-EAST",
    milepost: "MP 44.20",
    objectClass: "VEHICLE_OBSTACLE",
    confidence: 52.3,
    riskScore: 18,
    actionTaken: "Auto-dismissed (Bird / Camera Glare)",
    verified: false
  },
  {
    id: "DET-84502",
    timestamp: "09:30:15 UTC",
    cameraId: "CAM-019-YARD-NORTH",
    milepost: "MP 08.40",
    objectClass: "DEBRIS",
    confidence: 88.5,
    riskScore: 45,
    actionTaken: "Section Gang 1 Routine Pickup",
    verified: true
  }
];
