"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import { SoilParameter } from "@/types/soilHealth";
import { Activity, Droplets, Leaf, Zap, Shield, Sparkles } from "lucide-react";

interface SoilHealthSummaryCardsProps {
  parameters: SoilParameter[];
}

export const SoilHealthSummaryCards: React.FC<SoilHealthSummaryCardsProps> = ({ parameters }) => {
  const { t, locale } = useI18n();

  const getParam = (key: string) => {
    return parameters.find((p) => p.key === key);
  };

  const phParam = getParam("ph");
  const ecParam = getParam("ec");
  const ocParam = getParam("organic_carbon");
  const nParam = getParam("available_nitrogen");
  const pParam = getParam("available_phosphorus");
  const kParam = getParam("available_potassium");

  const cards = [
    {
      title: locale === "mr" ? "मातीचा सामू (pH)" : "Soil pH",
      value: phParam?.value !== null && phParam?.value !== undefined ? phParam.value : "—",
      unit: "",
      status: locale === "mr" ? phParam?.interpretation_mr || "विम्लधर्मी" : phParam?.interpretation || "Alkaline",
      description: locale === "mr" 
        ? "माती किंचित विम्लधर्मी आहे (टियर १ अचूकता). सूक्ष्म अन्नद्रव्यांची उपलब्धता योग्य राखण्यासाठी सेंद्रिय खतांचा वापर वाढवा." 
        : "Soil reaction is moderately alkaline (Tier 1 prediction). Organic matter application will maintain ideal micronutrient uptake.",
      icon: <Activity className="w-5 h-5 text-amber-600" />,
      bgClass: "bg-amber-50/60 border-amber-200",
      statusClass: "bg-amber-100 text-amber-800 border-amber-300",
    },
    {
      title: locale === "mr" ? "विद्युत वाहकता (EC)" : "Electrical Conductivity",
      value: ecParam?.value !== null && ecParam?.value !== undefined && ecParam?.value !== "—" ? ecParam.value : "—",
      unit: ecParam?.value !== null && ecParam?.value !== undefined && ecParam?.value !== "—" ? "dS/m" : "",
      status: ecParam?.value !== null && ecParam?.value !== undefined && ecParam?.value !== "—"
        ? (locale === "mr" ? ecParam?.interpretation_mr || "सुरक्षित" : ecParam?.interpretation || "Normal")
        : (locale === "mr" ? "प्रयोगशाळा चाचणी आवश्यक" : "Requires Lab Test"),
      description: ecParam?.value !== null && ecParam?.value !== undefined && ecParam?.value !== "—"
        ? (locale === "mr" ? "मातीतील क्षारांचे प्रमाण सर्वसाधारण व सुरक्षित आहे." : "Soil salinity is well within the safe normal limit.")
        : (locale === "mr" ? "स्थानिक व्यवस्थापनामुळे अचूकतेची मर्यादा; अचूकतेसाठी थेट प्रयोगशाळा चाचणी आवश्यक आहे." : "Screening model has low accuracy across parcels. Direct laboratory testing required."),
      icon: <Zap className="w-5 h-5 text-stone-600" />,
      bgClass: ecParam?.value !== null && ecParam?.value !== undefined && ecParam?.value !== "—" ? "bg-emerald-50/60 border-emerald-200" : "bg-stone-50 border-stone-200",
      statusClass: ecParam?.value !== null && ecParam?.value !== undefined && ecParam?.value !== "—" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-stone-100 text-stone-700 border-stone-300",
    },
    {
      title: locale === "mr" ? "सेंद्रिय कर्ब (OC)" : "Organic Carbon",
      value: ocParam?.value !== null && ocParam?.value !== undefined ? `${ocParam.value}%` : "—",
      unit: "%",
      status: locale === "mr" ? ocParam?.interpretation_mr || "मध्यम" : ocParam?.interpretation || "Medium",
      description: locale === "mr" 
        ? "सेंद्रिय कर्बाचे प्रमाण मध्यम आहे (टियर २ अचूकता). पिकांचे अवशेष जमिनीत गाडून सेंद्रिय कर्ब टिकवून ठेवावा." 
        : "Organic carbon status is moderate (Tier 2 prediction). Maintain soil organic matter through crop residue recycling.",
      icon: <Leaf className="w-5 h-5 text-soil-primary" />,
      bgClass: "bg-soil-cream/60 border-soil-secondary/30",
      statusClass: "bg-soil-primaryLight text-soil-primary border-soil-primary/20",
    },
    {
      title: locale === "mr" ? "उपलब्ध नत्र (N)" : "Available Nitrogen",
      value: nParam?.value !== null && nParam?.value !== undefined ? `${nParam.value}` : "—",
      unit: "kg/ha",
      status: locale === "mr" ? nParam?.interpretation_mr || "कमी" : nParam?.interpretation || "Low",
      description: locale === "mr" 
        ? "मातीतील नत्राचे प्रमाण कमी आहे (टियर २ अचूकता). पिकांच्या वाढीनुसार युरिया/नत्र खते हप्त्यांमध्ये विभागून द्यावीत." 
        : "Available nitrogen is low (Tier 2 prediction). Split applications of nitrogen or green manuring are recommended.",
      icon: <Droplets className="w-5 h-5 text-rose-600" />,
      bgClass: "bg-rose-50/60 border-rose-200",
      statusClass: "bg-rose-100 text-rose-800 border-rose-300",
    },
    {
      title: locale === "mr" ? "उपलब्ध स्फुरद (P)" : "Available Phosphorus",
      value: pParam?.value !== null && pParam?.value !== undefined && pParam?.value !== "—" ? `${pParam.value}` : "—",
      unit: pParam?.value !== null && pParam?.value !== undefined && pParam?.value !== "—" ? "kg/ha" : "",
      status: pParam?.value !== null && pParam?.value !== undefined && pParam?.value !== "—"
        ? (locale === "mr" ? pParam?.interpretation_mr || "मध्यम" : pParam?.interpretation || "Medium")
        : (locale === "mr" ? "प्रयोगशाळा चाचणी आवश्यक" : "Requires Lab Test"),
      description: pParam?.value !== null && pParam?.value !== undefined && pParam?.value !== "—"
        ? (locale === "mr" ? "स्फुरदाचे प्रमाण मध्यम आहे. शिफारसीनुसार खतांचा संतुलित वापर करा." : "Phosphorus is at a medium level. Balanced phosphatic fertilization recommended.")
        : (locale === "mr" ? "स्थानिक खत वापरामुळे शेतानुसार प्रमाण बदलते; अचूकतेसाठी थेट प्रयोगशाळा चाचणी आवश्यक आहे." : "Driven by localized farmer fertilization. Direct certified laboratory testing required."),
      icon: <Sparkles className="w-5 h-5 text-stone-600" />,
      bgClass: pParam?.value !== null && pParam?.value !== undefined && pParam?.value !== "—" ? "bg-amber-50/60 border-amber-200" : "bg-stone-50 border-stone-200",
      statusClass: pParam?.value !== null && pParam?.value !== undefined && pParam?.value !== "—" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-stone-100 text-stone-700 border-stone-300",
    },
    {
      title: locale === "mr" ? "उपलब्ध पालाश (K)" : "Available Potassium",
      value: kParam?.value !== null && kParam?.value !== undefined && kParam?.value !== "—" ? `${kParam.value}` : "—",
      unit: kParam?.value !== null && kParam?.value !== undefined && kParam?.value !== "—" ? "kg/ha" : "",
      status: kParam?.value !== null && kParam?.value !== undefined && kParam?.value !== "—"
        ? (locale === "mr" ? kParam?.interpretation_mr || "जास्त" : kParam?.interpretation || "High")
        : (locale === "mr" ? "प्रयोगशाळा चाचणी आवश्यक" : "Requires Lab Test"),
      description: kParam?.value !== null && kParam?.value !== undefined && kParam?.value !== "—"
        ? (locale === "mr" ? "मातीतील पालाश प्रमाण योग्य आहे." : "Soil potassium is abundant.")
        : (locale === "mr" ? "पालाशच्या स्थानिक वापरामुळे अचूकतेची मर्यादा; थेट प्रयोगशाळा माती परीक्षण आवश्यक आहे." : "High field-to-field management variation. Direct laboratory testing required."),
      icon: <Shield className="w-5 h-5 text-stone-600" />,
      bgClass: kParam?.value !== null && kParam?.value !== undefined && kParam?.value !== "—" ? "bg-emerald-50/60 border-emerald-200" : "bg-stone-50 border-stone-200",
      statusClass: kParam?.value !== null && kParam?.value !== undefined && kParam?.value !== "—" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-stone-100 text-stone-700 border-stone-300",
    },
  ];

  return (
    <div className="space-y-4 mb-8">
      <div>
        <h3 className="text-base font-bold text-stone-900">
          {t("soilHealthCard.summaryTitle")}
        </h3>
        <p className="text-xs text-stone-600">
          {t("soilHealthCard.summarySubtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl border ${card.bgClass} flex flex-col justify-between shadow-xs transition-shadow hover:shadow-sm`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-stone-800">{card.title}</span>
                <div className="p-1.5 rounded-lg bg-white shadow-2xs">
                  {card.icon}
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-stone-900 font-mono">
                  {card.value}
                </span>
                {card.unit && (
                  <span className="text-xs font-semibold text-stone-500 font-mono">
                    {card.unit}
                  </span>
                )}
                <span
                  className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${card.statusClass}`}
                >
                  {card.status}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-700 mt-3 pt-2.5 border-t border-stone-200/80 leading-relaxed">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
