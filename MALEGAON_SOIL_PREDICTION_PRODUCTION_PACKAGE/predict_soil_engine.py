"""
=====================================================================================
MALEGAON KHURD - STANDALONE DIGITAL SOIL PREDICTION ENGINE
=====================================================================================
Production-ready Python module & CLI tool for predicting 16 soil properties and
prescribing MPKV Rahuri fertilizer recommendations across Malegaon Khurd (1,117.52 ha).

Can be used in:
1. Python scripts / Jupyter notebooks:
   >>> from predict_soil_engine import SoilPredictionEngine
   >>> engine = SoilPredictionEngine()
   >>> preds = engine.predict_point(lat=18.1480, lon=74.5220)
   >>> gat_preds = engine.predict_gat(gat_number=90)

2. Command-Line Interface (CLI):
   $ python predict_soil_engine.py --lat 18.1480 --lon 74.5220
   $ python predict_soil_engine.py --gat 90
   $ python predict_soil_engine.py --kml custom_farms.kml --out predictions.xlsx
=====================================================================================
"""

import os
import sys
import argparse
import xml.etree.ElementTree as ET
import numpy as np
import pandas as pd
from pyproj import Transformer
import rasterio

class SoilPredictionEngine:
    def __init__(self, base_dir=None):
        if base_dir is None:
            self.base_dir = os.path.dirname(os.path.abspath(__file__))
        else:
            self.base_dir = base_dir
            
        self.raster_dir = os.path.join(self.base_dir, "rasters_10m")
        self.data_dir = os.path.join(self.base_dir, "data")
        self.cadastre_dir = os.path.join(self.base_dir, "cadastre")
        
        # 16 Properties mapped to 10m GeoTIFF rasters
        self.raster_map = {
            "Soil Reaction (pH)": ("Malegaon_pH_10m.tif", "pH units"),
            "Electrical Conductivity (EC)": ("Malegaon_EC_dSm_10m.tif", "dS/m"),
            "Organic Carbon (OC)": ("Malegaon_OC_pct_10m.tif", "%"),
            "Soil Organic Matter (SOM)": ("Malegaon_SOM_pct_10m.tif", "%"),
            "Available Nitrogen (N)": ("Malegaon_Available_N_kg_ha_10m.tif", "kg/ha"),
            "Available Phosphorus (P)": ("Malegaon_Available_P_kg_ha_10m.tif", "kg/ha"),
            "Available Potassium (K)": ("Malegaon_Available_K_kg_ha_10m.tif", "kg/ha"),
            "Available Sulfur (S)": ("Malegaon_Available_S_kg_ha_10m.tif", "kg/ha"),
            "Free Calcium Carbonate (CaCO3)": ("Malegaon_CaCO3_pct_10m.tif", "%"),
            "Available Iron (Fe)": ("Malegaon_Fe_mg_kg_10m.tif", "mg/kg"),
            "Available Manganese (Mn)": ("Malegaon_Mn_mg_kg_10m.tif", "mg/kg"),
            "Available Zinc (Zn)": ("Malegaon_Zn_mg_kg_10m.tif", "mg/kg"),
            "Available Copper (Cu)": ("Malegaon_Cu_mg_kg_10m.tif", "mg/kg"),
            "Clay Content": ("Malegaon_Clay_pct_10m.tif", "%"),
            "Sand Content": ("Malegaon_Sand_pct_10m.tif", "%"),
            "Silt Content": ("Malegaon_Silt_pct_10m.tif", "%"),
        }
        
        # WGS84 (EPSG:4326) -> UTM Zone 43N (EPSG:32643) Transformer
        self.transformer = Transformer.from_crs("EPSG:4326", "EPSG:32643", always_xy=True)
        
        # Candidate master Excel path
        self.master_xlsx = os.path.join(self.data_dir, "Malegaon_Khurd_Master_Gat_and_Point_Predictions_Actual_vs_Predicted.xlsx")
        
    def classify_agronomic(self, prop, val):
        """Classifies soil parameter into official ICAR / MPKV Rahuri rating tiers."""
        if "pH" in prop:
            if val < 6.5: return "Acidic"
            elif val <= 7.8: return "Neutral / Ideal"
            elif val <= 8.5: return "Moderately Alkaline"
            else: return "Strongly Alkaline"
        elif "CaCO3" in prop:
            if val < 5.0: return "Non-Calcareous"
            elif val <= 10.0: return "Moderately Calcareous"
            else: return "Highly Calcareous (Chlorosis Risk)"
        elif "Nitrogen" in prop:
            if val < 280.0: return "Low (Deficient)"
            elif val <= 560.0: return "Medium"
            else: return "High"
        elif "Phosphorus" in prop:
            if val < 14.0: return "Low (Deficient)"
            elif val <= 28.0: return "Medium"
            else: return "High"
        elif "Potassium" in prop:
            if val < 140.0: return "Low (Deficient)"
            elif val <= 280.0: return "Medium"
            else: return "Very High (Abundant Basalt Reserve)"
        elif "Organic Carbon" in prop:
            if val < 0.50: return "Low (Deficient)"
            elif val <= 0.75: return "Medium"
            else: return "High"
        elif "Iron" in prop:
            return "Deficient (< 4.5)" if val < 4.5 else "Sufficient"
        elif "Zinc" in prop:
            return "Deficient (< 0.6)" if val < 0.6 else "Sufficient"
        return "Normal"

    def compute_fertilizer_prescription(self, preds):
        """Calculates MPKV Rahuri precision fertilizer dosages for Sugarcane & Wheat."""
        n_val = preds.get("Available Nitrogen (N)", 180.0)
        p_val = preds.get("Available Phosphorus (P)", 25.0)
        k_val = preds.get("Available Potassium (K)", 500.0)
        caco3_val = preds.get("Free Calcium Carbonate (CaCO3)", 8.0)
        zn_val = preds.get("Available Zinc (Zn)", 0.8)
        
        # Sugarcane Bags / Acre
        urea_bags = 4.5 if n_val < 280.0 else 3.5
        dap_bags = 1.5 if p_val < 14.0 else 1.0
        mop_bags = 0.0 if k_val > 400.0 else 0.5
        
        fe_spray = "YES (Foliar spray of 0.2% Chelated Fe-EDTA at 45 & 75 DAP)" if caco3_val > 10.0 else "NO (Normal soil conditions)"
        zn_dose = "10 kg/acre Zinc Sulfate (Soil Application)" if zn_val < 0.6 else "None (Sufficient Zinc in soil)"
        
        return {
            "Urea_Bags_Acre": urea_bags,
            "DAP_Bags_Acre": dap_bags,
            "MOP_Bags_Acre": mop_bags,
            "Fe_EDTA_Spray": fe_spray,
            "Zinc_Dose": zn_dose
        }

    def predict_point(self, lat, lon):
        """
        Samples the 16 GeoTIFF rasters directly at any given Lat/Lon coordinate.
        Returns a dictionary of predicted soil properties, UTM coordinates, and fertilizer plan.
        """
        x_utm, y_utm = self.transformer.transform(lon, lat)
        
        ref_raster = os.path.join(self.raster_dir, list(self.raster_map.values())[0][0])
        if not os.path.exists(ref_raster):
            raise FileNotFoundError(f"Raster directory not found at: {self.raster_dir}")
            
        with rasterio.open(ref_raster) as src:
            bounds = src.bounds
            if not (bounds.left <= x_utm <= bounds.right and bounds.bottom <= y_utm <= bounds.top):
                return {
                    "status": "error",
                    "message": f"Coordinates ({lat}, {lon}) are outside the Malegaon Khurd boundary!"
                }
            row, col = src.index(x_utm, y_utm)
            
        predictions = {}
        for prop_name, (tif_name, unit) in self.raster_map.items():
            p_path = os.path.join(self.raster_dir, tif_name)
            if os.path.exists(p_path):
                with rasterio.open(p_path) as s:
                    val = float(s.read(1)[row, col])
                    predictions[prop_name] = round(val, 3)
            else:
                predictions[prop_name] = np.nan
                
        fert = self.compute_fertilizer_prescription(predictions)
        
        return {
            "status": "success",
            "query_type": "GPS_Coordinate",
            "latitude": lat,
            "longitude": lon,
            "utm_easting_m": round(x_utm, 2),
            "utm_northing_m": round(y_utm, 2),
            "predictions": predictions,
            "fertilizer_prescriptions": fert
        }

    def predict_gat(self, gat_number):
        """
        Retrieves cadastral zonal statistics from the Master Health Cards for any legal Gat number.
        Returns predicted mean soil properties, cadastral area, sampled status, and fertilizer plan.
        """
        if not os.path.exists(self.master_xlsx):
            return {"status": "error", "message": f"Master Excel not found at: {self.master_xlsx}"}
            
        df_gat = pd.read_excel(self.master_xlsx, sheet_name="04_Cadastral_Gat_Predictions")
        sub = df_gat[df_gat['Gat_Number'] == int(gat_number)]
        if len(sub) == 0:
            return {"status": "error", "message": f"Gat Number {gat_number} not found in Malegaon Khurd cadastre!"}
            
        row = sub.iloc[0]
        predictions = {
            "Soil Reaction (pH)": round(float(row.get("pH (Predicted Mean)", 8.2)), 3),
            "Electrical Conductivity (EC)": round(float(row.get("EC dSm (Predicted Mean)", 0.5)), 3),
            "Organic Carbon (OC)": round(float(row.get("OC pct (Predicted Mean)", 0.6)), 3),
            "Soil Organic Matter (SOM)": round(float(row.get("SOM pct (Predicted Mean)", 1.0)), 3),
            "Available Nitrogen (N)": round(float(row.get("Available N kg ha (Predicted Mean)", 180.0)), 2),
            "Available Phosphorus (P)": round(float(row.get("Available P kg ha (Predicted Mean)", 25.0)), 2),
            "Available Potassium (K)": round(float(row.get("Available K kg ha (Predicted Mean)", 500.0)), 2),
            "Available Sulfur (S)": round(float(row.get("Available S kg ha (Predicted Mean)", 28.0)), 2),
            "Free Calcium Carbonate (CaCO3)": round(float(row.get("CaCO3 pct (Predicted Mean)", 8.5)), 2),
            "Available Iron (Fe)": round(float(row.get("Fe mg kg (Predicted Mean)", 4.0)), 3),
            "Available Manganese (Mn)": round(float(row.get("Mn mg kg (Predicted Mean)", 9.0)), 3),
            "Available Zinc (Zn)": round(float(row.get("Zn mg kg (Predicted Mean)", 1.0)), 3),
            "Available Copper (Cu)": round(float(row.get("Cu mg kg (Predicted Mean)", 1.8)), 3),
            "Clay Content": round(float(row.get("Clay pct (Predicted Mean)", 67.0)), 2),
            "Sand Content": round(float(row.get("Sand pct (Predicted Mean)", 22.0)), 2),
            "Silt Content": round(float(row.get("Silt pct (Predicted Mean)", 11.0)), 2),
        }
        fert = self.compute_fertilizer_prescription(predictions)
        
        return {
            "status": "success",
            "query_type": "Cadastral_Gat_Parcel",
            "gat_number": int(gat_number),
            "gat_name": row.get("Gat_Name", f"Gat {gat_number}"),
            "area_hectares": round(float(row.get("Area_Hectares", 0.0)), 2),
            "is_sampled": bool(row.get("Is_Sampled", False)),
            "textural_class": "Deep Clay Vertisol (Black Cotton Soil)",
            "predictions": predictions,
            "fertilizer_prescriptions": fert
        }

    def predict_kml(self, kml_path, out_xlsx=None, limit=None):
        """
        Parses any KML file containing points or polygons, predicts each feature,
        and optionally exports a complete Excel dossier.
        """
        if not os.path.exists(kml_path):
            return {"status": "error", "message": f"KML file '{kml_path}' not found!"}
            
        with open(kml_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        if "xmlns:xsi" not in text:
            text = text.replace("<kml ", '<kml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ')
        root = ET.fromstring(text)
        
        placemarks = root.findall(".//{*}Placemark")
        records = []
        count = 0
        for p in placemarks:
            name_el = p.find(".//{*}name")
            name = name_el.text.strip() if (name_el is not None and name_el.text) else f"Feature_{count+1}"
            
            pt_el = p.find(".//{*}Point/{*}coordinates")
            poly_el = p.find(".//{*}Polygon//{*}coordinates")
            
            lat, lon, geom_type = None, None, None
            if pt_el is not None and pt_el.text:
                coords = pt_el.text.strip().split(",")
                lon = float(coords[0])
                lat = float(coords[1])
                geom_type = "Point"
            elif poly_el is not None and poly_el.text:
                raw_coords = poly_el.text.strip().split()
                lons, lats = [], []
                for c_str in raw_coords:
                    parts = c_str.split(",")
                    if len(parts) >= 2:
                        try:
                            lons.append(float(parts[0]))
                            lats.append(float(parts[1]))
                        except ValueError:
                            pass
                if lons and lats:
                    lon = sum(lons) / len(lons)
                    lat = sum(lats) / len(lats)
                    geom_type = f"Polygon (Centroid of {len(lons)} vertices)"
                    
            if lat is not None and lon is not None:
                res = self.predict_point(lat, lon)
                if res.get("status") == "success":
                    rec = {
                        "Feature_Name": name,
                        "Geometry_Type": geom_type,
                        "Latitude": round(lat, 6),
                        "Longitude": round(lon, 6),
                        "UTM_X_m": res["utm_easting_m"],
                        "UTM_Y_m": res["utm_northing_m"],
                    }
                    rec.update(res["predictions"])
                    rec.update(res["fertilizer_prescriptions"])
                    records.append(rec)
                    count += 1
                    if limit and count >= limit:
                        break
                        
        if not records:
            return {"status": "error", "message": "No valid features inside Malegaon boundary!"}
            
        df_res = pd.DataFrame(records)
        if out_xlsx:
            df_res.to_excel(out_xlsx, index=False)
            
        return {"status": "success", "feature_count": len(df_res), "dataframe": df_res}

    def format_soil_health_card(self, target_label, res):
        """Formats the prediction dictionary into an executive Soil Health Card text."""
        preds = res["predictions"]
        fert = res["fertilizer_prescriptions"]
        
        lines = []
        lines.append("\n" + "=" * 85)
        lines.append("                     MALEGAON KHURD DIGITAL SOIL HEALTH CARD")
        lines.append("                     Baramati Taluka, Pune District, Maharashtra")
        lines.append("=" * 85)
        lines.append(f" Target Query: {target_label}")
        lines.append(" Textural Class: Deep Clay Vertisol (Black Cotton Soil)")
        lines.append("-" * 85)
        lines.append(f" {'Soil Property':<32} | {'Predicted Value':<16} | {'Unit':<10} | {'Agronomic Status':<20}")
        lines.append("-" * 85)
        for prop, (tif, unit) in self.raster_map.items():
            val = preds.get(prop, 0.0)
            status = self.classify_agronomic(prop, val)
            lines.append(f" {prop:<32} | {val:<16.3f} | {unit:<10} | {status:<20}")
        lines.append("-" * 85)
        lines.append(" 🌾 SCIENTIFIC FERTILIZER PRESCRIPTIONS (MPKV Rahuri University Package):")
        lines.append(f"   • Urea:                 {fert['Urea_Bags_Acre']} Bags / Acre (Split: Basal, Tillering, Earthing-up)")
        lines.append(f"   • DAP:                  {fert['DAP_Bags_Acre']} Bags / Acre (Basal placement)")
        lines.append(f"   • MOP (Potash):         {fert['MOP_Bags_Acre']} Bags / Acre (Omitted due to rich basalt Potassium reserve)")
        lines.append(f"   • Chlorosis Prevention: {fert['Fe_EDTA_Spray']}")
        lines.append(f"   • Zinc Application:     {fert['Zinc_Dose']}")
        lines.append("=" * 85 + "\n")
        return "\n".join(lines)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Standalone Soil Prediction Engine for Malegaon Khurd.")
    parser.add_argument("--lat", type=float, help="Latitude (WGS84, e.g., 18.1480)")
    parser.add_argument("--lon", type=float, help="Longitude (WGS84, e.g., 74.5220)")
    parser.add_argument("--gat", type=int, help="Gat Survey Number (1 to 237)")
    parser.add_argument("--kml", type=str, help="Path to custom KML file with points or polygons")
    parser.add_argument("--out", type=str, default="KML_Soil_Predictions.xlsx", help="Output Excel filename for KML predictions")
    args = parser.parse_args()
    
    engine = SoilPredictionEngine()
    
    if args.kml is not None:
        res = engine.predict_kml(args.kml, out_xlsx=args.out)
        if res["status"] == "success":
            print(f"Successfully processed {res['feature_count']} features! Saved to: {args.out}")
        else:
            print("Error:", res["message"])
    elif args.lat is not None and args.lon is not None:
        res = engine.predict_point(args.lat, args.lon)
        if res["status"] == "success":
            label = f"Coordinates: Lat {args.lat:.5f}, Lon {args.lon:.5f} (UTM: X={res['utm_easting_m']}m, Y={res['utm_northing_m']}m)"
            print(engine.format_soil_health_card(label, res))
        else:
            print("Error:", res["message"])
    elif args.gat is not None:
        res = engine.predict_gat(args.gat)
        if res["status"] == "success":
            label = f"Cadastral Parcel: {res['gat_name']} (Area: {res['area_hectares']} ha, Previously Sampled: {res['is_sampled']})"
            print(engine.format_soil_health_card(label, res))
        else:
            print("Error:", res["message"])
    else:
        # Default demo
        print("Running demonstration for central farm parcel (Gat 90)...")
        res = engine.predict_gat(90)
        label = f"Cadastral Parcel: {res['gat_name']} (Area: {res['area_hectares']} ha, Previously Sampled: {res['is_sampled']})"
        print(engine.format_soil_health_card(label, res))
