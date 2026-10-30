from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Depends
)

from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

from pydantic import BaseModel
from typing import Literal
from location_router import build_location_router
import io
import os
import hashlib
import secrets
import cv2
import tempfile
from datetime import datetime, timezone


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv(".env", override=False)

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI is not set in backend/.env")


# =========================================================
# MONGODB
# =========================================================

client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=10000
)

database = client["railway_safety"]

detections_collection = database["detections"]
alerts_collection = database["alerts"]
incidents_collection = database["incidents"]
users_collection = database["users"]


try:
    client.admin.command("ping")
    print("MongoDB connected successfully!")
except Exception as e:
    print("MongoDB connection failed:", e)


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="Railway Safety Monitoring API",
    description="AI-powered railway hazard detection backend",
    version="1.0.0"
)
app.include_router(
    build_location_router(database),
    prefix="/api"
)

# =========================================================
# CORS
# =========================================================

frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# YOLO MODEL
# =========================================================

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "runs",
    "railway_yolo11n_6class_v1",
    "weights",
    "best.pt"
)
if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Trained railway model not found: {MODEL_PATH}")

print("Loading trained railway model:", MODEL_PATH)
model = YOLO(MODEL_PATH)

print("Trained railway model loaded successfully!")
print("Model classes:", model.names)


# =========================================================
# RISK RULES
# =========================================================
#
# IMPORTANT:
# These are APPLICATION rules, not YOLO predictions.
#
# The backend now uses the trained railway-specific YOLO model.
# These rules map model detections to application-level risk.
#
# Each object can have:
# - risk level
# - minimum confidence
# - human-readable message
#
# =========================================================

RISK_RULES = {

    # Current generic YOLO class
    "person": {
        "risk_level": "MEDIUM",
        "min_confidence": 0.60,
        "message": (
            "Potential human presence detected. "
            "Operator verification is required."
        )
    },

    # Generic animal classes
    "horse": {
        "risk_level": "HIGH",
        "min_confidence": 0.60,
        "message": (
            "Animal presence detected. "
            "Potential track obstruction requires verification."
        )
    },

    "cow": {
        "risk_level": "HIGH",
        "min_confidence": 0.60,
        "message": (
            "Animal presence detected. "
            "Potential track obstruction requires verification."
        )
    },

    "dog": {
        "risk_level": "MEDIUM",
        "min_confidence": 0.60,
        "message": (
            "Animal detected. "
            "Operator verification is recommended."
        )
    },

    "cat": {
        "risk_level": "MEDIUM",
        "min_confidence": 0.60,
        "message": (
            "Animal detected. "
            "Operator verification is recommended."
        )
    },

    # Vehicle classes
    "car": {
        "risk_level": "MEDIUM",
        "min_confidence": 0.65,
        "message": (
            "Vehicle detected near the monitored area. "
            "Operator verification is recommended."
        )
    },

    "truck": {
        "risk_level": "HIGH",
        "min_confidence": 0.60,
        "message": (
            "Large vehicle detected. "
            "Potential track-area obstruction requires verification."
        )
    },

    "bus": {
        "risk_level": "HIGH",
        "min_confidence": 0.60,
        "message": (
            "Large vehicle detected. "
            "Potential track-area obstruction requires verification."
        )
    },

    "motorcycle": {
        "risk_level": "MEDIUM",
        "min_confidence": 0.60,
        "message": (
            "Motorcycle detected. "
            "Operator verification is recommended."
        )
    },

    "bicycle": {
        "risk_level": "MEDIUM",
        "min_confidence": 0.60,
        "message": (
            "Bicycle detected. "
            "Operator verification is recommended."
        )
    },

    # Railway-specific classes used by the trained model
    "fallen_tree": {
        "risk_level": "HIGH",
        "min_confidence": 0.60,
        "message": (
            "Possible fallen tree detected on or near the railway track."
        )
    },

    "rock": {
        "risk_level": "HIGH",
        "min_confidence": 0.60,
        "message": (
            "Possible rock or large obstacle detected near the track."
        )
    },

    "obstacle": {
        "risk_level": "HIGH",
        "min_confidence": 0.60,
        "message": (
            "Potential track obstruction detected."
        )
    },

    "animal": {
        "risk_level": "HIGH",
        "min_confidence": 0.60,
        "message": (
            "Possible animal detected in the monitored railway area."
        )
    },

    "human": {
        "risk_level": "HIGH",
        "min_confidence": 0.60,
        "message": (
            "Possible unauthorized human presence detected."
        )
    },

    # Railway-specific trained model class.
    "foreign_object": {
        "risk_level": "HIGH",
        "min_confidence": 0.60,
        "message": (
            "Foreign object detected on or near the railway track. "
            "Operator verification is required."
        )
    },

        "tree": {
        "risk_level": "MEDIUM",
        "min_confidence": 0.60,
        "message": (
            "Tree detected in the monitored railway scene. "
            "Verify whether it obstructs the track."
        )
    },

    "trash": {
        "risk_level": "MEDIUM",
        "min_confidence": 0.60,
        "message": (
            "Trash or debris detected in the monitored railway scene. "
            "Verify whether it obstructs the track."
        )
    },
}


# =========================================================
# HELPER — CREATE ALERTS
# =========================================================

def user_attribution_metadata(user: dict | None) -> dict:
    """Return non-secret attribution fields for new detection records."""
    if not user:
        return {"created_by_type": "SYSTEM", "created_by_name": "AI Detection System"}

    user_id = user.get("_id") or user.get("user_id")
    return {
        "created_by_user_id": str(user_id) if user_id is not None else None,
        "created_by_name": user.get("name") or user.get("full_name") or user.get("email") or "Unknown user",
        "created_by_email": user.get("email"),
        "created_by_role": user.get("role"),
        "created_by_type": "AUTHENTICATED_UPLOAD",
    }


