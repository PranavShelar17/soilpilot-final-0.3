import json
import re
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = PROJECT_ROOT / "MALEGAON_SOIL_PREDICTION_PRODUCTION_PACKAGE" / "data" / "malegaon_khurd_gat_soil_predictions.csv"
GEOJSON_PATH = PROJECT_ROOT / "frontend" / "public" / "data" / "malegaon_plots.geojson"
CACHE_PATH_BACKEND = PROJECT_ROOT / "data" / "gis" / "gat_soil_indicators_cache.json"
CACHE_PATH_FRONTEND = PROJECT_ROOT / "frontend" / "public" / "data" / "gat_soil_indicators_cache.json"

print(f"Reading predictions from: {CSV_PATH}")
df = pd.read_csv(CSV_PATH)

# Index CSV rows by Gat_Number string
csv_by_gat = {}
for _, row in df.iterrows():
    gat_raw = str(row["Gat_Number"]).strip()
    csv_by_gat[gat_raw] = row

print(f"Total prediction rows indexed: {len(csv_by_gat)}")

with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
    gj = json.load(f)

features = gj.get("features", [])
print(f"Total GeoJSON features: {len(features)}")

# Load existing DEM elevation / slope if present in existing cache to preserve terrain metrics
old_cache = {}
if CACHE_PATH_BACKEND.exists():
    try:
        with open(CACHE_PATH_BACKEND, "r", encoding="utf-8") as f:
            old_cache = json.load(f)
    except Exception:
        pass

result = {}

def clean_num(val, round_to=2):
    if pd.isna(val) or val is None:
        return None
    try:
        return round(float(val), round_to)
    except (ValueError, TypeError):
        return None

for feat in features:
    props = feat.get("properties", {})
    gat_no = str(props.get("gat_no", "")).strip()
    if not gat_no:
        continue

    # Resolve CSV row: try exact, or strip letters (e.g. 67/A -> 67)
    row = csv_by_gat.get(gat_no)
    if row is None:
        base_gat = re.sub(r"[^0-9]", "", gat_no)
        row = csv_by_gat.get(base_gat)

    if row is None:
        print(f"Warning: No prediction row for Gat {gat_no}")
        continue

    old_entry = old_cache.get(gat_no, {})

    area_ha = clean_num(props.get("area_ha") or props.get("area") or row.get("Area_Hectares"), 2)
    area_acres = clean_num(props.get("area_acres") or (area_ha * 2.47105 if area_ha else None), 2)

    ph_val = clean_num(row.get("pH (Predicted Mean)"), 2)
    soc_val = clean_num(row.get("OC pct (Predicted Mean)"), 3)
    som_val = clean_num(row.get("SOM pct (Predicted Mean)"), 3)
    n_val = clean_num(row.get("Available N kg ha (Predicted Mean)"), 1)
    p_val = clean_num(row.get("Available P kg ha (Predicted Mean)"), 2)
    k_val = clean_num(row.get("Available K kg ha (Predicted Mean)"), 1)
    caco3_val = clean_num(row.get("CaCO3 pct (Predicted Mean)"), 2)
    ec_val = clean_num(row.get("EC dSm (Predicted Mean)"), 2)
    s_val = clean_num(row.get("Available S kg ha (Predicted Mean)"), 2)
    fe_val = clean_num(row.get("Fe mg kg (Predicted Mean)"), 2)
    mn_val = clean_num(row.get("Mn mg kg (Predicted Mean)"), 2)
    zn_val = clean_num(row.get("Zn mg kg (Predicted Mean)"), 2)
    cu_val = clean_num(row.get("Cu mg kg (Predicted Mean)"), 2)
    clay_val = clean_num(row.get("Clay pct (Predicted Mean)"), 1)
    sand_val = clean_num(row.get("Sand pct (Predicted Mean)"), 1)
    silt_val = clean_num(row.get("Silt pct (Predicted Mean)"), 1)

    texture_str = str(row.get("Soil Textural Class (Predicted)") or "Clay").strip()

    # Elevation and slope from terrain / old cache
    elevation = old_entry.get("elevation") or 552.0
    slope = old_entry.get("slope") or 1.2
    bd = clean_num(row.get("SoilGrids_BulkDensity_g_cm3"), 2) or old_entry.get("bd") or 1.54
    cec = clean_num(row.get("SoilGrids_CEC_cmol_kg"), 1) or old_entry.get("cec") or 45.0

    entry = {
        "gat_no": gat_no,
        "area_ha": area_ha,
        "area_acres": area_acres,
        "village": props.get("village", "Malegaon Kh."),
        "centroid": props.get("centroid"),
        "bounds": props.get("bounds"),
        "ph": ph_val,
        "ph_min": ph_val,
        "ph_max": ph_val,
        "soc": soc_val,
        "organic_carbon": soc_val,
        "som": som_val,
        "nitrogen": n_val,
        "available_nitrogen": n_val,
        "phosphorus": p_val,
        "available_phosphorus": p_val,
        "potassium": k_val,
        "available_potassium": k_val,
        "caco3": caco3_val,
        "free_lime": caco3_val,
        "ec": ec_val,
        "sulphur": s_val,
        "iron": fe_val,
        "manganese": mn_val,
        "zinc": zn_val,
        "copper": cu_val,
        "clay": clay_val,
        "sand": sand_val,
        "silt": silt_val,
        "texture": texture_str,
        "texture_class_id": 1 if texture_str.lower() == "clay" else 4,
        "bd": bd,
        "cec": cec,
        "elevation": elevation,
        "slope": slope,
        "source": "MALEGAON_SOIL_PREDICTION_PRODUCTION_PACKAGE"
    }
    result[gat_no] = entry

print(f"Total synchronized Gat indicators built: {len(result)}")

# Write to backend cache
CACHE_PATH_BACKEND.parent.mkdir(parents=True, exist_ok=True)
with open(CACHE_PATH_BACKEND, "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)
print(f"Wrote {len(result)} entries to: {CACHE_PATH_BACKEND}")

# Write to frontend cache
CACHE_PATH_FRONTEND.parent.mkdir(parents=True, exist_ok=True)
with open(CACHE_PATH_FRONTEND, "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)
print(f"Wrote {len(result)} entries to: {CACHE_PATH_FRONTEND}")

# Verification for Gat 22 and Gat 11
print("\n=== VERIFICATION GAT 22 ===")
print("pH:", result.get("22", {}).get("ph"))
print("OC:", result.get("22", {}).get("soc"))
print("CaCO3:", result.get("22", {}).get("caco3"))
print("Clay:", result.get("22", {}).get("clay"))
print("Nitrogen:", result.get("22", {}).get("nitrogen"))
print("Potassium:", result.get("22", {}).get("potassium"))

print("\n=== VERIFICATION GAT 11 ===")
print("pH:", result.get("11", {}).get("ph"))
print("OC:", result.get("11", {}).get("soc"))
print("CaCO3:", result.get("11", {}).get("caco3"))
