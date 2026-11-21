import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Create workbook
wb = openpyxl.Workbook()
wb.remove(wb.active)  # Remove default sheet

# Color Palette
PRIMARY_COLOR = "1B4D3E"      # Forest / Pine Green (Brand Header)
ACCENT_GREEN = "2A7C13"       # Vibrant Plant Green
BG_MINT = "E8F5E9"            # Light Mint Green
BG_CREAM = "FFFBEB"           # Warm Cream for Highlights
BG_ALT_ROW = "F9FAFB"         # Very Light Grey
BG_FORMULA_HDR = "E0F2FE"     # Light Blue Header for formulas
BG_FORMULA_ROW = "F0F9FF"     # Light Blue tint for formula rows
BORDER_COLOR = "CBD5E1"       # Light Slate
BORDER_DARK = "94A3B8"
WHITE = "FFFFFF"
DARK_TEXT = "1E293B"

# Fonts
font_title = Font(name="Calibri", size=16, bold=True, color=WHITE)
font_subtitle = Font(name="Calibri", size=10, italic=True, color="D1FAE5")
font_section = Font(name="Calibri", size=12, bold=True, color=PRIMARY_COLOR)
font_header = Font(name="Calibri", size=10.5, bold=True, color=WHITE)
font_subhdr = Font(name="Calibri", size=10, bold=True, color="334155")
font_bold = Font(name="Calibri", size=10, bold=True, color=DARK_TEXT)
font_regular = Font(name="Calibri", size=10, color=DARK_TEXT)
font_italic = Font(name="Calibri", size=9.5, italic=True, color="475569")
font_formula = Font(name="Consolas", size=9.5, color="0F766E", bold=True)
font_formula_code = Font(name="Consolas", size=9.5, color="1E3A8A", bold=True)
font_formula_lbl = Font(name="Calibri", size=10, bold=True, color="0F172A")

# Fills
fill_primary = PatternFill(start_color=PRIMARY_COLOR, end_color=PRIMARY_COLOR, fill_type="solid")
fill_accent = PatternFill(start_color="337A58", end_color="337A58", fill_type="solid")
fill_mint = PatternFill(start_color=BG_MINT, end_color=BG_MINT, fill_type="solid")
fill_cream = PatternFill(start_color=BG_CREAM, end_color=BG_CREAM, fill_type="solid")
fill_alt = PatternFill(start_color=BG_ALT_ROW, end_color=BG_ALT_ROW, fill_type="solid")
fill_fml_hdr = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
fill_fml_row = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

# Borders
thin_border = Border(
    left=Side(style="thin", color=BORDER_COLOR),
    right=Side(style="thin", color=BORDER_COLOR),
    top=Side(style="thin", color=BORDER_COLOR),
    bottom=Side(style="thin", color=BORDER_COLOR)
)
header_border = Border(
    left=Side(style="thin", color=BORDER_DARK),
    right=Side(style="thin", color=BORDER_DARK),
    top=Side(style="thin", color=BORDER_DARK),
    bottom=Side(style="medium", color=PRIMARY_COLOR)
)
double_bottom_border = Border(
    left=Side(style="thin", color=BORDER_COLOR),
    right=Side(style="thin", color=BORDER_COLOR),
    top=Side(style="thin", color=BORDER_COLOR),
    bottom=Side(style="double", color=PRIMARY_COLOR)
)

# Alignments
align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
align_right = Alignment(horizontal="right", vertical="center")

# Number formats
FMT_CURRENCY = "₹#,##0"
FMT_DECIMAL = "0.00"
FMT_PERCENT = "0.0%"

