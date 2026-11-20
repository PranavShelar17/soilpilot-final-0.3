import os
from pathlib import Path

ROOT = Path(r"d:\soilpilot-final-13 nov\soilpilot-final-0.2-main")

search_terms = ["Field Suitability:", "Well Suited", "Well-Suited", "Expected Selling Price", "Estimated Cost per Acre", "76.8%"]

def search_dir(base_dir):
    for root, dirs, files in os.walk(base_dir):
        if any(skip in root for skip in ["node_modules", ".next", "__pycache__", ".venv", "venv"]):
            continue
        for f in files:
            if f.endswith((".ts", ".tsx", ".py", ".json")):
                p = Path(root) / f
                try:
                    text = p.read_text(encoding="utf-8", errors="ignore")
                    for term in search_terms:
                        if term.lower() in text.lower():
                            print(f"[{term}] found in {p.relative_to(ROOT)}")
                except Exception:
                    pass

print("Searching frontend...")
search_dir(ROOT / "frontend")

print("Searching backend...")
search_dir(ROOT / "backend")
