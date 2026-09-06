import React, { useState } from 'react';
import {
  Globe2,
  Activity,
  AlertTriangle,
  Navigation,
  ChevronRight,
  ChevronLeft,
  Layers,
  Shield,
  Clock,
  Sparkles,
  TrendingUp,
  X
} from 'lucide-react';
import { RiskZone } from '../../types';
import { SyntheticEarthViewer } from '../map3d/SyntheticEarthViewer';
import { SyntheticRiskEngine } from '../../data/synthetic/engine/syntheticRiskEngine';
import { NERegionCode } from '../../data/synthetic/types';

interface EarthExplorerViewProps {
  zones: RiskZone[];
  selectedZone: RiskZone;
  onSelectZone: (zone: RiskZone) => void;
  selectedState?: string;
  onSelectState?: (state: string) => void;
  timeOffset: number;
}

export const EarthExplorerView: React.FC<EarthExplorerViewProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  selectedState = 'Sikkim',
  onSelectState,
  timeOffset
}) => {
  const currentRegion: NERegionCode = selectedState?.toUpperCase() === 'ASSAM' ? 'ASSAM' : 'SIKKIM';
  const [activeTab, setActiveTab] = useState<'causes' | 'impact' | 'response'>('causes');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);

  const handleSelectRegion = (region: NERegionCode) => {
    if (onSelectState) {
      onSelectState(region === 'ASSAM' ? 'Assam' : 'Sikkim');
    }
  };

  const currentStateData = SyntheticRiskEngine.getStateData(currentRegion);
  const simulationState = SyntheticRiskEngine.calculateSimulationState(timeOffset, currentRegion);
  const isAssam = currentRegion === 'ASSAM';

  return (
    <div className="relative w-full h-full flex flex-col font-sans select-none overflow-hidden bg-[#11191D]">
      {/* 1. Full-Screen Cesium 3D Digital Twin Viewer */}
      <div className="w-full h-full flex-1 relative">
        <SyntheticEarthViewer
          selectedRegion={currentRegion}
          onSelectRegion={handleSelectRegion}
          timeOffset={timeOffset}
          className="w-full h-full"
        />

        {/* 2. Floating Toggle Button for Side Risk Intelligence Drawer */}
        <button
          onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
          className={`absolute top-16 transition-all duration-300 z-20 flex items-center space-x-1 px-2.5 py-1.5 rounded-l-xl bg-[#FAF8F1]/95 border-y border-l border-[#D7DEDC] shadow-panel backdrop-blur-md text-xs font-semibold text-[#172126] hover:bg-[#FAF8F1] cursor-pointer ${
            isSidePanelOpen ? 'right-80' : 'right-0'
          }`}
          title={isSidePanelOpen ? 'Collapse Risk Panel' : 'Expand Risk Panel'}
        >
          {isSidePanelOpen ? (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[#167F78]" />
              <span className="text-[10px] uppercase font-mono">Hide</span>
            </>
          ) : (
            <>
              <Activity className="w-3.5 h-3.5 text-[#DC2626]" />
              <span className="text-[10px] uppercase font-mono">Risk Desk</span>
              <ChevronLeft className="w-3.5 h-3.5 text-[#167F78]" />
            </>
          )}
        </button>

        {/* 3. Collapsible Floating Risk Intelligence Panel (Right Drawer) */}
        {isSidePanelOpen && (
          <div className="absolute top-16 right-3 bottom-12 w-76 bg-[#FAF8F1]/98 border border-[#D7DEDC] rounded-2xl p-3 shadow-panel backdrop-blur-md z-20 flex flex-col space-y-2.5 font-sans text-xs overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2">
              <div className="flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-[#DC2626]" />
                <span className="font-bold text-[#172126] uppercase text-[11px] tracking-wider">
                  Risk Intelligence Desk
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20">
                {simulationState.overall_landslide_risk_pct}% RISK
              </span>
            </div>

            {/* Sub-tabs */}
            <div className="flex rounded-xl bg-[#E6EDEB] p-1 border border-[#D7DEDC] text-[11px]">
              {(['causes', 'impact', 'response'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1 text-center font-semibold rounded-lg transition-colors capitalize cursor-pointer ${
                    activeTab === tab
                      ? 'bg-[#FAF8F1] text-[#167F78] font-bold shadow-subtle'
                      : 'text-[#667579] hover:text-[#172126]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab 1: Causes Pack Factor Attribution */}
            {activeTab === 'causes' && (
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5 text-[11px]">
                <div className="text-[#667579] font-semibold text-[10px] uppercase tracking-wide">
                  Contributing Factors (Causes-Pack):
                </div>
                {simulationState.contributing_factors.map((cf, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[#172126]">
                      <span className="truncate pr-1 font-medium">{cf.factor}</span>
                      <strong className="font-mono">{cf.percentage}%</strong>
                    </div>
                    <div className="w-full bg-[#E6EDEB] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${cf.percentage}%`, backgroundColor: cf.color }}
                      />
                    </div>
                  </div>
                ))}

                <div className="bg-[#E6EDEB]/80 p-2.5 rounded-xl border border-[#D7DEDC] text-[10px] text-[#667579] leading-relaxed">
                  <strong>Multi-Factor Indicator:</strong> Rainfall intensity ({simulationState.rainfall_intensity_mm_hr} mm/hr) exceeding empirical threshold on {isAssam ? '36.2°' : '44.5°'} mountain slope.
                </div>
              </div>
            )}

            {/* Tab 2: Hazard Impact & Corridor Disruptions */}
            {activeTab === 'impact' && (
              <div className="space-y-2 flex-1 overflow-y-auto pr-0.5 text-[11px]">
                {simulationState.is_nh10_blocked ? (
                  <div className="bg-[#DC2626]/10 border border-[#DC2626]/30 rounded-xl p-2.5 text-[#DC2626] space-y-1">
                    <div className="font-bold flex items-center text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-[#DC2626]" />
                      ROAD BLOCKAGE REPORTED
                    </div>
                    <p className="text-[10px] text-[#172126] font-medium leading-tight">
                      {simulationState.blocked_section_name}
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#167F78]/10 border border-[#167F78]/30 rounded-xl p-2 text-[#167F78] font-semibold">
                    ✓ All Arterial Corridors Clear
                  </div>
                )}

                <div className="space-y-1.5 text-[#172126]">
                  <div className="flex justify-between bg-[#E6EDEB]/80 p-2 rounded-xl">
                    <span className="text-[#667579]">Exposed Population:</span>
                    <strong className="font-mono">{isAssam ? '6,200 Residents' : '1,420 Residents'}</strong>
                  </div>
                  <div className="flex justify-between bg-[#E6EDEB]/80 p-2 rounded-xl">
                    <span className="text-[#667579]">Structures at Direct Risk:</span>
                    <strong className="text-[#DC2626] font-mono">{isAssam ? '4 Structures' : '8 Structures'}</strong>
                  </div>
                  <div className="flex justify-between bg-[#E6EDEB]/80 p-2 rounded-xl">
                    <span className="text-[#667579]">Threatened Bridges:</span>
                    <strong className="truncate max-w-[120px]">{isAssam ? 'Diyung River Bridge' : 'Dikchu Bailey Bridge'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Candidate Alternate Response Routing & Shelters */}
            {activeTab === 'response' && (
              <div className="space-y-2 flex-1 overflow-y-auto pr-0.5 text-[11px]">
                <div className="bg-[#167F78]/10 border border-[#167F78]/30 rounded-xl p-2.5 text-[#167F78] space-y-1">
                  <div className="font-bold flex items-center text-xs">
                    <Navigation className="w-3.5 h-3.5 mr-1" />
                    CANDIDATE ALTERNATE ROUTE
                  </div>
                  <p className="text-[10px] text-[#172126] leading-tight">
                    {isAssam
                      ? 'Haflong → Jatinga Ridge → Lumding Link Corridor (Assessment Advised)'
                      : 'Singtam → Martam Ridge → Pakyong / NH-717A Bypass (Assessment Advised)'}
                  </p>
                </div>

                <div className="space-y-1.5 text-[#172126]">
                  <div className="flex justify-between bg-[#E6EDEB]/80 p-2 rounded-xl">
                    <span className="text-[#667579]">Candidate Bypass:</span>
                    <strong className="font-mono">{isAssam ? '34.2 km' : '28.4 km'}</strong>
                  </div>
                  <div className="flex justify-between bg-[#E6EDEB]/80 p-2 rounded-xl">
                    <span className="text-[#667579]">Relief Shelter:</span>
                    <strong>{isAssam ? 'Jatinga Community Center' : 'Dikchu Secondary School'}</strong>
                  </div>
                  <div className="flex justify-between bg-[#E6EDEB]/80 p-2 rounded-xl">
                    <span className="text-[#667579]">Clearance Unit Post:</span>
                    <strong>{isAssam ? 'SDRF Haflong Base' : 'BRO Mile 14 Staging Post'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom State Regional Context */}
            <div className="pt-2 border-t border-[#D7DEDC] space-y-1 text-[10px] text-[#667579]">
              <div className="flex justify-between">
                <span>Regional Capital:</span>
                <strong className="text-[#172126]">{currentStateData.capital}</strong>
              </div>
              <div className="flex justify-between">
                <span>Primary River System:</span>
                <strong className="text-[#172126]">{currentStateData.primary_river_system}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
