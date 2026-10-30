
"""Additive FastAPI router for railway locations using synchronous PyMongo."""
from typing import Optional

from fastapi import APIRouter, HTTPException, Query


ALLOWED_STATE_IDS = {
    "telangana",
    "andhra-pradesh",
    "maharashtra",
    "karnataka",
    "tamil-nadu",
}


def _items(collection, query, limit=500, sort=None):
    cursor = collection.find(query, {"_id": 0})

    if sort:
        cursor = cursor.sort(sort)

    return list(cursor.limit(limit))


def _public_camera(doc):
    is_live = (
        bool(doc.get("is_live", False))
        and doc.get("mode", "demo") != "demo"
    )

    return {
        "camera_id": doc.get("camera_id"),
        "station_id": doc.get("station_id"),
        "name": doc.get("name"),
        "zone": doc.get("zone", ""),
        "mode": doc.get("mode", "demo"),
        "is_live": is_live,
        "status_label": (
            "Live stream configured"
            if is_live
            else "Demo configuration — no live stream"
        ),
    }


def build_location_router(db):
    router = APIRouter(tags=["RailWatch Locations"])

    @router.get("/locations/states")
    def states():
        items = _items(
            db.rw_states,
            {"state_id": {"$in": sorted(ALLOWED_STATE_IDS)}},
            sort=[("name", 1)],
        )

        return {"items": items, "count": len(items)}

        if state_id not in ALLOWED_STATE_IDS:
            raise HTTPException(
                status_code=400,
                detail="Unsupported state_id",
            )

        items = _items(
            db.rw_districts,
            {"state_id": state_id},
            sort=[("name", 1)],
        )

        return {"items": items, "count": len(items)}


        # Only expose districts that have at least one local-area record.
        # This keeps districts with an empty Mandal / Local Area dropdown out
        # of the CCTV location selector.
        district_rows = _items(
            db.rw_districts,
            {"state_id": state_id},
            sort=[("name", 1)],
        )

        district_ids = [
            row.get("district_id")
            for row in district_rows
            if row.get("district_id")
        ]
        districts_with_areas = set()
        if district_ids:
            area_rows = _items(
                db.rw_subdistricts,
                {"district_id": {"$in": district_ids}},
                limit=5000,
            )
            districts_with_areas = {
                area.get("district_id")
                for area in area_rows
                if area.get("district_id") and area.get("subdistrict_id")
            }

        items = [
            row for row in district_rows
            if row.get("district_id") in districts_with_areas
        ]
        return {"items": items, "count": len(items)}

    @router.get("/locations/districts")
    def districts(state_id: str = Query(...)):
        if state_id not in ALLOWED_STATE_IDS:
            raise HTTPException(
                status_code=400,
                detail="Unsupported state_id",
            )

        district_rows = _items(
            db.rw_districts,
            {"state_id": state_id},
            sort=[("name", 1)],
        )

        district_ids = [
            row["district_id"]
            for row in district_rows
            if row.get("district_id")
        ]

        districts_with_areas = set()

        if district_ids:
            area_rows = _items(
                db.rw_subdistricts,
                {"district_id": {"$in": district_ids}},
                limit=5000,
            )

            districts_with_areas = {
                area["district_id"]
                for area in area_rows
                if area.get("district_id")
                and area.get("subdistrict_id")
            }

        items = [
            row for row in district_rows
            if row.get("district_id") in districts_with_areas
        ]

        return {"items": items, "count": len(items)}


    @router.get("/locations/subdistricts")
    def subdistricts(district_id: str = Query(...)):
        district = db.rw_districts.find_one(
            {"district_id": district_id},
            {"_id": 0, "state_id": 1},
        )

        if (
            not district
            or district.get("state_id") not in ALLOWED_STATE_IDS
        ):
            raise HTTPException(
                status_code=404,
                detail="District not found in RailWatch catalogue",
            )

        station_subdistrict_ids = db.rw_stations.distinct(
            "subdistrict_id",
            {
                "district_id": district_id,
                "subdistrict_id": {
                    "$exists": True,
                    "$nin": ["", None],
                },
            },
        )

        if not station_subdistrict_ids:
            return {"items": [], "count": 0}

        items = _items(
            db.rw_subdistricts,
            {
                "district_id": district_id,
                "subdistrict_id": {"$in": station_subdistrict_ids},
            },
            sort=[("name", 1)],
        )

        return {"items": items, "count": len(items)}


    @router.get("/locations/stations")
    def stations(
        state_id: Optional[str] = None,
        district_id: Optional[str] = None,
        subdistrict_id: Optional[str] = None,
        q: Optional[str] = Query(None, max_length=100),
        limit: int = Query(100, ge=1, le=500),
    ):
        query = {}

        if state_id:
            if state_id not in ALLOWED_STATE_IDS:
                raise HTTPException(
                    status_code=400,
                    detail="Unsupported state_id",
                )
            query["state_id"] = state_id

        if district_id:
            query["district_id"] = district_id

        if subdistrict_id:
            query["subdistrict_id"] = subdistrict_id

        if q:
            query["$or"] = [
                {"name": {"$regex": q, "$options": "i"}},
                {"station_code": {"$regex": q, "$options": "i"}},
            ]

        items = _items(
            db.rw_stations,
            query,
            limit=limit,
            sort=[("name", 1)],
        )

        return {"items": items, "count": len(items)}

    @router.get("/locations/debug-location-data")
    def debug_location_data():
        station_samples = _items(db.rw_stations, {}, limit=10)
        subdistrict_samples = _items(db.rw_subdistricts, {}, limit=10)

        return {
            "station_count": db.rw_stations.count_documents({}),
            "subdistrict_count": db.rw_subdistricts.count_documents({}),
            "stations_sample": [
                {
                    "name": station.get("name"),
                    "state_id": station.get("state_id"),
                    "district_id": station.get("district_id"),
                    "subdistrict_id": station.get("subdistrict_id"),
                }
                for station in station_samples
            ],
            "subdistricts_sample": [
                {
                    "name": area.get("name"),
                    "district_id": area.get("district_id"),
                    "subdistrict_id": area.get("subdistrict_id"),
                }
                for area in subdistrict_samples
            ],
        }

    @router.get("/locations/cameras")
    def cameras(station_id: str = Query(...)):
        station = db.rw_stations.find_one(
            {"station_id": station_id},
            {"_id": 1},
        )

        if not station:
            raise HTTPException(
                status_code=404,
                detail="Station not found in RailWatch catalogue",
            )

        docs = _items(
            db.rw_camera_configs,
            {"station_id": station_id},
            sort=[("name", 1)],
        )

        items = [_public_camera(doc) for doc in docs]

        return {"items": items, "count": len(items)}

    @router.get("/locations/station-tree")
    def station_tree(
        state_id: str = Query(...),
        q: Optional[str] = Query(None, max_length=100),
        limit: int = Query(100, ge=1, le=500),
    ):
        if state_id not in ALLOWED_STATE_IDS:
            raise HTTPException(
                status_code=400,
                detail="Unsupported state_id",
            )

        query = {"state_id": state_id}

        if q:
            query["$or"] = [
                {"name": {"$regex": q, "$options": "i"}},
                {"station_code": {"$regex": q, "$options": "i"}},
            ]

        station_rows = _items(
            db.rw_stations,
            query,
            limit=limit,
            sort=[("name", 1)],
        )

        district_ids = sorted({
            station["district_id"]
            for station in station_rows
            if station.get("district_id")
        })

        subdistrict_ids = sorted({
            station["subdistrict_id"]
            for station in station_rows
            if station.get("subdistrict_id")
        })

        district_rows = _items(
            db.rw_districts,
            {
                "state_id": state_id,
                "district_id": {"$in": district_ids},
            },
            sort=[("name", 1)],
        )

        subdistrict_rows = _items(
            db.rw_subdistricts,
            {"subdistrict_id": {"$in": subdistrict_ids}},
            sort=[("name", 1)],
        )

        return {
            "state_id": state_id,
            "districts": district_rows,
            "subdistricts": subdistrict_rows,
            "stations": station_rows,
            "count": len(station_rows),
            "limit": limit,
        }

    return router
