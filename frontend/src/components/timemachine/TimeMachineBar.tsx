import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  CloudRain,
  AlertTriangle
} from 'lucide-react';
import { getRiskColor } from '../../services/riskEngine';

interface TimeMachineBarProps {
  timeOffset: number;
  onTimeChange: (offset: number) => void;
  rainfallIntensity: number;
  maxRiskPct: number;
}

export const TimeMachineBar: React.FC<TimeMachineBarProps> = ({
  timeOffset,
  onTimeChange,
  rainfallIntensity,
  maxRiskPct
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const steps = [
    { offset: 0, label: 'NOW', sub: 'Observed Radar' },
    { offset: 30, label: '+30 MIN', sub: 'Inflow Peak' },
    { offset: 60, label: '+1 HR', sub: 'Orographic Surge' },
    { offset: 120, label: '+2 HR', sub: 'Pore Saturation' },
    { offset: 180, label: '+3 HR', sub: 'Peak Exposure' }
  ];

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        const currentIndex = steps.findIndex(s => s.offset === timeOffset);
        const nextIndex = (currentIndex + 1) % steps.length;
        onTimeChange(steps[nextIndex].offset);
      }, 2200);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeOffset, onTimeChange]);

  return (
    <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-2.5 font-sans select-none flex flex-wrap items-center justify-between gap-3 shadow-subtle card-hover-lift">
      {/* 1. Title & Simulation Controls */}
      <div className="flex items-center space-x-2.5">
        <div className="flex items-center space-x-1.5 bg-[#E6EDEB] px-2.5 py-1.5 rounded-lg border border-[#D7DEDC]">
          <Clock className="w-3.5 h-3.5 text-[#167F78]" />
          <span className="text-xs font-semibold text-[#172126] uppercase tracking-wider">
            0–3H TACTICAL NOWCAST
          </span>
        </div>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs font-semibold transition-all cursor-pointer shadow-subtle ${
            isPlaying
              ? 'bg-[#C58A24] text-[#FAF8F1]'
              : 'bg-[#167F78] text-[#FAF8F1] hover:bg-[#136E68]'
          }`}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isPlaying ? 'PAUSE' : 'SIMULATE'}</span>
        </button>

        <button
          onClick={() => {
            setIsPlaying(false);
            onTimeChange(0);
          }}
          className="p-1.5 rounded-lg bg-[#E6EDEB] border border-[#D7DEDC] text-[#667579] hover:text-[#172126] transition-colors cursor-pointer"
          title="Reset to NOW"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Step Buttons (NOW -> +30m -> +1h -> +2h -> +3h) */}
      <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
        {steps.map((s) => {
          const isActive = timeOffset === s.offset;
          return (
            <button
              key={s.offset}
              onClick={() => {
                setIsPlaying(false);
                onTimeChange(s.offset);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all flex flex-col items-center min-w-[76px] cursor-pointer ${
                isActive
                  ? 'bg-[#E6EDEB] border border-[#C95050] text-[#172126] font-semibold shadow-subtle'
                  : 'bg-[#FAF8F1] border border-[#D7DEDC] text-[#667579] hover:text-[#172126] hover:bg-[#E6EDEB]/60'
              }`}
            >
              <span className={isActive ? 'text-[#C95050] font-bold' : ''}>{s.label}</span>
              <span className="text-[9px] text-[#667579] font-normal">{s.sub}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Projected Telemetry */}
      <div className="hidden md:flex items-center space-x-3 text-xs bg-[#E6EDEB] px-3 py-1.5 rounded-lg border border-[#D7DEDC] font-mono">
        <div className="flex items-center space-x-1.5">
          <CloudRain className="w-3.5 h-3.5 text-[#397FA8]" />
          <span className="text-[#667579] text-[11px]">Rain:</span>
          <span className="text-[#397FA8] font-semibold">{rainfallIntensity} mm/hr</span>
        </div>
        <span className="text-[#D7DEDC]">•</span>
        <div className="flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5" style={{ color: getRiskColor(maxRiskPct) }} />
          <span className="text-[#667579] text-[11px]">Peak Risk:</span>
          <span className="font-semibold" style={{ color: getRiskColor(maxRiskPct) }}>{maxRiskPct}%</span>
        </div>
      </div>
    </div>
  );

};



