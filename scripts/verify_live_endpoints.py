import urllib.request
import json

def query_endpoint(url):
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read().decode())

# Check backend soil health card for Gat 22
shc22 = query_endpoint("http://127.0.0.1:8000/api/v1/soil-health/field/demo-field-gat-22")
print("=== Gat 22 Soil Health Card (Predicted) ===")
print("  Source:", shc22.get("source_data_type"))
for p in shc22.get("parameters", []):
    if p["key"] in ["ph", "organic_carbon", "available_nitrogen", "caco3", "clay", "available_phosphorus", "available_potassium", "ec", "sulphur"]:
        print(f"  {p['name']:32}: Val={p['value']} | Blank={p.get('is_blank')} | Interp={p['interpretation']}")

# Check backend crop suitability for Gat 22
cs22 = query_endpoint("http://127.0.0.1:8000/api/v1/crop-suitability/gat/22")
print("\n=== Gat 22 Crop Suitability ===")
for ev in cs22.get("evaluations", []):
    print(f"  {ev['crop_code']:12}: Class {ev['final_suitability_class']:4} | Score: {ev['suitability_score']}%")

# Check backend soil health card for Gat 100
shc100 = query_endpoint("http://127.0.0.1:8000/api/v1/soil-health/field/demo-field-gat-100")
print("\n=== Gat 100 Soil Health Card (Measured) ===")
print("  Source:", shc100.get("source_data_type"))
for p in shc100.get("parameters", []):
    if p["key"] in ["ph", "organic_carbon", "available_nitrogen", "available_phosphorus", "available_potassium", "ec", "sulphur"]:
        print(f"  {p['name']:32}: Val={p['value']} | Blank={p.get('is_blank')} | Interp={p['interpretation']}")
