"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/i18n/useI18n";
import { SoilReportFieldInfo, SoilReportFarmerInfo, SoilReportMetadata } from "@/types/soilHealth";
import {
  translateGeoName,
  translateFarmerName,
  formatGatLabel,
} from "@/i18n/marathiHelper";
import { getLiveDateStr } from "@/lib/dateUtils";
import { customBoundaryService } from "@/services/customBoundaryService";

interface FarmerSampleInfoTableProps {
  farmer: SoilReportFarmerInfo;
  field: SoilReportFieldInfo;
  report: SoilReportMetadata | null;
}

export const FarmerSampleInfoTable: React.FC<FarmerSampleInfoTableProps> = ({
  farmer,
  field,
  report,
}) => {
  const { t, locale } = useI18n();
  const isMr = locale === "mr";

  const farmerName =
    translateFarmerName(farmer?.name, isMr) ||
    (isMr ? "शेतकरी" : "Farmer");

  const gatNumber = field?.gat_no || "22";
  const gatLabel = `${isMr ? "गट क्र." : "Gat No."} ${gatNumber}`;

  const [customBoundary, setCustomBoundary] = useState<any>(null);

  useEffect(() => {
    setCustomBoundary(customBoundaryService.getCustomBoundary(gatNumber));
    const handleBoundaryUpdated = () => {
      setCustomBoundary(customBoundaryService.getCustomBoundary(gatNumber));
    };
    window.addEventListener("soilpilot_farm_boundary_updated", handleBoundaryUpdated);
    return () => window.removeEventListener("soilpilot_farm_boundary_updated", handleBoundaryUpdated);
  }, [gatNumber]);

  const rawArea = customBoundary
    ? customBoundary.area_ha
    : field?.area
      ? field.area
      : (gatNumber === "22" ? 1.49 : null);

  const areaPart = customBoundary
    ? ` (${customBoundary.area_acres} ${isMr ? "एकर - रेखांकित शेत" : "acres - demarcated farm"})`
    : rawArea
      ? ` (${(rawArea * 2.47105).toFixed(2)} ${isMr ? "एकर" : "acres"})`
      : "";

  const villageName = translateGeoName(field?.village || "Malegaon Kh.", isMr);
  const talukaName = translateGeoName(field?.taluka || "Baramati", isMr);
  const districtName = translateGeoName(field?.district || "Pune", isMr);

  // Live date for the day
  const displayDate = getLiveDateStr(report?.report_date);

  const cleanGatNumber = String(gatNumber).replace(/[^\d]/g, "") || "54";

  return (
    <div className="mb-3 print:mb-2">
      {/* Information Table & Cadastral Field Boundary Map */}
      <div className="flex flex-col md:flex-row items-stretch border border-[#cbd5e1] text-xs text-stone-900 bg-white">
        <div className="flex-1 overflow-hidden">
          <table className="w-full border-collapse h-full">
            <tbody>
              {/* Row 1: Farmer's Name & Taluka */}
              <tr className="border-b border-[#cbd5e1]">
                <td className="w-[20%] px-3 py-1.5 print:px-2 print:py-1 font-bold text-stone-900 border-r border-[#cbd5e1] text-[11px] sm:text-xs print:text-[10px]">
                  {locale === "mr" ? "शेतकऱ्याचे नाव" : "Farmer's Name"}
                </td>
                <td className="w-[30%] px-3 py-1.5 print:px-2 print:py-1 text-stone-900 font-medium border-r border-[#cbd5e1] text-[11px] sm:text-xs print:text-[10px]">
                  {farmerName}
                </td>
                <td className="w-[20%] px-3 py-1.5 print:px-2 print:py-1 font-bold text-stone-900 border-r border-[#cbd5e1] text-[11px] sm:text-xs print:text-[10px]">
                  {locale === "mr" ? "तालुका" : "Taluka"}
                </td>
                <td className="w-[30%] px-3 py-1.5 print:px-2 print:py-1 text-stone-900 font-medium text-[11px] sm:text-xs print:text-[10px]">
                  {talukaName}
                </td>
              </tr>

              {/* Row 2: Gat No. & District */}
              <tr className="border-b border-[#cbd5e1]">
                <td className="px-3 py-1.5 print:px-2 print:py-1 font-bold text-stone-900 border-r border-[#cbd5e1] text-[11px] sm:text-xs print:text-[10px]">
                  {locale === "mr" ? "गट क्र." : "Gat No."}
                </td>
                <td className="px-3 py-1.5 print:px-2 print:py-1 text-stone-900 font-medium border-r border-[#cbd5e1] text-[11px] sm:text-xs print:text-[10px]">
                  {gatLabel}{areaPart}
                </td>
                <td className="px-3 py-1.5 print:px-2 print:py-1 font-bold text-stone-900 border-r border-[#cbd5e1] text-[11px] sm:text-xs print:text-[10px]">
                  {locale === "mr" ? "जिल्हा" : "District"}
                </td>
                <td className="px-3 py-1.5 print:px-2 print:py-1 text-stone-900 font-medium text-[11px] sm:text-xs print:text-[10px]">
                  {districtName}
                </td>
              </tr>

              {/* Row 3: Village & Date */}
              <tr>
                <td className="px-3 py-1.5 print:px-2 print:py-1 font-bold text-stone-900 border-r border-[#cbd5e1] text-[11px] sm:text-xs print:text-[10px]">
                  {locale === "mr" ? "गाव" : "Village"}
                </td>
                <td className="px-3 py-1.5 print:px-2 print:py-1 text-stone-900 font-medium border-r border-[#cbd5e1] text-[11px] sm:text-xs print:text-[10px]">
                  {villageName}
                </td>
                <td className="px-3 py-1.5 print:px-2 print:py-1 font-bold text-stone-900 border-r border-[#cbd5e1] text-[11px] sm:text-xs print:text-[10px]">
                  {locale === "mr" ? "दिनांक" : "Date"}
                </td>
                <td className="px-3 py-1.5 print:px-2 print:py-1 text-stone-900 font-medium text-[11px] sm:text-xs print:text-[10px]">
                  {displayDate}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Small photo of field from My Farm showing Gat boundary */}
        <div className="w-full md:w-56 border-t md:border-t-0 md:border-l border-[#cbd5e1] bg-white p-2 flex flex-col justify-between shrink-0">
          <div className="relative rounded-xl overflow-hidden border border-stone-200 shadow-2xs bg-[#1E2E23]">
            <img
              src={`/api/cadastre/thumbnail/${cleanGatNumber}`}
              alt={`Gat ${cleanGatNumber} Cadastral Boundary`}
              className="w-full h-auto object-cover block"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/data/cadastre_thumbnails/gat_35.png";
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5 px-0.5 text-[10.5px] text-stone-600 font-medium">
            <span>
              {locale === "mr" ? `गट क्र. ${cleanGatNumber} • भूखंड रेखांकन` : `Gat No. ${cleanGatNumber} • Cadastral Boundary`}
            </span>
            <a
              href={`/my-farm?gat=${cleanGatNumber}`}
              className="text-[#1B4D3E] font-bold hover:underline"
            >
              {locale === "mr" ? "माझे शेत →" : "My Farm →"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
