import urllib.request
import json

try:
    with urllib.request.urlopen("http://127.0.0.1:8000/api/v1/crop-suitability/gat/22") as resp:
        gat_data = json.loads(resp.read().decode())
        print("Backend gat/22 status: OK")
        pom = next((e for e in gat_data.get("evaluations", []) if e.get("crop_code") == "pomegranate"), None)
        if pom:
            print("Backend gat 22 pomegranate: score =", pom.get("suitability_score"), "class =", pom.get("final_suitability_class"))
        print("Soil indicators in backend gat/22:", {k: gat_data.get("soil_indicators", {}).get(k) for k in ["ph", "soc", "caco3", "clay", "texture"]})
except Exception as e:
    print("Backend gat error:", e)

try:
    with urllib.request.urlopen("http://127.0.0.1:8000/api/v1/crop-suitability/crop/pomegranate/geojson") as resp:
        geo = json.loads(resp.read().decode())
        print("Backend geojson status: OK")
        feat22 = next((f for f in geo.get("features", []) if str(f.get("properties", {}).get("gat_no")) == "22"), None)
        if feat22:
            print("Backend geojson Gat 22: score =", feat22["properties"].get("suitability_score"), "class =", feat22["properties"].get("suitability_class"))
            print("Backend geojson Gat 22 soil_indicators:", {k: feat22["properties"].get("soil_indicators", {}).get(k) for k in ["ph", "soc", "caco3", "clay"]})
except Exception as e:
    print("Backend geojson error:", e)
