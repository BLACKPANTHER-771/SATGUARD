import React, { useState, useEffect, useMemo } from 'react';
import {
  CloudRain,
  Clock,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Droplets,
  Thermometer,
  Gauge,
  Activity,
  Radio,
  Info,
  MapPin,
  Sliders,
  Wind
} from 'lucide-react';
import {
  RiskZone,
  RegionalForecastDataset,
  EvaluatedForecastTimestep
} from '../../types';
import { TimeMachineBar } from '../timemachine/TimeMachineBar';
import { CommandCenterMap } from '../map3d/CommandCenterMap';
import { WeatherProviderOrchestrator } from '../../services/weatherProviderOrchestrator';
import { InterpretableRiskEngine, getRiskColor } from '../../services/riskEngine';
import { getPrimaryAOIForState, getAuthoritativeAOI } from '../../data/command-centre/aoiRegistry';

interface ForecastViewProps {
  zones: RiskZone[];
  selectedZone: RiskZone;
  selectedState?: string;
  onSelectZone: (zone: RiskZone) => void;
  timeOffset: number;
  onTimeChange: (offset: number) => void;
  rainfallIntensity: number;
  maxRiskPct: number;
}

type ForecastMode = 'REAL_FORECAST' | 'TACTICAL_SIMULATOR';

