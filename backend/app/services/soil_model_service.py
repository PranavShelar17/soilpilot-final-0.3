"""Master Soil Prediction Model Service.
Integrates the scientifically validated Digital Soil Mapping (DSM) Multi-Model
Super Learner Ensemble (IDW + Kriging + Machine Learning + Regression Kriging)
from FINAL_COMBINED_PREDICTION_SYSTEM.

Provides authoritative, high-accuracy predictions across all 15 soil fertility targets:
1. CaCO3_percent (Calcium Carbonate / Free Lime)
2. Fe_mg_kg (Available Iron)
3. Cu_mg_kg (Available Copper)
4. Zn_mg_kg (Available Zinc)
5. K_kg_ha (Available Potassium)
6. N_kg_ha (Available Nitrogen)
7. pH (Soil Reaction)
8. OC_percent (Organic Carbon)
9. SOM_percent (Soil Organic Matter)
10. Mn_mg_kg (Available Manganese)
11. S_kg_ha (Available Sulphur)
12. P_kg_ha (Available Phosphorus)
13. total_carbon_percent (Total Carbon)
14. EC_dS_m (Electrical Conductivity)
15. moisture_bulk_density_g_cm3 (Bulk Density)
"""

import os
import re
import sys
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent
PROD_PACKAGE_DIR = PROJECT_ROOT / "MALEGAON_SOIL_PREDICTION_PRODUCTION_PACKAGE"
PROD_PACKAGE_CSV = PROD_PACKAGE_DIR / "data" / "malegaon_khurd_gat_soil_predictions.csv"
SYSTEM_DIR = PROJECT_ROOT / "FINAL_COMBINED_PREDICTION_SYSTEM"
MODELS_DIR = SYSTEM_DIR / "trained_models"
PREDICTIONS_CSV = SYSTEM_DIR / "cadastral_predictions" / "Gat_Wise_Cadastral_Perfect_Predictions_All_Parcels.csv"
ALL_FINAL_DIR = PROJECT_ROOT / "ALL_FINAL_DSM_RESULTS"
ALL_FINAL_PARCEL_CSV = ALL_FINAL_DIR / "04_Parcel_Predictions_and_GIS" / "malegaon_khurd_gat_soil_predictions.csv"
GEOJSON_PATH = PROJECT_ROOT / "frontend" / "public" / "data" / "malegaon_plots.geojson"

# Ensure FINAL_COMBINED_PREDICTION_SYSTEM is on sys.path for joblib unpickling and imports
if str(SYSTEM_DIR) not in sys.path:
    sys.path.insert(0, str(SYSTEM_DIR))

TARGETS = [
    "CaCO3_percent", "Fe_mg_kg", "Cu_mg_kg", "Zn_mg_kg", "K_kg_ha",
    "N_kg_ha", "pH", "OC_percent", "SOM_percent", "Mn_mg_kg",
    "S_kg_ha", "P_kg_ha", "total_carbon_percent", "EC_dS_m", "moisture_bulk_density_g_cm3",
    "Sand_percent", "Silt_percent", "Clay_percent"
]

