"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { Map as LeafletMap, ImageOverlay, GeoJSON, Marker as LeafletMarker, TileLayer } from "leaflet";
import { GeoJSONGeometry } from "@/services/fieldService";
import { useI18n } from "@/i18n/useI18n";
import {
  Plus,
  Minus,
  Focus,
  Satellite,
  Map as StreetIcon,
  PenTool,
  RotateCcw,
  CheckCircle2,
  X,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { DSMLayerConfig } from "@/types/gis";
import { generateParcelLayerCanvas } from "./SoilMapViewer";
import { customBoundaryService, CustomFarmBoundary } from "@/services/customBoundaryService";
import { calculatePolygonArea } from "@/services/farmSubplotService";

interface MapLibreWrapperProps {
  geometry: GeoJSONGeometry;
  gatNo: string;
  villageName?: string;
  talukaName?: string;
  districtName?: string;
  areaText?: string;
  className?: string;
  interactive?: boolean;
  allPlotsGeoJSON?: any;
  dsmLayer?: DSMLayerConfig | null;
  dsmOpacity?: number;
}

// Bounding box calculator for GeoJSON Polygon / MultiPolygon [minLng, minLat, maxLng, maxLat]
function computeBounds(geom: GeoJSONGeometry): [number, number, number, number] | null {
  if (!geom || !geom.coordinates) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const traverse = (coords: any) => {
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    } else if (Array.isArray(coords)) {
      for (const item of coords) {
        traverse(item);
      }
    }
  };

  traverse(geom.coordinates);

  if (minLng === Infinity || minLat === Infinity) return null;
  return [minLng, minLat, maxLng, maxLat];
}

