import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Route,
  Home,
  Building2,
  Droplets,
  Mountain,
  History,
  Layers,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Send,
  CloudRain,
  Wind,
  Compass,
  Thermometer,
  Zap
} from 'lucide-react';
import { SummaryMetrics, CriticalEvent, RiskZone } from '../../types';
import { getWeatherDataForZone, RegionalWeatherReport } from '../../data/command-centre/weatherData';
import { WeatherProviderOrchestrator } from '../../services/weatherProviderOrchestrator';
import { InterpretableRiskEngine } from '../../services/riskEngine';

interface SituationIntelligenceProps {
  metrics: SummaryMetrics;
  criticalEvents: CriticalEvent[];
  selectedZone: RiskZone;
  onSelectEventZone: (zoneId: string) => void;
  timeOffset: number;
}

export const SituationIntelligence: React.FC<SituationIntelligenceProps> = ({
  metrics,
  criticalEvents,
  selectedZone,
  onSelectEventZone,
  timeOffset
}) => {
  // Live weather state for target zone
  const [weather, setWeather] = useState<RegionalWeatherReport>(
    getWeatherDataForZone(selectedZone?.id, selectedZone?.state)
  );
  const [isLiveWeather, setIsLiveWeather] = useState<boolean>(false);

  const analysis = InterpretableRiskEngine.evaluateRisk({
    zoneId: selectedZone?.id,
    zoneName: selectedZone?.name,
    state: selectedZone?.state,
    district: selectedZone?.district,
    lat: selectedZone?.lat,
    lng: selectedZone?.lng,
    elevation_m: selectedZone?.elevation_m,
    slope_deg: selectedZone?.slope_deg,
    soil_moisture_pct: selectedZone?.soil_moisture_pct,
    rainfall_1h_mm: weather?.rainfall1hMm ?? selectedZone?.rainfall_1h_mm,
    rainfall_72h_mm: weather?.rainfall72hMm ?? selectedZone?.rainfall_72h_mm,
    rainfall_source: weather?.sourceCategory || (isLiveWeather ? 'LIVE' : 'SYNTHETIC'),
    historical_events_5y: selectedZone?.historical_events_5y,
    lithology: selectedZone?.lithology,
    population_exposed: selectedZone?.population_exposed,
    villages_exposed: selectedZone?.villages_exposed,
    roads_affected: selectedZone?.roads_affected,
    critical_facilities: selectedZone?.critical_facilities_affected,
    threatened_bridges: selectedZone?.key_assets?.filter(a => /bridge|span/i.test(a)),
    time_offset_min: timeOffset
  });

  const currentRiskPct = analysis.riskScore;
  const currentRain = Math.round((selectedZone?.rainfall_1h_mm || metrics.current_rainfall_intensity_mm_hr) * 10) / 10;
  const roadsAtRisk = (analysis.exposureRecord.vulnerable_road_segments.length || 1);
  const isCritical = analysis.riskLevel === 'CRITICAL';

  useEffect(() => {
    let isCancelled = false;

    const fetchLiveWeather = async () => {
      const lat = selectedZone?.lat || 27.3389;
      const lng = selectedZone?.lng || 88.6065;
      const zoneId = selectedZone?.id || 'sikkim-nh10-dikchu';
      const zoneName = selectedZone?.name || 'Dikchu-Singtam';
      const stateName = selectedZone?.state || 'Sikkim';

      const res = await WeatherProviderOrchestrator.getRegionalWeatherReport(lat, lng, zoneId, zoneName, stateName, selectedZone?.district);
      if (!isCancelled) {
        setWeather(res.report);
        setIsLiveWeather(res.isLive);
      }
    };

    fetchLiveWeather();

    return () => {
      isCancelled = true;
    };
  }, [selectedZone?.id, selectedZone?.lat, selectedZone?.lng, selectedZone?.name, selectedZone?.state]);

  const exp = selectedZone?.risk_drivers_explanation || {
    rainfall_contribution_pct: 38,
    slope_contribution_pct: 29,
    soil_moisture_contribution_pct: 18,
    historical_landslide_pct: 9,
    lithology_contribution_pct: 6,
    critical_trigger: 'High saturation in colluvial layer exceeding slope stability threshold.'
  };

  const drivers = [
    { name: 'Rainfall Saturation', pct: exp.rainfall_contribution_pct, color: 'bg-[#397FA8]', icon: Droplets, val: `${selectedZone?.rainfall_72h_mm || 265} mm (72h)` },
    { name: 'Slope Gradient', pct: exp.slope_contribution_pct, color: 'bg-[#C95050]', icon: Mountain, val: `${selectedZone?.slope_deg || 34.8}° shear angle` },
    { name: 'Soil Moisture', pct: exp.soil_moisture_contribution_pct, color: 'bg-[#C58A24]', icon: Droplets, val: `${selectedZone?.soil_moisture_pct || 81}% saturation` },
    { name: 'Historical Frequency', pct: exp.historical_landslide_pct, color: 'bg-[#587A68]', icon: History, val: `${selectedZone?.historical_events_5y || 6} events in 5y` },
    { name: 'Lithology / Jointing', pct: exp.lithology_contribution_pct, color: 'bg-[#167F78]', icon: Layers, val: (selectedZone?.lithology || 'Gneiss & Schist').split('&')[0] }
  ];

  return (
    <div className="flex flex-col space-y-3 font-sans select-none">
      {/* SECTION TITLE & OPERATIONAL HEADER */}
      <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-1.5">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#C95050] animate-pulse" />
          <span className="font-bold text-xs text-[#172126] tracking-wider uppercase">
            SITUATION INTELLIGENCE
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF8F1] text-[#167F78] border border-[#D7DEDC] font-semibold">
          {selectedZone?.state || 'Sikkim'} · {selectedZone?.district || 'Pakyong'}
        </span>
      </div>

      {/* 1. TARGET REGION & CURRENT HAZARD RISK HERO */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 shadow-subtle card-hover-lift">
        <div className="flex items-center justify-between text-xs text-[#667579] font-medium">
          <span className="uppercase tracking-wider text-[11px] font-bold text-[#172126]">
            1. TARGET RISK: {selectedZone?.name?.split('(')[0] || 'Dikchu – Singtam'}
          </span>
          <span className={`font-bold text-[10px] uppercase px-2 py-0.5 rounded border ${
            isCritical
              ? 'bg-[#C95050]/15 text-[#C95050] border-[#C95050]/40'
              : 'bg-[#C58A24]/15 text-[#C58A24] border-[#C58A24]/40'
          }`}>
            {isCritical ? 'CRITICAL ESCALATION' : 'ELEVATED WATCH'}
          </span>
        </div>

        <div className="flex items-baseline justify-between mt-2">
          <div className="flex items-baseline space-x-2">
            <span className={`text-3xl md:text-4xl font-bold font-mono leading-none ${isCritical ? 'text-[#C95050]' : 'text-[#C58A24]'}`}>
              {currentRiskPct}%
            </span>
            <span className={`text-xs flex items-center font-semibold ${isCritical ? 'text-[#C95050]' : 'text-[#C58A24]'}`}>
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              ↑ Rising (+{metrics.risk_trend_pct}%)
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-[#167F78] block truncate max-w-[160px]">
              {selectedZone?.state} Sector
            </span>
            <span className="text-[10px] text-[#667579] font-mono block">
              Confidence: {Math.round((selectedZone?.model_confidence || 0.91) * 100)}%
            </span>
            <span className="text-[9px] font-mono text-[#C58A24] font-semibold">
              SYNTHETIC / DEMO RISK
            </span>
          </div>
        </div>
      </div>

      {/* 2. TARGET WEATHER INTELLIGENCE & WARNING (OpenWeather Live) */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3 shadow-subtle space-y-2 card-hover-lift">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#172126] uppercase tracking-wider">
          <span className="flex items-center">
            <CloudRain className="w-3.5 h-3.5 mr-1.5 text-[#397FA8]" />
            2. LOCAL WEATHER CONDITION
          </span>
          {isLiveWeather ? (
            <span className="text-[9px] font-mono text-[#167F78] font-bold flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#167F78] mr-1 animate-pulse" />
              LIVE OPENWEATHER
            </span>
          ) : (
            <span className="text-[9px] font-mono text-[#C58A24] font-semibold">[SYNTHETIC DEMO]</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC] flex flex-col">
            <span className="text-[10px] text-[#667579]">Temperature</span>
            <span className="font-bold font-mono text-sm text-[#172126]">
              {weather.temperatureC}°C <span className="text-[10px] font-normal text-[#667579]">({weather.cloudCondition})</span>
            </span>
          </div>

          <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC] flex flex-col">
            <span className="text-[10px] text-[#667579]">Wind & Humidity</span>
            <span className="font-semibold text-xs text-[#172126]">
              {weather.windSpeedKmh} km/h {weather.windDirectionCardinal} · {weather.humidityPct}% RH
            </span>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-[#E6EDEB] border border-[#D7DEDC] text-[11px] text-[#172126] leading-tight">
          <strong className="text-[#C95050]">IMD Warning: </strong>
          {weather.warningAdvisory}
        </div>
      </div>

      {/* 3. WHY THIS ZONE IS AT RISK (MULTI-FACTOR DRIVERS) */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3 shadow-subtle space-y-2 card-hover-lift">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#172126] uppercase tracking-wider">
          <span>3. WHY IS THIS ZONE AT RISK?</span>
          <span className="text-[10px] font-mono text-[#167F78]">FACTOR XAI</span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          {drivers.map((d) => {
            const Icon = d.icon;
            return (
              <div key={d.name} className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#172126] font-medium flex items-center">
                    <Icon className="w-3 h-3 mr-1.5 text-[#667579]" />
                    {d.name}
                  </span>
                  <span className="font-mono font-bold text-[#172126] text-[11px]">{d.pct}%</span>
                </div>
                <div className="w-full bg-[#E6EDEB] rounded-full h-1.5 overflow-hidden border border-[#D7DEDC]">
                  <div className={`${d.color} h-full rounded-full transition-all`} style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC] text-[11px] text-[#172126] flex items-center justify-between mt-2 font-mono">
          <span><strong>Rain:</strong> {currentRain} mm/h</span>
          <span><strong>Slope:</strong> {selectedZone?.slope_deg || 34.8}°</span>
          <span><strong>Soil:</strong> {selectedZone?.soil_moisture_pct || 81}%</span>
        </div>
      </div>

      {/* 4. IMPACT & EXPOSURE (LIFELINE RISK) */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3 space-y-2 shadow-subtle card-hover-lift">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#172126] uppercase tracking-wider">
          <span>4. IMPACT & INFRASTRUCTURE EXPOSURE</span>
          <span className="text-[#167F78] font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#167F78]/10 border border-[#167F78]/25 font-bold">
            {analysis.responsePriority.replace('_', ' ')} (EXP: {analysis.exposureScore}/100)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between bg-[#E6EDEB] px-2.5 py-2 rounded-lg border border-[#D7DEDC]">
            <span className="text-[#667579] flex items-center text-[11px]">
              <Route className="w-3.5 h-3.5 mr-1.5 text-[#C58A24]" />
              Roads at Risk
            </span>
            <span className="font-bold text-[#C58A24] font-mono truncate max-w-[90px]">
              {analysis.exposureRecord.vulnerable_road_segments.length} ({analysis.exposureRecord.vulnerable_road_segments[0]?.split(' ')[0] || 'Local'})
            </span>
          </div>

          <div className="flex items-center justify-between bg-[#E6EDEB] px-2.5 py-2 rounded-lg border border-[#D7DEDC]">
            <span className="text-[#667579] flex items-center text-[11px]">
              <Home className="w-3.5 h-3.5 mr-1.5 text-[#397FA8]" />
              Villages
            </span>
            <span className="font-bold text-[#172126] font-mono">
              {analysis.exposureRecord.exposed_villages.length}
            </span>
          </div>

          <div className="flex items-center justify-between bg-[#E6EDEB] px-2.5 py-2 rounded-lg border border-[#D7DEDC]">
            <span className="text-[#667579] flex items-center text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-[#C95050]" />
              Exposed Pop
            </span>
            <span className="font-bold text-[#C95050] font-mono">
              {analysis.exposureRecord.exposed_population !== null && analysis.exposureRecord.exposed_population !== undefined
                ? analysis.exposureRecord.exposed_population.toLocaleString()
                : 'UNAVAILABLE'}
            </span>
          </div>

          <div className="flex items-center justify-between bg-[#E6EDEB] px-2.5 py-2 rounded-lg border border-[#D7DEDC]">
            <span className="text-[#667579] flex items-center text-[11px]">
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-[#167F78]" />
              Critical Assets
            </span>
            <span className="font-bold text-[#167F78] font-mono">
              {analysis.exposureRecord.critical_facilities.length}
            </span>
          </div>
        </div>
      </div>

      {/* 5. RECOMMENDED ACTIONS & ADVISORIES */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3 flex flex-col space-y-2 shadow-subtle card-hover-lift">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#172126] uppercase tracking-wider">
          <span>5. RECOMMENDED TACTICAL ACTIONS</span>
          <span className="text-[10px] text-[#167F78] font-mono font-bold">SOPS READY</span>
        </div>

        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {selectedZone?.recommended_actions?.map((act, idx) => (
            <div
              key={idx}
              className="p-2 rounded-lg bg-[#E6EDEB] border border-[#D7DEDC] text-[11px] text-[#172126] flex items-start space-x-2"
            >
              <span className="w-4 h-4 rounded-full bg-[#167F78] text-[#FAF8F1] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="leading-snug">{act}</span>
            </div>
          ))}

          {(!selectedZone?.recommended_actions || selectedZone?.recommended_actions.length === 0) && (
            <div className="p-2 rounded-lg bg-[#E6EDEB] border border-[#D7DEDC] text-[11px] text-[#667579]">
              Standard SOP monitoring active. Pre-position local response battalions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default SituationIntelligence;
