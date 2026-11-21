# SoilPilot — Crop Planning Core Mathematical Formulas & Examples

This document serves as the authoritative mathematical and agronomic specification for the crop decision algorithms and economic models in the SoilPilot platform.

---

## 1. Core Formulas & Concrete Numerical Examples (In Exact Order)

### 1. Yield per Acre (Ton/ac)
* **Mathematical Formula:**
  $$\text{Yield per Acre (Ton/ac)} = \text{Yield per Hectare (Ton/ha)} \times 0.404685642$$
* **Agronomic Definition:** Standard metric hectare yield benchmark converted to imperial acre units ($1\text{ hectare} = 2.47105\text{ acres}$, conversion factor $1 / 2.47105 = 0.404685642$).
* **Small Example (Rabi Onion):**
  * **Min Yield:** $18.0\text{ Ton/ha} \times 0.404685642 = \mathbf{7.28\text{ Ton/ac}}$ *(Cell `I16`)*
  * **Central Expected Yield:** $21.0\text{ Ton/ha} \times 0.404685642 = \mathbf{8.50\text{ Ton/ac}}$ *(Cell `J16`)*
  * **Optimal Bumper Yield:** $24.0\text{ Ton/ha} \times 0.404685642 = \mathbf{9.71\text{ Ton/ac}}$ *(Cell `K16`)*
* **Master Table Excel Formula:** `=ROUND(21.0*0.404685642, 2)` &rarr; Cell `J16` (**8.50 Ton/ac**)

---

### 2. Expected Selling Price (₹/Ton)
* **Mathematical Formula:**
  $$\text{Selling Price per Ton (₹/Ton)} = \text{APMC Mandi Rate (₹/Quintal)} \times 10$$
* **Definition:** Agricultural produce mandi spot rates quoted in ₹/Quintal ($1\text{ quintal} = 100\text{ kg}$) scaled to 1 Metric Tonne ($1,000\text{ kg} = 10\text{ quintals}$). For forward crop planning, an empirical ARIMA/Holt-Winters modal forecast for the harvest window month is applied.
* **Small Example (Rabi Onion):**
  $$\text{₹1,650 / quintal} \times 10 = \mathbf{₹16,500 \text{ / Ton}}$$
  *(Pune APMC Gultekdi spot auction range: ₹1,000 – ₹5,000 / quintal; Modal spot: ₹3,000 / quintal; Forward harvest forecast: ₹16,500 / Ton)*
* **Master Table Excel Formula:** `=L16*10` or Modal Forecast Value &rarr; Cell `N16` (**₹16,500**)

---

### 3. Operational Cultivation Cost (A2+FL)
* **Mathematical Formula:**
  $$\text{Cost per Acre } (A_2+FL) = \text{CACP Cost per Hectare } (A_2+FL) \times 0.404685642$$
* **Agronomic Definition:** Direct seasonal paid-out cash expenses (seeds, fertilizers, manure, pesticides, drip irrigation maintenance, diesel/power, hired human/bullock labor) plus imputed value of family labor.
* **Small Example (Rabi Onion):**
  $$\text{₹88,000 / ha} \times 0.404685642 = \mathbf{₹35,612 \text{ / acre}}$$
* **Master Table Excel Formula:** `=ROUND(88000*0.404685642, 0)` &rarr; Cell `O16` (**₹35,612**)

---

### 4. Comprehensive Total Cost (C2)
* **Mathematical Formula:**
  $$\text{Cost per Acre } (C_2) = \text{CACP Comprehensive Cost per Hectare } (C_2) \times 0.404685642$$
* **Agronomic Definition:** Comprehensive economic cost ($C_2 = A_2+FL + \text{Rental value of owned land} + \text{Interest on owned fixed capital assets} + \text{Depreciation on farm machinery and implements}$).
* **Small Example (Rabi Onion):**
  $$\text{₹1,32,000 / ha} \times 0.404685642 = \mathbf{₹53,419 \text{ / acre}}$$
  *(Itemized component sum: $₹8,494 + ₹4,861 + ₹10,951 + ₹6,090 + ₹6,090 + ₹9,722 + ₹7,265 = \mathbf{₹53,473}$)*
* **Master Table Excel Formula:** `=ROUND(132000*0.404685642, 0)` &rarr; Cell `P16` (**₹53,419**)

---

### 5. Estimated Gross Revenue per Acre
* **Mathematical Formula:**
  $$\text{Estimated Gross Revenue (₹/ac)} = \text{Expected Yield per Acre (Ton/ac)} \times \text{Expected Selling Price (₹/Ton)}$$
* **Small Example (Rabi Onion):**
  $$8.50\text{ Ton/ac} \times \text{₹16,500 / Ton} = \mathbf{₹1,40,250 \text{ / acre}}$$
* **Master Table Excel Formula:** `=J16*N16` &rarr; Cell `Q16` (**₹1,40,250**)

---

### 6. Estimated Net Return per Acre (A2+FL)
* **Mathematical Formula (Website Displayed):**
  $$\text{Expected Net Return} = (\text{Expected Yield} \times \text{Selling Price}) - \text{Cultivation Cost } (A_2+FL)$$
* **Marathi UI:**
  $$\text{संभाव्य निव्वळ नफा} = (\text{अपेक्षित उत्पादन} \times \text{अपेक्षित विक्री भाव}) - \text{लागवड खर्च } (A_2+FL)$$
