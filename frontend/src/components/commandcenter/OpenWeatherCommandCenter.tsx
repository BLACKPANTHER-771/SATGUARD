import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  Layers,
  Globe2,
  Activity,
  CloudRain,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  MapPin,
  Building,
  Radio,
  Zap,
  History
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
  ViewType,
  AssessmentResult,
  RiskAssessmentResult,
  VerificationActionRequest,
  BitemporalScenePair
} from '../../types';
import { OpenStreetMapViewer } from './OpenStreetMapViewer';
import { SyntheticEarthViewer } from '../map3d/SyntheticEarthViewer';
import { ExecutiveReportModal } from '../reports/ExecutiveReportModal';
import { DataService } from '../../services/dataService';
import { WeatherProviderOrchestrator } from '../../services/weatherProviderOrchestrator';
import { RegionalWeatherReport, getWeatherDataForZone } from '../../data/command-centre/weatherData';
import { getPrimaryAOIForState } from '../../data/command-centre/aoiRegistry';

export type WeatherLayerType =
  | 'precipitation'
  | 'risk_heatmap'
  | 'roads'
  | 'villages'
  | 'infrastructure'
  | 'sensors'
  | 'satellite_change'
  | 'field_reports';

export type SupportedState = 'Sikkim' | 'Assam';

