import React, { useState, useEffect, useMemo } from 'react';
import {
  Cloud,
  CloudRain,
  Sun,
  Wind,
  Droplets,
  AlertTriangle,
  Search,
  Maximize2,
  Minimize2,
  Sliders,
  FileText,
  Activity,
  Layers,
  Thermometer,
  Shield,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  X,
  Gauge,
  HelpCircle,
  Radio,
  TrendingUp,
  Cpu,
  Globe2,
  Compass,
  AlertCircle,
  Building,
  RotateCcw,
  ArrowRight,
  Database,
  History,
  Eye,
  ShieldAlert,
  Calendar,
  Mountain,
  Zap,
  ExternalLink
} from 'lucide-react';
import {
  RiskZone,
  SummaryMetrics,
  CriticalEvent,
  RoadConnectivity,
  HistoricalEvent,
  SoilMoistureStation,
  SatelliteObservation,
  MultilingualAlert,
  EvidenceCard,
  LanguageCode,
  AssessmentResult,
  RiskAssessmentResult,
  ViewType
} from '../../types';
import { DataService } from '../../services/dataService';
import { OpenStreetMapViewer } from './OpenStreetMapViewer';
import { getRiskColor } from '../../services/riskEngine';
import { getAuthoritativeAOI, getPrimaryAOIForState } from '../../data/command-centre/aoiRegistry';

interface OpenWeatherCommandCenterProps {
  zones: RiskZone[];
  selectedZone: RiskZone;
  onSelectZone: (zone: RiskZone) => void;
  selectedState?: string;
  onSelectState?: (state: string) => void;
  metrics: SummaryMetrics | null;
  criticalEvents: CriticalEvent[];
  timeOffset: number;
  onTimeChange?: (time: number) => void;
  onTriggerSOP?: () => void;
  roads?: RoadConnectivity[];
  historicalEvents?: HistoricalEvent[];
  soilStations?: SoilMoistureStation[];
  satelliteObs?: SatelliteObservation[];
  alerts?: MultilingualAlert[];
  evidenceCards?: EvidenceCard[];
  selectedLanguage?: LanguageCode;
  onSelectLanguage?: (lang: LanguageCode) => void;
  isOfflineMode?: boolean;
  onSelectView?: (view: ViewType) => void;
  onOpenReportModal?: () => void;
}

export type WeatherLayerType = 'precipitation' | 'risk_heatmap' | 'roads' | 'villages' | 'infrastructure' | 'sensors' | 'satellite_change' | 'field_reports';

interface SceneOption {
  id: string;
  name: string;
  location: string;
  state: string;
  district: string;
  disasterType: string;
  datePre: string;
  datePost: string;
  preImage: string;
  postImage: string;
  lat: number;
  lng: number;
}

const SCENE_OPTIONS: SceneOption[] = [
  {
    id: 'sikkim-singtam-dikchu',
    name: '03 — Singtam-Dikchu River Corridor',
    location: 'Singtam–Dikchu Riverfront Corridor (NH-10)',
    state: 'Sikkim',
    district: 'Pakyong / East Sikkim',
    disasterType: 'FLASH FLOOD & DEBRIS SURGE',
    datePre: '2026-08-28',
    datePost: '2026-09-03',
    preImage: '/assets/satellite/scene_03_pre.jpg?v=4',
    postImage: '/assets/satellite/scene_03_post.jpg?v=4',
    lat: 27.242,
    lng: 88.503
  },
  {
    id: 'sikkim-chungthang-basin',
    name: '02 — Chungthang Teesta-III Dam Sector',
    location: 'Chungthang Basin & Powerhouse',
    state: 'Sikkim',
    district: 'Mangan / North Sikkim',
    disasterType: 'GLOF & FLASH SURGE',
    datePre: '2026-08-28',
    datePost: '2026-09-03',
    preImage: '/assets/satellite/scene_02_pre.jpg?v=4',
    postImage: '/assets/satellite/scene_02_post.jpg?v=4',
    lat: 27.603,
    lng: 88.647
  },
  {
    id: 'sikkim-nh10-dikchu-sector',
    name: '01 — Dikchu Landslide & Highway Pier',
    location: 'NH-10 Dikchu River Highway Corridor KM 42',
    state: 'Sikkim',
    district: 'East Sikkim',
    disasterType: 'LANDSLIDE & SLOPE COLLAPSE',
    datePre: '2026-08-14',
    datePost: '2026-09-02',
    preImage: '/assets/satellite/scene_01_predisaster.jpg?v=4',
    postImage: '/assets/satellite/scene_02_postdisaster.jpg?v=4',
    lat: 27.398,
    lng: 88.535
  }
];

