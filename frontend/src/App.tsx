import React, { useState, useEffect } from 'react';
import {
  ViewType,
  LanguageCode,
  SystemTelemetry,
  StateCoverage,
  SummaryMetrics,
  PSDataSource,
  RiskZone,
  CriticalEvent,
  RoadConnectivity,
  HistoricalEvent,
  SoilMoistureStation,
  SatelliteObservation,
  MultilingualAlert,
  EvidenceCard,
  TruthMetrics
} from './types';
import { DataService } from './services/dataService';
import { getPrimaryAOIForState } from './data/command-centre/aoiRegistry';

import { CheckCircle2 } from 'lucide-react';
// Layout Components
import { Header } from './components/layout/Header';
import { EventInfoBar } from './components/layout/EventInfoBar';
import { Navigation } from './components/layout/Navigation';
import { PipelineStatusBar } from './components/layout/PipelineStatusBar';

// Core Command Center Components
import { OpenWeatherCommandCenter } from './components/commandcenter/OpenWeatherCommandCenter';
import { CommandCenterMap } from './components/map3d/CommandCenterMap';
import { SituationIntelligence } from './components/intelligence/SituationIntelligence';
import { ExplainableAIPanel } from './components/xai/ExplainableAIPanel';
import { TimeMachineBar } from './components/timemachine/TimeMachineBar';

// Views
import { EpochTruthLoopView } from './components/truthloop/EpochTruthLoopView';
import { EpochFieldModeView } from './components/field/EpochFieldModeView';
import { RiskIntelligenceView } from './components/views/RiskIntelligenceView';
import { EarthExplorerView } from './components/views/EarthExplorerView';
import { ForecastView } from './components/views/ForecastView';
import { InfrastructureView } from './components/infrastructure/InfrastructureView';
import { ResponseSOPView } from './components/response/ResponseSOPView';
import { PipelineArchitectureView } from './components/pipeline/PipelineArchitectureView';

// Dedicated New PS Views
import { DataSourcesView } from './components/views/DataSourcesView';
import { SoilMoistureView } from './components/views/SoilMoistureView';
import { SatelliteIntelligenceView } from './components/views/SatelliteIntelligenceView';
import { HistoricalEventsView } from './components/views/HistoricalEventsView';
import { AlertCenterView } from './components/views/AlertCenterView';

// Phase 2 Damage Assessment Views
import { DamageAssessmentView } from './components/views/DamageAssessmentView';
import { ChangeDetectionView } from './components/views/ChangeDetectionView';

// Modals
import { ReportIncidentModal } from './components/incidents/ReportIncidentModal';

