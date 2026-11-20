/**
 * SoilPilot - Farm Sub-Plot Service
 * Manages individual farmer sub-parcels inside a shared Cadastral Gat (Survey Number).
 * Supports geodesic area calculation (Acres, Gunthas, Hectares), local & remote persistence,
 * and GeoJSON/KML exports for field surveying and Google Earth.
 */

export interface FarmSubplot {
  id: string;
  gat_no: string;
  farmer_id?: string | number;
  farmer_name: string;
  farmer_name_mr?: string;
  plot_name: string;
  crop_name?: string;
  irrigation_type?: "drip" | "sprinkler" | "flood" | "well" | "rainfed";
  color: string;
  coordinates: [number, number][]; // [lat, lng]
  area_sq_m: number;
  area_ha: number;
  area_acres: number;
  area_gunthas: number;
  created_at: string;
  notes?: string;
}

const STORAGE_KEY = "soilpilot_farm_subplots";

export function calculatePolygonArea(latLngs: [number, number][]): {
  sqMeters: number;
  hectares: number;
  acres: number;
  gunthas: number;
} {
  if (!latLngs || latLngs.length < 3) {
    return { sqMeters: 0, hectares: 0, acres: 0, gunthas: 0 };
  }

  const radius = 6378137.0; // Earth mean radius in meters
  const d2r = Math.PI / 180.0;
  let total = 0.0;
  const len = latLngs.length;

  for (let i = 0; i < len; i++) {
    const p1 = latLngs[i];
    const p2 = latLngs[(i + 1) % len];
    total +=
      (p2[1] * d2r - p1[1] * d2r) *
      (2 + Math.sin(p1[0] * d2r) + Math.sin(p2[0] * d2r));
  }

  const sqMeters = Math.abs((total * radius * radius) / 2.0);
  const hectares = sqMeters / 10000.0;
  const acres = sqMeters / 4046.8564224;
  const gunthas = acres * 40.0;

  return {
    sqMeters: Math.round(sqMeters * 10) / 10,
    hectares: Math.round(hectares * 1000) / 1000,
    acres: Math.round(acres * 100) / 100,
    gunthas: Math.round(gunthas * 10) / 10,
  };
}

export const farmSubplotService = {
  getAllSubplots(): FarmSubplot[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as FarmSubplot[];
    } catch (e) {
      console.warn("Failed to load farm subplots from localStorage:", e);
      return [];
    }
  },

  getSubplotsByGat(gatNo: string): FarmSubplot[] {
    const cleanGat = String(gatNo).trim().replace(/^gat\s*no\.?\s*/i, "").trim();
    const all = this.getAllSubplots();
    return all.filter((s) => String(s.gat_no).trim() === cleanGat);
  },

  saveSubplot(
    data: Omit<FarmSubplot, "id" | "created_at" | "area_sq_m" | "area_ha" | "area_acres" | "area_gunthas">
  ): FarmSubplot {
    const area = calculatePolygonArea(data.coordinates);
    const newPlot: FarmSubplot = {
      ...data,
      id: `subplot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      area_sq_m: area.sqMeters,
      area_ha: area.hectares,
      area_acres: area.acres,
      area_gunthas: area.gunthas,
      created_at: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const all = this.getAllSubplots();
      all.push(newPlot);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent("soilpilot_subplots_changed", { detail: newPlot.gat_no }));
    }

    return newPlot;
  },

  deleteSubplot(id: string): boolean {
    if (typeof window === "undefined") return false;
    const all = this.getAllSubplots();
    const target = all.find((p) => p.id === id);
    const filtered = all.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    if (target) {
      window.dispatchEvent(new CustomEvent("soilpilot_subplots_changed", { detail: target.gat_no }));
    }
    return true;
  },

  clearSubplotsByGat(gatNo: string): void {
    if (typeof window === "undefined") return;
    const cleanGat = String(gatNo).trim().replace(/^gat\s*no\.?\s*/i, "").trim();
    const all = this.getAllSubplots();
    const filtered = all.filter((p) => String(p.gat_no).trim() !== cleanGat);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent("soilpilot_subplots_changed", { detail: cleanGat }));
  },

  clearAllSubplots(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("soilpilot_subplots_changed", { detail: "all" }));
  },

  exportToGeoJSON(gatNo: string): string {
    const plots = this.getSubplotsByGat(gatNo);
    const features = plots.map((p) => ({
      type: "Feature",
      properties: {
        id: p.id,
        gat_no: p.gat_no,
        farmer_name: p.farmer_name,
        plot_name: p.plot_name,
        crop_name: p.crop_name,
        irrigation_type: p.irrigation_type,
        area_acres: p.area_acres,
        area_gunthas: p.area_gunthas,
        area_ha: p.area_ha,
        area_sq_m: p.area_sq_m,
        color: p.color,
        created_at: p.created_at,
        notes: p.notes,
      },
      geometry: {
        type: "Polygon",
        // GeoJSON expects [lng, lat]
        coordinates: [
          [...p.coordinates.map((c) => [c[1], c[0]]), [p.coordinates[0][1], p.coordinates[0][0]]],
        ],
      },
    }));

    return JSON.stringify(
      {
        type: "FeatureCollection",
        gat_no: gatNo,
        description: `SoilPilot Sub-Parcels for Gat ${gatNo}`,
        features,
      },
      null,
      2
    );
  },

  exportToKML(gatNo: string): string {
    const plots = this.getSubplotsByGat(gatNo);
    const placemarks = plots
      .map((p) => {
        // KML expects "lng,lat,0 lng,lat,0"
        const coordsStr = [
          ...p.coordinates.map((c) => `${c[1]},${c[0]},0`),
          `${p.coordinates[0][1]},${p.coordinates[0][0]},0`,
        ].join(" ");

        return `    <Placemark>
      <name>${escapeXml(p.plot_name)} (${escapeXml(p.farmer_name)})</name>
      <description><![CDATA[
        <b>Farmer:</b> ${p.farmer_name}<br/>
        <b>Gat No:</b> ${p.gat_no}<br/>
        <b>Area:</b> ${p.area_acres} Acres (${p.area_gunthas} Gunthas / ${p.area_ha} ha)<br/>
        <b>Crop:</b> ${p.crop_name || "N/A"}<br/>
        <b>Irrigation:</b> ${p.irrigation_type || "N/A"}<br/>
      ]]></description>
      <Style>
        <LineStyle>
          <color>ff00ffff</color>
          <width>3</width>
        </LineStyle>
        <PolyStyle>
          <color>7f00ff00</color>
        </PolyStyle>
      </Style>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordsStr}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>SoilPilot Farm Sub-Plots - Gat ${gatNo}</name>
    <description>Sub-parcel boundaries drawn by farmers for Gat ${gatNo}</description>
${placemarks}
  </Document>
</kml>`;
  },

  downloadFile(content: string, filename: string, mimeType: string) {
    if (typeof window === "undefined") return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

function escapeXml(unsafe: string): string {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
