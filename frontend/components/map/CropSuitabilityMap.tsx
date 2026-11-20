"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from "leaflet";
import { Plus, Minus, Crosshair, Layers, Globe, Maximize2, MapPin, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { translateCropName } from "@/i18n/marathiHelper";
import { customBoundaryService, CustomFarmBoundary } from "@/services/customBoundaryService";

export type BasemapType = "satellite" | "street" | "topo";

interface CropSuitabilityMapProps {
  geoJsonData: any;
  selectedGatNo: string | null;
  onSelectGat: (gatNo: string | null) => void;
  cropName: string;
  className?: string;
  initialViewMode?: "all" | "focus";
}

const CLASS_COLORS: Record<string, { fill: string; border: string; label: string; labelMr: string }> = {
  S1: { fill: "#16a34a", border: "#15803d", label: "Highly Suitable", labelMr: "उच्च अनुकूल" },
  S2: { fill: "#eab308", border: "#ca8a04", label: "Moderately Suitable", labelMr: "मध्यम अनुकूल" },
  S3: { fill: "#f97316", border: "#ea580c", label: "Marginally Suitable", labelMr: "किमान अनुकूल" },
  N: { fill: "#dc2626", border: "#b91c1c", label: "Not Suitable", labelMr: "अनुकूल नाही" },
  UNCERTAIN: { fill: "#9ca3af", border: "#6b7280", label: "Uncertain / Missing", labelMr: "अपूर्ण माहिती" },
};

/**
 * FAO-compliant continuous color gradient strictly aligned with suitability classes:
 * - N  (Not Suitable):        0%  to <40% -> Red (#dc2626) to Orange-Red (#ea580c)
 * - S3 (Marginally Suitable): 40% to <60% -> Orange (#f97316) to Amber-Orange (#f59e0b)
 * - S2 (Moderately Suitable): 60% to <80% -> PURE YELLOW / GOLDEN AMBER (#eab308 to #facc15) - NEVER GREEN!
 * - S1 (Highly Suitable):     80% to 100% -> Vibrant Green (#16a34a) to Deep Emerald Green (#15803d)
 */
export function getContinuousSuitabilityColor(score: number | null | undefined): { fill: string; border: string } {
  if (score == null || isNaN(score)) {
    return { fill: "#9ca3af", border: "#6b7280" };
  }
  const s = Math.max(0, Math.min(100, score));

  // FAO-standard continuous stops strictly keeping S2 in the Yellow/Amber spectrum
  const stops: [number, [number, number, number]][] = [
    [0, [220, 38, 38]],       // 0%   #dc2626 (Red - Not Suitable: N)
    [39.9, [234, 88, 12]],    // 39.9% #ea580c (Orange-Red)
    [40, [249, 115, 22]],     // 40%  #f97316 (Orange - Marginally Suitable: S3)
    [59.9, [245, 158, 11]],   // 59.9% #f59e0b (Amber Orange)
    [60, [234, 179, 8]],      // 60%  #eab308 (Pure Yellow - Moderately Suitable: S2)
    [79.9, [250, 204, 21]],   // 79.9% #facc15 (Bright Warm Gold/Yellow - S2 ceiling, strictly yellow!)
    [80, [22, 163, 74]],      // 80%  #16a34a (Vibrant Green - Highly Suitable: S1 begins)
    [100, [21, 128, 61]],     // 100% #15803d (Deep Emerald Green)
  ];

  let i = 0;
  while (i < stops.length - 1 && stops[i + 1][0] <= s) {
    i++;
  }
  const [s1, c1] = stops[i];
  const [s2, c2] = stops[Math.min(i + 1, stops.length - 1)];
  const t = s2 === s1 ? 0 : Math.max(0, Math.min(1, (s - s1) / (s2 - s1)));

  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);

  const br = Math.round(r * 0.8);
  const bg = Math.round(g * 0.8);
  const bb = Math.round(b * 0.8);

  return {
    fill: `rgb(${r}, ${g}, ${b})`,
    border: `rgb(${br}, ${bg}, ${bb})`,
  };
}