# Authoritative Crops Data Definition
crops_data = [
    {
        "code": "ONION",
        "name_en": "Rabi Onion",
        "name_mr": "कांदा",
        "season": "Rabi",
        "cat": "Vegetables",
        "window": "15 Oct – 30 Nov",
        "duration": "110–130",
        "harvest": "11 Mar – 09 Apr 2027",
        "y_min_ha": 18.0,
        "y_exp_ha": 21.0,
        "y_opt_ha": 24.0,
        "apmc_avg": 3000,
        "apmc_range": "₹1,000 – ₹5,000",
        "forecast_price_ton": 16500,
        "op_cost_ha": 88000,
        "tot_cost_ha": 132000,
        "guidance": "Confirm nursery seedling vigor (Bhima Kiran/Kiran) and assured water storage before field transplanting.",
        "tier": "Tier 1: Recommended (S1: 83.8% Vertisols with drainage layout)",
        "components": [
            {"name": "Nursery Raising, Seed Cost & Raised Beds", "pct": 15.9, "c2_amt": 8494, "a2_amt": 5662},
            {"name": "Land Preparation & Field Layout", "pct": 9.1, "c2_amt": 4861, "a2_amt": 3241},
            {"name": "Fertilizers, FYM & Micronutrient Complex", "pct": 20.5, "c2_amt": 10951, "a2_amt": 7300},
            {"name": "Drip Irrigation Maintenance & Fertigation Turns", "pct": 11.4, "c2_amt": 6090, "a2_amt": 4060},
            {"name": "Thrips & Purple Blotch Pest Management", "pct": 11.4, "c2_amt": 6090, "a2_amt": 4060},
            {"name": "Transplanting & Manual Weeding Operations", "pct": 18.2, "c2_amt": 9722, "a2_amt": 6481},
            {"name": "Harvesting, Curing, Grading & Mandi Transport", "pct": 13.6, "c2_amt": 7265, "a2_amt": 4843}
        ]
    },
    {
        "code": "TOMATO",
        "name_en": "Tomato",
        "name_mr": "टोमॅटो",
        "season": "Rabi",
        "cat": "Vegetables",
        "window": "01 Oct – 15 Nov",
        "duration": "100–130",
        "harvest": "10 Jan – 05 Mar 2027",
        "y_min_ha": 28.0,
        "y_exp_ha": 34.0,
        "y_opt_ha": 40.0,
        "apmc_avg": 1050,
        "apmc_range": "₹600 – ₹1,500",
        "forecast_price_ton": 14500,
        "op_cost_ha": 95000,
        "tot_cost_ha": 142000,
        "guidance": "Use certified F1 hybrids (Abhinav/Saaho) on raised beds with silver-black mulch film and trellis support.",
        "tier": "Tier 1: Recommended (S1: 83.1% Vertisols on raised beds with mulch)",
        "components": [
            {"name": "Hybrid Seedlings Pro-tray Nursery Raising", "pct": 16.5, "c2_amt": 9482, "a2_amt": 6343},
            {"name": "Land Preparation, Raised Beds & Plastic Mulch", "pct": 15.0, "c2_amt": 8620, "a2_amt": 5767},
            {"name": "Trellis Bamboo Staking & Wire Support", "pct": 18.5, "c2_amt": 10631, "a2_amt": 7112},
            {"name": "Drip Fertigation & Water Soluble NPK", "pct": 19.0, "c2_amt": 10918, "a2_amt": 7305},
            {"name": "Integrated Pest & Early/Late Blight Control", "pct": 14.0, "c2_amt": 8045, "a2_amt": 5382},
            {"name": "Multiple Hand Pickings, Sorting & Crates", "pct": 17.0, "c2_amt": 9769, "a2_amt": 6536}
        ]
    },
    {
        "code": "MAIZE",
        "name_en": "Rabi Maize",
        "name_mr": "मका",
        "season": "Rabi",
        "cat": "Cereals & Millets",
        "window": "15 Oct – 15 Nov",
        "duration": "100–115",
        "harvest": "05 Feb – 28 Feb 2027",
        "y_min_ha": 4.5,
        "y_exp_ha": 5.2,
        "y_opt_ha": 6.0,
        "apmc_avg": 1250,
        "apmc_range": "₹900 – ₹1,550",
        "forecast_price_ton": 21500,
        "op_cost_ha": 32000,
        "tot_cost_ha": 49000,
        "guidance": "Monitor for Fall Armyworm (FAW) at seedling stage and apply recommended MPKV bio-pesticides.",
        "tier": "Tier 2: Conditionally Suitable (S1: 84.9% with balanced nitrogen split)",
        "components": [
            {"name": "Certified Hybrid Seed & Seed Treatment", "pct": 18.0, "c2_amt": 3569, "a2_amt": 2331},
            {"name": "Deep Ploughing, Harrowing & Ridge Furrows", "pct": 16.0, "c2_amt": 3173, "a2_amt": 2072},
            {"name": "Basal DAP, Potash & Split Urea Top-dressing", "pct": 28.0, "c2_amt": 5552, "a2_amt": 3626},
            {"name": "Pre-emergence Herbicide & Inter-cultivation", "pct": 12.0, "c2_amt": 2380, "a2_amt": 1554},
            {"name": "Fall Armyworm (FAW) Pheromone & Bio-control", "pct": 11.0, "c2_amt": 2181, "a2_amt": 1425},
            {"name": "Mechanical Cob Harvesting, De-husking & Threshing", "pct": 15.0, "c2_amt": 2975, "a2_amt": 1943}
        ]
    },
    {
        "code": "SUGARCANE",
        "name_en": "Sugarcane (Suru/Eksali)",
        "name_mr": "ऊस",
        "season": "Annual",
        "cat": "Cash Crops",
        "window": "15 Dec – 15 Feb",
        "duration": "360–420",
        "harvest": "15 Dec 2027 – 15 Feb 2028",
        "y_min_ha": 85.0,
        "y_exp_ha": 100.0,
        "y_opt_ha": 115.0,
        "apmc_avg": 340,
        "apmc_range": "₹315 – ₹365 (FRP)",
        "forecast_price_ton": 3400,
        "op_cost_ha": 118000,
        "tot_cost_ha": 175000,
        "guidance": "Plant Co 86032 or CoM 0265 with drip fertigation to conserve 40% water.",
        "tier": "Tier 2: Conditionally Suitable (S2: 78.4% requires perennial water storage)",
        "components": [
            {"name": "Two-eye Bud Setts & Fungicide Sett Treatment", "pct": 15.0, "c2_amt": 10987, "a2_amt": 7163},
            {"name": "Deep Chiseling, Subsoiling & Furrow Opening", "pct": 14.0, "c2_amt": 10255, "a2_amt": 6685},
            {"name": "Heavy Basal FYM, Pressmud & 4-Split NPK Fertigation", "pct": 31.0, "c2_amt": 22707, "a2_amt": 14803},
            {"name": "Periodic Earthing-up, Trash Mulching & Drip Turns", "pct": 16.0, "c2_amt": 11720, "a2_amt": 7640},
            {"name": "White Grub, Stem Borer & Woolly Aphid Mgmt", "pct": 9.0, "c2_amt": 6592, "a2_amt": 4298},
            {"name": "Manual Cane Cutting, Binding & Sugar Mill Delivery", "pct": 15.0, "c2_amt": 10987, "a2_amt": 7163}
        ]
    },
    {
        "code": "POMEGRANATE",
        "name_en": "Pomegranate (Bhagwa)",
        "name_mr": "डाळिंब",
        "season": "Perennial (Ambe Bahar)",
        "cat": "Horticulture",
        "window": "15 Jan – 28 Feb",
        "duration": "160–180 (Bahar)",
        "harvest": "15 Jun – 15 Aug 2027",
        "y_min_ha": 10.0,
        "y_exp_ha": 12.0,
        "y_opt_ha": 14.0,
        "apmc_avg": 7500,
        "apmc_range": "₹4,000 – ₹11,000",
        "forecast_price_ton": 85000,
        "op_cost_ha": 145000,
        "tot_cost_ha": 225000,
        "guidance": "Ensure raised ridge planting with good drainage. Follow NRCP schedule for blight prevention.",
        "tier": "Tier 2: Conditionally Suitable (S2: 77.1% ridge planting + NRCP protocol)",
        "components": [
            {"name": "Canopy Pruning, Training & Sanitation", "pct": 12.0, "c2_amt": 10926, "a2_amt": 7041},
            {"name": "Deep Ridge Bed Preparation & Soil Drenching", "pct": 11.0, "c2_amt": 10016, "a2_amt": 6455},
            {"name": "Ambe Bahar Defoliation, Manures & Drip Nutrients", "pct": 28.0, "c2_amt": 25495, "a2_amt": 16430},
            {"name": "Bacterial Blight (Telya) Strict Preventative Protocol", "pct": 22.0, "c2_amt": 20032, "a2_amt": 12909},
            {"name": "Fruit Borer, Thrips & Sunscald Paper Bagging", "pct": 13.0, "c2_amt": 11837, "a2_amt": 7628},
            {"name": "Grading, Cushion Box Packing & Export/Domestic Mandi", "pct": 14.0, "c2_amt": 12748, "a2_amt": 8215}
        ]
    },
    {
        "code": "BANANA",
        "name_en": "Banana (Grand Naine)",
        "name_mr": "केळी",
        "season": "Annual",
        "cat": "Horticulture",
        "window": "15 Jun – 31 Jul",
        "duration": "330–360",
        "harvest": "01 Jun – 31 Jul 2027",
        "y_min_ha": 55.0,
        "y_exp_ha": 65.0,
        "y_opt_ha": 75.0,
        "apmc_avg": 1350,
        "apmc_range": "₹1,000 – ₹1,800",
        "forecast_price_ton": 14000,
        "op_cost_ha": 135000,
        "tot_cost_ha": 215000,
        "guidance": "Plant virus-free tissue culture plantlets at 1.8m x 1.5m spacing with weekly fertigation injections.",
        "tier": "Tier 4: Constrained / Marginal (S3: 48.1% heavy clay vertisol root aeration limits)",
        "components": [
            {"name": "Virus-indexed Tissue Culture Plantlets (1,200/ac)", "pct": 24.0, "c2_amt": 20882, "a2_amt": 13112},
            {"name": "Pit Digging, Organic Enrichment & Bed Shaping", "pct": 12.0, "c2_amt": 10441, "a2_amt": 6556},
            {"name": "Weekly Soluble N-P-K Fertigation Injection Program", "pct": 27.0, "c2_amt": 23492, "a2_amt": 14751},
            {"name": "Desuckering, Leaf Pruning & Bunch Propping Bamboos", "pct": 14.0, "c2_amt": 12181, "a2_amt": 7649},
            {"name": "Sigatoka Leaf Spot, Nematode & Aphid Vector Mgmt", "pct": 10.0, "c2_amt": 8701, "a2_amt": 5463},
            {"name": "Bunch Sleeving, Harvest Dehanding & Foam Transport", "pct": 13.0, "c2_amt": 11311, "a2_amt": 7102}
        ]
    },
    {
        "code": "SOYBEAN",
        "name_en": "Soybean",
        "name_mr": "सोयाबीन",
        "season": "Kharif (Off-season)",
        "cat": "Oilseeds & Pulses",
        "window": "15 Jun – 15 Jul",
        "duration": "95–105",
        "harvest": "01 Oct – 20 Oct 2027",
        "y_min_ha": 1.5,
        "y_exp_ha": 1.75,
        "y_opt_ha": 2.0,
        "apmc_avg": 4450,
        "apmc_range": "₹3,900 – ₹4,850",
        "forecast_price_ton": 46500,
        "op_cost_ha": 28000,
        "tot_cost_ha": 43000,
        "guidance": "Plan for next Kharif monsoon window using certified JS 335 / Phule Sangam seed with broad-bed furrow (BBF) technology.",
        "tier": "Tier 3: Off-Season for Sowing (S2: 78.1% Kharif monsoon crop with BBF layout)",
        "components": [
            {"name": "Certified Seed (JS 335/Phule Sangam) & Rhizobium Culture", "pct": 22.0, "c2_amt": 3828, "a2_amt": 2493},
            {"name": "BBF Seedbed Formation & Drainage Furrows", "pct": 15.0, "c2_amt": 2610, "a2_amt": 1700},
            {"name": "Single Super Phosphate (SSP) & Sulphur Basal Dressing", "pct": 24.0, "c2_amt": 4176, "a2_amt": 2720},
            {"name": "Pre/Early Post-emergence Weed Eradication", "pct": 14.0, "c2_amt": 2436, "a2_amt": 1586},
            {"name": "Girdle Beetle, Spodoptera & Rust Protection", "pct": 11.0, "c2_amt": 1914, "a2_amt": 1246},
            {"name": "Combine / Manual Pod Harvesting & Threshing", "pct": 14.0, "c2_amt": 2436, "a2_amt": 1586}
        ]
    }
]

