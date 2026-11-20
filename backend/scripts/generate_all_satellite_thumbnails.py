import os
import sys
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.satellite_map_generator import generate_satellite_card

base_dir = backend_dir.parent
thumb_dir = base_dir / "frontend" / "public" / "data" / "cadastre_thumbnails"
geojson_path = base_dir / "frontend" / "public" / "data" / "malegaon_plots.geojson"

os.makedirs(thumb_dir, exist_ok=True)

with open(geojson_path, "r", encoding="utf-8") as f:
    geojson = json.load(f)

gats_to_generate = []
for feat in geojson["features"]:
    gn = str(feat["properties"].get("gat_no", "")).replace("Gat", "").replace("gat", "").strip()
    safe_gn = gn.replace("/", "_").replace("\\", "_")
    p = thumb_dir / f"gat_{safe_gn}.png"
    if not p.exists() or p.stat().st_size < 150000:
        gats_to_generate.append(gn)

print(f"Starting batch generation of {len(gats_to_generate)} satellite thumbnails...")

def process_gat(gat):
    try:
        safe_gn = gat.replace("/", "_").replace("\\", "_")
        target_path = str(thumb_dir / f"gat_{safe_gn}.png")
        generate_satellite_card(gat, target_path)
        return gat, True
    except Exception as e:
        return gat, False

success_count = 0
with ThreadPoolExecutor(max_workers=8) as executor:
    futures = [executor.submit(process_gat, g) for g in gats_to_generate]
    for future in as_completed(futures):
        gat, ok = future.result()
        if ok:
            success_count += 1
            if success_count % 20 == 0 or success_count == len(gats_to_generate):
                print(f"Generated {success_count}/{len(gats_to_generate)} satellite thumbnails")

print(f"Completed! Successfully generated {success_count} satellite cards.")
