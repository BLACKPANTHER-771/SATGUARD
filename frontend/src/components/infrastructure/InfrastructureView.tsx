import React from 'react';
import {
  Route,
  Clock,
  Truck
} from 'lucide-react';
import { RoadConnectivity, RiskZone } from '../../types';

interface InfrastructureViewProps {
  roads: RoadConnectivity[];
  zones?: RiskZone[];
  selectedZone?: RiskZone;
  selectedState?: string;
  onSelectZone?: (zone: RiskZone) => void;
}

export const InfrastructureView: React.FC<InfrastructureViewProps> = ({
  roads,
  selectedState = 'Sikkim'
}) => {
  // Sort roads so roads belonging to the active state appear first
  const sortedRoads = [...roads].sort((a, b) => {
    if (selectedState && selectedState !== 'ALL') {
      const aMatch = a.state.toLowerCase().includes(selectedState.toLowerCase());
      const bMatch = b.state.toLowerCase().includes(selectedState.toLowerCase());
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
    }
    return 0;
  });
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BLOCKED':
        return 'bg-[#C95050]/15 text-[#C95050] border-[#C95050]/30';
      case 'AT_RISK':
        return 'bg-[#C58A24]/15 text-[#C58A24] border-[#C58A24]/30';
      case 'WATCH':
        return 'bg-[#C58A24]/10 text-[#C58A24] border-[#C58A24]/20';
      default:
        return 'bg-[#167F78]/15 text-[#167F78] border-[#167F78]/30';
    }
  };

  return (
    <div className="h-full flex flex-col space-y-3 font-sans select-none overflow-y-auto pr-1">
      {/* Header */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-subtle card-hover-lift">
        <div>
          <div className="flex items-center space-x-2">
            <Route className="w-5 h-5 text-[#C58A24]" />
            <h1 className="font-semibold text-sm text-[#172126] tracking-wide">
              ROAD CONNECTIVITY INTELLIGENCE & ISOLATION FORECAST
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C58A24]/10 text-[#C58A24] border border-[#C58A24]/25 font-semibold">
              0–3H CONNECTIVITY EVOLUTION
            </span>
          </div>
          <p className="text-xs text-[#667579] mt-1">
            Dynamic road vulnerability tracking, 0-3 hour blockage predictions, settlement isolation assessment, and alternate bypass routing.
          </p>
        </div>
      </div>

      {/* Arterial Highways 0-3h Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sortedRoads.map((road) => {
          const isBlocked = road.current_status === 'BLOCKED' || road.current_status === 'AT_RISK';

          return (
            <div
              key={road.code}
              className={`bg-[#FAF8F1] border rounded-xl p-3.5 space-y-3 shadow-subtle transition-all card-hover-lift ${
                isBlocked
                  ? 'border-[#C95050]/40 bg-[#FAF8F1]'
                  : 'border-[#D7DEDC] hover:border-[#CBD5D2]'
              }`}
            >
              <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2">
                <div className="flex items-center space-x-2.5">
                  <span className="px-2 py-0.5 rounded bg-[#E6EDEB] border border-[#D7DEDC] text-[#172126] font-mono font-bold text-xs">
                    {road.code}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-[#172126]">{road.name}</div>
                    <div className="text-[10px] text-[#667579]">{road.state} • {road.importance}</div>
                  </div>
                </div>

                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${getStatusBadge(road.current_status)}`}>
                  {road.current_status}
                </span>
              </div>

              {/* 0-3 Hour Predicted Road Status Timeline */}
              <div className="bg-[#E6EDEB] p-2.5 rounded-lg border border-[#D7DEDC] space-y-1.5">
                <div className="text-[10px] text-[#667579] uppercase font-semibold flex items-center justify-between">
                  <span className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-[#167F78]" />
                    PREDICTED ROAD STATUS TIMELINE:
                  </span>
                  <span className="text-[10px] font-mono text-[#C58A24] font-semibold">
                    Risk: {road.connectivity_risk_score}/100
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-xs text-center pt-1 font-mono">
                  <div className="p-1.5 rounded-md bg-[#FAF8F1] border border-[#D7DEDC]">
                    <div className="text-[9px] text-[#667579]">NOW</div>
                    <div className={`font-semibold mt-0.5 text-[10px] ${road.current_status === 'OPEN' ? 'text-[#167F78]' : 'text-[#C58A24]'}`}>
                      {road.current_status}
                    </div>
                  </div>
                  <div className="p-1.5 rounded-md bg-[#FAF8F1] border border-[#D7DEDC]">
                    <div className="text-[9px] text-[#667579]">+1 HR</div>
                    <div className={`font-semibold mt-0.5 text-[10px] ${road.predicted_status_1h === 'OPEN' ? 'text-[#167F78]' : 'text-[#C58A24]'}`}>
                      {road.predicted_status_1h}
                    </div>
                  </div>
                  <div className="p-1.5 rounded-md bg-[#FAF8F1] border border-[#D7DEDC]">
                    <div className="text-[9px] text-[#667579]">+2 HR</div>
                    <div className={`font-semibold mt-0.5 text-[10px] ${road.predicted_status_2h === 'OPEN' ? 'text-[#167F78]' : 'text-[#C95050]'}`}>
                      {road.predicted_status_2h}
                    </div>
                  </div>
                  <div className="p-1.5 rounded-md bg-[#FAF8F1] border border-[#D7DEDC]">
                    <div className="text-[9px] text-[#667579]">+3 HR</div>
                    <div className={`font-semibold mt-0.5 text-[10px] ${road.predicted_status_3h === 'OPEN' ? 'text-[#167F78]' : 'text-[#C95050]'}`}>
                      {road.predicted_status_3h}
                    </div>
                  </div>
                </div>
              <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC] text-[11px] flex items-center space-x-2">
                <Truck className="w-4 h-4 text-[#167F78] shrink-0" />
                <span className="text-[#667579]"><strong className="text-[#172126]">Detour Route:</strong> {road.alternate_route}</span>
              </div>
            </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};


