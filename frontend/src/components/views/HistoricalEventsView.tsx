import React from 'react';
import {
  History,
  Calendar,
  CloudRain,
  Route,
  AlertTriangle
} from 'lucide-react';
import { HistoricalEvent } from '../../types';

interface HistoricalEventsViewProps {
  events: HistoricalEvent[];
  selectedState?: string;
}

export const HistoricalEventsView: React.FC<HistoricalEventsViewProps> = ({
  events,
  selectedState = 'Sikkim'
}) => {
  const sortedEvents = [...events].sort((a, b) => {
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
            <History className="w-5 h-5 text-[#587A68]" />
            <h1 className="font-semibold text-sm text-[#172126] tracking-wide">
              HISTORICAL LANDSLIDE INVENTORY & TRIGGER BENCHMARK
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C58A24]/10 text-[#C58A24] border border-[#C58A24]/25 font-semibold">
              SYNTHETIC DEMONSTRATION
            </span>
          </div>
          <p className="text-xs text-[#667579] mt-1">
            Geological Survey of India landslide catalog records used to calibrate dynamic rainfall threshold curves and recurrent slope scar reactivation zones.
          </p>
        </div>
      </div>

      {/* Historical Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sortedEvents.map((evt) => (
          <div
            key={evt.id}
            className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 space-y-3 shadow-subtle transition-all card-hover-lift hover:border-[#CBD5D2]"
          >
            <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-[#172126]">{evt.location}</span>
                <span className="text-[10px] font-mono text-[#667579]">({evt.state})</span>
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#167F78]/15 text-[#167F78] border border-[#167F78]/30">
                {evt.verification_status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#E6EDEB] p-2.5 rounded-lg border border-[#D7DEDC]">
                <div className="text-[10px] text-[#667579] flex items-center font-medium">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-[#587A68]" />
                  DATE OF OCCURRENCE
                </div>
                <div className="font-semibold text-[#172126] mt-1 font-mono">{evt.date}</div>
              </div>

              <div className="bg-[#E6EDEB] p-2.5 rounded-lg border border-[#D7DEDC]">
                <div className="text-[10px] text-[#667579] flex items-center font-medium">
                  <CloudRain className="w-3.5 h-3.5 mr-1 text-[#397FA8]" />
                  TRIGGER PRECIPITATION
                </div>
                <div className="font-semibold text-[#397FA8] mt-1 font-mono">{evt.trigger_rainfall_mm}</div>
              </div>
            </div>

            <div className="bg-[#E6EDEB] p-2.5 rounded-lg border border-[#D7DEDC] text-xs space-y-1.5">
              <div className="flex items-start space-x-2 text-[11px]">
                <Route className="w-3.5 h-3.5 text-[#C58A24] shrink-0 mt-0.5" />
                <span className="text-[#667579]"><strong className="text-[#172126]">Highway Impact:</strong> {evt.road_impact}</span>
              </div>
              <div className="flex items-start space-x-2 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-[#C95050] shrink-0 mt-0.5" />
                <span className="text-[#667579]"><strong className="text-[#172126]">Exposure:</strong> {evt.exposure_notes}</span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-[#667579] border-t border-[#D7DEDC] pt-1.5 flex justify-between">
              <span>Source: [{evt.provenance}]</span>
              <span className="text-[#C58A24] font-medium">[GSI CALIBRATION]</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};




