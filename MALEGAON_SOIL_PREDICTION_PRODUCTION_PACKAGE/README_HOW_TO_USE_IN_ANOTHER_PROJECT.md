# Standalone Soil Prediction Package (Malegaon Khurd)

This folder is a **fully self-contained, production-ready Digital Soil Prediction Package** for **Malegaon Khurd village** ($1,117.52\text{ ha}$, Baramati, Pune, Maharashtra).

You can copy this entire folder into **any other project** (such as a Web API, FastAPI/Flask backend, Streamlit dashboard, Mobile app service, or GIS processing script) to make real-time soil predictions and generate MPKV Rahuri fertilizer prescriptions.

---

## 1. Folder Structure

```
MALEGAON_SOIL_PREDICTION_PRODUCTION_PACKAGE/
│
├── predict_soil_engine.py         # Main Python prediction engine & CLI tool
├── requirements.txt               # Required Python packages
├── README_HOW_TO_USE_IN_ANOTHER_PROJECT.md  # This instruction guide
│
├── rasters_10m/                   # 16 Calibrated 10m Continuous GeoTIFF Rasters
│   ├── Malegaon_pH_10m.tif
│   ├── Malegaon_CaCO3_pct_10m.tif
│   ├── Malegaon_Available_N_kg_ha_10m.tif
│   ├── Malegaon_Available_P_kg_ha_10m.tif
│   ├── Malegaon_Available_K_kg_ha_10m.tif
│   ├── Malegaon_Clay_pct_10m.tif
│   └── ... (All 16 properties)
│
├── cadastre/                      # Official Cadastral Boundary Vectors
│   └── Malegaon_Cadastral_Boundaries_Raw.kml  (All 237 legal Gat parcels)
│
├── data/                          # Master Data & Pre-computed Cadastral Cards
│   └── Malegaon_Khurd_Master_Gat_and_Point_Predictions_Actual_vs_Predicted.xlsx
│
└── docs/                          # Scientific & Statistical Documentation
    ├── FINAL_MALEGAON_SOIL_PREDICTION_MASTER_REPORT.md
    └── EXECUTIVE_STATISTICAL_AND_PROVENANCE_REPORT.md
```

---

## 2. Installation in Another Project

### Step 1: Copy the Folder
Copy this `MALEGAON_SOIL_PREDICTION_PRODUCTION_PACKAGE` folder into your other project workspace.

### Step 2: Install Python Dependencies
Run from your terminal:
```bash
pip install -r requirements.txt
```
*(Dependencies: `rasterio`, `pyproj`, `pandas`, `numpy`, `openpyxl`, `shapely`)*

---

## 3. How to Use in Your Python Code

### Example A: Predict by GPS Coordinate (Phone / Field Query)
```python
from predict_soil_engine import SoilPredictionEngine

# Initialize the engine (automatically finds the rasters)
engine = SoilPredictionEngine()

# Predict for any GPS coordinate (Latitude, Longitude)
result = engine.predict_point(lat=18.1480, lon=74.5220)

if result["status"] == "success":
    # Access predicted soil chemistry
    preds = result["predictions"]
    print(f"Soil pH: {preds['Soil Reaction (pH)']}")
    print(f"Free Lime: {preds['Free Calcium Carbonate (CaCO3)']}%")
    print(f"Available Nitrogen: {preds['Available Nitrogen (N)']} kg/ha")
    print(f"Clay Content: {preds['Clay Content']}%")
    
    # Access fertilizer prescriptions
    fert = result["fertilizer_prescriptions"]
    print(f"Urea required: {fert['Urea_Bags_Acre']} bags/acre")
    print(f"Potash required: {fert['MOP_Bags_Acre']} bags/acre")
```

---

### Example B: Predict by Cadastral Parcel (Gat Number 1 to 237)
```python
from predict_soil_engine import SoilPredictionEngine

engine = SoilPredictionEngine()

# Query by Gat Number
gat_data = engine.predict_gat(gat_number=90)

if gat_data["status"] == "success":
    print(f"Gat Name: {gat_data['gat_name']}")
    print(f"Area: {gat_data['area_hectares']} ha")
    print(f"Was Sampled: {gat_data['is_sampled']}")
    
    # Print formatted Soil Health Card
    card_text = engine.format_soil_health_card(f"Gat {gat_data['gat_number']}", gat_data)
    print(card_text)
```

---

### Example C: Batch Predict from Any KML File
```python
from predict_soil_engine import SoilPredictionEngine

engine = SoilPredictionEngine()

# Predict all farms inside a KML file and save to Excel
res = engine.predict_kml("my_farms.kml", out_xlsx="Batch_Predictions.xlsx")
print(f"Predicted {res['feature_count']} farms successfully!")
```

---

## 4. How to Use from Command Line (CLI)

You can run predictions directly from terminal or PowerShell:

```bash
# 1. Predict any GPS coordinate:
python predict_soil_engine.py --lat 18.1480 --lon 74.5220

# 2. Predict any Cadastral Gat Survey parcel:
python predict_soil_engine.py --gat 90

# 3. Batch predict a custom KML file:
python predict_soil_engine.py --kml cadastre/Malegaon_Cadastral_Boundaries_Raw.kml --out All_Gats.xlsx
```

---

## 5. Output Properties & Units

Every prediction returns all **16 calibrated soil parameters**:
1. `Soil Reaction (pH)`: $\text{pH units}$
2. `Electrical Conductivity (EC)`: $\text{dS/m}$
3. `Organic Carbon (OC)`: $\%$
4. `Soil Organic Matter (SOM)`: $\%$
5. `Available Nitrogen (N)`: $\text{kg/ha}$
6. `Available Phosphorus (P)`: $\text{kg/ha}$
7. `Available Potassium (K)`: $\text{kg/ha}$
8. `Available Sulfur (S)`: $\text{kg/ha}$
9. `Free Calcium Carbonate (CaCO3)`: $\%$
10. `Available Iron (Fe)`: $\text{mg/kg}$
11. `Available Manganese (Mn)`: $\text{mg/kg}$
12. `Available Zinc (Zn)`: $\text{mg/kg}$
13. `Available Copper (Cu)`: $\text{mg/kg}$
14. `Clay Content`: $\%$
15. `Sand Content`: $\%$
16. `Silt Content`: $\%$

And automated **MPKV Rahuri University fertilizer recommendations**:
* `Urea_Bags_Acre`
* `DAP_Bags_Acre`
* `MOP_Bags_Acre`
* `Fe_EDTA_Spray` (Lime-induced chlorosis warning)
* `Zinc_Dose`
