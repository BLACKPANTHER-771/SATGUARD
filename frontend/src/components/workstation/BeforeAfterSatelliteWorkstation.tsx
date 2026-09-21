import React, { useState, useRef } from 'react';
import {
  Layers,
  Sliders,
  Eye,
  EyeOff,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  MapPin,
  Building,
  AlertTriangle,
  Info
} from 'lucide-react';
import { DetectedStructure, DamageClass } from '../../types';

interface BeforeAfterSatelliteWorkstationProps {
  beforeImage: string;
  afterImage: string;
  changeMaskBase64?: string;
  structures: DetectedStructure[];
  selectedStructure: DetectedStructure | null;
  onSelectStructure: (structure: DetectedStructure) => void;
  sceneTitle?: string;
  acquisitionDates?: { before: string; after: string };
  sensorLabel?: string;
}

export const BeforeAfterSatelliteWorkstation: React.FC<BeforeAfterSatelliteWorkstationProps> = ({
  beforeImage,
  afterImage,
  changeMaskBase64,
  structures,
  selectedStructure,
  onSelectStructure,
  sceneTitle = 'Sikkim Teesta Valley & NH-10 Corridor',
  acquisitionDates = { before: '2026-08-14', after: '2026-09-02' },
  sensorLabel = 'Optical High-Resolution Demonstration Imagery'
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0% to 100%
  const [activeBandFilter, setActiveBandFilter] = useState<'NATURAL_RGB' | 'FALSE_COLOR_NIR' | 'SWIR_DEBRIS' | 'WATER_INDEX' | 'SAR_COHERENCE'>('NATURAL_RGB');
  const [showChangeMask, setShowChangeMask] = useState<boolean>(true);
  const [maskOpacity, setMaskOpacity] = useState<number>(65);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSliderPosition(percent);
  };

  return (
    <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-2xl p-4 shadow-subtle flex flex-col space-y-3 font-sans select-none">
      {/* 1. Header Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D7DEDC] pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#167F78] animate-pulse" />
            <h2 className="text-sm font-bold text-[#172126] tracking-wide uppercase">
              BITEMPORAL SATELLITE COMPARISON WORKSTATION
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E6EDEB] border border-[#D7DEDC] text-[#167F78] font-bold">
              SIKKIM NH-10 DEMONSTRATION
            </span>
          </div>
          <p className="text-[11px] text-[#667579] mt-0.5">
            Interactive split inspection comparing pre-disaster baseline ({acquisitionDates.before}) vs post-debris inundation ({acquisitionDates.after}).
          </p>
        </div>

        {/* Band Filters & Toggles */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Spectral Bands Mode Switcher */}
          <div className="flex items-center space-x-1 bg-[#E6EDEB] p-1 rounded-lg border border-[#D7DEDC]">
            {(['NATURAL_RGB', 'FALSE_COLOR_NIR', 'SWIR_DEBRIS', 'WATER_INDEX', 'SAR_COHERENCE'] as const).map(b => (
              <button
                key={b}
                onClick={() => setActiveBandFilter(b)}
                className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                  activeBandFilter === b
                    ? 'bg-[#FAF8F1] text-[#167F78] shadow-subtle border border-[#D7DEDC]'
                    : 'text-[#667579] hover:text-[#172126]'
                }`}
              >
                {b.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Change Mask Toggle */}
          <button
            onClick={() => setShowChangeMask(!showChangeMask)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
              showChangeMask
                ? 'bg-[#C95050]/15 text-[#C95050] border-[#C95050]/40 shadow-subtle'
                : 'bg-[#E6EDEB] text-[#667579] border-[#D7DEDC]'
            }`}
          >
            {showChangeMask ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
            <span>Change Mask</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Bitemporal Split Canvas */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        className="relative w-full h-[460px] bg-[#172126] rounded-xl overflow-hidden border border-[#D7DEDC] cursor-ew-resize select-none shadow-inner"
      >
        {/* Layer A: After Image (Full background) */}
        <img
          src={afterImage}
          alt="Post-Disaster Scene"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{
            filter:
              activeBandFilter === 'FALSE_COLOR_NIR'
                ? 'hue-rotate(280deg) saturate(1.8)'
                : activeBandFilter === 'SWIR_DEBRIS'
                ? 'sepia(0.8) contrast(1.4)'
                : activeBandFilter === 'WATER_INDEX'
                ? 'hue-rotate(180deg) saturate(2)'
                : activeBandFilter === 'SAR_COHERENCE'
                ? 'grayscale(1) contrast(2)'
                : 'none'
          }}
        />

        {/* Optional: Change Difference Anomaly Overlay */}
        {showChangeMask && changeMaskBase64 && (
          <img
            src={changeMaskBase64}
            alt="Change Anomaly Mask"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none mix-blend-screen"
            style={{ opacity: maskOpacity / 100 }}
          />
        )}

        {/* Layer B: Before Image (Clipped by slider position) */}
        <div
          className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none border-r-2 border-[#FAF8F1] shadow-2xl"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={beforeImage}
            alt="Pre-Disaster Baseline"
            className="absolute inset-0 w-full h-full object-cover max-w-none"
            style={{
              width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
              height: '100%',
              filter:
                activeBandFilter === 'FALSE_COLOR_NIR'
                  ? 'hue-rotate(280deg) saturate(1.8)'
                  : activeBandFilter === 'SWIR_DEBRIS'
                  ? 'sepia(0.8) contrast(1.4)'
                  : activeBandFilter === 'WATER_INDEX'
                  ? 'hue-rotate(180deg) saturate(2)'
                  : activeBandFilter === 'SAR_COHERENCE'
                  ? 'grayscale(1) contrast(2)'
                  : 'none'
            }}
          />
        </div>

        {/* Interactive Split Divider Handle */}
        <div
          className="absolute inset-y-0 flex items-center justify-center pointer-events-none"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-8 h-8 rounded-full bg-[#FAF8F1] border-2 border-[#167F78] shadow-2xl flex items-center justify-center cursor-ew-resize">
            <Sliders className="w-4 h-4 text-[#167F78]" />
          </div>
        </div>

        {/* HUD Overlay Badges */}
        <div className="absolute top-3 left-3 bg-[#FAF8F1]/95 border border-[#D7DEDC] px-3 py-1 rounded-lg backdrop-blur-md shadow-subtle text-xs font-semibold text-[#172126] flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#167F78]" />
          <span>PRE-DISASTER ({acquisitionDates.before})</span>
        </div>

        <div className="absolute top-3 right-3 bg-[#FAF8F1]/95 border border-[#D7DEDC] px-3 py-1 rounded-lg backdrop-blur-md shadow-subtle text-xs font-semibold text-[#C95050] flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#C95050] animate-pulse" />
          <span>POST-DISASTER ({acquisitionDates.after})</span>
        </div>

        {/* HUD Bottom Bar with Location & Mask Opacity Slider */}
        <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-center justify-between gap-2 bg-[#FAF8F1]/95 border border-[#D7DEDC] p-2 rounded-xl backdrop-blur-md shadow-subtle text-[11px] font-mono text-[#667579]">
          <div className="flex items-center space-x-3">
            <span className="flex items-center text-[#172126] font-semibold">
              <MapPin className="w-3.5 h-3.5 mr-1 text-[#167F78]" />
              GPS: 27.2389°N, 88.6065°E · Dikchu Sector
            </span>
            <span>•</span>
            <span>GSD: 0.5m (Synthetic Demonstration Scene)</span>
          </div>

          {/* Mask Opacity Slider */}
          {showChangeMask && (
            <div className="flex items-center space-x-2">
              <span className="text-[10px]">Mask Intensity:</span>
              <input
                type="range"
                min="20"
                max="100"
                value={maskOpacity}
                onChange={(e) => setMaskOpacity(Number(e.target.value))}
                className="w-24 accent-[#167F78] cursor-pointer"
              />
              <span className="text-[10px] font-bold text-[#172126]">{maskOpacity}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
