# Malegaon Khurd Digital Soil Mapping – Master Deliverables Package

**Village**: Malegaon Khurd, Baramati Tehsil, Pune District, Maharashtra  
**Project Area**: 216 Cadastral Gats (~1,125 Hectares)  
**Spatial Resolution**: 15-meter Continuous Grid (49,998 Grid Nodes)  
**Validation Standard**: Strict Nested Leave-One-Gat-Out (LOGO) Spatial Cross-Validation  
**Generated On**: November 15, 2026  

---

## Directory Structure & Contents

### `01_Model_Evaluation_and_Rankings/`
Contains all benchmark results across 36 algorithms and 11 soil properties (396 out-of-fold evaluations):
- `final_selected_model_registry.csv`: Winning models, algorithms, LOGO RMSE, MAE, R², relative error, and selection rationale.
- `complete_method_benchmark.csv`: Full performance table for all 396 model runs.
- `target_wise_model_ranking.csv`: Algorithms ranked 1 to 36 for each soil property.
- `best_interpolation_methods.csv`: IDW (p=1,2,3), RBF, Nearest, Trend Surface comparison.
- `best_geostatistical_methods.csv`: Ordinary, Universal, and Simple Kriging comparison.
- `best_ml_methods.csv`: RF, ExtraTrees, XGBoost, HistGradientBoosting, CatBoost, Cubist, SVR, KNN, GPR, Quantile RF comparison.
- `best_hybrid_methods.csv`: Machine Learning + Residual Kriging audits.
- `ensemble_comparison.csv`: Stacking Super Learner (NNLS), Inverse-RMSE, and Equal-Weighted blending.
- `feature_importance_ablation.csv`: Full features vs. Spectral-only vs. Terrain-only performance.
- `compositional_texture_evaluation.csv`: Additive Log-Ratio (ALR) 100% texture mass conservation audit.
- `fold_wise_oof_predictions.csv`: Out-of-fold predictions on unseen Gats.
- `raster_export_summary.csv`: Summary statistics (min, mean, max, uncertainty) of all 15m GeoTIFF rasters.

### `02_Cleaned_Datasets_and_Audits/`
Certified clean, leakage-free datasets and audit documentation:
- `cleaned_master_dataset.csv`: Master dataset (120 observations with MAL 41 replicates preserved).
- `data_quality_audit.csv`: Verification of coordinates, units, missing values, and Gat numbers.
- `missing_values_report.csv`: Complete missingness profile.
- `duplicate_records_report.csv`: Investigation of duplicate IDs and verified field cores.
- `outlier_analysis_report.csv`: Distributional and statistical bounds checks.
- `data_leakage_audit.csv`: Audit confirming exclusion of SOM, Total Carbon, and target parameters.
- `feature_selection_report.csv`: Covariate relevance and variance inflation checks.
- `target_wise_clean_datasets/`: 11 target-specific CSVs (`dataset_pH.csv` to `dataset_Clay.csv`).

### `03_Final_15m_Continuous_Rasters_GeoTIFF/`
High-resolution 15-meter continuous Digital Soil Mapping surfaces:
- `utm32643/`: 11 Predicted soil properties (`*_predicted_15m.tif`) and 11 Kriging/GPR uncertainty surfaces (`*_uncertainty_15m.tif`) in UTM Zone 43N (`EPSG:32643`).
- `wgs84/`: 11 Reprojected GeoTIFF rasters (`*_predicted_wgs84.tif`) in WGS84 (`EPSG:4326`) for web mapping and QGIS/ArcGIS integration.

### `04_Parcel_Predictions_and_GIS/`
Cadastral parcel-level (Gat-wise) predictions:
- `malegaon_khurd_gat_soil_predictions.csv`: Detailed zonal predictions (Mean, Min, Max, Uncertainty) for all 216 Gats.
- `Malegaon_Khurd_Gat_Soil_Predictions.xlsx`: Formatted Excel workbook ready for agronomists and field extension officers.
- `gat_soil_predictions.kml`: Google Earth cadastral parcel overlay with click-to-inspect soil attributes.
- `farmer_point_predictions.csv`: Specific soil prediction at target farmer coordinates (Chandrakant Eknath Kale).

### `05_Interactive_Maps_and_WebGIS/`
Standalone Web GIS applications (open directly in any web browser):
- `malegaon_soil_raster_explorer.html`: Dual-mode interactive map featuring single property exploration, synchronized side-by-side comparison, Gat boundary inspection, and a persistent prediction reliability HUD.
- `malegaon_soil_map.html`: Interactive cadastral parcel leaflet map.

### `06_Executive_Reports_and_Documentation/`
Full scientific documentation:
- `ultimate_dsm_optimization_report.md`: Master markdown report of the 36-algorithm benchmark.
- `Malegaon_Khurd_DSM_Full_Report.pdf`: 35+ page publication-grade compiled PDF document with high-resolution figures.
- `Malegaon_Khurd_DSM_Full_Report.html`: Self-contained HTML report.
- `cleaning_decisions_report.md`: Transparent record of all data cleaning choices.
- `figures/`: High-resolution cartographic figures, actual vs. predicted validation plots, semi-variograms, and web map screenshots.