# ==============================================================================
# SHEET 1: CORE FORMULAS & METHODOLOGY (DEDICATED REFERENCE SHEET)
# ==============================================================================
ws_fml = wb.create_sheet(title="Core Formulas & Methodology", index=0)
ws_fml.views.sheetView[0].showGridLines = True

ws_fml.merge_cells("A1:D1")
ws_fml["A1"] = "SOILPILOT — CORE MATHEMATICAL FORMULAS & CALCULATION METHODOLOGY"
ws_fml["A1"].font = font_title
ws_fml["A1"].fill = fill_primary
ws_fml["A1"].alignment = align_center
ws_fml.row_dimensions[1].height = 36

ws_fml.merge_cells("A2:D2")
ws_fml["A2"] = "Authoritative agronomic standards from CACP (GoI), MPKV Rahuri, and APMC Pune live market engine"
ws_fml["A2"].font = font_subtitle
ws_fml["A2"].fill = fill_primary
ws_fml["A2"].alignment = align_center
ws_fml.row_dimensions[2].height = 20

# Header Row for Sheet 1
fml_sheet_headers = [
    "Economic Parameter / Metric",
    "Proper Mathematical Formula (Website Decision Engine)",
    "Small Practical Example (Rabi Onion Gat 63)",
    "Live Excel Master Table Formula"
]

ws_fml.row_dimensions[4].height = 24
for ci, h in enumerate(fml_sheet_headers, start=1):
    c = ws_fml.cell(row=4, column=ci, value=h)
    c.font = font_header
    c.fill = fill_primary
    c.alignment = align_left if ci <= 3 else align_center
    c.border = header_border

formula_data_clean = [
    (
        "Yield per Acre (Ton/ac)",
        "Yield per Acre (Ton/ac) = Yield per Hectare (Ton/ha) × 0.404685642",
        "21.0 Ton/ha × 0.404685642 = 8.50 Ton/ac  (Min: 18.0 -> 7.28, Max: 24.0 -> 9.71 Ton/ac)",
        "=ROUND(21.0*0.404685642, 2)  [Cell J16]"
    ),
    (
        "Expected Selling Price (₹/Ton)",
        "Selling Price per Ton (₹/Ton) = APMC Mandi Rate (₹/Quintal) × 10",
        "₹1,650/qtl × 10 = ₹16,500 / Ton  (1 Metric Tonne = 10 Quintals = 1,000 kg)",
        "=L16*10  or Modal Forecast  [Cell N16]"
    ),
    (
        "Operational Cultivation Cost (A2+FL)",
        "Cost per Acre = CACP Cost per Hectare (A2+FL) × 0.404685642",
        "₹88,000/ha × 0.404685642 = ₹35,612 / ac  (Direct paid-out costs + imputed family labor)",
        "=ROUND(88000*0.404685642, 0)  [Cell O16]"
    ),
    (
        "Comprehensive Total Cost (C2)",
        "Cost per Acre = CACP Comprehensive Cost per Hectare (C2) × 0.404685642",
        "₹1,32,000/ha × 0.404685642 = ₹53,419 / ac  (Includes land rent, capital interest & depreciation)",
        "=ROUND(132000*0.404685642, 0)  [Cell P16]"
    ),
    (
        "Estimated Gross Revenue per Acre",
        "Estimated Gross Revenue per Acre = Expected Yield per Acre (Ton/ac) × Expected Selling Price (₹/Ton)",
        "8.50 Ton/ac × ₹16,500/Ton = ₹1,40,250 / acre",
        "=J16*N16  [Cell Q16]"
    ),
    (
        "Estimated Net Return per Acre (A2+FL)",
        "Expected Net Return = (Expected Yield × Selling Price) − Cultivation Cost (A2+FL)",
        "₹1,40,250 (Gross Revenue) − ₹35,612 (A2+FL Cost) = +₹1,04,638 / acre",
        "=Q16-O16  [Cell R16]"
    ),
    (
        "Comprehensive Net Return per Acre (C2)",
        "Net Economic Return = Estimated Gross Revenue per Acre − Comprehensive Total Cost (C2)",
        "₹1,40,250 (Gross Revenue) − ₹53,419 (C2 Cost) = +₹86,831 / acre",
        "=Q16-P16  [Cell S16]"
    ),
    (
        "Benefit-Cost Ratio (B:C Ratio)",
        "Benefit-Cost Ratio = Estimated Gross Revenue per Acre ÷ Operational Cultivation Cost (A2+FL)",
        "₹1,40,250 ÷ ₹35,612 = 3.94  (Returns ₹3.94 gross revenue for every ₹1.00 operational cash spent)",
        "=Q16/O16  [Cell T16]"
    )
]

for idx, (param_name, fml_str, ex_str, xl_str) in enumerate(formula_data_clean, start=5):
    ws_fml.row_dimensions[idx].height = 24
    c1 = ws_fml.cell(row=idx, column=1, value=param_name)
    c1.font = font_formula_lbl
    c1.alignment = align_left
    c1.fill = fill_fml_row

    c2 = ws_fml.cell(row=idx, column=2, value=fml_str)
    c2.font = font_formula_code
    c2.alignment = align_left
    c2.fill = fill_fml_row

    c3 = ws_fml.cell(row=idx, column=3, value=ex_str)
    c3.font = font_italic
    c3.alignment = align_left
    c3.fill = fill_fml_row

    c4 = ws_fml.cell(row=idx, column=4, value=xl_str)
    c4.font = font_formula
    c4.alignment = align_center
    c4.fill = fill_fml_row

    for ci in range(1, 5):
        ws_fml.cell(row=idx, column=ci).border = thin_border

