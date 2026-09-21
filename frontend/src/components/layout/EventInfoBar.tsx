import React from 'react';
import {
  MapPin,
  Calendar,
  AlertTriangle,
  Satellite,
  CheckCircle,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Radio
} from 'lucide-react';
import { ViewType } from '../../types';

interface EventInfoBarProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  selectedState: string;
  selectedSectorName?: string;
}

export const EventInfoBar: React.FC<EventInfoBarProps> = ({
  currentView,
  onSelectView,
  selectedState,
  selectedSectorName
}) => {
  return (
    <div className="bg-[#203844] border-b border-[#284252] px-4 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs font-sans select-none z-20 shadow-xs">
      {/* LEFT: Event Identifiers & Technical Parameters */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {/* Event Badge */}
        <div className="flex items-center space-x-1.5 bg-[#C45F59]/15 text-[#C45F59] px-2 py-0.5 rounded-md border border-[#C45F59]/30 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 text-[#C45F59]" />
          <span className="font-bold uppercase tracking-wider text-[10px]">ACTIVE DISASTER:</span>
          <span className="font-semibold text-xs text-[#F3F1EA]">
            {selectedState === 'Sikkim' ? 'Sikkim Landslide & Teesta Flood' : `${selectedState} Hazard Event`}
          </span>
        </div>

        {/* AOI Corridor */}
        <div className="flex items-center space-x-1.5 text-[#718087]">
          <MapPin className="w-3.5 h-3.5 text-[#5D8F89]" />
          <span className="text-[10px] uppercase font-mono font-medium">AOI:</span>
          <span className="text-[#F3F1EA] font-semibold text-xs">
            {selectedSectorName || 'NH-10 / Rangpo–Singtam–Dikchu Corridor'}
          </span>
        </div>

        {/* Event Date */}
        <div className="flex items-center space-x-1.5 text-[#718087]">
          <Calendar className="w-3.5 h-3.5 text-[#718087]" />
          <span className="text-[10px] uppercase font-mono font-medium">Event Date:</span>
          <span className="font-mono text-[#F3F1EA] font-semibold text-xs">12 AUG 2026</span>
        </div>

        {/* Satellite Source */}
        <div className="hidden lg:flex items-center space-x-1.5 text-[#718087]">
          <Satellite className="w-3.5 h-3.5 text-[#5D8F89]" />
          <span className="text-[10px] uppercase font-mono font-medium">Source:</span>
          <span className="text-[#F3F1EA] font-mono text-xs">
            Sentinel-1 C-SAR + Sentinel-2 MSI
          </span>
        </div>

        {/* Processing Status */}
        <div className="hidden sm:flex items-center space-x-1.5 bg-[#648A6D]/15 text-[#648A6D] px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border border-[#648A6D]/25">
          <CheckCircle className="w-3 h-3 text-[#648A6D]" />
          <span>ANALYSIS READY</span>
        </div>
      </div>

      {/* RIGHT: Quick Module Switches */}
      <div className="flex items-center space-x-2">
        {currentView !== 'change_detection' && (
          <button
            onClick={() => onSelectView('change_detection')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#243F4E] hover:bg-[#2E4D5E] text-[#F3F1EA] text-[11px] font-medium border border-[#284252] transition-colors cursor-pointer"
            title="Inspect Bitemporal Changes"
          >
            <SlidersHorizontal className="w-3 h-3 text-[#5D8F89]" />
            <span>Change Detection</span>
            <ChevronRight className="w-3 h-3 text-[#718087]" />
          </button>
        )}

        {currentView !== 'damage_assessment' && (
          <button
            onClick={() => onSelectView('damage_assessment')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#5D8F89]/20 hover:bg-[#5D8F89]/30 border border-[#5D8F89]/40 text-[#F3F1EA] text-[11px] font-medium shadow-xs transition-colors cursor-pointer"
            title="Open Structural Damage Assessment Workstation"
          >
            <Eye className="w-3 h-3 text-[#5D8F89]" />
            <span>Damage Assessment</span>
          </button>
        )}
      </div>
    </div>
  );
};
