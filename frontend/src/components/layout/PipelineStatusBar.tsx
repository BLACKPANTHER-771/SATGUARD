import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { OperationalPipelineStep } from '../../types';

interface PipelineStatusBarProps {
  steps: OperationalPipelineStep[];
  onViewPipeline: () => void;
}

export const PipelineStatusBar: React.FC<PipelineStatusBarProps> = ({ onViewPipeline }) => {
  const shortPipeline = [
    { name: 'Gov Ingestion', code: 'IMD/GSI', active: true },
    { name: 'Earth Obs', code: 'Sentinel-1/2', active: true },
    { name: 'AI Physics Model', code: 'PINN/FoS', active: true },
    { name: 'XAI Attribution', code: 'SHAP Factor', active: true },
    { name: 'Impact Matrix', code: 'Exposure', active: true },
    { name: 'Field Truth', code: 'Ground Verification', active: true },
    { name: 'CAP Broadcast', code: 'Alert', active: true },
    { name: 'Decision Support', code: 'SDRF Action', active: true }
  ];

  return (
    <div
      onClick={onViewPipeline}
      className="bg-[#FAF8F1] border-b border-[#D7DEDC] px-4 py-1.5 flex items-center justify-between gap-3 overflow-x-auto text-xs font-sans cursor-pointer hover:bg-[#E6EDEB]/60 transition-colors select-none"
      title="Click to view 8-Stage Architecture & Data Pipeline"
    >
      <div className="flex items-center space-x-2 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#167F78]" />
        <span className="text-[11px] font-semibold text-[#667579] uppercase tracking-wider">
          GEOSPATIAL PROCESSING CHAIN:
        </span>
      </div>

      <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
        {shortPipeline.map((p, idx) => (
          <React.Fragment key={p.name}>
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#E6EDEB] border border-[#D7DEDC] text-[11px]">
              <CheckCircle2 className="w-2.5 h-2.5 text-[#167F78] shrink-0" />
              <span className="text-[#172126] font-medium">{p.name}</span>
              <span className="text-[9px] font-mono text-[#667579]">({p.code})</span>
            </div>
            {idx < shortPipeline.length - 1 && (
              <ArrowRight className="w-2.5 h-2.5 text-[#D7DEDC] shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="hidden xl:flex items-center space-x-2 text-[#667579] shrink-0 text-[10px] font-mono">
        <span className="text-[#167F78] font-medium">187 SLOPES MONITORED</span>
        <span className="text-[#D7DEDC]">•</span>
        <span className="text-[#397FA8] font-medium">45ms LATENCY</span>
      </div>
    </div>
  );
};




