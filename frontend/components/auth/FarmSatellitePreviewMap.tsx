"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import {
  Satellite,
  Map as StreetIcon,
  Maximize2,
  MapPin,
  Compass,
  CheckCircle2,
  Layers,
} from "lucide-react";

interface FarmSatellitePreviewMapProps {
  selectedGatNo?: string;
  onSelectGat?: (gatNo: string) => void;
  className?: string;
}

export const FarmSatellitePreviewMap: React.FC<FarmSatellitePreviewMapProps> = ({
  selectedGatNo,
  onSelectGat,
  className = "",
}) => {
  const { language } = useI18n();
  const isMr = language === "mr";

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const geojsonLayerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  const [basemap, setBasemap] = useState<"satellite" | "street">("satellite");
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProps, setSelectedProps] = useState<any>(null);

  // 1. Fetch GeoJSON
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch("/data/malegaon_plots.geojson")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load /data/malegaon_plots.geojson");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setGeoData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Could not load malegaon_plots.geojson, falling back to crop suitability geojson:", err);
        fetch("/api/v1/crop-suitability/crop/sugarcane/geojson?irrigation_available=true")
          .then((r) => r.json())
          .then((data) => {
            if (isMounted) {
              setGeoData(data);
              setLoading(false);
            }
          })
          .catch((e) => {
            if (isMounted) setLoading(false);
            console.error("All GeoJSON fallbacks failed:", e);
          });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [18.146, 74.512],
          zoom: 15,
          zoomControl: false,
          attributionControl: false,
        });

        // Add Zoom Control top right
        L.control.zoom({ position: "topright" }).addTo(map);

        // Google Satellite Basemap by default
        const tile = L.tileLayer(
          "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
          { maxZoom: 21, attribution: "Google Satellite" }
        ).addTo(map);
        tileLayerRef.current = tile;

        mapInstanceRef.current = map;
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Basemap Switcher
  useEffect(() => {
    if (!tileLayerRef.current || !mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);

      let url = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
      let attr = "Google Satellite";

      if (basemap === "street") {
        url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
        attr = "OpenStreetMap";
      }

      tileLayerRef.current = L.tileLayer(url, { maxZoom: 21, attribution: attr }).addTo(map);
      tileLayerRef.current.bringToBack();
    });
  }, [basemap]);

  // 4. Render GeoJSON & Highlight Selected Farm
  useEffect(() => {
    if (!mapInstanceRef.current || !geoData) return;

    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      if (geojsonLayerRef.current) {
        map.removeLayer(geojsonLayerRef.current);
        geojsonLayerRef.current = null;
      }

      let activeProps: any = null;

      const layer = L.geoJSON(geoData, {
        style: (feature: any) => {
          const props = feature?.properties || {};
          const gatNo = String(props.gat_no || "").trim();
          const isSelected = selectedGatNo && String(selectedGatNo).trim() === gatNo;

          if (isSelected) {
            activeProps = props;
            return {
              color: "#22c55e",
              weight: 4,
              fillColor: "#22c55e",
              fillOpacity: 0.35,
              dashArray: "",
            };
          }

          // Only display the selected Gat boundary when a Gat is selected
          return {
            color: selectedGatNo ? "transparent" : "rgba(255, 255, 255, 0.45)",
            weight: selectedGatNo ? 0 : 1.2,
            fillColor: "transparent",
            fillOpacity: 0.0,
            dashArray: "",
          };
        },
        onEachFeature: (feature: any, featureLayer: any) => {
          const props = feature?.properties || {};
          const gatNo = props.gat_no;
          const areaAcres = props.area_acres || (props.area_ha ? (props.area_ha * 2.471).toFixed(2) : null);
          const areaHa = props.area_ha || props.area;

          const tooltipHtml = `
            <div style="font-family: inherit; font-size: 11px; line-height: 1.3; min-width: 120px;">
              <strong style="color: #0f172a; font-size: 12px;">Gat ${gatNo}</strong>
              <div style="color: #475569; font-size: 11px; margin-top: 2px;">
                ${areaAcres ? `${areaAcres} ${isMr ? "एकर" : "Acres"}` : ""} ${areaHa ? `(${areaHa} ha)` : ""}
              </div>
              <div style="color: #16a34a; font-size: 10px; font-weight: 700; margin-top: 3px;">
                ${isMr ? "निवडण्यासाठी क्लिक करा" : "Click to select"}
              </div>
            </div>
          `;

          featureLayer.bindTooltip(tooltipHtml, { sticky: true, direction: "top", opacity: 0.98 });

          featureLayer.on("mouseover", () => {
            const isSelected = selectedGatNo && String(selectedGatNo).trim() === String(gatNo).trim();
            if (!isSelected) {
              featureLayer.setStyle({
                weight: 2.5,
                color: "#22c55e",
                fillColor: "#22c55e",
                fillOpacity: 0.15,
              });
              featureLayer.bringToFront();
            }
          });

          featureLayer.on("mouseout", () => {
            layer.resetStyle(featureLayer);
          });

          featureLayer.on("click", (e: any) => {
            L.DomEvent.stopPropagation(e);
            if (onSelectGat) {
              onSelectGat(String(gatNo).trim());
            }
          });
        },
      }).addTo(map);

      geojsonLayerRef.current = layer;
      setSelectedProps(activeProps);

      // Focus directly onto the selected Gat
      if (selectedGatNo) {
        let found = false;
        layer.eachLayer((l: any) => {
          if (String(l.feature?.properties?.gat_no).trim() === String(selectedGatNo).trim() && l.getBounds) {
            found = true;
            map.fitBounds(l.getBounds(), { maxZoom: 18, padding: [50, 50], animate: true });
            l.openTooltip?.();
          }
        });
        if (!found) {
          map.fitBounds(layer.getBounds(), { padding: [20, 20] });
        }
      } else {
        map.fitBounds(layer.getBounds(), { padding: [20, 20] });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [geoData, selectedGatNo, onSelectGat, isMr]);

  const handleZoomToFarm = () => {
    if (!geojsonLayerRef.current || !mapInstanceRef.current || !selectedGatNo) return;
    geojsonLayerRef.current.eachLayer((l: any) => {
      if (String(l.feature?.properties?.gat_no).trim() === String(selectedGatNo).trim() && l.getBounds) {
        mapInstanceRef.current?.fitBounds(l.getBounds(), { maxZoom: 18, padding: [50, 50], animate: true });
        l.openTooltip?.();
      }
    });
  };

  const handleZoomToAll = () => {
    if (!geojsonLayerRef.current || !mapInstanceRef.current) return;
    mapInstanceRef.current.fitBounds(geojsonLayerRef.current.getBounds(), { padding: [20, 20], animate: true });
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-surface-border shadow-md bg-slate-900 ${className}`}>
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[340px] z-0" />

      {/* TOP LEFT: Selected Farm Indicator Badge */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-subtle border border-surface-border/90 flex items-center gap-2 text-xs font-bold text-text-main">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border border-emerald-600" />
          <span>
            {selectedGatNo
              ? isMr ? `निवडलेले शेत: गट क्र. ${selectedGatNo}` : `Selected Farm: Gat ${selectedGatNo}`
              : isMr ? "नकाशावर शेत निवडा" : "Click on map to select farm"}
          </span>
          {selectedProps?.area_acres && (
            <span className="text-[11px] font-extrabold text-soil-primary bg-soil-primary/10 px-2 py-0.5 rounded-full">
              {selectedProps.area_acres} {isMr ? "एकर" : "Acres"}
            </span>
          )}
        </div>
      </div>

      {/* TOP RIGHT: Basemap Switcher (Satellite vs Street) */}
      <div className="absolute top-3 right-14 z-10 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-subtle border border-surface-border/90 flex items-center text-xs font-semibold">
        <button
          type="button"
          onClick={() => setBasemap("satellite")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
            basemap === "satellite"
              ? "bg-soil-primary text-white shadow-xs"
              : "text-text-muted hover:text-text-main"
          }`}
        >
          <Satellite className="w-3.5 h-3.5" />
          <span>{isMr ? "उपग्रह" : "Satellite"}</span>
        </button>
        <button
          type="button"
          onClick={() => setBasemap("street")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
            basemap === "street"
              ? "bg-soil-primary text-white shadow-xs"
              : "text-text-muted hover:text-text-main"
          }`}
        >
          <StreetIcon className="w-3.5 h-3.5" />
          <span>{isMr ? "रस्ता" : "Street"}</span>
        </button>
      </div>

      {/* BOTTOM RIGHT: Whole Village Area & Zoom to Farm Buttons */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleZoomToAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md text-soil-primary text-xs font-bold shadow-subtle border border-surface-border/90 hover:bg-white active:scale-95 transition-all cursor-pointer"
          title={isMr ? "संपूर्ण माळेगाव क्षेत्र पहा" : "View Whole Malegaon Area (All Gats)"}
        >
          <Layers className="w-3.5 h-3.5 text-soil-primary" />
          <span>{isMr ? "संपूर्ण माळेगाव क्षेत्र (सर्व गट)" : "Whole Malegaon Area (All Gats)"}</span>
        </button>

        {selectedGatNo && (
          <button
            type="button"
            onClick={handleZoomToFarm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md text-soil-primary text-xs font-bold shadow-subtle border border-surface-border/90 hover:bg-white active:scale-95 transition-all cursor-pointer"
            title={isMr ? "माझे शेत झूम करा" : "Center on My Farm"}
          >
            <MapPin className="w-3.5 h-3.5 text-soil-primary" />
            <span>{isMr ? `गट ${selectedGatNo} पहा` : `Focus Gat ${selectedGatNo}`}</span>
          </button>
        )}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
          <Compass className="w-7 h-7 animate-spin text-emerald-400" />
          <span className="text-xs font-semibold">
            {isMr ? "उपग्रह नकाशा लोड होत आहे..." : "Loading Satellite Background..."}
          </span>
        </div>
      )}
    </div>
  );
};
