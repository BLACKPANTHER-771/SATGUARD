import React, { useState } from 'react';
import {
  BarChart3,
  MapPin,
  Mountain,
  Activity,
  Shield,
  Eye,
  Info
} from 'lucide-react';
import { RiskZone } from '../../types';
import { RedZoneInspector } from '../intelligence/RedZoneInspector';
import { getRiskBadgeClasses, getRiskColor, getRiskLevel, InterpretableRiskEngine } from '../../services/riskEngine';

interface RiskIntelligenceViewProps {
  zones: RiskZone[];
  selectedZone: RiskZone;
  onSelectZone: (zone: RiskZone) => void;
  selectedState?: string;
}

export const RiskIntelligenceView: React.FC<RiskIntelligenceViewProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  selectedState = 'Sikkim'
}) => {
  const [inspectingZone, setInspectingZone] = useState<RiskZone | null>(null);

  return (
    <div className="h-full flex flex-col space-y-3 font-sans select-none overflow-y-auto pr-1">
      {/* Header */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-subtle card-hover-lift">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-[#167F78]" />
            <h1 className="font-semibold text-sm text-[#172126] tracking-wide">
              INTERPRETABLE MULTI-FACTOR LANDSLIDE RISK INTELLIGENCE ({selectedState.toUpperCase()})
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C58A24]/10 text-[#C58A24] border border-[#C58A24]/25 font-semibold">
              SYNTHETIC DEMONSTRATION
            </span>
          </div>
          <p className="text-xs text-[#667579] mt-1">
            Interpretable multi-criteria evaluation of antecedent precipitation, geometrical slope angle, volumetric soil saturation, and infrastructure exposure.
          </p>
        </div>
      </div>

      {/* Zone Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {zones.map((z) => {
          const isSelected = selectedZone?.id === z.id;
          const calc = InterpretableRiskEngine.evaluateRisk({
            zoneId: z.id,
            zoneName: z.name,
            state: z.state,
            district: z.district,
            lat: z.lat,
            lng: z.lng,
            elevation_m: z.elevation_m,
            slope_deg: z.slope_deg,
            soil_moisture_pct: z.soil_moisture_pct,
            rainfall_1h_mm: z.rainfall_1h_mm,
            rainfall_72h_mm: z.rainfall_72h_mm,
            historical_events_5y: z.historical_events_5y,
            lithology: z.lithology,
            population_exposed: z.population_exposed,
            villages_exposed: z.villages_exposed,
            roads_affected: z.roads_affected,
            critical_facilities: z.critical_facilities_affected,
            threatened_bridges: z.key_assets?.filter(a => /bridge|span/i.test(a))
          });

          const score = calc.riskScore;
          const level = calc.riskLevel;
          const badgeClasses = getRiskBadgeClasses(level);
          const riskColor = getRiskColor(level);

          return (
            <div
              key={z.id}
              onClick={() => {
                onSelectZone(z);
                setInspectingZone(z);
              }}
              className={`bg-[#FAF8F1] border rounded-xl p-3.5 space-y-3 cursor-pointer transition-all shadow-subtle card-hover-lift ${
                isSelected
                  ? 'border-[#167F78] bg-[#FAF8F1] ring-1 ring-[#167F78]'
                  : 'border-[#D7DEDC] hover:border-[#CBD5D2]'
              }`}
            >
              <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2">
                <div className="font-semibold text-[#172126] text-xs truncate">{z.name}</div>
                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded shrink-0 ml-2 border ${badgeClasses}`}
                >
                  {level}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#E6EDEB] p-2.5 rounded-lg border border-[#D7DEDC]">
                  <span className="text-[10px] text-[#667579] block font-medium">RISK SCORE</span>
                  <span
                    className="text-lg font-bold font-mono mt-0.5 block"
                    style={{ color: riskColor }}
                  >
                    {score}%
                  </span>
                </div>
                <div className="bg-[#E6EDEB] p-2.5 rounded-lg border border-[#D7DEDC]">
                  <span className="text-[10px] text-[#667579] block font-medium">RESPONSE PRIORITY</span>
                  <span className="text-sm font-bold text-[#167F78] font-mono mt-1 block truncate">
                    {calc.responsePriority.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-[#667579] block font-mono">
                    Exp: {calc.exposureScore}/100
                  </span>
                </div>
              </div>

              {/* Factors Mini Progress */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[11px] text-[#667579]">
                  <span>Rainfall 72h ({z.rainfall_72h_mm}mm):</span>
                  <span className="text-[#172126] font-mono font-semibold">{z.risk_drivers_explanation?.rainfall_contribution_pct || 38}%</span>
                </div>
                <div className="w-full bg-[#E6EDEB] rounded-full h-1.5 overflow-hidden border border-[#D7DEDC]">
                  <div
                    className="bg-[#397FA8] h-full rounded-full"
                    style={{ width: `${z.risk_drivers_explanation?.rainfall_contribution_pct || 38}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-[#667579]">
                  <span>Slope Gradient ({z.slope_deg}°):</span>
                  <span className="text-[#172126] font-mono font-semibold">{z.risk_drivers_explanation?.slope_contribution_pct || 29}%</span>
                </div>
                <div className="w-full bg-[#E6EDEB] rounded-full h-1.5 overflow-hidden border border-[#D7DEDC]">
                  <div
                    className="bg-[#C95050] h-full rounded-full"
                    style={{ width: `${z.risk_drivers_explanation?.slope_contribution_pct || 29}%` }}
                  />
                </div>
              </div>

              <div className="text-[10px] font-mono text-[#667579] pt-1.5 border-t border-[#D7DEDC] flex items-center justify-between">
                <span>ELEV: {z.elevation_m}m AMSL</span>
                <span className="text-[#167F78] font-bold">CLICK TO INSPECT</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Red Zone Inspector Modal on Click */}
      {inspectingZone && (
        <RedZoneInspector
          zone={inspectingZone}
          onClose={() => setInspectingZone(null)}
          isModal={true}
        />
      )}
    </div>
  );
};


