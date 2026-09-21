import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  CloudRain,
  CloudLightning,
  Sun,
  Wind,
  Droplets,
  AlertTriangle,
  Search,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Sliders,
  FileText,
  Activity,
  Layers,
  Thermometer,
  Shield,
  MessageSquare,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  X,
  Gauge,
  HelpCircle,
  Settings as SettingsIcon,
  Radio,
  TrendingUp,
  Cpu,
  Wifi,
  WifiOff,
  Globe2,
  Compass,
  AlertCircle,
  Building,
  Navigation as NavIcon,
  RotateCcw
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
  VerificationActionRequest
} from '../../types';
import { DataService } from '../../services/dataService';
import { ExecutiveReportModal } from '../reports/ExecutiveReportModal';
import { WeatherProviderOrchestrator } from '../../services/weatherProviderOrchestrator';
import { RegionalWeatherReport, getWeatherDataForZone } from '../../data/command-centre/weatherData';
import { OpenStreetMapViewer } from './OpenStreetMapViewer';
import { SyntheticEarthViewer } from '../map3d/SyntheticEarthViewer';
import { RedZoneInspector } from '../intelligence/RedZoneInspector';
import { getRiskBadgeClasses, getRiskColor, getRiskLevel, InterpretableRiskEngine } from '../../services/riskEngine';
import { getAuthoritativeAOI, getPrimaryAOIForState, AUTHORITATIVE_AOIS } from '../../data/command-centre/aoiRegistry';

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
}

export type WeatherLayerType = 'precipitation' | 'risk_heatmap' | 'roads' | 'villages' | 'infrastructure' | 'sensors' | 'satellite_change' | 'field_reports';
export type ForecastRange = '24h' | '7d' | 'historical';
export type RightPanelTab = 'risk_intel' | 'priorities' | 'reports' | 'sensors' | 'alerts';
export type SupportedState = 'Sikkim' | 'Assam';