def create_alerts_for_detections(
    detection_record_id,
    filename,
    source_type,
    detections,
    location_metadata=None,
    attribution_metadata=None
):
    """
    Creates ONE alert per relevant object type.

    We intentionally do NOT create one alert for every
    video-frame detection because a 15-second video may
    contain hundreds of detections of the same person.

    Instead:
        person detected 868 times
        ↓
        ONE person alert

    This prevents alert flooding.
    """

    if not detections:
        return []


    # Store highest confidence for each object.
    highest_confidence_by_object = {}

    for detection in detections:

        object_name = str(
            detection.get("object", "")
        ).lower()

        confidence = float(
            detection.get("confidence", 0)
        )

        if object_name not in highest_confidence_by_object:

            highest_confidence_by_object[
                object_name
            ] = confidence

        else:

            highest_confidence_by_object[
                object_name
            ] = max(
                highest_confidence_by_object[
                    object_name
                ],
                confidence
            )


    created_alerts = []


    for object_name, confidence in (
        highest_confidence_by_object.items()
    ):

        rule = RISK_RULES.get(object_name)

        # Object is not configured as a hazard.
        if not rule:
            continue

        # Confidence too low.
        if confidence < rule["min_confidence"]:
            continue


        now = datetime.now(timezone.utc)

        alert_record = {

            "detection_record_id": str(
                detection_record_id
            ),

            **(location_metadata or {}),
            **(attribution_metadata or {}),
            "filename": filename,

            "source_type": source_type,

            "hazard_type": object_name,

            "risk_level": rule["risk_level"],

            "confidence": round(
                confidence,
                2
            ),

            "message": rule["message"],

            "status": "NEW",

            "created_at": now,

            "updated_at": now,

            "acknowledged_at": None,

            "resolved_at": None,
        }


        result = alerts_collection.insert_one(
            alert_record
        )


        created_alerts.append({
            "id": str(result.inserted_id),
            "hazard_type": object_name,
            "risk_level": rule["risk_level"],
            "confidence": round(
                confidence,
                2
            ),
            "status": "NEW",
            "message": rule["message"]
        })


    return created_alerts


# =========================================================
# HELPER — SERIALIZE ALERT
# =========================================================

def serialize_alert(alert):

    return {
        "id": str(alert["_id"]),

        "detection_record_id": str(
            alert.get("detection_record_id", "")
        ),
        "state_id": alert.get("state_id"),
        "district_id": alert.get("district_id"),
        "station_id": alert.get("station_id"),
        "created_by_user_id": alert.get("created_by_user_id"),
        "created_by_name": alert.get("created_by_name", "Unknown"),
        "created_by_email": alert.get("created_by_email"),
        "created_by_role": alert.get("created_by_role"),
        "created_by_type": alert.get("created_by_type", "UNKNOWN"),

        "filename": alert.get(
            "filename",
            "-"
        ),

        "source_type": alert.get(
            "source_type",
            "-"
        ),

        "hazard_type": alert.get(
            "hazard_type",
            "-"
        ),

        "risk_level": alert.get(
            "risk_level",
            "LOW"
        ),

        "confidence": alert.get(
            "confidence",
            0
        ),

        "message": alert.get(
            "message",
            ""
        ),

        "status": alert.get(
            "status",
            "NEW"
        ),

        "created_at": (
            alert["created_at"].isoformat()
            if alert.get("created_at")
            else None
        ),

        "updated_at": (
            alert["updated_at"].isoformat()
            if alert.get("updated_at")
            else None
        ),

        "acknowledged_at": (
            alert["acknowledged_at"].isoformat()
            if alert.get("acknowledged_at")
            else None
        ),

        "resolved_at": (
            alert["resolved_at"].isoformat()
            if alert.get("resolved_at")
            else None
        ),
    }


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "message": "Railway Safety API is running!"
    }


security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    user = users_collection.find_one({
        "session_token": token
    })

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token."
        )

    if user.get("approval_status", "APPROVED") != "APPROVED":
        raise HTTPException(
            status_code=403,
            detail="This account is not approved for access."
        )

    # ADMIN accounts do not require an assigned station.
    role = str(user.get("role", "")).upper()

    if role != "ADMIN":
        station_id = user.get("station_id")

        if not station_id:
            raise HTTPException(
                status_code=403,
                detail="No station is assigned to this account. Contact the administrator."
            )

        # Verify that the assigned station exists.
        station = database["rw_stations"].find_one({
            "station_id": station_id
        })

        if not station:
            raise HTTPException(
                status_code=403,
                detail="The assigned station is invalid. Contact the administrator."
            )

    return user


def require_roles(*allowed_roles):
    def role_checker(
        user: dict = Depends(get_current_user)
    ):
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to access this resource."
            )

        return user

    return role_checker


def location_scope(user: dict) -> dict:
    """Mongo query scope for location-bound records. Legacy records without
    location metadata are intentionally hidden from non-admin users."""
    if str(user.get("role", "")).upper() == "ADMIN":
        return {}
    scope = {}
    for field in ("state_id", "district_id", "station_id"):
        value = user.get(field)
        if value:
            scope[field] = value
    # A user with no assigned location must not see operational records.
    return scope if scope else {"_id": {"$exists": False}}


def scoped_record_query(user: dict, extra: dict | None = None) -> dict:
    scope = location_scope(user)
    if not extra:
        return scope
    if not scope:
        return extra
    return {"$and": [scope, extra]}

# =========================================================
# IMAGE DETECTION
# =========================================================

@app.post("/detect")
async def detect(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):

    print("\n==============================")
    print("NEW IMAGE DETECTION REQUEST")
    print("Filename:", file.filename)
    print("==============================")

    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))

        results = model(image, verbose=False)
        detections = []

        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                coordinates = box.xyxy[0].tolist()

                detections.append({
                    "object": result.names[class_id],
                    "confidence": round(confidence, 2),
                    "bounding_box": [round(value, 2) for value in coordinates]
                })

        detected_at = datetime.now(timezone.utc)
        print("DETECTION USER:", user) 

        location_metadata = {
            key: user.get(key)
            for key in ("state_id", "district_id", "station_id")
            if user.get(key)
        }
        attribution_metadata = user_attribution_metadata(user)
        detection_record = {
            **location_metadata,
            **attribution_metadata,
            "filename": file.filename,
            "source_type": "image",
            "detections": detections,
            "total_objects": len(detections),
            "object_names": sorted(list(set(item["object"] for item in detections))),
            "detected_at": detected_at
        }

        # MongoDB is attempted, but a temporary Atlas/TLS failure
        # must not prevent the AI detection result from being shown.
        database_saved = False
        detection_id = None
        alerts = []

        try:
            insert_result = detections_collection.insert_one(detection_record)
            detection_id = str(insert_result.inserted_id)
            database_saved = True

            print("MongoDB DETECTION INSERT SUCCESS!")
            print("Inserted ID:", detection_id)

            alerts = create_alerts_for_detections(
                insert_result.inserted_id,
                file.filename,
                "image",
                detections,
                location_metadata,
                attribution_metadata
            )

            print("Alerts created:", len(alerts))

        except Exception as db_error:
            print("MongoDB SAVE FAILED - RETURNING AI RESULT:")
            print(db_error)

        return {
            "success": True,
            "id": detection_id,
            "filename": file.filename,
            "source_type": "image",
            "detections": detections,
            "alerts": alerts,
            "database_saved": database_saved
        }

    except Exception as e:
        print("IMAGE DETECTION FAILED:", e)
        return {
            "success": False,
            "error": str(e),
            "filename": file.filename,
            "detections": []
        }


# VIDEO DETECTION
# =========================================================

