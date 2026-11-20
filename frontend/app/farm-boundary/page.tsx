"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { translateFarmerName } from "@/i18n/marathiHelper";
import { useAuth } from "@/context/AuthContext";
import { farmerService } from "@/services/farmerService";
import { cropSuitabilityService } from "@/services/cropSuitabilityService";
import {
  PenTool,
  MapPin,
  Search,
  Users,
  Compass,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

// Dynamic import to prevent SSR window/leaflet issues
const FarmPolygonDrawer = dynamic(
  () =>
    import("@/components/farmBoundary/FarmPolygonDrawer").then(
      (m) => m.FarmPolygonDrawer
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[580px] bg-surface-subtle flex flex-col items-center justify-center rounded-2xl border border-surface-border animate-pulse text-text-muted">
        <Compass className="w-8 h-8 animate-spin text-soil-primary mb-2" />
        <span className="text-sm font-semibold">Loading GIS Boundary Drawing Canvas...</span>
      </div>
    ),
  }
);

function FarmBoundaryContent() {
  const { language } = useI18n();
  const isMr = language === "mr";
  const searchParams = useSearchParams();
  const { field: authField } = useAuth();
  const urlFarmer = searchParams?.get("farmer") || "";

  // Resolve initial Gat number
  const resolveActiveGat = (): string => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("gat");
      if (q && q.trim()) return q.trim();
      const stored = localStorage.getItem("soilpilot_selected_gat");
      if (stored && stored.trim()) return stored.trim();
    }
    if (authField?.gat_no) return String(authField.gat_no).trim();
    return "41";
  };

  const [activeGat, setActiveGat] = useState<string>("41");
  const [gatInput, setGatInput] = useState<string>("41");

  // Gat data
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [farmers, setFarmers] = useState<Array<{ id: string | number; name: string }>>([]);
  const [loadingFarmers, setLoadingFarmers] = useState<boolean>(true);
  const [loadingMap, setLoadingMap] = useState<boolean>(true);

  // Synchronize initial Gat
  useEffect(() => {
    const initial = resolveActiveGat();
    setActiveGat(initial);
    setGatInput(initial);
  }, [authField?.gat_no, searchParams]);

  // Synchronize when Gat changes elsewhere
  useEffect(() => {
    const handleGatChanged = (e?: any) => {
      const custom = e?.detail;
      let newGat = "";
      if (custom) {
        newGat = String(custom).trim();
      } else if (typeof window !== "undefined") {
        newGat = (localStorage.getItem("soilpilot_selected_gat") || "").trim();
      }
      if (newGat && newGat !== activeGat) {
        setActiveGat(newGat);
        setGatInput(newGat);
      }
    };
    window.addEventListener("soilpilot_gat_changed", handleGatChanged);
    return () => window.removeEventListener("soilpilot_gat_changed", handleGatChanged);
  }, [activeGat]);

  // Load GeoJSON directly from local static file
  useEffect(() => {
    setLoadingMap(true);
    fetch("/data/malegaon_plots.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.features) setGeoJsonData(d);
      })
      .catch((err) => {
        console.warn("Could not load /data/malegaon_plots.geojson:", err);
      })
      .finally(() => setLoadingMap(false));
  }, []);

  // Load Co-Farmers for active Gat
  useEffect(() => {
    if (!activeGat) return;
    setLoadingFarmers(true);
    farmerService
      .getFarmersByGat(activeGat)
      .then((res) => {
        setFarmers(res.farmers || []);
      })
      .catch(() => setFarmers([]))
      .finally(() => setLoadingFarmers(false));
  }, [activeGat]);

  // Find active Gat Feature from GeoJSON
  const activeGatFeature = useMemo(() => {
    if (!geoJsonData?.features) return null;
    return (
      geoJsonData.features.find(
        (f: any) => String(f.properties?.gat_no).trim() === String(activeGat).trim()
      ) || null
    );
  }, [geoJsonData, activeGat]);

  const handleGatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = gatInput.trim().replace(/^gat\s*no\.?\s*/i, "").trim();
    if (!clean) return;
    setActiveGat(clean);
    if (typeof window !== "undefined") {
      localStorage.setItem("soilpilot_selected_gat", clean);
      window.dispatchEvent(new Event("soilpilot_gat_changed"));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-12">
      {/* 1. Page Header Banner */}
      <div className="bg-gradient-to-r from-soil-primary/10 via-soil-cream/40 to-surface-muted p-5 rounded-2xl border border-soil-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-soil-primary text-white text-[11px] font-bold">
              {isMr ? "शेतकरी उप-तुकडा रेखांकन" : "Farmer Sub-Parcel Demarcation"}
            </span>
            <span className="text-xs text-text-muted font-semibold">
              {isMr ? "माळेगाव खुर्द भूमापन सर्व्हे" : "Malegaon Khurd Cadastral Survey"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-main tracking-tight">
            {isMr ? "गटातील शेत सीमा रेखांकन" : "Draw Farm Polygon Inside Gat"}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted max-w-2xl">
            {isMr
              ? "एका गटामध्ये अनेक सह-हिस्सेदार शेतकरी असतात. प्रत्येक शेतकरी आपल्या स्वतःच्या शेतीचे क्षेत्र उपग्रह नकाशावर अचूकपणे आखून (एकर व गुंठ्यांमध्ये) स्वतंत्रपणे जतन करू शकतो."
              : "In Maharashtra cadastral surveys, multiple farmers co-share a single Gat. This tool lets each farmer demarcate and calculate their specific farm sub-parcel boundary on satellite imagery."}
          </p>
        </div>

        {/* Gat Selector Box */}
        <div className="bg-white p-3 rounded-xl border border-surface-border shadow-xs flex flex-col gap-1.5 shrink-0">
          <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
            {isMr ? "निवडलेला गट क्रमांक" : "Select Gat Number"}
          </span>
          <form onSubmit={handleGatSubmit} className="flex items-center gap-2">
            <div className="relative flex items-center">
              <MapPin className="w-3.5 h-3.5 text-soil-primary absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={gatInput}
                onChange={(e) => setGatInput(e.target.value)}
                placeholder="41, 22, 11..."
                className="w-28 pl-7 pr-2 py-1.5 text-xs font-bold text-text-main bg-surface-subtle border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-soil-primary/30"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-soil-primary text-white text-xs font-bold rounded-lg hover:bg-soil-primaryHover shadow-2xs cursor-pointer"
            >
              {isMr ? "बदला" : "Go"}
            </button>
          </form>
        </div>
      </div>

      {/* 2. Co-Owners in Active Gat Banner */}
      <div className="bg-white p-4 rounded-2xl border border-surface-border shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-soil-primary/10 text-soil-primary flex items-center justify-center font-bold shrink-0">
            <Users className="w-4 h-4 text-soil-primary" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-text-main flex items-center gap-2">
              <span>{isMr ? `गट क्र. ${activeGat} मधील नोंदणीकृत शेतकरी` : `Registered Co-Farmers in Gat ${activeGat}`}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                {farmers.length} {isMr ? "शेतकरी" : "Farmers"}
              </span>
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              {farmers.length > 0
                ? farmers.map((f) => translateFarmerName(f.name, isMr)).slice(0, 4).join(" • ") + (farmers.length > 4 ? ` + ${farmers.length - 4} ${isMr ? "इतर" : "more"}` : "")
                : isMr ? "शेतकऱ्यांची यादी उपलब्ध नाही" : "No co-farmer records for this Gat"}
            </div>
          </div>
        </div>

        {activeGatFeature && (
          <div className="text-right text-xs">
            <span className="text-text-muted block text-[10px] font-semibold uppercase">
              {isMr ? "गटाचे एकूण क्षेत्र" : "Total Gat Area"}
            </span>
            <span className="font-extrabold text-soil-primary text-sm">
              {activeGatFeature.properties?.area_ha} {isMr ? "हेक्टर" : "ha"} ({Math.round(Number(activeGatFeature.properties?.area_ha || 0) * 2.471 * 10) / 10} {isMr ? "एकर" : "Acres"})
            </span>
          </div>
        )}
      </div>

      {/* 3. The Interactive Drawing Canvas & Management Panel */}
      <FarmPolygonDrawer
        gatNo={activeGat}
        gatFeature={activeGatFeature}
        farmers={farmers}
        initialFarmerName={urlFarmer}
      />
    </div>
  );
}

export default function FarmBoundaryPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[500px] flex flex-col items-center justify-center p-12 text-center text-text-muted">
          <Compass className="w-8 h-8 animate-spin text-soil-primary mb-3" />
          <p className="text-sm font-semibold">Loading Farm Boundary Demarcation Module...</p>
        </div>
      }
    >
      <FarmBoundaryContent />
    </Suspense>
  );
}