export const OpenWeatherCommandCenter: React.FC<OpenWeatherCommandCenterProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  selectedState: parentSelectedState,
  onSelectState,
  metrics,
  criticalEvents,
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
  isOfflineMode = false
}) => {
  // State selection (Sync with parent or default to Sikkim)
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

  // Map Navigation & Extents (Default: Level 1 - India / Sikkim Level)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; zoom: number }>({
    lat: activeStateName === 'Assam' ? 25.1764 : 27.398,
    lng: activeStateName === 'Assam' ? 93.0238 : 88.535,
    zoom: activeStateName === 'Assam' ? 9.8 : 10.8
  });

  // Layer Visibility State
  const [activeLayers, setActiveLayers] = useState<Record<WeatherLayerType, boolean>>({
    precipitation: true,
    risk_heatmap: true,
    roads: true,
    villages: true,
    infrastructure: true,
    sensors: true,
    satellite_change: true,
    field_reports: true
  });

  const [forecastRange, setForecastRange] = useState<ForecastRange>('24h');
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('risk_intel');
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [inspectingZone, setInspectingZone] = useState<RiskZone | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState<boolean>(false);

  // Executive Report & Phase 2/3 Data States
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [riskResult, setRiskResult] = useState<RiskAssessmentResult | null>(null);
  const [mapViewMode, setMapViewMode] = useState<'2d' | '3d'>('2d');

  useEffect(() => {
    const loadPhase2And3Data = async () => {
      try {
        const [dmg, risk] = await Promise.all([
          DataService.getSceneResult('sikkim-nh10-dikchu-sector'),
          DataService.getSikkimDemoRisk()
        ]);
        setAssessmentResult(dmg);
        setRiskResult(risk);
      } catch (err) {
        console.warn('Error loading assessment/risk data in command center:', err);
      }
    };
    loadPhase2And3Data();
  }, []);

  // Authoritative human verification handler (updates backend -> AssessmentResult -> RiskAssessmentResult -> 2D/3D views)
  const handleVerifyStructure = async (actionReq: VerificationActionRequest) => {
    try {
      const updatedAssessment = await DataService.verifyStructure(actionReq);
      setAssessmentResult(updatedAssessment);
      const updatedRisk = await DataService.getSikkimDemoRisk();
      setRiskResult(updatedRisk);
    } catch (err) {
      console.error('Failed to execute structure verification:', err);
    }
  };

  // Time scrubber state
  const timeSteps = ['12:30', '12:40', '12:50', '13:00', '13:10', '13:20', '13:30', '13:40', '13:50', '14:00', '14:10'];
  const [activeTimeIndex, setActiveTimeIndex] = useState<number>(5);
  const [isPlayingTime, setIsPlayingTime] = useState<boolean>(false);

  // Live Weather Telemetry State (Dual Engine: Live OpenWeather with live satellite fallback)
  const [weather, setWeather] = useState<RegionalWeatherReport>(
    getWeatherDataForZone(selectedZone?.id, selectedZone?.state)
  );
  const [isLiveApi, setIsLiveApi] = useState<boolean>(true);
  const [apiStatusLabel, setApiStatusLabel] = useState<string>('Live OpenWeather Connected');
  const [selectedForecastStep, setSelectedForecastStep] = useState<number>(0);

  // Auto-play time slider
  useEffect(() => {
    let interval: any = null;
    if (isPlayingTime) {
      interval = setInterval(() => {
        setActiveTimeIndex((prev) => (prev + 1) % timeSteps.length);
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isPlayingTime, timeSteps.length]);

  // Handle State Switch (Sikkim <-> Assam)
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

  // Zoom preset handlers
  const handleZoomLevel = (level: 'INDIA' | 'NORTHEAST' | 'STATE_AOI') => {
    if (level === 'INDIA') {
      setMapCenter({ lat: 22.8, lng: 82.5, zoom: 4.8 });
    } else if (level === 'NORTHEAST') {
      setMapCenter({ lat: 26.2, lng: 92.8, zoom: 6.8 });
    } else {
      if (selectedState === 'Sikkim') {
        setMapCenter({ lat: 27.35, lng: 88.52, zoom: 11.2 });
      } else {
        setMapCenter({ lat: 25.18, lng: 93.02, zoom: 10.5 });
      }
    }
  };

  // Query Live Weather Data on Target Selection
  useEffect(() => {
    let isCancelled = false;

    const queryWeather = async () => {
      const lat = selectedZone?.lat || (selectedState === 'Sikkim' ? 27.398 : 25.176);
      const lng = selectedZone?.lng || (selectedState === 'Sikkim' ? 88.535 : 93.024);
      const zoneId = selectedZone?.id || (selectedState === 'Sikkim' ? 'sikkim-nh10-dikchu' : 'assam-dima-hasao-haflong');
      const zoneName = selectedZone?.name || (selectedState === 'Sikkim' ? 'Dikchu-Singtam' : 'Haflong Ghat');
      const stateName = selectedState;

      const res = await WeatherProviderOrchestrator.getRegionalWeatherReport(lat, lng, zoneId, zoneName, stateName, selectedZone?.district);
      if (!isCancelled) {
        setWeather(res.report);
        setIsLiveApi(res.isLive);
        setApiStatusLabel(res.errorStatus || 'Live IMD Primary / Weather Telemetry');
      }
    };

    queryWeather();

    return () => {
      isCancelled = true;
    };
  }, [selectedZone?.id, selectedZone?.lat, selectedZone?.lng, selectedZone?.name, selectedState]);

  // Multi-Factor Risk Calculation dynamically linked to rainfall telemetry via InterpretableRiskEngine
  const isSikkim = selectedState === 'Sikkim';

  // Evaluate dynamic multi-factor risk for the active zone using live/fallback rainfall telemetry
  const activeZoneAnalysis = React.useMemo(() => {
    const rain1h = weather?.rainfall1hMm;
    const rain72h = weather?.rainfall72hMm;
    const rainSrc = weather?.sourceCategory || (weather?.provenance?.includes('OpenWeather') ? 'LIVE' : weather?.provenance?.includes('Open-Meteo') ? 'FALLBACK' : 'SYNTHETIC');
    const authAOI = getAuthoritativeAOI(selectedZone?.id || (isSikkim ? 'sikkim-nh10-dikchu' : 'assam-dima-hasao-haflong'));

    return InterpretableRiskEngine.evaluateRisk({
      zoneId: selectedZone?.id || authAOI?.id || (isSikkim ? 'sikkim-nh10-dikchu' : 'assam-dima-hasao-haflong'),
      zoneName: selectedZone?.name || authAOI?.name || (isSikkim ? 'Dikchu – Singtam Sector' : 'Haflong Ghat Sector'),
      state: selectedState,
      district: selectedZone?.district || authAOI?.district || (isSikkim ? 'Pakyong' : 'Dima Hasao'),
      lat: selectedZone?.lat || authAOI?.lat || (isSikkim ? 27.398 : 25.1764),
      lng: selectedZone?.lng || authAOI?.lng || (isSikkim ? 88.535 : 93.0238),
      elevation_m: selectedZone?.elevation_m || authAOI?.elevation_m || (isSikkim ? 850 : 680),
      slope_deg: selectedZone?.slope_deg ?? authAOI?.geotechnicalInputs.slope_deg ?? (isSikkim ? 34.8 : 36.2),
      soil_moisture_pct: selectedZone?.soil_moisture_pct ?? authAOI?.geotechnicalInputs.soil_moisture_pct ?? (isSikkim ? 84.0 : 88.0),
      rainfall_1h_mm: rain1h,
      rainfall_72h_mm: rain72h,
      rainfall_source: rainSrc as any,
      historical_events_5y: selectedZone?.historical_events_5y ?? authAOI?.geotechnicalInputs.historical_events_5y ?? (isSikkim ? 6 : 9),
      lithology: selectedZone?.lithology || authAOI?.geotechnicalInputs.lithology || (isSikkim ? 'Weathered Biotite Gneiss & Mica Schist' : 'Disang Shale & Sandstone Alternation'),
      soil_type: selectedZone?.soil_type || authAOI?.geotechnicalInputs.soil_type,
      population_exposed: selectedZone?.population_exposed || authAOI?.associatedAssets.totalPopulationExposed || (isSikkim ? 1420 : 2100),
      villages_exposed: selectedZone?.villages_exposed || authAOI?.associatedAssets.settlements.map(s => s.name) || (isSikkim ? ['Dikchu Basti', 'Lower Singtam', 'Melli Colony'] : ['Jatinga Valley Settlement', 'Lower Haflong Railway Colony']),
      roads_affected: selectedZone?.roads_affected || authAOI?.associatedAssets.roads.map(r => r.name) || (isSikkim ? ['NH-10 Teesta Lifeline Road (KM 18-24)', 'Dikchu Bridge Approach'] : ['NH-27 East-West Corridor', 'Lumding-Badarpur Railway Line']),
      critical_facilities: selectedZone?.critical_facilities_affected || authAOI?.associatedAssets.facilities.map(f => f.name) || (isSikkim ? ['Singtam Hydro Power Substation', 'Dikchu Primary Health Sub-Centre'] : ['Haflong Civil Hospital Access', 'Railway Traction Substation']),
      threatened_bridges: authAOI?.associatedAssets.bridges.map(b => b.name) || (isSikkim ? ['Dikchu River Bridge'] : ['Diyung River Railway Span', 'Haflong Valley Viaduct']),
      time_offset_min: timeOffset
    });
  }, [selectedZone, selectedState, weather, timeOffset, isSikkim]);

  const riskScore = activeZoneAnalysis.riskScore;
  const currentRiskLevel = activeZoneAnalysis.riskLevel;

  // Landslide Risk Forecast Timeline Series (Calculated dynamically with rainfall scaling)
  const riskForecastSteps = React.useMemo(() => {
    const baseRain1h = weather?.rainfall1hMm || (isSikkim ? 34.2 : 28.5);
    const baseRain72h = weather?.rainfall72hMm || (isSikkim ? 185.0 : 142.0);

    const stepsConfig = [
      { label: 'Current', mult1h: 1.0, mult72h: 1.0, offsetMin: 0, summary: isSikkim ? 'Pore pressure elevated' : 'Disang shale saturated' },
      { label: '+3h', mult1h: 1.2, mult72h: 1.1, offsetMin: 30, summary: isSikkim ? 'Continued saturation' : 'Pore pressure surge' },
      { label: '+6h', mult1h: 1.4, mult72h: 1.2, offsetMin: 60, summary: isSikkim ? 'Debris flow probable' : 'Shoulder slip risk' },
      { label: '+12h', mult1h: 1.1, mult72h: 1.15, offsetMin: 120, summary: isSikkim ? 'Slow drainage' : 'Moderate runoff' },
      { label: '+24h', mult1h: 0.7, mult72h: 0.9, offsetMin: 180, summary: isSikkim ? 'Gradual stabilization' : 'Stabilizing trend' }
    ];

    return stepsConfig.map(s => {
      const stepRain1h = Math.round(baseRain1h * s.mult1h * 10) / 10;
      const stepRain72h = Math.round(baseRain72h * s.mult72h * 10) / 10;

      const stepOut = InterpretableRiskEngine.evaluateRisk({
        zoneId: selectedZone?.id || (isSikkim ? 'sikkim-nh10-dikchu' : 'assam-dima-hasao-haflong'),
        state: selectedState,
        slope_deg: selectedZone?.slope_deg ?? (isSikkim ? 34.8 : 36.2),
        soil_moisture_pct: selectedZone?.soil_moisture_pct ?? (isSikkim ? 84.0 : 88.0),
        rainfall_1h_mm: stepRain1h,
        rainfall_72h_mm: stepRain72h,
        historical_events_5y: selectedZone?.historical_events_5y ?? (isSikkim ? 5 : 4),
        lithology: selectedZone?.lithology || (isSikkim ? 'Weathered Biotite Gneiss & Quartz-Mica Schist' : 'Fractured Disang Shale & Fine Sandstone'),
        time_offset_min: s.offsetMin
      });

      return {
        label: s.label,
        rain: stepRain1h,
        riskScore: stepOut.riskScore,
        level: stepOut.riskLevel,
        summary: s.summary
      };
    });
  }, [weather, selectedZone, selectedState, isSikkim]);

  // Dynamic Response Priorities
  const responsePriorities = isSikkim ? [
    {
      id: 'RP-SK-01',
      rank: 1,
      target: 'NH-10 (KM 19 Dikchu-Singtam)',
      threatLevel: 'CRITICAL',
      recommendedAction: 'Field inspection required; prepare traffic diversion via NH-717A Pakyong.',
      leadAgency: 'BRO / Sikkim Police',
      status: 'Action Required'
    },
    {
      id: 'RP-SK-02',
      rank: 2,
      target: 'Dikchu (Mile 14 Settlement)',
      threatLevel: 'HIGH',
      recommendedAction: 'Verify slope condition; check tension cracks on upper hillside.',
      leadAgency: 'SDRF Pakyong',
      status: 'Field Inspection'
    },
    {
      id: 'RP-SK-03',
      rank: 3,
      target: 'Singtam (Indreni Bridge Abutment)',
      threatLevel: 'HIGH',
      recommendedAction: 'Continue monitoring river head and culvert discharge.',
      leadAgency: 'NHPC / Irrigation Dept',
      status: 'Monitoring'
    },
    {
      id: 'RP-SK-04',
      rank: 4,
      target: 'Rangpo & Pakyong Bypass (NH-717A)',
      threatLevel: 'MODERATE',
      recommendedAction: 'Maintain bypass readiness; inspect road drainage channels.',
      leadAgency: 'Sikkim PWD',
      status: 'Standby'
    }
  ] : [
    {
      id: 'RP-AS-01',
      rank: 1,
      target: 'NH-27 (Haflong Ghat Hill Corridor)',
      threatLevel: 'CRITICAL',
      recommendedAction: 'Field inspection required on rotational slump zone; regulate single-lane convoy.',
      leadAgency: 'Assam PWD / NHAI',
      status: 'Action Required'
    },
    {
      id: 'RP-AS-02',
      rank: 2,
      target: 'NF Railway Lumding-Badarpur Cut-Slope',
      threatLevel: 'HIGH',
      recommendedAction: 'Inspect track ballast drainage and rockfall safety nets.',
      leadAgency: 'NFR Engineering Wing',
      status: 'Field Inspection'
    },
    {
      id: 'RP-AS-03',
      rank: 3,
      target: 'Haflong Civil Hospital Access Road',
      threatLevel: 'HIGH',
      recommendedAction: 'Clear culvert sediment runoff to preserve emergency ambulance access.',
      leadAgency: 'Dima Hasao Civil Defense',
      status: 'Monitoring'
    }
  ];

  // Field Reports List
  const fieldReportsList = isSikkim ? [
    {
      id: 'INC-2026-0917',
      location: 'NH-10 / KM 19 (Dikchu Sector)',
      reportType: 'Road obstruction & tension crack',
      timestamp: '13:16 IST',
      verificationStatus: 'Pending',
      source: 'BRO Sector Ranger',
      detail: '8cm tension crack detected along outer road shoulder following 34mm rainfall.'
    },
    {
      id: 'INC-2026-0914',
      location: 'Singtam Indreni Suspension Bridge',
      reportType: 'Debris seepage from culvert',
      timestamp: '12:44 IST',
      verificationStatus: 'Verified',
      source: 'Ward Field Observer',
      detail: 'Heavy silt runoff exiting drainage outlet; bridge footing clear.'
    },
    {
      id: 'INC-2026-0911',
      location: 'Upper Martam Ridge Valley Sector',
      reportType: 'Roadside ditch seepage',
      timestamp: '11:15 IST',
      verificationStatus: 'Verified',
      source: 'Gram Panchayat Monitor',
      detail: 'Minor colluvial seepage entering roadside culvert; road clear and open.'
    }
  ] : [
    {
      id: 'INC-2026-0882',
      location: 'NH-27 / Haflong Ghat Corridor',
      reportType: 'Rotational shoulder slump',
      timestamp: '11:20 IST',
      verificationStatus: 'Verified',
      source: 'Assam Highway Patrol',
      detail: 'Single-lane traffic operating under convoy supervision; clearing crew deployed.'
    },
    {
      id: 'INC-2026-0879',
      location: 'Jatinga Valley Approach Road',
      reportType: 'Minor rockfall debris on shoulder',
      timestamp: '09:40 IST',
      verificationStatus: 'Resolved',
      source: 'PWD Patrol Unit',
      detail: 'Loose sandstone boulders cleared into shoulder ditch.'
    },
    {
      id: 'INC-2026-0875',
      location: 'NF Railway Lumding-Badarpur KM 44',
      reportType: 'Trackside drainage overflow',
      timestamp: '08:30 IST',
      verificationStatus: 'Pending',
      source: 'NFR Track Patrol',
      detail: 'Ballast silt accumulation observed during inspection patrol; maintenance alert issued.'
    }
  ];

  // Sensor Stats
  const sensorStats = isSikkim ? {
    totalNodes: 24,
    onlineNodes: 22,
    warningNodes: 3,
    criticalNodes: [
      { id: 'SN-DKC-04', type: 'Vibrating Wire Piezometer', location: 'Dikchu Toe Slope', val: '142 kPa', status: 'Elevated', normal: '< 85 kPa', lastPing: '13:18 IST' },
      { id: 'SN-SGT-02', type: 'Biaxial MEMS Tiltmeter', location: 'Singtam Indreni Abutment', val: '4.8°/hr', status: 'Warning', normal: '< 1.5°', lastPing: '13:19 IST' },
      { id: 'SN-NH10-09', type: 'TDR Soil Moisture Probe', location: 'NH-10 KM 19 Cut', val: '86% Saturation', status: 'High', normal: '< 65%', lastPing: '13:15 IST' },
      { id: 'SN-AWS-IMD', type: 'Optical Pluviometer', location: 'Singtam AWS Station', val: '38.4 mm/hr', status: 'Active', normal: '< 15 mm/hr', lastPing: '13:20 IST' }
    ]
  } : {
    totalNodes: 18,
    onlineNodes: 17,
    warningNodes: 2,
    criticalNodes: [
      { id: 'SN-HFL-01', type: 'Piezometer Probe', location: 'Haflong Ghat Slump', val: '128 kPa', status: 'Elevated', normal: '< 80 kPa', lastPing: '13:14 IST' },
      { id: 'SN-NFR-03', type: 'Tiltmeter Node', location: 'Railway Cut KM 42', val: '3.9°/hr', status: 'Warning', normal: '< 1.5°', lastPing: '13:16 IST' },
      { id: 'SN-TDR-AS02', type: 'TDR Soil Moisture Sensor', location: 'Haflong Valley Ridge', val: '88% Saturation', status: 'High', normal: '< 65%', lastPing: '13:17 IST' },
      { id: 'SN-AWS-HFL', type: 'IMD Rain Gauge', location: 'Haflong Town Station', val: '42.0 mm/hr', status: 'Active', normal: '< 15 mm/hr', lastPing: '13:20 IST' }
    ]
  };

  const toggleLayer = (layer: WeatherLayerType) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const getThreatBadge = (level: string) => {
    return getRiskBadgeClasses(level as any);
  };

  return (
    <div className={`h-full w-full flex overflow-hidden font-sans select-none border-0 ${
      isDarkMode ? 'bg-[#0B1F33] text-[#F4F1E8]' : 'bg-[#FAF8F1] text-[#172126]'
    }`}>
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR NAVIGATION (Matching Top-Left Epoch Brand Typography) */}
      {/* ========================================================================= */}
      <aside className={`flex flex-col justify-between p-3 border-r shrink-0 transition-all duration-300 ${
        isLeftSidebarCollapsed ? 'w-16' : 'w-56'
      } ${isDarkMode ? 'bg-[#102B43] border-[#1B3B5A]' : 'bg-[#F2EFE8] border-[#D7DEDC]'}`}>
        {/* Top: Logo & System Identity */}
        <div className="flex flex-col space-y-3.5">
          {/* Logo & Collapse button */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col leading-tight">
              <div className="flex items-baseline space-x-1.5">
                <span className="font-brand text-3xl text-[#F4F1E8] font-normal italic select-none leading-none">
                  Epoch
                </span>
                {!isLeftSidebarCollapsed && (
                  <span className="text-[10px] text-[#2A9D8F] font-mono tracking-tight uppercase font-bold">
                    Ops
                  </span>
                )}
              </div>
              {!isLeftSidebarCollapsed && (
                <span className="text-[9px] text-[#9EADB8] font-mono">
                  SIH26001 · Disaster Ops
                </span>
              )}
            </div>

            <button
              onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
              className="p-1 rounded-lg text-[#9EADB8] hover:text-[#F4F1E8] hover:bg-white/5 transition-colors cursor-pointer"
              title="Toggle Sidebar"
            >
              <ChevronLeft className={`w-4 h-4 transition-transform ${isLeftSidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Supported Operational State Switcher (Sikkim & Assam) */}
          {!isLeftSidebarCollapsed && (
            <div className="flex flex-col space-y-1.5 p-2 rounded-lg bg-[#163856] border border-[#1B3B5A]">
              <span className="text-[10px] font-mono text-[#9EADB8] uppercase tracking-wider font-semibold">
                Operational State:
              </span>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <button
                  onClick={() => handleSwitchState('Sikkim')}
                  className={`py-1.5 px-2 rounded font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                    selectedState === 'Sikkim'
                      ? 'bg-[#2A9D8F] text-white shadow-sm'
                      : 'text-[#9EADB8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>🏔️ Sikkim</span>
                </button>
                <button
                  onClick={() => handleSwitchState('Assam')}
                  className={`py-1.5 px-2 rounded font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                    selectedState === 'Assam'
                      ? 'bg-[#4F9D69] text-white shadow-sm'
                      : 'text-[#9EADB8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>🌿 Assam</span>
                </button>
              </div>
            </div>
          )}

          {/* Primary Navigation Items */}
          <nav className="flex flex-col space-y-1 text-xs">
            <button
              onClick={() => setRightPanelTab('risk_intel')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                rightPanelTab === 'risk_intel'
                  ? (isDarkMode ? 'bg-[#2A9D8F] text-white font-semibold' : 'bg-[#167F78] text-white')
                  : 'text-[#9EADB8] hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Activity className="w-4 h-4 shrink-0 text-[#2A9D8F]" />
                {!isLeftSidebarCollapsed && <span>Risk Intelligence</span>}
              </div>
              {!isLeftSidebarCollapsed && (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#0B1F33] text-[#2A9D8F] font-mono font-bold">
                  {riskScore}/100
                </span>
              )}
            </button>

            <button
              onClick={() => setRightPanelTab('priorities')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                rightPanelTab === 'priorities'
                  ? (isDarkMode ? 'bg-[#2A9D8F] text-white font-semibold' : 'bg-[#167F78] text-white')
                  : 'text-[#9EADB8] hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Response Priority</span>}
              </div>
              {!isLeftSidebarCollapsed && (
                <span className="w-4 h-4 rounded-full bg-[#C95050] text-white text-[10px] font-bold flex items-center justify-center">
                  {responsePriorities.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setRightPanelTab('reports')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                rightPanelTab === 'reports'
                  ? (isDarkMode ? 'bg-[#2A9D8F] text-white font-semibold' : 'bg-[#167F78] text-white')
                  : 'text-[#9EADB8] hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-4 h-4 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Field Reports</span>}
              </div>
              {!isLeftSidebarCollapsed && (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#4F9D69]/20 text-[#4F9D69] font-mono font-bold">
                  {fieldReportsList.length} Logs
                </span>
              )}
            </button>

            <button
              onClick={() => setRightPanelTab('sensors')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                rightPanelTab === 'sensors'
                  ? (isDarkMode ? 'bg-[#2A9D8F] text-white font-semibold' : 'bg-[#167F78] text-white')
                  : 'text-[#9EADB8] hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Cpu className="w-4 h-4 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Sensor Status</span>}
              </div>
              {!isLeftSidebarCollapsed && (
                <span className="text-[10px] font-mono text-[#4F9D69]">
                  {sensorStats.onlineNodes}/{sensorStats.totalNodes} OK
                </span>
              )}
            </button>

            <button
              onClick={() => setRightPanelTab('alerts')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                rightPanelTab === 'alerts'
                  ? (isDarkMode ? 'bg-[#2A9D8F] text-white font-semibold' : 'bg-[#167F78] text-white')
                  : 'text-[#9EADB8] hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#C58A24]" />
                {!isLeftSidebarCollapsed && <span>CAP Early Warning</span>}
              </div>
              {!isLeftSidebarCollapsed && (
                <span className="w-2 h-2 rounded-full bg-[#C95050]" />
              )}
            </button>
          </nav>

          {/* Multilingual Switcher & Sync Status */}
          {!isLeftSidebarCollapsed && (
            <div className="p-2.5 rounded-xl bg-[#1C202B] border border-[#282E3C] flex flex-col space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#8E99A8]">
                <span className="flex items-center space-x-1">
                  <Globe2 className="w-3.5 h-3.5" />
                  <span>Language</span>
                </span>
                <div className="flex items-center space-x-1">
                  {(['en', 'hi', 'as', 'bn'] as LanguageCode[]).map((lng) => (
                    <button
                      key={lng}
                      onClick={() => onSelectLanguage && onSelectLanguage(lng)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                        selectedLanguage === lng ? 'bg-[#EA580C] text-white' : 'text-[#8E99A8] hover:text-white'
                      }`}
                    >
                      {lng}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#282E3C] text-[10px] font-mono">
                <span className="text-[#8E99A8] flex items-center space-x-1">
                  {isOfflineMode ? <WifiOff className="w-3 h-3 text-[#F59E0B]" /> : <Wifi className="w-3 h-3 text-[#10B981]" />}
                  <span>Sync</span>
                </span>
                <span className={isOfflineMode ? 'text-[#F59E0B] font-bold' : 'text-[#10B981] font-bold'}>
                  {isOfflineMode ? 'LOCAL CACHE' : 'ONLINE SYNC'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom: Response Recommendation & Dark Mode Switch */}
        <div className="flex flex-col space-y-2 pt-2.5 border-t border-[#242833]">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-[#EA580C] text-white text-xs font-semibold hover:bg-[#F97316] transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {!isLeftSidebarCollapsed && <span>Response Plan</span>}
          </button>

          {!isLeftSidebarCollapsed && (
            <div className="flex items-center justify-between px-2 pt-1 text-xs text-[#8E99A8]">
              <span className="flex items-center space-x-1.5">
                <Sun className="w-3.5 h-3.5" />
                <span>Dark theme</span>
              </span>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${
                  isDarkMode ? 'bg-[#EA580C]' : 'bg-[#4B5563]'
                }`}
              >
                <div className={`w-3 h-3 rounded-full bg-white transition-transform ${
                  isDarkMode ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. CENTER OPERATIONAL GIS VIEWPORT (REAL OPENSTREETMAP BASEMAP) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Toolbar: Zoom Extents & Layer Controls */}
        <div className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${
          isDarkMode ? 'bg-[#161922] border-[#242833]' : 'bg-[#FAF8F1] border-[#D7DEDC]'
        }`}>
          {/* Zoom Extent Level Buttons (India -> Northeast -> State AOI) */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-mono text-[#8E99A8] uppercase tracking-wider font-semibold mr-1">
              Zoom:
            </span>
            <button
              onClick={() => handleZoomLevel('INDIA')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mapCenter.zoom < 6 ? 'bg-[#167F78] text-white shadow-sm' : 'bg-[#1C202B] text-[#8E99A8] hover:text-white'
              }`}
            >
              🇮🇳 All India
            </button>
            <button
              onClick={() => handleZoomLevel('NORTHEAST')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mapCenter.zoom >= 6 && mapCenter.zoom < 9 ? 'bg-[#167F78] text-white shadow-sm' : 'bg-[#1C202B] text-[#8E99A8] hover:text-white'
              }`}
            >
              🧭 Northeast (NER)
            </button>
            <button
              onClick={() => handleZoomLevel('STATE_AOI')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                mapCenter.zoom >= 9 ? 'bg-[#EA580C] text-white shadow-sm' : 'bg-[#1C202B] text-[#EA580C] hover:bg-[#EA580C]/20'
              }`}
            >
              📍 {selectedState === 'Sikkim' ? 'Dikchu–Singtam (Sikkim)' : 'Haflong Ghat (Assam)'}
            </button>
          </div>

          {/* 2D Tactical GIS vs 3D Earth Globe Switcher */}
          <div className="flex items-center bg-[#1C202B] p-0.5 rounded-xl border border-[#282E3C] shadow-inner">
            <button
              onClick={() => setMapViewMode('2d')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                mapViewMode === '2d'
                  ? 'bg-[#167F78] text-white shadow-sm'
                  : 'text-[#8E99A8] hover:text-white'
              }`}
              title="2D Tactical GIS Map (Primary Operational View with Assessment Layers)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2D Tactical GIS</span>
            </button>
            <button
              onClick={() => setMapViewMode('3d')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                mapViewMode === '3d'
                  ? 'bg-[#EA580C] text-white shadow-sm'
                  : 'text-[#8E99A8] hover:text-white'
              }`}
              title="3D Earth Twin Inspection (Geospatial Digital Twin & Extruded Footprints)"
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>3D Earth Twin</span>
            </button>
          </div>

          {/* Data Engine Provenance Badge */}
          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>WEATHER: OPENWEATHER API (LIVE)</span>
            </div>

            <span className="text-[11px] text-[#8E99A8] hidden md:inline">
              Sync: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
            </span>
          </div>
        </div>

        {/* Center: Main Map Viewport (2D Tactical GIS or 3D Earth Globe) */}
        <div className="flex-1 relative min-h-0 bg-[#E5E3DF] overflow-hidden">
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
              onInspectZone={(z) => setInspectingZone(z)}
              assessmentResult={assessmentResult}
              riskResult={riskResult}
              onVerifyStructure={handleVerifyStructure}
            />
          ) : (
            <div className="w-full h-full relative">
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
            </div>
          )}

          {/* Map Zoom Controls */}
          <div className="absolute top-4 right-4 z-20 flex flex-col space-y-1">
            <button
              onClick={() => setMapCenter(prev => ({ ...prev, zoom: Math.min(prev.zoom + 1, 16) }))}
              className="w-8 h-8 rounded-lg bg-[#FAF8F1] border border-[#D7DEDC] text-[#172126] flex items-center justify-center hover:bg-[#E6EDEB] text-sm font-bold shadow-md cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => setMapCenter(prev => ({ ...prev, zoom: Math.max(prev.zoom - 1, 3.5) }))}
              className="w-8 h-8 rounded-lg bg-[#FAF8F1] border border-[#D7DEDC] text-[#172126] flex items-center justify-center hover:bg-[#E6EDEB] text-sm font-bold shadow-md cursor-pointer"
              title="Zoom Out"
            >
              −
            </button>
            <button
              onClick={() => handleZoomLevel('INDIA')}
              className="w-8 h-8 rounded-lg bg-[#FAF8F1] border border-[#D7DEDC] text-[#172126] flex items-center justify-center hover:bg-[#E6EDEB] text-xs font-bold shadow-md cursor-pointer"
              title="Reset View (All India)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Time Scrubber Timeline Player */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-2 bg-[#161922]/95 border border-[#242833] px-3 py-1.5 rounded-xl shadow-lg text-xs text-white">
            <button
              onClick={() => setIsPlayingTime(!isPlayingTime)}
              className="p-1.5 rounded-lg bg-[#EA580C] text-white hover:bg-[#F97316] transition-colors cursor-pointer"
            >
              {isPlayingTime ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>

            <div className="flex items-center space-x-1 overflow-x-auto text-xs">
              {timeSteps.map((step, idx) => (
                <button
                  key={step}
                  onClick={() => {
                    setActiveTimeIndex(idx);
                    if (onTimeChange) onTimeChange(idx * 15);
                  }}
                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
                    activeTimeIndex === idx
                      ? 'bg-[#EA580C] text-white font-bold'
                      : 'text-[#8E99A8] hover:text-white'
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. BOTTOM LANDSLIDE RISK FORECAST MATRIX */}
        {/* ========================================================================= */}
        <div className="p-2.5 border-t border-[#1B3B5A] bg-[#102B43] shrink-0 flex flex-col space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4 font-medium">
              <span className="text-[#F4F1E8] flex items-center space-x-1.5 font-semibold">
                <TrendingUp className="w-3.5 h-3.5 text-[#2A9D8F]" />
                <span>Landslide Risk Forecast ({selectedState})</span>
              </span>

              <label className="flex items-center space-x-1.5 cursor-pointer text-[#2A9D8F]">
                <input
                  type="radio"
                  name="forecastRange"
                  checked={forecastRange === '24h'}
                  onChange={() => setForecastRange('24h')}
                  className="accent-[#2A9D8F]"
                />
                <span>Timeline (Current → +24h)</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer text-[#9EADB8] hover:text-[#F4F1E8]">
                <input
                  type="radio"
                  name="forecastRange"
                  checked={forecastRange === '7d'}
                  onChange={() => setForecastRange('7d')}
                  className="accent-[#2A9D8F]"
                />
                <span>7-Day Synoptic Watch</span>
              </label>
            </div>

            <span className="text-[10px] font-mono text-[#9EADB8]">
              Model: OpenWeather Grid + Terrain Geotech Engine
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 text-xs">
            {riskForecastSteps.map((step, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedForecastStep(idx)}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col space-y-0.5 ${
                  selectedForecastStep === idx
                    ? 'bg-[#163856] border-[#2A9D8F] ring-1 ring-[#2A9D8F]/30 shadow-md'
                    : 'bg-[#0B1F33] border-[#1B3B5A] hover:border-[#2A9D8F]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold font-mono text-[#F4F1E8] text-[11px]">{step.label}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${getThreatBadge(step.level)}`}>
                    {step.level}
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-0.5">
                  <span className="text-sm font-bold font-mono text-[#C58A24]">{step.riskScore}/100</span>
                  <span className="text-[10px] font-mono text-[#9EADB8]">{step.rain} mm/hr</span>
                </div>
                <span className="text-[9px] text-[#9EADB8] truncate">{step.summary}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. RIGHT SIDEBAR: PRIMARY RISK INTELLIGENCE & OPERATIONS PANEL */}
      {/* ========================================================================= */}
      <aside className="w-84 p-3 border-l border-[#1B3B5A] bg-[#102B43] shrink-0 flex flex-col h-full overflow-hidden text-[#F4F1E8]">
        {/* Top: Section Switcher & Date Header */}
        <div className="flex flex-col space-y-2 shrink-0 pb-2 border-b border-[#1B3B5A]">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-[#F4F1E8] flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-[#2A9D8F]" />
              <span>Risk Intelligence Desk ({selectedState})</span>
            </span>
            <span className="text-[10px] font-mono text-[#9EADB8]">
              05 Sep 2026 · 13:16 IST
            </span>
          </div>

          {/* Sub-tab Switcher (5 tabs: Risk Intel, Priorities, Reports, Sensors, Alerts) */}
          <div className="grid grid-cols-5 gap-1 bg-[#0B1F33] p-1 rounded-xl border border-[#1B3B5A] text-xs">
            <button
              onClick={() => setRightPanelTab('risk_intel')}
              className={`py-1 rounded-lg font-semibold text-[10px] text-center truncate transition-colors cursor-pointer ${
                rightPanelTab === 'risk_intel' ? 'bg-[#2A9D8F] text-white shadow-sm' : 'text-[#9EADB8] hover:text-[#F4F1E8]'
              }`}
            >
              Risk Intel
            </button>
            <button
              onClick={() => setRightPanelTab('priorities')}
              className={`py-1 rounded-lg font-semibold text-[10px] text-center truncate transition-colors cursor-pointer ${
                rightPanelTab === 'priorities' ? 'bg-[#2A9D8F] text-white shadow-sm' : 'text-[#9EADB8] hover:text-[#F4F1E8]'
              }`}
            >
              Priorities
            </button>
            <button
              onClick={() => setRightPanelTab('reports')}
              className={`py-1 rounded-lg font-semibold text-[10px] text-center truncate transition-colors cursor-pointer ${
                rightPanelTab === 'reports' ? 'bg-[#2A9D8F] text-white shadow-sm' : 'text-[#9EADB8] hover:text-[#F4F1E8]'
              }`}
            >
              Reports
            </button>
            <button
              onClick={() => setRightPanelTab('sensors')}
              className={`py-1 rounded-lg font-semibold text-[10px] text-center truncate transition-colors cursor-pointer ${
                rightPanelTab === 'sensors' ? 'bg-[#2A9D8F] text-white shadow-sm' : 'text-[#9EADB8] hover:text-[#F4F1E8]'
              }`}
            >
              Sensors
            </button>
            <button
              onClick={() => setRightPanelTab('alerts')}
              className={`py-1 rounded-lg font-semibold text-[10px] text-center truncate transition-colors cursor-pointer ${
                rightPanelTab === 'alerts' ? 'bg-[#2A9D8F] text-white shadow-sm' : 'text-[#9EADB8] hover:text-[#F4F1E8]'
              }`}
            >
              Alerts
            </button>
          </div>
        </div>

        {/* Scrollable, Frame-Fitted Content Container */}
        <div className="flex-1 overflow-y-auto pr-1 my-1.5 space-y-2 min-h-0 custom-scrollbar">
          {/* ------------------------------------------------------------- */}
          {/* TAB 1: RISK INTELLIGENCE & FACTORS */}
          {/* ------------------------------------------------------------- */}
          {rightPanelTab === 'risk_intel' && (
            <div className="space-y-2 text-xs animate-fadeIn">
              {/* Primary Risk Score Card - High contrast light card */}
              <div
                onClick={() => setInspectingZone(selectedZone)}
                className="p-2.5 rounded-xl bg-[#F7F5EF] text-[#172126] border border-[#E9ECE8] shadow-sm flex flex-col space-y-1 cursor-pointer hover:ring-2 hover:ring-[#2A9D8F] transition-all"
                title="Click to inspect risk zone telemetry & factors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#172126]">Risk Score: {riskScore}/100</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getThreatBadge(currentRiskLevel)}`}>
                    {currentRiskLevel}
                  </span>
                </div>
                <p className="text-[11px] text-[#4A5568] leading-snug">
                  Contributing factors: {activeZoneAnalysis.factorBreakdown.find(f => f.id === 'F-RAIN')?.triggerNarrative || `Orographic rainfall (${weather.rainfall1hMm} mm/hr) on saturated ${isSikkim ? '34.8°' : '36.2°'} slope.`}
                </p>
                <div className="flex items-center justify-between text-[9px] font-mono text-[#718096] pt-1 border-t border-[#D7DEDC]">
                  <span className="font-semibold">{selectedZone?.name || (isSikkim ? 'Dikchu Mile 14' : 'Haflong Ghat')}</span>
                  <span className="text-[#2A9D8F] font-bold">INSPECT ZONE →</span>
                </div>
              </div>

              {/* Weather Telemetry Section */}
              <div className="p-2 rounded-xl bg-[#163856] border border-[#1B3B5A] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#F4F1E8] flex items-center space-x-1">
                    <CloudRain className="w-3.5 h-3.5 text-[#2A9D8F]" />
                    <span>Weather Telemetry</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#2A9D8F]/15 text-[#2A9D8F] border border-[#2A9D8F]/30 font-bold">
                    {weather.sourceCategory || (weather.provenance?.includes('OpenWeather') ? 'LIVE' : weather.provenance?.includes('Open-Meteo') ? 'FALLBACK' : 'SYNTHETIC')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div className="p-1.5 rounded-lg bg-[#0B1F33] border border-[#1B3B5A]">
                    <span className="text-[#9EADB8] block text-[9px]">Temperature</span>
                    <span className="font-mono font-bold text-[#F4F1E8] text-xs">{weather.temperatureC}°C ({weather.cloudCondition})</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-[#0B1F33] border border-[#1B3B5A]">
                    <span className="text-[#9EADB8] block text-[9px]">Rainfall (1h / 24h)</span>
                    <span className="font-mono font-bold text-[#C58A24] text-xs">{weather.rainfall1hMm.toFixed(1)} / {weather.rainfall24hMm.toFixed(1)} mm</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-[#0B1F33] border border-[#1B3B5A]">
                    <span className="text-[#9EADB8] block text-[9px]">Humidity</span>
                    <span className="font-mono font-semibold text-[#F4F1E8] text-xs">{weather.humidityPct}%</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-[#0B1F33] border border-[#1B3B5A]">
                    <span className="text-[#9EADB8] block text-[9px]">Wind & Pressure</span>
                    <span className="font-mono font-semibold text-[#F4F1E8] text-xs">{weather.windSpeedKmh} km/h · {weather.pressureHpa} hPa</span>
                  </div>
                </div>

                {/* Mathematical Risk Contribution from Rainfall */}
                <div className="p-1.5 rounded-lg bg-[#0B1F33] border border-[#1B3B5A] flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#9EADB8]">Rainfall Factor Contrib (40%):</span>
                  <span className="text-[#C58A24] font-bold">
                    +{activeZoneAnalysis.factorContributions.rainfall.toFixed(1)} pts ({activeZoneAnalysis.factorBreakdown.find(f => f.id === 'F-RAIN')?.percentageOfTotal || 0}% share)
                  </span>
                </div>
              </div>

              {/* Terrain & Risk Factors */}
              <div className="p-2 rounded-xl bg-[#163856] border border-[#1B3B5A] space-y-1">
                <span className="font-bold text-xs text-[#F4F1E8] flex items-center space-x-1">
                  <Gauge className="w-3.5 h-3.5 text-[#2A9D8F]" />
                  <span>Terrain & Risk Factors</span>
                </span>

                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0B1F33] border border-[#1B3B5A]">
                    <span className="text-[#9EADB8]">Soil Moisture Saturation</span>
                    <span className="font-mono font-semibold text-[#F4F1E8]">{isSikkim ? '84% (Pore: 142 kPa)' : '89% (Pore: 128 kPa)'}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0B1F33] border border-[#1B3B5A]">
                    <span className="text-[#9EADB8]">Slope Angle / Lithology</span>
                    <span className="font-mono font-semibold text-[#F4F1E8]">{isSikkim ? '34.8° (Biotite Gneiss)' : '36.2° (Disang Shale)'}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0B1F33] border border-[#1B3B5A]">
                    <span className="text-[#9EADB8]">Satellite Observation (InSAR)</span>
                    <span className="font-mono font-bold text-[#4F9D69]">{isSikkim ? '+18.4 mm LOS' : '+14.2 mm LOS'}</span>
                  </div>
                </div>
              </div>

              {/* Exposure Breakdown */}
              <div className="p-2 rounded-xl bg-[#163856] border border-[#1B3B5A] space-y-1">
                <span className="font-bold text-xs text-[#F4F1E8] flex items-center space-x-1">
                  <Building className="w-3.5 h-3.5 text-[#2A9D8F]" />
                  <span>Exposed Assets & Settlements</span>
                </span>

                <div className="space-y-1 text-[11px] text-[#F4F1E8]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9EADB8]">Population Exposed</span>
                    <span className="font-mono font-bold text-[#F4F1E8]">{isSikkim ? '1,420 residents' : '2,100 residents'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9EADB8]">Corridors Affected</span>
                    <span className="font-mono font-bold text-[#C95050]">{isSikkim ? 'NH-10 (KM 19 Severed)' : 'NH-27 (Haflong Ghat Corridor)'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9EADB8]">Critical Facilities</span>
                    <span className="font-mono font-bold text-[#C58A24]">{isSikkim ? 'Teesta-V Dam, Bailey Bridge' : 'Haflong Hospital, NFR Line'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 2: RESPONSE PRIORITY */}
          {/* ------------------------------------------------------------- */}
          {rightPanelTab === 'priorities' && (
            <div className="space-y-1.5 text-xs animate-fadeIn">
              <div className="flex items-center justify-between text-[10px] text-[#9EADB8] px-1 font-mono">
                <span>OPERATIONAL DIRECTIVES ({selectedState.toUpperCase()})</span>
                <span className="text-[#2A9D8F] font-bold">{responsePriorities.length} Corridors</span>
              </div>

              {responsePriorities.map((rp) => (
                <div
                  key={rp.id}
                  className="p-2 rounded-xl bg-[#163856] border border-[#1B3B5A] flex flex-col space-y-1 hover:border-[#2A9D8F]/60 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-[#2A9D8F] text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        {rp.rank}
                      </span>
                      <span className="font-bold text-[#F4F1E8] text-xs truncate">{rp.target}</span>
                    </div>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shrink-0 border ml-1 ${getThreatBadge(rp.threatLevel)}`}>
                      {rp.threatLevel}
                    </span>
                  </div>
                  <p className="text-[#D7DEDC] text-[10px] leading-snug">
                    {rp.recommendedAction}
                  </p>
                  <div className="flex items-center justify-between pt-0.5 border-t border-[#1B3B5A] text-[9px] font-mono text-[#9EADB8]">
                    <span>Agency: <strong className="text-[#F4F1E8]">{rp.leadAgency}</strong></span>
                    <span className="text-[#2A9D8F] font-semibold px-1 py-0.2 rounded bg-[#2A9D8F]/10">{rp.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 3: FIELD REPORTS */}
          {/* ------------------------------------------------------------- */}
          {rightPanelTab === 'reports' && (
            <div className="space-y-1.5 text-xs animate-fadeIn">
              <div className="flex items-center justify-between text-[10px] text-[#9EADB8] px-1 font-mono">
                <span>[GROUND-TRUTH INCIDENT LOGS]</span>
                <span className="text-[#4F9D69] font-bold">{fieldReportsList.length} Incident Logs</span>
              </div>

              {/* Status summary pill bar */}
              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-center">
                <div className="p-1 rounded-lg bg-[#0B1F33] border border-[#1B3B5A]">
                  <span className="text-[#9EADB8] block text-[9px]">Total</span>
                  <span className="font-bold text-[#F4F1E8]">{fieldReportsList.length}</span>
                </div>
                <div className="p-1 rounded-lg bg-[#0B1F33] border border-[#4F9D69]/40">
                  <span className="text-[#4F9D69] block text-[9px]">Verified</span>
                  <span className="font-bold text-[#4F9D69]">2</span>
                </div>
                <div className="p-1 rounded-lg bg-[#0B1F33] border border-[#C58A24]/40">
                  <span className="text-[#C58A24] block text-[9px]">Inspection</span>
                  <span className="font-bold text-[#C58A24]">1</span>
                </div>
              </div>

              {fieldReportsList.map((rep) => (
                <div
                  key={rep.id}
                  className="p-2 rounded-xl bg-[#163856] border border-[#1B3B5A] flex flex-col space-y-1 hover:border-[#4F9D69]/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#F4F1E8] text-xs font-mono">{rep.id}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                      rep.verificationStatus === 'Verified' ? 'bg-[#4F9D69]/15 text-[#4F9D69] border border-[#4F9D69]/30' : 'bg-[#C58A24]/15 text-[#C58A24] border border-[#C58A24]/30'
                    }`}>
                      Field: {rep.verificationStatus}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#F4F1E8] font-semibold flex items-center justify-between">
                    <span className="truncate">{rep.location}</span>
                    <span className="text-[9px] font-mono text-[#9EADB8] shrink-0 ml-1">📷 Photo/Data</span>
                  </div>
                  <div className="text-[10px] text-[#2A9D8F] font-mono font-medium">{rep.reportType}</div>
                  <p className="text-[#9EADB8] text-[10px] leading-snug">{rep.detail}</p>
                  <div className="flex items-center justify-between pt-0.5 border-t border-[#1B3B5A] text-[9px] font-mono text-[#9EADB8]">
                    <span>Source: {rep.source}</span>
                    <span>Reported {rep.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 4: SENSOR STATUS */}
          {/* ------------------------------------------------------------- */}
          {rightPanelTab === 'sensors' && (
            <div className="space-y-1.5 text-xs animate-fadeIn">
              <div className="flex items-center justify-between text-[10px] text-[#9EADB8] px-1 font-mono">
                <span>[GEOTECHNICAL TELEMETRY NETWORK]</span>
                <span className="text-[#4F9D69] font-bold">{sensorStats.onlineNodes}/{sensorStats.totalNodes} ONLINE</span>
              </div>

              <div className="grid grid-cols-3 gap-1 text-center text-xs">
                <div className="p-1 rounded-xl bg-[#0B1F33] border border-[#1B3B5A]">
                  <span className="text-[9px] text-[#9EADB8] block font-mono">Monitored</span>
                  <span className="text-xs font-bold font-mono text-[#F4F1E8]">{sensorStats.totalNodes}</span>
                </div>
                <div className="p-1 rounded-xl bg-[#0B1F33] border border-[#4F9D69]/30">
                  <span className="text-[9px] text-[#4F9D69] block font-mono">Online</span>
                  <span className="text-xs font-bold font-mono text-[#4F9D69]">{sensorStats.onlineNodes}</span>
                </div>
                <div className="p-1 rounded-xl bg-[#0B1F33] border border-[#C95050]/30">
                  <span className="text-[9px] text-[#C95050] block font-mono">Warning</span>
                  <span className="text-xs font-bold font-mono text-[#C95050]">{sensorStats.warningNodes}</span>
                </div>
              </div>

              <div className="space-y-1">
                {sensorStats.criticalNodes.map((node) => (
                  <div key={node.id} className="p-1.5 rounded-xl bg-[#163856] border border-[#1B3B5A] flex flex-col space-y-0.5 hover:border-[#2A9D8F]/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 min-w-0">
                        <span className="font-bold text-[#F4F1E8] text-[11px] font-mono">{node.id}</span>
                        <span className="text-[9px] text-[#9EADB8] truncate">({node.type})</span>
                      </div>
                      <span className={`px-1 py-0.2 rounded text-[8px] font-mono font-bold shrink-0 ml-1 ${
                        node.status === 'Elevated' || node.status === 'High' ? 'bg-[#C95050]/15 text-[#C95050] border border-[#C95050]/30' : node.status === 'Warning' ? 'bg-[#C58A24]/15 text-[#C58A24] border border-[#C58A24]/30' : 'bg-[#4F9D69]/15 text-[#4F9D69] border border-[#4F9D69]/30'
                      }`}>
                        {node.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#9EADB8] truncate">{node.location}</span>
                      <span className="font-bold font-mono text-[#C95050] shrink-0 ml-1">{node.val}</span>
                    </div>
                    <div className="flex items-center justify-between text-[8px] font-mono text-[#9EADB8] pt-0.5 border-t border-[#1B3B5A]">
                      <span>Norm: {node.normal}</span>
                      <span>Ping: {node.lastPing} · 98% Batt</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-1.5 rounded-xl bg-[#0B1F33] border border-[#1B3B5A] text-[9px] font-mono text-[#9EADB8] flex items-center justify-between">
                <span>Network Inversion Confidence:</span>
                <span className="font-bold text-[#4F9D69]">94% (High Fidelity)</span>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 5: CAP ALERTS FEED */}
          {/* ------------------------------------------------------------- */}
          {rightPanelTab === 'alerts' && (
            <div className="space-y-2 text-xs animate-fadeIn">
              <div className="flex items-center justify-between text-[10px] text-[#9EADB8] px-1 font-mono">
                <span>[COMMON ALERTING PROTOCOL]</span>
                <span className="text-[#C95050] font-bold flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C95050] animate-pulse mr-1" />
                  LIVE BROADCAST
                </span>
              </div>

              {/* Active Emergency Broadcast Card */}
              <div className="p-2.5 rounded-xl bg-[#163856] border border-[#C95050]/40 flex flex-col space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-[#C95050] flex items-center font-mono">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#C95050] mr-1" />
                    CAP-CP EMERGENCY WARNING
                  </span>
                  <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-[#C95050]/20 text-[#C95050] font-bold border border-[#C95050]/30">
                    URGENT · SEVERE
                  </span>
                </div>
                <div className="font-bold text-[#F4F1E8] text-xs leading-snug">
                  Flash Landslide & Corridor Disruption Alert
                </div>
                <p className="text-[#D7DEDC] text-[10px] leading-relaxed">
                  Saturated colluvial layer along {isSikkim ? 'NH-10 (KM 18-24 Dikchu-Singtam)' : 'NH-27 Haflong Ghat Hill Corridor'} experiencing active shear displacement following heavy rainfall. Mandatory road diversion in effect.
                </p>
                <div className="grid grid-cols-2 gap-1 text-[9px] font-mono text-[#F4F1E8] pt-1 border-t border-[#1B3B5A]">
                  <div>Target: {isSikkim ? 'Pakyong & Gangtok Towers' : 'Dima Hasao Towers'}</div>
                  <div className="text-right">Reach: {isSikkim ? '1,420 Residents' : '2,100 Residents'}</div>
                </div>
              </div>

              {/* Multi-Channel Broadcast Delivery Pipeline */}
              <div className="p-2 rounded-xl bg-[#163856] border border-[#1B3B5A] space-y-1">
                <span className="font-bold text-xs text-[#F4F1E8] flex items-center space-x-1">
                  <Radio className="w-3.5 h-3.5 text-[#2A9D8F]" />
                  <span>Broadcast Delivery Pipeline</span>
                </span>
                <div className="space-y-1 text-[10px] font-mono">
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0B1F33] border border-[#1B3B5A]">
                    <span className="text-[#F4F1E8]">📡 Cell Broadcast SMS</span>
                    <span className="text-[#4F9D69] font-bold">100% DELIVERED</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0B1F33] border border-[#1B3B5A]">
                    <span className="text-[#F4F1E8]">🚨 Disaster Siren Network</span>
                    <span className="text-[#C58A24] font-bold">ARMED / STANDBY</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0B1F33] border border-[#1B3B5A]">
                    <span className="text-[#F4F1E8]">📻 Police & SDRF VHF</span>
                    <span className="text-[#4F9D69] font-bold">DISPATCHED (CH 4)</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0B1F33] border border-[#1B3B5A]">
                    <span className="text-[#F4F1E8]">📺 State Disaster Portal</span>
                    <span className="text-[#4F9D69] font-bold">LIVE BANNER ACTIVE</span>
                  </div>
                </div>
              </div>

              <div className="p-1.5 rounded-xl bg-[#0B1F33] border border-[#1B3B5A] text-[9px] font-mono text-[#9EADB8] flex items-center justify-between">
                <span>Authorized: SDMA</span>
                <span className="text-[#2A9D8F]">Sync: 13:16 IST</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action: View Response Plan Modal */}
        <div className="pt-2 border-t border-[#1B3B5A] shrink-0">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-[#2A9D8F] hover:bg-[#238276] text-white text-xs font-semibold transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Response Recommendation</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 5. RESPONSE RECOMMENDATION MODAL */}
      {/* ========================================================================= */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#102B43] border border-[#1B3B5A] rounded-2xl shadow-2xl p-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-[#1B3B5A] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#2A9D8F] text-white flex items-center justify-center shadow-sm">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#F4F1E8]">Disaster Operations Response Recommendation</h3>
                  <span className="text-[10px] text-[#9EADB8] font-mono">SIH26001 Multi-Factor Assessment · {selectedState}</span>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="p-1.5 rounded-lg text-[#9EADB8] hover:text-[#F4F1E8] hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Diagnosis & Action Items */}
            <div className="p-3.5 rounded-xl bg-[#163856] border border-[#1B3B5A] space-y-2 text-xs text-[#F4F1E8] leading-relaxed">
              <p>
                <strong>Operational Assessment for {selectedZone?.name || (isSikkim ? 'Dikchu-Singtam Sector' : 'Haflong Ghat Sector')}:</strong>
              </p>
              <p>
                Live OpenWeather telemetry indicates precipitation rate of <strong>{weather.rainfall1hMm.toFixed(1)} mm/hr</strong> (24h accumulation: <strong>{weather.rainfall24hMm.toFixed(1)} mm</strong>). Multi-factor analysis indicates critical pore water pressure surge on <strong>{isSikkim ? '34.8°' : '36.2°'}</strong> colluvium.
              </p>
              <div className="text-[#172126] bg-[#F7F5EF] p-2.5 rounded-lg border border-[#E9ECE8] space-y-1">
                <strong>Recommended Action:</strong>
                <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
                  {isSikkim ? (
                    <>
                      <li>Issue traffic diversion via NH-717A Pakyong bypass.</li>
                      <li>Instruct BRO heavy machinery unit at Singtam for slope toe inspection.</li>
                      <li>Verify tension cracks on upper Dikchu hillside with SDRF team.</li>
                    </>
                  ) : (
                    <>
                      <li>Maintain single-lane regulated convoy on NH-27 Haflong Ghat.</li>
                      <li>Deploy NFR patrol unit along railway hill section cut-slope.</li>
                      <li>Clear culvert runoff at Haflong Hospital access junction.</li>
                    </>
                  )}
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-[#9EADB8] hover:text-[#F4F1E8] cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setIsAiModalOpen(false);
                  if (onTriggerSOP) onTriggerSOP();
                }}
                className="px-4 py-2 rounded-xl bg-[#2A9D8F] hover:bg-[#238276] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                View Full SOP & Evacuation Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Red Zone Inspector Modal */}
      {inspectingZone && (
        <RedZoneInspector
          zone={inspectingZone}
          onClose={() => setInspectingZone(null)}
          isModal={true}
          onTriggerSOP={onTriggerSOP}
        />
      )}

      {/* Phase 3 Executive Disaster & Risk Intelligence Report Modal */}
      <ExecutiveReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        assessmentResult={assessmentResult}
        riskResult={riskResult}
      />
    </div>
  );
};

export default OpenWeatherCommandCenter;