@app.post("/detect-video")
async def detect_video(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):

    print("\n==============================")
    print("NEW VIDEO DETECTION REQUEST")
    print("Filename:", file.filename)
    print("==============================")


    temp_path = None


    try:

        # -------------------------------------------------
        # Save uploaded video temporarily
        # -------------------------------------------------

        suffix = os.path.splitext(
            file.filename or ".mp4"
        )[1]

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp_file:

            temp_path = temp_file.name

            content = await file.read()

            temp_file.write(content)


        # -------------------------------------------------
        # Open video
        # -------------------------------------------------

        cap = cv2.VideoCapture(
            temp_path
        )


        if not cap.isOpened():

            raise RuntimeError(
                "Unable to open uploaded video."
            )


        fps = cap.get(
            cv2.CAP_PROP_FPS
        )

        total_frames = int(
            cap.get(
                cv2.CAP_PROP_FRAME_COUNT
            )
        )


        if fps <= 0:
            fps = 30.0


        duration_seconds = (
            total_frames / fps
            if total_frames > 0
            else 0
        )


        # -------------------------------------------------
        # Process approximately every 10th frame.
        #
        # This keeps processing manageable while still
        # sampling the uploaded video.
        # -------------------------------------------------

        frame_interval = 10

        frame_index = 0

        processed_frames = 0

        total_detections = 0

        highest_confidence = 0.0

        object_counts = {}

        all_detections = []


        # -------------------------------------------------
        # Read video
        # -------------------------------------------------

        while True:

            success, frame = cap.read()

            if not success:
                break


            if (
                frame_index %
                frame_interval
                == 0
            ):

                processed_frames += 1


                results = model(
                    frame,
                    verbose=False
                )


                timestamp_seconds = (
                    frame_index / fps
                )


                for result in results:

                    for box in result.boxes:

                        class_id = int(
                            box.cls[0]
                        )

                        confidence = float(
                            box.conf[0]
                        )

                        coordinates = (
                            box.xyxy[0].tolist()
                        )


                        object_name = (
                            result.names[
                                class_id
                            ]
                        )


                        total_detections += 1


                        highest_confidence = max(
                            highest_confidence,
                            confidence
                        )


                        object_counts[
                            object_name
                        ] = (
                            object_counts.get(
                                object_name,
                                0
                            ) + 1
                        )


                        all_detections.append({

                            "object": object_name,

                            "confidence": round(
                                confidence,
                                2
                            ),

                            "bounding_box": [
                                round(
                                    value,
                                    2
                                )
                                for value
                                in coordinates
                            ],

                            "frame": frame_index,

                            "timestamp_seconds": round(
                                timestamp_seconds,
                                2
                            )
                        })


            frame_index += 1


        cap.release()


        # -------------------------------------------------
        # Save video detection record
        # -------------------------------------------------

        detected_at = datetime.now(
            timezone.utc
        )
        print("DETECTION USER LOCATION:", {
            "user_id": user.get("user_id") or user.get("_id"),
            "role": user.get("role"),
            "state_id": user.get("state_id"),
            "district_id": user.get("district_id"),
            "station_id": user.get("station_id"),
        })

        location_metadata = {
            key: user.get(key)
            for key in ("state_id", "district_id", "station_id")
            if user.get(key)
        }
        attribution_metadata = user_attribution_metadata(user)

        detection_record = {
            **location_metadata,
            **attribution_metadata,
            "filename": file.filename,

            "source_type": "video",

            "video_info": {

                "total_frames":
                    total_frames,

                "processed_frames":
                    processed_frames,

                "fps": round(
                    fps,
                    2
                ),

                "duration_seconds":
                    round(
                        duration_seconds,
                        2
                    )
            },

            "object_counts":
                object_counts,

            "total_detections":
                total_detections,

            "highest_confidence":
                round(
                    highest_confidence,
                    2
                ),

            "detections":
                all_detections,

            "total_objects":
                total_detections,

            "object_names":
                sorted(
                    list(
                        object_counts.keys()
                    )
                ),

            "detected_at":
                detected_at
        }


        insert_result = (
            detections_collection.insert_one(
                detection_record
            )
        )


        print(
            "MongoDB VIDEO INSERT SUCCESS!"
        )

        print(
            "Inserted ID:",
            insert_result.inserted_id
        )


        # -------------------------------------------------
        # Create alerts.
        #
        # We only need one representative
        # detection per object type for alert creation.
        # -------------------------------------------------

        representative_detections = []


        for object_name in object_counts:

            object_detections = [

                detection

                for detection
                in all_detections

                if detection["object"]
                == object_name
            ]


            if object_detections:

                best_detection = max(
                    object_detections,
                    key=lambda item:
                    item["confidence"]
                )


                representative_detections.append(
                    best_detection
                )


        alerts = create_alerts_for_detections(

            insert_result.inserted_id,

            file.filename,

            "video",

            representative_detections,
            location_metadata,
            attribution_metadata
        )


        print(
            "Alerts created:",
            len(alerts)
        )


        return {

            "success": True,

            "id": str(
                insert_result.inserted_id
            ),

            "filename": file.filename,

            "source_type": "video",

            "video_info": {

                "total_frames":
                    total_frames,

                "processed_frames":
                    processed_frames,

                "fps": round(
                    fps,
                    2
                ),

                "duration_seconds":
                    round(
                        duration_seconds,
                        2
                    )
            },

            "object_counts":
                object_counts,

            "total_detections":
                total_detections,

            "highest_confidence":
                round(
                    highest_confidence,
                    2
                ),

            "detections":
                all_detections,

            "alerts":
                alerts
        }


    except Exception as e:

        print(
            "VIDEO DETECTION FAILED:",
            e
        )

        return {

            "success": False,

            "error": str(e),

            "filename": file.filename
        }


    finally:

        # -------------------------------------------------
        # Delete temporary video
        # -------------------------------------------------

        if temp_path and os.path.exists(
            temp_path
        ):

            try:

                os.remove(
                    temp_path
                )

            except Exception:
                pass




# =========================================================
# DETECTION HISTORY
# =========================================================