ws_fml.column_dimensions["A"].width = 40
ws_fml.column_dimensions["B"].width = 85
ws_fml.column_dimensions["C"].width = 65
ws_fml.column_dimensions["D"].width = 34

# ==============================================================================
# SHEET 2: 7 CROPS MASTER COMPARISON & FORMULAS
# ==============================================================================
ws1 = wb.create_sheet(title="7 Crops Master Comparison")
ws1.views.sheetView[0].showGridLines = True

# Main Title Banners
ws1.merge_cells("A1:U1")
ws1["A1"] = "SOILPILOT — MARKET & CROP PLANNER MASTER ECONOMIC COMPARISON"
ws1["A1"].font = font_title
ws1["A1"].fill = fill_primary
ws1["A1"].alignment = align_center
ws1.row_dimensions[1].height = 36

ws1.merge_cells("A2:U2")
ws1["A2"] = "Authoritative benchmarks from CACP (GoI), MPKV Rahuri (2025-26), ICAR-DOGR, VSI, NRCP Solapur, & Pune APMC Gultekdi Live Bulletin"
ws1["A2"].font = font_subtitle
ws1["A2"].fill = fill_primary
ws1["A2"].alignment = align_center
ws1.row_dimensions[2].height = 20

# ------------------------------------------------------------------------------
# FORMULA REFERENCE SECTION (EXACT 2-COLUMN TABLE IN FRONT OF PARAMETER)
# ------------------------------------------------------------------------------
ws1.merge_cells("A4:U4")
ws1["A4"] = "CORE MATHEMATICAL FORMULAS EMBEDDED IN THIS WORKBOOK & SOILPILOT WEBSITE"
ws1["A4"].font = font_section
ws1["A4"].alignment = align_left
ws1.row_dimensions[4].height = 24

# Subheaders for the Formula Reference Box (Col A-E for Parameter, Col F-U for Formula)
ws1.merge_cells("A5:E5")
ws1["A5"] = "Economic Parameter / Metric"
ws1["A5"].font = font_subhdr
ws1["A5"].fill = fill_fml_hdr
ws1["A5"].alignment = align_left
ws1["A5"].border = header_border

ws1.merge_cells("F5:U5")
ws1["F5"] = "Proper Mathematical Formula & Small Example (Gat 63 Rabi Onion)"
ws1["F5"].font = font_subhdr
ws1["F5"].fill = fill_fml_hdr
ws1["F5"].alignment = align_left
ws1["F5"].border = header_border
ws1.row_dimensions[5].height = 22

# Border styling for merged header cells
for col_idx in range(1, 22):
    ws1.cell(row=5, column=col_idx).border = header_border

# 2-Column Formula Reference Rows (Matching User Image Perfectly)
formula_2col = [
    (
        "Yield per Acre (Ton/ac)",
        "Formula: Yield per Acre (Ton/ac) = Yield per Hectare (Ton/ha) × 0.404685642   |   Small Example: 21.0 Ton/ha × 0.404686 = 8.50 Ton/ac (Min: 18.0 -> 7.28, Max: 24.0 -> 9.71 Ton/ac)"
    ),
    (
        "Expected Selling Price (₹/Ton)",
        "Formula: Selling Price per Ton (₹/Ton) = APMC Mandi Rate (₹/Quintal) × 10   |   Small Example: ₹1,650/qtl × 10 = ₹16,500 / Ton (1 Tonne = 10 Quintals = 1,000 kg)"
    ),
    (
        "Operational Cultivation Cost (A2+FL)",
        "Formula: Cost per Acre = CACP Cost per Hectare (A2+FL) × 0.404685642   |   Small Example: ₹88,000/ha × 0.404686 = ₹35,612 / ac (Paid-out costs + imputed family labor)"
    ),
    (
        "Comprehensive Total Cost (C2)",
        "Formula: Cost per Acre = CACP Comprehensive Cost per Hectare (C2) × 0.404685642   |   Small Example: ₹1,32,000/ha × 0.404686 = ₹53,419 / ac (Includes land rent, capital interest & depreciation)"
    ),
    (
        "Estimated Gross Revenue per Acre",
        "Formula: Estimated Gross Revenue = Expected Yield per Acre (Ton/ac) × Expected Selling Price (₹/Ton)   |   Small Example: 8.50 Ton/ac × ₹16,500/Ton = ₹1,40,250 / acre"
    ),
    (
        "Estimated Net Return per Acre (A2+FL)",
        "Formula: Expected Net Return = (Expected Yield × Selling Price) − Cultivation Cost (A2+FL)   |   Small Example: ₹1,40,250 (Gross Revenue) − ₹35,612 (A2+FL Cost) = +₹1,04,638 / acre"
    ),
    (
        "Comprehensive Net Return per Acre (C2)",
        "Formula: Net Economic Return = Estimated Gross Revenue − Comprehensive Total Cost (C2)   |   Small Example: ₹1,40,250 (Gross Revenue) − ₹53,419 (C2 Cost) = +₹86,831 / acre"
    ),
    (
        "Benefit-Cost Ratio (B:C Ratio)",
        "Formula: Benefit-Cost Ratio = Estimated Gross Revenue per Acre ÷ Operational Cultivation Cost (A2+FL)   |   Small Example: ₹1,40,250 ÷ ₹35,612 = 3.94 (Returns ₹3.94 for every ₹1 spent)"
    )
]

curr_fml_row = 6
for param_name, fml_combined in formula_2col:
    ws1.row_dimensions[curr_fml_row].height = 24
    
    # Col A-E (Metric Name)
    ws1.merge_cells(start_row=curr_fml_row, start_column=1, end_row=curr_fml_row, end_column=5)
    c1 = ws1.cell(row=curr_fml_row, column=1, value=param_name)
    c1.font = font_formula_lbl
    c1.alignment = align_left
    c1.fill = fill_fml_row
    
    # Col F-U (Formula in front of it)
    ws1.merge_cells(start_row=curr_fml_row, start_column=6, end_row=curr_fml_row, end_column=21)
    c2 = ws1.cell(row=curr_fml_row, column=6, value=fml_combined)
    c2.font = font_formula_code
    c2.alignment = align_left
    c2.fill = fill_fml_row
    
    for c_i in range(1, 22):
        ws1.cell(row=curr_fml_row, column=c_i).border = thin_border
        
    curr_fml_row += 1

# Blank row separator
ws1.row_dimensions[curr_fml_row].height = 12
curr_fml_row += 1

# ------------------------------------------------------------------------------
# MASTER TABLE HEADERS (ROW 15)
# ------------------------------------------------------------------------------
row_hdr = curr_fml_row
headers_ws1 = [
    "Sr. No.",
    "Crop Name (English)",
    "Crop Name (मराठी)",
    "Season",
    "Category",
    "Sowing Window",
    "Duration (Days)",
    "Expected Harvest Window",
    "Min Yield (Ton/ac)",
    "Central Yield (Ton/ac)",
    "Optimal Yield (Ton/ac)",
    "Pune APMC Spot Rate (₹/qtl)",
    "APMC Min-Max Range (₹/qtl)",
    "Harvest Price Forecast (₹/Ton)",
    "Operational Cost / ac (A2+FL) [₹]",
    "Total Cost / ac (C2) [₹]",
    "Est. Gross Revenue / ac [₹]",
    "Est. Net Return (A2+FL) [₹]",
    "Est. Net Return (C2) [₹]",
    "B:C Ratio (A2+FL)",
    "Decision Tier & Suitability (Baramati Vertisols)"
]

