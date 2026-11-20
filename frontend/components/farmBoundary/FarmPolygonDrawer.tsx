"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";
import {
  farmSubplotService,
  FarmSubplot,
  calculatePolygonArea,
} from "@/services/farmSubplotService";
import { customBoundaryService } from "@/services/customBoundaryService";
import {
  PenTool,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Download,
  Layers,
  MapPin,
  Sparkles,
  Info,
  X,
  Maximize2,
  Crop,
  ArrowRight,
  Compass,
  FileBadge,
  TrendingUp,
  Map as MapIcon,
  Eye,
  EyeOff,
} from "lucide-react";

interface FarmPolygonDrawerProps {
  gatNo: string;
  gatFeature?: any;
  farmers?: Array<{ id: string | number; name: string }>;
  initialFarmerName?: string;
  className?: string;
  onSubplotSaved?: (subplot: FarmSubplot) => void;
}

const COLOR_PALETTE = [
  { name: "Emerald", hex: "#10b981" },
  { name: "Lime", hex: "#84cc16" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Sky Blue", hex: "#0284c7" },
  { name: "Purple", hex: "#8b5cf6" },
  { name: "Rose", hex: "#f43f5e" },
];

const CROPS_LIST = [
  { code: "sugarcane", name: "Sugarcane", nameMr: "ऊस" },
  { code: "soybean", name: "Soybean", nameMr: "सोयाबीन" },
  { code: "wheat", name: "Wheat", nameMr: "गहू" },
  { code: "gram", name: "Gram (Chana)", nameMr: "हरभरा" },
  { code: "cotton", name: "Cotton", nameMr: "कापूस" },
  { code: "onion", name: "Onion", nameMr: "कांदा" },
  { code: "maize", name: "Maize", nameMr: "मका" },
  { code: "pomegranate", name: "Pomegranate", nameMr: "डाळिंब" },
  { code: "other", name: "Other", nameMr: "इतर" },
];

export const FarmPolygonDrawer: React.FC<FarmPolygonDrawerProps> = ({
  gatNo,
  gatFeature: propGatFeature,
  farmers = [],
  initialFarmerName = "",
  className = "",
  onSubplotSaved,
}) => {
  const { language } = useI18n();
  const isMr = language === "mr";

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const gatLayerRef = useRef<any>(null);
  const subplotsLayerRef = useRef<any>(null);
  const drawingLayerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  // Gat feature (use prop or fetch directly for this specific Gat)
  const [internalGatFeature, setInternalGatFeature] = useState<any>(propGatFeature || null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const [savedSubplots, setSavedSubplots] = useState<FarmSubplot[]>([]);
  const [selectedPlot, setSelectedPlot] = useState<FarmSubplot | null>(null);

  // Option to show previous subplots (default false so user gets a 100% clean Gat canvas)
  const [showPreviousPlots, setShowPreviousPlots] = useState<boolean>(false);

  // Basemap ("satellite" = Esri HD + Google fallback, "google" = Google Hybrid, "street" = OSM)
  const [basemap, setBasemap] = useState<"satellite" | "google" | "street">("satellite");

  // Save Modal state
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [formFarmerName, setFormFarmerName] = useState<string>(initialFarmerName || "");
  const [formPlotName, setFormPlotName] = useState<string>("");
  const [formCrop, setFormCrop] = useState<string>("sugarcane");
  const [formIrrigation, setFormIrrigation] = useState<"drip" | "sprinkler" | "flood" | "well" | "rainfed">("drip");
  const [formColor, setFormColor] = useState<string>(COLOR_PALETTE[0].hex);
  const [formNotes, setFormNotes] = useState<string>("");

  // Last successfully saved boundary for post-save navigation card
  const [lastSavedPlot, setLastSavedPlot] = useState<FarmSubplot | null>(null);

  // Live draft area calculation
  const draftArea = useMemo(() => {
    return calculatePolygonArea(draftPoints);
  }, [draftPoints]);

  // Load Gat feature directly if not provided via props
  useEffect(() => {
    if (propGatFeature) {
      setInternalGatFeature(propGatFeature);
      return;
    }
    fetch("/data/malegaon_plots.geojson")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.features) {
          const match = data.features.find(
            (f: any) => String(f.properties?.gat_no).trim() === String(gatNo).trim()
          );
          if (match) setInternalGatFeature(match);
        }
      })
      .catch((err) => console.warn("Could not load Gat feature:", err));
  }, [propGatFeature, gatNo]);

  // Load subplots from service
  const loadSubplots = useCallback(() => {
    const list = farmSubplotService.getSubplotsByGat(gatNo);
    setSavedSubplots(list);
  }, [gatNo]);

  useEffect(() => {
    loadSubplots();
    const handleSubplotsChanged = (e: any) => {
      if (!e.detail || String(e.detail).trim() === String(gatNo).trim() || e.detail === "all") {
        loadSubplots();
      }
    };
    window.addEventListener("soilpilot_subplots_changed", handleSubplotsChanged);
    return () => window.removeEventListener("soilpilot_subplots_changed", handleSubplotsChanged);
  }, [gatNo, loadSubplots]);

  // Initialize form farmer name
  useEffect(() => {
    if (initialFarmerName) {
      setFormFarmerName(initialFarmerName);
    } else if (farmers.length > 0 && !formFarmerName) {
      setFormFarmerName(farmers[0].name);
    }
  }, [initialFarmerName, farmers, formFarmerName]);

  // 1. Initialize Leaflet Map (Runs ONCE on mount)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isSubscribed = true;

    import("leaflet").then((L) => {
      if (!isSubscribed || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [18.1504, 74.5046],
          zoom: 17,
          zoomControl: false,
          attributionControl: false,
        });

        // Add Zoom Control top right
        L.control.zoom({ position: "topright" }).addTo(map);

        // Google Satellite Hybrid as primary basemap (Crisp, high-res field details, no CORS block)
        const satelliteLayer = L.tileLayer(
          "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
          {
            maxZoom: 22,
            subdomains: ["mt0", "mt1", "mt2", "mt3"],
            attribution: "Google Satellite",
          }
        ).addTo(map);

        tileLayerRef.current = satelliteLayer;

        // Dedicated layer groups (ONLY selected Gat, Subplots, and Draft Drawing)
        gatLayerRef.current = L.featureGroup().addTo(map);
        subplotsLayerRef.current = L.featureGroup().addTo(map);
        drawingLayerRef.current = L.featureGroup().addTo(map);

        mapInstanceRef.current = map;

        // Multi-stage invalidateSize to ensure tiles render immediately across all screen sizes
        setTimeout(() => map.invalidateSize(), 50);
        setTimeout(() => map.invalidateSize(), 150);
        setTimeout(() => map.invalidateSize(), 300);
        setTimeout(() => map.invalidateSize(), 600);
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, []);

  // 1b. ResizeObserver to keep tiles crisp during layout changes
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // 1c. Map Click Handler for Drawing
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: any) => {
      if (!isDrawing) return;
      const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
      setDraftPoints((prev) => [...prev, newPoint]);
    };

    map.off("click");
    if (isDrawing) {
      map.on("click", handleMapClick);
      map.invalidateSize();
    }
    return () => {
      map.off("click", handleMapClick);
    };
  }, [isDrawing]);

  // 2. Basemap Switcher (Google Hybrid, Google Pure Satellite, OSM Street)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;
      if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);

      let url = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
      let attr = "Google Satellite Hybrid";
      let maxZoom = 22;

      if (basemap === "satellite") {
        url = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
        attr = "Google Satellite Hybrid";
        maxZoom = 22;
      } else if (basemap === "google") {
        url = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
        attr = "Google Satellite";
        maxZoom = 22;
      } else if (basemap === "street") {
        url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
        attr = "OpenStreetMap";
        maxZoom = 19;
      }

      const newTile = L.tileLayer(url, {
        maxZoom,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        attribution: attr,
      }).addTo(map);

      tileLayerRef.current = newTile;
      if (newTile.bringToBack) newTile.bringToBack();
      setTimeout(() => map.invalidateSize(), 50);
    });
  }, [basemap]);

  // 3. Render ONLY the Selected Gat Outer Boundary (NO OTHER GATS!)
  useEffect(() => {
    if (!mapInstanceRef.current || !gatLayerRef.current || !internalGatFeature) return;
    import("leaflet").then((L) => {
      const layerGroup = gatLayerRef.current;
      layerGroup.clearLayers();

      const geoLayer = L.geoJSON(internalGatFeature, {
        style: {
          color: "#00e676", // Vibrant neon green dashed boundary
          weight: 3.5,
          dashArray: "6, 6",
          fillColor: "#00e676",
          fillOpacity: 0.03, // Translucent so satellite field details remain crystal clear
        },
        onEachFeature: (f: any, l: any) => {
          l.bindTooltip(
            `<div style="font-weight: 800; font-size: 12px; color: #166534; padding: 2px 4px;">${isMr ? `गट क्र. ${gatNo} बाह्य सीमा (हद्द)` : `Gat ${gatNo} Boundary`}</div>`,
            { sticky: true, direction: "top" }
          );
        },
      }).addTo(layerGroup);

      // Zoom closely into the selected Gat boundary (matching Image 4)
      const bounds = geoLayer.getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, {
          padding: [35, 35],
          maxZoom: 18,
          animate: true,
        });
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 150);
      }
    });
  }, [internalGatFeature, gatNo]);

  // 4. Render Saved Subplots (ONLY if showPreviousPlots is true and not currently drawing)
  useEffect(() => {
    if (!mapInstanceRef.current || !subplotsLayerRef.current) return;
    import("leaflet").then((L) => {
      const layerGroup = subplotsLayerRef.current;
      layerGroup.clearLayers();

      // If user is currently drawing or opted to hide previous subplots, keep canvas clean
      if (!showPreviousPlots || isDrawing) return;

      savedSubplots.forEach((p) => {
        if (!p.coordinates || p.coordinates.length < 3) return;

        const poly = L.polygon(p.coordinates, {
          color: p.color,
          weight: 2.5,
          fillColor: p.color,
          fillOpacity: 0.35,
        }).addTo(layerGroup);

        const tooltipContent = `
          <div style="font-family: inherit; font-size: 12px; line-height: 1.35; min-width: 150px; padding: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 5px;">
              <strong style="color: #0f172a; font-size: 13px;">${p.plot_name}</strong>
              <span style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: ${p.color}; color: white; font-weight: 800;">
                ${p.area_acres} Ac
              </span>
            </div>
            <div style="font-size: 11px; color: #334155; margin-bottom: 3px;">
              <strong>${isMr ? "शेतकरी:" : "Farmer:"}</strong> ${p.farmer_name}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 3px;">
              <strong>${isMr ? "क्षेत्र:" : "Area:"}</strong> ${p.area_gunthas} ${isMr ? "गुंठे" : "Gunthas"} (${p.area_ha} ha)
            </div>
            ${p.crop_name ? `
            <div style="font-size: 11px; color: #166534; font-weight: 600;">
              🌾 ${p.crop_name} ${p.irrigation_type ? `(${p.irrigation_type})` : ""}
            </div>` : ""}
          </div>
        `;

        poly.bindTooltip(tooltipContent, { sticky: true, direction: "top", opacity: 0.98 });

        poly.on("click", (e: any) => {
          L.DomEvent.stopPropagation(e);
          setSelectedPlot(p);
        });
      });
    });
  }, [savedSubplots, showPreviousPlots, isDrawing, isMr]);

  // 5. Render Live Draft Points & Polygon during Drawing
  useEffect(() => {
    if (!mapInstanceRef.current || !drawingLayerRef.current) return;
    import("leaflet").then((L) => {
      const layerGroup = drawingLayerRef.current;
      layerGroup.clearLayers();

      if (!isDrawing || draftPoints.length === 0) return;

      // Draw vertex markers
      draftPoints.forEach((pt, idx) => {
        const marker = L.circleMarker(pt, {
          radius: idx === 0 ? 8 : 6,
          color: idx === 0 ? "#16a34a" : "#ffffff",
          weight: 2,
          fillColor: idx === 0 ? "#22c55e" : formColor,
          fillOpacity: 1,
        }).addTo(layerGroup);

        marker.bindTooltip(idx === 0 ? (isMr ? "प्रारंभ बिंदू" : "Start Point") : `P${idx + 1}`, {
          permanent: false,
          direction: "top",
        });
      });

      // Draw connecting line or closed polygon
      if (draftPoints.length >= 2) {
        L.polyline(draftPoints, {
          color: formColor,
          weight: 2.5,
          dashArray: "5, 5",
        }).addTo(layerGroup);
      }

      if (draftPoints.length >= 3) {
        L.polygon(draftPoints, {
          color: formColor,
          weight: 3,
          fillColor: formColor,
          fillOpacity: 0.35,
        }).addTo(layerGroup);
      }
    });
  }, [isDrawing, draftPoints, formColor, isMr]);

  // Control handlers
  const handleStartDrawing = () => {
    setIsDrawing(true);
    setDraftPoints([]);
    setSelectedPlot(null);
    setShowPreviousPlots(false); // Hide old subplots during drawing for clean satellite canvas
    const map = mapInstanceRef.current;
    if (map && gatLayerRef.current && gatLayerRef.current.getBounds().isValid()) {
      map.invalidateSize();
      map.fitBounds(gatLayerRef.current.getBounds(), {
        padding: [25, 25],
        maxZoom: 18,
        animate: true,
      });
    }
  };

  const handleFocusGat = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.invalidateSize();
    if (gatLayerRef.current && gatLayerRef.current.getBounds().isValid()) {
      map.fitBounds(gatLayerRef.current.getBounds(), {
        padding: [25, 25],
        maxZoom: 18,
        animate: true,
      });
    }
  };

  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setDraftPoints([]);
    handleFocusGat();
  };

  const handleUndoPoint = () => {
    setDraftPoints((prev) => prev.slice(0, -1));
  };

  const handleOpenSaveModal = () => {
    if (draftPoints.length < 3) return;
    if (!formPlotName) {
      setFormPlotName(`${isMr ? "शेत तुकडा" : "Farm Plot"} ${savedSubplots.length + 1}`);
    }
    setShowSaveModal(true);
  };

  const handleSaveSubplot = (e: React.FormEvent) => {
    e.preventDefault();
    if (draftPoints.length < 3) return;

    const selectedCropObj = CROPS_LIST.find((c) => c.code === formCrop);
    const cropDisplay = selectedCropObj ? (isMr ? selectedCropObj.nameMr : selectedCropObj.name) : formCrop;

    // Clear any previous subplots for this Gat so old test plots do not accumulate or overlap
    farmSubplotService.clearSubplotsByGat(gatNo);

    const newPlot = farmSubplotService.saveSubplot({
      gat_no: gatNo,
      farmer_name: formFarmerName.trim() || (isMr ? "शेतकरी" : "Farmer"),
      plot_name: formPlotName.trim() || `${isMr ? "शेत तुकडा" : "Farm Plot"} 1`,
      crop_name: cropDisplay,
      irrigation_type: formIrrigation,
      color: formColor,
      coordinates: draftPoints,
      notes: formNotes.trim(),
    });

    // Sync to session customBoundaryService for active analysis across all pages (Soil Map, Crop, Reports)
    try {
      customBoundaryService.saveCustomBoundary(gatNo, draftPoints, {
        plot_name: formPlotName.trim() || `Gat ${gatNo} Farm Parcel`,
        farmer_name: formFarmerName.trim() || "Farmer",
        crop_name: cropDisplay,
      });
    } catch (e) {
      console.warn("Could not sync custom boundary session:", e);
    }

    setIsDrawing(false);
    setDraftPoints([]);
    setShowSaveModal(false);
    setSelectedPlot(newPlot);
    setLastSavedPlot(newPlot);
    loadSubplots();

    if (onSubplotSaved) onSubplotSaved(newPlot);
  };

  const handleDeleteSubplot = (id: string) => {
    farmSubplotService.deleteSubplot(id);
    customBoundaryService.clearCustomBoundary(gatNo);
    if (selectedPlot?.id === id) setSelectedPlot(null);
    if (lastSavedPlot?.id === id) setLastSavedPlot(null);
    loadSubplots();
  };

  const handleClearAllPrevious = () => {
    farmSubplotService.clearSubplotsByGat(gatNo);
    customBoundaryService.clearCustomBoundary(gatNo);
    setSelectedPlot(null);
    setLastSavedPlot(null);
    loadSubplots();
  };

  const handleExportGeoJSON = () => {
    const jsonStr = farmSubplotService.exportToGeoJSON(gatNo);
    farmSubplotService.downloadFile(
      jsonStr,
      `soilpilot_gat_${gatNo}_farmer_subplots.geojson`,
      "application/geo+json"
    );
  };

  const handleExportKML = () => {
    const kmlStr = farmSubplotService.exportToKML(gatNo);
    farmSubplotService.downloadFile(
      kmlStr,
      `soilpilot_gat_${gatNo}_farmer_subplots.kml`,
      "application/vnd.google-earth.kml+xml"
    );
  };

  const totalClaimedAcres = useMemo(() => {
    const sum = savedSubplots.reduce((acc, p) => acc + (p.area_acres || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [savedSubplots]);

  const totalClaimedGunthas = useMemo(() => {
    const sum = savedSubplots.reduce((acc, p) => acc + (p.area_gunthas || 0), 0);
    return Math.round(sum * 10) / 10;
  }, [savedSubplots]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Interactive Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-surface-border shadow-subtle flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mode Title and Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-soil-primary/10 text-soil-primary flex items-center justify-center font-bold shrink-0">
            <PenTool className="w-5 h-5 text-soil-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-text-main">
                {isMr ? `गट क्र. ${gatNo} मध्ये शेत सीमा आखा` : `Demarcate Farm Sub-Parcel inside Gat ${gatNo}`}
              </h2>
              {isDrawing && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{isMr ? "रेखांकन सुरू आहे..." : "Drawing Active..."}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted">
              {isMr
                ? "उपग्रह नकाशावर आपल्या शेताच्या बांधांवर क्लिक करून स्वतःची शेत जमीन अचूकपणे आखा."
                : "Trace your exact farm boundary corners directly on high-resolution satellite imagery."}
            </p>
          </div>
        </div>

        {/* Right: Primary Drawing Actions & Clean Canvas Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!isDrawing ? (
            <>
              <button
                type="button"
                onClick={handleStartDrawing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-soil-primary text-white text-xs font-bold rounded-xl shadow-xs hover:bg-soil-primaryHover transition-all cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{isMr ? "शेत सीमा आखणे सुरू करा" : "Draw New Farm Plot"}</span>
              </button>

              {savedSubplots.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllPrevious}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold rounded-xl border border-red-200 transition-all cursor-pointer"
                  title={isMr ? "मागील सर्व आखण्या पुसा" : "Clear all previous subplots"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isMr ? "मागील पुसा" : "Clear Previous"}</span>
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndoPoint}
                disabled={draftPoints.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-subtle text-text-main text-xs font-bold rounded-xl border border-surface-border hover:bg-surface-muted transition-all disabled:opacity-40 cursor-pointer"
                title={isMr ? "शेवटचा बिंदू मागे घ्या" : "Undo last point"}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isMr ? "मागे घ्या" : "Undo"}</span>
              </button>

              <button
                type="button"
                onClick={handleCancelDrawing}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 hover:bg-red-100 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isMr ? "रद्द करा" : "Cancel"}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenSaveModal}
                disabled={draftPoints.length < 3}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isMr ? "सीमा पूर्ण करा व जतन करा" : "Complete & Save"}</span>
              </button>
            </div>
          )}

          {/* Export Buttons */}
          {savedSubplots.length > 0 && !isDrawing && (
            <div className="flex items-center gap-1.5 border-l border-surface-border pl-2 ml-1">
              <button
                type="button"
                onClick={handleExportGeoJSON}
                className="inline-flex items-center gap-1 px-2.5 py-2 bg-white text-text-main text-xs font-semibold rounded-xl border border-surface-border hover:bg-surface-subtle transition-all shadow-2xs"
                title="Export GeoJSON"
              >
                <Download className="w-3 h-3 text-soil-primary" />
                <span className="hidden sm:inline">GeoJSON</span>
              </button>
              <button
                type="button"
                onClick={handleExportKML}
                className="inline-flex items-center gap-1 px-2.5 py-2 bg-white text-text-main text-xs font-semibold rounded-xl border border-surface-border hover:bg-surface-subtle transition-all shadow-2xs"
                title="Export KML (Google Earth)"
              >
                <Download className="w-3 h-3 text-soil-primary" />
                <span className="hidden sm:inline">KML</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post-Save Navigation Banner: Direct Links to All Predictions & Records */}
      {lastSavedPlot && !isDrawing && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-2 border-emerald-300 shadow-sm animate-in fade-in duration-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2.5">
            <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>
                {isMr
                  ? `आपले शेत "${lastSavedPlot.plot_name}" (${lastSavedPlot.area_acres} एकर) यशस्वीरित्या जतन केले!`
                  : `Your farm parcel "${lastSavedPlot.plot_name}" (${lastSavedPlot.area_acres} Acres) successfully saved!`}
              </span>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
              {lastSavedPlot.farmer_name}
            </span>
          </div>

          <p className="text-xs text-emerald-950 font-medium">
            {isMr
              ? "या आखलेल्या शेतानुसार खालील सर्व अहवाल व शिफारशी तयार झाल्या आहेत. पाहण्यासाठी क्लिक करा:"
              : "All records, predictions, and recommendations are now customized for your demarcated farm:"}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <Link
              href="/soil-map"
              className="p-2.5 rounded-xl bg-white border border-emerald-300 hover:border-emerald-500 hover:shadow-xs transition-all flex items-center gap-2 group cursor-pointer"
            >
              <MapIcon className="w-4 h-4 text-emerald-700 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="text-[11px] font-extrabold text-text-main group-hover:text-emerald-700">
                  {isMr ? "माती नकाशा" : "Soil Map"}
                </div>
                <div className="text-[10px] text-text-muted">{isMr ? "घटक स्तर पहा" : "View DSM Layers"}</div>
              </div>
            </Link>

            <Link
              href="/field-suitability"
              className="p-2.5 rounded-xl bg-white border border-emerald-300 hover:border-emerald-500 hover:shadow-xs transition-all flex items-center gap-2 group cursor-pointer"
            >
              <Compass className="w-4 h-4 text-emerald-700 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="text-[11px] font-extrabold text-text-main group-hover:text-emerald-700">
                  {isMr ? "पीक उपयुक्तता" : "Crop Suitability"}
                </div>
                <div className="text-[10px] text-text-muted">{isMr ? "पिकांची यादी" : "AI Crop Scores"}</div>
              </div>
            </Link>

            <Link
              href="/market-intelligence"
              className="p-2.5 rounded-xl bg-white border border-emerald-300 hover:border-emerald-500 hover:shadow-xs transition-all flex items-center gap-2 group cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-emerald-700 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="text-[11px] font-extrabold text-text-main group-hover:text-emerald-700">
                  {isMr ? "बाजार भाव व नफा" : "Market & Profit"}
                </div>
                <div className="text-[10px] text-text-muted">{isMr ? "नफा व खर्च अंदाज" : "Yield Forecasts"}</div>
              </div>
            </Link>

            <Link
              href="/soil-health-card"
              className="p-2.5 rounded-xl bg-white border border-emerald-300 hover:border-emerald-500 hover:shadow-xs transition-all flex items-center gap-2 group cursor-pointer"
            >
              <FileBadge className="w-4 h-4 text-emerald-700 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="text-[11px] font-extrabold text-text-main group-hover:text-emerald-700">
                  {isMr ? "चाचणी अहवाल" : "Soil Health Card"}
                </div>
                <div className="text-[10px] text-text-muted">{isMr ? "खत शिफारशी" : "Official Card"}</div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout: Map (Left) + Subplots Roster (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: Leaflet Map Container (8 Columns) */}
        <div className="lg:col-span-8 relative rounded-2xl overflow-hidden border border-surface-border shadow-subtle h-[600px] bg-slate-100">
          <div
            ref={mapContainerRef}
            style={{ width: "100%", height: "100%", minHeight: "600px" }}
            className={`w-full h-full min-h-[600px] z-0 ${isDrawing ? "cursor-crosshair" : "cursor-grab"}`}
          />

          {/* TOP RIGHT: High-Definition Basemap Switcher & Extent Button */}
          <div className="absolute top-4 right-14 z-10 flex flex-wrap items-center gap-2">
            <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-subtle border border-surface-border/90 flex items-center gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={handleFocusGat}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-soil-primary hover:bg-soil-primary/10 transition-all cursor-pointer font-bold"
                title={isMr ? `गट ${gatNo} झूम करा` : `Focus Gat ${gatNo}`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{isMr ? `गट ${gatNo} झूम` : `Focus Gat ${gatNo}`}</span>
              </button>
            </div>

            <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-subtle border border-surface-border/90 flex items-center text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBasemap("satellite")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  basemap === "satellite" ? "bg-soil-primary text-white shadow-xs font-bold" : "text-text-muted hover:text-text-main"
                }`}
                title="Google Satellite Hybrid with crisp field bunds and roads"
              >
                🛰️ {isMr ? "उपग्रह" : "Satellite"}
              </button>
              <button
                type="button"
                onClick={() => setBasemap("google")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  basemap === "google" ? "bg-soil-primary text-white shadow-xs font-bold" : "text-text-muted hover:text-text-main"
                }`}
                title="Pure Satellite Imagery"
              >
                🌿 {isMr ? "शेत दृश्य" : "Pure Satellite"}
              </button>
              <button
                type="button"
                onClick={() => setBasemap("street")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  basemap === "street" ? "bg-soil-primary text-white shadow-xs font-bold" : "text-text-muted hover:text-text-main"
                }`}
              >
                🗺️ {isMr ? "रस्ता" : "Street"}
              </button>
            </div>
          </div>

          {/* TOP LEFT: Active Gat Boundary Indicator (SHOW ONLY SELECTED GAT) */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-subtle border border-surface-border/90 flex items-center gap-2 text-xs font-bold text-text-main pointer-events-none">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00e676] border border-emerald-400" />
              <span>
                {isMr ? `गट क्र. ${gatNo} बाह्य सीमा (हद्द)` : `Gat ${gatNo} Outer Perimeter`}
              </span>
            </div>

            {savedSubplots.length > 0 && !isDrawing && (
              <button
                type="button"
                onClick={handleClearAllPrevious}
                className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-subtle border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-all flex items-center gap-1.5 cursor-pointer"
                title={isMr ? "मागील सर्व सीमा पुसून स्वच्छ करा" : "Clear previous boundaries"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isMr ? "मागील स्केच पुसा" : "Clear Previous"}</span>
              </button>
            )}
          </div>

          {/* BOTTOM LEFT: Live Drawing HUD (Points & Real-time Area) */}
          {isDrawing && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-card border border-surface-border/90 max-w-md animate-in fade-in duration-150 space-y-2">
              <div className="flex items-center justify-between gap-4 border-b border-surface-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-extrabold text-text-main">
                    {draftPoints.length === 0
                      ? isMr ? "नकाशावर क्लिक करून प्रारंभ बिंदू निवडा" : "Click on map to place 1st corner"
                      : isMr ? `${draftPoints.length} बिंदू निश्चित केले` : `${draftPoints.length} Corners Placed`}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-text-muted">
                  {draftPoints.length < 3 ? (isMr ? "किमान ३ बिंदू आवश्यक" : "Min 3 points") : (isMr ? "तयार आहे" : "Ready")}
                </span>
              </div>

              {/* Real-time Surveyor Area Display */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-surface-subtle border border-surface-border">
                  <div className="text-[10px] uppercase font-bold text-text-muted">
                    {isMr ? "एकर" : "Acres"}
                  </div>
                  <div className="text-base font-black text-soil-primary">
                    {draftArea.acres}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-surface-subtle border border-surface-border">
                  <div className="text-[10px] uppercase font-bold text-text-muted">
                    {isMr ? "गुंठे" : "Gunthas"}
                  </div>
                  <div className="text-base font-black text-emerald-700">
                    {draftArea.gunthas}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-surface-subtle border border-surface-border">
                  <div className="text-[10px] uppercase font-bold text-text-muted">
                    {isMr ? "हेक्टर" : "Hectares"}
                  </div>
                  <div className="text-base font-black text-slate-800">
                    {draftArea.hectares}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-text-muted text-center pt-0.5">
                {isMr
                  ? "आपल्या शेताच्या बांधांवर क्लिक करा. पूर्ण झाल्यावर 'सीमा पूर्ण करा' वर क्लिक करा."
                  : "Click field bund corners around your farm. Click 'Complete & Save' when finished."}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Saved Subplots Roster & Co-Farmers (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Gat Demarcation Overview Card */}
          <div className="bg-white p-4 rounded-2xl border border-surface-border shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {isMr ? "गट जमीन विभाजन सारांश" : "Gat Partition Overview"}
              </span>
              <span className="text-xs font-black text-soil-primary">
                Gat {gatNo}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-surface-subtle border border-surface-border">
                <div className="text-[10px] text-text-muted font-bold">
                  {isMr ? "रेखांकित शेतकरी" : "Demarcated Plots"}
                </div>
                <div className="text-lg font-black text-text-main mt-0.5">
                  {savedSubplots.length} {isMr ? "तुकडे" : "plots"}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-subtle border border-surface-border">
                <div className="text-[10px] text-text-muted font-bold">
                  {isMr ? "एकूण क्षेत्र" : "Total Claimed Area"}
                </div>
                <div className="text-lg font-black text-soil-primary mt-0.5">
                  {totalClaimedAcres} {isMr ? "एकर" : "Ac"}
                </div>
                <div className="text-[10px] text-text-muted font-medium">
                  ({totalClaimedGunthas} {isMr ? "गुंठे" : "Gunthas"})
                </div>
              </div>
            </div>

            {/* Subplots on Map Visibility Toggle */}
            {savedSubplots.length > 0 && (
              <div className="pt-1 flex items-center justify-between border-t border-surface-border/60">
                <span className="text-xs font-semibold text-text-muted">
                  {isMr ? "नकाशावर मागील तुकडे दाखवा:" : "Show plots on map:"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPreviousPlots((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    showPreviousPlots
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-surface-subtle text-text-muted border-surface-border hover:bg-slate-100"
                  }`}
                >
                  {showPreviousPlots ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{showPreviousPlots ? (isMr ? "दाखवा (चालू)" : "Shown") : (isMr ? "लपवा (स्वच्छ)" : "Hidden (Clean)")}</span>
                </button>
              </div>
            )}
          </div>

          {/* List of Demarcated Sub-Plots */}
          <div className="bg-white p-4 rounded-2xl border border-surface-border shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {isMr ? `गट ${gatNo} मधील शेत तुकडे (${savedSubplots.length})` : `Demarcated Plots in Gat ${gatNo} (${savedSubplots.length})`}
              </h3>
              {savedSubplots.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllPrevious}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                >
                  {isMr ? "सर्व पुसा" : "Clear all"}
                </button>
              )}
            </div>

            {savedSubplots.length === 0 ? (
              <div className="p-8 text-center text-text-muted border border-dashed border-surface-border rounded-xl space-y-2">
                <Crop className="w-8 h-8 mx-auto text-soil-primary/40" />
                <p className="text-xs font-semibold">
                  {isMr ? "अद्याप कोणतीही शेत सीमा आखली नाही." : "No farm sub-plots drawn yet for this Gat."}
                </p>
                <p className="text-[11px] text-text-muted">
                  {isMr
                    ? "वरील 'शेत सीमा आखणे सुरू करा' बटणावर क्लिक करून उपग्रह नकाशावर आपले शेत चिन्हांकित करा."
                    : "Click 'Draw New Farm Plot' above to trace your farm boundary on the satellite map."}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {savedSubplots.map((plot) => {
                  const isSelected = selectedPlot?.id === plot.id;
                  return (
                    <div
                      key={plot.id}
                      onClick={() => setSelectedPlot(plot)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-soil-primary/10 border-soil-primary ring-1 ring-soil-primary/30"
                          : "bg-surface-subtle border-surface-border hover:bg-surface-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs border border-white"
                            style={{ backgroundColor: plot.color }}
                          />
                          <span className="font-bold text-xs text-text-main truncate max-w-[170px]">
                            {plot.plot_name}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSubplot(plot.id);
                          }}
                          className="p-1 text-text-muted hover:text-red-600 rounded-md transition-colors"
                          title={isMr ? "काढून टाका" : "Delete plot"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-text-muted">
                        <span className="truncate max-w-[150px]">
                          👤 {plot.farmer_name}
                        </span>
                        <span className="font-bold text-soil-primary">
                          {plot.area_acres} Ac ({plot.area_gunthas} G)
                        </span>
                      </div>

                      {plot.crop_name && (
                        <div className="mt-1 text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                          <span>🌾 {plot.crop_name}</span>
                          {plot.irrigation_type && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                              {plot.irrigation_type}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Modal Drawer */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-surface-border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-text-main">
                  {isMr ? "आपल्या शेताची माहिती जतन करा" : "Save Farm Sub-Plot Details"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="text-text-muted hover:text-text-main p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Area Highlights */}
            <div className="p-3 bg-surface-subtle rounded-xl border border-surface-border grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-text-muted font-bold block">
                  {isMr ? "एकूण एकर" : "Total Acres"}
                </span>
                <span className="text-base font-extrabold text-soil-primary">
                  {draftArea.acres} {isMr ? "एकर" : "Ac"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted font-bold block">
                  {isMr ? "एकूण गुंठे" : "Gunthas"}
                </span>
                <span className="text-base font-extrabold text-emerald-700">
                  {draftArea.gunthas} {isMr ? "गुंठे" : "Gunthas"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted font-bold block">
                  {isMr ? "हेक्टर" : "Hectares"}
                </span>
                <span className="text-base font-extrabold text-slate-800">
                  {draftArea.hectares} ha
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveSubplot} className="space-y-3.5 text-xs">
              {/* Farmer Name Selection */}
              <div>
                <label className="font-bold text-text-main block mb-1">
                  {isMr ? "शेतकऱ्याचे नाव (सह-हिस्सेदार):" : "Farmer / Co-Sharer Name:"}
                </label>
                {farmers.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={formFarmerName}
                      onChange={(e) => setFormFarmerName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-surface-border bg-white font-semibold text-text-main focus:outline-none focus:ring-2 focus:ring-soil-primary/30"
                    >
                      {farmers.map((f) => (
                        <option key={f.id} value={f.name}>
                          {f.name}
                        </option>
                      ))}
                      <option value="custom">{isMr ? "-- इतर नाव प्रविष्ट करा --" : "-- Enter custom name --"}</option>
                    </select>

                    {formFarmerName === "custom" && (
                      <input
                        type="text"
                        placeholder={isMr ? "शेतकऱ्याचे पूर्ण नाव लिहा" : "Enter farmer's full name"}
                        onChange={(e) => setFormFarmerName(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-surface-border bg-white text-xs font-semibold"
                        required
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={formFarmerName}
                    onChange={(e) => setFormFarmerName(e.target.value)}
                    placeholder={isMr ? "उदा. प्रदिप भाऊसो शेलार" : "e.g. Pradip Bhauso Shelar"}
                    className="w-full p-2.5 rounded-xl border border-surface-border bg-white text-xs font-semibold"
                    required
                  />
                )}
              </div>

              {/* Plot Label */}
              <div>
                <label className="font-bold text-text-main block mb-1">
                  {isMr ? "शेताचे / तुकड्याचे नाव (Plot Label):" : "Sub-Plot Label / Name:"}
                </label>
                <input
                  type="text"
                  value={formPlotName}
                  onChange={(e) => setFormPlotName(e.target.value)}
                  placeholder={isMr ? "उदा. विहिरीकडील ऊस शेत" : "e.g. Well-side Sugarcane Field"}
                  className="w-full p-2.5 rounded-xl border border-surface-border bg-white text-xs font-semibold"
                  required
                />
              </div>

              {/* Crop & Irrigation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-text-main block mb-1">
                    {isMr ? "सध्याचे / नियोजित पीक:" : "Current / Planned Crop:"}
                  </label>
                  <select
                    value={formCrop}
                    onChange={(e) => setFormCrop(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-surface-border bg-white font-semibold text-text-main"
                  >
                    {CROPS_LIST.map((c) => (
                      <option key={c.code} value={c.code}>
                        {isMr ? c.nameMr : c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-text-main block mb-1">
                    {isMr ? "सिंचन प्रकार:" : "Irrigation Method:"}
                  </label>
                  <select
                    value={formIrrigation}
                    onChange={(e) => setFormIrrigation(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-surface-border bg-white font-semibold text-text-main"
                  >
                    <option value="drip">{isMr ? "ठिबक सिंचन" : "Drip"}</option>
                    <option value="sprinkler">{isMr ? "तुषार सिंचन" : "Sprinkler"}</option>
                    <option value="well">{isMr ? "विहीर / बोअरवेल" : "Well / Borewell"}</option>
                    <option value="flood">{isMr ? "पाटपाणी (कॅनॉल)" : "Canal / Flood"}</option>
                    <option value="rainfed">{isMr ? "जिरायती (पावसावर)" : "Rainfed"}</option>
                  </select>
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="font-bold text-text-main block mb-1.5">
                  {isMr ? "नकाशावरील रंग निवडा:" : "Choose Map Boundary Color:"}
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setFormColor(c.hex)}
                      className={`w-7 h-7 rounded-full transition-all cursor-pointer ${
                        formColor === c.hex
                          ? "ring-3 ring-soil-primary ring-offset-2 scale-110 shadow-sm"
                          : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-bold text-text-main block mb-1">
                  {isMr ? "नोंदी (पर्यायी):" : "Notes (Optional):"}
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={isMr ? "उदा. भावासोबत सामाईक विहीर" : "e.g. Shared well with brother"}
                  className="w-full p-2.5 rounded-xl border border-surface-border bg-white text-xs"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 rounded-xl border border-surface-border text-text-muted hover:bg-surface-subtle font-semibold cursor-pointer"
                >
                  {isMr ? "रद्द करा" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-soil-primary text-white font-bold hover:bg-soil-primaryHover shadow-xs cursor-pointer"
                >
                  {isMr ? "शेत सीमा जतन करा" : "Save Farm Sub-Plot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
