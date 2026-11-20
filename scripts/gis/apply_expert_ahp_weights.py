import json
from pathlib import Path

backend_json = Path(r"d:\soilpilot-final-13 nov\soilpilot-final-0.2-main\backend\app\gis\crop_suitability_rules.json")
frontend_json = Path(r"d:\soilpilot-final-13 nov\soilpilot-final-0.2-main\frontend\public\data\crop_suitability_rules.json")

with open(backend_json, "r", encoding="utf-8") as f:
    existing = json.load(f)

crops = existing["crops"]

# 1. SUGARCANE
crops["sugarcane"]["parameters"] = {
    "texture": {
        "name": "Textural Class",
        "unit": "class",
        "weight": 27.68,
        "s1": ["Clay", "Clay Loam", "Silty Clay", "Sandy Clay Loam"],
        "s2": ["Clay Loam", "Silt Loam"],
        "s3": ["Sandy Loam"],
        "n": ["Sandy", "Sand", "Heavy Clay"]
    },
    "ph": {
        "name": "Soil pH",
        "unit": "pH",
        "weight": 18.26,
        "s1": [7.0, 7.8],
        "s2": [7.8, 8.2],
        "s3": [8.2, 8.5],
        "n": [8.5, None],
        "n_ranges": [[None, 6.0], [8.5, None]]
    },
    "oc": {
        "name": "Organic Carbon (OC)",
        "unit": "%",
        "weight": 13.78,
        "s1": [0.8, None],
        "s2": [0.6, 0.8],
        "s3": [0.4, 0.6],
        "n": [None, 0.40]
    },
    "caco3": {
        "name": "Calcium Carbonate (CaCO3)",
        "unit": "%",
        "weight": 10.68,
        "s1": [0.0, 5.0],
        "s2": [5.0, 10.0],
        "s3": [10.0, 20.0],
        "n": [20.0, None]
    },
    "rainfall": {
        "name": "Annual Rainfall / Irrigation",
        "unit": "mm",
        "weight": 8.26,
        "rainfall_type": "annual_or_irrigation",
        "s1": [850.0, None],
        "s2": [700.0, 850.0],
        "s3": [550.0, 700.0],
        "n": [None, 550.0],
        "notes": ">850 mm or assured canal/lift irrigation"
    },
    "temperature": {
        "name": "Mean Temperature",
        "unit": "°C",
        "weight": 6.26,
        "s1": [24.0, 32.0],
        "s2": [[20.0, 24.0], [32.0, 35.0]],
        "s3": [35.0, 40.0],
        "n_ranges": [[None, 20.0], [40.0, None]]
    },
    "humidity": {
        "name": "Relative Humidity",
        "unit": "%",
        "weight": 4.86,
        "s1": [75.0, 80.0],
        "s2": [60.0, 75.0],
        "s3": [50.0, 60.0],
        "n": [None, 40.0]
    },
    "ec": {
        "name": "Electrical Conductivity (EC)",
        "unit": "dS/m",
        "weight": 3.62,
        "s1": [None, 0.8],
        "s2": [0.8, 1.0],
        "s3": [1.0, 1.2],
        "n": [1.2, None]
    },
    "nitrogen": {
        "name": "Available Nitrogen (N)",
        "unit": "kg/ha",
        "weight": 2.77,
        "s1": [160.0, None],
        "s2": [140.0, 160.0],
        "s3": [110.0, 140.0],
        "n": [None, 110.0]
    },
    "phosphorus": {
        "name": "Available Phosphorus (P)",
        "unit": "kg/ha",
        "weight": 2.15,
        "s1": [20.0, None],
        "s2": [15.0, 20.0],
        "s3": [10.0, 15.0],
        "n": [None, 10.0]
    },
    "potassium": {
        "name": "Available Potassium (K)",
        "unit": "kg/ha",
        "weight": 1.68,
        "s1": [400.0, None],
        "s2": [350.0, 400.0],
        "s3": [300.0, 350.0],
        "n": [None, 300.0]
    }
}