export const MapLibreWrapper: React.FC<MapLibreWrapperProps> = ({
  geometry,
  gatNo,
  villageName = "Malegaon",
  talukaName = "Baramati",
  districtName = "Pune",
  areaText,
  className = "h-[560px]",
  interactive = true,
  allPlotsGeoJSON,
  dsmLayer,
  dsmOpacity = 0.75,
}) => {
  const { t, language } = useI18n();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<any>(null);

  // Layers
  const tileLayerRef = useRef<TileLayer | null>(null);
  const farmLayerRef = useRef<GeoJSON | null>(null);
  const outerGatLayerRef = useRef<GeoJSON | null>(null);
  const allPlotsLayerRef = useRef<GeoJSON | null>(null);
  const centerMarkerRef = useRef<LeafletMarker | null>(null);
  const sampleDotMarkerRef = useRef<any>(null);
  const dsmLayerRef = useRef<ImageOverlay | TileLayer | null>(null);
  const drawingLayerRef = useRef<any>(null);

  const [activeBasemap, setActiveBasemap] = useState<"satellite" | "street">("satellite");
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  // In-map custom farm boundary drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const [customBoundary, setCustomBoundary] = useState<CustomFarmBoundary | null>(null);

  // Sync custom boundary on mount / gat change
  useEffect(() => {
    const custom = customBoundaryService.getCustomBoundary(gatNo);
    setCustomBoundary(custom);

    const handleBoundaryUpdated = () => {
      const updated = customBoundaryService.getCustomBoundary(gatNo);
      setCustomBoundary(updated);
    };
    window.addEventListener("soilpilot_farm_boundary_updated", handleBoundaryUpdated);
    return () => window.removeEventListener("soilpilot_farm_boundary_updated", handleBoundaryUpdated);
  }, [gatNo]);

  // Live draft area
  const draftArea = React.useMemo(() => {
    return calculatePolygonArea(draftPoints);
  }, [draftPoints]);

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setDraftPoints([]);
    setActiveBasemap("satellite");

    // Focus closely on the selected Gat boundary for precise drawing
    const map = mapRef.current;
    if (map && farmLayerRef.current && farmLayerRef.current.getBounds().isValid()) {
      map.fitBounds(farmLayerRef.current.getBounds(), {
        padding: [30, 30],
        maxZoom: 18,
        animate: true,
      });
    }
  };

  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setDraftPoints([]);
    drawingLayerRef.current?.clearLayers();

    // Re-focus on the farm parcel
    if (mapRef.current && farmLayerRef.current && farmLayerRef.current.getBounds().isValid()) {
      mapRef.current.fitBounds(farmLayerRef.current.getBounds(), {
        padding: [60, 60],
        maxZoom: 17,
        animate: true,
      });
    }
  };

  const handleUndoPoint = () => {
    setDraftPoints((prev) => prev.slice(0, -1));
  };

  const handleSaveBoundary = () => {
    if (draftPoints.length < 3) return;
    const saved = customBoundaryService.saveCustomBoundary(gatNo, draftPoints, {
      plot_name: `Gat ${gatNo} Farm Parcel`,
    });
    setCustomBoundary(saved);
    setIsDrawing(false);
    setDraftPoints([]);
    drawingLayerRef.current?.clearLayers();

    // Re-focus on the saved farm parcel
    if (mapRef.current && farmLayerRef.current && farmLayerRef.current.getBounds().isValid()) {
      mapRef.current.fitBounds(farmLayerRef.current.getBounds(), {
        padding: [60, 60],
        maxZoom: 18,
        animate: true,
      });
    }
  };

  const handleFitWholeSatellite = () => {
    const map = mapRef.current;
    if (!map) return;
    if (farmLayerRef.current && farmLayerRef.current.getBounds().isValid()) {
      map.fitBounds(farmLayerRef.current.getBounds(), {
        padding: [50, 50],
        maxZoom: 18,
        animate: true,
      });
    }
  };

  const handleFocusGat = () => {
    const map = mapRef.current;
    if (!map) return;
    if (farmLayerRef.current && farmLayerRef.current.getBounds().isValid()) {
      map.fitBounds(farmLayerRef.current.getBounds(), {
        padding: [60, 60],
        maxZoom: 17,
        animate: true,
      });
    }
  };

  const handleClearCustomBoundary = () => {
    customBoundaryService.clearCustomBoundary(gatNo);
    setCustomBoundary(null);
    setIsDrawing(false);
    setDraftPoints([]);
    drawingLayerRef.current?.clearLayers();
  };

  // Listen to map clicks when drawing is active
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (isDrawing) {
      map.getContainer().style.cursor = "crosshair";
      const handleClick = (e: any) => {
        if (!e.latlng) return;
        setDraftPoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
      };
      map.on("click", handleClick);
      return () => {
        map.off("click", handleClick);
        if (map.getContainer()) {
          map.getContainer().style.cursor = "";
        }
      };
    } else {
      if (map.getContainer()) {
        map.getContainer().style.cursor = "";
      }
    }
  }, [isDrawing, mapLoaded]);

  // Render drawing feedback (points, dashed line, preview polygon)
  useEffect(() => {
    const group = drawingLayerRef.current;
    const L = leafletRef.current;
    if (!group || !L) return;

    group.clearLayers();

    if (!isDrawing || draftPoints.length === 0) return;

    // Draw markers for vertices
    draftPoints.forEach(([lat, lng], idx) => {
      const isFirst = idx === 0;
      const marker = L.circleMarker([lat, lng], {
        radius: isFirst ? 7 : 5,
        color: isFirst ? "#f43f5e" : "#00e676",
        fillColor: "#ffffff",
        fillOpacity: 1,
        weight: 2.5,
      }).addTo(group);

      if (isFirst && draftPoints.length >= 3) {
        marker.bindTooltip(language === "mr" ? "सीमा पूर्ण करा" : "Click to finish", {
          permanent: false,
          direction: "top",
        });
        marker.on("click", (e: any) => {
          L.DomEvent.stopPropagation(e);
          handleSaveBoundary();
        });
      }
    });

    // Draw line connecting points
    if (draftPoints.length > 1) {
      L.polyline(draftPoints, {
        color: "#00e676",
        weight: 3,
        dashArray: "5, 5",
      }).addTo(group);
    }

    // Preview polygon if >= 3 points
    if (draftPoints.length >= 3) {
      L.polygon(draftPoints, {
        color: "#00e676",
        weight: 2,
        fillColor: "#00e676",
        fillOpacity: 0.25,
      }).addTo(group);
    }
  }, [isDrawing, draftPoints, language]);

  // Farmer-friendly popup HTML
  const createPopupHTML = useCallback(
    (props: any, isSelected: boolean) => {
      const plotGat = props.gat_no || gatNo;
      const plotVillage = props.village || villageName || "Malegaon";
      const plotTaluka = props.taluka || talukaName || "Baramati";
      const plotDistrict = props.district || districtName || "Pune";
      const areaNum = props.area ? Number(props.area) : null;
      const isAcre = props.area_unit?.toLowerCase().includes("acre") || props.area_unit?.toLowerCase() === "ac";
      const areaInAcres = areaNum && !isNaN(areaNum)
        ? (isAcre ? areaNum : Number((areaNum * 2.47105).toFixed(2)))
        : null;
      const plotArea = areaInAcres !== null
        ? `${areaInAcres} ${language === "mr" ? "एकर" : "Acres"}`
        : areaText || (language === "mr" ? "उपलब्ध नाही" : "Not Available");
      const plotSource = props.source || "Demo GIS Data";

      const titleText = isSelected
        ? language === "mr"
          ? "🌱 तुमचे शेत"
          : "🌱 Your Farm"
        : language === "mr"
        ? "भूखंड तपशील"
        : "Plot Details";

      const gatLabel = language === "mr" ? "गट क्रमांक" : "Gat No.";
      const villageLabel = language === "mr" ? "गाव" : "Village";
      const talukaLabel = language === "mr" ? "तालुका" : "Taluka";
      const districtLabel = language === "mr" ? "जिल्हा" : "District";
      const areaLabel = language === "mr" ? "क्षेत्रफळ" : "Area";
      const sourceLabel = language === "mr" ? "स्रोत" : "Source";
      const viewButtonText = language === "mr" ? "शेताचा तपशील पहा" : "View Farm Details";
      const badgeText = language === "mr" ? "निवडलेले" : "Selected";

      return `
      <div style="font-family: inherit; padding: 12px 14px; min-width: 220px; color: #1e293b;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
          <span style="font-weight: 800; font-size: 13px; color: #2A7C13;">
            ${titleText}
          </span>
          ${isSelected ? `<span style="font-size: 10px; font-weight: 700; background: #2A7C13; color: white; padding: 2px 6px; border-radius: 4px;">${badgeText}</span>` : ""}
        </div>
        <div style="font-size: 12px; line-height: 1.6;">
          <div style="display: flex; justify-content: space-between; gap: 8px;">
            <span style="color: #64748b;">${gatLabel}:</span>
            <span style="font-weight: 700; color: #0f172a;">${plotGat}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 8px;">
            <span style="color: #64748b;">${villageLabel}:</span>
            <span style="font-weight: 600;">${plotVillage}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 8px;">
            <span style="color: #64748b;">${talukaLabel}, ${districtLabel}:</span>
            <span>${plotTaluka}, ${plotDistrict}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 2px;">
            <span style="color: #64748b;">${areaLabel}:</span>
            <span style="font-weight: 700; color: #2A7C13;">${plotArea}</span>
          </div>
        </div>
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #94a3b8;">
          <span>${sourceLabel}: ${plotSource}</span>
          ${isSelected ? `<a href="/my-farm" style="color: #2A7C13; font-weight: 700; text-decoration: none;">${viewButtonText} →</a>` : ""}
        </div>
      </div>
    `;
    },
    [gatNo, villageName, talukaName, districtName, areaText, language]
  );

  // Fit camera smoothly to the field boundary
  const fitToFarm = useCallback(() => {
    const map = mapRef.current;
    const farmLayer = farmLayerRef.current;
    if (!map) return;

    if (farmLayer && farmLayer.getBounds().isValid()) {
      map.fitBounds(farmLayer.getBounds(), {
        padding: [60, 60],
        maxZoom: 18,
        animate: true,
      });
      return;
    }

    const bounds = computeBounds(geometry);
    if (bounds) {
      map.fitBounds(
        [
          [bounds[1], bounds[0]],
          [bounds[3], bounds[2]],
        ],
        {
          padding: [60, 60],
          maxZoom: 18,
          animate: true,
        }
      );
    }
  }, [geometry]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isMounted = true;

    (async () => {
      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current) return;
      leafletRef.current = L;

      // Clean up previous instance if any
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const initialBounds = computeBounds(geometry);
      const centerLat = initialBounds ? (initialBounds[1] + initialBounds[3]) / 2 : 18.166;
      const centerLng = initialBounds ? (initialBounds[0] + initialBounds[2]) / 2 : 74.505;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        zoomAnimation: true,
      });

      // Google Satellite Tile Layer (Crisp, seamless, maxZoom 21)
      const tile = L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
        maxZoom: 21,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }).addTo(map);
      tileLayerRef.current = tile;

      // Attribution
      L.control
        .attribution({
          prefix: false,
          position: "bottomright",
        })
        .addAttribution('&copy; Google &mdash; Esri')
        .addTo(map);

      // Feature group for interactive boundary drawing
      const drawingGroup = L.featureGroup().addTo(map);
      drawingLayerRef.current = drawingGroup;

      mapRef.current = map;
      setMapLoaded(true);
    })();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Basemap Switcher (Satellite <-> Street)
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !mapLoaded) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    if (activeBasemap === "satellite") {
      tileLayerRef.current = L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
        maxZoom: 21,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
    }

    // Ensure tile layer stays at the back
    tileLayerRef.current?.bringToBack();
  }, [activeBasemap, mapLoaded]);

  // 3. Render Parcel Polygon, Centered Badge & Neighbor Plots
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !mapLoaded) return;

    // Clean up previous layers
    if (allPlotsLayerRef.current) {
      map.removeLayer(allPlotsLayerRef.current);
      allPlotsLayerRef.current = null;
    }
    if (outerGatLayerRef.current) {
      map.removeLayer(outerGatLayerRef.current);
      outerGatLayerRef.current = null;
    }
    if (farmLayerRef.current) {
      map.removeLayer(farmLayerRef.current);
      farmLayerRef.current = null;
    }
    if (centerMarkerRef.current) {
      map.removeLayer(centerMarkerRef.current);
      centerMarkerRef.current = null;
    }
    if (sampleDotMarkerRef.current) {
      map.removeLayer(sampleDotMarkerRef.current);
      sampleDotMarkerRef.current = null;
    }

    // B. If Custom Boundary is active: render official Gat perimeter as dashed green reference (NO BLUE!)
    const activeCustom = customBoundaryService.getCustomBoundary(gatNo);
    if (activeCustom && geometry) {
      const outerGatLayer = L.geoJSON(
        {
          type: "Feature",
          properties: { gat_no: gatNo },
          geometry: geometry,
        } as any,
        {
          style: () => ({
            color: "#00e676", // Vibrant neon green dashed perimeter
            weight: 2.2,
            opacity: 0.85,
            dashArray: "6, 6",
            fillColor: "#00e676",
            fillOpacity: 0.02,
          }),
        }
      ).addTo(map);
      outerGatLayerRef.current = outerGatLayer;
    }

    // C. Farm Boundary: use custom polygon if active, otherwise official cadastral geometry
    const effectiveGeometry = activeCustom
      ? customBoundaryService.toGeoJSONPolygon(activeCustom)
      : geometry;

    if (effectiveGeometry) {
      const featureData = {
        type: "Feature",
        properties: {
          gat_no: gatNo,
          village: villageName,
          taluka: talukaName,
          district: districtName,
          area: activeCustom ? String(activeCustom.area_ha) : (areaText?.replace(/[^0-9.]/g, "") || null),
          area_acres: activeCustom ? activeCustom.area_acres : null,
          source: activeCustom ? "Custom Demarcation" : "Cadastral Survey",
        },
        geometry: effectiveGeometry,
      };

      const farmLayer = L.geoJSON(featureData as any, {
        style: () => ({
          color: "#00e676", // Vibrant neon green matching reference
          weight: 3.8, // Prominent cadastral boundary line
          opacity: 1.0,
          fillColor: "#00e676",
          fillOpacity: isDrawing ? 0.05 : activeCustom ? 0.22 : 0.14,
          lineJoin: "round",
          lineCap: "round",
        }),
      }).addTo(map);
      farmLayerRef.current = farmLayer;

      // Bring selected parcel to front
      farmLayer.bringToFront();

      // D. Centered Badge inside Farm Polygon (hide during sketching so clicks aren't obstructed)
      const bounds = farmLayer.getBounds();
      if (!isDrawing && bounds.isValid()) {
        const center = bounds.getCenter();
        const badgeTitle = activeCustom
          ? `Gat ${gatNo} • Your Farm (${activeCustom.area_acres} Ac)`
          : `Gat No. ${gatNo}`;

        const badgeHtml = `
          <div style="display: inline-flex; align-items: center; justify-content: center; width: auto; max-width: max-content; white-space: nowrap; padding: 4px 12px; border-radius: 6px; background: rgba(15, 23, 42, 0.92); color: #ffffff; font-size: 12.5px; font-weight: 700; border: 1.5px solid ${activeCustom ? "#00e676" : "rgba(245, 158, 11, 0.95)"}; box-shadow: 0 4px 14px rgba(0,0,0,0.55); pointer-events: none; user-select: none;">
            ${badgeTitle}
          </div>
        `;

        const badgeIcon = L.divIcon({
          className: "soilpilot-custom-gat-marker",
          html: badgeHtml,
          iconSize: [140, 30],
          iconAnchor: [70, 15],
        });

        const marker = L.marker(center, {
          icon: badgeIcon,
          interactive: false,
          zIndexOffset: 1000,
        }).addTo(map);
        centerMarkerRef.current = marker;

        // Auto-fit bounds to the selected Gat / Custom Farm only when NOT drawing
        map.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 18,
          animate: true,
        });

        // E. Interactive Popup on Parcel Click
        if (interactive) {
          farmLayer.on("click", (e: any) => {
            L.popup({
              offset: [0, -10],
              closeButton: true,
              className: "soilpilot-popup-card",
            })
              .setLatLng(e.latlng)
              .setContent(
                createPopupHTML(
                  {
                    gat_no: gatNo,
                    village: villageName,
                    taluka: talukaName,
                    district: districtName,
                    area: activeCustom ? String(activeCustom.area_ha) : (areaText?.replace(/[^0-9.]/g, "") || null),
                    source: activeCustom ? "Farmer Demarcated Farm" : "Cadastral Survey",
                  },
                  true
                )
              )
              .openOn(map);
          });
        }
      }
    }
  }, [
    geometry,
    gatNo,
    villageName,
    talukaName,
    districtName,
    areaText,
    allPlotsGeoJSON,
    interactive,
    mapLoaded,
    createPopupHTML,
    customBoundary,
    isDrawing,
  ]);

  // 4. Dynamic DSM Layer Handling (if passed to FarmMap)
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !mapLoaded) return;

    if (dsmLayerRef.current) {
      map.removeLayer(dsmLayerRef.current);
      dsmLayerRef.current = null;
    }

    // While sketching polygon, NEVER show DSM raster overlay — show 100% pure satellite imagery across the whole area!
    if (isDrawing || !dsmLayer || dsmLayer.id === "farm_boundary") return;

    // Use custom farm boundary if active, otherwise Gat geometry
    const activeCustom = customBoundaryService.getCustomBoundary(gatNo);
    const effectiveGeom = activeCustom
      ? customBoundaryService.toGeoJSONPolygon(activeCustom)
      : geometry;

    // Check if we have polygon geometry to generate crisp clipped parcel canvas
    let outerRing: [number, number][] = [];
    if (effectiveGeom) {
      if (effectiveGeom.type === "Polygon") {
        outerRing = (effectiveGeom.coordinates[0] || []) as [number, number][];
      } else if (effectiveGeom.type === "MultiPolygon") {
        outerRing = (effectiveGeom.coordinates[0]?.[0] || []) as [number, number][];
      }
    }

    const b = computeBounds(effectiveGeom);
    if (outerRing.length >= 3 && b) {
      const [minLng, minLat, maxLng, maxLat] = b;
      const bounds = { minLng, maxLng, minLat, maxLat };
      const overlayUrl = generateParcelLayerCanvas(outerRing, dsmLayer, null, bounds);
      if (overlayUrl) {
        const overlay = L.imageOverlay(overlayUrl, [[minLat, minLng], [maxLat, maxLng]], {
          opacity: dsmOpacity,
          interactive: false,
          zIndex: 5,
        }).addTo(map);
        dsmLayerRef.current = overlay;

        const dLng = maxLng - minLng || 0.0001;
        const dLat = maxLat - minLat || 0.0001;
        const clipPoints = outerRing.map(([lng, lat]) => {
          const x = Math.max(0, Math.min(100, ((lng - minLng) / dLng) * 100));
          const y = Math.max(0, Math.min(100, ((maxLat - lat) / dLat) * 100));
          return `${x.toFixed(4)}% ${y.toFixed(4)}%`;
        });
        const clipPathCss = `polygon(${clipPoints.join(", ")})`;

        const applyClip = () => {
          const el = overlay.getElement();
          if (el) {
            el.style.clipPath = clipPathCss;
            el.style.webkitClipPath = clipPathCss;
          }
        };

        applyClip();
        overlay.on("load", applyClip);
        map.on("zoomend", applyClip);
        map.on("viewreset", applyClip);

        if (farmLayerRef.current) farmLayerRef.current.bringToFront();
        return;
      }
    }

    if (dsmLayer.rasterTileUrl) {
      const dsmLayerObj = L.tileLayer(dsmLayer.rasterTileUrl, {
        opacity: dsmOpacity,
        maxZoom: 21,
      }).addTo(map);
      dsmLayerRef.current = dsmLayerObj;
    } else if (dsmLayer.rasterImageUrl && dsmLayer.rasterBounds) {
      const [w, s, e, n] = dsmLayer.rasterBounds;
      const overlay = L.imageOverlay(dsmLayer.rasterImageUrl, [[s, w], [n, e]], {
        opacity: dsmOpacity,
        interactive: false,
        zIndex: 5,
      }).addTo(map);
      dsmLayerRef.current = overlay;
    }

    // Keep raster under the boundary layer
    if (farmLayerRef.current) {
      farmLayerRef.current.bringToFront();
    }
    if (centerMarkerRef.current) {
      centerMarkerRef.current.setZIndexOffset(1000);
    }
    if (sampleDotMarkerRef.current) {
      sampleDotMarkerRef.current.setZIndexOffset(1500);
    }
  }, [dsmLayer, dsmOpacity, mapLoaded, isDrawing]);

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden shadow-card border border-surface-border bg-slate-900 ${className}`}
    >
      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Top Left: Farmer Context Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-md border border-surface-border/80 flex items-center gap-2 text-xs font-semibold text-text-main">
          <span className="w-2.5 h-2.5 rounded-full bg-soil-primary animate-pulse" />
          <span>
            {villageName ? `${villageName} • ` : ""}
            {t("geo.gatNo")} {gatNo}
          </span>
          {areaText && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-soil-primaryLight font-bold text-soil-primary">
              {areaText}
            </span>
          )}
        </div>
      </div>

      {/* Top Right: Draw Farm Tool & Basemap Switcher */}
      {interactive && (
        <div className="absolute top-4 right-4 z-10 flex flex-wrap items-center justify-end gap-2">
          {/* Draw My Farm Tool Button */}
          {!isDrawing ? (
            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-surface-border/80 text-xs">
              {customBoundary ? (
                <>
                  <div className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-soil-primary bg-soil-primaryLight rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{customBoundary.area_acres} Ac</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartDrawing}
                    title={language === "mr" ? "शेत सीमा पुन्हा आखा" : "Redraw Farm Boundary"}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-text-main hover:bg-surface-subtle rounded-lg transition-all cursor-pointer"
                  >
                    <PenTool className="w-3.5 h-3.5 text-soil-primary" />
                    <span>{language === "mr" ? "पुन्हा आखा" : "Redraw"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCustomBoundary}
                    title={language === "mr" ? "मूळ संपूर्ण गट रिसेट करा" : "Reset to Full Gat"}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{language === "mr" ? "संपूर्ण गट" : "Reset"}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStartDrawing}
                  title={language === "mr" ? "या गटामध्ये माझ्या शेताची सीमा आखा" : "Draw My Farm Boundary inside this Gat"}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-white bg-soil-primary hover:bg-soil-primaryHover rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>{language === "mr" ? "माझे शेत आखा" : "Draw My Farm"}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-emerald-500/50 text-white text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{language === "mr" ? "शेत सीमा रेखांकन सुरू आहे..." : "Drawing Farm Boundary..."}</span>
            </div>
          )}

          {/* Basemap Switcher */}
          <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-surface-border/80 flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveBasemap("satellite")}
              aria-label={t("map.satellite") || "Satellite"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeBasemap === "satellite"
                  ? "bg-soil-primary text-white shadow-xs"
                  : "text-text-muted hover:text-text-main hover:bg-surface-subtle"
              }`}
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>{t("map.satellite") || "Satellite"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveBasemap("street")}
              aria-label={t("map.street") || "Street"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeBasemap === "street"
                  ? "bg-soil-primary text-white shadow-xs"
                  : "text-text-muted hover:text-text-main hover:bg-surface-subtle"
              }`}
            >
              <StreetIcon className="w-3.5 h-3.5" />
              <span>{t("map.street") || "Street"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Drawing HUD Overlay */}
      {isDrawing && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[92%] sm:w-auto min-w-[320px] max-w-md bg-white/98 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border-2 border-emerald-500 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between gap-3 border-b border-surface-border/70 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-xs font-black text-text-main">
                {draftPoints.length === 0
                  ? language === "mr" ? "नकाशावर क्लिक करून पहिले टोक निश्चित करा" : "Click map to mark 1st farm corner"
                  : language === "mr" ? `${draftPoints.length} कोपरे निश्चित केले` : `${draftPoints.length} Corners Placed`}
              </div>
            </div>
            <span className="text-[11px] font-bold text-soil-primary">
              {draftPoints.length < 3 ? (language === "mr" ? "किमान ३ बिंदू" : "Min 3 points") : (language === "mr" ? "तयार आहे" : "Ready")}
            </span>
          </div>

          {/* Quick Extent Toggles: View Whole Satellite Area or Focus Gat */}
          <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-surface-border/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              {language === "mr" ? "नकाशा दृश्य:" : "Map View:"}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleFitWholeSatellite}
                className="px-2 py-0.5 rounded-lg bg-surface-subtle hover:bg-slate-200 text-text-main text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                title={language === "mr" ? "संपूर्ण उपग्रह क्षेत्र पहा" : "View Whole Satellite Area"}
              >
                <span>🗺️</span>
                <span>{language === "mr" ? "संपूर्ण उपग्रह नकाशा" : "Whole Satellite Map"}</span>
              </button>
              <button
                type="button"
                onClick={handleFocusGat}
                className="px-2 py-0.5 rounded-lg bg-surface-subtle hover:bg-slate-200 text-soil-primary text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                title={language === "mr" ? `गट ${gatNo} झूम` : `Focus Gat ${gatNo}`}
              >
                <span>🎯</span>
                <span>{language === "mr" ? `गट ${gatNo}` : `Gat ${gatNo}`}</span>
              </button>
            </div>
          </div>

          {/* Area Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div className="p-2 rounded-xl bg-soil-primaryLight/40 border border-soil-primary/20">
              <div className="text-[10px] uppercase font-bold text-text-muted">
                {language === "mr" ? "एकर" : "Acres"}
              </div>
              <div className="text-base font-black text-soil-primary">
                {draftArea.acres}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-surface-subtle border border-surface-border">
              <div className="text-[10px] uppercase font-bold text-text-muted">
                {language === "mr" ? "गुंठे" : "Gunthas"}
              </div>
              <div className="text-base font-black text-emerald-700">
                {draftArea.gunthas}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-surface-subtle border border-surface-border">
              <div className="text-[10px] uppercase font-bold text-text-muted">
                {language === "mr" ? "हेक्टर" : "Hectares"}
              </div>
              <div className="text-base font-black text-slate-800">
                {draftArea.hectares}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndoPoint}
              disabled={draftPoints.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-text-main bg-surface-subtle hover:bg-slate-200 disabled:opacity-40 rounded-xl transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === "mr" ? "मागे घ्या" : "Undo"}</span>
            </button>
            <button
              type="button"
              onClick={handleCancelDrawing}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{language === "mr" ? "रद्द करा" : "Cancel"}</span>
            </button>
            <button
              type="button"
              onClick={handleSaveBoundary}
              disabled={draftPoints.length < 3}
              className="flex-[1.5] flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-black text-white bg-soil-primary hover:bg-soil-primaryHover disabled:opacity-40 disabled:pointer-events-none rounded-xl shadow-md transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{language === "mr" ? "शेत सेव्ह करा" : "Save Boundary"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Left: Navigation & Fit-to-Farm Controls */}
      {interactive && (
        <div className="absolute bottom-6 left-4 z-10 flex flex-col gap-1.5">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-surface-border/80 p-1 flex flex-col gap-1">
            <button
              type="button"
              onClick={handleZoomIn}
              aria-label={t("myFarm.zoomIn") || "Zoom in"}
              title={t("myFarm.zoomIn") || "Zoom in"}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-main hover:bg-surface-subtle active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="w-full h-px bg-surface-border" />
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label={t("myFarm.zoomOut") || "Zoom out"}
              title={t("myFarm.zoomOut") || "Zoom out"}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-main hover:bg-surface-subtle active:scale-95 transition-all cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={fitToFarm}
            aria-label={t("map.fitToFarm") || "Fit to farm"}
            title={t("map.fitToFarm") || "Fit to farm"}
            className="w-10 h-10 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-surface-border/80 flex items-center justify-center text-soil-primary hover:bg-soil-primaryLight/50 active:scale-95 transition-all cursor-pointer"
          >
            <Focus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