@app.get("/history")
def get_history(
    limit: int = 100,
    user: dict = Depends(get_current_user)
):
    try:
        records = list(
            detections_collection
            .find(location_scope(user))
            .sort(
                "detected_at",
                -1
            )
            .limit(limit)
        )

        formatted_records = []

        for record in records:
            detections = record.get("detections", [])

            # Calculate best confidence from stored detections
            max_confidence = 0.0

            if detections:
                max_confidence = max(
                    float(
                        detection.get(
                            "confidence",
                            0
                        )
                    )
                    for detection in detections
                )

            # For video records, highest_confidence
            # is already stored separately.
            if record.get("highest_confidence") is not None:
                max_confidence = max(
                    max_confidence,
                    float(
                        record.get(
                            "highest_confidence",
                            0
                        )
                    )
                )

            formatted_records.append({
                "id": str(
                    record["_id"]
                ),

                "filename": record.get(
                    "filename",
                    "-"
                ),

                "source_type": record.get(
                    "source_type",
                    "-"
                ),

                "object_names": record.get(
                    "object_names",
                    []
                ),

                "total_objects": record.get(
                    "total_objects",
                    record.get(
                        "total_detections",
                        0
                    )
                ),

                "highest_confidence": round(
                    max_confidence,
                    4
                ),

                "detections": detections,

                "detected_at": (
                    record["detected_at"].isoformat()
                    if record.get("detected_at")
                    else None
                )
            })

        return {
            "success": True,
            "records": formatted_records,
            "count": len(formatted_records)
        }

    except Exception as e:
        print(
            "HISTORY ERROR:",
            e
        )

        return {
            "success": False,
            "error": "Unable to load detection history.",
            "records": []
        }

# =========================================================
# ALERTS — GET
# =========================================================

@app.get("/alerts")
def get_alerts(
    status: str = "all",
    risk_level: str = "all",
    limit: int = 100,
    user: dict = Depends(
        require_roles(
            "ADMIN",
            "SAFETY_OFFICER",
            "OPERATOR"
        )
    )
):
    try:

        query = scoped_record_query(user)


        if status != "all":

            query["status"] = (
                status.upper()
            )


        if risk_level != "all":

            query["risk_level"] = (
                risk_level.upper()
            )


        records = list(

            alerts_collection
            .find(query)
            .sort(
                "created_at",
                -1
            )
            .limit(limit)

        )


        alerts = [

            serialize_alert(
                alert
            )

            for alert in records

        ]


        return {

            "success": True,

            "alerts": alerts,

            "count": len(alerts)
        }


    except Exception as e:

        print(
            "ALERT FETCH ERROR:",
            e
        )

        return {

            "success": False,

            "error":
                "Unable to load alerts.",

            "alerts": []
        }


# =========================================================
# ALERT STATISTICS
# =========================================================

@app.get("/alerts/stats")
def get_alert_stats(
   user: dict = Depends(
    require_roles(
        "ADMIN",
        "SAFETY_OFFICER",
        "OPERATOR"
    )
)
):

    try:

        scope = location_scope(user)
        total = alerts_collection.count_documents(scope)

        new = alerts_collection.count_documents(
            scoped_record_query(user, {"status": "NEW"})
        )

        acknowledged = (
            alerts_collection.count_documents(
                scoped_record_query(user, {"status": "ACKNOWLEDGED"})
            )
        )

        in_progress = (
            alerts_collection.count_documents(
                scoped_record_query(user, {"status": "IN_PROGRESS"})
            )
        )

        resolved = alerts_collection.count_documents(
            scoped_record_query(user, {"status": "RESOLVED"})
        )


        high = alerts_collection.count_documents(
            scoped_record_query(user, {"risk_level": "HIGH"})
        )

        medium = alerts_collection.count_documents(
            scoped_record_query(user, {"risk_level": "MEDIUM"})
        )

        low = alerts_collection.count_documents(
            scoped_record_query(user, {"risk_level": "LOW"})
        )


        return {

            "success": True,

            "total": total,

            "by_status": {

                "NEW": new,

                "ACKNOWLEDGED":
                    acknowledged,

                "IN_PROGRESS":
                    in_progress,

                "RESOLVED":
                    resolved
            },

            "by_risk": {

                "HIGH": high,

                "MEDIUM": medium,

                "LOW": low
            }
        }


    except Exception as e:

        print(
            "ALERT STATS ERROR:",
            e
        )

        return {

            "success": False,

            "error":
                "Unable to load alert statistics."
        }


# =========================================================
# ALERT STATUS UPDATE MODEL
# =========================================================

class AlertStatusUpdate(
    BaseModel
):

    status: Literal[
        "NEW",
        "ACKNOWLEDGED",
        "IN_PROGRESS",
        "RESOLVED"
    ]


# =========================================================
# ALERT STATUS UPDATE
# =========================================================

@app.patch("/alerts/{alert_id}/status")
def update_alert_status(
    alert_id: str,
    update: AlertStatusUpdate,
    user: dict = Depends(
        require_roles(
            "ADMIN",
            "SAFETY_OFFICER",
            "OPERATOR"
        )
    )
):

    # Operators may acknowledge/work on alerts, but only Admins and
    # Safety Officers may resolve them.
    if user.get("role") == "OPERATOR" and update.status == "RESOLVED":
        raise HTTPException(
            status_code=403,
            detail="Only Admins and Safety Officers can resolve alerts."
        )

    try:

        if not ObjectId.is_valid(
            alert_id
        ):

            raise HTTPException(
                status_code=400,
                detail="Invalid alert ID."
            )


        now = datetime.now(
            timezone.utc
        )


        update_fields = {

            "status":
                update.status,

            "updated_at":
                now
        }


        if update.status == (
            "ACKNOWLEDGED"
        ):

            update_fields[
                "acknowledged_at"
            ] = now


        if update.status == (
            "RESOLVED"
        ):

            update_fields[
                "resolved_at"
            ] = now


        result = alerts_collection.update_one(
    scoped_record_query(
        user,
        {"_id": ObjectId(alert_id)}
    ),
    {
        "$set": update_fields
    }
)

        if result.matched_count == 0:

            raise HTTPException(
                status_code=404,
                detail="Alert not found."
            )


        updated_alert = (
            alerts_collection.find_one(
                scoped_record_query(user, {"_id": ObjectId(alert_id)})
            )
        )


        return {

            "success": True,

            "alert":
                serialize_alert(
                    updated_alert
                )
        }


    except HTTPException:

        raise


    except Exception as e:

        print(
            "ALERT UPDATE ERROR:",
            e
        )

        raise HTTPException(

            status_code=500,

            detail=
                "Unable to update alert."
        )


# =========================================================
# ANALYTICS
# =========================================================