# 2. POMEGRANATE
crops["pomegranate"]["parameters"] = {
    "texture": {
        "name": "Textural Class",
        "unit": "class",
        "weight": 28.37,
        "s1": ["Clay Loam", "Silty Clay", "Sandy Clay Loam", "Loam"],
        "s2": ["Clay Loam", "Silt Loam", "Clay"],
        "s3": ["Sandy Loam"],
        "n": ["Sandy", "Sand", "Heavy Clay"]
    },
    "ph": {
        "name": "Soil pH",
        "unit": "pH",
        "weight": 17.18,
        "s1": [7.2, 7.6],
        "s2": [7.6, 8.0],
        "s3": [8.0, 8.2],
        "n": [8.2, None],
        "n_ranges": [[None, 6.0], [8.2, None]]
    },
    "oc": {
        "name": "Organic Carbon (OC)",
        "unit": "%",
        "weight": 13.10,
        "s1": [0.8, None],
        "s2": [0.6, 0.8],
        "s3": [0.4, 0.6],
        "n": [None, 0.40]
    },
    "caco3": {
        "name": "Calcium Carbonate (CaCO3)",
        "unit": "%",
        "weight": 9.58,
        "s1": [0.0, 5.0],
        "s2": [5.0, 10.0],
        "s3": [10.0, 20.0],
        "n": [20.0, None]
    },
    "rainfall": {
        "name": "Annual Rainfall / Irrigation",
        "unit": "mm",
        "weight": 7.40,
        "rainfall_type": "annual",
        "s1": [850.0, None],
        "s2": [700.0, 850.0],
        "s3": [550.0, 700.0],
        "n": [None, 550.0]
    },
    "temperature": {
        "name": "Mean Temperature",
        "unit": "°C",
        "weight": 5.81,
        "s1": [24.0, 28.0],
        "s2": [[18.0, 24.0], [28.0, 32.0]],
        "s3": [32.0, 35.0],
        "n_ranges": [[None, 18.0], [35.0, None]]
    },
    "humidity": {
        "name": "Relative Humidity",
        "unit": "%",
        "weight": 4.24,
        "s1": [70.0, 80.0],
        "s2": [60.0, 70.0],
        "s3": [50.0, 60.0],
        "n": [None, 40.0]
    },
    "ec": {
        "name": "Electrical Conductivity (EC)",
        "unit": "dS/m",
        "weight": 4.15,
        "s1": [None, 0.8],
        "s2": [0.8, 1.0],
        "s3": [1.0, 1.2],
        "n": [1.2, None]
    },
    "nitrogen": {
        "name": "Available Nitrogen (N)",
        "unit": "kg/ha",
        "weight": 3.53,
        "s1": [160.0, None],
        "s2": [140.0, 160.0],
        "s3": [110.0, 140.0],
        "n": [None, 110.0]
    },
    "phosphorus": {
        "name": "Available Phosphorus (P)",
        "unit": "kg/ha",
        "weight": 3.24,
        "s1": [20.0, None],
        "s2": [15.0, 20.0],
        "s3": [10.0, 15.0],
        "n": [None, 10.0]
    },
    "potassium": {
        "name": "Available Potassium (K)",
        "unit": "kg/ha",
        "weight": 3.40,
        "s1": [275.0, 375.0],
        "s2": [250.0, 275.0],
        "s3": [200.0, 250.0],
        "n": [None, 200.0]
    }
}

