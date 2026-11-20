import re
from pathlib import Path

p = Path(r"d:\soilpilot-final-13 nov\soilpilot-final-0.2-main\frontend\services\certifiedDecisionPlanData.ts")
text = p.read_text(encoding="utf-8")

matches = re.findall(r'crop_code:\s*"([^"]+)",[\s\S]*?decision_tier:\s*"([^"]+)",[\s\S]*?suitability_status:\s*"([^"]+)",[\s\S]*?suitability_label:\s*"([^"]+)",', text)
for code, tier, status, label in matches:
    print(f"{code:12}: tier={tier:22} | status={status:24} | label={label}")