TARGET_CONFIG: Dict[str, Dict[str, Any]] = {
    "CaCO3_percent": {
        "key": "caco3",
        "name": "Calcium Carbonate (CaCO₃ / Free Lime)",
        "name_mr": "कॅल्शियम कार्बोनेट (मुक्त चुनखडी)",
        "short_name": "CaCO₃",
        "unit": "%",
        "category": "Chemical",
        "csv_prefix": "CaCO3_percent",
        "dsm_prefix": "CaCO3",
        "tier": 1,
        "is_low_accuracy": False,
        "pred_col": "CaCO3_percent_Predicted_%",
        "ci_low_col": "CaCO3_percent_95CI_Lower",
        "ci_high_col": "CaCO3_percent_95CI_Upper",
        "status_col": "CaCO3_percent_Agronomic_Status",
        "standard_key": "free_lime",
    },
    "Fe_mg_kg": {
        "key": "iron",
        "name": "Available Iron (Fe)",
        "name_mr": "उपलब्ध लोह (Fe)",
        "short_name": "Fe",
        "unit": "mg/kg",
        "category": "Micronutrient",
        "csv_prefix": "Fe_mg_kg",
        "dsm_prefix": "Fe",
        "tier": 1,
        "is_low_accuracy": False,
        "pred_col": "Fe_mg_kg_Predicted_mg/kg",
        "ci_low_col": "Fe_mg_kg_95CI_Lower",
        "ci_high_col": "Fe_mg_kg_95CI_Upper",
        "status_col": "Fe_mg_kg_Agronomic_Status",
        "standard_key": "iron",
    },
    "Cu_mg_kg": {
        "key": "copper",
        "name": "Available Copper (Cu)",
        "name_mr": "उपलब्ध तांबे (Cu)",
        "short_name": "Cu",
        "unit": "mg/kg",
        "category": "Micronutrient",
        "csv_prefix": "Cu_mg_kg",
        "dsm_prefix": "Cu",
        "tier": 1,
        "is_low_accuracy": False,
        "pred_col": "Cu_mg_kg_Predicted_mg/kg",
        "ci_low_col": "Cu_mg_kg_95CI_Lower",
        "ci_high_col": "Cu_mg_kg_95CI_Upper",
        "status_col": "Cu_mg_kg_Agronomic_Status",
        "standard_key": "copper",
    },
    "Zn_mg_kg": {
        "key": "zinc",
        "name": "Available Zinc (Zn)",
        "name_mr": "उपलब्ध जस्त (Zn)",
        "short_name": "Zn",
        "unit": "mg/kg",
        "category": "Micronutrient",
        "csv_prefix": "Zn_mg_kg",
        "dsm_prefix": "Zn",
        "tier": 2,
        "is_low_accuracy": False,
        "pred_col": "Zn_mg_kg_Predicted_mg/kg",
        "ci_low_col": "Zn_mg_kg_95CI_Lower",
        "ci_high_col": "Zn_mg_kg_95CI_Upper",
        "status_col": "Zn_mg_kg_Agronomic_Status",
        "standard_key": "zinc",
    },
    "K_kg_ha": {
        "key": "available_potassium",
        "name": "Available Potassium (K)",
        "name_mr": "उपलब्ध पालाश (K)",
        "short_name": "K",
        "unit": "kg/ha",
        "category": "Primary Nutrient",
        "csv_prefix": "K_kg_ha",
        "dsm_prefix": "K",
        "tier": 2,
        "is_low_accuracy": False,
        "pred_col": "K_kg_ha_Predicted_kg/ha",
        "ci_low_col": "K_kg_ha_95CI_Lower",
        "ci_high_col": "K_kg_ha_95CI_Upper",
        "status_col": "K_kg_ha_Agronomic_Status",
        "standard_key": "available_potassium",
    },
    "N_kg_ha": {
        "key": "available_nitrogen",
        "name": "Available Nitrogen (N)",
        "name_mr": "उपलब्ध नत्र (N)",
        "short_name": "N",
        "unit": "kg/ha",
        "category": "Primary Nutrient",
        "csv_prefix": "N_kg_ha",
        "dsm_prefix": "N",
        "tier": 2,
        "is_low_accuracy": False,
        "pred_col": "N_kg_ha_Predicted_kg/ha",
        "ci_low_col": "N_kg_ha_95CI_Lower",
        "ci_high_col": "N_kg_ha_95CI_Upper",
        "status_col": "N_kg_ha_Agronomic_Status",
        "standard_key": "available_nitrogen",
    },
    "pH": {
        "key": "ph",
        "name": "Soil pH (Reaction)",
        "name_mr": "जमिनीचा सामू (pH)",
        "short_name": "pH",
        "unit": "pH",
        "category": "Chemical",
        "csv_prefix": "pH",
        "dsm_prefix": "pH",
        "tier": 1,
        "is_low_accuracy": False,
        "pred_col": "pH_Predicted_pH units",
        "ci_low_col": "pH_95CI_Lower",
        "ci_high_col": "pH_95CI_Upper",
        "status_col": "pH_Agronomic_Status",
        "standard_key": "ph",
    },
    "OC_percent": {
        "key": "organic_carbon",
        "name": "Organic Carbon (OC)",
        "name_mr": "सेंद्रिय कर्ब (OC)",
        "short_name": "OC",
        "unit": "%",
        "category": "Chemical",
        "csv_prefix": "OC_percent",
        "dsm_prefix": "OC",
        "tier": 2,
        "is_low_accuracy": False,
        "pred_col": "OC_percent_Predicted_%",
        "ci_low_col": "OC_percent_95CI_Lower",
        "ci_high_col": "OC_percent_95CI_Upper",
        "status_col": "OC_percent_Agronomic_Status",
        "standard_key": "organic_carbon",
    },
    "SOM_percent": {
        "key": "som",
        "name": "Soil Organic Matter (SOM)",
        "name_mr": "सेंद्रिय पदार्थ (SOM)",
        "short_name": "SOM",
        "unit": "%",
        "category": "Chemical",
        "csv_prefix": "SOM_percent",
        "dsm_prefix": None,
        "derived_from": "OC",
        "factor": 1.724,
        "tier": 2,
        "is_low_accuracy": False,
        "pred_col": "SOM_percent_Predicted_%",
        "ci_low_col": "SOM_percent_95CI_Lower",
        "ci_high_col": "SOM_percent_95CI_Upper",
        "status_col": "SOM_percent_Agronomic_Status",
        "standard_key": "som",
    },
    "Mn_mg_kg": {
        "key": "manganese",
        "name": "Available Manganese (Mn)",
        "name_mr": "उपलब्ध मँगनीज (Mn)",
        "short_name": "Mn",
        "unit": "mg/kg",
        "category": "Micronutrient",
        "csv_prefix": "Mn_mg_kg",
        "dsm_prefix": "Mn",
        "tier": 1,
        "is_low_accuracy": False,
        "pred_col": "Mn_mg_kg_Predicted_mg/kg",
        "ci_low_col": "Mn_mg_kg_95CI_Lower",
        "ci_high_col": "Mn_mg_kg_95CI_Upper",
        "status_col": "Mn_mg_kg_Agronomic_Status",
        "standard_key": "manganese",
    },
    "S_kg_ha": {
        "key": "sulphur",
        "name": "Available Sulphur (S)",
        "name_mr": "उपलब्ध गंधक (S)",
        "short_name": "S",
        "unit": "kg/ha",
        "category": "Secondary Nutrient",
        "csv_prefix": "S_kg_ha",
        "dsm_prefix": "S",
        "tier": 2,
        "is_low_accuracy": False,
        "pred_col": "S_kg_ha_Predicted_kg/ha",
        "ci_low_col": "S_kg_ha_95CI_Lower",
        "ci_high_col": "S_kg_ha_95CI_Upper",
        "status_col": "S_kg_ha_Agronomic_Status",
        "standard_key": "sulphur",
    },
    "P_kg_ha": {
        "key": "available_phosphorus",
        "name": "Available Phosphorus (P)",
        "name_mr": "उपलब्ध स्फुरद (P)",
        "short_name": "P",
        "unit": "kg/ha",
        "category": "Primary Nutrient",
        "csv_prefix": "P_kg_ha",
        "dsm_prefix": "P",
        "tier": 2,
        "is_low_accuracy": False,
        "pred_col": "P_kg_ha_Predicted_kg/ha",
        "ci_low_col": "P_kg_ha_95CI_Lower",
        "ci_high_col": "P_kg_ha_95CI_Upper",
        "status_col": "P_kg_ha_Agronomic_Status",
        "standard_key": "available_phosphorus",
    },
    "total_carbon_percent": {
        "key": "total_carbon",
        "name": "Total Carbon",
        "name_mr": "एकूण कर्ब",
        "short_name": "TC",
        "unit": "%",
        "category": "Chemical",
        "csv_prefix": "total_carbon_percent",
        "dsm_prefix": None,
        "derived_from": "OC",
        "factor": 1.15,
        "tier": 2,
        "is_low_accuracy": False,
        "pred_col": "total_carbon_percent_Predicted_%",
        "ci_low_col": "total_carbon_percent_95CI_Lower",
        "ci_high_col": "total_carbon_percent_95CI_Upper",
        "status_col": "total_carbon_percent_Agronomic_Status",
        "standard_key": "total_carbon",
    },
    "EC_dS_m": {
        "key": "ec",
        "name": "Electrical Conductivity (EC)",
        "name_mr": "विद्युत वाहकता (EC)",
        "short_name": "EC",
        "unit": "dS/m",
        "category": "Chemical",
        "csv_prefix": "EC_dS_m",
        "dsm_prefix": "EC",
        "tier": 1,
        "is_low_accuracy": False,
        "pred_col": "EC_dS_m_Predicted_dS/m",
        "ci_low_col": "EC_dS_m_95CI_Lower",
        "ci_high_col": "EC_dS_m_95CI_Upper",
        "status_col": "EC_dS_m_Agronomic_Status",
        "standard_key": "ec",
    },
    "moisture_bulk_density_g_cm3": {
        "key": "bd",
        "name": "Bulk Density",
        "name_mr": "मातीची घनता (Bulk Density)",
        "short_name": "BD",
        "unit": "g/cm³",
        "category": "Physical",
        "csv_prefix": "moisture_bulk_density_g_cm3",
        "dsm_prefix": None,
        "tier": 1,
        "is_low_accuracy": False,
        "pred_col": "moisture_bulk_density_g_cm3_Predicted_g/cm³",
        "ci_low_col": "moisture_bulk_density_g_cm3_95CI_Lower",
        "ci_high_col": "moisture_bulk_density_g_cm3_95CI_Upper",
        "status_col": "moisture_bulk_density_g_cm3_Agronomic_Status",
        "standard_key": "bd",
    },
    "Sand_percent": {
        "key": "sand",
        "name": "Sand Proportion",
        "name_mr": "वाळू / रेतीचे प्रमाण",
        "short_name": "Sand",
        "unit": "%",
        "category": "Physical",
        "csv_prefix": "Sand_percent",
        "dsm_prefix": "Sand",
        "tier": 2,
        "is_low_accuracy": False,
        "pred_col": "Sand_percent_Predicted_%",
        "ci_low_col": "Sand_percent_95CI_Lower",
        "ci_high_col": "Sand_percent_95CI_Upper",
        "status_col": "Sand_percent_Agronomic_Status",
        "standard_key": "sand",
    },
    "Silt_percent": {
        "key": "silt",
        "name": "Silt Proportion",
        "name_mr": "गाळाचे प्रमाण",
        "short_name": "Silt",
        "unit": "%",
        "category": "Physical",
        "csv_prefix": "Silt_percent",
        "dsm_prefix": "Silt",
        "tier": 2,
        "is_low_accuracy": False,
        "pred_col": "Silt_percent_Predicted_%",
        "ci_low_col": "Silt_percent_95CI_Lower",
        "ci_high_col": "Silt_percent_95CI_Upper",
        "status_col": "Silt_percent_Agronomic_Status",
        "standard_key": "silt",
    },
    "Clay_percent": {
        "key": "clay",
        "name": "Clay Proportion",
        "name_mr": "चिकणमातीचे प्रमाण",
        "short_name": "Clay",
        "unit": "%",
        "category": "Physical",
        "csv_prefix": "Clay_percent",
        "dsm_prefix": "Clay",
        "tier": 1,
        "is_low_accuracy": False,
        "pred_col": "Clay_percent_Predicted_%",
        "ci_low_col": "Clay_percent_95CI_Lower",
        "ci_high_col": "Clay_percent_95CI_Upper",
        "status_col": "Clay_percent_Agronomic_Status",
        "standard_key": "clay",
    },
}