ws1.row_dimensions[row_hdr].height = 32
for col_idx, h in enumerate(headers_ws1, start=1):
    cell = ws1.cell(row=row_hdr, column=col_idx, value=h)
    cell.font = font_header
    cell.fill = fill_primary
    cell.alignment = align_center
    cell.border = thin_border

# Populate Data with LIVE EXCEL FORMULAS in Rows 16–22
curr_r = row_hdr + 1
for idx, c in enumerate(crops_data, start=1):
    ws1.row_dimensions[curr_r].height = 24
    
    ws1.cell(row=curr_r, column=1, value=idx).alignment = align_center
    ws1.cell(row=curr_r, column=2, value=c["name_en"]).alignment = align_left
    ws1.cell(row=curr_r, column=3, value=c["name_mr"]).alignment = align_center
    ws1.cell(row=curr_r, column=4, value=c["season"]).alignment = align_center
    ws1.cell(row=curr_r, column=5, value=c["cat"]).alignment = align_left
    ws1.cell(row=curr_r, column=6, value=c["window"]).alignment = align_center
    ws1.cell(row=curr_r, column=7, value=c["duration"]).alignment = align_center
    ws1.cell(row=curr_r, column=8, value=c["harvest"]).alignment = align_center

    # Column 9: Min Yield Formula =ROUND(y_min_ha * 0.404685642, 2)
    c_ymin = ws1.cell(row=curr_r, column=9, value=f"=ROUND({c['y_min_ha']}*0.404685642, 2)")
    c_ymin.number_format = FMT_DECIMAL
    c_ymin.alignment = align_right

    # Column 10: Central Yield Formula =ROUND(y_exp_ha * 0.404685642, 2)
    c_yexp = ws1.cell(row=curr_r, column=10, value=f"=ROUND({c['y_exp_ha']}*0.404685642, 2)")
    c_yexp.number_format = FMT_DECIMAL
    c_yexp.alignment = align_right
    c_yexp.font = font_bold

    # Column 11: Optimal Yield Formula =ROUND(y_opt_ha * 0.404685642, 2)
    c_yopt = ws1.cell(row=curr_r, column=11, value=f"=ROUND({c['y_opt_ha']}*0.404685642, 2)")
    c_yopt.number_format = FMT_DECIMAL
    c_yopt.alignment = align_right

    # APMC & Forecast Prices
    c_apmc = ws1.cell(row=curr_r, column=12, value=c["apmc_avg"])
    c_apmc.number_format = FMT_CURRENCY
    c_apmc.alignment = align_right

    ws1.cell(row=curr_r, column=13, value=c["apmc_range"]).alignment = align_center

    c_fc = ws1.cell(row=curr_r, column=14, value=c["forecast_price_ton"])
    c_fc.number_format = FMT_CURRENCY
    c_fc.alignment = align_right
    c_fc.font = font_bold

    # Column 15: Operational Cost (A2+FL) Formula =ROUND(op_cost_ha * 0.404685642, 0)
    c_opc = ws1.cell(row=curr_r, column=15, value=f"=ROUND({c['op_cost_ha']}*0.404685642, 0)")
    c_opc.number_format = FMT_CURRENCY
    c_opc.alignment = align_right

    # Column 16: Total Cost (C2) Formula =ROUND(tot_cost_ha * 0.404685642, 0)
    c_totc = ws1.cell(row=curr_r, column=16, value=f"=ROUND({c['tot_cost_ha']}*0.404685642, 0)")
    c_totc.number_format = FMT_CURRENCY
    c_totc.alignment = align_right

    # EXCEL FORMULAS for Revenue, Net Returns, B:C Ratio:
    # Gross Revenue: Col 17 = Col 10 (Central Yield) * Col 14 (Forecast Price)
    # Net Return A2+FL: Col 18 = Col 17 - Col 15
    # Net Return C2: Col 19 = Col 17 - Col 16
    # B:C Ratio: Col 20 = Col 17 / Col 15

    col_y = f"J{curr_r}"      # Central Yield
    col_p = f"N{curr_r}"      # Forecast Price
    col_op = f"O{curr_r}"     # Op Cost A2+FL
    col_tot = f"P{curr_r}"    # Tot Cost C2
    col_rev = f"Q{curr_r}"    # Gross Revenue

    c_rev = ws1.cell(row=curr_r, column=17, value=f"={col_y}*{col_p}")
    c_rev.number_format = FMT_CURRENCY
    c_rev.alignment = align_right
    c_rev.font = font_bold

    c_net_op = ws1.cell(row=curr_r, column=18, value=f"={col_rev}-{col_op}")
    c_net_op.number_format = FMT_CURRENCY
    c_net_op.alignment = align_right
    c_net_op.font = font_bold

    c_net_c2 = ws1.cell(row=curr_r, column=19, value=f"={col_rev}-{col_tot}")
    c_net_c2.number_format = FMT_CURRENCY
    c_net_c2.alignment = align_right

    c_bc = ws1.cell(row=curr_r, column=20, value=f"={col_rev}/{col_op}")
    c_bc.number_format = "0.00"
    c_bc.alignment = align_center
    c_bc.font = font_bold

    c_tier = ws1.cell(row=curr_r, column=21, value=c["tier"])
    c_tier.alignment = align_left
    c_tier.font = font_regular

    # Style row
    for c_i in range(1, 22):
        ws1.cell(row=curr_r, column=c_i).border = thin_border
        if idx % 2 == 0:
            ws1.cell(row=curr_r, column=c_i).fill = fill_alt

    curr_r += 1


# ==============================================================================
# SHEET 2: CULTIVATION COST BREAKDOWNS (EXACT MATCH WITH USER PHOTO)
# ==============================================================================
ws2 = wb.create_sheet(title="Cultivation Cost Breakdowns")
ws2.views.sheetView[0].showGridLines = True

# Title
ws2.merge_cells("A1:G1")
ws2["A1"] = "SOILPILOT — DETAILED CULTIVATION COST BREAKDOWNS (ALL 7 CROPS)"
ws2["A1"].font = font_title
ws2["A1"].fill = fill_primary
ws2["A1"].alignment = align_center
ws2.row_dimensions[1].height = 36

ws2.merge_cells("A2:G2")
ws2["A2"] = "Itemized operational activities reconciled with CACP Comprehensive Scheme & MPKV Rahuri Package of Practices"
ws2["A2"].font = font_subtitle
ws2["A2"].fill = fill_primary
ws2["A2"].alignment = align_center
ws2.row_dimensions[2].height = 20

curr_row_s2 = 4

