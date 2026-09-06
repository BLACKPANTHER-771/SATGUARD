import React, { useState } from 'react';
import {
  Zap,
  Send,
  FileCheck,
  Users,
  Route,
  Bell
} from 'lucide-react';
import { RiskZone } from '../../types';
import { DataService } from '../../services/dataService';

interface ResponseSOPViewProps {
  zones: RiskZone[];
  selectedZone: RiskZone;
  selectedState?: string;
  onSelectZone: (zone: RiskZone) => void;
}

export const ResponseSOPView: React.FC<ResponseSOPViewProps> = ({
  zones,
  selectedZone,
  selectedState = 'Sikkim',
  onSelectZone
}) => {
  const [activeAction, setActiveAction] = useState<string>('MOBILIZE_NDRF');
  const [dispatchedHistory, setDispatchedHistory] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDispatch = async () => {
    setIsProcessing(true);
    const res = await DataService.triggerSOP(selectedZone.id, activeAction, 'SEOC Recommended Draft (Guwahati HQ)');
    setTimeout(() => {
      setDispatchedHistory([res, ...dispatchedHistory]);
      setIsProcessing(false);
    }, 600);
  };

  return (
    <div className="h-full flex flex-col space-y-3 font-sans select-none overflow-y-auto pr-1">
      {/* Header */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-subtle card-hover-lift">
        <div>
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-[#167F78]" />
            <h1 className="font-semibold text-sm text-[#172126] tracking-wide">
              DECISION SUPPORT & RECOMMENDED INTER-AGENCY RESPONSE
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#167F78]/10 text-[#167F78] border border-[#167F78]/25 font-semibold">
              DECISION SUPPORT DRAFTING
            </span>
          </div>
          <p className="text-xs text-[#667579] mt-1">
            Standard operating procedure recommendations, CAP-CP emergency advisory drafting, and recommended transport detours for official review.
          </p>
        </div>
      </div>

      {/* Main SOP Trigger Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column: Target Zone & Action Selector (6 cols) */}
        <div className="lg:col-span-6 bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-4 space-y-3.5 shadow-subtle card-hover-lift">
          <div className="text-xs font-semibold text-[#172126] uppercase border-b border-[#D7DEDC] pb-2 flex items-center justify-between">
            <span>TARGET HAZARD ZONE:</span>
            <span className="text-[#C95050] font-mono font-bold">{selectedZone.risk_level}</span>
          </div>

          <div>
            <select
              value={selectedZone.id}
              onChange={(e) => {
                const match = zones.find(z => z.id === e.target.value);
                if (match) onSelectZone(match);
              }}
              className="w-full bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg px-3 py-2 text-[#172126] font-medium text-xs focus:border-[#167F78] focus:outline-none cursor-pointer"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.state}: {z.name} (Risk: {Math.round(z.landslide_probability * 100)}% | Priority: {z.impact_priority})
                </option>
              ))}
            </select>
          </div>

          {/* Action Protocols Grid */}
          <div className="space-y-2">
            <div className="text-[11px] uppercase text-[#667579] font-semibold">
              RECOMMENDED STANDARD OPERATING PROCEDURE (SOP):
            </div>

            {[
              {
                id: 'MOBILIZE_NDRF',
                title: 'Draft Pre-positioning Advisory for NDRF / SDRF',
                sub: 'Prepare advisory to pre-position rescue teams, earthmovers & satcom units at designated staging grounds',
                icon: Users,
                color: 'border-[#C95050]/50 text-[#C95050] bg-[#C95050]/10'
              },
              {
                id: 'ROADBLOCK_ADVISORY',
                title: 'Recommend Highway Precautionary Detour',
                sub: 'Draft advisory for traffic police checkposts to monitor vulnerable stretches and prepare alternate lifelines',
                icon: Route,
                color: 'border-[#C58A24]/50 text-[#C58A24] bg-[#C58A24]/10'
              },
              {
                id: 'BROADCAST_CAP_SMS',
                title: 'Prepare Common Alerting Protocol (CAP) Advisory Draft',
                sub: 'Draft localized alert message template for review by District Disaster Management Authority',
                icon: Bell,
                color: 'border-[#167F78]/50 text-[#167F78] bg-[#167F78]/10'
              }
            ].map((action) => {
              const Icon = action.icon;
              const isSelected = activeAction === action.id;
              return (
                <div
                  key={action.id}
                  onClick={() => setActiveAction(action.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? `${action.color} shadow-subtle font-semibold`
                      : 'bg-[#E6EDEB] border-[#D7DEDC] text-[#667579] hover:text-[#172126]'
                  }`}
                >
                  <div className="flex items-center space-x-2 text-xs">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{action.title}</span>
                  </div>
                  <div className="text-[11px] text-[#667579] mt-1 leading-snug">
                    {action.sub}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Generate Draft Button */}
          <button
            onClick={handleDispatch}
            disabled={isProcessing}
            className="w-full py-2.5 rounded-lg bg-[#167F78] hover:bg-[#136E68] text-[#FAF8F1] font-semibold text-xs flex items-center justify-center space-x-2 shadow-subtle transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isProcessing ? 'PREPARING DRAFT...' : 'PREPARE & LOG SOP RECOMMENDATION'}</span>
          </button>
        </div>

        {/* Right Column: Recommended SOP Audit Log */}
        <div className="lg:col-span-6 bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-4 space-y-3 flex flex-col shadow-subtle card-hover-lift">
          <div className="text-xs font-semibold text-[#172126] uppercase border-b border-[#D7DEDC] pb-2 flex items-center justify-between">
            <span className="flex items-center">
              <FileCheck className="w-4 h-4 mr-1 text-[#167F78]" />
              PREPARED RECOMMENDATION LOG
            </span>
            <span className="text-[#167F78] text-[10px] font-mono font-semibold">REAL-TIME SYNC</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[420px] pr-1">
            {dispatchedHistory.length === 0 ? (
              <div className="bg-[#E6EDEB] border border-[#D7DEDC] rounded-xl p-4 text-center text-xs text-[#667579]">
                No recommendations drafted this session. Select an SOP above to prepare an advisory draft.
              </div>
            ) : (
              dispatchedHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#E6EDEB] border border-[#167F78]/30 rounded-lg p-3 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#172126]">{item.details?.title}</span>
                    <span className="text-[10px] font-mono font-semibold text-[#167F78] px-1.5 py-0.5 rounded bg-[#167F78]/15">
                      DRAFTED
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#667579]">
                    Time: {item.timestamp} | Authority: {item.details?.authorized_by}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
};



