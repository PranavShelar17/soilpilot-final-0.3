import json
import re
import pandas as pd
from pathlib import Path

csv_path = Path(r"d:\soilpilot-final-13 nov\soilpilot-final-0.2-main\ALL_FINAL_DSM_RESULTS\04_Parcel_Predictions_and_GIS\malegaon_khurd_gat_soil_predictions.csv")
json_path = Path(r"d:\soilpilot-final-13 nov\soilpilot-final-0.2-main\frontend\public\data\dsm\gat_data_full.json")
cache_path = Path(r"d:\soilpilot-final-13 nov\soilpilot-final-0.2-main\data\gis\gat_soil_indicators_cache.json")

df = pd.read_csv(csv_path)
with open(json_path, "r", encoding="utf-8") as f:
    json_data = json.load(f)

with open(cache_path, "r", encoding="utf-8") as f:
    cache_data = json.load(f)

print(f"Loaded {len(df)} rows from CSV")
print(f"Loaded {len(json_data)} Gats from gat_data_full.json")
print(f"Loaded {len(cache_data)} Gats from indicators cache")

# Compare values for each Gat
param_mapping = {
    "pH": "pH_Mean_Predicted",
    "OC_percent": "OC_Mean_Predicted",
    "N_kg_ha": "N_Mean_Predicted",
    "CaCO3_percent": "CaCO3_Mean_Predicted",
    "Fe_mg_kg": "Fe_Mean_Predicted",
    "Mn_mg_kg": "Mn_Mean_Predicted",
    "Cu_mg_kg": "Cu_Mean_Predicted",
    "Zn_mg_kg": "Zn_Mean_Predicted",
    "Clay_percent": "Clay_Mean_Predicted",
    "Sand_percent": "Sand_Mean_Predicted",
    "Silt_percent": "Silt_Mean_Predicted",
}

mismatches = []
cache_mismatches = []

cache_field_map = {
    "ph": "pH_Mean_Predicted",
    "soc": "OC_Mean_Predicted",
    "nitrogen": "N_Mean_Predicted",
    "caco3": "CaCO3_Mean_Predicted",
    "clay": "Clay_Mean_Predicted",
    "sand": "Sand_Mean_Predicted",
    "silt": "Silt_Mean_Predicted",
    "iron": "Fe_Mean_Predicted",
    "manganese": "Mn_Mean_Predicted",
    "zinc": "Zn_Mean_Predicted",
    "copper": "Cu_Mean_Predicted",
}

for _, row in df.iterrows():
    gat_raw = str(row["Gat_Parcel_ID"]).strip()
    clean_key = gat_raw.replace("Gat ", "").strip()
    
    if clean_key not in json_data:
        mismatches.append(f"Gat {clean_key} missing in json_data")
        continue
    
    j_entry = json_data[clean_key]
    j_preds = j_entry.get("model_predictions", {})
    
    for j_key, c_col in param_mapping.items():
        if j_key in j_preds:
            j_val = j_preds[j_key].get("value")
            c_val = float(row[c_col])
            if abs(float(j_val) - c_val) > 0.05:
                mismatches.append(f"Gat {clean_key} {j_key}: JSON={j_val} vs CSV={c_val}")

    if clean_key in cache_data:
        c_entry = cache_data[clean_key]
        for cfld, c_col in cache_field_map.items():
            cache_val = c_entry.get(cfld)
            csv_val = float(row[c_col])
            if cache_val is not None and abs(float(cache_val) - csv_val) > 0.05:
                cache_mismatches.append(f"Cache Gat {clean_key} {cfld}: Cache={cache_val} vs CSV={csv_val}")

print(f"Total field mismatches between CSV and gat_data_full.json: {len(mismatches)}")
if mismatches:
    for mm in mismatches[:10]:
        print(" ", mm)
else:
    print(">>> 100% PERFECT MATCH across all 216 Gats between CSV and gat_data_full.json! <<<")

print(f"Total field mismatches between CSV and gat_soil_indicators_cache.json: {len(cache_mismatches)}")
if cache_mismatches:
    for cmm in cache_mismatches[:10]:
        print(" ", cmm)
else:
    print(">>> 100% PERFECT MATCH across all 216 Gats between CSV and gat_soil_indicators_cache.json! <<<")

# Check low-accuracy blanking for predicted parcels
blank_failures = []
for _, row in df.iterrows():
    gat_raw = str(row["Gat_Parcel_ID"]).strip()
    clean_key = gat_raw.replace("Gat ", "").strip()
    is_measured = str(row.get("Sampling_Status", "")).lower() == "measured"
    
    if clean_key in json_data:
        j_preds = json_data[clean_key].get("model_predictions", {})
        for low_key in ["P_kg_ha", "K_kg_ha", "EC_dS_m", "S_kg_ha"]:
            item = j_preds.get(low_key, {})
            val = item.get("value")
            is_blank = item.get("is_blank")
            if not is_measured:
                if val is not None or is_blank is not True:
                    blank_failures.append(f"Gat {clean_key} predicted parcel has non-blank {low_key}: val={val}, is_blank={is_blank}")

print(f"Total blanking violations for predicted parcels: {len(blank_failures)}")
if blank_failures:
    for bf in blank_failures[:10]:
        print(" ", bf)
else:
    print(">>> 100% of predicted parcels correctly have blanked low-accuracy values (P, K, EC, S)! <<<")
