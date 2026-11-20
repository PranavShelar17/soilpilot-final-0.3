"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/context/AuthContext";
import {
  cropSuitabilityService,
  CropItem,
  CropAllGatsResponse,
  GatSuitabilityResponse,
} from "@/services/cropSuitabilityService";
import {
  Sprout,
  Download,
  RefreshCw,
  Compass,
  ChevronRight,
  Search,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { customBoundaryService } from "@/services/customBoundaryService";
import { translateCropTolerance, translateParamName } from "@/i18n/marathiHelper";

// Dynamically import Leaflet Map to avoid SSR window errors with automatic chunk error recovery
const CropSuitabilityMap = dynamic(
  () =>
    import("@/components/map/CropSuitabilityMap")
      .then((m) => m.CropSuitabilityMap)
      .catch((err) => {
        console.warn("Chunk load error detected for CropSuitabilityMap, recovering...", err);
        if (typeof window !== "undefined") {
          window.location.reload();
        }
        throw err;
      }),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[520px] bg-surface-subtle flex flex-col items-center justify-center rounded-2xl border border-surface-border animate-pulse text-text-muted">
        <Compass className="w-8 h-8 animate-spin text-soil-primary mb-2" />
        <span className="text-sm font-semibold">Loading GIS Suitability Map...</span>
      </div>
    ),
  }
);

class MapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn("MapErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[520px] bg-surface-subtle flex flex-col items-center justify-center rounded-2xl border border-surface-border p-6 text-center space-y-3">
          <Compass className="w-8 h-8 text-soil-primary mb-1 animate-pulse" />
          <span className="text-sm font-bold text-text-main">
            GIS Map Module Reloading...
          </span>
          <p className="text-xs text-text-muted max-w-sm">
            Visualization bundle updated. Click below to refresh the map view.
          </p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            className="px-4 py-2 bg-soil-primary text-white text-xs font-bold rounded-lg shadow-sm hover:bg-soil-primary/90 transition-colors"
          >
            Refresh Map
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ALLOWED_CROP_CODES = new Set(["sugarcane", "onion", "pomegranate", "soybean", "tomato", "maize", "banana"]);

const DEFAULT_CROPS: CropItem[] = [
  { crop_code: "sugarcane", crop_name: "Sugarcane", crop_name_mr: "ऊस", tolerance: "Highly Tolerant (medium to heavy soil)", category: "CASH_CROP", parameters_count: 11 },
  { crop_code: "pomegranate", crop_name: "Pomegranate", crop_name_mr: "डाळिंब", tolerance: "Sensitive to poor internal drainage", category: "HORTICULTURE", parameters_count: 11 },
  { crop_code: "soybean", crop_name: "Soybean", crop_name_mr: "सोयाबीन", tolerance: "Sensitive to compaction", category: "OILSEED", parameters_count: 11 },
  { crop_code: "maize", crop_name: "Maize", crop_name_mr: "मका", tolerance: "Sensitive to prolonged water stagnation", category: "CEREAL", parameters_count: 11 },
  { crop_code: "tomato", crop_name: "Tomato", crop_name_mr: "टोमॅटो", tolerance: "Sensitive to salinity and poor aeration", category: "VEGETABLE", parameters_count: 11 },
  { crop_code: "onion", crop_name: "Rabi Onion", crop_name_mr: "कांदा", tolerance: "Moderately Sensitive to waterlogging", category: "VEGETABLE", parameters_count: 11 },
  { crop_code: "banana", crop_name: "Banana", crop_name_mr: "केळी", tolerance: "Heavy nutrient feeder, high water need", category: "HORTICULTURE", parameters_count: 11 },
];

function FieldSuitabilityContent() {
  const { language } = useI18n();
  const searchParams = useSearchParams();
  const { field: authField, farmer: authFarmer, isAuthenticated } = useAuth();

  // Resolve active Gat locus: query param -> localStorage -> auth field -> default 37
  const resolveActiveGat = (): string => {
    if (typeof window !== "undefined") {
      const queryGat = new URLSearchParams(window.location.search).get("gat");
      if (queryGat && queryGat.trim()) return queryGat.trim();
      const stored = localStorage.getItem("soilpilot_selected_gat");
      if (stored && stored.trim()) return stored.trim();
    }
    if (authField?.gat_no) return String(authField.gat_no).trim();
    return "37";
  };

  // State
  const [crops, setCrops] = useState<CropItem[]>(DEFAULT_CROPS);
  const [selectedCropCode, setSelectedCropCode] = useState<string>("pomegranate");
  const urlGatParam = searchParams?.get("gat")?.trim() || "";
  const [selectedGatNo, setSelectedGatNo] = useState<string>(urlGatParam || "37");
  const [gatInput, setGatInput] = useState<string>(urlGatParam || "37");
  const [customBoundary, setCustomBoundary] = useState<any>(null);
  const irrigationAvailable = true;

  // Sync custom boundary for active Gat
  useEffect(() => {
    setCustomBoundary(customBoundaryService.getCustomBoundary(selectedGatNo));
    const handleBoundaryUpdated = () => {
      setCustomBoundary(customBoundaryService.getCustomBoundary(selectedGatNo));
    };
    window.addEventListener("soilpilot_farm_boundary_updated", handleBoundaryUpdated);
    return () => window.removeEventListener("soilpilot_farm_boundary_updated", handleBoundaryUpdated);
  }, [selectedGatNo]);

  // Initial and auth-change sync
  useEffect(() => {
    const targetGat = resolveActiveGat();
    setSelectedGatNo(targetGat);
    setGatInput(targetGat);
  }, [authField?.gat_no, searchParams]);

  // Synchronize when Gat is changed anywhere across the platform
  useEffect(() => {
    const handleGatChanged = (e?: any) => {
      const customDetail = e?.detail;
      let newGat = "";
      if (customDetail) {
        newGat = String(customDetail).trim();
      } else if (typeof window !== "undefined") {
        newGat = (localStorage.getItem("soilpilot_selected_gat") || "").trim();
      }
      if (newGat) {
        setSelectedGatNo(newGat);
        setGatInput(newGat);
      }
    };
    window.addEventListener("soilpilot_gat_changed", handleGatChanged);
    return () => window.removeEventListener("soilpilot_gat_changed", handleGatChanged);
  }, []);

  const handleSelectGat = (gat: string | null) => {
    if (!gat) return;
    const clean = String(gat).trim().replace(/^gat\s*no\.?\s*/i, "").trim();
    if (!clean) return;
    setSelectedGatNo(clean);
    setGatInput(clean);
    if (typeof window !== "undefined") {
      localStorage.setItem("soilpilot_selected_gat", clean);
      window.dispatchEvent(new Event("soilpilot_gat_changed"));
    }
  };

  const handleGatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gatInput.trim()) {
      handleSelectGat(gatInput);
    }
  };

  // Data states
  const [cropSummary, setCropSummary] = useState<CropAllGatsResponse | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [gatDetail, setGatDetail] = useState<GatSuitabilityResponse | null>(null);

  // UI state
  const [loadingMap, setLoadingMap] = useState<boolean>(true);
  const [loadingGat, setLoadingGat] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"criteria" | "comparison">("criteria");
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // 1. Initial Load: Crops list (Strictly 7 crops)
  useEffect(() => {
    cropSuitabilityService
      .getCrops()
      .then((cList) => {
        const filtered = (cList || []).filter((c) => ALLOWED_CROP_CODES.has(c.crop_code.toLowerCase()));
        const finalList = filtered.length > 0 ? filtered : DEFAULT_CROPS;
        setCrops(finalList);
        if (finalList.length > 0 && (!selectedCropCode || !finalList.some(c => c.crop_code === selectedCropCode))) {
          setSelectedCropCode(finalList[0].crop_code);
        }
      })
      .catch((err) => console.error("Error fetching crops:", err));
  }, []);

  // 2. Load Crop Data & GeoJSON when selected crop or irrigation changes
  useEffect(() => {
    if (!selectedCropCode) return;
    let isCurrent = true;
    setLoadingMap(true);

    Promise.all([
      cropSuitabilityService.getCropAllGats(selectedCropCode, irrigationAvailable),
      cropSuitabilityService.getCropGeoJSON(selectedCropCode, irrigationAvailable),
    ])
      .then(([summary, geojson]) => {
        if (isCurrent) {
          setCropSummary(summary);
          setGeoJsonData(geojson);
        }
      })
      .catch((err) => console.error("Error loading crop data:", err))
      .finally(() => {
        if (isCurrent) setLoadingMap(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedCropCode, irrigationAvailable]);

  // 3. Load Gat Suitability Details for logged-in Gat
  useEffect(() => {
    if (!selectedGatNo) {
      setGatDetail(null);
      return;
    }
    let isCurrent = true;
    setLoadingGat(true);
    cropSuitabilityService
      .getGatSuitability(selectedGatNo, irrigationAvailable)
      .then((data) => {
        if (isCurrent) setGatDetail(data);
      })
      .catch(() => {
        if (isCurrent) setGatDetail(null);
      })
      .finally(() => {
        if (isCurrent) setLoadingGat(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedGatNo, irrigationAvailable]);

  // Active Crop Object
  const activeCrop = useMemo(() => {
    return crops.find((c) => c.crop_code === selectedCropCode);
  }, [crops, selectedCropCode]);

  // Active Gat Evaluation for selected crop
  const activeGatEvaluation = useMemo(() => {
    if (!gatDetail) return null;
    return gatDetail.evaluations.find((e) => e.crop_code === selectedCropCode) || null;
  }, [gatDetail, selectedCropCode]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await cropSuitabilityService.refreshCache();
      const [summary, geojson] = await Promise.all([
        cropSuitabilityService.getCropAllGats(selectedCropCode, irrigationAvailable),
        cropSuitabilityService.getCropGeoJSON(selectedCropCode, irrigationAvailable),
      ]);
      setCropSummary(summary);
      setGeoJsonData(geojson);
      if (selectedGatNo) {
        const gd = await cropSuitabilityService.getGatSuitability(selectedGatNo, irrigationAvailable);
        setGatDetail(gd);
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-soil-primary/10 via-soil-cream/40 to-surface-muted p-5 rounded-2xl border border-soil-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-subtle">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-main tracking-tight">
            {language === "mr" ? "पीक उपयुक्तता" : "Crop Suitability"}
          </h1>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={cropSuitabilityService.getExportCsvUrl(selectedCropCode, selectedGatNo || undefined)}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-text-main border border-surface-border text-xs font-semibold hover:bg-surface-subtle transition-all shadow-xs"
            title={language === "mr" ? "CSV अहवाल डाउनलोड करा" : "Download CSV report"}
          >
            <Download className="w-3.5 h-3.5 text-soil-primary" />
            <span>{language === "mr" ? "CSV डाउनलोड" : "Export CSV"}</span>
          </a>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-soil-primary text-white text-xs font-semibold hover:bg-soil-primaryHover transition-all shadow-xs disabled:opacity-50"
            title={language === "mr" ? "पुन्हा गणना करा" : "Recalculate suitability results"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? (language === "mr" ? "अपडेट होत आहे..." : "Refreshing...") : (language === "mr" ? "पुन्हा मोजा" : "Recalculate")}</span>
          </button>
        </div>
      </div>

      {/* 2. Gat Locus & Crop Selector */}
      <div className="bg-white p-4 rounded-2xl border border-surface-border shadow-subtle space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-soil-primary/10 text-soil-primary flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                {language === "mr" ? "सध्याचा निवडलेला गट" : "Active Gat Locus"}
              </div>
              <div className="text-sm font-extrabold text-text-main flex flex-wrap items-center gap-1.5">
                <span>{language === "mr" ? `गट क्र. ${selectedGatNo}` : `Gat Number ${selectedGatNo}`}</span>
                <span className="text-[11px] font-semibold text-soil-primary bg-soil-primary/10 px-2 py-0.5 rounded-full">
                  {language === "mr" ? "माळेगाव खुर्द" : "Malegaon Kh."}
                </span>
                {customBoundary && (
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>
                      {language === "mr"
                        ? `शेत सीमा: ${customBoundary.area_acres} एकर (${customBoundary.area_gunthas} गुंठे)`
                        : `Demarcated Farm: ${customBoundary.area_acres} Ac (${customBoundary.area_gunthas} Gunthas)`}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Gat Input / Search Form */}
          <form onSubmit={handleGatSubmit} className="flex items-center gap-2">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={gatInput}
                onChange={(e) => setGatInput(e.target.value)}
                placeholder={language === "mr" ? "गट क्र. (उदा. 41)" : "Gat No. (e.g. 41)"}
                className="w-40 pl-8 pr-3 py-1.5 text-xs font-bold text-text-main bg-surface-subtle border border-surface-border rounded-xl focus:outline-none focus:ring-2 focus:ring-soil-primary/30 focus:border-soil-primary transition-all placeholder:font-normal placeholder:text-text-muted"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-soil-primary text-white text-xs font-bold rounded-xl hover:bg-soil-primaryHover transition-all shadow-xs shrink-0"
              title={language === "mr" ? "गटावर जा" : "Go to Gat"}
            >
              <span>{language === "mr" ? "शोधा" : "Go"}</span>
            </button>
          </form>
        </div>

        {/* Crop Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Sprout className="w-4 h-4 text-soil-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              {language === "mr" ? `गट ${selectedGatNo} साठी पीक निवडा:` : `Select Crop to Evaluate for Gat ${selectedGatNo}:`}
            </span>
          </div>

          {/* 7 Crop Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {crops.map((c) => {
              const isSelected = c.crop_code === selectedCropCode;
              return (
                <button
                  key={c.crop_code}
                  type="button"
                  onClick={() => setSelectedCropCode(c.crop_code)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all ${
                    isSelected
                      ? "bg-soil-primary text-white shadow-sm ring-2 ring-soil-primary/30"
                      : "bg-surface-subtle text-text-main hover:bg-surface-muted hover:border-surface-border border border-transparent"
                  }`}
                >
                  <span className="text-xs font-bold tracking-tight">
                    {language === "mr" ? c.crop_name_mr : c.crop_name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column GIS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: GIS Suitability Map focused on logged-in Gat (7 Columns) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="h-[580px]">
            <MapErrorBoundary>
              <CropSuitabilityMap
                geoJsonData={geoJsonData}
                selectedGatNo={selectedGatNo}
                onSelectGat={handleSelectGat}
                cropName={activeCrop?.crop_name || selectedCropCode}
                className="h-full"
              />
            </MapErrorBoundary>
          </div>
        </div>

        {/* RIGHT: Gat Details & Limiting Factors Drawer (5 Columns) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-surface-border shadow-subtle overflow-hidden">
          {/* Drawer Body */}
          {loadingGat ? (
            <div className="p-12 text-center text-text-muted flex flex-col items-center justify-center space-y-2">
              <Compass className="w-7 h-7 animate-spin text-soil-primary" />
              <span className="text-xs font-semibold">
                {language === "mr" ? "गटाचे घटक तपासत आहे..." : "Evaluating Gat parameters..."}
              </span>
            </div>
          ) : activeGatEvaluation ? (
            <div className="p-4 space-y-4">
              {/* Overall Suitability Badge & Score Card */}
              <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-bold text-text-muted">
                    {language === "mr" ? `${activeCrop?.crop_name_mr || activeGatEvaluation.crop_name} साठी उपयुक्तता` : `Suitability For ${activeGatEvaluation.crop_name}`}
                  </div>
                  <div className="text-lg font-black text-text-main mt-0.5 flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold text-white shadow-xs ${
                        activeGatEvaluation.final_suitability_class === "S1"
                          ? "bg-[#16a34a]"
                          : activeGatEvaluation.final_suitability_class === "S2"
                          ? "bg-[#eab308]"
                          : activeGatEvaluation.final_suitability_class === "S3"
                          ? "bg-[#f97316]"
                          : activeGatEvaluation.final_suitability_class === "N"
                          ? "bg-[#dc2626]"
                          : "bg-[#9ca3af]"
                      }`}
                    >
                      {activeGatEvaluation.final_suitability_class}
                    </span>
                    <span>
                      {language === "mr"
                        ? (activeGatEvaluation.class_title_mr || activeGatEvaluation.class_title)
                        : activeGatEvaluation.class_title}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    {translateCropTolerance(activeGatEvaluation.tolerance, language === "mr")}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">
                    {language === "mr" ? "उपयुक्तता गुण" : "Suitability Score"}
                  </div>
                  <div className="text-2xl font-black text-soil-primary">
                    {Number(activeGatEvaluation.suitability_score).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-text-muted font-medium">
                    {language === "mr" ? "निकषांनुसार गुणांकन" : "Weighted Criteria"}
                  </div>
                </div>
              </div>


              {/* Sub-Tabs: Criteria Breakdown, 10-Crop Comparison */}
              <div className="border-b border-surface-border flex gap-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("criteria")}
                  className={`pb-2 border-b-2 transition-all ${
                    activeTab === "criteria"
                      ? "border-soil-primary text-soil-primary font-bold"
                      : "border-transparent text-text-muted hover:text-text-main"
                  }`}
                >
                  {language === "mr" ? `तपासलेले निकष (${activeGatEvaluation.evaluated_criteria.length})` : `Evaluated Criteria (${activeGatEvaluation.evaluated_criteria.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("comparison")}
                  className={`pb-2 border-b-2 transition-all ${
                    activeTab === "comparison"
                      ? "border-soil-primary text-soil-primary font-bold"
                      : "border-transparent text-text-muted hover:text-text-main"
                  }`}
                >
                  {language === "mr" ? "७ पिकांची तुलना" : "7 Crops Comparison"}
                </button>
              </div>

              {/* TAB 1: Criteria Breakdown */}
              {activeTab === "criteria" && (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {activeGatEvaluation.evaluated_criteria.map((crit) => {
                    const sClass = crit.suitability_class;
                    return (
                      <div
                        key={crit.parameter_key}
                        className="p-2.5 rounded-xl border border-surface-border bg-surface-subtle/50 hover:bg-surface-subtle transition-all flex items-center justify-between text-xs gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-text-main flex items-center gap-1.5">
                            <span>{translateParamName(crit.parameter_name, language === "mr")}</span>
                            <span className="text-[10px] text-text-muted font-normal">
                              ({crit.weight}%)
                            </span>
                          </div>
                          <div className="text-[11px] text-text-muted">
                            {language === "mr" ? "नोंदवलेले मूल्य:" : "Observed:"}{" "}
                            <strong className="text-text-main">
                              {crit.value !== null ? `${crit.value} ${crit.unit}` : (language === "mr" ? "नोंद उपलब्ध नाही" : "Not Recorded")}
                            </strong>{" "}
                            • <span className="text-[10px] italic">{crit.source}</span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold shrink-0 ${
                            sClass === "S1"
                              ? "bg-green-100 text-green-800 border border-green-300"
                              : sClass === "S2"
                              ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                              : sClass === "S3"
                              ? "bg-orange-100 text-orange-800 border border-orange-300"
                              : sClass === "N"
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : "bg-gray-100 text-gray-700 border border-gray-300"
                          }`}
                        >
                          {sClass}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: 7 Crops Comparison Matrix */}
              {activeTab === "comparison" && gatDetail && (
                <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                  <div className="text-[11px] text-text-muted mb-2 font-medium">
                    {language === "mr"
                      ? `गट क्र. ${selectedGatNo} साठी सर्व ७ पिकांची तुलनात्मक उपयुक्तता:`
                      : `Comparative suitability across all 7 supported crops for Gat ${selectedGatNo}:`}
                  </div>
                  {gatDetail.evaluations
                    .filter((ev) => ALLOWED_CROP_CODES.has(ev.crop_code.toLowerCase()))
                    .map((ev) => (
                    <div
                      key={ev.crop_code}
                      onClick={() => setSelectedCropCode(ev.crop_code)}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        ev.crop_code === selectedCropCode
                          ? "bg-soil-primary/10 border-soil-primary/40 ring-1 ring-soil-primary/20"
                          : "bg-surface-subtle border-surface-border hover:bg-surface-muted"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-text-main">
                          {language === "mr" ? ev.crop_name_mr : ev.crop_name}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {language === "mr"
                            ? `गुण: ${Number(ev.suitability_score).toFixed(1)}% • ${ev.limiting_factors.length} मर्यादा घटक`
                            : `Score: ${Number(ev.suitability_score).toFixed(1)}% • ${ev.limiting_factors.length} limiting factor(s)`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-black text-white shadow-xs ${
                            ev.final_suitability_class === "S1"
                              ? "bg-[#16a34a]"
                              : ev.final_suitability_class === "S2"
                              ? "bg-[#eab308]"
                              : ev.final_suitability_class === "S3"
                              ? "bg-[#f97316]"
                              : ev.final_suitability_class === "N"
                              ? "bg-[#dc2626]"
                              : "bg-[#9ca3af]"
                          }`}
                        >
                          {ev.final_suitability_class}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-text-muted">
              <Compass className="w-8 h-8 mx-auto text-soil-primary/40 mb-2" />
              <p className="text-xs">
                {language === "mr" ? "या गटासाठी उपयुक्तता माहिती उपलब्ध नाही." : "No evaluation available for this Gat."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FieldSuitabilityPage() {
  return (
    <React.Suspense
      fallback={
        <div className="w-full min-h-[500px] flex flex-col items-center justify-center p-12 text-center text-text-muted">
          <Compass className="w-8 h-8 animate-spin text-soil-primary mb-3" />
          <p className="text-sm font-semibold">Loading Field Crop Suitability Dashboard...</p>
        </div>
      }
    >
      <FieldSuitabilityContent />
    </React.Suspense>
  );
}