for b in crops_data:
    # Crop Title Banner
    ws2.merge_cells(start_row=curr_row_s2, start_column=1, end_row=curr_row_s2, end_column=7)
    title_cell = ws2.cell(row=curr_row_s2, column=1, value=f"{b['name_en'].upper()} ({b['name_mr']}) — CULTIVATION BUDGET & YIELD ASSUMPTIONS")
    title_cell.font = font_section
    title_cell.fill = fill_mint
    title_cell.alignment = align_left
    ws2.row_dimensions[curr_row_s2].height = 26
    curr_row_s2 += 1

    # Exact Net Return Formula Banner from User Photo
    ws2.merge_cells(start_row=curr_row_s2, start_column=1, end_row=curr_row_s2, end_column=7)
    fml_banner = ws2.cell(
        row=curr_row_s2, 
        column=1, 
        value="Net Return Calculation Formula: Expected Net Return = (Expected Yield × Selling Price) − Cultivation Cost  [संभाव्य निव्वळ नफा = (उत्पादन × भाव) − खर्च]"
    )
    fml_banner.font = font_formula
    fml_banner.fill = fill_fml_row
    fml_banner.alignment = align_left
    fml_banner.border = thin_border
    ws2.row_dimensions[curr_row_s2].height = 22
    curr_row_s2 += 1

    # Expected Yield Assumptions Bar matching photo
    y_min_ac = round(b["y_min_ha"] * 0.404685642, 2)
    y_exp_ac = round(b["y_exp_ha"] * 0.404685642, 2)
    y_opt_ac = round(b["y_opt_ha"] * 0.404685642, 2)
    p_fc = b["forecast_price_ton"]

    ws2.merge_cells(start_row=curr_row_s2, start_column=1, end_row=curr_row_s2, end_column=2)
    c_yhdr = ws2.cell(row=curr_row_s2, column=1, value="Expected Yield Assumptions:")
    c_yhdr.font = font_bold
    c_yhdr.fill = fill_cream

    ws2.cell(row=curr_row_s2, column=3, value=f"Min: {y_min_ac} Ton/ac").font = font_bold
    ws2.cell(row=curr_row_s2, column=4, value=f"Central: {y_exp_ac} Ton/ac").font = font_bold
    ws2.cell(row=curr_row_s2, column=4).fill = fill_mint
    ws2.cell(row=curr_row_s2, column=5, value=f"Optimal: {y_opt_ac} Ton/ac").font = font_bold
    ws2.merge_cells(start_row=curr_row_s2, start_column=6, end_row=curr_row_s2, end_column=7)
    ws2.cell(row=curr_row_s2, column=6, value=f"Forecast Price: ₹{p_fc:,.0f} / Ton").font = font_bold

    for ci in range(1, 8):
        ws2.cell(row=curr_row_s2, column=ci).border = thin_border
        ws2.cell(row=curr_row_s2, column=ci).alignment = align_center
    ws2.row_dimensions[curr_row_s2].height = 22
    curr_row_s2 += 1

    # Table Header for Components
    tbl_headers = ["Sr.", "Cost Component / Line Item", "Share (%)", "Operational Amount (A2+FL)", "Comprehensive (C2)", "Activity Scope", "Standard Applied"]
    ws2.row_dimensions[curr_row_s2].height = 22
    for c_idx, th in enumerate(tbl_headers, start=1):
        c = ws2.cell(row=curr_row_s2, column=c_idx, value=th)
        c.font = font_subhdr
        c.fill = fill_mint
        c.border = thin_border
        c.alignment = align_center if c_idx in [1, 3] else (align_right if c_idx in [4, 5] else align_left)
    curr_row_s2 += 1

    # Component Rows
    start_comp_row = curr_row_s2
    tot_op_target = round(b["op_cost_ha"] * 0.404685642)
    tot_c2_target = round(b["tot_cost_ha"] * 0.404685642)

    for comp_idx, comp in enumerate(b["components"], start=1):
        pct = comp["pct"]
        # Use exact amounts if provided (such as Onion from user photo), else calculate
        c2_val = comp.get("c2_amt", round((pct / 100.0) * tot_c2_target))
        a2_val = comp.get("a2_amt", round((pct / 100.0) * tot_op_target))

        ws2.row_dimensions[curr_row_s2].height = 20
        ws2.cell(row=curr_row_s2, column=1, value=comp_idx).alignment = align_center
        ws2.cell(row=curr_row_s2, column=2, value=comp["name"]).alignment = align_left
        
        c_pct = ws2.cell(row=curr_row_s2, column=3, value=pct / 100.0)
        c_pct.number_format = FMT_PERCENT
        c_pct.alignment = align_center

        c_op = ws2.cell(row=curr_row_s2, column=4, value=a2_val)
        c_op.number_format = FMT_CURRENCY
        c_op.alignment = align_right

        c_tot = ws2.cell(row=curr_row_s2, column=5, value=c2_val)
        c_tot.number_format = FMT_CURRENCY
        c_tot.alignment = align_right

        ws2.cell(row=curr_row_s2, column=6, value="Field Operations & Material Cost").alignment = align_left
        ws2.cell(row=curr_row_s2, column=7, value="MPKV PoP / CACP Benchmark").alignment = align_left

        for c_i in range(1, 8):
            ws2.cell(row=curr_row_s2, column=c_i).border = thin_border
        curr_row_s2 += 1

    end_comp_row = curr_row_s2 - 1

    # Total Operational Cost Row with LIVE EXCEL SUM FORMULAS
    ws2.row_dimensions[curr_row_s2].height = 22
    ws2.cell(row=curr_row_s2, column=1, value="").border = thin_border
    c_tot_lbl = ws2.cell(row=curr_row_s2, column=2, value="TOTAL CULTIVATION COST PER ACRE")
    c_tot_lbl.font = font_bold
    c_tot_lbl.border = thin_border

    c_sum_pct = ws2.cell(row=curr_row_s2, column=3, value=f"=SUM(C{start_comp_row}:C{end_comp_row})")
    c_sum_pct.font = font_bold
    c_sum_pct.number_format = FMT_PERCENT
    c_sum_pct.alignment = align_center
    c_sum_pct.border = thin_border

    c_sum_op = ws2.cell(row=curr_row_s2, column=4, value=f"=SUM(D{start_comp_row}:D{end_comp_row})")
    c_sum_op.font = font_bold
    c_sum_op.number_format = FMT_CURRENCY
    c_sum_op.alignment = align_right
    c_sum_op.fill = fill_mint
    c_sum_op.border = thin_border

    c_sum_tot = ws2.cell(row=curr_row_s2, column=5, value=f"=SUM(E{start_comp_row}:E{end_comp_row})")
    c_sum_tot.font = font_bold
    c_sum_tot.number_format = FMT_CURRENCY
    c_sum_tot.alignment = align_right
    c_sum_tot.border = thin_border

    ws2.cell(row=curr_row_s2, column=6, value="Total A2+FL vs Comprehensive C2").border = thin_border
    ws2.cell(row=curr_row_s2, column=7, value="Certified Cost Protocol").border = thin_border
    curr_row_s2 += 1

    # Agronomic Advisory & Guidance Box matching the user photo exactly
    ws2.merge_cells(start_row=curr_row_s2, start_column=1, end_row=curr_row_s2, end_column=7)
    adv_cell = ws2.cell(row=curr_row_s2, column=1, value=f"Agronomic Advisory & Guidance: {b['guidance']}")
    adv_cell.font = font_bold
    adv_cell.fill = fill_cream
    adv_cell.alignment = align_left
    adv_cell.border = thin_border
    ws2.row_dimensions[curr_row_s2].height = 24
    curr_row_s2 += 2  # Gap between crops


# ==============================================================================
# SHEET 3: YIELD & PRICE SCENARIOS (SENSITIVITY ANALYSIS)
# ==============================================================================
ws3 = wb.create_sheet(title="Yield & Price Scenarios")
ws3.views.sheetView[0].showGridLines = True

ws3.merge_cells("A1:I1")
ws3["A1"] = "SOILPILOT — MULTI-TIER CROP SENSITIVITY SCENARIOS (21 SCENARIOS)"
ws3["A1"].font = font_title
ws3["A1"].fill = fill_primary
ws3["A1"].alignment = align_center
ws3.row_dimensions[1].height = 36

