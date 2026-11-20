/**
 * SoilPilot - Custom Farm Boundary Service
 * Central authority for storing and synchronizing the farmer's personal drawn farm boundary
 * across all modules: My Farm Map, Soil Map, Crop Suitability, and Market Intelligence.
 */

import { calculatePolygonArea } from "./farmSubplotService";

export interface CustomFarmBoundary {
  gat_no: string;
  coordinates: [number, number][]; // [lat, lng] array
  area_sq_m: number;
  area_ha: number;
  area_acres: number;
  area_gunthas: number;
  plot_name?: string;
  farmer_name?: string;
  crop_name?: string;
  updated_at: string;
  is_session_analysis?: boolean;
}

const STORAGE_PREFIX = "soilpilot_session_boundary_gat_";
const GLOBAL_ACTIVE_KEY = "soilpilot_session_active_boundary";

// In-memory session store (fastest, volatile, strictly for current analysis)
let sessionBoundaryMemory: Record<string, CustomFarmBoundary> = {};
let activeGlobalBoundary: CustomFarmBoundary | null = null;

// Purge legacy persistent localStorage boundaries on load so earlier plot boundaries are never retained
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("soilpilot_active_custom_boundary");
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("soilpilot_custom_boundary_gat_")) {
        localStorage.removeItem(k);
      }
    }
  } catch (e) {
    // Ignore storage cleanup errors
  }
}

export const customBoundaryService = {
  /**
   * Retrieves the active boundary for this analysis session only.
   */
  getCustomBoundary(gatNo?: string): CustomFarmBoundary | null {
    if (typeof window === "undefined") return null;

    try {
      if (gatNo) {
        const cleanGat = String(gatNo).trim().replace(/[^\d]/g, "");
        if (sessionBoundaryMemory[cleanGat]) {
          return sessionBoundaryMemory[cleanGat];
        }
        const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${cleanGat}`);
        if (raw) {
          const parsed = JSON.parse(raw) as CustomFarmBoundary;
          sessionBoundaryMemory[cleanGat] = parsed;
          return parsed;
        }
      }

      // Fallback to active global boundary in current session
      if (activeGlobalBoundary) {
        if (!gatNo || String(activeGlobalBoundary.gat_no).trim().replace(/[^\d]/g, "") === String(gatNo).trim().replace(/[^\d]/g, "")) {
          return activeGlobalBoundary;
        }
      }

      const globalRaw = sessionStorage.getItem(GLOBAL_ACTIVE_KEY);
      if (globalRaw) {
        const parsed = JSON.parse(globalRaw) as CustomFarmBoundary;
        activeGlobalBoundary = parsed;
        if (!gatNo || String(parsed.gat_no).trim().replace(/[^\d]/g, "") === String(gatNo).trim().replace(/[^\d]/g, "")) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load session farm boundary:", e);
    }
    return null;
  },

  /**
   * Saves the farmer's drawn boundary strictly for this active analysis session
   * and broadcasts the update across all modules (Soil Map, Crop Suitability, Market Pricing, Reports).
   */
  saveCustomBoundary(
    gatNo: string,
    coordinates: [number, number][],
    meta?: { plot_name?: string; farmer_name?: string; crop_name?: string }
  ): CustomFarmBoundary {
    const cleanGat = String(gatNo).trim().replace(/[^\d]/g, "") || "22";
    const area = calculatePolygonArea(coordinates);

    const boundary: CustomFarmBoundary = {
      gat_no: cleanGat,
      coordinates,
      area_sq_m: area.sqMeters,
      area_ha: area.hectares,
      area_acres: area.acres,
      area_gunthas: area.gunthas,
      plot_name: meta?.plot_name || "My Farm Parcel",
      farmer_name: meta?.farmer_name,
      crop_name: meta?.crop_name,
      updated_at: new Date().toISOString(),
      is_session_analysis: true,
    };

    sessionBoundaryMemory[cleanGat] = boundary;
    activeGlobalBoundary = boundary;

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`${STORAGE_PREFIX}${cleanGat}`, JSON.stringify(boundary));
        sessionStorage.setItem(GLOBAL_ACTIVE_KEY, JSON.stringify(boundary));
      } catch (e) {
        // sessionStorage quota or security error fallback
      }

      // Broadcast to all active analysis listeners (Soil Map, Crop Suitability, Market Intelligence, Reports)
      window.dispatchEvent(new CustomEvent("soilpilot_farm_boundary_updated", { detail: boundary }));
      window.dispatchEvent(new Event("soilpilot_gat_changed"));
    }

    return boundary;
  },

  /**
   * Resets the boundary back to the official full cadastral Gat survey boundary.
   */
  clearCustomBoundary(gatNo?: string): void {
    if (gatNo) {
      const cleanGat = String(gatNo).trim().replace(/[^\d]/g, "");
      delete sessionBoundaryMemory[cleanGat];
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(`${STORAGE_PREFIX}${cleanGat}`);
        } catch {}
      }
    }
    activeGlobalBoundary = null;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(GLOBAL_ACTIVE_KEY);
      } catch {}
      window.dispatchEvent(new CustomEvent("soilpilot_farm_boundary_updated", { detail: null }));
    }
  },

  /**
   * Checks if a custom boundary is currently active for this Gat.
   */
  hasCustomBoundary(gatNo?: string): boolean {
    return this.getCustomBoundary(gatNo) !== null;
  },

  /**
   * Converts coordinates to a standard GeoJSON Polygon format { type: "Polygon", coordinates: [[[lng, lat], ...]] }
   */
  toGeoJSONPolygon(boundary: CustomFarmBoundary): any {
    if (!boundary.coordinates || boundary.coordinates.length < 3) return null;
    const ring = boundary.coordinates.map(([lat, lng]) => [lng, lat]);
    // Close the ring if not closed
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
      ring.push([ring[0][0], ring[0][1]]);
    }
    return {
      type: "Polygon",
      coordinates: [ring],
    };
  },
};