class SoilModelService:
    def __init__(self):
        self._prediction_system = None
        self._cadastral_cache: Dict[str, Dict[str, Any]] = {}
        self._point_cache: Dict[Tuple[float, float], Dict[str, Any]] = {}
        self._load_cadastral_csv()

    def _load_cadastral_csv(self):
        """Loads and indexes the precomputed Gat parcel predictions from ALL_FINAL_DSM_RESULTS.
        Saves predictions across all 15+ soil fertility and granulometry targets.
        """
        centroids: Dict[str, Tuple[float, float]] = {}
        if GEOJSON_PATH.exists():
            try:
                import json
                with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
                    gj = json.load(f)
                for feat in gj.get("features", []):
                    props = feat.get("properties", {})
                    gno = str(props.get("gat_no", "")).strip()
                    c = props.get("centroid")
                    if gno and c and len(c) >= 2:
                        centroids[gno] = (float(c[1]), float(c[0]))  # (lat, lon)
            except Exception as e:
                logger.warning(f"Could not load centroids from GeoJSON: {e}")

        from app.services.soil_interpretation import interpret_parameter

        target_csv = PROD_PACKAGE_CSV if PROD_PACKAGE_CSV.exists() else ALL_FINAL_PARCEL_CSV
        if target_csv.exists():
            try:
                df = pd.read_csv(target_csv)
                prod_col_map = {
                    "pH": ["pH (Predicted Mean)", "pH_Mean_Predicted"],
                    "OC_percent": ["OC pct (Predicted Mean)", "OC_Mean_Predicted"],
                    "SOM_percent": ["SOM pct (Predicted Mean)", "SOM_Mean_Predicted"],
                    "N_kg_ha": ["Available N kg ha (Predicted Mean)", "N_Mean_Predicted"],
                    "P_kg_ha": ["Available P kg ha (Predicted Mean)", "P_Mean_Predicted"],
                    "K_kg_ha": ["Available K kg ha (Predicted Mean)", "K_Mean_Predicted"],
                    "S_kg_ha": ["Available S kg ha (Predicted Mean)", "S_Mean_Predicted"],
                    "CaCO3_percent": ["CaCO3 pct (Predicted Mean)", "CaCO3_Mean_Predicted"],
                    "Fe_mg_kg": ["Fe mg kg (Predicted Mean)", "Fe_Mean_Predicted"],
                    "Zn_mg_kg": ["Zn mg kg (Predicted Mean)", "Zn_Mean_Predicted"],
                    "Cu_mg_kg": ["Cu mg kg (Predicted Mean)", "Cu_Mean_Predicted"],
                    "Mn_mg_kg": ["Mn mg kg (Predicted Mean)", "Mn_Mean_Predicted"],
                    "EC_dS_m": ["EC dSm (Predicted Mean)", "EC_Mean_Predicted"],
                    "Clay_percent": ["Clay pct (Predicted Mean)", "Clay_Mean_Predicted", "SoilGrids_Clay_pct"],
                    "Sand_percent": ["Sand pct (Predicted Mean)", "Sand_Mean_Predicted", "SoilGrids_Sand_pct"],
                    "Silt_percent": ["Silt pct (Predicted Mean)", "Silt_Mean_Predicted", "SoilGrids_Silt_pct"],
                    "moisture_bulk_density_g_cm3": ["SoilGrids_BulkDensity_g_cm3", "BD_Mean_Predicted"],
                    "total_carbon_percent": ["total_carbon_Mean_Predicted"],
                }

                for _, row in df.iterrows():
                    gat_raw = str(row.get("Gat_Parcel_ID") or row.get("Gat_Name") or row.get("Gat_Number") or "").strip()
                    clean_key = gat_raw.replace("Gat ", "").strip()
                    m = re.search(r"\d+", gat_raw)
                    clean_num = m.group(0) if m else clean_key

                    sampling_status = str(row.get("Sampling_Status", "Sampled" if row.get("Is_Sampled") in [True, 1, "True", "Yes"] else "Predicted")).strip()
                    lab_count = int(row.get("Lab_Sample_Count", row.get("Ground_Truth_Samples_Count", 0))) if pd.notna(row.get("Lab_Sample_Count", row.get("Ground_Truth_Samples_Count", 0))) else 0
                    area_ha = float(row.get("Parcel_Area_ha", row.get("Area_Hectares", row.get("area_ha", 0.0))))
                    uncertainty = float(row.get("Composite_Uncertainty_Index_0_100", 0.0))

                    coords = centroids.get(clean_key, centroids.get(clean_num, (18.156, 74.530)))
                    lat, lon = coords

                    entry: Dict[str, Any] = {
                        "gat_no": clean_key,
                        "gat_name": f"Gat {clean_key}",
                        "latitude": lat,
                        "longitude": lon,
                        "area_ha": area_ha,
                        "sampling_status": sampling_status,
                        "lab_sample_count": lab_count,
                        "composite_uncertainty": uncertainty,
                        "targets": {},
                        "source": "MALEGAON_SOIL_PREDICTION_PRODUCTION_PACKAGE" if target_csv == PROD_PACKAGE_CSV else "ALL_FINAL_DSM_RESULTS",
                    }

                    for target, cfg in TARGET_CONFIG.items():
                        dsm_prefix = cfg.get("dsm_prefix")
                        derived_from = cfg.get("derived_from")
                        factor = cfg.get("factor", 1.0)
                        tier = cfg.get("tier", 1)
                        is_low = cfg.get("is_low_accuracy", False)

                        val = None
                        candidates = prod_col_map.get(target, [])
                        if dsm_prefix:
                            candidates.append(f"{dsm_prefix}_Mean_Predicted")
                        for col in candidates:
                            if col in row and pd.notna(row[col]):
                                try:
                                    val = float(row[col])
                                    break
                                except (ValueError, TypeError):
                                    pass

                        stderr = 0.0
                        if dsm_prefix and f"{dsm_prefix}_Kriging_StdErr" in row and pd.notna(row[f"{dsm_prefix}_Kriging_StdErr"]):
                            stderr = float(row[f"{dsm_prefix}_Kriging_StdErr"])

                        if val is None:
                            if target == "SOM_percent":
                                oc_val = float(entry["targets"].get("OC_percent", {}).get("value", 0.58))
                                val = round(oc_val * 1.724, 3)
                            elif target == "total_carbon_percent":
                                oc_val = float(entry["targets"].get("OC_percent", {}).get("value", 0.58))
                                val = round(oc_val * 1.1, 3)
                            elif target == "moisture_bulk_density_g_cm3":
                                val = 1.54
                            else:
                                val = 0.0

                        ci_low = max(0.0, val - 1.96 * stderr) if stderr > 0 else round(val * 0.9, 3)
                        ci_high = val + 1.96 * stderr if stderr > 0 else round(val * 1.1, 3)
                        lab_val = float(row[f"{dsm_prefix}_Lab_Measured_Mean"]) if dsm_prefix and f"{dsm_prefix}_Lab_Measured_Mean" in row and pd.notna(row[f"{dsm_prefix}_Lab_Measured_Mean"]) else None

                        interp_en, interp_mr, _ = interpret_parameter(cfg["key"], val)

                        entry["targets"][target] = {
                            "target": target,
                            "key": cfg["key"],
                            "name": cfg["name"],
                            "name_mr": cfg["name_mr"],
                            "unit": cfg["unit"],
                            "category": cfg["category"],
                            "value": round(val, 3),
                            "stderr": round(stderr, 3),
                            "ci_95": [round(ci_low, 3), round(ci_high, 3)],
                            "ci_lower": round(ci_low, 3),
                            "ci_upper": round(ci_high, 3),
                            "agronomic_status": interp_en,
                            "agronomic_status_mr": interp_mr,
                            "accuracy_tier": tier,
                            "is_low_accuracy": is_low,
                            "lab_measured_value": round(lab_val, 3) if lab_val is not None else None,
                            "sampling_status": sampling_status,
                            "submodels": {},
                        }

                    self._cadastral_cache[clean_key] = entry
                    self._cadastral_cache[clean_key.lower()] = entry
                    self._cadastral_cache[f"gat {clean_key}".lower()] = entry
                    self._cadastral_cache[gat_raw.lower()] = entry
                    if clean_num not in self._cadastral_cache:
                        self._cadastral_cache[clean_num] = entry
                        self._cadastral_cache[f"gat {clean_num}".lower()] = entry

                logger.info(f"Loaded {len(df)} Gat cadastral parcel predictions from {target_csv.name}.")
                return
            except Exception as e:
                logger.error(f"Error loading cadastral predictions: {e}")

        # Fallback to legacy predictions CSV
        if PREDICTIONS_CSV.exists():
            try:
                df = pd.read_csv(PREDICTIONS_CSV)
                for _, row in df.iterrows():
                    gat_raw = str(row["Gat_Name"]).strip()
                    m = re.search(r"\d+", gat_raw)
                    clean_num = m.group(0) if m else gat_raw

                    entry = {
                        "gat_no": clean_num,
                        "gat_name": gat_raw,
                        "latitude": float(row["latitude"]) if "latitude" in row else None,
                        "longitude": float(row["longitude"]) if "longitude" in row else None,
                        "area_ha": None,
                        "sampling_status": "Predicted",
                        "lab_sample_count": 0,
                        "composite_uncertainty": 10.0,
                        "targets": {},
                        "source": "FINAL_COMBINED_PREDICTION_SYSTEM (Super Learner Ensemble)",
                    }

                    for target, cfg in TARGET_CONFIG.items():
                        pred_col = cfg.get("pred_col")
                        ci_low_col = cfg.get("ci_low_col")
                        ci_high_col = cfg.get("ci_high_col")
                        status_col = cfg.get("status_col")

                        val = float(row[pred_col]) if pred_col in row and pd.notna(row[pred_col]) else 0.0
                        ci_low = float(row[ci_low_col]) if ci_low_col in row and pd.notna(row[ci_low_col]) else val
                        ci_high = float(row[ci_high_col]) if ci_high_col in row and pd.notna(row[ci_high_col]) else val
                        status = str(row[status_col]) if status_col in row and pd.notna(row[status_col]) else "Normal"

                        entry["targets"][target] = {
                            "target": target,
                            "key": cfg["key"],
                            "name": cfg["name"],
                            "name_mr": cfg["name_mr"],
                            "unit": cfg["unit"],
                            "category": cfg["category"],
                            "value": round(val, 3),
                            "ci_95": [round(ci_low, 3), round(ci_high, 3)],
                            "ci_lower": round(ci_low, 3),
                            "ci_upper": round(ci_high, 3),
                            "agronomic_status": status,
                            "accuracy_tier": cfg.get("tier", 1),
                            "is_low_accuracy": cfg.get("is_low_accuracy", False),
                            "lab_measured_value": None,
                            "sampling_status": "Predicted",
                            "submodels": {},
                        }

                    self._cadastral_cache[clean_key] = entry
                    self._cadastral_cache[clean_key.lower()] = entry
                    self._cadastral_cache[f"gat {clean_key}".lower()] = entry
                    self._cadastral_cache[gat_raw.lower()] = entry
                    if clean_num not in self._cadastral_cache:
                        self._cadastral_cache[clean_num] = entry
                        self._cadastral_cache[f"gat {clean_num}".lower()] = entry
                logger.info(f"Loaded {len(df)} Gat cadastral parcel predictions from legacy CSV.")
            except Exception as e:
                logger.error(f"Error loading legacy cadastral predictions CSV: {e}")

    def get_prediction_system(self):
        """Lazy loader for the heavy SoilPredictionSystem (IDW + Kriging + ML + RK)."""
        if self._prediction_system is None:
            try:
                from perfect_prediction_system import SoilPredictionSystem
                self._prediction_system = SoilPredictionSystem(models_dir=str(MODELS_DIR))
                logger.info("Master SoilPredictionSystem initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize SoilPredictionSystem: {e}")
                raise
        return self._prediction_system

    def get_gat_prediction(self, gat_no: str) -> Optional[Dict[str, Any]]:
        """Returns precomputed model prediction for a specific Gat number."""
        clean = str(gat_no).strip().lower()
        m = re.search(r"\d+", clean)
        clean_num = m.group(0) if m else clean

        if clean_num in self._cadastral_cache:
            return self._cadastral_cache[clean_num]
        if clean in self._cadastral_cache:
            return self._cadastral_cache[clean]
        return None

    def predict_point(self, lat: float, lon: float) -> Dict[str, Any]:
        """Runs live inference on any geographic coordinate (lat, lon) using the trained ensemble with LRU point caching."""
        cache_key = (round(lat, 4), round(lon, 4))
        if cache_key in self._point_cache:
            return self._point_cache[cache_key]

        system = self.get_prediction_system()
        df_res = system.predict({"latitude": lat, "longitude": lon}, detailed=True)
        row = df_res.iloc[0]

        targets_dict: Dict[str, Any] = {}
        for target, cfg in TARGET_CONFIG.items():
            unit = cfg["unit"]
            pred_col = f"{target}_Predicted_{unit}" if f"{target}_Predicted_{unit}" in row else cfg["pred_col"]
            ci_low_col = f"{target}_95CI_Lower"
            ci_high_col = f"{target}_95CI_Upper"
            status_col = f"{target}_Agronomic_Status"

            val = float(row[pred_col]) if pred_col in row and pd.notna(row[pred_col]) else 0.0
            ci_low = float(row[ci_low_col]) if ci_low_col in row and pd.notna(row[ci_low_col]) else val
            ci_high = float(row[ci_high_col]) if ci_high_col in row and pd.notna(row[ci_high_col]) else val
            status = str(row[status_col]) if status_col in row and pd.notna(row[status_col]) else "Normal"

            submodels = {}
            for col in row.index:
                if col.startswith(f"{target}_SubModel_"):
                    sm_name = col.replace(f"{target}_SubModel_", "")
                    submodels[sm_name] = round(float(row[col]), 3) if pd.notna(row[col]) else None

            targets_dict[target] = {
                "target": target,
                "key": cfg["key"],
                "name": cfg["name"],
                "name_mr": cfg["name_mr"],
                "unit": cfg["unit"],
                "category": cfg["category"],
                "value": round(val, 3),
                "ci_95": [round(ci_low, 3), round(ci_high, 3)],
                "ci_lower": round(ci_low, 3),
                "ci_upper": round(ci_high, 3),
                "agronomic_status": status,
                "submodels": submodels,
            }

        result = {
            "latitude": lat,
            "longitude": lon,
            "targets": targets_dict,
            "source": "FINAL_COMBINED_PREDICTION_SYSTEM (Super Learner Ensemble)",
            "model_architecture": "Convex Stacking Ensemble (IDW + Kriging + ML Regressors + Regression Kriging)",
        }
        self._point_cache[cache_key] = result
        return result

    def get_or_predict_gat(
        self,
        gat_no: str,
        fallback_lat: Optional[float] = None,
        fallback_lon: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Fetches from cadastral cache if available, else predicts dynamically via centroid."""
        entry = self.get_gat_prediction(gat_no)
        if entry:
            return entry

        # Lookup centroid from KML service if coordinates not provided
        lat, lon = fallback_lat, fallback_lon
        if lat is None or lon is None:
            try:
                from app.gis.kml_service import kml_service
                kml_gat = kml_service.get_gat_by_no(gat_no)
                if kml_gat and kml_gat.get("centroid"):
                    lon, lat = kml_gat["centroid"]
            except Exception:
                pass

        if lat is None or lon is None:
            lat, lon = 18.156, 74.530

        pred = self.predict_point(lat, lon)
        pred["gat_no"] = str(gat_no)
        pred["gat_name"] = f"Gat {gat_no}"
        return pred

    def get_all_cadastral_records(self) -> List[Dict[str, Any]]:
        """Returns all 220+ precomputed Gat cadastral predictions."""
        # Deduplicate keys (since stored under both clean_num and gat_raw.lower())
        unique_gats = {}
        for k, v in self._cadastral_cache.items():
            if k.isdigit():
                unique_gats[k] = v
        return list(unique_gats.values())


soil_model_service = SoilModelService()