# 3. SOYBEAN
crops["soybean"]["parameters"] = {
    "texture": {
        "name": "Textural Class",
        "unit": "class",
        "weight": 29.97,
        "s1": ["Clay Loam", "Silty Clay", "Sandy Clay Loam", "Clay"],
        "s2": ["Clay Loam", "Silt Loam"],
        "s3": ["Sandy Loam"],
        "n": ["Sandy", "Sand", "Heavy Clay"]
    },
    "ph": {
        "name": "Soil pH",
        "unit": "pH",
        "weight": 16.74,
        "s1": [7.0, 7.8],
        "s2": [7.8, 8.2],
        "s3": [8.2, 8.5],
        "n": [8.5, None],
        "n_ranges": [[None, 6.0], [8.5, None]]
    },
    "oc": {
        "name": "Organic Carbon (OC)",
        "unit": "%",
        "weight": 10.98,
        "s1": [0.8, None],
        "s2": [0.6, 0.8],
        "s3": [0.4, 0.6],
        "n": [None, 0.40]
    },
    "caco3": {
        "name": "Calcium Carbonate (CaCO3)",
        "unit": "%",
        "weight": 8.24,
        "s1": [0.0, 5.0],
        "s2": [5.0, 10.0],
        "s3": [10.0, 20.0],
        "n": [20.0, None]
    },
    "rainfall": {
        "name": "Annual Rainfall / Irrigation",
        "unit": "mm",
        "weight": 9.28,
        "rainfall_type": "kharif",
        "s1": [850.0, None],
        "s2": [700.0, 850.0],
        "s3": [550.0, 700.0],
        "n": [None, 550.0]
    },
    "temperature": {
        "name": "Mean Temperature",
        "unit": "°C",
        "weight": 6.53,
        "s1": [22.0, 27.0],
        "s2": [[15.0, 22.0], [27.0, 32.0]],
        "s3": [32.0, 35.0],
        "n_ranges": [[None, 15.0], [35.0, None]]
    },
    "humidity": {
        "name": "Relative Humidity",
        "unit": "%",
        "weight": 5.28,
        "s1": [60.0, 80.0],
        "s2": [40.0, 60.0],
        "s3": [80.0, 100.0],
        "n": [None, 40.0]
    },
    "ec": {
        "name": "Electrical Conductivity (EC)",
        "unit": "dS/m",
        "weight": 4.73,
        "s1": [None, 0.8],
        "s2": [0.8, 1.0],
        "s3": [1.0, 1.2],
        "n": [1.2, None]
    },
    "nitrogen": {
        "name": "Available Nitrogen (N)",
        "unit": "kg/ha",
        "weight": 3.04,
        "s1": [160.0, None],
        "s2": [140.0, 160.0],
        "s3": [110.0, 140.0],
        "n": [None, 110.0]
    },
    "phosphorus": {
        "name": "Available Phosphorus (P)",
        "unit": "kg/ha",
        "weight": 2.87,
        "s1": [20.0, None],
        "s2": [15.0, 20.0],
        "s3": [10.0, 15.0],
        "n": [None, 10.0]
    },
    "potassium": {
        "name": "Available Potassium (K)",
        "unit": "kg/ha",
        "weight": 2.34,
        "s1": [400.0, None],
        "s2": [350.0, 400.0],
        "s3": [300.0, 350.0],
        "n": [None, 300.0]
    }
}

# 4. MAIZE
crops["maize"]["parameters"] = {
    "texture": {
        "name": "Textural Class",
        "unit": "class",
        "weight": 30.33,
        "s1": ["Clay Loam", "Silty Clay", "Sandy Clay Loam", "Clay"],
        "s2": ["Clay Loam", "Silt Loam"],
        "s3": ["Sandy Loam"],
        "n": ["Sandy", "Sand", "Heavy Clay"]
    },
    "ph": {
        "name": "Soil pH",
        "unit": "pH",
        "weight": 15.31,
        "s1": [7.0, 7.8],
        "s2": [7.8, 8.2],
        "s3": [8.2, 8.5],
        "n": [8.5, None],
        "n_ranges": [[None, 6.0], [8.5, None]]
    },
    "oc": {
        "name": "Organic Carbon (OC)",
        "unit": "%",
        "weight": 10.21,
        "s1": [0.8, None],
        "s2": [0.6, 0.8],
        "s3": [0.4, 0.6],
        "n": [None, 0.40]
    },
    "caco3": {
        "name": "Calcium Carbonate (CaCO3)",
        "unit": "%",
        "weight": 7.17,
        "s1": [0.0, 5.0],
        "s2": [5.0, 10.0],
        "s3": [10.0, 20.0],
        "n": [20.0, None]
    },
    "rainfall": {
        "name": "Annual Rainfall / Irrigation",
        "unit": "mm",
        "weight": 8.19,
        "rainfall_type": "annual",
        "s1": [850.0, None],
        "s2": [700.0, 850.0],
        "s3": [550.0, 700.0],
        "n": [None, 550.0]
    },
    "temperature": {
        "name": "Mean Temperature",
        "unit": "°C",
        "weight": 6.74,
        "s1": [24.0, 32.0],
        "s2": [[20.0, 24.0], [32.0, 35.0]],
        "s3": [35.0, 40.0],
        "n_ranges": [[None, 20.0], [40.0, None]]
    },
    "humidity": {
        "name": "Relative Humidity",
        "unit": "%",
        "weight": 5.71,
        "s1": [75.0, 80.0],
        "s2": [60.0, 75.0],
        "s3": [50.0, 60.0],
        "n": [None, 40.0]
    },
    "ec": {
        "name": "Electrical Conductivity (EC)",
        "unit": "dS/m",
        "weight": 4.62,
        "s1": [None, 0.8],
        "s2": [0.8, 1.0],
        "s3": [1.0, 1.2],
        "n": [1.2, None]
    },
    "nitrogen": {
        "name": "Available Nitrogen (N)",
        "unit": "kg/ha",
        "weight": 4.23,
        "s1": [160.0, None],
        "s2": [140.0, 160.0],
        "s3": [110.0, 140.0],
        "n": [None, 110.0]
    },
    "phosphorus": {
        "name": "Available Phosphorus (P)",
        "unit": "kg/ha",
        "weight": 4.02,
        "s1": [20.0, None],
        "s2": [15.0, 20.0],
        "s3": [10.0, 15.0],
        "n": [None, 10.0]
    },
    "potassium": {
        "name": "Available Potassium (K)",
        "unit": "kg/ha",
        "weight": 3.47,
        "s1": [400.0, None],
        "s2": [350.0, 400.0],
        "s3": [300.0, 350.0],
        "n": [None, 300.0]
    }
}