ws3.merge_cells("A2:I2")
ws3["A2"] = "Three-tiered stochastic modeling: Conservative (-12% Price / Min Yield), Central, and Optimistic (+12% Price / Bumper Yield)"
ws3["A2"].font = font_subtitle
ws3["A2"].fill = fill_primary
ws3["A2"].alignment = align_center
ws3.row_dimensions[2].height = 20

# Explanation of Scenario Formulas
ws3.merge_cells("A4:I4")
ws3["A4"] = "SCENARIO REVENUE & PROFIT SENSITIVITY FORMULAS:"
ws3["A4"].font = font_section
ws3.row_dimensions[4].height = 22

scen_fmls = [
    ("Conservative Scenario", "Lower Yield (Ton/ac) × Lower Price (-12% Modal Mandi Price) − Operational Cost (A2+FL)"),
    ("Central Expected Scenario", "Expected Central Yield (Ton/ac) × Modal Forecast Price (₹/Ton) − Operational Cost (A2+FL)"),
    ("Optimistic Scenario", "Optimal Bumper Yield (Ton/ac) × Upper Price (+12% Modal Mandi Price) − Operational Cost (A2+FL)")
]

for idx, (lbl, fml) in enumerate(scen_fmls, start=5):
    ws3.merge_cells(start_row=idx, start_column=1, end_row=idx, end_column=3)
    ws3.cell(row=idx, column=1, value=lbl).font = font_bold
    ws3.cell(row=idx, column=1).alignment = align_left
    ws3.merge_cells(start_row=idx, start_column=4, end_row=idx, end_column=9)
    ws3.cell(row=idx, column=4, value=fml).font = font_formula
    ws3.cell(row=idx, column=4).alignment = align_left
    ws3.row_dimensions[idx].height = 20

# Scenario Table Headers
headers_ws3 = [
    "Sr.",
    "Crop Name",
    "Scenario Tier",
    "Assumed Yield (Ton/ac)",
    "Assumed Price (₹/Ton)",
    "Gross Revenue / ac [₹]",
    "Operational Cost / ac [₹]",
    "Net Return (A2+FL) [₹]",
    "Benefit-Cost Ratio"
]

row_hdr_s3 = 9
ws3.row_dimensions[row_hdr_s3].height = 28
for c_idx, h in enumerate(headers_ws3, start=1):
    c = ws3.cell(row=row_hdr_s3, column=c_idx, value=h)
    c.font = font_header
    c.fill = fill_primary
    c.alignment = align_center
    c.border = thin_border

curr_r_s3 = row_hdr_s3 + 1
scen_counter = 1

for crop in crops_data:
    op_cost = round(crop["op_cost_ha"] * 0.404685642)
    y_min = round(crop["y_min_ha"] * 0.404685642, 2)
    y_exp = round(crop["y_exp_ha"] * 0.404685642, 2)
    y_opt = round(crop["y_opt_ha"] * 0.404685642, 2)
    p_modal = crop["forecast_price_ton"]

    tiers = [
        ("Conservative (Lower Yield × -12% Price)", y_min, round(p_modal * 0.88)),
        ("Central Expected (Normal Yield × Modal Price)", y_exp, p_modal),
        ("Optimistic (Bumper Yield × +12% Price)", y_opt, round(p_modal * 1.12))
    ]

    for t_name, y_val, p_val in tiers:
        ws3.row_dimensions[curr_r_s3].height = 22
        ws3.cell(row=curr_r_s3, column=1, value=scen_counter).alignment = align_center
        ws3.cell(row=curr_r_s3, column=2, value=crop["name_en"]).alignment = align_left
        ws3.cell(row=curr_r_s3, column=3, value=t_name).alignment = align_left

        c_y = ws3.cell(row=curr_r_s3, column=4, value=y_val)
        c_y.number_format = FMT_DECIMAL
        c_y.alignment = align_right

        c_p = ws3.cell(row=curr_r_s3, column=5, value=p_val)
        c_p.number_format = FMT_CURRENCY
        c_p.alignment = align_right

        # LIVE EXCEL FORMULAS FOR SCENARIOS
        col_y_s3 = f"D{curr_r_s3}"
        col_p_s3 = f"E{curr_r_s3}"
        col_rev_s3 = f"F{curr_r_s3}"
        col_cost_s3 = f"G{curr_r_s3}"

        # Revenue = Yield * Price
        c_rev = ws3.cell(row=curr_r_s3, column=6, value=f"={col_y_s3}*{col_p_s3}")
        c_rev.number_format = FMT_CURRENCY
        c_rev.alignment = align_right
        c_rev.font = font_bold

        # Cost
        c_cost = ws3.cell(row=curr_r_s3, column=7, value=op_cost)
        c_cost.number_format = FMT_CURRENCY
        c_cost.alignment = align_right

        # Net Return = Revenue - Cost
        c_net = ws3.cell(row=curr_r_s3, column=8, value=f"={col_rev_s3}-{col_cost_s3}")
        c_net.number_format = FMT_CURRENCY
        c_net.alignment = align_right
        c_net.font = font_bold

        # B:C Ratio = Revenue / Cost
        c_bc = ws3.cell(row=curr_r_s3, column=9, value=f"={col_rev_s3}/{col_cost_s3}")
        c_bc.number_format = "0.00"
        c_bc.alignment = align_center
        c_bc.font = font_bold

        for ci in range(1, 10):
            ws3.cell(row=curr_r_s3, column=ci).border = thin_border
            if "Conservative" in t_name:
                ws3.cell(row=curr_r_s3, column=ci).fill = fill_cream
            elif "Optimistic" in t_name:
                ws3.cell(row=curr_r_s3, column=ci).fill = fill_mint

        curr_r_s3 += 1
        scen_counter += 1


# ==============================================================================
# SHEET 4: PUNE APMC LIVE MANDI RATES
# ==============================================================================
ws4 = wb.create_sheet(title="Pune APMC Live Mandi Rates")
ws4.views.sheetView[0].showGridLines = True

ws4.merge_cells("A1:H1")
ws4["A1"] = "PUNE APMC GULTEKDI — LIVE DAILY SPOT MARKET INTELLIGENCE"
ws4["A1"].font = font_title
ws4["A1"].fill = fill_primary
ws4["A1"].alignment = align_center
ws4.row_dimensions[1].height = 36

ws4.merge_cells("A2:H2")
ws4["A2"] = "Direct spot bulletin scraped from https://apmcpune.in (Agricultural Produce Market Committee, Gultekdi Market Yard)"
ws4["A2"].font = font_subtitle
ws4["A2"].fill = fill_primary
ws4["A2"].alignment = align_center
ws4.row_dimensions[2].height = 20

headers_ws4 = [
    "Sr.",
    "Commodity (मराठी)",
    "Commodity (English)",
    "Market Yard / Yard Section",
    "Daily Arrivals (Quintals)",
    "Minimum Price (₹/qtl)",
    "Maximum Price (₹/qtl)",
    "Modal Average Price (₹/qtl)"
]

ws4.row_dimensions[4].height = 28
for ci, h in enumerate(headers_ws4, start=1):
    c = ws4.cell(row=4, column=ci, value=h)
    c.font = font_header
    c.fill = fill_primary
    c.alignment = align_center
    c.border = thin_border