export const OpenWeatherCommandCenter: React.FC<OpenWeatherCommandCenterProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  selectedState = 'Sikkim',
  onSelectState,
  metrics,
  criticalEvents = [],
  timeOffset,
  onTimeChange,
  onTriggerSOP,
  roads = [],
  historicalEvents = [],
  soilStations = [],
  satelliteObs = [],
  alerts = [],
  evidenceCards = [],
  selectedLanguage = 'en',
  onSelectLanguage,
  isOfflineMode = false,
  onSelectView,
  onOpenReportModal
}) => {
  // Selected Scene
  const [selectedSceneKey, setSelectedSceneKey] = useState<string>('sikkim-singtam-dikchu');
  const activeScene = useMemo(() => {
    return SCENE_OPTIONS.find(s => s.id === selectedSceneKey) || SCENE_OPTIONS[0];
  }, [selectedSceneKey]);

  // Damage and Risk Data from DataService
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [riskResult, setRiskResult] = useState<RiskAssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Active Map Layers
  const [activeLayers, setActiveLayers] = useState<Record<WeatherLayerType, boolean>>({
    precipitation: false,
    risk_heatmap: true,
    roads: true,
    villages: true,
    infrastructure: true,
    sensors: true,
    satellite_change: true,
    field_reports: true
  });

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; zoom: number }>({
    lat: activeScene.lat,
    lng: activeScene.lng,
    zoom: 12.5
  });

  // Load authoritative data whenever active scene changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        const [damage, risk] = await Promise.all([
          DataService.getSceneResult(activeScene.id),
          DataService.getSikkimDemoRisk()
        ]);
        if (isMounted) {
          setAssessmentResult(damage);
          setRiskResult(risk);
          setMapCenter({ lat: activeScene.lat, lng: activeScene.lng, zoom: 12.5 });
          setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading command center telemetry:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [activeScene]);

  // Derived KPIs
  const totalStructures = assessmentResult?.statistics.totalStructures ?? 10;
  const changedAreaPct = assessmentResult?.changeDetection.changePercentage ?? 26.4;
  const riskScore = riskResult?.overallRiskScore ?? 81.4;
  const riskLevel = riskResult?.riskLevel ?? 'CRITICAL';
  const verifiedCount = assessmentResult?.statistics.verifiedCount ?? 4;
  const verificationProgressPct = Math.round((verifiedCount / Math.max(1, totalStructures)) * 100);

  // Toggle map layer
  const toggleLayer = (layer: WeatherLayerType) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="h-full w-full flex flex-col space-y-2.5 font-sans select-none overflow-y-auto p-3 bg-[#071018] text-slate-100">
      {/* ========================================================================= */}
      {/* 1. TOP STATUS BAR                                                         */}
      {/* ========================================================================= */}
      <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-sky-400 animate-pulse shadow-[0_0_10px_#38bdf8]" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-brand text-base text-sky-400 font-bold">SatGuard</span>
              <span className="text-slate-400 text-xs font-mono">•</span>
              <h1 className="font-mono font-bold text-xs uppercase tracking-wider text-slate-100">
                EARTH OBSERVATION & DISASTER COMMAND CENTER
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-400">
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400" />
                {activeScene.location}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Radio className="w-3 h-3" />
                LIVE TELEMETRY (Sentinel-2 MSI + IMD AWS)
              </span>
              <span>•</span>
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                Updated: {lastUpdated || 'Live Sync'}
              </span>
            </div>
          </div>
        </div>

        {/* Scene / Active Event Switcher */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-slate-400 text-[11px]">ACTIVE EVENT:</span>
          <select
            value={selectedSceneKey}
            onChange={(e) => setSelectedSceneKey(e.target.value)}
            className="bg-[#071018] border border-sky-500/40 text-sky-300 text-xs rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            {SCENE_OPTIONS.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. EXECUTIVE KPIs (5 TOP METRIC TILES)                                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 shrink-0 font-mono">
        {/* KPI 1: Active Assessments */}
        <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
            <span>ASSESSMENTS</span>
            <Database className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-1">03</div>
          <div className="text-[10px] text-sky-400 mt-0.5">Authoritative Baselines</div>
        </div>

        {/* KPI 2: Structures Assessed */}
        <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
            <span>STRUCTURES</span>
            <Building className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{totalStructures}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">4-Tier Classification</div>
        </div>

        {/* KPI 3: Changed Area % */}
        <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
            <span>CHANGED AREA</span>
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{changedAreaPct.toFixed(1)}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Bitemporal Optical Delta</div>
        </div>

        {/* KPI 4: Risk Index */}
        <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
            <span>RISK INDEX</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1 flex items-baseline gap-1">
            {riskScore.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ 100</span>
          </div>
          <div className="text-[10px] text-rose-400 font-bold mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            {riskLevel} VULNERABILITY
          </div>
        </div>

        {/* KPI 5: Verification Progress */}
        <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
            <span>VERIFICATION</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{verificationProgressPct}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{verifiedCount} of {totalStructures} Ground-Verified</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3 & 4. MIDDLE ROW: LARGE PRIMARY MAP + OPERATIONAL PIPELINE STATUS        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 min-h-[380px]">
        {/* Left / Center: PRIMARY GEO-MAP (2 Columns) */}
        <div className="lg:col-span-2 bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl overflow-hidden flex flex-col shadow-lg relative">
          {/* Map Header Controls */}
          <div className="bg-[#071018] border-b border-[#162E44] px-3 py-2 flex flex-wrap items-center justify-between gap-2 z-10">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-200">
              <Globe2 className="w-4 h-4 text-sky-400" />
              <span>PRIMARY GEO-MAP / DAMAGE & HAZARD OVERVIEW</span>
            </div>

            {/* Quick Layer Toggles */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <button
                onClick={() => toggleLayer('satellite_change')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors border ${
                  activeLayers.satellite_change
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                    : 'bg-[#0C1E2C] text-slate-500 border-[#162E44]'
                }`}
              >
                Change Footprints
              </button>
              <button
                onClick={() => toggleLayer('risk_heatmap')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors border ${
                  activeLayers.risk_heatmap
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                    : 'bg-[#0C1E2C] text-slate-500 border-[#162E44]'
                }`}
              >
                Risk Heatmap
              </button>
              <button
                onClick={() => toggleLayer('roads')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors border ${
                  activeLayers.roads
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                    : 'bg-[#0C1E2C] text-slate-500 border-[#162E44]'
                }`}
              >
                NH-10 Highway
              </button>
              <button
                onClick={() => toggleLayer('field_reports')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors border ${
                  activeLayers.field_reports
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                    : 'bg-[#0C1E2C] text-slate-500 border-[#162E44]'
                }`}
              >
                Ground Truth
              </button>
            </div>
          </div>

          {/* Map Viewport Container */}
          <div className="flex-1 min-h-[320px] relative bg-[#071018]">
            <OpenStreetMapViewer
              centerLat={mapCenter.lat}
              centerLng={mapCenter.lng}
              zoom={mapCenter.zoom}
              onCenterChange={(lat, lng, zoom) => setMapCenter({ lat, lng, zoom })}
              activeLayers={activeLayers}
              selectedState={selectedState === 'Assam' ? 'Assam' : 'Sikkim'}
              selectedZone={selectedZone}
              assessmentResult={assessmentResult}
              riskResult={riskResult}
            />
          </div>
        </div>

        {/* Right: OPERATIONAL PIPELINE STATUS (1 Column) */}
        <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3.5 flex flex-col justify-between shadow-lg font-mono">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#162E44]">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-xs uppercase text-slate-100 tracking-wider">
                  OPERATIONAL PIPELINE STATUS
                </h3>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                ALL SYSTEMS OPERATIONAL
              </span>
            </div>

            {/* Pipeline Stage Indicators */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#071018] border border-[#162E44]">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-200">1. Satellite Connected</span>
                </div>
                <span className="text-[10px] text-sky-400">Sentinel-2 10m L2A</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#071018] border border-[#162E44]">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-200">2. Change Analysis</span>
                </div>
                <span className="text-[10px] text-emerald-400">Aligned & Masked</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#071018] border border-[#162E44]">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-200">3. Damage Assessment</span>
                </div>
                <span className="text-[10px] text-amber-400">4-Tier Classified</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#071018] border border-[#162E44]">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-200">4. Risk Matrix Engine</span>
                </div>
                <span className="text-[10px] text-rose-400">81.4% Critical</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#071018] border border-[#162E44]">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-200">5. Early-Warning Forecast</span>
                </div>
                <span className="text-[10px] text-sky-400">72h Hydrograph</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#071018] border border-[#162E44]">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-200">6. Field Verification</span>
                </div>
                <span className="text-[10px] text-emerald-400">Truth Loop Active</span>
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-[#162E44] text-[10px] text-slate-400 flex items-center justify-between">
            <span>Latency: <strong className="text-slate-200">42ms</strong></span>
            <span>API Engine: <strong className="text-sky-400">v2.5.0-PROD</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5 & 6. THIRD ROW: CURRENT ASSESSMENT + KEY INTELLIGENCE                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 shrink-0 font-mono">
        {/* CURRENT ASSESSMENT SUMMARY */}
        <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3.5 shadow-lg">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#162E44]">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-xs uppercase text-slate-100 tracking-wider">
                CURRENT ASSESSMENT: {activeScene.name}
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
              CHANGE SCORE: {assessmentResult?.changeDetection.changeScore?.toFixed(3) || '0.428'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* PRE / POST Thumbnail Comparison */}
            <div className="col-span-1 space-y-1.5">
              <div className="border border-[#162E44] rounded p-1 bg-[#071018]">
                <div className="text-[9px] text-slate-400 flex justify-between">
                  <span>PRE: {activeScene.datePre}</span>
                </div>
                <img
                  src={activeScene.preImage}
                  alt="Pre Disaster"
                  className="w-full h-12 object-cover rounded mt-0.5"
                />
              </div>
              <div className="border border-[#162E44] rounded p-1 bg-[#071018]">
                <div className="text-[9px] text-slate-400 flex justify-between">
                  <span>POST: {activeScene.datePost}</span>
                </div>
                <img
                  src={activeScene.postImage}
                  alt="Post Disaster"
                  className="w-full h-12 object-cover rounded mt-0.5"
                />
              </div>
            </div>

            {/* 4-Tier Damage Summary Numbers */}
            <div className="col-span-2 space-y-1.5 text-xs">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-[#071018] p-2 rounded-lg border border-[#162E44]">
                  <span className="text-[10px] text-rose-400 block font-bold">DESTROYED</span>
                  <span className="text-lg font-bold text-rose-400">
                    {assessmentResult?.statistics.destroyedCount || 0}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Total Collapse</span>
                </div>
                <div className="bg-[#071018] p-2 rounded-lg border border-[#162E44]">
                  <span className="text-[10px] text-amber-400 block font-bold">MAJOR DAMAGE</span>
                  <span className="text-lg font-bold text-amber-400">
                    {assessmentResult?.statistics.majorDamageCount || 3}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Structural Shear</span>
                </div>
                <div className="bg-[#071018] p-2 rounded-lg border border-[#162E44]">
                  <span className="text-[10px] text-sky-400 block font-bold">MINOR DAMAGE</span>
                  <span className="text-lg font-bold text-sky-400">
                    {assessmentResult?.statistics.minorDamageCount || 1}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Debris Impact</span>
                </div>
                <div className="bg-[#071018] p-2 rounded-lg border border-[#162E44]">
                  <span className="text-[10px] text-emerald-400 block font-bold">INTACT</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {assessmentResult?.statistics.noDamageCount || 6}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Unaffected</span>
                </div>
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 bg-[#071018] p-1.5 rounded border border-[#162E44]">
                <span>Mean Confidence: <strong className="text-slate-200">{(assessmentResult?.statistics.averageConfidence ? assessmentResult.statistics.averageConfidence * 100 : 92.2).toFixed(1)}%</strong></span>
                <span>Ground Verification: <strong className="text-emerald-400">{verifiedCount}/{totalStructures} ({verificationProgressPct}%)</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* KEY INTELLIGENCE FINDINGS */}
        <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3.5 shadow-lg">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#162E44]">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h3 className="font-bold text-xs uppercase text-slate-100 tracking-wider">
                KEY DISASTER INTELLIGENCE & CRITICAL FINDINGS
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
              HIGH WATCH
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-lg bg-[#071018] border border-[#162E44]">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Highest-Risk Sector</div>
              <div className="text-slate-100 font-bold mt-0.5">
                NH-10 Dikchu–Singtam Riverfront Corridor KM 42+200
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#071018] border border-[#162E44]">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Primary Hazard Mechanism</div>
              <div className="text-rose-400 font-bold mt-0.5">
                Antecedent 72h Rain (142.6mm) + 38.5° Steep Valley Wall Saturated at 84.2%
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#071018] border border-[#162E44]">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Immediate Lifeline Vulnerability</div>
              <div className="text-amber-400 font-bold mt-0.5">
                NH-10 Viaduct Pier 4 Scour & Teesta Stage V Hydro Powerhouse Intake Channel
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#071018] border border-[#162E44] flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Decision Engine Action Required</div>
                <div className="text-rose-400 font-bold mt-0.5">IMMEDIATE DISPATCH — Ground Truth Verification</div>
              </div>
              <button
                onClick={() => onSelectView && onSelectView('damage_assessment')}
                className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
              >
                Inspect
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7 & 8. BOTTOM ROW: ACTIVITY / ALERT TIMELINE + QUICK ACTIONS              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 shrink-0 font-mono">
        {/* ACTIVITY / ALERT TIMELINE (2 Columns) */}
        <div className="lg:col-span-2 bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3.5 shadow-lg">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#162E44]">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-xs uppercase text-slate-100 tracking-wider">
                ACTIVITY & SYSTEM ALERT TIMELINE
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">REAL-TIME TELEMETRY STREAM</span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs pr-1">
            <div className="p-2 rounded-lg bg-[#071018] border border-[#162E44] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-sky-400 font-bold">[23:42]</span>
                <span className="text-slate-200">Sentinel-2 MSI bitemporal optical pair ingested & aligned (10m L2A)</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">INGESTION</span>
            </div>

            <div className="p-2 rounded-lg bg-[#071018] border border-[#162E44] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-amber-400 font-bold">[23:45]</span>
                <span className="text-slate-200">Damage assessment engine complete: 3 Major structural deformations identified</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">DAMAGE</span>
            </div>

            <div className="p-2 rounded-lg bg-[#071018] border border-[#162E44] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-rose-400 font-bold">[23:48]</span>
                <span className="text-slate-200">Geotechnical risk updated to 81.4% (CRITICAL) — pore-pressure threshold breached</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">RISK</span>
            </div>

            <div className="p-2 rounded-lg bg-[#071018] border border-[#162E44] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-emerald-400 font-bold">[23:51]</span>
                <span className="text-slate-200">Ground truth verification audit received from BRO Field Engineering Unit #4</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">VERIFIED</span>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS BAR (1 Column) */}
        <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3.5 shadow-lg flex flex-col justify-between font-mono">
          <div>
            <div className="flex items-center space-x-2 pb-2 mb-2.5 border-b border-[#162E44]">
              <Zap className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-xs uppercase text-slate-100 tracking-wider">
                MISSION QUICK ACTIONS
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                onClick={() => onSelectView && onSelectView('change_detection')}
                className="p-2 rounded-lg bg-[#071018] hover:bg-[#162E44] border border-[#162E44] text-left text-slate-200 hover:text-sky-400 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span className="truncate">Change Detection</span>
              </button>

              <button
                onClick={() => onSelectView && onSelectView('damage_assessment')}
                className="p-2 rounded-lg bg-[#071018] hover:bg-[#162E44] border border-[#162E44] text-left text-slate-200 hover:text-sky-400 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Building className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate">Damage Engine</span>
              </button>

              <button
                onClick={() => onSelectView && onSelectView('risk_matrix')}
                className="p-2 rounded-lg bg-[#071018] hover:bg-[#162E44] border border-[#162E44] text-left text-slate-200 hover:text-sky-400 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span className="truncate">Risk Matrix</span>
              </button>

              <button
                onClick={() => onSelectView && onSelectView('forecast')}
                className="p-2 rounded-lg bg-[#071018] hover:bg-[#162E44] border border-[#162E44] text-left text-slate-200 hover:text-sky-400 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                <span className="truncate">Forecast</span>
              </button>

              <button
                onClick={() => onSelectView && onSelectView('historical_events')}
                className="p-2 rounded-lg bg-[#071018] hover:bg-[#162E44] border border-[#162E44] text-left text-slate-200 hover:text-sky-400 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate">History Archive</span>
              </button>

              <button
                onClick={() => onSelectView && onSelectView('map_3d')}
                className="p-2 rounded-lg bg-[#071018] hover:bg-[#162E44] border border-[#162E44] text-left text-slate-200 hover:text-sky-400 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Globe2 className="w-3.5 h-3.5 text-purple-400" />
                <span className="truncate">3D Earth</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => onOpenReportModal && onOpenReportModal()}
            className="w-full mt-2.5 py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-[0_0_12px_rgba(56,189,248,0.25)] cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Executive Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpenWeatherCommandCenter;