@app.get("/analytics")
def get_analytics(
    user: dict = Depends(
    require_roles(
        "ADMIN",
        "SAFETY_OFFICER"
    )
)
):
    """
    Returns application-level safety analytics from MongoDB.

    The analytics are calculated from:
    - detection records
    - alerts
    - incidents

    No AI prediction is performed here. This endpoint only
    summarizes stored application data for the dashboard.
    """
    try:
        # -------------------------------------------------
        # Detection summary
        # -------------------------------------------------

        detection_records = detections_collection.count_documents(location_scope(user))

        image_detections = detections_collection.count_documents(
            scoped_record_query(user, {"source_type": "image"})
        )

        video_detections = detections_collection.count_documents(
            scoped_record_query(user, {"source_type": "video"})
        )

        total_objects_result = list(
            detections_collection.aggregate([
                {"$match": location_scope(user)},
                {
                    "$group": {
                        "_id": None,
                        "total": {
                            "$sum": {
                                "$ifNull": [
                                    "$total_objects",
                                    "$total_detections"
                                ]
                            }
                        }
                    }
                }
            ])
        )

        total_objects = (
            int(total_objects_result[0]["total"])
            if total_objects_result
            else 0
        )

        # -------------------------------------------------
        # Alert summary
        # -------------------------------------------------

        total_alerts = alerts_collection.count_documents(location_scope(user))

        high_risk_alerts = alerts_collection.count_documents(
            scoped_record_query(user, {"risk_level": "HIGH"})
        )

        new_alerts = alerts_collection.count_documents(
            scoped_record_query(user, {"status": "NEW"})
        )

        risk_breakdown = {
    "HIGH": high_risk_alerts,
    "MEDIUM": alerts_collection.count_documents(
        scoped_record_query(user, {"risk_level": "MEDIUM"})
    ),
    "LOW": alerts_collection.count_documents(
        scoped_record_query(user, {"risk_level": "LOW"})
    )
}
        # -------------------------------------------------
        # Incident summary
        # -------------------------------------------------

        total_incidents = incidents_collection.count_documents(location_scope(user))

        open_incidents = incidents_collection.count_documents(
            scoped_record_query(user, {"status": "OPEN"})
        )

        resolved_incidents = incidents_collection.count_documents(
            scoped_record_query(user, {"status": "RESOLVED"})
        )

        incident_breakdown = {
            status: incidents_collection.count_documents(
                scoped_record_query(user, {"status": status})
            )
            for status in INCIDENT_STATUSES
        }

        # -------------------------------------------------
        # Average AI confidence
        # -------------------------------------------------

        confidence_result = list(
            detections_collection.aggregate([
                {"$match": location_scope(user)},
                {"$unwind": "$detections"},
                {
                    "$group": {
                        "_id": None,
                        "average": {
                            "$avg": "$detections.confidence"
                        }
                    }
                }
            ])
        )

        average_confidence = (
            round(float(confidence_result[0]["average"]) * 100, 1)
            if confidence_result
            and confidence_result[0].get("average") is not None
            else 0
        )

        # -------------------------------------------------
        # Top detected hazards / objects
        # -------------------------------------------------
        top_hazards_result = list(
            detections_collection.aggregate([
                {"$match": location_scope(user)},
                {"$unwind": "$detections"},
                {
                    "$group": {
                        "_id": "$detections.object",
                        "count": {"$sum": 1}
                    }
                },
                {"$sort": {"count": -1}},
                {"$limit": 5}
            ])
        )

        top_hazards = [
            {
                "object": item["_id"],
                "count": int(item["count"])
            }
            for item in top_hazards_result
        ]

        # -------------------------------------------------
        # Detection activity — last 7 days
        # -------------------------------------------------

        now = datetime.now(timezone.utc)

        seven_days_ago = now.replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0
        )

        from datetime import timedelta

        seven_days_ago = seven_days_ago - timedelta(days=6)

        trends_result = list(
            detections_collection.aggregate([
                {
                    "$match": {
                        **location_scope(user),
                        "detected_at": {
                            "$gte": seven_days_ago
                        }
                    }
                },
                {
                    "$project": {
                        "day": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$detected_at"
                            }
                        },
                        "objects": {
                            "$ifNull": [
                                "$total_objects",
                                "$total_detections"
                            ]
                        }
                    }
                },
                {
                    "$group": {
                        "_id": "$day",
                        "objects": {"$sum": "$objects"},
                        "records": {"$sum": 1}
                    }
                },
                {"$sort": {"_id": 1}}
            ])
        )

        trend_lookup = {
            item["_id"]: {
                "objects": int(item["objects"]),
                "records": int(item["records"])
            }
            for item in trends_result
        }

        trends = []

        for offset in range(7):
            day = seven_days_ago + timedelta(days=offset)
            day_key = day.strftime("%Y-%m-%d")

            trends.append({
                "date": day_key,
                "objects": trend_lookup.get(
                    day_key,
                    {}
                ).get("objects", 0),
                "records": trend_lookup.get(
                    day_key,
                    {}
                ).get("records", 0)
            })

        # -------------------------------------------------
        # Final response
        # -------------------------------------------------

        return {
            "success": True,

            "summary": {
                "detection_records": detection_records,
                "total_objects": total_objects,
                "total_alerts": total_alerts,
                "high_risk_alerts": high_risk_alerts,
                "new_alerts": new_alerts,
                "total_incidents": total_incidents,
                "open_incidents": open_incidents,
                "resolved_incidents": resolved_incidents,
                "average_confidence": average_confidence,
                "image_detections": image_detections,
                "video_detections": video_detections
            },

            "risk_breakdown": risk_breakdown,

            "incident_breakdown": incident_breakdown,

            "top_hazards": top_hazards,

            "trends": trends
        }

    except Exception as e:
        print("ANALYTICS ERROR:", e)

        return {
            "success": False,
            "error": "Unable to load analytics.",
            "summary": {
                "detection_records": 0,
                "total_objects": 0,
                "total_alerts": 0,
                "high_risk_alerts": 0,
                "new_alerts": 0,
                "total_incidents": 0,
                "open_incidents": 0,
                "resolved_incidents": 0,
                "average_confidence": 0,
                "image_detections": 0,
                "video_detections": 0
            },
            "risk_breakdown": {
                "HIGH": 0,
                "MEDIUM": 0,
                "LOW": 0
            },
            "incident_breakdown": {
                status: 0
                for status in INCIDENT_STATUSES
            },
            "top_hazards": [],
            "trends": []
        }


# =========================================================
# INCIDENT MANAGEMENT
# =========================================================

INCIDENT_STATUSES = [
    "OPEN",
    "ASSIGNED",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED"
]


class IncidentCreate(BaseModel):
    assigned_team: str = "Safety Team"
    assigned_to: str = ""
    location: str = "Not specified"
    description: str = ""
    remarks: str = ""


class IncidentUpdate(BaseModel):
    status: Literal[
        "OPEN",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED"
    ] | None = None
    assigned_team: str | None = None
    assigned_to: str | None = None
    location: str | None = None
    description: str | None = None
    remarks: str | None = None