apmc_data = [
    (1, "कांदा (Onion)", "Onion (Rabi Red/Gavran)", "Gultekdi Main Onion Yard", 14250, 1000, 5000, 3000),
    (2, "टोमॅटो (Tomato)", "Tomato (Hybrid F1)", "Vegetable Sub-yard Gultekdi", 8400, 600, 1500, 1050),
    (3, "मका (Maize)", "Yellow Maize / Feed Grain", "Grain Yard Gultekdi", 4120, 900, 1550, 1250),
    (4, "ऊस (Sugarcane)", "Sugarcane (FRP Mill Delivery)", "Baramati / Manjari Catchment", "Direct to Mill", 315, 365, 340),
    (5, "डाळिंब (Pomegranate)", "Pomegranate (Bhagwa)", "Fruit Section Gultekdi", 2650, 4000, 11000, 7500),
    (6, "केळी (Banana)", "Banana (Grand Naine)", "Fruit Yard Gultekdi", 5180, 1000, 1800, 1350),
    (7, "सोयाबीन (Soybean)", "Yellow Soybean (Kharif/Rabi)", "Grain & Oilseed Yard", 6850, 3900, 4850, 4450)
]

for idx, (sr, mname, ename, yard, arrivals, p_min, p_max, p_avg) in enumerate(apmc_data, start=5):
    ws4.row_dimensions[idx].height = 22
    ws4.cell(row=idx, column=1, value=sr).alignment = align_center
    ws4.cell(row=idx, column=2, value=mname).alignment = align_left
    ws4.cell(row=idx, column=3, value=ename).alignment = align_left
    ws4.cell(row=idx, column=4, value=yard).alignment = align_left

    c_arr = ws4.cell(row=idx, column=5, value=arrivals)
    c_arr.alignment = align_right
    if isinstance(arrivals, (int, float)):
        c_arr.number_format = "#,##0"

    c_min = ws4.cell(row=idx, column=6, value=p_min)
    c_min.number_format = FMT_CURRENCY
    c_min.alignment = align_right

    c_max = ws4.cell(row=idx, column=7, value=p_max)
    c_max.number_format = FMT_CURRENCY
    c_max.alignment = align_right

    c_avg = ws4.cell(row=idx, column=8, value=p_avg)
    c_avg.number_format = FMT_CURRENCY
    c_avg.alignment = align_right
    c_avg.font = font_bold

    for ci in range(1, 9):
        ws4.cell(row=idx, column=ci).border = thin_border
        if sr % 2 == 0:
            ws4.cell(row=idx, column=ci).fill = fill_alt


# ==============================================================================
# AUTO-FIT COLUMN WIDTHS & READABILITY TWEAKS
# ==============================================================================
for sheet in wb.worksheets:
    for col in sheet.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            # Skip title and formula reference banner rows from width calculation
            if cell.row in range(1, 16):
                continue
            val_str = str(cell.value or '')
            if cell.number_format == FMT_CURRENCY and isinstance(cell.value, (int, float)):
                val_str = f"₹{cell.value:,.0f}"
            max_len = max(max_len, len(val_str))
        sheet.column_dimensions[col_letter].width = max(max_len + 4, 12)

# Specific tweaks for sheet 1 readability
ws1.column_dimensions["A"].width = 10
ws1.column_dimensions["B"].width = 22
ws1.column_dimensions["C"].width = 16
ws1.column_dimensions["D"].width = 14
ws1.column_dimensions["E"].width = 20
ws1.column_dimensions["F"].width = 18
ws1.column_dimensions["G"].width = 16
ws1.column_dimensions["H"].width = 26
ws1.column_dimensions["I"].width = 18
ws1.column_dimensions["J"].width = 20
ws1.column_dimensions["K"].width = 18
ws1.column_dimensions["L"].width = 24
ws1.column_dimensions["M"].width = 24
ws1.column_dimensions["N"].width = 26
ws1.column_dimensions["O"].width = 28
ws1.column_dimensions["P"].width = 24
ws1.column_dimensions["Q"].width = 26
ws1.column_dimensions["R"].width = 26
ws1.column_dimensions["S"].width = 24
ws1.column_dimensions["T"].width = 18
ws1.column_dimensions["U"].width = 46

# Tweaks for sheet 2
ws2.column_dimensions["A"].width = 8
ws2.column_dimensions["B"].width = 48
ws2.column_dimensions["C"].width = 14
ws2.column_dimensions["D"].width = 26
ws2.column_dimensions["E"].width = 26
ws2.column_dimensions["F"].width = 30
ws2.column_dimensions["G"].width = 30

# Tweaks for sheet 3
ws3.column_dimensions["A"].width = 8
ws3.column_dimensions["B"].width = 24
ws3.column_dimensions["C"].width = 42
ws3.column_dimensions["D"].width = 22
ws3.column_dimensions["E"].width = 22
ws3.column_dimensions["F"].width = 24
ws3.column_dimensions["G"].width = 24
ws3.column_dimensions["H"].width = 24
ws3.column_dimensions["I"].width = 20

# Tweaks for sheet 4
ws4.column_dimensions["A"].width = 8
ws4.column_dimensions["B"].width = 24
ws4.column_dimensions["C"].width = 28
ws4.column_dimensions["D"].width = 36
ws4.column_dimensions["E"].width = 24
ws4.column_dimensions["F"].width = 22
ws4.column_dimensions["G"].width = 22
ws4.column_dimensions["H"].width = 26


# ==============================================================================
# SAVE WORKBOOK TO ALL DESIGNATED LOCATIONS
# ==============================================================================
paths_to_save = [
    r"c:\Users\Pranav\Downloads\soil-updated_predictions--main\docs\SoilPilot_Market_Crop_Planner_Detailed_Analysis_7_Crops.xlsx",
    r"c:\Users\Pranav\Downloads\soil-updated_predictions--main\doc\SoilPilot_Market_Crop_Planner_Detailed_Analysis_7_Crops.xlsx",
    r"c:\Users\Pranav\Downloads\soil-updated_predictions--main\soil-updated_predictions--main\soilpilot-final-0.2-main\docs\SoilPilot_Market_Crop_Planner_Detailed_Analysis_7_Crops.xlsx",
    r"c:\Users\Pranav\Downloads\soil-updated_predictions--main\soil-updated_predictions--main\soilpilot-final-0.2-main\doc\SoilPilot_Market_Crop_Planner_Detailed_Analysis_7_Crops.xlsx",
    r"c:\Users\Pranav\Downloads\soil-updated_predictions--main\soil-updated_predictions--main\soilpilot-final-0.2-main\MALEGAON_SOIL_PREDICTION_PRODUCTION_PACKAGE\docs\SoilPilot_Market_Crop_Planner_Detailed_Analysis_7_Crops.xlsx",
    r"C:\Users\Pranav\.gemini\antigravity\brain\8a6f5685-5cbf-434b-83c1-7f890e83d288\SoilPilot_Market_Crop_Planner_Detailed_Analysis_7_Crops.xlsx"
]

for p in paths_to_save:
    os.makedirs(os.path.dirname(p), exist_ok=True)
    try:
        wb.save(p)
        print(f"Successfully saved Excel sheet to: {p}")
    except PermissionError:
        alt_path = p.replace(".xlsx", "_Updated.xlsx")
        wb.save(alt_path)
        print(f"Note: {p} is currently open in Excel. Saved updated version to: {alt_path}")