# 5. TOMATO
crops["tomato"]["parameters"] = {
    "texture": {
        "name": "Textural Class",
        "unit": "class",
        "weight": 30.57,
        "s1": ["Clay Loam", "Silty Clay", "Sandy Clay Loam", "Clay"],
        "s2": ["Clay Loam", "Silt Loam"],
        "s3": ["Sandy Loam"],
        "n": ["Sandy", "Sand", "Heavy Clay"]
    },
    "ph": {
        "name": "Soil pH",
        "unit": "pH",
        "weight": 15.78,
        "s1": [7.0, 7.8],
        "s2": [7.8, 8.2],
        "s3": [8.2, 8.5],
        "n": [8.5, None],
        "n_ranges": [[None, 6.0], [8.5, None]]
    },
    "oc": {
        "name": "Organic Carbon (OC)",
        "unit": "%",
        "weight": 10.44,
        "s1": [0.8, None],
        "s2": [0.6, 0.8],
        "s3": [0.4, 0.6],
        "n": [None, 0.40]
    },
    "caco3": {
        "name": "Calcium Carbonate (CaCO3)",
        "unit": "%",
        "weight": 7.54,
        "s1": [0.0, 5.0],
        "s2": [5.0, 10.0],
        "s3": [10.0, 20.0],
        "n": [20.0, None]
    },
    "rainfall": {
        "name": "Annual Rainfall / Irrigation",
        "unit": "mm",
        "weight": 8.56,
        "rainfall_type": "annual",
        "s1": [850.0, None],
        "s2": [700.0, 850.0],
        "s3": [550.0, 700.0],
        "n": [None, 550.0]
    },
    "temperature": {
        "name": "Mean Temperature",
        "unit": "°C",
        "weight": 6.59,
        "s1": [24.0, 32.0],
        "s2": [[20.0, 24.0], [32.0, 35.0]],
        "s3": [35.0, 38.0],
        "n_ranges": [[None, 20.0], [40.0, None]]
    },
    "humidity": {
        "name": "Relative Humidity",
        "unit": "%",
        "weight": 4.66,
        "s1": [60.0, 70.0],
        "s2": [50.0, 60.0],
        "s3": [40.0, 50.0],
        "n": [None, 40.0]
    },
    "ec": {
        "name": "Electrical Conductivity (EC)",
        "unit": "dS/m",
        "weight": 4.65,
        "s1": [None, 0.8],
        "s2": [0.8, 1.0],
        "s3": [1.0, 1.2],
        "n": [1.2, None]
    },
    "nitrogen": {
        "name": "Available Nitrogen (N)",
        "unit": "kg/ha",
        "weight": 3.93,
        "s1": [160.0, None],
        "s2": [140.0, 160.0],
        "s3": [110.0, 140.0],
        "n": [None, 110.0]
    },
    "phosphorus": {
        "name": "Available Phosphorus (P)",
        "unit": "kg/ha",
        "weight": 3.55,
        "s1": [20.0, None],
        "s2": [15.0, 20.0],
        "s3": [10.0, 15.0],
        "n": [None, 10.0]
    },
    "potassium": {
        "name": "Available Potassium (K)",
        "unit": "kg/ha",
        "weight": 3.73,
        "s1": [220.0, 300.0],
        "s2": [300.0, 350.0],
        "s3": [350.0, 400.0],
        "n_ranges": [[None, 220.0], [400.0, None]]
    }
}