export const CropSuitabilityMap: React.FC<CropSuitabilityMapProps> = ({
  geoJsonData,
  selectedGatNo,
  onSelectGat,
  cropName,
  className = "",
  initialViewMode = "all",
}) => {
  const { language } = useI18n();
  const isMr = language === "mr";

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const geojsonLayerRef = useRef<LeafletGeoJSON | null>(null);
  const customFarmLayerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const lastFittedCropGatRef = useRef<string | null>(null);

  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [basemap, setBasemap] = useState<BasemapType>("satellite");
  const [viewMode, setViewMode] = useState<"all" | "focus">(initialViewMode);
  const [colorScaleMode, setColorScaleMode] = useState<"continuous" | "discrete">("continuous");
  const [customBoundary, setCustomBoundary] = useState<CustomFarmBoundary | null>(null);

  // Sync custom farm boundary
  useEffect(() => {
    setCustomBoundary(customBoundaryService.getCustomBoundary(selectedGatNo || undefined));

    const handleBoundaryUpdated = () => {
      setCustomBoundary(customBoundaryService.getCustomBoundary(selectedGatNo || undefined));
    };
    window.addEventListener("soilpilot_farm_boundary_updated", handleBoundaryUpdated);
    return () => window.removeEventListener("soilpilot_farm_boundary_updated", handleBoundaryUpdated);
  }, [selectedGatNo]);

  // Selected Gat exact score for legend pin marker
  const selectedScore = React.useMemo(() => {
    if (!selectedGatNo || !geoJsonData?.features) return null;
    const feat = geoJsonData.features.find(
      (f: any) => String(f?.properties?.gat_no || "").trim() === String(selectedGatNo).trim()
    );
    return feat?.properties?.suitability_score ?? null;
  }, [selectedGatNo, geoJsonData]);

  // 1. Initialize Leaflet map safely
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let map = mapInstanceRef.current;
    if (!map) {
      import("leaflet").then((L) => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        // Create Leaflet instance centered on Malegaon Khurd
        map = L.map(mapContainerRef.current, {
          center: [18.146, 74.512],
          zoom: 14,
          minZoom: 12,
          maxZoom: 21,
          zoomControl: false,
        });

        // Initial satellite tile layer (Google Satellite)
        const tile = L.tileLayer(
          "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
          {
            maxZoom: 21,
            subdomains: ["mt0", "mt1", "mt2", "mt3"],
            attribution: "&copy; Google Satellite",
          }
        ).addTo(map);

        tileLayerRef.current = tile;
        mapInstanceRef.current = map;
        setIsMapReady(true);

        // Force container geometry recalculation to eliminate gray tile clips
        setTimeout(() => {
          map?.invalidateSize();
        }, 200);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  // 2. Handle Basemap Switch
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady || typeof window === "undefined") return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }

      let url = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
      let attr = "&copy; Google Satellite";
      let subdomains: string[] | undefined = ["mt0", "mt1", "mt2", "mt3"];
      let maxZoom = 21;

      if (basemap === "street") {
        url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
        attr = "&copy; OpenStreetMap contributors";
        subdomains = ["a", "b", "c"];
        maxZoom = 19;
      } else if (basemap === "topo") {
        url = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
        attr = "&copy; OpenTopoMap";
        subdomains = ["a", "b", "c"];
        maxZoom = 17;
      }

      const newTile = L.tileLayer(url, { maxZoom, subdomains, attribution: attr }).addTo(map);
      tileLayerRef.current = newTile;

      if (geojsonLayerRef.current) {
        geojsonLayerRef.current.bringToFront();
      }
      if (customFarmLayerRef.current) {
        customFarmLayerRef.current.bringToFront();
      }
    });
  }, [basemap, isMapReady]);

  // 3. Render Thematic Crop Suitability GeoJSON Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !geoJsonData || !isMapReady || typeof window === "undefined") return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      if (geojsonLayerRef.current) {
        map.removeLayer(geojsonLayerRef.current);
        geojsonLayerRef.current = null;
      }
      if (customFarmLayerRef.current) {
        map.removeLayer(customFarmLayerRef.current);
        customFarmLayerRef.current = null;
      }

      // Render cadastral parcel layer: ONLY the selected / logged-in Gat gets suitability color fill
      const layer = L.geoJSON(geoJsonData, {
        style: (feature: any) => {
          const props = feature?.properties || {};
          const gatNo = String(props.gat_no || "").trim().replace(/^gat\s*no\.?\s*/i, "").trim();
          const cleanSelected = String(selectedGatNo || "").trim().replace(/^gat\s*no\.?\s*/i, "").trim();
          const sClass = props.suitability_class || "UNCERTAIN";
          const score = props.suitability_score;
          const colorCfg =
            colorScaleMode === "continuous"
              ? getContinuousSuitabilityColor(score)
              : CLASS_COLORS[sClass] || CLASS_COLORS.UNCERTAIN;
          const isSelected = Boolean(cleanSelected && cleanSelected === gatNo);

          // Selected / Logged-in Gat: Prominent highlight border (#00e676 vivid green) and suitability fill
          if (isSelected) {
            return {
              fill: true,
              fillColor: colorCfg.fill,
              fillOpacity: 0.88,
              color: "#00e676",
              weight: 4.2,
              dashArray: "",
            };
          }

          // All other Gats in the village: Transparent fill, clear satellite background with subtle parcel boundary
          return {
            fill: false,
            fillOpacity: 0,
            color: "rgba(255, 255, 255, 0.35)",
            weight: 1.0,
            dashArray: "3, 3",
          };
        },
        onEachFeature: (feature: any, featureLayer: any) => {
          const props = feature?.properties || {};
          const gatNo = String(props.gat_no || "").trim().replace(/^gat\s*no\.?\s*/i, "").trim();
          const cleanSelected = String(selectedGatNo || "").trim().replace(/^gat\s*no\.?\s*/i, "").trim();
          const isSelected = Boolean(cleanSelected && cleanSelected === gatNo);
          const sClass = props.suitability_class || "UNCERTAIN";
          const score = props.suitability_score;
          const area = props.area_ha ? `${props.area_ha} ${isMr ? "हेक्टर" : "ha"}` : "";
          const colorCfg =
            colorScaleMode === "continuous"
              ? getContinuousSuitabilityColor(score)
              : CLASS_COLORS[sClass] || CLASS_COLORS.UNCERTAIN;
          const classLabel = isMr ? (CLASS_COLORS[sClass]?.labelMr || sClass) : (CLASS_COLORS[sClass]?.label || sClass);

          const popupHtml = `
            <div style="font-family: inherit; font-size: 12px; line-height: 1.35; min-width: 165px; padding: 2px;">
              <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
                <strong style="color: #0f172a; font-size: 13px;">${isMr ? `गट क्र. ${gatNo}` : `Gat ${gatNo}`}</strong>
                <span style="font-size: 11px; color: #64748b; font-weight: 600;">${area}</span>
              </div>
              ${score != null ? `
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-size: 11px; color: #475569;">${isMr ? "अनुकूलता गुण:" : "Suitability Score:"}</span>
                <span style="padding: 2px 7px; border-radius: 4px; background: ${colorCfg.fill}; color: #ffffff; font-weight: 800; font-size: 11px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                  ${Math.round(score)}%
                </span>
              </div>
              ` : ""}
              <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #334155; margin-bottom: 4px;">
                <span style="display:inline-block; width:9px; height:9px; border-radius:2px; background:${CLASS_COLORS[sClass]?.fill || '#9ca3af'};"></span>
                <strong>${sClass}</strong> : <span>${classLabel}</span>
              </div>
              <div style="font-size: 10px; color: #16a34a; font-weight: 600; text-align: center; border-top: 1px dashed #e2e8f0; padding-top: 4px; margin-top: 4px;">
                ${isMr ? "तपशील पाहण्यासाठी क्लिक करा" : "Click to view Gat details"}
              </div>
            </div>
          `;

          // Tooltip on hover
          featureLayer.bindTooltip(popupHtml, { sticky: true, opacity: 0.98, direction: "top", offset: [0, -10] });
          featureLayer.bindPopup(popupHtml, { autoClose: false, closeOnClick: false, offset: [0, -10] });

          // Permanent centroid badge on selected Gat (identical to My Farm / Satellite preview)
          if (isSelected) {
            const badgeHtml = `
              <div style="background: rgba(15, 23, 42, 0.94); border: 2px solid #f59e0b; color: #ffffff; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 12px rgba(0,0,0,0.6); white-space: nowrap; pointer-events: none; text-shadow: 0 1px 2px rgba(0,0,0,0.9);">
                ${isMr ? `गट क्र. ${gatNo}` : `Gat No. ${gatNo}`}
              </div>
            `;
            featureLayer.bindTooltip(badgeHtml, {
              permanent: true,
              direction: "center",
              className: "gat-centroid-badge",
            });
            setTimeout(() => {
              try { featureLayer.bringToFront(); } catch (e) {}
            }, 60);
          }

          // Hover feedback: Only highlight boundary for non-selected Gats without filling them
          featureLayer.on("mouseover", () => {
            if (isSelected) {
              featureLayer.setStyle({
                weight: 4.8,
                color: "#ffffff",
                fill: true,
                fillColor: colorCfg.fill,
                fillOpacity: 0.95,
              });
            } else {
              featureLayer.setStyle({
                weight: 2,
                color: "#38bdf8",
                fill: false,
                fillOpacity: 0,
              });
            }
            featureLayer.bringToFront();
          });

          featureLayer.on("mouseout", () => {
            layer.resetStyle(featureLayer);
            if (customFarmLayerRef.current) {
              customFarmLayerRef.current.bringToFront();
            }
          });

          // Click handler to select Gat and view agronomic parameters
          featureLayer.on("click", (e: any) => {
            L.DomEvent.stopPropagation(e);
            onSelectGat(gatNo);
            if (featureLayer.openPopup) featureLayer.openPopup();
          });
        },
      }).addTo(map);

      geojsonLayerRef.current = layer;

      // Render farmer's demarcated sub-parcel if active for this Gat
      if (selectedGatNo && customBoundary) {
        const customPolygon = customBoundaryService.toGeoJSONPolygon(customBoundary);
        if (customPolygon) {
          const score = selectedScore;
          const matchedFeature = (geoJsonData?.features || []).find(
            (f: any) => String(f?.properties?.gat_no || "").trim() === String(selectedGatNo).trim()
          );
          const sClass =
            matchedFeature?.properties?.suitability_class ||
            (score != null && !isNaN(score)
              ? score >= 80 ? "S1" : score >= 60 ? "S2" : score >= 40 ? "S3" : "N"
              : "UNCERTAIN");

          const colorCfg =
            colorScaleMode === "continuous"
              ? getContinuousSuitabilityColor(score)
              : CLASS_COLORS[sClass] || CLASS_COLORS.S2;

          const customLayer = L.geoJSON(
            {
              type: "Feature",
              properties: {
                gat_no: selectedGatNo,
                is_custom: true,
                area_acres: customBoundary.area_acres,
                area_gunthas: customBoundary.area_gunthas,
              },
              geometry: customPolygon,
            } as any,
            {
              style: () => ({
                fillColor: colorCfg.fill,
                fillOpacity: 0.94,
                color: "#00e676",
                weight: 3.5,
              }),
              onEachFeature: (_: any, fl: any) => {
                const popupContent = `
                  <div style="font-family: inherit; font-size: 12px; line-height: 1.35; padding: 2px;">
                    <div style="display:flex; align-items:center; gap:4px; margin-bottom:3px;">
                      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#00e676;"></span>
                      <strong style="color: #0f172a; font-size: 13px;">${isMr ? `गट क्र. ${selectedGatNo} • तुमचे शेत` : `Gat ${selectedGatNo} • Your Demarcated Farm`}</strong>
                    </div>
                    <div style="font-size: 11px; color: #059669; font-weight: bold;">${customBoundary.area_acres} Acres (${customBoundary.area_gunthas} Gunthas)</div>
                    ${score != null ? `
                    <div style="margin-top: 4px; font-size: 11px; color: #475569;">
                      Suitability: <strong style="color: ${colorCfg.fill}; font-weight:800;">${Math.round(score)}%</strong>
                    </div>` : ""}
                  </div>
                `;
                fl.bindPopup(popupContent, { offset: [0, -10] });
              },
            }
          ).addTo(map);
          customFarmLayerRef.current = customLayer;
          customLayer.bringToFront();

          const currentKey = `${selectedGatNo}_custom`;
          if (lastFittedCropGatRef.current !== currentKey && customLayer.getBounds().isValid()) {
            lastFittedCropGatRef.current = currentKey;
            map.fitBounds(customLayer.getBounds(), { maxZoom: 18, padding: [60, 60], animate: true });
          }
        }
      } else if (selectedGatNo) {
        const currentKey = `${selectedGatNo}_cadastral`;
        if (lastFittedCropGatRef.current !== currentKey) {
          lastFittedCropGatRef.current = currentKey;
          let focused = false;
          layer.eachLayer((l: any) => {
            if (String(l.feature?.properties?.gat_no).trim() === String(selectedGatNo).trim() && l.getBounds) {
              focused = true;
              map.fitBounds(l.getBounds(), { maxZoom: 17, padding: [60, 60], animate: true });
              if (l.openPopup) l.openPopup();
            }
          });
          if (!focused && layer.getBounds().isValid()) {
            map.fitBounds(layer.getBounds(), { padding: [25, 25] });
          }
        }
      } else {
        if (lastFittedCropGatRef.current !== "__all__" && layer.getBounds().isValid()) {
          lastFittedCropGatRef.current = "__all__";
          map.fitBounds(layer.getBounds(), { padding: [25, 25] });
        }
      }

      // Recalculate dimensions
      map.invalidateSize();
    });
  }, [isMapReady, geoJsonData, selectedGatNo, onSelectGat, viewMode, isMr, colorScaleMode, customBoundary, selectedScore]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  const handleResetToWholeVillage = () => {
    setViewMode("all");
    lastFittedCropGatRef.current = "__all__";
    if (geojsonLayerRef.current && mapInstanceRef.current && geojsonLayerRef.current.getBounds().isValid()) {
      mapInstanceRef.current.fitBounds(geojsonLayerRef.current.getBounds(), { padding: [25, 25], animate: true });
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([18.146, 74.512], 14);
    }
  };

  const handleFocusSelectedGat = () => {
    setViewMode("focus");
    if (customFarmLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(customFarmLayerRef.current.getBounds(), { maxZoom: 18, padding: [60, 60], animate: true });
      return;
    }
    if (geojsonLayerRef.current && mapInstanceRef.current && selectedGatNo) {
      geojsonLayerRef.current.eachLayer((l: any) => {
        if (String(l.feature?.properties?.gat_no).trim() === String(selectedGatNo).trim() && l.getBounds) {
          mapInstanceRef.current?.fitBounds(l.getBounds(), { maxZoom: 17, padding: [60, 60], animate: true });
          if (l.openPopup) l.openPopup();
        }
      });
    }
  };

  return (
    <div className={`relative w-full h-full min-h-[560px] rounded-2xl overflow-hidden border border-surface-border shadow-subtle ${className}`}>
      {/* Global override for clean transparent centroid badge tooltip */}
      <style>{`
        .leaflet-tooltip.gat-centroid-badge {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-tooltip.gat-centroid-badge::before {
          display: none !important;
        }
      `}</style>
      {/* The Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[560px] z-0" />

      {/* TOP LEFT: Focus Parcel Control when Gat is selected */}
      {selectedGatNo && (
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
          <div className="bg-white/95 backdrop-blur-md rounded-xl p-1 shadow-subtle border border-surface-border/90 flex items-center gap-1">
            <button
              type="button"
              onClick={handleFocusSelectedGat}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "focus"
                  ? "bg-soil-primary text-white shadow-xs"
                  : "text-text-muted hover:text-text-main hover:bg-slate-50"
              }`}
              title={isMr ? `गट क्र. ${selectedGatNo} झूम करा` : `Zoom to Gat ${selectedGatNo}`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>{isMr ? `गट ${selectedGatNo} झूम करा` : `Focus Gat ${selectedGatNo}`}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectGat(null);
                handleResetToWholeVillage();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-text-muted hover:text-text-main hover:bg-slate-50 transition-all cursor-pointer"
              title={isMr ? "सर्व गाव पहा" : "View Whole Village"}
            >
              <span>✕</span>
            </button>
          </div>

          {customBoundary && (
            <div className="bg-emerald-600 text-white backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-emerald-400/50 flex items-center gap-1.5 text-xs font-extrabold animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>{isMr ? `${customBoundary.area_acres} एकर शेत लागू` : `${customBoundary.area_acres} Ac Farm Applied`}</span>
            </div>
          )}
        </div>
      )}

      {/* TOP RIGHT: Active Crop Indicator & Basemap Switcher */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
        {/* Active Crop Pill */}
        <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-subtle border border-surface-border/90 flex items-center gap-2 text-xs font-semibold text-text-main">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] animate-pulse" />
          <span>
            {isMr ? "पीक मूल्यमापन:" : "Evaluating Crop:"}{" "}
            <strong className="text-soil-primary font-bold">
              {translateCropName(cropName, isMr)}
            </strong>
          </span>
        </div>

        {/* Basemap Switcher */}
        <div className="bg-white/95 backdrop-blur-md p-0.5 rounded-xl shadow-subtle border border-surface-border/90 flex items-center text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setBasemap("satellite")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              basemap === "satellite" ? "bg-soil-primary text-white shadow-xs" : "text-text-muted hover:text-text-main"
            }`}
          >
            {isMr ? "उपग्रह" : "Satellite"}
          </button>
          <button
            type="button"
            onClick={() => setBasemap("street")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              basemap === "street" ? "bg-soil-primary text-white shadow-xs" : "text-text-muted hover:text-text-main"
            }`}
          >
            {isMr ? "रस्ता" : "Street"}
          </button>
          <button
            type="button"
            onClick={() => setBasemap("topo")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              basemap === "topo" ? "bg-soil-primary text-white shadow-xs" : "text-text-muted hover:text-text-main"
            }`}
          >
            {isMr ? "टोपो" : "Topo"}
          </button>
        </div>
      </div>

      {/* BOTTOM RIGHT: Map Zoom & Reset View Floating Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl shadow-subtle border border-surface-border/90">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-8 h-8 flex items-center justify-center text-text-main hover:bg-slate-100 rounded-lg transition-colors font-bold cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-8 h-8 flex items-center justify-center text-text-main hover:bg-slate-100 rounded-lg transition-colors font-bold cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="w-5 h-px bg-slate-200 my-0.5" />
        <button
          type="button"
          onClick={handleResetToWholeVillage}
          className="w-8 h-8 flex items-center justify-center text-soil-primary hover:bg-soil-primary/10 rounded-lg transition-colors font-bold cursor-pointer"
          title={isMr ? "संपूर्ण गाव नकाशावर पहा" : "Fit Whole Village View"}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* BOTTOM LEFT: Compact Crop Suitability Scale */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md rounded-2xl shadow-subtle border border-surface-border/90 p-3 w-[260px] sm:w-[280px]">
        {/* Scale Title and Current Score */}
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-surface-border/70">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-main flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isMr ? "अनुकूलता प्रमाण" : "Suitability Scale"}</span>
          </span>
          {selectedScore != null && (
            <span
              className="text-[11px] font-black px-2 py-0.5 rounded-full text-white shadow-2xs"
              style={{ backgroundColor: getContinuousSuitabilityColor(selectedScore).fill }}
            >
              {Number(selectedScore).toFixed(1)}%
            </span>
          )}
        </div>

        {/* Horizontal Gradient Color Scale Bar */}
        <div className="relative pt-3 pb-1">
          <div
            className="h-3 w-full rounded-full shadow-inner border border-black/10"
            style={{
              background:
                "linear-gradient(to right, #dc2626 0%, #ea580c 40%, #eab308 60%, #facc15 79.9%, #16a34a 80%, #15803d 100%)",
            }}
          />
          {/* Active Score Pin / Marker */}
          {selectedScore != null && (
            <div
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300"
              style={{ left: `${Math.max(5, Math.min(95, selectedScore))}%` }}
            >
              <div className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-black shadow-md whitespace-nowrap leading-tight">
                {translateCropName(cropName, isMr)}: {Number(selectedScore).toFixed(1)}%
              </div>
              <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-slate-900" />
            </div>
          )}
        </div>

        {/* Scale Percentage Notches */}
        <div className="flex items-center justify-between text-[10px] font-bold px-0.5 text-text-muted mt-1">
          <span className="text-red-700 font-extrabold">0%</span>
          <span className="text-orange-700 font-extrabold">40%</span>
          <span className="text-yellow-700 font-extrabold">60%</span>
          <span className="text-lime-700 font-extrabold">80%</span>
          <span className="text-emerald-700 font-extrabold">100%</span>
        </div>

        {/* Scale Labels: Low -> High */}
        <div className="flex items-center justify-between pt-1 mt-1 border-t border-slate-100 text-[10px] text-text-muted">
          <span>{isMr ? "कमी (N)" : "Low (N)"}</span>
          <span>{isMr ? "मध्यम (S2)" : "Moderate (S2)"}</span>
          <span>{isMr ? "उच्च (S1)" : "High (S1)"}</span>
        </div>
      </div>
    </div>
  );
};