def serialize_incident(incident):
    return {
        "id": str(incident["_id"]),
        "incident_number": incident.get("incident_number", "INCIDENT"),
        "alert_id": str(incident.get("alert_id", "")),
        "detection_record_id": str(incident.get("detection_record_id", "")),
        "state_id": incident.get("state_id"),
        "district_id": incident.get("district_id"),
        "station_id": incident.get("station_id"),
        "created_by_user_id": incident.get("created_by_user_id"),
        "created_by_name": incident.get("created_by_name", "Unknown"),
        "created_by_email": incident.get("created_by_email"),
        "created_by_role": incident.get("created_by_role"),
        "created_by_type": incident.get("created_by_type", "UNKNOWN"),
        "filename": incident.get("filename", "-"),
        "source_type": incident.get("source_type", "-"),
        "hazard_type": incident.get("hazard_type", "Safety Incident"),
        "risk_level": incident.get("risk_level", "LOW"),
        "confidence": incident.get("confidence", 0),
        "assigned_team": incident.get("assigned_team", "Safety Team"),
        "assigned_to": incident.get("assigned_to", ""),
        "location": incident.get("location", "Not specified"),
        "description": incident.get("description", ""),
        "remarks": incident.get("remarks", ""),
        "status": incident.get("status", "OPEN"),
        "created_at": (
            incident["created_at"].isoformat()
            if incident.get("created_at") else None
        ),
        "updated_at": (
            incident["updated_at"].isoformat()
            if incident.get("updated_at") else None
        ),
        "resolved_at": (
            incident["resolved_at"].isoformat()
            if incident.get("resolved_at") else None
        )
    }


@app.post("/incidents/from-alert/{alert_id}")
def create_incident_from_alert(
    alert_id: str,
    incident: IncidentCreate,
    user: dict = Depends(
    require_roles(
        "ADMIN",
        "SAFETY_OFFICER",
        "OPERATOR"
    )
)
):
    try:
        if not ObjectId.is_valid(alert_id):
            raise HTTPException(
                status_code=400,
                detail="Invalid alert ID."
            )

        alert = alerts_collection.find_one(scoped_record_query(
            user, {"_id": ObjectId(alert_id)}
        ))

        if not alert:
            raise HTTPException(
                status_code=404,
                detail="Alert not found."
            )

        # An alert should not silently navigate the user to an old,
        # resolved incident when they click Create Incident again.
        # Keep duplicate protection, but clearly report the existing state.
        existing = incidents_collection.find_one({
            "alert_id": ObjectId(alert_id)
        })

        if existing:
            existing_status = str(existing.get("status", "OPEN")).upper()

            if existing_status in {"RESOLVED", "CLOSED"}:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"This alert already has incident "
                        f"{existing.get('incident_number', 'on record')} "
                        f"with status {existing_status}. A new incident "
                        "requires a new detection/alert; resolved incidents "
                        "are not reopened automatically."
                    )
                )

            return {
                "success": True,
                "message": "An active incident already exists for this alert.",
                "incident": serialize_incident(existing)
            }

        now = datetime.now(timezone.utc)

        count = incidents_collection.count_documents({}) + 1
        incident_number = f"INC-{count:05d}"


        location = (incident.location or "").strip()
        description = (incident.description or "").strip()

        # Do not save schema-example placeholders as real incident data.
        if location.lower() in {"string", "not specified", "not provided"}:
            location = ""

        if description.lower() in {"string", "not specified", "not provided"}:
            description = ""

        incident_record = {
            **{key: alert[key] for key in ("state_id", "district_id", "station_id") if alert.get(key)},
            **{key: alert[key] for key in ("created_by_user_id", "created_by_name", "created_by_email", "created_by_role", "created_by_type", "filename", "source_type") if alert.get(key) is not None},
            "incident_created_by_user_id": str(user.get("_id")) if user.get("_id") is not None else None,
            "incident_created_by_name": user.get("name") or user.get("email") or "Unknown user",
            "incident_created_by_email": user.get("email"),
            "incident_created_by_role": user.get("role"),
            "incident_number": incident_number,
            "alert_id": ObjectId(alert_id),
            "detection_record_id": alert.get("detection_record_id", ""),
            "hazard_type": alert.get("hazard_type", "Safety Incident"),
            "risk_level": alert.get("risk_level", "LOW"),
            "confidence": alert.get("confidence", 0),
            "assigned_team": incident.assigned_team,
            "assigned_to": incident.assigned_to,
            "location": location,
            "description": description or alert.get(
                "message", "Potential safety hazard detected."
            ),
            "remarks": incident.remarks,
            "status": "OPEN",
            "created_at": now,
            "updated_at": now,
            "resolved_at": None
        }


        result = incidents_collection.insert_one(incident_record)

        # Associate the alert with the incident.
        alerts_collection.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {
                "incident_id": result.inserted_id,
                "updated_at": now
            }}
        )

        created = incidents_collection.find_one({
            "_id": result.inserted_id
        })

        return {
            "success": True,
            "message": "Incident created successfully.",
            "incident": serialize_incident(created)
        }

    except HTTPException:
        raise
    except Exception as e:
        print("CREATE INCIDENT ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail="Unable to create incident."
        )


@app.get("/incidents")
def get_incidents(
    limit: int = 100,
    user: dict = Depends(
        require_roles(
            "ADMIN",
            "SAFETY_OFFICER",
            "MAINTENANCE",
            "OPERATOR",
        )
    ),
):
    try:
        records = list(
            incidents_collection
            .find(location_scope(user))
            .sort("created_at", -1)
            .limit(limit)
        )

        incidents = [
            serialize_incident(record)
            for record in records
        ]

        return {
            "success": True,
            "incidents": incidents,
            "count": len(incidents)
        }

    except Exception as e:
        print("INCIDENT FETCH ERROR:", e)
        return {
            "success": False,
            "error": "Unable to load incidents.",
            "incidents": []
        }


@app.get("/incidents/stats")
def get_incident_stats(
    user: dict = Depends(
    require_roles(
        "ADMIN",
        "SAFETY_OFFICER",
        "MAINTENANCE"
    )
)
):
    try:
        scope = location_scope(user)
        total = incidents_collection.count_documents(scope)

        by_status = {
            status: incidents_collection.count_documents(
                scoped_record_query(user, {"status": status})
            )
            for status in INCIDENT_STATUSES
        }

        return {
            "success": True,
            "total": total,
            "by_status": by_status
        }

    except Exception as e:
        print("INCIDENT STATS ERROR:", e)
        return {
            "success": False,
            "total": 0,
            "by_status": {
                status: 0 for status in INCIDENT_STATUSES
            }
        }


@app.get("/incidents/{incident_id}")
def get_incident(
    incident_id: str,
    user: dict = Depends(
    require_roles(
        "ADMIN",
        "SAFETY_OFFICER",
        "MAINTENANCE"
    )
)
):
    try:
        if not ObjectId.is_valid(incident_id):
            raise HTTPException(
                status_code=400,
                detail="Invalid incident ID."
            )

        incident = incidents_collection.find_one(scoped_record_query(
            user, {"_id": ObjectId(incident_id)}
        ))

        if not incident:
            raise HTTPException(
                status_code=404,
                detail="Incident not found."
            )

        return {
            "success": True,
            "incident": serialize_incident(incident)
        }

    except HTTPException:
        raise
    except Exception as e:
        print("GET INCIDENT ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail="Unable to load incident."
        )


