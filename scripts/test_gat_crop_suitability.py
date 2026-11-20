import sys
from pathlib import Path

backend_dir = Path(r"d:\soilpilot-final-13 nov\soilpilot-final-0.2-main\backend")
sys.path.insert(0, str(backend_dir))

from app.gis.gat_soil_extractor import gat_soil_extractor
from app.gis.crop_suitability_engine import crop_suitability_engine
from app.gis.weather_processor import weather_processor

weather = weather_processor.compute_climatological_normals()["historical_30yr"]

for gat in ["22", "100", "1"]:
    soil = gat_soil_extractor.get_soil_indicators_for_gat(gat)
    if not soil:
        print(f"Gat {gat} not found!")
        continue
    print(f"=== GAT {gat} SOIL INDICATORS ===")
    print(f"  pH={soil.get('ph')} | OC={soil.get('soc')} | N={soil.get('available_nitrogen')} | CaCO3={soil.get('caco3')} | Clay={soil.get('clay')} | Sand={soil.get('sand')} | Silt={soil.get('silt')}")
    
    crops = crop_suitability_engine.get_supported_crops()
    print("  Crop Suitability Evaluations:")
    for c in crops:
        res = crop_suitability_engine.evaluate_crop_suitability(c["crop_code"], soil, weather, gat_no=gat)
        print(f"    {res['crop_code']:12}: Class {res['final_suitability_class']:9} (Score: {res['suitability_score']}%)")
