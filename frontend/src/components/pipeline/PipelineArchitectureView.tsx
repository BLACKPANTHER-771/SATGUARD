import React from 'react';
import {
  GitMerge,
  Database,
  Satellite,
  BrainCircuit,
  Calculator,
  ShieldCheck,
  Bell,
  Zap,
  ArrowDown
} from 'lucide-react';
import { OperationalPipelineStep } from '../../types';

interface PipelineArchitectureViewProps {
  steps?: OperationalPipelineStep[];
}

export const PipelineArchitectureView: React.FC<PipelineArchitectureViewProps> = ({ steps = [] }) => {
  const defaultSteps: OperationalPipelineStep[] = [
    {
      step_number: 1,
      title: 'Heterogeneous Telemetry & Government Ingestion',
      sources: ['IMD Automatic Weather Stations', 'GSI NLSM Geo-Database', 'In-situ Soil Moisture Sensors'],
      throughput: '1.2 GB/hr',
      latency_ms: 45,
      status: 'OPERATIONAL'
    },
    {
      step_number: 2,
      title: 'Multi-Spectral & Radar Earth Observation Fusion',
      sources: ['Copernicus Sentinel-1 (C-SAR)', 'Sentinel-2 (Optical/NDVI)', 'NASA SRTM 30m DEM'],
      throughput: '4.8 GB/pass',
      latency_ms: 120,
      status: 'OPERATIONAL'
    },
    {
      step_number: 3,
      title: 'Physics-Guided Machine Learning & Susceptibility Inference',
      sources: ['RandomForest Geo-Classifier', 'PINN Pore-Pressure Solver', 'XGBoost Transient Trigger'],
      throughput: '187 Slopes/sec',
      latency_ms: 38,
      status: 'OPERATIONAL'
    },
    {
      step_number: 4,
      title: 'Geotechnical Demonstration Factor & Cross-Section Synthesis',
      sources: ['Infinite Slope Limit Equilibrium Model', 'Dynamic Water Table Elevation'],
      throughput: 'Real-time On-demand',
      latency_ms: 15,
      status: 'OPERATIONAL'
    },
    {
      step_number: 5,
      title: 'Explainable AI (XAI) Attribution & Factor Decomposition',
      sources: ['TreeSHAP Marginal Attribution', 'Feature Interaction Matrix'],
      throughput: 'Instantaneous',
      latency_ms: 22,
      status: 'OPERATIONAL'
    },
    {
      step_number: 6,
      title: 'Exposure Matrix & Highway Connectivity Assessment',
      sources: ['OpenStreetMap Lifeline Graph', 'Census Settlement Exposure', 'Critical Asset Registry'],
      throughput: '34 Corridors evaluated',
      latency_ms: 30,
      status: 'OPERATIONAL'
    },
    {
      step_number: 7,
      title: 'Multilingual Alert Generation (CAP-CP Compliant)',
      sources: ['Dynamic Multi-lingual Lexicon (EN, HI, AS, BN)', 'CAP-CP XML Generator'],
      throughput: 'Instantaneous Broadcast',
      latency_ms: 10,
      status: 'OPERATIONAL'
    },
    {
      step_number: 8,
      title: 'Decision Support Drafting & Ground Truth Verification Loop',
      sources: ['NDRF / SDRF SOP Recommendation Templates', 'Mobile Geo-Tagged Evidence Feed'],
      throughput: 'Continuous Ingestion',
      latency_ms: 5,
      status: 'OPERATIONAL'
    }
  ];

  const activeSteps = steps && steps.length > 0 ? steps : defaultSteps;

  const stepIcons = [
    Database,
    Satellite,
    BrainCircuit,
    Calculator,
    ShieldCheck,
    ShieldCheck,
    Bell,
    Zap
  ];

  return (
    <div className="h-full flex flex-col space-y-3 font-sans select-none overflow-y-auto pr-1">
      {/* Header */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-subtle card-hover-lift">
        <div>
          <div className="flex items-center space-x-2">
            <GitMerge className="w-5 h-5 text-[#167F78]" />
            <h1 className="font-semibold text-sm text-[#172126] tracking-wide">
              END-TO-END 8-STAGE OPERATIONAL GEOSPATIAL PIPELINE
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#167F78]/10 text-[#167F78] border border-[#167F78]/25 font-semibold">
              ISRO / GSI / IMD INTEGRATED PIPELINE
            </span>
          </div>
          <p className="text-xs text-[#667579] mt-1">
            Continuous telemetry ingestion pipeline executing Doppler radar hyetograph assimilation, Sentinel-1 InSAR coherence computation, slope stability calculation, and decision support drafting.
          </p>
        </div>
      </div>

      {/* 8-Stage Step Cards Stack */}
      <div className="space-y-2.5">
        {activeSteps.map((step, idx) => {
          const Icon = stepIcons[idx] || Database;
          return (
            <React.Fragment key={step.step_number}>
              <div className="bg-[#FAF8F1] border border-[#D7DEDC] hover:border-[#CBD5D2] rounded-xl p-3.5 transition-all card-hover-lift flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-subtle">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-[#E6EDEB] border border-[#D7DEDC] flex items-center justify-center shrink-0 text-[#167F78] shadow-subtle">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-[#167F78]">STAGE 0{step.step_number}:</span>
                      <span className="text-sm font-semibold text-[#172126] tracking-wide">{step.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#167F78]/15 text-[#167F78] border border-[#167F78]/30 font-medium">
                        {step.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {step.sources.map((src, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[11px] px-2 py-0.5 rounded bg-[#E6EDEB] border border-[#D7DEDC] text-[#667579] font-mono"
                        >
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs font-mono shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-[#667579] block font-sans">THROUGHPUT</span>
                    <span className="text-[#172126] font-semibold">{step.throughput}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#667579] block font-sans">LATENCY</span>
                    <span className="text-[#167F78] font-bold">{step.latency_ms}ms</span>
                  </div>
                </div>
              </div>


              {idx < activeSteps.length - 1 && (
                <div className="flex justify-center -my-1">
                  <ArrowDown className="w-4 h-4 text-[#D7DEDC]" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};



