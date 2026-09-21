import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  MapPin,
  Mountain,
  Activity,
  Shield,
  Eye,
  Info,
  Sliders,
  Sparkles,
  CloudRain,
  TrendingUp,
  Layers,
  AlertTriangle,
  Building2,
  RefreshCw,
  FileText,
  Compass,
  Crosshair,
  Maximize2,
  Cpu,
  Database,
  Navigation,
  CheckCircle2
} from 'lucide-react';
import { RiskZone, RiskAssessmentResult, AssessmentResult } from '../../types';
import { DataService } from '../../services/dataService';
import { ExecutiveReportModal } from '../reports/ExecutiveReportModal';

interface RiskIntelligenceViewProps {
  zones: RiskZone[];
  selectedZone: RiskZone;
  onSelectZone: (zone: RiskZone) => void;
  selectedState?: string;
}

export const RiskIntelligenceView: React.FC<RiskIntelligenceViewProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  selectedState = 'Sikkim'
}) => {
  const [riskResult, setRiskResult] = useState<RiskAssessmentResult | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  // Scenario Simulation States
  const [simRainfall1h, setSimRainfall1h] = useState<number>(22.4);
  const [simRainfall72h, setSimRainfall72h] = useState<number>(142.6);
  const [simSlope, setSimSlope] = useState<number>(38.5);
  const [simSoilMoisture, setSimSoilMoisture] = useState<number>(84.2);
  const [simHistory, setSimHistory] = useState<number>(6);
  const [simLithology, setSimLithology] = useState<string>('Daling Group Weathered Phyllite and Colluvial Debris');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeGeoLayer, setActiveGeoLayer] = useState<'susceptibility' | 'rainfall' | 'assets'>('susceptibility');
  const [selectedSpatialHotspot, setSelectedSpatialHotspot] = useState<string | null>('KM 42+200 Viaduct Sector');

  const fetchRiskAndDamage = async () => {
    setIsLoading(true);
    try {
      const [riskRes, dmgRes] = await Promise.all([
        DataService.getSikkimDemoRisk(),
        DataService.getSceneResult('sikkim-nh10-dikchu-sector')
      ]);
      setRiskResult(riskRes);
      setAssessmentResult(dmgRes);
    } catch (err) {
      console.error('Error loading risk data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskAndDamage();
  }, [selectedState]);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const res = await DataService.evaluateRisk({
        zoneId: selectedZone?.id || 'sikkim-teesta-zone-01',
        zoneName: selectedZone?.name || 'Dikchu - Singtam NH-10 Corridor',
        state: selectedState,
        rainfall_1h_mm: simRainfall1h,
        rainfall_72h_mm: simRainfall72h,
        slope_deg: simSlope,
        soil_moisture_pct: simSoilMoisture,
        historical_events_5y: simHistory,
        lithology: simLithology,
        observedDamage: riskResult?.observedDamageContext || undefined
      });
      setRiskResult(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetSimulation = () => {
    setSimRainfall1h(22.4);
    setSimRainfall72h(142.6);
    setSimSlope(38.5);
    setSimSoilMoisture(84.2);
    setSimHistory(6);
    setSimLithology('Daling Group Weathered Phyllite and Colluvial Debris');
    fetchRiskAndDamage();
  };

  if (isLoading || !riskResult) {
    return (
      <div className="h-full flex items-center justify-center p-8 font-mono bg-[#172A35]">
        <div className="bg-[#10232E] border border-[#203844] p-6 rounded-md shadow-2xl text-center space-y-3 max-w-md text-[#F5F2E9]">
          <RefreshCw className="w-8 h-8 text-[#5D8F89] animate-spin mx-auto" />
          <h3 className="font-bold text-xs tracking-widest uppercase">INITIALIZING NRSC MULTI-CRITERIA RISK ENGINE...</h3>
          <p className="text-[11px] text-[#8E99A8]">
            Executing canonical MCE matrix: Rainfall (38%) • Slope (29%) • Soil Moisture (18%) • History (9%) • Lithology (6%).
          </p>
        </div>
      </div>
    );
  }

  const observed = riskResult.observedDamageContext;
  const factors = riskResult.factorContributions || [];
  const score = riskResult.overallRiskScore;
  const level = riskResult.riskLevel;

  return (
    <div className="h-full flex flex-col space-y-2.5 font-sans select-none overflow-y-auto pr-1">
      {/* 1. TOP TECHNICAL METADATA BANNER (ISRO/NRSC DSS STYLE) */}
      <div className="bg-[#10232E] border border-[#203844] rounded-md p-2.5 text-[#F5F2E9] shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#5D8F89]" />
            <h1 className="font-mono font-bold text-xs text-[#F5F2E9] tracking-wider uppercase">
              RISK INTELLIGENCE / SIKKIM / NH-10 CORRIDOR / 20 SEP 2026
            </h1>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#C58A24]/20 text-[#C58A24] border border-[#C58A24]/40 font-semibold">
              MODE: SYNTHETIC_DEMO
            </span>
          </div>
          <p className="text-[10px] font-mono text-[#8E99A8] mt-0.5">
            NRSC DISASTER MANAGEMENT SUPPORT (NDEM) • MULTI-CRITERIA EVALUATION (MCE) • PROJECTION: EPSG:32645 (UTM 45N)
          </p>
        </div>

        <div className="flex items-center space-x-2 text-[10px] font-mono">
          <div className="bg-[#172A35] px-2.5 py-1 rounded border border-[#203844] text-[#8E99A8]">
            AOI: <strong className="text-[#F5F2E9]">SK-NH10-TEESTA</strong>
          </div>
          <div className="bg-[#172A35] px-2.5 py-1 rounded border border-[#203844] text-[#8E99A8]">
            SENSOR: <strong className="text-[#5D8F89]">S2-MSI / S1-SAR</strong>
          </div>
          <button
            onClick={() => setIsReportOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1 rounded bg-[#5D8F89] hover:bg-[#4E7D77] text-white font-semibold transition-colors cursor-pointer"
          >
            <FileText className="w-3 h-3" />
            <span>Generate Dossier Report</span>
          </button>
        </div>
      </div>

      {/* 2. TOP SPLIT: FACTOR MATRIX (~65%) vs DECISION-SUPPORT INDEX (~35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* ========================================================================= */}
        {/* LEFT: ~65% (8 COLS) - CANONICAL MULTI-FACTOR EVALUATION MATRIX           */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          <div className="bg-[#FAF8F1] border border-[#C9CEC8] rounded-md p-3 space-y-2 shadow-sm flex-1">
            <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-1.5">
              <div className="flex items-center space-x-1.5">
                <BarChart3 className="w-4 h-4 text-[#167F78]" />
                <h3 className="font-mono font-bold text-xs uppercase text-[#172126]">
                  MULTI-FACTOR EVALUATION MATRIX (&sum; = {score.toFixed(1)} PTS)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#667579]">
                Score = &sum; (Normalized Score &times; Effective Weight)
              </span>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-[#E8E9E3] border-b border-[#C9CEC8] text-[9px] uppercase font-mono font-bold text-[#667579]">
                    <th className="p-1.5">Factor</th>
                    <th className="p-1.5">Category</th>
                    <th className="p-1.5">Measured / Input</th>
                    <th className="p-1.5 text-center">Norm (0-100)</th>
                    <th className="p-1.5 text-center">Weight</th>
                    <th className="p-1.5 text-right">Contribution</th>
                    <th className="p-1.5">Source / Sensor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E9E3] text-[11px]">
                  {factors.map((f, idx) => {
                    const normVal = f.normalizedScore !== null ? f.normalizedScore : 0;
                    return (
                      <tr key={idx} className="hover:bg-[#E8E9E3]/50 transition-colors">
                        <td className="p-1.5 font-semibold text-[#172126] flex items-center space-x-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            f.category === 'METEOROLOGICAL' ? 'bg-[#397FA8]' :
                            f.category === 'GEOMORPHOLOGICAL' ? 'bg-[#C95050]' :
                            f.category === 'HYDROLOGICAL' ? 'bg-[#167F78]' :
                            f.category === 'HISTORICAL' ? 'bg-[#C58A24]' : 'bg-[#587A68]'
                          }`} />
                          <span>{f.factor}</span>
                        </td>
                        <td className="p-1.5 font-mono text-[10px] text-[#667579]">{f.category}</td>
                        <td className="p-1.5 font-mono text-[#172126] font-medium">{f.rawValue}</td>
                        <td className="p-1.5 font-mono text-center">{normVal.toFixed(1)}</td>
                        <td className="p-1.5 font-mono text-center font-bold text-[#167F78]">
                          {(f.configuredWeight * 100).toFixed(0)}%
                        </td>
                        <td className="p-1.5 font-mono text-right font-bold text-[#C95050]">
                          +{f.contributionPoints.toFixed(2)} pts
                        </td>
                        <td className="p-1.5 font-mono text-[9px] text-[#667579] truncate max-w-[160px]" title={f.source}>
                          {f.source}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Thematic Contribution Visual Stack Band */}
            <div className="pt-2 border-t border-[#D7DEDC] space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-[#667579]">
                <span>FACTOR CONTRIBUTION PROPORTIONAL STACK:</span>
                <span>TOTAL RISK INDEX: <strong>{score.toFixed(1)} / 100</strong></span>
              </div>
              <div className="w-full bg-[#E8E9E3] h-3 rounded overflow-hidden flex border border-[#C9CEC8]">
                {factors.map((f, idx) => {
                  const pctOfScore = score > 0 ? (f.contributionPoints / score) * 100 : 0;
                  const color =
                    f.category === 'METEOROLOGICAL' ? '#397FA8' :
                    f.category === 'GEOMORPHOLOGICAL' ? '#C95050' :
                    f.category === 'HYDROLOGICAL' ? '#167F78' :
                    f.category === 'HISTORICAL' ? '#C58A24' : '#587A68';
                  return (
                    <div
                      key={idx}
                      style={{ width: `${pctOfScore}%`, backgroundColor: color }}
                      className="h-full relative group transition-all"
                      title={`${f.factor}: ${f.contributionPoints.toFixed(2)} pts (${pctOfScore.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between text-[9px] font-mono text-[#667579] pt-0.5">
                <span className="flex items-center"><span className="w-2 h-2 rounded-sm bg-[#397FA8] mr-1" /> Rainfall (38%)</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-sm bg-[#C95050] mr-1" /> Slope (29%)</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-sm bg-[#167F78] mr-1" /> Soil Moisture (18%)</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-sm bg-[#C58A24] mr-1" /> History (9%)</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-sm bg-[#587A68] mr-1" /> Lithology (6%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT: ~35% (4 COLS) - DECISION-SUPPORT INDEX & FACTOR DRIVERS            */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 flex flex-col space-y-2">
          {/* A. RESTRAINED OPERATIONAL DECISION SUPPORT CARD */}
          <div className="bg-[#FAF8F1] border border-[#C9CEC8] rounded-md p-3 space-y-2.5 shadow-sm flex-1">
            <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-1.5">
              <span className="font-mono font-bold text-xs uppercase text-[#172126] flex items-center">
                <Shield className="w-3.5 h-3.5 text-[#167F78] mr-1" />
                DECISION-SUPPORT INDEX
              </span>
              <span className="text-[9px] font-mono text-[#667579]">ISRO-NRSC DSS</span>
            </div>

            {/* Restrained Score Indicators */}
            <div className="space-y-1.5">
              <div className="bg-[#E8E9E3] p-2 rounded border border-[#C9CEC8] flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono text-[#667579] uppercase block">RISK INDEX</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-xl font-mono font-bold text-[#C95050]">
                      {score.toFixed(1)}
                    </span>
                    <span className="text-xs font-mono text-[#667579]">/ 100</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono text-[#667579] uppercase block">RISK BAND</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#C95050]/15 text-[#C95050] border border-[#C95050]/30 inline-block mt-0.5">
                    {level}
                  </span>
                </div>
              </div>

              <div className="bg-[#E8E9E3] p-2 rounded border border-[#C9CEC8]">
                <span className="text-[9px] font-mono text-[#667579] uppercase block">DECISION-SUPPORT STATUS</span>
                <span className="text-xs font-mono font-bold text-[#167F78] block mt-0.5">
                  HIGH PRIORITY FOR FIELD VERIFICATION
                </span>
                <span className="text-[10px] text-[#667579] block mt-0.5 leading-snug">
                  Advisory notification generated for district disaster management authority field verification.
                </span>
              </div>

              <div className="bg-[#E8E9E3] p-2 rounded border border-[#C9CEC8] grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div>
                  <span className="text-[#667579] block">DOMINANT CONTRIBUTING FACTOR:</span>
                  <span className="font-bold text-[#172126] truncate block">{riskResult.primaryFactor}</span>
                </div>
                <div>
                  <span className="text-[#667579] block">SECONDARY CONTRIBUTING FACTOR:</span>
                  <span className="font-bold text-[#172126] truncate block">{riskResult.secondaryFactor}</span>
                </div>
              </div>

              {/* Priority Zones List */}
              <div className="pt-1">
                <span className="text-[9px] font-mono text-[#667579] uppercase block mb-1">
                  PRIORITY EXPOSURE SECTORS
                </span>
                <div className="space-y-1 text-[10px] font-mono">
                  {riskResult.priorityAreas.slice(0, 2).map((area, aIdx) => (
                    <div key={aIdx} className="bg-[#E8E9E3] px-2 py-1 rounded border border-[#C9CEC8] flex items-center justify-between text-[#172126]">
                      <span className="truncate">{area}</span>
                      <span className="text-[8px] text-[#C95050] font-bold shrink-0 ml-1">SECTOR {aIdx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VISUAL CENTERPIECE: SPATIAL SUSCEPTIBILITY & NH-10 GEOTECHNICAL MAP    */}
      {/* ========================================================================= */}
      <div className="bg-[#FAF8F1] border border-[#C9CEC8] rounded-md p-3 space-y-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D7DEDC] pb-1.5">
          <div className="flex items-center space-x-1.5">
            <Compass className="w-4 h-4 text-[#167F78]" />
            <h3 className="font-mono font-bold text-xs uppercase text-[#172126]">
              SPATIAL SUSCEPTIBILITY / NH-10 CORRIDOR (TEESTA RIVER BASIN)
            </h3>
          </div>

          {/* Interactive Thematic Layer Switcher */}
          <div className="flex items-center space-x-1 text-[10px] font-mono">
            <button
              onClick={() => setActiveGeoLayer('susceptibility')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                activeGeoLayer === 'susceptibility' ? 'bg-[#167F78] text-white font-bold shadow-sm' : 'bg-[#E8E9E3] text-[#667579] hover:text-[#172126]'
              }`}
            >
              [Susceptibility Zonation]
            </button>
            <button
              onClick={() => setActiveGeoLayer('rainfall')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                activeGeoLayer === 'rainfall' ? 'bg-[#167F78] text-white font-bold shadow-sm' : 'bg-[#E8E9E3] text-[#667579] hover:text-[#172126]'
              }`}
            >
              [72h Isohyetal Rainfall (IMD)]
            </button>
            <button
              onClick={() => setActiveGeoLayer('assets')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                activeGeoLayer === 'assets' ? 'bg-[#167F78] text-white font-bold shadow-sm' : 'bg-[#E8E9E3] text-[#667579] hover:text-[#172126]'
              }`}
            >
              [Asset & Structure Exposure]
            </button>
          </div>
        </div>

        {/* Large Institutional Web-GIS Visual Panel */}
        <div className="relative h-72 md:h-80 bg-[#172A35] rounded-md border border-[#203844] overflow-hidden flex flex-col justify-between p-3 text-[#F5F2E9] font-mono">
          {/* Background Cartographic Grid / Reticle */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#5D8F89 1.2px, transparent 1.2px), linear-gradient(to right, #203844 1px, transparent 1px), linear-gradient(to bottom, #203844 1px, transparent 1px)',
              backgroundSize: '24px 24px, 120px 120px, 120px 120px'
            }}
          />

          {/* GIS Contour Topography Representation */}
          <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 800 300">
            {/* Topographic Contour Lines */}
            <path d="M0,80 Q200,40 400,90 T800,60" fill="none" stroke="#5D8F89" strokeWidth="1" strokeDasharray="4,4" />
            <path d="M0,130 Q250,90 500,150 T800,120" fill="none" stroke="#5D8F89" strokeWidth="1" />
            <path d="M0,190 Q220,160 450,220 T800,170" fill="none" stroke="#5D8F89" strokeWidth="1" strokeDasharray="4,4" />
            <path d="M0,250 Q300,210 600,270 T800,230" fill="none" stroke="#5D8F89" strokeWidth="1" />

            {/* Teesta River Flow Vector */}
            <path d="M50,290 C180,240 280,180 420,140 C560,100 680,80 780,20" fill="none" stroke="#397FA8" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
            <path d="M50,290 C180,240 280,180 420,140 C560,100 680,80 780,20" fill="none" stroke="#60A5FA" strokeWidth="2" strokeDasharray="8,6" />

            {/* NH-10 Highway Corridor Vector */}
            <path d="M60,295 C190,245 295,185 435,145 C575,105 695,85 795,25" fill="none" stroke="#F59E0B" strokeWidth="3" strokeDasharray="6,4" />
          </svg>

          {/* Thematic Susceptibility Shading Bands depending on Layer */}
          {activeGeoLayer === 'susceptibility' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-12 left-1/4 w-72 h-36 bg-[#C95050]/20 rounded-full blur-2xl border border-[#C95050]/30" />
              <div className="absolute top-28 left-1/2 w-80 h-32 bg-[#D97706]/20 rounded-full blur-2xl border border-[#D97706]/30" />
              <div className="absolute bottom-8 left-16 w-64 h-28 bg-[#167F78]/25 rounded-full blur-2xl border border-[#167F78]/30" />
            </div>
          )}

          {activeGeoLayer === 'rainfall' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-[#397FA8]/15" />
              <div className="absolute top-6 left-1/3 w-96 h-48 bg-[#397FA8]/30 rounded-full blur-3xl" />
            </div>
          )}

          {/* Top HUD: Centroid, Coordinates, North Reticle, UTM */}
          <div className="relative z-10 flex items-start justify-between">
            <div className="bg-[#10232E]/90 border border-[#203844] rounded px-2.5 py-1.5 shadow-md flex items-center space-x-3 text-[10px]">
              <div className="flex items-center space-x-1.5">
                <Crosshair className="w-3.5 h-3.5 text-[#5D8F89]" />
                <span className="text-[#F5F2E9] font-bold">AOI CENTROID: 27.2345° N, 88.5120° E</span>
              </div>
              <span className="text-[#8E99A8]">|</span>
              <span className="text-[#8E99A8]">ELEVATION: 640m – 1,820m MSL</span>
              <span className="text-[#8E99A8]">|</span>
              <span className="text-[#5D8F89] font-bold">SLOPE VECTOR: 38.5° ENE</span>
            </div>

            {/* North Compass Reticle */}
            <div className="bg-[#10232E]/90 border border-[#203844] rounded px-2 py-1 text-center shadow-md">
              <div className="flex items-center justify-center space-x-1">
                <Navigation className="w-3 h-3 text-[#5D8F89] -rotate-45" />
                <span className="text-[#5D8F89] font-bold text-[10px]">N</span>
              </div>
              <span className="text-[8px] text-[#8E99A8] block">UTM 45N / WGS84</span>
            </div>
          </div>

          {/* Center Interactive Corridor Vector Nodes / Hotspots */}
          <div className="relative z-10 my-auto grid grid-cols-1 md:grid-cols-4 gap-2 text-[10px]">
            {/* Sector 1: Rangpo Gateway */}
            <div
              onClick={() => setSelectedSpatialHotspot('KM 32+400 Rangpo Gateway')}
              className={`p-2 rounded border cursor-pointer transition-all ${
                selectedSpatialHotspot === 'KM 32+400 Rangpo Gateway'
                  ? 'bg-[#10232E] border-[#5D8F89] shadow-lg ring-1 ring-[#5D8F89]'
                  : 'bg-[#10232E]/75 border-[#203844] hover:border-[#5D8F89]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[#8E99A8] text-[9px]">KM 32+400</span>
                <span className="w-2 h-2 rounded-full bg-[#167F78]" title="Low Susceptibility" />
              </div>
              <strong className="text-[#F5F2E9] block text-[11px] truncate">RANGPO GATEWAY</strong>
              <span className="text-[#8E99A8] text-[9px] block">Toe slope: 18.4° • 0 Damaged</span>
            </div>

            {/* Sector 2: Singtam Viaduct (Critical Hotspot) */}
            <div
              onClick={() => setSelectedSpatialHotspot('KM 42+200 Viaduct Sector')}
              className={`p-2 rounded border cursor-pointer transition-all ${
                selectedSpatialHotspot === 'KM 42+200 Viaduct Sector'
                  ? 'bg-[#10232E] border-[#C95050] shadow-lg ring-1 ring-[#C95050]'
                  : 'bg-[#10232E]/75 border-[#C95050]/50 hover:border-[#C95050]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[#C95050] text-[9px] font-bold">KM 42+200 [CRITICAL]</span>
                <span className="w-2 h-2 rounded-full bg-[#C95050] animate-ping" />
              </div>
              <strong className="text-[#F5F2E9] block text-[11px] truncate">SINGTAM VIADUCT</strong>
              <span className="text-[#C95050] text-[9px] block font-semibold">Slope: 41.2° • 3 Major Damaged</span>
            </div>

            {/* Sector 3: Dikchu Basin Hub */}
            <div
              onClick={() => setSelectedSpatialHotspot('KM 48+700 Dikchu Basin Hub')}
              className={`p-2 rounded border cursor-pointer transition-all ${
                selectedSpatialHotspot === 'KM 48+700 Dikchu Basin Hub'
                  ? 'bg-[#10232E] border-[#D97706] shadow-lg ring-1 ring-[#D97706]'
                  : 'bg-[#10232E]/75 border-[#D97706]/50 hover:border-[#D97706]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[#D97706] text-[9px] font-bold">KM 48+700 [HIGH]</span>
                <span className="w-2 h-2 rounded-full bg-[#D97706]" />
              </div>
              <strong className="text-[#F5F2E9] block text-[11px] truncate">DIKCHU BASIN HUB</strong>
              <span className="text-[#D97706] text-[9px] block">Soil Sat: 84.2% • 1 Minor</span>
            </div>

            {/* Sector 4: Pakyong Substation */}
            <div
              onClick={() => setSelectedSpatialHotspot('KM 55+100 Pakyong Substation')}
              className={`p-2 rounded border cursor-pointer transition-all ${
                selectedSpatialHotspot === 'KM 55+100 Pakyong Substation'
                  ? 'bg-[#10232E] border-[#5D8F89] shadow-lg ring-1 ring-[#5D8F89]'
                  : 'bg-[#10232E]/75 border-[#203844] hover:border-[#5D8F89]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[#8E99A8] text-[9px]">KM 55+100</span>
                <span className="w-2 h-2 rounded-full bg-[#167F78]" />
              </div>
              <strong className="text-[#F5F2E9] block text-[11px] truncate">PAKYONG SUBSTATION</strong>
              <span className="text-[#8E99A8] text-[9px] block">Slope: 22.0° • Intact</span>
            </div>
          </div>

          {/* Bottom GIS Legend & Scale Strip */}
          <div className="relative z-10 flex flex-wrap items-end justify-between gap-2 pt-1 border-t border-[#203844] text-[9px]">
            {/* Thematic Legend */}
            <div className="flex flex-wrap items-center space-x-3 bg-[#10232E]/90 px-2.5 py-1 rounded border border-[#203844]">
              <span className="text-[#8E99A8] uppercase font-bold">THEMATIC LEGEND:</span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#C95050]" />
                <span className="text-[#F5F2E9]">High Susceptibility (&gt;70%)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                <span className="text-[#F5F2E9]">Moderate (40–70%)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#167F78]" />
                <span className="text-[#F5F2E9]">Low (&lt;40%)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-0.5 bg-[#397FA8]" />
                <span className="text-[#8E99A8]">Teesta River</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-0.5 bg-[#F59E0B] border-t border-dashed" />
                <span className="text-[#8E99A8]">NH-10 Highway</span>
              </span>
            </div>

            {/* Spatial Scale & Product Attribution */}
            <div className="flex items-center space-x-3 bg-[#10232E]/90 px-2.5 py-1 rounded border border-[#203844] text-[#8E99A8]">
              <span>PRODUCT: SENTINEL-2 L2A / SRTM 30m DEM</span>
              <div className="flex items-center space-x-1.5">
                <div className="w-12 h-1 bg-[#8E99A8] border-x border-[#F5F2E9]" />
                <span className="text-[#F5F2E9] font-bold">2.0 KM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. OBSERVED DAMAGE EVIDENCE & GEOTECHNICAL SENSITIVITY CONTROLS           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* LEFT (4 COLS): OBSERVED DAMAGE EVIDENCE (IMAGE-DERIVED) */}
        <div className="lg:col-span-4 bg-[#FAF8F1] border border-[#C9CEC8] rounded-md p-3 space-y-2 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-1.5">
            <span className="font-mono font-bold text-xs uppercase text-[#172126] flex items-center">
              <Building2 className="w-3.5 h-3.5 text-[#C95050] mr-1" />
              OBSERVED DAMAGE EVIDENCE
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#C58A24]/10 text-[#C58A24] border border-[#C58A24]/30 font-bold">
              IMAGE-DERIVED
            </span>
          </div>

          <p className="text-[10px] text-[#667579]">
            Bitemporal optical change detections from Sentinel-2 scene analysis (strictly separated from geotechnical vulnerability factors).
          </p>

          {/* 4-Tier Chips */}
          <div className="grid grid-cols-4 gap-1 text-center font-mono">
            <div className="bg-[#C95050]/10 border border-[#C95050]/20 p-1 rounded">
              <span className="text-[8px] text-[#C95050] block font-bold">DESTROYED</span>
              <span className="text-sm font-bold text-[#C95050]">{observed?.destroyedCount || 0}</span>
            </div>
            <div className="bg-[#D97706]/10 border border-[#D97706]/20 p-1 rounded">
              <span className="text-[8px] text-[#D97706] block font-bold">MAJOR</span>
              <span className="text-sm font-bold text-[#D97706]">{observed?.majorDamageCount || 3}</span>
            </div>
            <div className="bg-[#C58A24]/10 border border-[#C58A24]/20 p-1 rounded">
              <span className="text-[8px] text-[#C58A24] block font-bold">MINOR</span>
              <span className="text-sm font-bold text-[#C58A24]">{observed?.minorDamageCount || 1}</span>
            </div>
            <div className="bg-[#4F9D69]/10 border border-[#4F9D69]/20 p-1 rounded">
              <span className="text-[8px] text-[#4F9D69] block font-bold">INTACT</span>
              <span className="text-sm font-bold text-[#4F9D69]">{observed?.noDamageCount || 6}</span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-[#667579] bg-[#E8E9E3] p-1.5 rounded border border-[#C9CEC8] flex justify-between">
            <span>Structures Assessed: <strong>{observed?.totalStructures || 10}</strong></span>
            <span>Affected Area: <strong>{(observed?.damagedFootprintAreaM2 || 2190).toLocaleString()} m²</strong></span>
          </div>
        </div>

        {/* RIGHT (8 COLS): GEOTECHNICAL SCENARIO SENSITIVITY CONTROLS */}
        <div className="lg:col-span-8 bg-[#FAF8F1] border border-[#C9CEC8] rounded-md p-3 space-y-2 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-1">
            <div className="flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#C58A24]" />
              <h3 className="font-mono font-bold text-xs uppercase text-[#172126]">
                GEOTECHNICAL SCENARIO SENSITIVITY CONTROLS & THRESHOLD CALIBRATION
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleResetSimulation}
                className="px-2 py-0.5 rounded bg-[#E8E9E3] hover:bg-[#D7DEDC] text-[10px] font-mono text-[#667579] border border-[#C9CEC8] transition-colors cursor-pointer"
              >
                Reset Baseline
              </button>
              <button
                onClick={handleSimulate}
                disabled={isSimulating}
                className="px-2.5 py-0.5 rounded bg-[#167F78] hover:bg-[#136C67] text-[10px] font-mono font-bold text-white transition-colors cursor-pointer shadow-sm"
              >
                {isSimulating ? 'Recalculating...' : 'Recalculate DSS Index'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono">
            {/* Slider 1: 72h Rainfall */}
            <div className="bg-[#E8E9E3] p-2 rounded border border-[#C9CEC8] space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#667579]">72h Precipitation:</span>
                <span className="font-bold text-[#167F78]">{simRainfall72h} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="250"
                step="5"
                value={simRainfall72h}
                onChange={(e) => setSimRainfall72h(parseFloat(e.target.value))}
                className="w-full accent-[#167F78] cursor-pointer"
              />
              <span className="text-[9px] text-[#667579] block">Pore-Pressure Threshold: 150 mm (50% max)</span>
            </div>

            {/* Slider 2: Slope Gradient */}
            <div className="bg-[#E8E9E3] p-2 rounded border border-[#C9CEC8] space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#667579]">Geometrical Slope:</span>
                <span className="font-bold text-[#167F78]">{simSlope}°</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="1"
                value={simSlope}
                onChange={(e) => setSimSlope(parseFloat(e.target.value))}
                className="w-full accent-[#167F78] cursor-pointer"
              />
              <span className="text-[9px] text-[#667579] block">Critical Shear Angle: 45°</span>
            </div>

            {/* Slider 3: Soil Moisture */}
            <div className="bg-[#E8E9E3] p-2 rounded border border-[#C9CEC8] space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#667579]">Soil Saturation:</span>
                <span className="font-bold text-[#167F78]">{simSoilMoisture}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="1"
                value={simSoilMoisture}
                onChange={(e) => setSimSoilMoisture(parseFloat(e.target.value))}
                className="w-full accent-[#167F78] cursor-pointer"
              />
              <span className="text-[9px] text-[#667579] block">Hydrostatic Liquefaction: 85%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Report Modal */}
      <ExecutiveReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        assessmentResult={assessmentResult}
        riskResult={riskResult}
      />
    </div>
  );
};