export const App: React.FC = () => {
  // Navigation & View State
  const [currentView, setCurrentView] = useState<ViewType>('command_center');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [selectedState, setSelectedState] = useState<string>('Sikkim');
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [queuedCount, setQueuedCount] = useState<number>(0);

  // Core Data States
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [states, setStates] = useState<StateCoverage[]>([]);
  const [metrics, setMetrics] = useState<SummaryMetrics | null>(null);
  const [dataSources, setDataSources] = useState<PSDataSource[]>([]);
  const [zones, setZones] = useState<RiskZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<RiskZone | null>(null);
  const [criticalEvents, setCriticalEvents] = useState<CriticalEvent[]>([]);
  const [roads, setRoads] = useState<RoadConnectivity[]>([]);

  // PS Dedicated Data States
  const [historicalEvents, setHistoricalEvents] = useState<HistoricalEvent[]>([]);
  const [soilStations, setSoilStations] = useState<SoilMoistureStation[]>([]);
  const [satelliteObs, setSatelliteObs] = useState<SatelliteObservation[]>([]);
  const [alerts, setAlerts] = useState<MultilingualAlert[]>([]);

  // Truth Loop States
  const [evidenceCards, setEvidenceCards] = useState<EvidenceCard[]>([]);
  const [truthMetrics, setTruthMetrics] = useState<TruthMetrics | null>(null);

  // Time Machine State (0, 30, 60, 120, 180 minutes)
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isTerrainFullScreen, setIsTerrainFullScreen] = useState<boolean>(false);

  // Initial Data Load
  useEffect(() => {
    const loadAll = async () => {
      const summary = await DataService.getSummary();
      setTelemetry(summary.telemetry);
      setMetrics(summary.metrics);
      setCriticalEvents(summary.critical_events);
      setRoads(summary.roads_at_risk);
      setDataSources(summary.ps_data_sources);

      const statesList = await DataService.getStates();
      setStates(statesList);

      const zoneList = await DataService.getRiskZones();
      setZones(zoneList);
      if (zoneList.length > 0) {
        setSelectedZone(zoneList[0]);
      }

      const hist = await DataService.getHistoricalEvents();
      setHistoricalEvents(hist);

      const soil = await DataService.getSoilMoistureNetwork();
      setSoilStations(soil.stations);

      const sat = await DataService.getSatelliteObservations();
      setSatelliteObs(sat.observations);

      const alertList = await DataService.getAlerts(selectedLanguage);
      setAlerts(alertList);

      const truth = await DataService.getTruthLoopData();
      setEvidenceCards(truth.evidence_cards);
      setTruthMetrics(truth.truth_metrics);

      setQueuedCount(DataService.getQueuedIncidents().length);
    };

    loadAll();
  }, [selectedLanguage]);

  // Synchronized State and Zone Selection Handlers
  const handleSelectState = (newState: string) => {
    setSelectedState(newState);
    if (newState !== 'ALL') {
      const primaryAOI = getPrimaryAOIForState(newState);
      const matchingZone = zones.find(z => z.id === primaryAOI.id) || zones.find(z => z.state.toLowerCase() === newState.toLowerCase());
      if (matchingZone) {
        setSelectedZone(matchingZone);
      }
    }
  };

  const handleSelectZone = (newZone: RiskZone) => {
    setSelectedZone(newZone);
    if (selectedState !== 'ALL' && newZone.state && newZone.state.toLowerCase() !== selectedState.toLowerCase()) {
      setSelectedState(newZone.state);
    }
  };

  // Handle Offline Toggle
  const handleToggleOffline = () => {
    const nextMode = !isOfflineMode;
    setIsOfflineMode(nextMode);
    DataService.setOfflineMode(nextMode);
  };

  // Handle Event Zone Selection
  const handleSelectEventZone = (zoneId: string) => {
    const match = zones.find(z => z.id === zoneId);
    if (match) handleSelectZone(match);
  };

  // Handle Incident Submission
  const handleIncidentSubmitted = (newIncident: EvidenceCard, wasOffline: boolean) => {
    setEvidenceCards([newIncident, ...evidenceCards]);
    if (wasOffline) {
      setQueuedCount(DataService.getQueuedIncidents().length);
    }
    if (truthMetrics) {
      setTruthMetrics({
        ...truthMetrics,
        predicted_events: truthMetrics.predicted_events + 1,
        unverified: truthMetrics.unverified + 1
      });
    }
  };

  // Check initial URL query parameter for PWA / Field Mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view') as ViewType;
      if (viewParam) {
        setCurrentView(viewParam);
      }
    }
  }, []);

  // Filter zones by selected state if specific state chosen
  const displayedZones = selectedState === 'ALL'
    ? zones
    : zones.filter(z => z.state.toLowerCase() === selectedState.toLowerCase());

  const activeZone = selectedZone || displayedZones[0] || zones[0];

  if (!telemetry || !metrics || !activeZone) {
    return (
      <div className="min-h-screen bg-[#EEE9DC] text-[#167F78] flex flex-col items-center justify-center font-mono space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#167F78] border-t-transparent animate-spin" />
        <div className="text-xs font-semibold tracking-widest uppercase text-[#667579]">
          INITIALIZING SATGUARD GEOSPATIAL COMMAND CENTER...
        </div>
      </div>
    );
  }

  const mults: Record<number, number> = { 0: 1.0, 30: 1.15, 60: 1.32, 120: 1.48, 180: 1.08 };
  const mult = mults[timeOffset] || 1.0;
  const currentRiskPct = Math.min(Math.round(activeZone.landslide_probability * mult * 100), 96);
  const isCritical = currentRiskPct >= 75;

  return (
    <div className="h-screen max-h-screen w-screen bg-[#EEE9DC] text-[#172126] flex flex-col font-sans select-none overflow-hidden">
      {/* 1. Command Header */}
      <Header
        telemetry={telemetry}
        states={states}
        selectedState={selectedState}
        onSelectState={handleSelectState}
        selectedZone={activeZone}
        onSelectZone={handleSelectZone}
        zones={displayedZones.length > 0 ? displayedZones : zones}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
        isOfflineMode={isOfflineMode}
        onToggleOfflineMode={handleToggleOffline}
        queuedCount={queuedCount}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenFieldApp={() => setCurrentView('field_mode')}
      />

      {/* 2. Event Information & Rapid Action Bar */}
      <EventInfoBar
        currentView={currentView}
        onSelectView={setCurrentView}
        selectedState={selectedState}
        selectedSectorName={activeZone?.name}
      />

      {/* 3. Navigation & Processing Chain Bar */}
      <Navigation currentView={currentView} onSelectView={setCurrentView} />
      <PipelineStatusBar
        steps={[]}
        onViewPipeline={() => setCurrentView('pipeline_view')}
      />

      {/* 3. Main Operational Viewport */}
      <main className={`flex-1 overflow-hidden flex flex-col min-h-0 view-animate ${currentView === 'command_center' || currentView === 'map_3d' || currentView === 'satellite_view' ? 'p-0' : 'p-3'}`}>
        {/* VIEW 1: COMMAND CENTER (Primary Mission Control - OpenWeather Operations Dashboard) */}
        {currentView === 'command_center' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden h-full w-full">
            <OpenWeatherCommandCenter
              zones={displayedZones.length > 0 ? displayedZones : zones}
              selectedZone={activeZone}
              onSelectZone={handleSelectZone}
              selectedState={selectedState}
              onSelectState={handleSelectState}
              metrics={metrics}
              criticalEvents={criticalEvents}
              timeOffset={timeOffset}
              onTimeChange={setTimeOffset}
              onTriggerSOP={() => setCurrentView('response_sop')}
              roads={roads}
              historicalEvents={historicalEvents}
              soilStations={soilStations}
              satelliteObs={satelliteObs}
              alerts={alerts}
              evidenceCards={evidenceCards}
              selectedLanguage={selectedLanguage}
              onSelectLanguage={setSelectedLanguage}
              isOfflineMode={isOfflineMode}
              onSelectView={setCurrentView}
              onOpenReportModal={() => setIsReportModalOpen(true)}
            />
          </div>
        )}

        {/* VIEW 2: EPOCH TRUTH LOOP */}
        {currentView === 'truth_loop' && truthMetrics && (
          <EpochTruthLoopView
            zones={displayedZones.length > 0 ? displayedZones : zones}
            selectedZone={activeZone}
            selectedState={selectedState}
            onSelectZone={handleSelectZone}
            evidenceCards={evidenceCards}
            truthMetrics={truthMetrics}
            onOpenReportModal={() => setIsReportModalOpen(true)}
          />
        )}

        {/* VIEW: EPOCH FIELD PWA MOBILE WORKFLOW (PHASE 14) */}
        {currentView === 'field_mode' && (
          <EpochFieldModeView
            zones={displayedZones.length > 0 ? displayedZones : zones}
            selectedZone={activeZone}
            selectedState={selectedState}
            onSelectZone={handleSelectZone}
            evidenceCards={evidenceCards}
            onIncidentSubmitted={handleIncidentSubmitted}
            onOpenCommandCenter={() => setCurrentView('command_center')}
          />
        )}

        {/* VIEW 3: RISK INTELLIGENCE */}
        {currentView === 'risk_intelligence' && (
          <RiskIntelligenceView
            zones={displayedZones.length > 0 ? displayedZones : zones}
            selectedZone={activeZone}
            onSelectZone={handleSelectZone}
            selectedState={selectedState}
          />
        )}

        {/* VIEW 4: 3D EARTH GIS */}
        {currentView === 'map_3d' && (
          <EarthExplorerView
            zones={displayedZones.length > 0 ? displayedZones : zones}
            selectedZone={activeZone}
            onSelectZone={handleSelectZone}
            selectedState={selectedState}
            onSelectState={handleSelectState}
            timeOffset={timeOffset}
          />
        )}

        {/* VIEW 5: FORECAST SIMULATOR */}
        {currentView === 'forecast' && (
          <ForecastView
            zones={displayedZones.length > 0 ? displayedZones : zones}
            selectedZone={activeZone}
            selectedState={selectedState}
            onSelectZone={handleSelectZone}
            timeOffset={timeOffset}
            onTimeChange={setTimeOffset}
            rainfallIntensity={metrics.current_rainfall_intensity_mm_hr}
            maxRiskPct={metrics.current_risk_index_pct}
          />
        )}

        {/* VIEW 6: PS REQUIRED DATA SOURCES */}
        {currentView === 'data_sources' && (
          <DataSourcesView dataSources={dataSources} />
        )}

        {/* VIEW 7: SOIL MOISTURE NETWORK */}
        {currentView === 'soil_moisture' && (
          <SoilMoistureView
            stations={soilStations}
            selectedState={selectedState}
          />
        )}

        {/* VIEW 8: SATELLITE INSAR OBSERVATIONS */}
        {currentView === 'satellite_view' && (
          <SatelliteIntelligenceView
            observations={satelliteObs}
            selectedState={selectedState}
            onSelectView={setCurrentView}
            selectedZone={activeZone}
            onSelectZone={handleSelectZone}
            zones={displayedZones.length > 0 ? displayedZones : zones}
          />
        )}

        {/* VIEW 9: HISTORICAL LANDSLIDES INVENTORY */}
        {currentView === 'historical_view' && (
          <HistoricalEventsView
            events={historicalEvents}
            selectedState={selectedState}
            onSelectView={setCurrentView}
          />
        )}

        {/* VIEW 10: ROAD CONNECTIVITY INTELLIGENCE */}
        {currentView === 'infrastructure' && (
          <InfrastructureView
            roads={roads}
            zones={displayedZones.length > 0 ? displayedZones : zones}
            selectedZone={activeZone}
            selectedState={selectedState}
            onSelectZone={handleSelectZone}
          />
        )}

        {/* VIEW 11: MULTILINGUAL ALERT CENTER */}
        {currentView === 'alert_center' && (
          <AlertCenterView
            alerts={alerts}
            selectedLanguage={selectedLanguage}
            selectedState={selectedState}
            onSelectLanguage={setSelectedLanguage}
          />
        )}

        {/* VIEW 12: RESPONSE & SOPS */}
        {currentView === 'response_sop' && (
          <ResponseSOPView
            zones={displayedZones.length > 0 ? displayedZones : zones}
            selectedZone={activeZone}
            selectedState={selectedState}
            onSelectZone={handleSelectZone}
          />
        )}

        {/* VIEW 13: 8-STAGE DATA PIPELINE */}
        {currentView === 'pipeline_view' && (
          <PipelineArchitectureView steps={[]} />
        )}

        {/* VIEW 14: PHASE 2 INTERNAL DAMAGE ASSESSMENT ENGINE */}
        {currentView === 'damage_assessment' && (
          <DamageAssessmentView onSelectView={setCurrentView} />
        )}

        {/* VIEW 15: PHASE 2 BITEMPORAL CHANGE DETECTION */}
        {currentView === 'change_detection' && (
          <ChangeDetectionView onSelectView={setCurrentView} />
        )}
      </main>

      {/* 4. Global Operational Status & Data Sources Footer */}
      <footer className="bg-[#FAF8F1] border-t border-[#D7DEDC] px-4 py-2 flex flex-wrap items-center justify-between text-[11px] font-sans text-[#667579] shrink-0 select-none shadow-subtle">
        <div className="flex items-center space-x-2.5 overflow-x-auto">
          <span className="font-bold text-[#172126] uppercase text-[10px] tracking-wider">DATA SOURCES:</span>
          <span className="px-2 py-0.5 rounded bg-[#E6EDEB] border border-[#D7DEDC] font-mono text-[10px] text-[#172126]">
            IMD (Rainfall)
          </span>
          <span className="px-2 py-0.5 rounded bg-[#E6EDEB] border border-[#D7DEDC] font-mono text-[10px] text-[#172126]">
            ISRO NRSC (EO)
          </span>
          <span className="px-2 py-0.5 rounded bg-[#E6EDEB] border border-[#D7DEDC] font-mono text-[10px] text-[#172126]">
            GSI (Landslide Inventory)
          </span>
          <span className="px-2 py-0.5 rounded bg-[#E6EDEB] border border-[#D7DEDC] font-mono text-[10px] text-[#172126]">
            Copernicus (Sentinel-1)
          </span>
          <span className="px-2 py-0.5 rounded bg-[#C58A24]/10 border border-[#C58A24]/30 text-[#C58A24] font-semibold text-[10px]">
            • SYNTHETIC DEMONSTRATION DATA
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <span>Last Updated: <strong className="text-[#172126] font-mono">03 Sept 2026 22:08 IST</strong></span>
          <span className="text-[#D7DEDC]">•</span>
          <span className="text-[#167F78] font-semibold flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> All Systems Operational
          </span>
        </div>
      </footer>

      {/* Field Incident Reporting Modal */}
      <ReportIncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        zones={displayedZones.length > 0 ? displayedZones : zones}
        isOfflineMode={isOfflineMode}
        onSubmitSuccess={handleIncidentSubmitted}
      />
    </div>
  );
};
export default App;