* **Small Example (Rabi Onion):**
  $$\text{₹1,40,250 (Gross Revenue)} - \text{₹35,612 (Operational Cost)} = \mathbf{+₹1,04,638 \text{ / acre}}$$
* **Master Table Excel Formula:** `=Q16-O16` &rarr; Cell `R16` (**+₹1,04,638**)

---

### 7. Comprehensive Net Return per Acre (C2)
* **Mathematical Formula:**
  $$\text{Net Economic Return } (C_2) = \text{Estimated Gross Revenue} - \text{Comprehensive Total Cost } (C_2)$$
* **Small Example (Rabi Onion):**
  $$\text{₹1,40,250 (Gross Revenue)} - \text{₹53,419 (Comprehensive Cost)} = \mathbf{+₹86,831 \text{ / acre}}$$
* **Master Table Excel Formula:** `=Q16-P16` &rarr; Cell `S16` (**+₹86,831**)

---

### 8. Benefit-Cost Ratio (B:C Ratio)
* **Mathematical Formula:**
  $$\text{B:C Ratio} = \frac{\text{Estimated Gross Revenue per Acre}}{\text{Operational Cultivation Cost } (A_2+FL)}$$
* **Interpretation:** Indicates the gross rupee return generated per single rupee of seasonal operational cash outlay. A ratio $> 1.0$ is profitable; $> 2.0$ represents a high-return commercial enterprise.
* **Small Example (Rabi Onion):**
  $$\frac{\text{₹1,40,250}}{\text{₹35,612}} = \mathbf{3.94}$$
  *(Returns ₹3.94 for every ₹1.00 operational cash spent)*
* **Master Table Excel Formula:** `=Q16/O16` &rarr; Cell `T16` (**3.94**)

---

## 2. Master Comparison Across All 7 Decision Crops

| Sr. | Crop Name | Marathi | Central Yield (Ton/ac) | Forecast Price (₹/Ton) | Operational Cost ($A_2+FL$) | Comprehensive Cost ($C_2$) | Gross Revenue / ac | Net Return ($A_2+FL$) | B:C Ratio |
| :-: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | **Rabi Onion** | कांदा | 8.50 | ₹16,500 | ₹35,612 | ₹53,419 | ₹1,40,250 | **+₹1,04,638** | **3.94** |
| 2 | **Tomato** | टोमॅटो | 13.76 | ₹14,500 | ₹38,445 | ₹57,465 | ₹1,99,520 | **+₹1,61,075** | **5.19** |
| 3 | **Rabi Maize** | मका | 2.10 | ₹21,500 | ₹12,950 | ₹19,830 | ₹45,150 | **+₹32,200** | **3.49** |
| 4 | **Sugarcane** | ऊस | 40.47 | ₹3,400 | ₹47,753 | ₹73,248 | ₹1,37,598 | **+₹89,845** | **2.88** |
| 5 | **Pomegranate**| डाळिंब | 4.86 | ₹85,000 | ₹58,679 | ₹91,054 | ₹4,13,100 | **+₹3,54,421** | **7.04** |
| 6 | **Banana** | केळी | 26.30 | ₹14,000 | ₹54,633 | ₹87,008 | ₹3,68,200 | **+₹3,13,567** | **6.74** |
| 7 | **Soybean** | सोयाबीन | 0.71 | ₹46,500 | ₹11,331 | ₹17,401 | ₹33,015 | **+₹21,684** | **2.91** |

---

## 3. Itemized Onion Cost Breakdown from Certified Data Card

Reconciliation with SoilPilot interface data card (`media_1795244942634_bb4aff81.jpg`):

| # | Activity / Cost Component | Share (%) | Operational Amount ($A_2+FL$) | Comprehensive Amount ($C_2$) | Scope of Activity |
| :-: | :--- | :---: | :---: | :---: | :--- |
| 1 | Nursery Raising, Seed Cost & Raised Beds | 15.9% | ₹5,662 | ₹8,494 | Certified seed + nursery bed preparation |
| 2 | Land Preparation & Field Layout | 9.1% | ₹3,241 | ₹4,861 | Deep ploughing, rotavator, BBF layout |
| 3 | Fertilizers, FYM & Micronutrient Complex | 20.5% | ₹7,300 | ₹10,951 | Basal FYM + 12:32:16 + Zinc/Boron/Sulphur |
| 4 | Drip Irrigation Maintenance & Fertigation Turns | 11.4% | ₹4,060 | ₹6,090 | Lateral flushes, filter cleaning & water turns |
| 5 | Thrips & Purple Blotch Pest Management | 11.4% | ₹4,060 | ₹6,090 | Yellow sticky traps, spinosad/fungicide sprays |
| 6 | Transplanting & Manual Weeding Operations | 18.2% | ₹6,481 | ₹9,722 | 2 hand weeding rounds + seedling planting |
| 7 | Harvesting, Curing, Grading & Mandi Transport | 13.6% | ₹4,843 | ₹7,265 | Manual uprooting, field curing & gunny bag logistics |
| | **TOTAL CULTIVATION COST PER ACRE** | **100.0%** | **₹35,612** | **₹53,473** | Reconciled $A_2+FL$ vs $C_2$ Benchmark |

* **Agronomic Advisory:** *"Confirm nursery seedling vigor (Bhima Kiran/Kiran) and assured water storage before field transplanting."*
