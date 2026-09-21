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
  Wind,
  AlertTriangle,
  Layers,
  Compass,
  Building,
  CheckCircle2,
  Calendar,
  Zap,
  Mountain
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
  const [forecastWindow, setForecastWindow] = useState<'6h' | '24h' | '72h'>('24h');
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

  // 1. Fetch Real Forecast Telemetry (IMD -> OpenWeather -> Open-Meteo)
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

  // 2. Dynamic Risk Evaluation through InterpretableRiskEngine
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

  // 3. Observed Current Baseline
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

  // Filtered timesteps based on 6h/24h/72h window
  const visibleTimesteps = useMemo(() => {
    return evaluatedTimesteps.filter(step => {
      if (forecastWindow === '6h') return step.offsetHours <= 6;
      if (forecastWindow === '24h') return step.offsetHours <= 24;
      return step.offsetHours <= 72;
    });
  }, [evaluatedTimesteps, forecastWindow]);

  // SVG Chart data points calculation
  const chartPoints = useMemo(() => {
    if (visibleTimesteps.length === 0) return { rainPath: '', moisturePath: '', points: [] };

    const width = 600;
    const height = 120;
    const padding = 20;

    const maxRain = Math.max(...visibleTimesteps.map(s => s.rainfallIntensityMmHr || 0), 40);
    const stepX = (width - padding * 2) / Math.max(1, visibleTimesteps.length - 1);

    const points = visibleTimesteps.map((s, idx) => {
      const x = padding + idx * stepX;
      const rainVal = s.rainfallIntensityMmHr || 0;
      const yRain = height - padding - (rainVal / maxRain) * (height - padding * 2);
      const moistureVal = activeAOI.geotechnicalInputs.soil_moisture_pct + (rainVal * 0.4);
      const yMoisture = height - padding - (Math.min(100, moistureVal) / 100) * (height - padding * 2);

      return { x, yRain, yMoisture, rainVal, moistureVal, horizon: s.forecastHorizon, step: s };
    });

    const rainPath = points.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x} ${p.yRain}`, '');
    const moisturePath = points.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x} ${p.yMoisture}`, '');

    return { rainPath, moisturePath, points };
  }, [visibleTimesteps, activeAOI]);

  return (
    <div className="h-full flex flex-col space-y-3 font-sans select-none overflow-y-auto pr-1 pb-4 bg-[#071018] text-slate-100">
      {/* 1. TOP HEADER & OPERATIONAL MODE SELECTOR */}
      <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg shrink-0">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
            <h1 className="font-mono font-bold text-sm text-slate-100 tracking-wider uppercase flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-sky-400" />
              FUTURE HAZARD & EARLY-WARNING MISSION CONTROL
            </h1>

            {/* Mode Indicator Badge */}
            {activeMode === 'REAL_FORECAST' ? (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider border flex items-center space-x-1.5 ${
                  forecastDataset?.provenance === 'LIVE'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : forecastDataset?.provenance === 'FALLBACK'
                    ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                <span>
                  {forecastDataset?.provenance === 'LIVE'
                    ? (forecastDataset?.source?.includes('IMD') ? '● IMD LIVE AWS (Gov Telemetry)' : '● LIVE (OpenWeather 5-Day)')
                    : forecastDataset?.provenance === 'FALLBACK'
                    ? '● FALLBACK (Open-Meteo WMO)'
                    : '● TELEMETRY UNAVAILABLE'}
                </span>
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold flex items-center space-x-1">
                <Sliders className="w-2.5 h-2.5" />
                <span>SYNTHETIC DEMONSTRATION</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 mt-1 text-xs text-slate-400 font-mono">
            <div className="flex items-center space-x-1 text-slate-200">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {activeAOI.state} → {activeAOI.district} → <strong>{activeAOI.name}</strong>
              </span>
            </div>
            <span>•</span>
            <span className="text-slate-400">
              Coordinates: {activeAOI.lat.toFixed(4)}°N, {activeAOI.lng.toFixed(4)}°E
            </span>
            <span>•</span>
            <span className="text-sky-400">
              Elev: {activeAOI.elevation_m}m | Slope: {activeAOI.geotechnicalInputs.slope_deg}°
            </span>
          </div>
        </div>

        {/* Operational Mode Toggle */}
        <div className="flex items-center bg-[#071018] p-1 rounded-lg border border-[#162E44] space-x-1 text-xs font-mono">
          <button
            onClick={() => setActiveMode('REAL_FORECAST')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeMode === 'REAL_FORECAST'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>REAL EARLY WARNING</span>
          </button>

          <button
            onClick={() => setActiveMode('TACTICAL_SIMULATOR')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeMode === 'TACTICAL_SIMULATOR'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>TACTICAL WHAT-IF (0–3H)</span>
          </button>
        </div>
      </div>

      {/* 2. MODE CONTENT: REAL EARLY-WARNING vs TACTICAL SIMULATOR */}
      {activeMode === 'REAL_FORECAST' ? (
        <div className="space-y-3">
          {/* A. CURRENT OBSERVED vs PROJECTED FORECAST COMPARISON GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* CURRENT OBSERVED BASELINE CARD */}
            <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3.5 shadow-lg">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#162E44]">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-sky-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    CURRENT OBSERVED TELEMETRY BASELINE
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-[#071018] px-2 py-0.5 rounded text-slate-400 border border-[#162E44]">
                  GROUND AWS SENSORS
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#071018] p-2.5 rounded-lg border border-[#162E44]">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1 font-mono">
                    <Droplets className="w-3 h-3 text-sky-400" />
                    <span>Observed Rain</span>
                  </div>
                  <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                    {currentObservedAnalysis.rain1h.toFixed(1)} mm/hr
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    72h Accum: {currentObservedAnalysis.rain72h.toFixed(0)} mm
                  </div>
                </div>

                <div className="bg-[#071018] p-2.5 rounded-lg border border-[#162E44]">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1 font-mono">
                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                    <span>Current Risk</span>
                  </div>
                  <div className="text-sm font-bold font-mono mt-0.5" style={{ color: getRiskColor(currentObservedAnalysis.riskScore) }}>
                    {currentObservedAnalysis.riskScore}%
                  </div>
                  <div className="text-[10px] font-bold uppercase mt-0.5 font-mono" style={{ color: getRiskColor(currentObservedAnalysis.riskScore) }}>
                    {currentObservedAnalysis.riskLevel}
                  </div>
                </div>

                <div className="bg-[#071018] p-2 rounded-lg border border-[#162E44]">
                  <div className="text-[10px] text-slate-400 font-mono">Exposure Index</div>
                  <div className="text-xs font-bold text-slate-200 font-mono mt-0.5">
                    {currentObservedAnalysis.exposureScore} / 100
                  </div>
                  <div className="text-[9px] text-sky-400 font-mono">High Exposure Zone</div>
                </div>

                <div className="bg-[#071018] p-2 rounded-lg border border-[#162E44]">
                  <div className="text-[10px] text-slate-400 font-mono">Response Priority</div>
                  <div className="text-xs font-bold text-rose-400 font-mono mt-0.5">
                    {currentObservedAnalysis.priority.replace('_', ' ')}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">Real-Time Dispatch</div>
                </div>
              </div>

              <div className="mt-2.5 text-[10px] text-slate-400 flex items-center justify-between font-mono bg-[#071018] px-2.5 py-1 rounded border border-[#162E44]">
                <span>Source: {currentObservedAnalysis.source}</span>
                <span className="text-emerald-400 font-semibold">Live Operational</span>
              </div>
            </div>

            {/* PROJECTED FORECAST HAZARD CARD */}
            <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3.5 shadow-lg">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#162E44]">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    PROJECTED HAZARD ({activeTimestep?.forecastHorizon || 'NOW'})
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded font-semibold border border-sky-500/20">
                  {activeTimestep?.provenance || 'LIVE'}
                </span>
              </div>

              {activeTimestep && activeTimestep.forecastRiskScore !== null ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#071018] p-2.5 rounded-lg border border-[#162E44]">
                    <div className="text-[11px] text-slate-400 flex items-center space-x-1 font-mono">
                      <CloudRain className="w-3 h-3 text-sky-400" />
                      <span>Projected Rain</span>
                    </div>
                    <div className="text-sm font-bold text-sky-400 font-mono mt-0.5">
                      {activeTimestep.rainfallIntensityMmHr !== null ? `${activeTimestep.rainfallIntensityMmHr.toFixed(1)} mm/hr` : 'UNAVAILABLE'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      72h Accum: {activeTimestep.rolling72hAccumulationMm !== null ? `${activeTimestep.rolling72hAccumulationMm.toFixed(0)} mm` : 'N/A'}
                    </div>
                  </div>

                  <div className="bg-[#071018] p-2.5 rounded-lg border border-[#162E44]">
                    <div className="text-[11px] text-slate-400 flex items-center space-x-1 font-mono">
                      <ShieldAlert className="w-3 h-3" style={{ color: getRiskColor(activeTimestep.forecastRiskScore) }} />
                      <span>Forecast Risk</span>
                    </div>
                    <div className="text-sm font-bold font-mono mt-0.5" style={{ color: getRiskColor(activeTimestep.forecastRiskScore) }}>
                      {activeTimestep.forecastRiskScore}%
                    </div>
                    <div className="text-[10px] font-bold uppercase mt-0.5 font-mono" style={{ color: getRiskColor(activeTimestep.forecastRiskScore) }}>
                      {activeTimestep.forecastRiskLevel}
                    </div>
                  </div>

                  <div className="bg-[#071018] p-2 rounded-lg border border-[#162E44]">
                    <div className="text-[10px] text-slate-400 font-mono">Risk Delta Trajectory</div>
                    <div className="text-xs font-bold font-mono mt-0.5 flex items-center space-x-1">
                      {riskDelta !== null && riskDelta > 0 ? (
                        <>
                          <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-rose-400">+{riskDelta}% Surge</span>
                        </>
                      ) : riskDelta !== null && riskDelta < 0 ? (
                        <>
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">{riskDelta}% Receding</span>
                        </>
                      ) : (
                        <span className="text-slate-400">±0% Steady</span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">Slope Pore-Pressure</div>
                  </div>

                  <div className="bg-[#071018] p-2 rounded-lg border border-[#162E44]">
                    <div className="text-[10px] text-slate-400 font-mono">Forecast Priority</div>
                    <div className="text-xs font-bold text-rose-400 font-mono mt-0.5">
                      {activeTimestep.forecastPriority.replace('_', ' ')}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">Exposed: {activeAOI.associatedAssets.totalPopulationExposed.toLocaleString()}</div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 font-mono">
                  Forecast telemetry is currently unavailable for this timestep.
                </div>
              )}

              <div className="mt-2.5 text-[10px] text-slate-400 flex items-center justify-between font-mono bg-[#071018] px-2.5 py-1 rounded border border-[#162E44]">
                <span>Model: {activeTimestep?.source || 'OpenWeather / Open-Meteo'}</span>
                <span className="text-sky-400 font-semibold">Interpretable Risk Engine</span>
              </div>
            </div>
          </div>

          {/* B. DYNAMIC RAINFALL & SOIL MOISTURE TREND INTERACTIVE CHART */}
          <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3.5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <h3 className="font-mono font-bold text-xs uppercase text-slate-100 tracking-wider">
                  PROJECTED PRECIPITATION & SOIL SATURATION HYDROGRAPH ({forecastWindow.toUpperCase()} WINDOW)
                </h3>
              </div>

              {/* Window Switcher */}
              <div className="flex items-center bg-[#071018] p-0.5 rounded-lg border border-[#162E44] text-[10px] font-mono">
                <button
                  onClick={() => setForecastWindow('6h')}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                    forecastWindow === '6h'
                      ? 'bg-sky-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  6h Tactical
                </button>
                <button
                  onClick={() => setForecastWindow('24h')}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                    forecastWindow === '24h'
                      ? 'bg-sky-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  24h Operational
                </button>
                <button
                  onClick={() => setForecastWindow('72h')}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                    forecastWindow === '72h'
                      ? 'bg-sky-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  72h Synoptic
                </button>
              </div>
            </div>

            {/* SVG Trend Visualization */}
            <div className="relative bg-[#071018] border border-[#162E44] rounded-lg p-3">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2 border-b border-[#162E44] pb-1.5">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                    <span className="text-sky-300 font-semibold">Precipitation Rate (mm/hr)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-amber-300 font-semibold">Volumetric Soil Moisture (%)</span>
                  </div>
                </div>
                <span className="text-rose-400 font-bold">CRITICAL SATURATION THRESHOLD: 80%</span>
              </div>

              {chartPoints.points.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <svg viewBox="0 0 600 130" className="w-full h-32">
                    {/* Grid lines */}
                    <line x1="20" y1="20" x2="580" y2="20" stroke="#162E44" strokeDasharray="3 3" />
                    <line x1="20" y1="60" x2="580" y2="60" stroke="#162E44" strokeDasharray="3 3" />
                    <line x1="20" y1="100" x2="580" y2="100" stroke="#162E44" strokeDasharray="3 3" />

                    {/* Critical 80% Threshold Line */}
                    <line x1="20" y1="36" x2="580" y2="36" stroke="#ef4444" strokeDasharray="4 4" strokeWidth="1.2" opacity="0.6" />

                    {/* Rain Path */}
                    <path
                      d={chartPoints.rainPath}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Soil Moisture Path */}
                    <path
                      d={chartPoints.moisturePath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="2 2"
                      strokeLinecap="round"
                    />

                    {/* Interactive Points */}
                    {chartPoints.points.map((p, idx) => (
                      <g key={idx} className="cursor-pointer" onClick={() => setSelectedTimestepIndex(idx)}>
                        <circle
                          cx={p.x}
                          cy={p.yRain}
                          r={selectedTimestepIndex === idx ? 5 : 3.5}
                          fill={selectedTimestepIndex === idx ? '#38bdf8' : '#071018'}
                          stroke="#38bdf8"
                          strokeWidth="2"
                        />
                        <text
                          x={p.x}
                          y="125"
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {p.horizon}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              ) : (
                <div className="py-8 text-center text-xs font-mono text-slate-400">
                  Loading hydrograph visualization...
                </div>
              )}
            </div>

            {/* Timestep Selector Cards */}
            <div className="flex items-center space-x-2 overflow-x-auto py-2.5 mt-2">
              {visibleTimesteps.map((step, idx) => {
                const isSelected = selectedTimestepIndex === idx;
                const timeFormatted = new Date(step.timestampIso).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <button
                    key={`${step.offsetHours}_${idx}`}
                    onClick={() => setSelectedTimestepIndex(idx)}
                    className={`min-w-[110px] p-2.5 rounded-lg text-left transition-all cursor-pointer flex flex-col border ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-500 shadow-md ring-1 ring-sky-500'
                        : 'bg-[#071018] border-[#162E44] hover:bg-[#162E44]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full font-mono">
                      <span className={`text-xs font-bold ${isSelected ? 'text-sky-400' : 'text-slate-200'}`}>
                        {step.forecastHorizon}
                      </span>
                      <span className="text-[9px] text-slate-500">{timeFormatted}</span>
                    </div>

                    <div className="text-[11px] font-mono font-bold text-sky-400 mt-1">
                      {step.rainfallIntensityMmHr !== null ? `${step.rainfallIntensityMmHr.toFixed(1)} mm/h` : 'N/A'}
                    </div>

                    <div className="mt-1.5 flex items-center justify-between font-mono">
                      {step.forecastRiskScore !== null ? (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.2 rounded border"
                          style={{
                            color: getRiskColor(step.forecastRiskScore),
                            borderColor: `${getRiskColor(step.forecastRiskScore)}40`,
                            backgroundColor: `${getRiskColor(step.forecastRiskScore)}15`
                          }}
                        >
                          {step.forecastRiskScore}%
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500">UNAVAIL</span>
                      )}

                      <span className="text-[9px] text-slate-400">
                        {step.temperatureC !== null ? `${step.temperatureC}°C` : ''}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* C. TERRAIN SUSCEPTIBILITY, FACTOR CONTRIBUTIONS & LIFELINES */}
          {activeTimestep && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Tile 1: Terrain & Geomorphological Susceptibility Profile */}
              <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3.5 shadow-lg lg:col-span-1">
                <div className="flex items-center space-x-2 pb-2 mb-2.5 border-b border-[#162E44]">
                  <Mountain className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    TERRAIN SUSCEPTIBILITY PROFILE
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#071018] border border-[#162E44]">
                    <span className="text-slate-400">Slope Gradient:</span>
                    <span className="font-bold text-rose-400">{activeAOI.geotechnicalInputs.slope_deg}° (Steep Wall)</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#071018] border border-[#162E44]">
                    <span className="text-slate-400">Lithology Matrix:</span>
                    <span className="font-bold text-slate-200 text-right truncate max-w-[150px]">{activeAOI.geotechnicalInputs.lithology}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#071018] border border-[#162E44]">
                    <span className="text-slate-400">Soil Overburden:</span>
                    <span className="font-bold text-slate-200">{activeAOI.geotechnicalInputs.soil_type}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#071018] border border-[#162E44]">
                    <span className="text-slate-400">Historical Reactivations:</span>
                    <span className="font-bold text-amber-400">{activeAOI.geotechnicalInputs.historical_events_5y} Events / 5y</span>
                  </div>
                </div>
              </div>

              {/* Tile 2: Dynamic Multi-Factor Explainability Breakdown */}
              <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3.5 shadow-lg lg:col-span-2">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#162E44]">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                      DYNAMIC MULTI-FACTOR RISK EXPLAINABILITY (CANONICAL WEIGHTS)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Total: <strong className="text-rose-400">{activeTimestep.forecastRiskScore}%</strong>
                  </span>
                </div>

                {activeTimestep.factorContributions ? (
                  <div className="space-y-2.5">
                    {/* Progress Bar Breakdown */}
                    <div className="h-3.5 w-full bg-[#071018] rounded-full overflow-hidden flex border border-[#162E44]">
                      <div
                        style={{ width: `${activeTimestep.factorContributions.rainfall}%` }}
                        className="bg-sky-500 h-full"
                        title={`Rainfall (40%): ${activeTimestep.factorContributions.rainfall} pts`}
                      />
                      <div
                        style={{ width: `${activeTimestep.factorContributions.slope}%` }}
                        className="bg-rose-500 h-full"
                        title={`Slope (26%): ${activeTimestep.factorContributions.slope} pts`}
                      />
                      <div
                        style={{ width: `${activeTimestep.factorContributions.soilMoisture}%` }}
                        className="bg-amber-500 h-full"
                        title={`Soil Moisture (18%): ${activeTimestep.factorContributions.soilMoisture} pts`}
                      />
                      <div
                        style={{ width: `${activeTimestep.factorContributions.history}%` }}
                        className="bg-slate-500 h-full"
                        title={`History (9%): ${activeTimestep.factorContributions.history} pts`}
                      />
                      <div
                        style={{ width: `${activeTimestep.factorContributions.lithology}%` }}
                        className="bg-emerald-500 h-full"
                        title={`Lithology (7%): ${activeTimestep.factorContributions.lithology} pts`}
                      />
                    </div>

                    {/* Factor Contribution Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
                      <div className="bg-sky-500/10 border border-sky-500/20 p-2 rounded-lg text-center">
                        <div className="text-sky-400 font-bold">Rainfall (40%)</div>
                        <div className="font-bold text-slate-100 mt-0.5">
                          {activeTimestep.factorContributions.rainfall.toFixed(1)} pts
                        </div>
                      </div>

                      <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg text-center">
                        <div className="text-rose-400 font-bold">Slope (26%)</div>
                        <div className="font-bold text-slate-100 mt-0.5">
                          {activeTimestep.factorContributions.slope.toFixed(1)} pts
                        </div>
                      </div>

                      <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-center">
                        <div className="text-amber-400 font-bold">Moisture (18%)</div>
                        <div className="font-bold text-slate-100 mt-0.5">
                          {activeTimestep.factorContributions.soilMoisture.toFixed(1)} pts
                        </div>
                      </div>

                      <div className="bg-slate-500/10 border border-slate-500/20 p-2 rounded-lg text-center">
                        <div className="text-slate-400 font-bold">History (9%)</div>
                        <div className="font-bold text-slate-100 mt-0.5">
                          {activeTimestep.factorContributions.history.toFixed(1)} pts
                        </div>
                      </div>

                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-center">
                        <div className="text-emerald-400 font-bold">Lithology (7%)</div>
                        <div className="font-bold text-slate-100 mt-0.5">
                          {activeTimestep.factorContributions.lithology.toFixed(1)} pts
                        </div>
                      </div>
                    </div>

                    {/* Threat Corridor & Asset Context */}
                    <div className="p-2.5 rounded-lg bg-[#071018] border border-[#162E44] text-xs font-mono">
                      <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        <span>Critical Lifelines & Infrastructure In Danger Corridor:</span>
                      </div>
                      <div className="text-slate-400 mt-1 leading-relaxed">
                        Highways: <span className="text-slate-200 font-medium">{activeAOI.associatedAssets.roads.map((r: { name: string }) => r.name).join(', ')}</span> • Bridges:{' '}
                        <span className="text-slate-200 font-medium">{activeAOI.associatedAssets.bridges.map((b: { name: string }) => b.name).join(', ')}</span> • Settlements:{' '}
                        <span className="text-slate-200 font-medium">{activeAOI.associatedAssets.settlements.map((s: { name: string }) => s.name).join(', ')}</span> ({activeAOI.associatedAssets.totalPopulationExposed.toLocaleString()} persons).
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400 font-mono">
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
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-center space-x-2 text-xs text-amber-300 font-mono">
            <Info className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>
              <strong>SYNTHETIC DEMONSTRATION MODE:</strong> Tactical what-if simulation allows decision-makers to stress-test slope failure thresholds across progressive pore pressure saturation steps.
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
      <div className="min-h-[440px] flex-1 rounded-xl overflow-hidden border border-[#162E44] bg-[#071018] relative shadow-lg">
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
