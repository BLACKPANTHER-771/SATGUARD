import React, { useState, useEffect } from 'react';
import {
  Compass,
  PlusCircle,
  Globe,
  Wifi,
  WifiOff
} from 'lucide-react';
import { SystemTelemetry, RiskZone, StateCoverage, LanguageCode } from '../../types';

interface HeaderProps {
  telemetry: SystemTelemetry;
  states: StateCoverage[];
  selectedState: string;
  onSelectState: (state: string) => void;
  selectedZone: RiskZone;
  onSelectZone: (zone: RiskZone) => void;
  zones: RiskZone[];
  selectedLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  isOfflineMode: boolean;
  onToggleOfflineMode: () => void;
  queuedCount: number;
  onOpenReportModal: () => void;
  onOpenFieldApp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  states,
  selectedState,
  onSelectState,
  selectedZone,
  onSelectZone,
  zones,
  selectedLanguage,
  onSelectLanguage,
  isOfflineMode,
  onToggleOfflineMode,
  queuedCount,
  onOpenReportModal,
  onOpenFieldApp
}) => {
  const [currentDateTime, setCurrentDateTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).toUpperCase();
      const timeStr = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      setCurrentDateTime(`${dateStr} · ${timeStr} IST`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-[#FAF8F1] border-b border-[#D7DEDC] select-none sticky top-0 z-30 font-sans shadow-subtle">
      {/* 1. PRIMARY TOP HEADER */}
      <div className="px-5 py-2.5 flex flex-wrap items-center justify-between gap-4 border-b border-[#D7DEDC]/70">
        {/* LEFT: Epoch cursive wordmark (44px) + Subtitle */}
        <div className="flex items-center space-x-3">
          <div className="flex items-baseline space-x-2.5">
            <span className="font-brand text-[44px] text-[#172126] font-normal italic tracking-normal select-none leading-none">
              Epoch
            </span>
            <span className="text-[11px] text-[#667579] font-medium tracking-tight">
              SIH26001 · North East India
            </span>
          </div>
        </div>

        {/* CENTER: Current Operational Region */}
        <div className="hidden md:flex items-center space-x-2 text-xs">
          <span className="text-[#667579] uppercase tracking-wider text-[11px] font-medium">Region:</span>
          <span className="text-[#172126] font-semibold text-sm">
            {selectedZone?.state || 'Sikkim'}
          </span>
          <span className="text-[#D7DEDC] mx-1">•</span>
          <span className="text-[#167F78] font-medium text-xs">
            {selectedZone?.name?.split('(')[0] || 'Dikchu – Singtam Sector'}
          </span>
        </div>

        {/* RIGHT: Synthetic Demonstration + IST Timestamp */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 text-[11px] text-[#C58A24] font-medium px-2 py-0.5 rounded-md bg-[#C58A24]/10 border border-[#C58A24]/25">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C58A24]" />
            <span className="tracking-wide font-mono font-semibold">SYNTHETIC DEMONSTRATION</span>
          </div>
          <span className="text-[#D7DEDC] hidden sm:inline">•</span>
          <span className="font-mono text-[#667579] text-[11px] hidden sm:inline">
            {currentDateTime || '03 SEP 2026 · 21:00:00 IST'}
          </span>
        </div>
      </div>

      {/* 2. SECONDARY CONTROL STRIP */}
      <div className="px-5 py-1.5 flex flex-wrap items-center justify-between gap-3 bg-[#E6EDEB]/70 text-xs">
        {/* Left Filters: State & Sector */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-[#667579]">
            <Compass className="w-3.5 h-3.5 text-[#167F78]" />
            <span className="text-[11px]">State:</span>
            <select
              value={selectedState}
              onChange={(e) => onSelectState(e.target.value)}
              className="bg-transparent text-[#172126] font-medium text-xs focus:outline-none cursor-pointer hover:text-[#167F78]"
              aria-label="Select state"
            >
              <option value="ALL" className="bg-[#FAF8F1] text-[#172126]">All 8 States</option>
              {states.map((s) => (
                <option key={s.code} value={s.name} className="bg-[#FAF8F1] text-[#172126]">
                  {s.name} ({s.active_risk_pct}%)
                </option>
              ))}
            </select>
          </div>

          <span className="text-[#D7DEDC] hidden sm:inline">|</span>

          <div className="hidden sm:flex items-center space-x-1.5 text-[#667579]">
            <span className="text-[11px]">Sector:</span>
            <select
              value={selectedZone?.id}
              onChange={(e) => {
                const match = zones.find(z => z.id === e.target.value);
                if (match) onSelectZone(match);
              }}
              className="bg-transparent text-[#172126] font-medium text-xs focus:outline-none cursor-pointer hover:text-[#167F78] max-w-[200px] truncate"
              aria-label="Select sector"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id} className="bg-[#FAF8F1] text-[#172126]">
                  {z.name.split('(')[0]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Tools: Language, Offline PWA, + Report Incident */}
        <div className="flex items-center space-x-3">
          {/* Language Picker */}
          <div className="flex items-center space-x-1 text-[#667579]">
            <Globe className="w-3 h-3 text-[#667579]" />
            <select
              value={selectedLanguage}
              onChange={(e) => onSelectLanguage(e.target.value as LanguageCode)}
              className="bg-transparent text-[#172126] font-medium text-xs focus:outline-none cursor-pointer"
              aria-label="Language selector"
            >
              <option value="en" className="bg-[#FAF8F1] text-[#172126]">English</option>
              <option value="hi" className="bg-[#FAF8F1] text-[#172126]">हिंदी (Hindi)</option>
              <option value="as" className="bg-[#FAF8F1] text-[#172126]">অসমীয়া (Assamese)</option>
              <option value="bn" className="bg-[#FAF8F1] text-[#172126]">বাংলা (Bengali)</option>
            </select>
          </div>

          <span className="text-[#D7DEDC]">|</span>

          {/* Network / Offline Mode */}
          <button
            onClick={onToggleOfflineMode}
            className={`flex items-center space-x-1 transition-colors ${
              isOfflineMode ? 'text-[#C58A24]' : 'text-[#667579] hover:text-[#172126]'
            }`}
            title="Toggle Low-Network Offline PWA Simulation"
          >
            {isOfflineMode ? <WifiOff className="w-3.5 h-3.5 text-[#C58A24]" /> : <Wifi className="w-3.5 h-3.5 text-[#167F78]" />}
            <span className="text-[11px] font-medium">{isOfflineMode ? 'Offline Queue' : 'Connected'}</span>
            {queuedCount > 0 && (
              <span className="px-1 rounded bg-[#C95050] text-white text-[9px] font-bold">
                {queuedCount}
              </span>
            )}
          </button>

          <span className="text-[#D7DEDC]">|</span>

          {/* Report Incident CTA */}
          <button
            onClick={onOpenReportModal}
            className="flex items-center space-x-1 text-xs font-semibold text-[#167F78] hover:text-[#172126] transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Report Incident</span>
          </button>

          {onOpenFieldApp && (
            <>
              <span className="text-[#D7DEDC]">|</span>
              <button
                onClick={onOpenFieldApp}
                className="flex items-center space-x-1 text-xs font-bold text-[#FAF8F1] bg-[#167F78] hover:bg-[#136E68] px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-xs"
                title="Switch to Mobile PWA Field Mode"
              >
                <span>📱 Field App</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>

  );
};



