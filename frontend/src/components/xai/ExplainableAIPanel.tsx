import React, { useState } from 'react';
import {
  Droplets,
  Mountain,
  History,
  Layers,
  CheckCircle2,
  ArrowDown,
  Send
} from 'lucide-react';
import { RiskZone } from '../../types';

interface ExplainableAIPanelProps {
  zone: RiskZone;
  onTriggerSOP: () => void;
}

export const ExplainableAIPanel: React.FC<ExplainableAIPanelProps> = ({ zone, onTriggerSOP }) => {
  const [activeTab, setActiveTab] = useState<'workflow' | 'xai_breakdown' | 'cross_section'>('workflow');

  const exp = zone.risk_drivers_explanation;
  const factors = [
    {
      name: 'Rainfall Saturation (72h)',
      pct: exp.rainfall_contribution_pct,
      color: 'bg-[#397FA8]',
      textColor: 'text-[#397FA8]',
      icon: Droplets,
      metric: `${zone.rainfall_72h_mm} mm antecedent`
    },
    {
      name: 'Geotechnical Slope Angle',
      pct: exp.slope_contribution_pct,
      color: 'bg-[#C95050]',
      textColor: 'text-[#C95050]',
      icon: Mountain,
      metric: `${zone.slope_deg}° shear gradient`
    },
    {
      name: 'Pore Soil Moisture Saturation',
      pct: exp.soil_moisture_contribution_pct,
      color: 'bg-[#C58A24]',
      textColor: 'text-[#C58A24]',
      icon: Droplets,
      metric: `${zone.soil_moisture_pct}% saturation`
    },
    {
      name: 'Historical Susceptibility Frequency',
      pct: exp.historical_landslide_pct,
      color: 'bg-[#587A68]',
      textColor: 'text-[#587A68]',
      icon: History,
      metric: `${zone.historical_events_5y} events / 5y`
    },
    {
      name: 'Lithology & Colluvium Jointing',
      pct: exp.lithology_contribution_pct,
      color: 'bg-[#167F78]',
      textColor: 'text-[#167F78]',
      icon: Layers,
      metric: zone.lithology.split('&')[0]
    }
  ];

  return (
    <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 font-sans select-none flex flex-col space-y-3 shadow-subtle card-hover-lift">
      {/* 1. Header & Sector Info */}
      <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-xs text-[#172126] tracking-wider uppercase">
            DECISION SUPPORT: RISK → IMPACT → ACTION
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E6EDEB] border border-[#D7DEDC] text-[#667579] font-medium">
          {zone.state}
        </span>
      </div>

      {/* 2. Mode Selector Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-[#E6EDEB] p-1 rounded-lg border border-[#D7DEDC] text-xs">
        <button
          onClick={() => setActiveTab('workflow')}
          className={`py-1.5 rounded-md text-center transition-all font-medium text-xs cursor-pointer ${
            activeTab === 'workflow'
              ? 'bg-[#FAF8F1] text-[#172126] font-semibold shadow-subtle'
              : 'text-[#667579] hover:text-[#172126]'
          }`}
        >
          Decision Flow
        </button>

        <button
          onClick={() => setActiveTab('xai_breakdown')}
          className={`py-1.5 rounded-md text-center transition-all font-medium text-xs cursor-pointer ${
            activeTab === 'xai_breakdown'
              ? 'bg-[#FAF8F1] text-[#172126] font-semibold shadow-subtle'
              : 'text-[#667579] hover:text-[#172126]'
          }`}
        >
          Why At Risk?
        </button>

        <button
          onClick={() => setActiveTab('cross_section')}
          className={`py-1.5 rounded-md text-center transition-all font-medium text-xs cursor-pointer ${
            activeTab === 'cross_section'
              ? 'bg-[#FAF8F1] text-[#172126] font-semibold shadow-subtle'
              : 'text-[#667579] hover:text-[#172126]'
          }`}
        >
          Slope Profile
        </button>
      </div>

      {/* 3. TAB 1: SIGNATURE WORKFLOW (RISK -> IMPACT -> ACTION) */}
      {activeTab === 'workflow' && (
        <div className="space-y-2.5">
          {/* STEP 1: RISK */}
          <div className="bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg p-2.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-[#C95050] uppercase tracking-wide flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C95050] mr-1.5" />
                1. HAZARD RISK
              </span>
              <span className="font-mono text-sm font-bold text-[#C95050]">
                {Math.round(zone.landslide_probability * 100)}% · CRITICAL
              </span>
            </div>
            <p className="text-[11px] text-[#667579] leading-snug">
              High-confidence slope failure predicted at {zone.name.split('(')[0]} driven by {zone.rainfall_72h_mm}mm antecedent precipitation.
            </p>
          </div>

          <div className="flex justify-center -my-1">
            <ArrowDown className="w-3.5 h-3.5 text-[#667579]/50" />
          </div>

          {/* STEP 2: IMPACT */}
          <div className="bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg p-2.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-[#C58A24] uppercase tracking-wide flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C58A24] mr-1.5" />
                2. EXPOSURE & LIFELINE IMPACT
              </span>
              <span className="font-mono text-xs font-semibold text-[#C58A24]">
                {zone.impact_priority} PRIORITY
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#172126]">
              <div>• <strong>Road:</strong> {zone.roads_affected[0] || 'NH-10 Arterial'} Cut-off</div>
              <div>• <strong>Pop:</strong> {zone.population_exposed.toLocaleString()} residents</div>
              <div>• <strong>Villages:</strong> {zone.villages_exposed.slice(0, 2).join(', ')}</div>
              <div>• <strong>Isolation:</strong> {zone.potential_isolation}</div>
            </div>
          </div>

          <div className="flex justify-center -my-1">
            <ArrowDown className="w-3.5 h-3.5 text-[#667579]/50" />
          </div>

          {/* STEP 3: ACTION */}
          <div className="bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg p-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#167F78] uppercase tracking-wide flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#167F78] mr-1.5" />
                3. RECOMMENDED OPERATIONAL ACTION
              </span>
              <span className="text-[10px] font-mono text-[#667579]">Advisory</span>
            </div>
            <ul className="text-[11px] text-[#172126] space-y-1">
              {zone.recommended_actions.slice(0, 3).map((act, i) => (
                <li key={i} className="flex items-start space-x-1.5">
                  <CheckCircle2 className="w-3 h-3 text-[#167F78] shrink-0 mt-0.5" />
                  <span>{act}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={onTriggerSOP}
              className="w-full mt-2 py-1.5 rounded-lg bg-[#FAF8F1] hover:bg-[#FAF8F1]/80 border border-[#D7DEDC] text-[#167F78] hover:text-[#172126] font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-subtle"
            >
              <Send className="w-3 h-3" />
              <span>Review Standard Operating Procedures (SOP)</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. TAB 2: EXPLAINABLE AI FACTOR BREAKDOWN */}
      {activeTab === 'xai_breakdown' && (
        <div className="space-y-2.5">
          <div className="text-[11px] text-[#667579] font-semibold uppercase flex items-center justify-between">
            <span>RISK FACTOR CONTRIBUTION</span>
            <span className="font-mono text-[10px] text-[#397FA8]">[SYNTHETIC DEMO]</span>
          </div>

          <div className="space-y-2">
            {factors.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-[#172126]">
                      <Icon className={`w-3 h-3 ${f.textColor}`} />
                      <span className="font-medium text-[11px]">{f.name}</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-[#172126]">{f.pct}%</span>
                  </div>
                  <div className="w-full bg-[#E6EDEB] rounded-full h-1.5 overflow-hidden border border-[#D7DEDC]">
                    <div className={`${f.color} h-full rounded-full transition-all`} style={{ width: `${f.pct}%` }} />
                  </div>
                  <div className="text-[10px] font-mono text-[#667579]">{f.metric}</div>
                </div>
              );
            })}
          </div>

          <div className="bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg p-2 text-[11px] text-[#172126] leading-relaxed">
            <strong className="text-[#C58A24]">Primary Trigger:</strong> {exp.critical_trigger}
          </div>
        </div>
      )}

      {/* 5. TAB 3: GEOTECHNICAL SLOPE CROSS-SECTION */}
      {activeTab === 'cross_section' && (
        <div className="space-y-2.5">
          <div className="text-[11px] text-[#667579] font-semibold uppercase flex items-center justify-between">
            <span>GEOTECHNICAL CROSS-SECTION PROFILE</span>
            <span className="font-mono text-[10px] text-[#397FA8]">{zone.elevation_m}m AMSL</span>
          </div>

          {/* SVG Terrain Cross Section Diagram */}
          <div className="bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg p-2.5 flex flex-col items-center shadow-subtle">
            <svg viewBox="0 0 300 130" className="w-full h-32">
              {/* Sky Background */}
              <rect x="0" y="0" width="300" height="130" fill="#FAF8F1" />
              
              {/* Bedrock Layer */}
              <polygon points="0,130 0,65 160,22 300,95 300,130" fill="#D7DEDC" />
              <text x="70" y="115" fill="#667579" fontSize="8" fontWeight="bold" fontFamily="monospace">BEDROCK (Gneissic Crystalline)</text>
              
              {/* Weathered Colluvium Soil Layer */}
              <polygon points="0,65 160,22 300,95 280,110 150,40 0,82" fill="#CBD5D2" opacity="0.85" />
              <text x="12" y="55" fill="#172126" fontSize="8" fontWeight="bold" fontFamily="sans-serif">WEATHERED COLLUVIUM</text>
              
              {/* Failure Slip Surface Line */}
              <path d="M 40,75 Q 150,38 260,100" stroke="#C95050" strokeWidth="2.5" strokeDasharray="4 2" fill="none" />
              <text x="145" y="60" fill="#C95050" fontSize="8" fontWeight="bold" fontFamily="sans-serif">CRITICAL SLIP SURFACE</text>
              
              {/* Pore Water Table / Saturation (Blue Fill) */}
              <path d="M 70,80 Q 160,45 240,102 L 240,122 L 70,122 Z" fill="#397FA8" opacity="0.25" />
              <text x="15" y="100" fill="#397FA8" fontSize="8" fontWeight="bold" fontFamily="monospace">PORE WATER TABLE ({zone.soil_moisture_pct}%)</text>
              
              {/* Slope Angle Indicator */}
              <line x1="160" y1="22" x2="230" y2="22" stroke="#667579" strokeWidth="1" strokeDasharray="2 2" />
              <text x="175" y="18" fill="#172126" fontSize="9" fontFamily="monospace">{zone.slope_deg}° Slope Gradient</text>
            </svg>
          </div>

          {/* Geotechnical Parameters */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC]">
              <span className="text-[#667579] text-[10px] block font-sans font-medium">Factor of Safety (FoS):</span>
              <span className="text-[#C95050] font-bold text-sm">FoS 0.86 (Unstable &lt;1.0)</span>
            </div>
            <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC]">
              <span className="text-[#667579] text-[10px] block font-sans font-medium">Pore Water Stress:</span>
              <span className="text-[#397FA8] font-bold text-sm">48.2 kPa (Elevated)</span>
            </div>
          </div>

          <div className="text-[10px] text-[#C58A24] font-mono border-t border-[#D7DEDC] pt-1 flex justify-between">
            <span>FoS 0.86 · Synthetic geotechnical estimate</span>
            <span>[SYNTHETIC]</span>
          </div>
        </div>
      )}
    </div>
  );
};
