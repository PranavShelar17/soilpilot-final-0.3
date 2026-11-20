import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.soil_health_service import soil_health_service

def test_gat(gat_no: str):
    rep = soil_health_service.get_report_for_field(None, gat_no)
    print(f"\n==================== GAT {gat_no} ====================")
    print("Sampling status:", rep["model_predictions"].get("pH", {}).get("sampling_status", "N/A"))
    print("Observations count:", len(rep["observations"]))
    print("\nParameters:")
    for p in rep["parameters"]:
        val_str = str(p["value"]) if p["value"] is not None else "BLANK"
        print(f"{p['key']:22s} | Val: {val_str:8s} | Blank: {str(p.get('is_blank')):5s} | Interp: {p['interpretation']:20s} | Src: {p['source']}")

if __name__ == "__main__":
    test_gat("22")
    test_gat("100")