# 6. ONION
crops["onion"]["parameters"] = {
    "texture": {
        "name": "Textural Class",
        "unit": "class",
        "weight": 37.65,
        "s1": ["Clay Loam", "Silty Clay", "Sandy Clay Loam", "Clay"],
        "s2": ["Clay Loam", "Silt Loam"],
        "s3": ["Sandy Loam"],
        "n": ["Sandy", "Sand", "Heavy Clay"]
    },
    "ph": {
        "name": "Soil pH",
        "unit": "pH",
        "weight": 14.44,
        "s1": [7.0, 7.8],
        "s2": [7.8, 8.2],
        "s3": [8.2, 8.5],
        "n": [8.5, None],
        "n_ranges": [[None, 6.0], [8.5, None]]
    },
    "oc": {
        "name": "Organic Carbon (OC)",
        "unit": "%",
        "weight": 9.24,
        "s1": [0.8, None],
        "s2": [0.6, 0.8],
        "s3": [0.4, 0.6],
        "n": [None, 0.40]
    },
    "caco3": {
        "name": "Calcium Carbonate (CaCO3)",
        "unit": "%",
        "weight": 6.72,
        "s1": [0.0, 5.0],
        "s2": [5.0, 10.0],
        "s3": [10.0, 20.0],
        "n": [20.0, None]
    },
    "rainfall": {
        "name": "Annual Rainfall / Irrigation",
        "unit": "mm",
        "weight": 7.58,
        "rainfall_type": "annual",
        "s1": [850.0, None],
        "s2": [700.0, 850.0],
        "s3": [550.0, 700.0],
        "n": [None, 550.0]
    },
    "temperature": {
        "name": "Mean Temperature",
        "unit": "°C",
        "weight": 5.86,
        "s1": [24.0, 32.0],
        "s2": [[20.0, 24.0], [32.0, 35.0]],
        "s3": [35.0, 40.0],
        "n_ranges": [[None, 20.0], [40.0, None]]
    },
    "humidity": {
        "name": "Relative Humidity",
        "unit": "%",
        "weight": 4.10,
        "s1": [75.0, 80.0],
        "s2": [60.0, 75.0],
        "s3": [50.0, 60.0],
        "n": [None, 40.0]
    },
    "ec": {
        "name": "Electrical Conductivity (EC)",
        "unit": "dS/m",
        "weight": 4.02,
        "s1": [None, 0.8],
        "s2": [0.8, 1.0],
        "s3": [1.0, 1.2],
        "n": [1.2, None]
    },
    "nitrogen": {
        "name": "Available Nitrogen (N)",
        "unit": "kg/ha",
        "weight": 3.65,
        "s1": [160.0, None],
        "s2": [140.0, 160.0],
        "s3": [110.0, 140.0],
        "n": [None, 110.0]
    },
    "phosphorus": {
        "name": "Available Phosphorus (P)",
        "unit": "kg/ha",
        "weight": 3.28,
        "s1": [20.0, None],
        "s2": [15.0, 20.0],
        "s3": [10.0, 15.0],
        "n": [None, 10.0]
    },
    "potassium": {
        "name": "Available Potassium (K)",
        "unit": "kg/ha",
        "weight": 3.46,
        "s1": [250.0, 300.0],
        "s2": [300.0, 350.0],
        "s3": [350.0, 400.0],
        "n_ranges": [[None, 250.0], [400.0, None]]
    }
}