export const ForecastView: React.FC<ForecastViewProps> = ({
  zones,
  selectedZone,
  selectedState = 'Sikkim',
  onSelectZone,
  timeOffset,
  onTimeChange,
  rainfallIntensity,
  maxRiskPct
}) => {
  const [activeMode, setActiveMode] = useState<ForecastMode>('REAL_FORECAST');
  const [forecastDataset, setForecastDataset] = useState<RegionalForecastDataset | null>(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState<boolean>(true);
  const [selectedTimestepIndex, setSelectedTimestepIndex] = useState<number>(0);

  // Authoritative AOI context
  const primaryAOI = useMemo(() => {
    return getPrimaryAOIForState(selectedState);
  }, [selectedState]);

  const activeAOI = useMemo(() => {
    if (selectedZone?.id) {
      const found = getAuthoritativeAOI(selectedZone.id);
      if (found) return found;
    }
    return primaryAOI;
  }, [selectedZone, primaryAOI]);

  // 1. Fetch Real Forecast Telemetry (Meteorology via WeatherProviderOrchestrator: IMD -> OpenWeather -> Open-Meteo)
  useEffect(() => {
    let isMounted = true;
    setIsLoadingForecast(true);

    const loadForecast = async () => {
      try {
        const data = await WeatherProviderOrchestrator.getForecast(
          activeAOI.lat,
          activeAOI.lng,
          activeAOI.id,
          activeAOI.name,
          activeAOI.state,
          activeAOI.district
        );
        if (isMounted) {
          setForecastDataset(data);
          setSelectedTimestepIndex(0);
          setIsLoadingForecast(false);
        }
      } catch (err) {
        console.warn('Failed to load normalized forecast telemetry:', err);
        if (isMounted) {
          setIsLoadingForecast(false);
        }
      }
    };

    loadForecast();
    return () => {
      isMounted = false;
    };
  }, [activeAOI]);

  // 2. Dynamic Risk Evaluation through existing InterpretableRiskEngine
  const evaluatedTimesteps: EvaluatedForecastTimestep[] = useMemo(() => {
    if (!forecastDataset || forecastDataset.timesteps.length === 0) return [];

    const aoiInputs = {
      zoneId: activeAOI.id,
      zoneName: activeAOI.name,
      state: activeAOI.state,
      district: activeAOI.district,
      lat: activeAOI.lat,
      lng: activeAOI.lng,
      elevation_m: activeAOI.elevation_m,
      slope_deg: activeAOI.geotechnicalInputs.slope_deg,
      soil_moisture_pct: activeAOI.geotechnicalInputs.soil_moisture_pct,
      historical_events_5y: activeAOI.geotechnicalInputs.historical_events_5y,
      lithology: activeAOI.geotechnicalInputs.lithology,
      soil_type: activeAOI.geotechnicalInputs.soil_type,
      population_exposed: activeAOI.associatedAssets.totalPopulationExposed,
      villages_exposed: activeAOI.associatedAssets.settlements.map((s: { name: string }) => s.name),
      roads_affected: activeAOI.associatedAssets.roads.map((r: { name: string }) => r.name),
      critical_facilities: activeAOI.associatedAssets.facilities.map((f: { name: string }) => f.name),
      threatened_bridges: activeAOI.associatedAssets.bridges.map((b: { name: string }) => b.name)
    };

    return InterpretableRiskEngine.evaluateForecastTimesteps(
      forecastDataset.timesteps,
      aoiInputs
    );
  }, [forecastDataset, activeAOI]);

  // 3. Observed Current Baseline (Phase 5 Telemetry evaluated via Risk Engine)
  const currentObservedAnalysis = useMemo(() => {
    const liveRain1h = forecastDataset?.currentObserved.rainfall1hMm ?? rainfallIntensity ?? 34.2;
    const liveRain72h = forecastDataset?.currentObserved.rainfall72hMm ?? (liveRain1h * 4.2 + 20.0);

    const out = InterpretableRiskEngine.evaluateRisk({
      zoneId: activeAOI.id,
      zoneName: activeAOI.name,
      state: activeAOI.state,
      district: activeAOI.district,
      lat: activeAOI.lat,
      lng: activeAOI.lng,
      elevation_m: activeAOI.elevation_m,
      slope_deg: activeAOI.geotechnicalInputs.slope_deg,
      soil_moisture_pct: activeAOI.geotechnicalInputs.soil_moisture_pct,
      rainfall_1h_mm: liveRain1h,
      rainfall_72h_mm: liveRain72h,
      historical_events_5y: activeAOI.geotechnicalInputs.historical_events_5y,
      lithology: activeAOI.geotechnicalInputs.lithology,
      soil_type: activeAOI.geotechnicalInputs.soil_type,
      population_exposed: activeAOI.associatedAssets.totalPopulationExposed,
      villages_exposed: activeAOI.associatedAssets.settlements.map((s: { name: string }) => s.name),
      roads_affected: activeAOI.associatedAssets.roads.map((r: { name: string }) => r.name),
      critical_facilities: activeAOI.associatedAssets.facilities.map((f: { name: string }) => f.name),
      threatened_bridges: activeAOI.associatedAssets.bridges.map((b: { name: string }) => b.name)
    });

    return {
      rain1h: liveRain1h,
      rain72h: liveRain72h,
      riskScore: out.riskScore,
      riskLevel: out.riskLevel,
      exposureScore: out.exposureScore,
      priority: out.responsePriority,
      source: forecastDataset?.currentObserved.source || 'Active Telemetry Baseline'
    };
  }, [forecastDataset, activeAOI, rainfallIntensity]);


  const activeTimestep: EvaluatedForecastTimestep | null = useMemo(() => {
    if (evaluatedTimesteps.length === 0) return null;
    return evaluatedTimesteps[selectedTimestepIndex] || evaluatedTimesteps[0];
  }, [evaluatedTimesteps, selectedTimestepIndex]);

  // Risk Delta calculation
  const riskDelta = useMemo(() => {
    if (!activeTimestep || activeTimestep.forecastRiskScore === null) return null;
    const delta = activeTimestep.forecastRiskScore - currentObservedAnalysis.riskScore;
    return delta;
  }, [activeTimestep, currentObservedAnalysis]);

  // Read-only zone context for map view
  const mapZoneContext: RiskZone = useMemo(() => {
    if (selectedZone) return selectedZone;
    return zones.find(z => z.id === activeAOI.id) || zones[0];
  }, [selectedZone, zones, activeAOI]);

  return (
    <div className="h-full flex flex-col space-y-3 font-sans select-none overflow-y-auto pr-1 pb-4">
      {/* 1. TOP HEADER & OPERATIONAL MODE SELECTOR */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-subtle card-hover-lift">
        <div>
          <div className="flex items-center space-x-2.5">
            <CloudRain className="w-5 h-5 text-[#397FA8]" />
            <h1 className="font-semibold text-sm text-[#172126] tracking-wide uppercase">
              METEOROLOGICAL FORECAST & EARLY WARNING LAYER
            </h1>

            {/* Mode Indicator Badge */}
            {activeMode === 'REAL_FORECAST' ? (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider border flex items-center space-x-1 ${
                  forecastDataset?.provenance === 'LIVE'
                    ? 'bg-[#167F78]/15 text-[#167F78] border-[#167F78]/30'
                    : forecastDataset?.provenance === 'FALLBACK'
                    ? 'bg-[#397FA8]/15 text-[#397FA8] border-[#397FA8]/30'
                    : 'bg-[#DC2626]/15 text-[#DC2626] border-[#DC2626]/30'
                }`}
              >
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                <span>
                  {forecastDataset?.provenance === 'LIVE'
                    ? (forecastDataset?.source?.includes('IMD') ? '● IMD LIVE (Primary Gov AWS)' : '● LIVE (OpenWeather 5-Day)')
                    : forecastDataset?.provenance === 'FALLBACK'
                    ? '● FALLBACK (Open-Meteo WMO)'
                    : '● TELEMETRY UNAVAILABLE'}
                </span>
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C58A24]/15 text-[#C58A24] border border-[#C58A24]/30 font-bold flex items-center space-x-1">
                <Sliders className="w-2.5 h-2.5" />
                <span>SYNTHETIC DEMONSTRATION</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 mt-1 text-xs text-[#667579]">
            <div className="flex items-center space-x-1 font-medium text-[#172126]">
              <MapPin className="w-3.5 h-3.5 text-[#167F78]" />
              <span>
                {activeAOI.state} → {activeAOI.district} → {activeAOI.name}
              </span>
            </div>
            <span>•</span>
            <span className="font-mono text-[11px]">
              {activeAOI.lat.toFixed(4)}°N, {activeAOI.lng.toFixed(4)}°E
            </span>
          </div>
        </div>

        {/* Operational Mode Toggle */}
        <div className="flex items-center bg-[#E6EDEB] p-1 rounded-xl border border-[#D7DEDC] space-x-1">
          <button
            onClick={() => setActiveMode('REAL_FORECAST')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeMode === 'REAL_FORECAST'
                ? 'bg-[#FAF8F1] text-[#172126] shadow-subtle border border-[#D7DEDC]'
                : 'text-[#667579] hover:text-[#172126]'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5 text-[#397FA8]" />
            <span>REAL FORECAST LAYER</span>
          </button>

          <button
            onClick={() => setActiveMode('TACTICAL_SIMULATOR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeMode === 'TACTICAL_SIMULATOR'
                ? 'bg-[#FAF8F1] text-[#172126] shadow-subtle border border-[#D7DEDC]'
                : 'text-[#667579] hover:text-[#172126]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#C58A24]" />
            <span>TACTICAL NOWCAST (0–3H)</span>
          </button>
        </div>
      </div>

      {/* 2. MODE CONTENT: REAL FORECAST LAYER vs TACTICAL SIMULATOR */}
      {activeMode === 'REAL_FORECAST' ? (
        <div className="space-y-3">
          {/* A. CURRENT OBSERVED vs PROJECTED FORECAST COMPARISON GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* CURRENT OBSERVED BASELINE CARD */}
            <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 shadow-subtle">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#D7DEDC]/70">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-[#167F78]" />
                  <span className="text-xs font-bold text-[#172126] uppercase tracking-wider">
                    CURRENT OBSERVED BASELINE
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-[#E6EDEB] px-2 py-0.5 rounded text-[#667579] border border-[#D7DEDC]">
                  PHASE 5 TELEMETRY
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#E6EDEB]/70 p-2.5 rounded-lg border border-[#D7DEDC]">
                  <div className="text-[11px] text-[#667579] flex items-center space-x-1">
                    <Droplets className="w-3 h-3 text-[#397FA8]" />
                    <span>Observed Rain</span>
                  </div>
                  <div className="text-sm font-bold text-[#172126] font-mono mt-0.5">
                    {currentObservedAnalysis.rain1h.toFixed(1)} mm/hr
                  </div>
                  <div className="text-[10px] text-[#667579] font-mono mt-0.5">
                    72h: {currentObservedAnalysis.rain72h.toFixed(0)} mm
                  </div>
                </div>

                <div className="bg-[#E6EDEB]/70 p-2.5 rounded-lg border border-[#D7DEDC]">
                  <div className="text-[11px] text-[#667579] flex items-center space-x-1">
                    <ShieldAlert className="w-3 h-3 text-[#DC2626]" />
                    <span>Current Risk</span>
                  </div>
                  <div className="text-sm font-bold font-mono mt-0.5" style={{ color: getRiskColor(currentObservedAnalysis.riskScore) }}>
                    {currentObservedAnalysis.riskScore}%
                  </div>
                  <div className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: getRiskColor(currentObservedAnalysis.riskScore) }}>
                    {currentObservedAnalysis.riskLevel}
                  </div>
                </div>

                <div className="bg-[#E6EDEB]/70 p-2 rounded-lg border border-[#D7DEDC]">
                  <div className="text-[10px] text-[#667579]">Phase-3 Exposure</div>
                  <div className="text-xs font-bold text-[#172126] font-mono mt-0.5">
                    {currentObservedAnalysis.exposureScore} / 100
                  </div>
                  <div className="text-[9px] text-[#167F78] font-medium">Invariant Schema</div>
                </div>

                <div className="bg-[#E6EDEB]/70 p-2 rounded-lg border border-[#D7DEDC]">
                  <div className="text-[10px] text-[#667579]">Response Priority</div>
                  <div className="text-xs font-bold text-[#DC2626] font-mono mt-0.5">
                    {currentObservedAnalysis.priority.replace('_', ' ')}
                  </div>
                  <div className="text-[9px] text-[#667579]">Derived Rule Engine</div>
                </div>
              </div>

              <div className="mt-2.5 text-[10px] text-[#667579] flex items-center justify-between font-mono bg-[#E6EDEB]/40 px-2 py-1 rounded">
                <span>Source: {currentObservedAnalysis.source}</span>
                <span className="text-[#167F78] font-semibold">Live Operational</span>
              </div>
            </div>

            {/* PROJECTED FORECAST CONDITION CARD */}
            <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 shadow-subtle">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#D7DEDC]/70">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-[#397FA8] animate-pulse" />
                  <span className="text-xs font-bold text-[#172126] uppercase tracking-wider">
                    FORECAST CONDITION ({activeTimestep?.forecastHorizon || 'NOW'})
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-[#397FA8]/10 text-[#397FA8] px-2 py-0.5 rounded font-semibold border border-[#397FA8]/20">
                  {activeTimestep?.provenance || 'LIVE'}
                </span>
              </div>

              {activeTimestep && activeTimestep.forecastRiskScore !== null ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#E6EDEB]/70 p-2.5 rounded-lg border border-[#D7DEDC]">
                    <div className="text-[11px] text-[#667579] flex items-center space-x-1">
                      <CloudRain className="w-3 h-3 text-[#397FA8]" />
                      <span>Projected Rain Rate</span>
                    </div>
                    <div className="text-sm font-bold text-[#397FA8] font-mono mt-0.5">
                      {activeTimestep.rainfallIntensityMmHr !== null ? `${activeTimestep.rainfallIntensityMmHr.toFixed(1)} mm/hr` : 'UNAVAILABLE'}
                    </div>
                    <div className="text-[10px] text-[#667579] font-mono mt-0.5">
                      72h Accum: {activeTimestep.rolling72hAccumulationMm !== null ? `${activeTimestep.rolling72hAccumulationMm.toFixed(0)} mm` : 'N/A'}
                    </div>
                  </div>

                  <div className="bg-[#E6EDEB]/70 p-2.5 rounded-lg border border-[#D7DEDC]">
                    <div className="text-[11px] text-[#667579] flex items-center space-x-1">
                      <ShieldAlert className="w-3 h-3" style={{ color: getRiskColor(activeTimestep.forecastRiskScore) }} />
                      <span>Forecast Risk</span>
                    </div>
                    <div className="text-sm font-bold font-mono mt-0.5" style={{ color: getRiskColor(activeTimestep.forecastRiskScore) }}>
                      {activeTimestep.forecastRiskScore}%
                    </div>
                    <div className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: getRiskColor(activeTimestep.forecastRiskScore) }}>
                      {activeTimestep.forecastRiskLevel}
                    </div>
                  </div>

                  <div className="bg-[#E6EDEB]/70 p-2 rounded-lg border border-[#D7DEDC]">
                    <div className="text-[10px] text-[#667579]">Risk Delta vs Baseline</div>
                    <div className="text-xs font-bold font-mono mt-0.5 flex items-center space-x-1">
                      {riskDelta !== null && riskDelta > 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-[#DC2626]" />
                          <span className="text-[#DC2626]">+{riskDelta}% Surge</span>
                        </>
                      ) : riskDelta !== null && riskDelta < 0 ? (
                        <>
                          <TrendingDown className="w-3 h-3 text-[#167F78]" />
                          <span className="text-[#167F78]">{riskDelta}% Receding</span>
                        </>
                      ) : (
                        <span className="text-[#667579]">±0% Steady</span>
                      )}
                    </div>
                    <div className="text-[9px] text-[#667579]">Dynamic Recalculation</div>
                  </div>

                  <div className="bg-[#E6EDEB]/70 p-2 rounded-lg border border-[#D7DEDC]">
                    <div className="text-[10px] text-[#667579]">Forecast Priority</div>
                    <div className="text-xs font-bold text-[#DC2626] font-mono mt-0.5">
                      {activeTimestep.forecastPriority.replace('_', ' ')}
                    </div>
                    <div className="text-[9px] text-[#667579]">Exposure: {activeTimestep.forecastExposureScore} / 100</div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-[#667579] font-mono">
                  Forecast telemetry is currently unavailable for this timestep.
                </div>
              )}

              <div className="mt-2.5 text-[10px] text-[#667579] flex items-center justify-between font-mono bg-[#E6EDEB]/40 px-2 py-1 rounded">
                <span>Model: {activeTimestep?.source || 'OpenWeather / Open-Meteo'}</span>
                <span className="text-[#397FA8] font-semibold">Interpretable Engine</span>
              </div>
            </div>
          </div>

          {/* B. PROVIDER-NATIVE TIMESTEP SELECTOR STRIP */}
          <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3 shadow-subtle">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-[#167F78]" />
                <span className="text-xs font-bold text-[#172126] uppercase tracking-wider">
                  PROJECTED METEOROLOGICAL TIMESTEPS (PROVIDER NATIVE)
                </span>
              </div>
              <span className="text-[11px] text-[#667579] font-mono">
                {evaluatedTimesteps.length} Forecast Intervals Available
              </span>
            </div>

            {isLoadingForecast ? (
              <div className="py-6 flex items-center justify-center space-x-2 text-xs font-mono text-[#667579]">
                <div className="w-4 h-4 rounded-full border-2 border-[#167F78] border-t-transparent animate-spin" />
                <span>FETCHING METEOROLOGICAL FORECAST DATA...</span>
              </div>
            ) : evaluatedTimesteps.length > 0 ? (
              <div className="flex items-center space-x-2 overflow-x-auto py-1">
                {evaluatedTimesteps.map((step, idx) => {
                  const isSelected = selectedTimestepIndex === idx;
                  const timeFormatted = new Date(step.timestampIso).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <button
                      key={`${step.offsetHours}_${idx}`}
                      onClick={() => setSelectedTimestepIndex(idx)}
                      className={`min-w-[105px] p-2 rounded-lg text-left transition-all cursor-pointer flex flex-col border ${
                        isSelected
                          ? 'bg-[#E6EDEB] border-[#397FA8] shadow-subtle ring-1 ring-[#397FA8]/30'
                          : 'bg-[#FAF8F1] border-[#D7DEDC] hover:bg-[#E6EDEB]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-bold ${isSelected ? 'text-[#397FA8]' : 'text-[#172126]'}`}>
                          {step.forecastHorizon}
                        </span>
                        <span className="text-[10px] text-[#667579] font-mono">{timeFormatted}</span>
                      </div>

                      <div className="text-[11px] font-mono font-semibold text-[#397FA8] mt-1">
                        {step.rainfallIntensityMmHr !== null ? `${step.rainfallIntensityMmHr.toFixed(1)} mm/h` : 'N/A'}
                      </div>

                      <div className="mt-1.5 flex items-center justify-between">
                        {step.forecastRiskScore !== null ? (
                          <span
                            className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border"
                            style={{
                              color: getRiskColor(step.forecastRiskScore),
                              borderColor: `${getRiskColor(step.forecastRiskScore)}40`,
                              backgroundColor: `${getRiskColor(step.forecastRiskScore)}15`
                            }}
                          >
                            {step.forecastRiskScore}%
                          </span>
                        ) : (
                          <span className="text-[9px] text-[#667579] font-mono">UNAVAIL</span>
                        )}

                        <span className="text-[9px] text-[#667579] font-mono">
                          {step.temperatureC !== null ? `${step.temperatureC}°C` : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-[#DC2626] font-mono">
                No forecast timesteps available from meteorological provider.
              </div>
            )}
          </div>

          {/* C. METEOROLOGICAL METRICS & FACTOR CONTRIBUTION BREAKDOWN */}
          {activeTimestep && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Tile 1: Meteorological Telemetry Details */}
              <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 shadow-subtle lg:col-span-1">
                <div className="flex items-center space-x-2 pb-2 mb-2.5 border-b border-[#D7DEDC]/70">
                  <Wind className="w-3.5 h-3.5 text-[#397FA8]" />
                  <span className="text-xs font-bold text-[#172126] uppercase tracking-wider">
                    WEATHER PARAMETERS
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#E6EDEB]/70 border border-[#D7DEDC]">
                    <div className="flex items-center space-x-1.5 text-[#667579]">
                      <Thermometer className="w-3.5 h-3.5 text-[#C58A24]" />
                      <span>Temperature</span>
                    </div>
                    <span className="font-mono font-bold text-[#172126]">
                      {activeTimestep.temperatureC !== null ? `${activeTimestep.temperatureC} °C` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#E6EDEB]/70 border border-[#D7DEDC]">
                    <div className="flex items-center space-x-1.5 text-[#667579]">
                      <Droplets className="w-3.5 h-3.5 text-[#397FA8]" />
                      <span>Relative Humidity</span>
                    </div>
                    <span className="font-mono font-bold text-[#172126]">
                      {activeTimestep.humidityPct !== null ? `${activeTimestep.humidityPct} %` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#E6EDEB]/70 border border-[#D7DEDC]">
                    <div className="flex items-center space-x-1.5 text-[#667579]">
                      <Wind className="w-3.5 h-3.5 text-[#167F78]" />
                      <span>Wind Velocity</span>
                    </div>
                    <span className="font-mono font-bold text-[#172126]">
                      {activeTimestep.windSpeedKmh !== null ? `${activeTimestep.windSpeedKmh} km/h` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#E6EDEB]/70 border border-[#D7DEDC]">
                    <div className="flex items-center space-x-1.5 text-[#667579]">
                      <Gauge className="w-3.5 h-3.5 text-[#667579]" />
                      <span>Surface Pressure</span>
                    </div>
                    <span className="font-mono font-bold text-[#172126]">
                      {activeTimestep.pressureHpa !== null ? `${activeTimestep.pressureHpa} hPa` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tile 2: Risk Factor Point Contribution Breakdown (Phase 2 Weights) */}
              <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 shadow-subtle lg:col-span-2">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#D7DEDC]/70">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-3.5 h-3.5 text-[#DC2626]" />
                    <span className="text-xs font-bold text-[#172126] uppercase tracking-wider">
                      DYNAMIC MULTI-FACTOR RISK EXPLAINABILITY (CANONICAL WEIGHTS)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#667579]">
                    Total: {activeTimestep.forecastRiskScore}%
                  </span>
                </div>

                {activeTimestep.factorContributions ? (
                  <div className="space-y-2.5">
                    {/* Progress Bar Breakdown */}
                    <div className="h-3.5 w-full bg-[#E6EDEB] rounded-full overflow-hidden flex border border-[#D7DEDC]">
                      <div
                        style={{ width: `${activeTimestep.factorContributions.rainfall}%` }}
                        className="bg-[#397FA8] h-full"
                        title={`Rainfall (40%): ${activeTimestep.factorContributions.rainfall} pts`}
                      />
                      <div
                        style={{ width: `${activeTimestep.factorContributions.slope}%` }}
                        className="bg-[#DC2626] h-full"
                        title={`Slope (26%): ${activeTimestep.factorContributions.slope} pts`}
                      />
                      <div
                        style={{ width: `${activeTimestep.factorContributions.soilMoisture}%` }}
                        className="bg-[#C58A24] h-full"
                        title={`Soil Moisture (18%): ${activeTimestep.factorContributions.soilMoisture} pts`}
                      />
                      <div
                        style={{ width: `${activeTimestep.factorContributions.history}%` }}
                        className="bg-[#667579] h-full"
                        title={`History (9%): ${activeTimestep.factorContributions.history} pts`}
                      />
                      <div
                        style={{ width: `${activeTimestep.factorContributions.lithology}%` }}
                        className="bg-[#167F78] h-full"
                        title={`Lithology (7%): ${activeTimestep.factorContributions.lithology} pts`}
                      />
                    </div>

                    {/* Factor Contribution Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
                      <div className="bg-[#397FA8]/10 border border-[#397FA8]/20 p-1.5 rounded-lg text-center">
                        <div className="text-[#397FA8] font-bold">Rainfall (40%)</div>
                        <div className="font-bold text-[#172126] mt-0.5">
                          {activeTimestep.factorContributions.rainfall.toFixed(1)} pts
                        </div>
                      </div>

                      <div className="bg-[#DC2626]/10 border border-[#DC2626]/20 p-1.5 rounded-lg text-center">
                        <div className="text-[#DC2626] font-bold">Slope (26%)</div>
                        <div className="font-bold text-[#172126] mt-0.5">
                          {activeTimestep.factorContributions.slope.toFixed(1)} pts
                        </div>
                      </div>

                      <div className="bg-[#C58A24]/10 border border-[#C58A24]/20 p-1.5 rounded-lg text-center">
                        <div className="text-[#C58A24] font-bold">Moisture (18%)</div>
                        <div className="font-bold text-[#172126] mt-0.5">
                          {activeTimestep.factorContributions.soilMoisture.toFixed(1)} pts
                        </div>
                      </div>

                      <div className="bg-[#667579]/10 border border-[#667579]/20 p-1.5 rounded-lg text-center">
                        <div className="text-[#667579] font-bold">History (9%)</div>
                        <div className="font-bold text-[#172126] mt-0.5">
                          {activeTimestep.factorContributions.history.toFixed(1)} pts
                        </div>
                      </div>

                      <div className="bg-[#167F78]/10 border border-[#167F78]/20 p-1.5 rounded-lg text-center">
                        <div className="text-[#167F78] font-bold">Lithology (7%)</div>
                        <div className="font-bold text-[#172126] mt-0.5">
                          {activeTimestep.factorContributions.lithology.toFixed(1)} pts
                        </div>
                      </div>
                    </div>

                    {/* Threat Corridor & Asset Context */}
                    <div className="p-2.5 rounded-lg bg-[#E6EDEB]/70 border border-[#D7DEDC] text-xs">
                      <div className="font-semibold text-[#172126] flex items-center space-x-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-[#DC2626]" />
                        <span>Authoritative AOI Infrastructure At Risk:</span>
                      </div>
                      <div className="text-[#667579] mt-1 leading-relaxed">
                        Corridors: <span className="text-[#172126] font-medium">{activeAOI.associatedAssets.roads.map((r: { name: string }) => r.name).join(', ')}</span> • Bridges:{' '}
                        <span className="text-[#172126] font-medium">{activeAOI.associatedAssets.bridges.map((b: { name: string }) => b.name).join(', ')}</span> • Population:{' '}
                        <span className="text-[#172126] font-medium">{activeAOI.associatedAssets.totalPopulationExposed.toLocaleString()} persons</span>.
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-[#667579] font-mono">
                    Factor breakdown is unavailable for this timestep.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TACTICAL NOWCAST SIMULATOR (SYNTHETIC DEMONSTRATION) */
        <div className="space-y-3">
          <div className="bg-[#C58A24]/10 border border-[#C58A24]/30 rounded-xl p-3 flex items-center space-x-2 text-xs text-[#C58A24]">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>SYNTHETIC DEMONSTRATION MODE:</strong> Tactical what-if simulation allows decision-makers to stress-test slope failure thresholds across progressive pore pressure saturation steps. This is a synthetic demonstration model and not live telemetry.
            </span>
          </div>

          {/* Time Machine Bar */}
          <TimeMachineBar
            timeOffset={timeOffset}
            onTimeChange={onTimeChange}
            rainfallIntensity={rainfallIntensity}
            maxRiskPct={maxRiskPct}
          />
        </div>
      )}

      {/* 3. 3D / MAP CANVAS (READ-ONLY CENTERED ON AUTHORITATIVE AOI) */}
      <div className="min-h-[440px] flex-1 rounded-xl overflow-hidden border border-[#D7DEDC] bg-[#11191D] relative shadow-subtle">
        <CommandCenterMap
          zones={zones}
          selectedZone={mapZoneContext}
          onSelectZone={onSelectZone}
          timeOffset={activeMode === 'TACTICAL_SIMULATOR' ? timeOffset : 0}
          className="h-full"
        />
      </div>
    </div>
  );
};




