import React from 'react';
import { ArrowRight, CheckCircle2, Activity, Cpu } from 'lucide-react';
import { OperationalPipelineStep } from '../../types';

interface PipelineStatusBarProps {
  steps: OperationalPipelineStep[];
  onViewPipeline: () => void;
}

export const PipelineStatusBar: React.FC<PipelineStatusBarProps> = ({ onViewPipeline }) => {
  const shortPipeline = [
    { name: 'EO Ingestion', code: 'S1/S2/DEM' },
    { name: 'Optical Registration', code: 'ORB/Rigid' },
    { name: 'Bitemporal Change', code: 'Sobel/Texture' },
    { name: 'Built-up Detection', code: 'Mask/Footprints' },
    { name: '4-Tier Damage', code: 'Deterministic' },
    { name: 'Operator Audit', code: 'Human-in-Loop' },
    { name: 'MCE Risk Matrix', code: 'Canonical MCE' },
    { name: 'DSS Dispatch', code: 'NDEM Ready' }
  ];

  return (
    <div
      onClick={onViewPipeline}
      className="bg-[#10232E] border-b border-[#203844] px-4 py-1 flex items-center justify-between gap-3 overflow-x-auto text-xs font-mono text-[#D7DEDC] cursor-pointer hover:bg-[#172A35] transition-colors select-none"
      title="Click to view 8-Stage Architecture & Data Pipeline"
    >
      <div className="flex items-center space-x-2 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#167F78] animate-pulse" />
        <span className="text-[10px] font-semibold text-[#8E99A8] uppercase tracking-wider flex items-center">
          <Cpu className="w-3 h-3 mr-1 text-[#5D8F89]" />
          NRSC DSS PIPELINE:
        </span>
      </div>

      <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
        {shortPipeline.map((p, idx) => (
          <React.Fragment key={p.name}>
            <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-[#172A35] border border-[#203844] text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5D8F89]" />
              <span className="text-[#F5F2E9] font-medium">{p.name}</span>
              <span className="text-[9px] text-[#8E99A8]">[{p.code}]</span>
            </div>
            {idx < shortPipeline.length - 1 && (
              <ArrowRight className="w-2.5 h-2.5 text-[#203844] shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="hidden xl:flex items-center space-x-2 text-[#8E99A8] shrink-0 text-[10px]">
        <span className="text-[#5D8F89] font-semibold">187 BASINS MONITORED</span>
        <span className="text-[#203844]">•</span>
        <span className="text-[#C58A24] font-semibold">45ms DSS LATENCY</span>
      </div>
    </div>
  );
};