# 7. BANANA (from PDF page 7)
crops["banana"]["parameters"] = {
    "texture": {
        "name": "Textural Class",
        "unit": "class",
        "weight": 28.00,
        "s1": ["Clay Loam", "Silty Clay", "Sandy Clay Loam"],
        "s2": ["Clay Loam", "Silt Loam"],
        "s3": ["Sandy Loam"],
        "n": ["Sandy", "Clay", "Sand", "Heavy Clay"]
    },
    "ph": {
        "name": "Soil pH",
        "unit": "pH",
        "weight": 16.00,
        "s1": [7.0, 7.8],
        "s2": [7.8, 8.2],
        "s3": [8.2, 8.5],
        "n": [8.5, None],
        "n_ranges": [[None, 6.0], [8.5, None]]
    },
    "oc": {
        "name": "Organic Carbon (OC)",
        "unit": "%",
        "weight": 12.00,
        "s1": [1.0, None],
        "s2": [0.8, 1.0],
        "s3": [0.6, 0.8],
        "n": [None, 0.60]
    },
    "caco3": {
        "name": "Calcium Carbonate (CaCO3)",
        "unit": "%",
        "weight": 8.00,
        "s1": [0.0, 5.0],
        "s2": [5.0, 10.0],
        "s3": [10.0, 20.0],
        "n": [20.0, None]
    },
    "rainfall": {
        "name": "Annual Rainfall / Irrigation",
        "unit": "mm",
        "weight": 14.00,
        "rainfall_type": "annual_or_irrigation",
        "s1": [850.0, None],
        "s2": [700.0, 850.0],
        "s3": [550.0, 700.0],
        "n": [None, 550.0],
        "notes": ">1500 mm with assured canal/lift irrigation"
    },
    "temperature": {
        "name": "Mean Temperature",
        "unit": "°C",
        "weight": 8.00,
        "s1": [27.0, 35.0],
        "s2": [27.0, 30.0],
        "s3": [30.0, 38.0],
        "n_ranges": [[None, 20.0], [38.0, None]]
    },
    "humidity": {
        "name": "Relative Humidity",
        "unit": "%",
        "weight": 5.00,
        "s1": [75.0, 80.0],
        "s2": [60.0, 75.0],
        "s3": [50.0, 60.0],
        "n": [None, 40.0]
    },
    "ec": {
        "name": "Electrical Conductivity (EC)",
        "unit": "dS/m",
        "weight": 3.00,
        "s1": [None, 0.8],
        "s2": [0.8, 1.0],
        "s3": [1.0, 1.2],
        "n": [1.2, None]
    },
    "nitrogen": {
        "name": "Available Nitrogen (N)",
        "unit": "kg/ha",
        "weight": 3.00,
        "s1": [160.0, None],
        "s2": [140.0, 160.0],
        "s3": [110.0, 140.0],
        "n": [None, 110.0]
    },
    "phosphorus": {
        "name": "Available Phosphorus (P)",
        "unit": "kg/ha",
        "weight": 2.00,
        "s1": [20.0, None],
        "s2": [15.0, 20.0],
        "s3": [10.0, 15.0],
        "n": [None, 10.0]
    },
    "potassium": {
        "name": "Available Potassium (K)",
        "unit": "kg/ha",
        "weight": 1.00,
        "s1": [450.0, None],
        "s2": [400.0, 450.0],
        "s3": [350.0, 400.0],
        "n": [None, 350.0]
    }
}

# Replace slope with caco3 for chickpea, groundnut, lemon to standardize all 10 crops
for other in ["chickpea", "groundnut", "lemon"]:
    p = crops[other]["parameters"]
    if "slope" in p:
        slope_w = p.pop("slope")["weight"]
        p["caco3"] = {
            "name": "Calcium Carbonate (CaCO3)",
            "unit": "%",
            "weight": slope_w,
            "s1": [0.0, 5.0],
            "s2": [5.0, 10.0],
            "s3": [10.0, 20.0],
            "n": [20.0, None]
        }

existing["rule_version"] = "EXPERT_AHP_2026_FINAL"
existing["document_source"] = "Expert_Evaluation_Questionnaire_GIS-Based_Crop_Suitability_Analysis_Baramati.pdf"
existing["ahp_source"] = "AHP_Criteria_Weights_Matrix_Baramati_2026"

with open(backend_json, "w", encoding="utf-8") as f:
    json.dump(existing, f, indent=2, ensure_ascii=False)

with open(frontend_json, "w", encoding="utf-8") as f:
    json.dump(existing, f, indent=2, ensure_ascii=False)

print("SUCCESSFULLY APPLIED AUTHORITATIVE AHP WEIGHTS & FAO THRESHOLDS!")
for c, cdata in existing["crops"].items():
    s = sum(p["weight"] for p in cdata["parameters"].values())
    print(f"{c:12}: params={len(cdata['parameters'])} | sum_weights={s:.2f}%")