@app.patch("/incidents/{incident_id}")
def update_incident(
    incident_id: str,
    update: IncidentUpdate,
    user: dict = Depends(
    require_roles(
        "ADMIN",
        "SAFETY_OFFICER",
        "MAINTENANCE"
    )
)
):
    try:
        if not ObjectId.is_valid(incident_id):
            raise HTTPException(
                status_code=400,
                detail="Invalid incident ID."
            )

        now = datetime.now(timezone.utc)
        requested_fields = {
            key: value
            for key, value in update.model_dump().items()
            if value is not None
        }

        if user.get("role") == "MAINTENANCE":
            # Maintenance staff may update response progress and remarks,
            # but cannot reassign an incident or rewrite its core details.
            for field in ("assigned_team", "assigned_to", "location", "description"):
                requested_fields.pop(field, None)

            if requested_fields.get("status") not in (None, "ASSIGNED", "IN_PROGRESS", "RESOLVED"):
                raise HTTPException(
                    status_code=403,
                    detail="Maintenance staff cannot reopen or close incidents."
                )

        update_fields = requested_fields
        update_fields["updated_at"] = now

        if update.status == "RESOLVED" and "resolved_at" not in update_fields:
            update_fields["resolved_at"] = now

        result = incidents_collection.update_one(
            scoped_record_query(user, {"_id": ObjectId(incident_id)}),
            {"$set": update_fields}
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=404,
                detail="Incident not found."
            )

        updated = incidents_collection.find_one(scoped_record_query(
            user, {"_id": ObjectId(incident_id)}
        ))

        return {
            "success": True,
            "incident": serialize_incident(updated)
        }

    except HTTPException:
        raise
    except Exception as e:
        print("INCIDENT UPDATE ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail="Unable to update incident."
        )


# ============================================================
# AUTHENTICATION / USERS
# ============================================================

ALLOWED_ROLES = {"ADMIN", "SAFETY_OFFICER", "OPERATOR", "MAINTENANCE"}
security = HTTPBearer()




class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    state_id: str
    district_id: str | None = None
    subdistrict_id: str | None = None
    station_id: str | None = None


class UserAssignmentRequest(BaseModel):
    role: Literal["ADMIN", "SAFETY_OFFICER", "OPERATOR", "MAINTENANCE"] | None = None
    state_id: str | None = None
    district_id: str | None = None
    subdistrict_id: str | None = None
    station_id: str | None = None


class UserApprovalRequest(BaseModel):
    status: Literal["APPROVED", "REJECTED"]


class LoginRequest(BaseModel):
    email: str
    password: str


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120_000,
    ).hex()
    return password_hash, salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    calculated_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(calculated_hash, stored_hash)


def public_user(user: dict) -> dict:
    state_id = user.get("requested_state_id") or user.get("state_id")
    district_id = user.get("requested_district_id") or user.get("district_id")
    subdistrict_id = (
        user.get("requested_subdistrict_id")
        or user.get("subdistrict_id")
    )

    state = database["rw_states"].find_one(
        {"state_id": state_id}
    ) if state_id else None

    district = database["rw_districts"].find_one(
        {"district_id": district_id}
    ) if district_id else None

    subdistrict = database["rw_subdistricts"].find_one(
        {"subdistrict_id": subdistrict_id}
    ) if subdistrict_id else None

    
    station_id = user.get("station_id")

    station = database["rw_stations"].find_one(
        {"station_id": station_id}
    ) if station_id else None
    print("DEBUG station_id:", station_id)
    print("DEBUG station record:", station)


    return {
        "id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "OPERATOR"),

        "state_id": user.get("state_id"),
        "district_id": user.get("district_id"),
        "station_id": user.get("station_id"),
        "station_name": station.get("name") if station else None,
        "subdistrict_id": user.get("subdistrict_id"),
        "subdistrict_name": subdistrict.get("name") if subdistrict else None,
        
        "station_name": (
            station.get("station_name")
            or station.get("name")
            if station else None
        ),
        "assigned_location": (
            station.get("station_name")
            or station.get("name")
            if station else None
        ),


        "requested_state_id": state_id,
        "requested_district_id": district_id,
        "requested_subdistrict_id": subdistrict_id,
        "requested_station_id": (
            user.get("requested_station_id")
            or user.get("station_id")
        ),

        "state_name": state.get("name") if state else None,
        "district_name": district.get("name") if district else None,
        "subdistrict_name": subdistrict.get("name") if subdistrict else None,

        "approval_status": user.get("approval_status", "PENDING"),
    }


@app.post("/users/signup")
async def signup(request: SignupRequest):
    name = request.name.strip()
    email = request.email.strip().lower()

    if len(name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid name."
        )

    if "@" not in email:
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid email."
        )

    if len(request.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters."
        )

        # Public signup requests a location. An admin assigns the railway station
    # after reviewing the account. Users cannot assign their own role or station.
    state_id = request.state_id.strip()
    district_id = request.district_id.strip() if request.district_id else None
    subdistrict_id = request.subdistrict_id.strip() if request.subdistrict_id else None

    state = database["rw_states"].find_one({"state_id": state_id})
    if not state:
        raise HTTPException(
            status_code=400,
            detail="Please select a valid state."
        )

    if not district_id:
        raise HTTPException(
            status_code=400,
            detail="Please select a district."
        )

    district = database["rw_districts"].find_one({
        "district_id": district_id,
        "state_id": state_id
    })
    if not district:
        raise HTTPException(
            status_code=400,
            detail="Selected district does not belong to the selected state."
        )

    if subdistrict_id:
        subdistrict = database["rw_subdistricts"].find_one({
            "subdistrict_id": subdistrict_id,
            "district_id": district_id,
            "state_id": state_id
        })
        if not subdistrict:
            raise HTTPException(
                status_code=400,
                detail="Selected mandal does not belong to the selected district."
            )

    requested_role = "OPERATOR"



    if users_collection.find_one({"email": email}):
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists."
        )

    password_hash, salt = hash_password(request.password)

    user = {
        "name": name,
        "email": email,
        "password_hash": password_hash,
        "password_salt": salt,
        "role": requested_role,
        "approval_status": "PENDING",
        "state_id": None,
        "district_id": None,
        "subdistrict_id": None,
        "station_id": None,
        "requested_state_id": state_id,
        "requested_district_id": district_id,
        "requested_subdistrict_id": subdistrict_id,
        "requested_station_id": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = users_collection.insert_one(user)
    user["_id"] = result.inserted_id

    return {
        "message": "Account created successfully.",
        "user": public_user(user),
    }


@app.get("/users")
def list_users(admin: dict = Depends(require_roles("ADMIN"))):
    """Return safe user fields for the admin User Management screen."""
    users = users_collection.find({}, {"password_hash": 0, "password_salt": 0, "session_token": 0}).sort("created_at", -1).limit(1000)
    return {"users": [public_user(user) for user in users], "count": users_collection.count_documents({})}


@app.patch("/users/{user_id}/approval")
def update_user_approval(
    user_id: str,
    request: UserApprovalRequest,
    admin: dict = Depends(require_roles("ADMIN")),
):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID.")
    target = users_collection.find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if request.status == "APPROVED":
        station_id = target.get("station_id")
        if not station_id:
            raise HTTPException(status_code=400, detail="Assign and save a valid railway station before approving this account.")
        station = database["rw_stations"].find_one({"station_id": station_id})
        if not station:
            raise HTTPException(status_code=400, detail="The assigned railway station no longer exists. Select a valid station.")
        requested_state = target.get("requested_state_id")
        requested_district = target.get("requested_district_id")
        if requested_state and station.get("state_id") and station.get("state_id") != requested_state:
            raise HTTPException(status_code=400, detail="Assigned station is outside the state requested during registration.")
        if requested_district and station.get("district_id") and station.get("district_id") != requested_district:
            raise HTTPException(status_code=400, detail="Assigned station is outside the district requested during registration.")
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"approval_status": request.status, "updated_at": datetime.now(timezone.utc)}},
    )
    updated = users_collection.find_one({"_id": ObjectId(user_id)})
    return {"message": f"User {request.status.lower()}.", "user": public_user(updated)}


