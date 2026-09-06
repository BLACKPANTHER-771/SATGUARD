import React, { useState } from 'react';
import {
  Droplets,
  TrendingUp
} from 'lucide-react';
import { SoilMoistureStation } from '../../types';

interface SoilMoistureViewProps {
  stations: SoilMoistureStation[];
  selectedState?: string;
}

export const SoilMoistureView: React.FC<SoilMoistureViewProps> = ({
  stations,
  selectedState = 'Sikkim'
}) => {
  const [activeLayer, setActiveLayer] = useState<'sensor' | 'satellite'>('sensor');
  const sortedStations = [...stations].sort((a, b) => {
    if (selectedState && selectedState !== 'ALL') {
      const aMatch = a.state.toLowerCase().includes(selectedState.toLowerCase());
      const bMatch = b.state.toLowerCase().includes(selectedState.toLowerCase());
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
    }
    return 0;
  });

  return (
    <div className="h-full flex flex-col space-y-3 font-sans select-none overflow-y-auto pr-1">
      {/* Header */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-subtle card-hover-lift">
        <div>
          <div className="flex items-center space-x-2">
            <Droplets className="w-5 h-5 text-[#167F78]" />
            <h1 className="font-semibold text-sm text-[#172126] tracking-wide">
              SOIL MOISTURE & PORE-WATER SATURATION NETWORK
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C58A24]/10 text-[#C58A24] border border-[#C58A24]/25 font-semibold">
              SYNTHETIC SENSOR NETWORK
            </span>
          </div>
          <p className="text-xs text-[#667579] mt-1">
            Spatial monitoring of volumetric water content, pore-pressure build-up, and critical shear liquefaction thresholds across high-risk mountain sectors.
          </p>
        </div>

        {/* Dual Mode Switcher: Sensor vs Satellite */}
        <div className="flex items-center bg-[#E6EDEB] p-1 rounded-lg border border-[#D7DEDC] text-xs">
          <button
            onClick={() => setActiveLayer('sensor')}
            className={`px-3 py-1.5 rounded-md transition-colors text-xs font-semibold cursor-pointer ${
              activeLayer === 'sensor'
                ? 'bg-[#FAF8F1] text-[#167F78] shadow-subtle'
                : 'text-[#667579] hover:text-[#172126]'
            }`}
          >
            IN-SITU SENSORS
          </button>
          <button
            onClick={() => setActiveLayer('satellite')}
            className={`px-3 py-1.5 rounded-md transition-colors text-xs font-semibold cursor-pointer ${
              activeLayer === 'satellite'
                ? 'bg-[#FAF8F1] text-[#167F78] shadow-subtle'
                : 'text-[#667579] hover:text-[#172126]'
            }`}
          >
            SATELLITE ESTIMATED
          </button>
        </div>
      </div>

      {/* Sensor Station Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {sortedStations.map((st) => (
          <div
            key={st.id}
            className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 space-y-2.5 shadow-subtle hover:border-[#CBD5D2] transition-all card-hover-lift"
          >
            <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2">
              <span className="text-xs font-semibold text-[#172126] truncate">{st.name}</span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#167F78]/15 text-[#167F78] border border-[#167F78]/30">
                {st.sensor_health}
              </span>
            </div>

            <div className="text-[11px] text-[#667579] font-mono">
              GPS: {st.lat.toFixed(3)}°N, {st.lng.toFixed(3)}°E ({st.state})
            </div>

            <div className="bg-[#E6EDEB] p-2.5 rounded-lg border border-[#D7DEDC] flex items-baseline justify-between">
              <span className="text-[10px] text-[#667579] font-medium">VOLUMETRIC MOISTURE:</span>
              <span className="text-xl font-bold font-mono text-[#167F78]">{st.moisture_pct}%</span>
            </div>

            <div className="text-[11px] text-[#C58A24] font-medium flex items-center justify-between">
              <span className="flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                {st.saturation_trend}
              </span>
              <span className="text-[10px] font-mono text-[#667579]">Capacitive 30cm</span>
            </div>

            <div className="text-[10px] font-mono text-[#667579] border-t border-[#D7DEDC] pt-1.5 flex justify-between">
              <span>Source: [{st.provenance}]</span>
              <span className="text-[#C58A24] font-medium">[SYNTHETIC]</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};




