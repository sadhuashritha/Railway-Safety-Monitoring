"""Safely upsert RailWatch location CSVs into MongoDB.

Run from the project root, for example:
python -m backend.seed_locations_fixed --data-dir "C:\\Users\\ashri\\Downloads\\RailWatch_Location_Database_Stage1\\data"

This script never drops collections. It skips header-only CSVs and reports counts.
"""
import argparse
import csv
import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(PROJECT_DIR / ".env")

COLLECTIONS = {
    "states.csv": ("rw_states", "state_id"),
    "districts.csv": ("rw_districts", "district_id"),
    "subdistricts.csv": ("rw_subdistricts", "subdistrict_id"),
    "stations.csv": ("rw_stations", "station_id"),
    "camera_configs.csv": ("rw_camera_configs", "camera_id"),
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", required=True, help="Folder containing the location CSV files")
    args = parser.parse_args()

    uri = os.getenv("MONGODB_URI")
    database_name = os.getenv("MONGODB_DATABASE", "railway_safety")
    if not uri:
        raise SystemExit("ERROR: MONGODB_URI not found. Check backend/.env")

    data_dir = Path(args.data_dir).expanduser().resolve()
    if not data_dir.is_dir():
        raise SystemExit(f"ERROR: Data directory not found: {data_dir}")

    client = MongoClient(uri, serverSelectionTimeoutMS=10000)
    try:
        client.admin.command("ping")
        db = client[database_name]
        print(f"Target database: {database_name}")
        print(f"CSV directory:   {data_dir}")
        print("Safety: upsert only; no collections are dropped.\n")

        for filename, (collection_name, id_field) in COLLECTIONS.items():
            csv_path = data_dir / filename
            if not csv_path.exists():
                print(f"{collection_name}: SKIPPED (file not found: {filename})")
                continue

            operations = []
            with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
                reader = csv.DictReader(f)
                if not reader.fieldnames:
                    print(f"{collection_name}: 0 rows (empty CSV)")
                    continue
                for raw in reader:
                    row = {str(k).strip(): (v.strip() if isinstance(v, str) else v)
                           for k, v in raw.items() if k}
                    key = row.get(id_field, "")
                    if not key:
                        continue
                    # Router searches station_code; source station CSV calls this field `code`.
                    if collection_name == "rw_stations":
                        if row.get("code") and not row.get("station_code"):
                            row["station_code"] = row["code"]
                        # Empty values should not overwrite known values during upserts.
                        row = {k: v for k, v in row.items() if v != ""}
                    operations.append(UpdateOne({id_field: key}, {"$set": row}, upsert=True))

            if not operations:
                print(f"{collection_name}: 0 rows imported (CSV has headers only or no valid IDs)")
                continue
            result = db[collection_name].bulk_write(operations, ordered=False)
            print(f"{collection_name}: {result.upserted_count} inserted, {result.modified_count} updated, {len(operations)} valid rows")

        print("\nImport finished. No collections were dropped.")
    finally:
        client.close()


if __name__ == "__main__":
    main()