@app.patch("/users/{user_id}/assignment")
def assign_user_access(
    user_id: str,
    request: UserAssignmentRequest,
    admin: dict = Depends(require_roles("ADMIN")),
):
    """Assign a user's role and geographic scope; only admins may do this."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID.")

    target = users_collection.find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    updates = {}
    if request.role is not None:
        updates["role"] = request.role

    for field in ("state_id", "district_id", "subdistrict_id", "station_id"):
        value = getattr(request, field)
        if value is not None:
            updates[field] = value.strip() or None

    # Validate supplied geographic IDs against the location catalogue.
    state_id = updates.get("state_id", target.get("state_id"))
    district_id = updates.get("district_id", target.get("district_id"))
    if state_id:
        state = database["rw_states"].find_one({"state_id": state_id})
        if not state:
            raise HTTPException(status_code=400, detail="Unknown state_id.")
    if district_id:
        district = database["rw_districts"].find_one({"district_id": district_id})
        if not district:
            raise HTTPException(status_code=400, detail="Unknown district_id.")
        if state_id and district.get("state_id") and district["state_id"] != state_id:
            raise HTTPException(status_code=400, detail="Assigned district does not belong to the selected state.")
        updates.setdefault("state_id", district.get("state_id"))

    subdistrict_id = updates.get("subdistrict_id", target.get("subdistrict_id"))
    if subdistrict_id:
        subdistrict = database["rw_subdistricts"].find_one({"subdistrict_id": subdistrict_id})
        if not subdistrict:
            raise HTTPException(status_code=400, detail="Unknown subdistrict_id.")
        if district_id and subdistrict.get("district_id") and subdistrict["district_id"] != district_id:
            raise HTTPException(status_code=400, detail="Assigned local area does not belong to the selected district.")

    # A station assignment must refer to a known railway station and must agree
    # with any supplied state/district/local-area assignment.
    station_id = updates.get("station_id", target.get("station_id"))
    if station_id:
        station = database["rw_stations"].find_one({"station_id": station_id})
        if not station:
            raise HTTPException(status_code=400, detail="Unknown station_id.")
        for field in ("state_id", "district_id", "subdistrict_id"):
            expected = updates.get(field, target.get(field))
            actual = station.get(field)
            if expected and actual and expected != actual:
                raise HTTPException(
                    status_code=400,
                    detail=f"Assigned {field} does not match the selected station.",
                )
        if not updates.get("state_id"):
            updates["state_id"] = station.get("state_id")
        if not updates.get("district_id") and station.get("district_id"):
            updates["district_id"] = station.get("district_id")
        if not updates.get("subdistrict_id") and station.get("subdistrict_id"):
            updates["subdistrict_id"] = station.get("subdistrict_id")

    effective_role = updates.get("role", target.get("role", "OPERATOR"))
    effective_station_id = updates.get("station_id", target.get("station_id"))
    if effective_role != "ADMIN" and not effective_station_id:
        raise HTTPException(status_code=400, detail="Assign a valid railway station to every non-admin user.")

    if updates.get("station_id") is None and "station_id" in updates:
        updates["station_id"] = None
    if not updates:
        raise HTTPException(status_code=400, detail="No assignment fields supplied.")

    updates["updated_at"] = datetime.now(timezone.utc)
    users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    updated = users_collection.find_one({"_id": ObjectId(user_id)})
    return {"message": "User access updated.", "user": public_user(updated)}


@app.post("/users/login")
async def login(request: LoginRequest):
    email = request.email.strip().lower()

    user = users_collection.find_one({"email": email})

    # 1. Verify credentials
    if not user or not verify_password(
        request.password,
        user.get("password_hash", ""),
        user.get("password_salt", ""),
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    # 2. Admin accounts bypass approval and station checks
    is_admin = user.get("role", "").upper() == "ADMIN"

    if not is_admin:
        approval_status = user.get("approval_status", "PENDING")

        # Require approval for normal users
        if approval_status == "REJECTED":
            raise HTTPException(
                status_code=403,
                detail="Your registration was rejected. Please contact the administrator."
            )

        if approval_status != "APPROVED":
            raise HTTPException(
                status_code=403,
                detail="Your account is pending admin approval."
            )

        # Require an assigned station for approved users
        station_id = user.get("station_id")

        if not station_id:
            raise HTTPException(
                status_code=403,
                detail="Your railway station has not been assigned. Please contact the administrator."
            )

        # Validate the assigned station
        station = database["rw_stations"].find_one({
            "station_id": station_id
        })

        if not station:
            raise HTTPException(
                status_code=403,
                detail="Your assigned railway station is invalid. Please contact the administrator."
            )

    # 3. Create a new session token
    session_token = secrets.token_urlsafe(32)

    # 4. Save the session token
    users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "session_token": session_token,
                "updated_at": datetime.utcnow(),
            }
        }
    )

    # 5. Return the login response
    user["session_token"] = session_token

    return {
        "message": "Login successful.",
        "user": public_user(user),
        "access_token": session_token,
    }

@app.get("/users/me")
async def current_user(user: dict = Depends(get_current_user)):
    # Resolve the caller from the validated bearer token, not a user_id
    # supplied in the URL.
    return {"user": public_user(user)}