export interface OpenWeatherCommandCenterProps {
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

export const OpenWeatherCommandCenter: React.FC<OpenWeatherCommandCenterProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  selectedState: parentSelectedState,
  onSelectState,
  metrics,
  criticalEvents = [],
  timeOffset = 0,
  historicalEvents = [],
  satelliteObs = [],
  evidenceCards = [],
  onSelectView,
  onOpenReportModal
}) => {
  // State selection (Sikkim / Assam)
  const activeStateName: SupportedState = parentSelectedState?.toLowerCase() === 'assam' ? 'Assam' : 'Sikkim';
  const [selectedState, setSelectedState] = useState<SupportedState>(activeStateName);

  useEffect(() => {
    if (parentSelectedState) {
      const st = parentSelectedState.toLowerCase() === 'assam' ? 'Assam' : 'Sikkim';
      setSelectedState(st);
      if (st === 'Sikkim') {
        setMapCenter({ lat: 27.398, lng: 88.535, zoom: 10.8 });
      } else {
        setMapCenter({ lat: 25.1764, lng: 93.0238, zoom: 9.8 });
      }
    }
  }, [parentSelectedState]);

  // Primary Map Viewport Coordinates
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; zoom: number }>({
    lat: activeStateName === 'Assam' ? 25.1764 : 27.398,
    lng: activeStateName === 'Assam' ? 93.0238 : 88.535,
    zoom: activeStateName === 'Assam' ? 9.8 : 10.8
  });

  // Active Map Layers
  const [activeLayers] = useState<Record<WeatherLayerType, boolean>>({
    precipitation: true,
    risk_heatmap: true,
    roads: true,
    villages: true,
    infrastructure: true,
    sensors: true,
    satellite_change: true,
    field_reports: true
  });

  // 2D Tactical GIS vs 3D Earth View Mode
  const [mapViewMode, setMapViewMode] = useState<'2d' | '3d'>('2d');

  // Authoritative Assessment & Risk Data States
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [riskResult, setRiskResult] = useState<RiskAssessmentResult | null>(null);
  const [scenes, setScenes] = useState<BitemporalScenePair[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string>('sikkim-nh10-dikchu-sector');
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [liveClock, setLiveClock] = useState<string>('');

  // Live Weather Telemetry
  const [, setWeather] = useState<RegionalWeatherReport>(
    getWeatherDataForZone(selectedZone?.id, selectedZone?.state)
  );
  const [apiStatusLabel, setApiStatusLabel] = useState<string>('Copernicus Sentinel-2 & AWS Online');

  // Clock ticker for operational display
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setLiveClock(now.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Available Scenes & Authoritative Data
  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      try {
        const [availableScenes, defaultAssessment, defaultRisk] = await Promise.all([
          DataService.getAssessmentScenes(),
          DataService.getSceneResult(selectedSceneId),
          DataService.getSikkimDemoRisk()
        ]);

        if (isMounted) {
          setScenes(availableScenes);
          setAssessmentResult(defaultAssessment);
          setRiskResult(defaultRisk);
        }
      } catch (err) {
        console.warn('Command Center data loading fallback:', err);
      }
    };

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, [selectedSceneId]);

  // Load weather telemetry for active location
  useEffect(() => {
    let isCancelled = false;
    const fetchTelemetry = async () => {
      const lat = selectedZone?.lat || (selectedState === 'Sikkim' ? 27.398 : 25.176);
      const lng = selectedZone?.lng || (selectedState === 'Sikkim' ? 88.535 : 93.024);
      const zoneId = selectedZone?.id || (selectedState === 'Sikkim' ? 'sikkim-nh10-dikchu' : 'assam-dima-hasao-haflong');
      const zoneName = selectedZone?.name || (selectedState === 'Sikkim' ? 'Dikchu-Singtam' : 'Haflong Ghat');

      const res = await WeatherProviderOrchestrator.getRegionalWeatherReport(
        lat,
        lng,
        zoneId,
        zoneName,
        selectedState,
        selectedZone?.district
      );
      if (!isCancelled) {
        setWeather(res.report);
        setApiStatusLabel(res.errorStatus || 'Copernicus Sentinel-2 & AWS Online');
      }
    };

    fetchTelemetry();
    return () => {
      isCancelled = true;
    };
  }, [selectedZone?.id, selectedZone?.lat, selectedZone?.lng, selectedZone?.name, selectedState]);

  // Handle Structure Verification
  const handleVerifyStructure = async (actionReq: VerificationActionRequest) => {
    try {
      const updated = await DataService.verifyStructure(actionReq);
      setAssessmentResult(updated);
      const updatedRisk = await DataService.getSikkimDemoRisk();
      setRiskResult(updatedRisk);
    } catch (err) {
      console.error('Failed to verify structure from Command Center:', err);
    }
  };

  // State Switching (Sikkim / Assam)
  const handleSwitchState = (state: SupportedState) => {
    setSelectedState(state);
    if (onSelectState) {
      onSelectState(state);
    }
    const targetAOI = getPrimaryAOIForState(state);
    if (state === 'Sikkim') {
      setMapCenter({ lat: 27.398, lng: 88.535, zoom: 10.8 });
    } else {
      setMapCenter({ lat: 25.1764, lng: 93.0238, zoom: 9.8 });
    }
    const match = zones.find(z => z.id === targetAOI.id || z.state.toLowerCase() === state.toLowerCase());
    if (match) {
      onSelectZone(match);
    }
  };

  // Scene Switching
  const handleSwitchScene = async (sceneId: string) => {
    setSelectedSceneId(sceneId);
    try {
      const res = await DataService.getSceneResult(sceneId);
      setAssessmentResult(res);
      if (res.sceneMetadata?.location) {
        setMapCenter({
          lat: res.sceneMetadata.location.lat,
          lng: res.sceneMetadata.location.lng,
          zoom: 11.2
        });
      }
    } catch (err) {
      console.error('Error switching scene:', err);
    }
  };

  // Safe KPI calculations from authoritative data structures
  const totalAssessmentsCount = (scenes.length > 0 ? scenes.length : 3) + (historicalEvents.length > 0 ? historicalEvents.length : 1);
  const totalStructures = assessmentResult?.statistics?.totalStructures ?? 10;
  const destroyedCount = assessmentResult?.statistics?.destroyedCount ?? 0;
  const majorDamageCount = assessmentResult?.statistics?.majorDamageCount ?? 3;
  const minorDamageCount = assessmentResult?.statistics?.minorDamageCount ?? 1;
  const noDamageCount = assessmentResult?.statistics?.noDamageCount ?? 6;
  const totalDamaged = destroyedCount + majorDamageCount + minorDamageCount;
  
  const changedAreaPct = assessmentResult?.changeDetection?.changePercentage ?? ((assessmentResult?.changeDetection?.changeScore ?? 0.385) * 100);
  const changedAreaM2 = assessmentResult?.changeDetection?.changedAreaM2 ?? 89400;
  
  const rawRiskScore = riskResult?.overallRiskScore ?? (selectedZone?.landslide_probability ? selectedZone.landslide_probability * 100 : 84.7);
  const compositeRiskScore = Math.min(100, Math.max(0, +rawRiskScore.toFixed(1)));
  const riskSeverityLevel = riskResult?.riskLevel ?? (compositeRiskScore >= 75 ? 'CRITICAL' : compositeRiskScore >= 55 ? 'HIGH' : 'MODERATE');

  const verifiedStructuresCount = assessmentResult?.statistics?.verifiedCount ?? 4;
  const verificationProgressPct = totalStructures > 0 ? Math.round((verifiedStructuresCount / totalStructures) * 100) : 40;

  // Active Event & Metadata
  const activeEventTitle = assessmentResult?.sceneMetadata?.title || selectedZone?.name || 'Sikkim Teesta Valley & NH-10 Corridor Inundation Assessment';
  const activeLocationName = assessmentResult?.sceneMetadata?.location?.name || selectedZone?.name || 'Dikchu – Singtam Corridor (NH-10)';
  const activeDistrict = assessmentResult?.sceneMetadata?.location?.district || selectedZone?.district || 'Pakyong';
  const isSyntheticDemo = assessmentResult?.mode === 'DEMO' || assessmentResult?.sceneMetadata?.disclaimer?.includes('SYNTHETIC') || true;
  const lastUpdatedTimestamp = assessmentResult?.sceneMetadata?.acquisitionDates?.after || '03 Sept 2026, 22:08 IST';

  // Dynamic Activity Timeline Events derived from actual platform events
  const dynamicTimelineEvents = useMemo(() => {
    const list: Array<{
      id: string;
      time: string;
      type: 'SATELLITE' | 'CHANGE DETECTION' | 'DAMAGE ASSESSMENT' | 'RISK' | 'FORECAST' | 'FIELD VERIFICATION' | 'SYSTEM';
      severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
      description: string;
    }> = [];

    // 1. Critical Events from telemetry
    criticalEvents.slice(0, 2).forEach((evt, i) => {
      list.push({
        id: `crit-${i}`,
        time: evt.time_ago || '22:08 IST',
        type: 'RISK',
        severity: evt.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        description: `${evt.location}: ${evt.affected_infrastructure} (${evt.recommended_action})`
      });
    });

    // 2. Satellite observations
    if (satelliteObs && satelliteObs.length > 0) {
      const sat = satelliteObs[0];
      list.push({
        id: 'sat-0',
        time: '21:45 IST',
        type: 'SATELLITE',
        severity: 'INFO',
        description: `Sentinel-2 MSI bitemporal acquisition for ${sat.target_sector || activeDistrict} (${sat.surface_change_indicator || '10m GSD'}).`
      });
    } else {
      list.push({
        id: 'sat-fallback',
        time: '21:45 IST',
        type: 'SATELLITE',
        severity: 'INFO',
        description: `Copernicus Sentinel-2 pass ingested (10m L2A GSD).`
      });
    }

    // 3. Truth Loop Field Verifications
    if (evidenceCards && evidenceCards.length > 0) {
      const ev = evidenceCards[0];
      list.push({
        id: `truth-${ev.id}`,
        time: ev.timestamp || '20:15 IST',
        type: 'FIELD VERIFICATION',
        severity: 'SUCCESS',
        description: `Field Officer verified structure ${ev.location}: ${ev.incident_type} (${ev.action_taken || 'Verified'})`
      });
    } else {
      list.push({
        id: 'truth-fallback',
        time: '20:15 IST',
        type: 'FIELD VERIFICATION',
        severity: 'SUCCESS',
        description: `Ground Ranger verified Singtam Bridge approach pier stability.`
      });
    }

    // 4. Damage Engine event
    if (assessmentResult) {
      list.push({
        id: 'dmg-evt',
        time: '18:30 IST',
        type: 'DAMAGE ASSESSMENT',
        severity: 'WARNING',
        description: `${assessmentResult.statistics?.totalStructures || 10} footprints evaluated (${totalDamaged} classified damaged, ${noDamageCount} intact).`
      });
    }

    return list;
  }, [criticalEvents, satelliteObs, evidenceCards, assessmentResult, activeDistrict, totalDamaged, noDamageCount]);

  // Operational Pipeline Stages
  const pipelineStages = [
    {
      id: 'satellite',
      name: 'SATELLITE CONNECTED',
      view: 'satellite_view' as ViewType,
      status: 'ONLINE',
      detail: 'Copernicus Sentinel-2 MSI (10m L2A)',
      badgeColor: 'text-[#10B981] bg-[#10B981]/15 border-[#10B981]/30',
      dotColor: 'bg-[#10B981]'
    },
    {
      id: 'change',
      name: 'CHANGE ANALYSIS',
      view: 'change_detection' as ViewType,
      status: 'COMPLETED',
      detail: `${changedAreaPct.toFixed(1)}% altered (${(changedAreaM2 / 1000).toFixed(1)}k m²)`,
      badgeColor: 'text-[#10B981] bg-[#10B981]/15 border-[#10B981]/30',
      dotColor: 'bg-[#10B981]'
    },
    {
      id: 'damage',
      name: 'DAMAGE ASSESSMENT',
      view: 'damage_assessment' as ViewType,
      status: 'CALCULATED',
      detail: `${majorDamageCount} Major · ${minorDamageCount} Minor · ${noDamageCount} Intact`,
      badgeColor: 'text-[#F59E0B] bg-[#F59E0B]/15 border-[#F59E0B]/30',
      dotColor: 'bg-[#F59E0B]'
    },
    {
      id: 'risk',
      name: 'RISK ANALYSIS',
      view: 'risk_intelligence' as ViewType,
      status: 'ACTIVE',
      detail: `Composite Index: ${compositeRiskScore}/100 (${riskSeverityLevel})`,
      badgeColor: 'text-[#EF4444] bg-[#EF4444]/15 border-[#EF4444]/30',
      dotColor: 'bg-[#EF4444]'
    },
    {
      id: 'forecast',
      name: 'FORECAST',
      view: 'forecast' as ViewType,
      status: 'MONITORING',
      detail: '6h / 24h Early Warning Horizon',
      badgeColor: 'text-[#06B6D4] bg-[#06B6D4]/15 border-[#06B6D4]/30',
      dotColor: 'bg-[#06B6D4]'
    },
    {
      id: 'truth_loop',
      name: 'FIELD VERIFICATION',
      view: 'truth_loop' as ViewType,
      status: 'IN PROGRESS',
      detail: `${verifiedStructuresCount}/${totalStructures} Footprints Ground Verified`,
      badgeColor: 'text-[#8B5CF6] bg-[#8B5CF6]/15 border-[#8B5CF6]/30',
      dotColor: 'bg-[#8B5CF6]'
    }
  ];

  // Quick Action Matrix Configurations
  const quickActions = [
    {
      id: 'change_detection',
      title: 'Change Detection',
      tagline: 'What changed',
      view: 'change_detection' as ViewType,
      icon: Layers,
      color: 'hover:border-[#06B6D4] hover:text-[#06B6D4]'
    },
    {
      id: 'damage_assessment',
      title: 'Damage Assessment',
      tagline: 'What was damaged',
      view: 'damage_assessment' as ViewType,
      icon: ShieldAlert,
      color: 'hover:border-[#F97316] hover:text-[#F97316]'
    },
    {
      id: 'risk_intelligence',
      title: 'Risk Matrix',
      tagline: 'Multi-factor susceptibility',
      view: 'risk_intelligence' as ViewType,
      icon: Activity,
      color: 'hover:border-[#EF4444] hover:text-[#EF4444]'
    },
    {
      id: 'forecast',
      title: 'Forecast',
      tagline: '6h / 24h early warning',
      view: 'forecast' as ViewType,
      icon: CloudRain,
      color: 'hover:border-[#38BDF8] hover:text-[#38BDF8]'
    },
    {
      id: 'historical_view',
      title: 'History',
      tagline: 'Completed assessments',
      view: 'historical_view' as ViewType,
      icon: History,
      color: 'hover:border-[#A855F7] hover:text-[#A855F7]'
    },
    {
      id: 'map_3d',
      title: '3D Earth',
      tagline: 'Spatial 3D exploration',
      view: 'map_3d' as ViewType,
      icon: Globe2,
      color: 'hover:border-[#10B981] hover:text-[#10B981]'
    }
  ];

  const handleOpenReport = () => {
    if (onOpenReportModal) {
      onOpenReportModal();
    } else {
      setIsReportModalOpen(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full w-full bg-[#0B1118] text-[#E2E8F0] font-sans select-none overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. TOP STATUS BAR                                                         */}
      {/* ========================================================================= */}
      <header className="bg-[#0F1722] border-b border-[#1E2D3D] px-4 py-2 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs z-20 shadow-md">
        {/* Left: Brand Identity & Active Event Title */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#167F78]/20 border border-[#167F78]/40 text-[#167F78] font-mono font-bold tracking-wider text-[11px]">
            <Radio className="w-3.5 h-3.5 text-[#167F78] animate-pulse" />
            <span>SATGUARD CMD</span>
          </div>

          <div className="h-4 w-[1px] bg-[#1E2D3D] hidden sm:block" />

          {/* Active Event & Sector */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-[#F8FAFC] truncate text-xs tracking-wide">
                {activeEventTitle}
              </span>
              <span className="text-[#64748B] hidden md:inline">|</span>
              <span className="text-[#94A3B8] hidden md:inline truncate text-[11px] font-mono">
                {activeLocationName}, {selectedState}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Data Mode, Sync & Region Switchers */}
        <div className="flex items-center space-x-3 shrink-0">
          {/* Real vs Synthetic Mode Badge */}
          {isSyntheticDemo ? (
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#C58A24]/15 border border-[#C58A24]/40 text-[#F59E0B] font-mono text-[10px] font-semibold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-ping" />
              <span>SYNTHETIC DEMONSTRATION</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] font-mono text-[10px] font-semibold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>REAL / VERIFIED DATA</span>
            </div>
          )}

          {/* Region Switcher (Sikkim / Assam) */}
          <div className="flex items-center bg-[#131D2A] border border-[#1E2D3D] rounded-md p-0.5">
            <button
              onClick={() => handleSwitchState('Sikkim')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                selectedState === 'Sikkim'
                  ? 'bg-[#167F78] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#E2E8F0]'
              }`}
            >
              Sikkim
            </button>
            <button
              onClick={() => handleSwitchState('Assam')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                selectedState === 'Assam'
                  ? 'bg-[#167F78] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#E2E8F0]'
              }`}
            >
              Assam
            </button>
          </div>

          {/* Last Update & Live Clock */}
          <div className="hidden lg:flex items-center space-x-2 text-[11px] font-mono text-[#94A3B8] bg-[#131D2A] border border-[#1E2D3D] px-2.5 py-1 rounded">
            <Clock className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Updated: <strong className="text-[#E2E8F0]">{lastUpdatedTimestamp}</strong></span>
            <span className="text-[#1E2D3D]">|</span>
            <span className="text-[#10B981] font-semibold">{liveClock}</span>
          </div>

          {/* Connection Status Pill */}
          <div className="hidden xl:flex items-center space-x-1.5 text-[11px] text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-2 py-0.5 rounded font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            <span>{apiStatusLabel}</span>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. EXECUTIVE KPI BANNER                                                    */}
      {/* ========================================================================= */}
      <section className="bg-[#0D1520] border-b border-[#1E2D3D] px-4 py-2 shrink-0 grid grid-cols-2 md:grid-cols-5 gap-2.5 z-10">
        {/* KPI 1: Active Assessments */}
        <div className="bg-[#131D2A] border border-[#1E2D3D] rounded-lg p-2.5 flex flex-col justify-between hover:border-[#2A3F55] transition-colors">
          <div className="flex items-center justify-between text-[#94A3B8] text-[10px] font-mono uppercase tracking-wider">
            <span>ASSESSMENTS</span>
            <FileText className="w-3.5 h-3.5 text-[#06B6D4]" />
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-xl font-bold font-mono text-[#F8FAFC]">
              {String(totalAssessmentsCount).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-[#10B981] font-mono">
              ACTIVE SUITE
            </span>
          </div>
          <div className="text-[10px] text-[#64748B] font-mono mt-0.5 truncate">
            {scenes.length} Scenes · {historicalEvents.length} Archives
          </div>
        </div>

        {/* KPI 2: Structures Assessed */}
        <div className="bg-[#131D2A] border border-[#1E2D3D] rounded-lg p-2.5 flex flex-col justify-between hover:border-[#2A3F55] transition-colors">
          <div className="flex items-center justify-between text-[#94A3B8] text-[10px] font-mono uppercase tracking-wider">
            <span>STRUCTURES ASSESSED</span>
            <Building className="w-3.5 h-3.5 text-[#F97316]" />
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-xl font-bold font-mono text-[#F8FAFC]">
              {String(totalStructures).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-[#F97316] font-mono font-semibold">
              {totalDamaged} DAMAGED
            </span>
          </div>
          <div className="text-[10px] text-[#64748B] font-mono mt-0.5 truncate">
            {destroyedCount} Dest · {majorDamageCount} Maj · {noDamageCount} Intact
          </div>
        </div>

        {/* KPI 3: Changed Area */}
        <div className="bg-[#131D2A] border border-[#1E2D3D] rounded-lg p-2.5 flex flex-col justify-between hover:border-[#2A3F55] transition-colors">
          <div className="flex items-center justify-between text-[#94A3B8] text-[10px] font-mono uppercase tracking-wider">
            <span>CHANGED AREA</span>
            <Layers className="w-3.5 h-3.5 text-[#EAB308]" />
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-xl font-bold font-mono text-[#F8FAFC]">
              {changedAreaPct.toFixed(1)}%
            </span>
            <span className="text-[10px] text-[#EAB308] font-mono">
              {(changedAreaM2 / 1000).toFixed(1)}k m²
            </span>
          </div>
          <div className="text-[10px] text-[#64748B] font-mono mt-0.5 truncate">
            Bitemporal Optical Siamese Mask
          </div>
        </div>

        {/* KPI 4: Composite Risk Index */}
        <div className="bg-[#131D2A] border border-[#1E2D3D] rounded-lg p-2.5 flex flex-col justify-between hover:border-[#2A3F55] transition-colors">
          <div className="flex items-center justify-between text-[#94A3B8] text-[10px] font-mono uppercase tracking-wider">
            <span>COMPOSITE RISK INDEX</span>
            <Activity className="w-3.5 h-3.5 text-[#EF4444]" />
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-xl font-bold font-mono text-[#F8FAFC]">
              {compositeRiskScore} <span className="text-xs text-[#64748B]">/ 100</span>
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                riskSeverityLevel === 'CRITICAL'
                  ? 'text-[#EF4444] bg-[#EF4444]/20 border border-[#EF4444]/40'
                  : riskSeverityLevel === 'HIGH'
                  ? 'text-[#F97316] bg-[#F97316]/20 border border-[#F97316]/40'
                  : 'text-[#EAB308] bg-[#EAB308]/20 border border-[#EAB308]/40'
              }`}
            >
              {riskSeverityLevel}
            </span>
          </div>
          <div className="text-[10px] text-[#64748B] font-mono mt-0.5 truncate">
            {riskResult?.primaryFactor || 'Slope & Antecedent Rainfall'}
          </div>
        </div>

        {/* KPI 5: Field Verification Progress */}
        <div className="bg-[#131D2A] border border-[#1E2D3D] rounded-lg p-2.5 flex flex-col justify-between col-span-2 md:col-span-1 hover:border-[#2A3F55] transition-colors">
          <div className="flex items-center justify-between text-[#94A3B8] text-[10px] font-mono uppercase tracking-wider">
            <span>VERIFICATION</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#8B5CF6]" />
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-xl font-bold font-mono text-[#F8FAFC]">
              {verificationProgressPct}%
            </span>
            <span className="text-[10px] text-[#8B5CF6] font-mono">
              {verifiedStructuresCount} / {totalStructures}
            </span>
          </div>
          <div className="w-full bg-[#1E2D3D] h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className="bg-[#8B5CF6] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, verificationProgressPct)}%` }}
            />
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MAIN OPERATIONAL WORKSPACE (Grid: Primary Map + Panels)                  */}
      {/* ========================================================================= */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 p-2.5 overflow-hidden">
        {/* ======================================================================= */}
        {/* LEFT / CENTER COLUMN (3. Primary Map + 4. Current Assessment)          */}
        {/* ======================================================================= */}
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 h-full space-y-2.5">
          {/* 3. LARGE PRIMARY GEO-MAP CONTAINER */}
          <div className="flex-1 relative min-h-0 bg-[#0E1622] rounded-lg border border-[#1E2D3D] overflow-hidden flex flex-col shadow-inner">
            {/* Map Floating Control Header */}
            <div className="absolute top-3 left-3 z-20 flex items-center space-x-2 bg-[#0F1722]/90 backdrop-blur border border-[#1E2D3D] px-2.5 py-1.5 rounded-md text-xs shadow-lg">
              <span className="text-[#94A3B8] font-mono text-[11px] font-semibold flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-[#167F78]" />
                <span>PRIMARY GEO-MAP</span>
              </span>

              <span className="text-[#1E2D3D]">|</span>

              {/* 2D GIS vs 3D Earth Toggle */}
              <div className="flex items-center bg-[#131D2A] rounded p-0.5 border border-[#1E2D3D]">
                <button
                  onClick={() => setMapViewMode('2d')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                    mapViewMode === '2d'
                      ? 'bg-[#167F78] text-white'
                      : 'text-[#94A3B8] hover:text-[#E2E8F0]'
                  }`}
                >
                  2D GIS
                </button>
                <button
                  onClick={() => setMapViewMode('3d')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                    mapViewMode === '3d'
                      ? 'bg-[#EA580C] text-white'
                      : 'text-[#94A3B8] hover:text-[#E2E8F0]'
                  }`}
                >
                  <Globe2 className="w-3 h-3" />
                  <span>3D Twin</span>
                </button>
              </div>

              {/* Scene Switcher Dropdown (if multiple scenes exist) */}
              {scenes.length > 1 && (
                <>
                  <span className="text-[#1E2D3D]">|</span>
                  <select
                    value={selectedSceneId}
                    onChange={(e) => handleSwitchScene(e.target.value)}
                    className="bg-[#131D2A] border border-[#1E2D3D] text-[#E2E8F0] text-[10px] font-mono rounded px-1.5 py-0.5 outline-none cursor-pointer"
                  >
                    {scenes.map((sc) => (
                      <option key={sc.sceneId} value={sc.sceneId}>
                        {sc.title.length > 30 ? sc.title.substring(0, 30) + '...' : sc.title}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {/* Viewport Render (2D OpenStreetMapViewer or 3D SyntheticEarthViewer) */}
            <div className="flex-1 w-full h-full relative min-h-0 bg-[#0A0F15]">
              {mapViewMode === '2d' ? (
                <OpenStreetMapViewer
                  centerLat={mapCenter.lat}
                  centerLng={mapCenter.lng}
                  zoom={mapCenter.zoom}
                  onCenterChange={(lat, lng, zoom) => setMapCenter({ lat, lng, zoom })}
                  activeLayers={activeLayers}
                  selectedState={selectedState}
                  selectedZone={selectedZone}
                  onSelectZone={onSelectZone}
                  zones={zones}
                  assessmentResult={assessmentResult}
                  riskResult={riskResult}
                  onVerifyStructure={handleVerifyStructure}
                />
              ) : (
                <SyntheticEarthViewer
                  centerLat={mapCenter.lat}
                  centerLng={mapCenter.lng}
                  selectedRegion={selectedState?.toUpperCase() === 'ASSAM' ? 'ASSAM' : 'SIKKIM'}
                  assessmentResult={assessmentResult}
                  riskResult={riskResult}
                  onVerifyStructure={handleVerifyStructure}
                  timeOffset={timeOffset}
                  className="w-full h-full"
                />
              )}
            </div>
          </div>

          {/* 4. CURRENT ASSESSMENT SUMMARY (Compact Pre -> Post Bar) */}
          <div className="bg-[#0F1722] border border-[#1E2D3D] rounded-lg p-3 shrink-0 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs shadow-sm">
            {/* Chronology & Confidence */}
            <div className="flex flex-col space-y-1 min-w-0">
              <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
                <Shield className="w-3.5 h-3.5 text-[#167F78]" />
                <span className="font-semibold text-[#E2E8F0]">CURRENT ASSESSMENT</span>
                <span className="text-[#1E2D3D]">•</span>
                <span className="text-[#10B981]">Confidence: {((assessmentResult?.statistics?.averageConfidence || 0.922) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-[#131D2A] border border-[#1E2D3D] text-[#94A3B8]">
                  PRE: <strong className="text-[#E2E8F0]">{assessmentResult?.sceneMetadata?.acquisitionDates?.before || '28 Aug 2026'}</strong>
                </span>
                <span className="text-[#64748B]">→</span>
                <span className="px-2 py-0.5 rounded bg-[#131D2A] border border-[#1E2D3D] text-[#94A3B8]">
                  POST: <strong className="text-[#E2E8F0]">{assessmentResult?.sceneMetadata?.acquisitionDates?.after || '03 Sep 2026'}</strong>
                </span>
              </div>
            </div>

            {/* 4-Tier Damage Counts */}
            <div className="flex items-center space-x-2 overflow-x-auto py-1">
              {/* Destroyed */}
              <div className="px-2.5 py-1 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 flex flex-col items-center shrink-0">
                <span className="text-[9px] font-mono uppercase text-[#EF4444] font-semibold">DESTROYED</span>
                <span className="text-sm font-bold font-mono text-[#EF4444]">{destroyedCount}</span>
              </div>
              {/* Major */}
              <div className="px-2.5 py-1 rounded bg-[#F97316]/10 border border-[#F97316]/30 flex flex-col items-center shrink-0">
                <span className="text-[9px] font-mono uppercase text-[#F97316] font-semibold">MAJOR</span>
                <span className="text-sm font-bold font-mono text-[#F97316]">{majorDamageCount}</span>
              </div>
              {/* Minor */}
              <div className="px-2.5 py-1 rounded bg-[#EAB308]/10 border border-[#EAB308]/30 flex flex-col items-center shrink-0">
                <span className="text-[9px] font-mono uppercase text-[#EAB308] font-semibold">MINOR</span>
                <span className="text-sm font-bold font-mono text-[#EAB308]">{minorDamageCount}</span>
              </div>
              {/* Intact */}
              <div className="px-2.5 py-1 rounded bg-[#10B981]/10 border border-[#10B981]/30 flex flex-col items-center shrink-0">
                <span className="text-[9px] font-mono uppercase text-[#10B981] font-semibold">INTACT</span>
                <span className="text-sm font-bold font-mono text-[#10B981]">{noDamageCount}</span>
              </div>
            </div>

            {/* Verification Link */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => onSelectView?.('damage_assessment')}
                className="px-3 py-1.5 rounded bg-[#167F78]/20 hover:bg-[#167F78]/30 border border-[#167F78]/40 text-[#167F78] hover:text-white font-mono text-[11px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span>Damage Engine</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN (5. Operational Pipeline + 6. Key Intel + 7. Timeline + 8. Quick Actions) */}
        {/* ======================================================================= */}
        <section className="lg:col-span-5 xl:col-span-4 flex flex-col min-h-0 h-full space-y-2.5 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1E2D3D] pr-0.5">
          {/* 5. OPERATIONAL STATUS PIPELINE */}
          <div className="bg-[#0F1722] border border-[#1E2D3D] rounded-lg p-3 shrink-0 flex flex-col space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-[#94A3B8] text-[10px] font-mono uppercase tracking-wider border-b border-[#1E2D3D] pb-1.5">
              <span className="flex items-center space-x-1.5 font-bold text-[#E2E8F0]">
                <Activity className="w-3.5 h-3.5 text-[#10B981]" />
                <span>OPERATIONAL STATUS PIPELINE</span>
              </span>
              <span className="text-[#10B981] font-semibold">● 6 / 6 LIVE</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {pipelineStages.map((stg) => (
                <button
                  key={stg.id}
                  onClick={() => onSelectView?.(stg.view)}
                  className="w-full flex items-center justify-between p-2 rounded bg-[#131D2A] hover:bg-[#192638] border border-[#1E2D3D] hover:border-[#2A3F55] transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${stg.dotColor}`} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-semibold text-[#F8FAFC] group-hover:text-[#06B6D4] transition-colors truncate">
                        {stg.name}
                      </span>
                      <span className="text-[10px] text-[#64748B] truncate font-mono">
                        {stg.detail}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${stg.badgeColor}`}>
                    {stg.status}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 6. KEY INTELLIGENCE */}
          <div className="bg-[#0F1722] border border-[#1E2D3D] rounded-lg p-3 shrink-0 flex flex-col space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-[#94A3B8] text-[10px] font-mono uppercase tracking-wider border-b border-[#1E2D3D] pb-1.5">
              <span className="flex items-center space-x-1.5 font-bold text-[#E2E8F0]">
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>KEY INTELLIGENCE FINDINGS</span>
              </span>
              <span className="text-[#F59E0B] font-mono">TACTICAL SUMMARY</span>
            </div>

            <div className="flex flex-col space-y-2 text-xs">
              {/* Finding 1: Highest-Risk Sector */}
              <div className="p-2 rounded bg-[#131D2A] border-l-2 border-l-[#EF4444] border border-[#1E2D3D]">
                <div className="text-[10px] font-mono uppercase text-[#EF4444] font-semibold">
                  HIGHEST-RISK SECTOR
                </div>
                <div className="text-[11px] font-bold text-[#F8FAFC] mt-0.5">
                  {riskResult?.zoneName || activeLocationName}
                </div>
                <div className="text-[10px] text-[#94A3B8] mt-0.5">
                  Trigger: {riskResult?.primaryFactor || 'Precipitation & Geotechnical Slope'} (Risk: {compositeRiskScore}/100)
                </div>
              </div>

              {/* Finding 2: Observed Damage */}
              <div className="p-2 rounded bg-[#131D2A] border-l-2 border-l-[#F97316] border border-[#1E2D3D]">
                <div className="text-[10px] font-mono uppercase text-[#F97316] font-semibold">
                  OBSERVED DAMAGE
                </div>
                <div className="text-[11px] font-bold text-[#F8FAFC] mt-0.5">
                  {majorDamageCount} Major / {minorDamageCount} Minor / {destroyedCount} Destroyed
                </div>
                <div className="text-[10px] text-[#94A3B8] mt-0.5">
                  {((riskResult?.observedDamageContext?.damagedStructureDensityPct) ?? ((totalDamaged / (totalStructures || 1)) * 100)).toFixed(1)}% structure compromise density across active footprint.
                </div>
              </div>

              {/* Finding 3: Threatened Lifeline */}
              <div className="p-2 rounded bg-[#131D2A] border-l-2 border-l-[#06B6D4] border border-[#1E2D3D]">
                <div className="text-[10px] font-mono uppercase text-[#06B6D4] font-semibold">
                  THREATENED INFRASTRUCTURE
                </div>
                <div className="text-[11px] font-bold text-[#F8FAFC] mt-0.5 truncate">
                  {riskResult?.priorityAreas?.[0] || 'NH-10 Highway Viaduct KM 42+200 (Pier 4)'}
                </div>
                <div className="text-[10px] text-[#94A3B8] mt-0.5 truncate">
                  {riskResult?.priorityAreas?.[1] || 'Singtam Intake Generating Station (Teesta Stage V)'}
                </div>
              </div>

              {/* Finding 4: Action Trigger */}
              <div className="p-2 rounded bg-[#131D2A] border-l-2 border-l-[#10B981] border border-[#1E2D3D]">
                <div className="text-[10px] font-mono uppercase text-[#10B981] font-semibold">
                  OPERATIONAL ACTION TRIGGER
                </div>
                <div className="text-[11px] font-bold text-[#F8FAFC] mt-0.5">
                  {riskResult?.responsePriority === 'IMMEDIATE_DISPATCH'
                    ? 'Immediate Field Dispatch & Traffic Regulation'
                    : 'Field Verification & Slope Monitoring'}
                </div>
                <div className="text-[10px] text-[#94A3B8] mt-0.5">
                  {totalStructures - verifiedStructuresCount} unverified structural footprints pending ground confirmation.
                </div>
              </div>
            </div>
          </div>

          {/* 7. ACTIVITY / ALERT TIMELINE */}
          <div className="bg-[#0F1722] border border-[#1E2D3D] rounded-lg p-3 shrink-0 flex flex-col space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-[#94A3B8] text-[10px] font-mono uppercase tracking-wider border-b border-[#1E2D3D] pb-1.5">
              <span className="flex items-center space-x-1.5 font-bold text-[#E2E8F0]">
                <Clock className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span>ACTIVITY & ALERT TIMELINE</span>
              </span>
              <span className="text-[#06B6D4] font-mono">{dynamicTimelineEvents.length} EVENTS</span>
            </div>

            <div className="flex flex-col space-y-1.5 max-h-[170px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1E2D3D] pr-1">
              {dynamicTimelineEvents.length === 0 ? (
                <div className="p-3 text-center text-[#64748B] text-xs font-mono">
                  No operational activity events recorded for active sector.
                </div>
              ) : (
                dynamicTimelineEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2 rounded bg-[#131D2A] border border-[#1E2D3D] flex flex-col space-y-0.5"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[#94A3B8]">{evt.time}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                          evt.severity === 'CRITICAL'
                            ? 'text-[#EF4444] bg-[#EF4444]/20 border border-[#EF4444]/40'
                            : evt.severity === 'WARNING'
                            ? 'text-[#F97316] bg-[#F97316]/20 border border-[#F97316]/40'
                            : evt.severity === 'SUCCESS'
                            ? 'text-[#10B981] bg-[#10B981]/20 border border-[#10B981]/40'
                            : 'text-[#06B6D4] bg-[#06B6D4]/20 border border-[#06B6D4]/40'
                        }`}
                      >
                        {evt.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#E2E8F0] font-sans leading-tight mt-0.5">
                      {evt.description}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 8. QUICK ACTIONS */}
          <div className="bg-[#0F1722] border border-[#1E2D3D] rounded-lg p-3 shrink-0 flex flex-col space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-[#94A3B8] text-[10px] font-mono uppercase tracking-wider border-b border-[#1E2D3D] pb-1.5">
              <span className="flex items-center space-x-1.5 font-bold text-[#E2E8F0]">
                <Zap className="w-3.5 h-3.5 text-[#EAB308]" />
                <span>QUICK ACTIONS</span>
              </span>
              <span className="text-[#64748B] font-mono">DIRECT WORKSPACE</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {quickActions.map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.id}
                    onClick={() => onSelectView?.(act.view)}
                    className={`p-2 rounded bg-[#131D2A] hover:bg-[#192638] border border-[#1E2D3D] text-left transition-all cursor-pointer group flex flex-col justify-between ${act.color}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-current transition-colors" />
                      <ArrowUpRight className="w-3 h-3 text-[#64748B] group-hover:text-current transition-colors" />
                    </div>
                    <div className="mt-1.5">
                      <div className="text-[11px] font-bold text-[#F8FAFC] group-hover:text-current transition-colors truncate">
                        {act.title}
                      </div>
                      <div className="text-[9px] text-[#64748B] truncate font-mono">
                        {act.tagline}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* 7th Action: Executive PDF Report Modal Trigger */}
              <button
                onClick={handleOpenReport}
                className="col-span-2 p-2 rounded bg-[#167F78]/15 hover:bg-[#167F78]/25 border border-[#167F78]/40 text-[#167F78] hover:text-white transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-[#167F78] group-hover:text-white" />
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] font-bold text-[#F8FAFC] group-hover:text-white">
                      EXECUTIVE DOSSIER REPORT
                    </span>
                    <span className="text-[9px] text-[#94A3B8] group-hover:text-white/80 font-mono">
                      Generate formal multi-agency PDF
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#167F78] group-hover:text-white" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Internal Executive Report Modal Fallback */}
      {isReportModalOpen && (
        <ExecutiveReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          assessmentResult={assessmentResult}
          riskResult={riskResult}
        />
      )}
    </div>
  );
};

export default OpenWeatherCommandCenter;
