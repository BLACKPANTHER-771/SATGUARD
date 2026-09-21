import {
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
  TruthMetrics,
  SyncStatus,
  FieldReport,
  FieldEvidenceStatus,
  FieldReportSource,
  FieldEvidenceType,
  Phase10TruthMetrics,
  BitemporalScenePair,
  AssessmentResult,
  DetectedStructure,
  DamageClass,
  VerificationActionRequest,
  RiskAssessmentResult,
  HistoricalEventRecord
} from '../types';
import { FieldReportService } from './fieldReportService';
import { OfflineSyncService } from './offlineSyncService';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  ''
).trim();

import fallbackData from '../../../data/synthetic/ner_risk_data.json';

const LOCAL_STORAGE_QUEUE_KEY = 'epoch_offline_incidents_queue';

export class DataService {
  private static isOfflineSimulated: boolean = false;

  static setOfflineMode(offline: boolean) {
    this.isOfflineSimulated = offline;
  }

  static getOfflineMode(): boolean {
    return this.isOfflineSimulated;
  }

  private static async fetchWithFallback<T>(endpoint: string, fallback: T): Promise<T> {
    if (this.isOfflineSimulated || !API_BASE) {
      return fallback;
    }
    try {
      const res = await fetch(`${API_BASE}${endpoint}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch {
      return fallback;
    }
  }

  static async getTelemetry(): Promise<SystemTelemetry> {
    return this.fetchWithFallback<SystemTelemetry>(
      '/telemetry',
      fallbackData.system_telemetry as SystemTelemetry
    );
  }

  static async getStates(): Promise<StateCoverage[]> {
    return this.fetchWithFallback<StateCoverage[]>(
      '/states',
      fallbackData.states_coverage as StateCoverage[]
    );
  }

  static async getDataSources(): Promise<PSDataSource[]> {
    return this.fetchWithFallback<PSDataSource[]>(
      '/data-sources',
      fallbackData.ps_data_sources as PSDataSource[]
    );
  }

  static async getPsDataSources(): Promise<PSDataSource[]> {
    return this.getDataSources();
  }

  static async getSummary(): Promise<{
    telemetry: SystemTelemetry;
    metrics: SummaryMetrics;
    critical_events: CriticalEvent[];
    roads_at_risk: RoadConnectivity[];
    ps_data_sources: PSDataSource[];
  }> {
    return this.fetchWithFallback('/risk/summary', {
      telemetry: fallbackData.system_telemetry as SystemTelemetry,
      metrics: fallbackData.summary_metrics as SummaryMetrics,
      critical_events: fallbackData.critical_events as CriticalEvent[],
      roads_at_risk: fallbackData.roads_connectivity_intelligence as RoadConnectivity[],
      ps_data_sources: fallbackData.ps_data_sources as PSDataSource[]
    });
  }

  static async getSummaryMetrics(): Promise<SummaryMetrics> {
    return this.fetchWithFallback<SummaryMetrics>(
      '/risk/summary',
      fallbackData.summary_metrics as SummaryMetrics
    );
  }

  static async getRiskZones(stateFilter?: string): Promise<RiskZone[]> {
    const zones = await this.fetchWithFallback<RiskZone[]>(
      `/risk/zones${stateFilter && stateFilter !== 'ALL' ? `?state=${stateFilter}` : ''}`,
      fallbackData.risk_zones as RiskZone[]
    );
    if (stateFilter && stateFilter !== 'ALL') {
      return zones.filter(z => z.state.toLowerCase() === stateFilter.toLowerCase());
    }
    return zones;
  }

  static async getCriticalEvents(): Promise<CriticalEvent[]> {
    return this.fetchWithFallback<CriticalEvent[]>(
      '/events/critical',
      fallbackData.critical_events as CriticalEvent[]
    );
  }

  static async getRoadsConnectivity(): Promise<RoadConnectivity[]> {
    return this.fetchWithFallback<RoadConnectivity[]>(
      '/connectivity/roads',
      fallbackData.roads_connectivity_intelligence as RoadConnectivity[]
    );
  }

  static async getHistoricalEvents(): Promise<HistoricalEvent[]> {
    return this.fetchWithFallback<HistoricalEvent[]>(
      '/inventory/historical',
      fallbackData.historical_events as HistoricalEvent[]
    );
  }

  static async getSoilMoistureNetwork(): Promise<{
    network_type: string;
    status: string;
    stations: SoilMoistureStation[];
  }> {
    return this.fetchWithFallback('/soil-moisture', fallbackData.soil_moisture_network as any);
  }

  static async getSoilMoistureStations(): Promise<SoilMoistureStation[]> {
    return this.fetchWithFallback<SoilMoistureStation[]>(
      '/sensors/soil-moisture',
      fallbackData.soil_moisture_network.stations as SoilMoistureStation[]
    );
  }

  static async getSatelliteObservations(): Promise<{
    mission: string;
    status: string;
    observations: SatelliteObservation[];
  }> {
    return this.fetchWithFallback('/satellite-observations', fallbackData.satellite_observations as any);
  }

  static async getMultilingualAlerts(): Promise<MultilingualAlert[]> {
    return this.fetchWithFallback<MultilingualAlert[]>(
      '/alerts/multilingual',
      fallbackData.multilingual_alerts as MultilingualAlert[]
    );
  }

  static async getAlerts(lang: string = 'en'): Promise<MultilingualAlert[]> {
    return this.fetchWithFallback<MultilingualAlert[]>(
      `/alerts?lang=${lang}`,
      fallbackData.multilingual_alerts as MultilingualAlert[]
    );
  }

  static async getTruthLoopData(): Promise<{
    model_status: string;
    disclaimer: string;
    truth_metrics: TruthMetrics;
    evidence_cards: EvidenceCard[];
  }> {
    const data = await this.fetchWithFallback('/truthloop', {
      model_status: fallbackData.truth_loop_data.model_status,
      disclaimer: fallbackData.truth_loop_data.disclaimer,
      truth_metrics: fallbackData.truth_loop_data.truth_metrics as TruthMetrics,
      evidence_cards: fallbackData.truth_loop_data.evidence_cards as EvidenceCard[]
    });

    const localReports = FieldReportService.getStoredReports();
    const localCards = localReports.map(r => FieldReportService.toEvidenceCard(r));
    
    const existingIds = new Set(data.evidence_cards.map(c => c.id));
    const mergedCards = [...data.evidence_cards];
    for (const lc of localCards) {
      if (!existingIds.has(lc.id)) {
        mergedCards.unshift(lc);
        existingIds.add(lc.id);
      }
    }

    return {
      ...data,
      evidence_cards: mergedCards
    };
  }

  static async getForecastTimeline(offsetMinutes: number = 0): Promise<{
    offset_minutes: number;
    time_label: string;
    rainfall_multiplier: number;
    max_landslide_probability: number;
    current_risk_index_pct: number;
    high_risk_zones_count: number;
    rainfall_intensity_mm_hr: number;
    zones: RiskZone[];
  }> {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/forecast/timeline?offset_minutes=${offsetMinutes}`);
        if (res.ok) return await res.json();
      } catch {
        // Fallback
      }
    }

    const multiplier = 1 + (offsetMinutes / 60) * 0.15;
    const baseRisk = fallbackData.summary_metrics.current_risk_index_pct;
    const projectedRisk = Math.min(99, Math.round(baseRisk * multiplier));

    const zones: RiskZone[] = (fallbackData.risk_zones as RiskZone[]).map(z => ({
      ...z,
      rainfall_1h_mm: +(z.rainfall_1h_mm * multiplier).toFixed(1),
      landslide_probability: Math.min(99, Math.round(z.landslide_probability * multiplier)),
      soil_moisture_pct: Math.min(98, +(z.soil_moisture_pct + (offsetMinutes / 60) * 2.5).toFixed(1))
    }));

    return {
      offset_minutes: offsetMinutes,
      time_label: `T+${offsetMinutes}m Forecast Horizon`,
      rainfall_multiplier: +multiplier.toFixed(2),
      max_landslide_probability: Math.max(...zones.map(z => z.landslide_probability)),
      current_risk_index_pct: projectedRisk,
      high_risk_zones_count: zones.filter(z => z.landslide_probability > 75).length,
      rainfall_intensity_mm_hr: +(fallbackData.summary_metrics.current_rainfall_intensity_mm_hr * multiplier).toFixed(1),
      zones
    };
  }

  // OFFLINE QUEUE MANAGEMENT (PHASE 13 INTEGRATION)
  static getQueuedIncidents(): any[] {
    return OfflineSyncService.getQueue();
  }

  static async submitIncident(incident: {
    location_name: string;
    state?: string;
    district?: string;
    lat?: number | null;
    lng?: number | null;
    location_status?: string;
    location_source?: string;
    location_accuracy?: number | null;
    incident_type: string;
    severity?: string;
    road_blocked?: boolean;
    reporter_name?: string | null;
    reporter_role?: string | null;
    source?: FieldReportSource;
    evidence_type?: FieldEvidenceType;
    has_video?: boolean;
    notes?: string;
    captured_at?: string;
  }): Promise<{ incident: EvidenceCard; wasQueuedOffline: boolean; report: FieldReport }> {
    const reportId = `REP-LIVE-${Date.now()}`;
    const cardId = `EVD-LIVE-${Date.now()}`;

    const normalizedReport = FieldReportService.normalizeReport({
      reportId,
      id: cardId,
      lat: incident.lat ?? 27.398,
      lng: incident.lng ?? 88.535,
      locationName: incident.location_name,
      incidentType: incident.incident_type,
      evidenceType: incident.has_video ? 'MULTIMODAL' : 'PHOTO',
      evidenceStatus: 'PENDING',
      source: incident.source || (incident.reporter_role?.includes('OFFICER') ? 'FIELD_OFFICIAL' : 'CITIZEN'),
      synthetic: false,
      reporterName: incident.reporter_name || null,
      reporterRole: incident.reporter_role || null,
      roadBlocked: Boolean(incident.road_blocked),
      description: incident.notes || `Field incident observation submitted for ${incident.location_name}.`
    }, 'FIELD_OFFICIAL');

    FieldReportService.saveReportLocally(normalizedReport);
    const card = FieldReportService.toEvidenceCard(normalizedReport);

    const isDeviceOffline = !OfflineSyncService.isOnline() || this.isOfflineSimulated;

    if (isDeviceOffline) {
      OfflineSyncService.enqueueCreate(incident);
      return { incident: card, wasQueuedOffline: true, report: normalizedReport };
    }

    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/incidents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incident)
        });
        if (res.ok) {
          const json = await res.json();
          // Trigger sync for any previously queued items
          OfflineSyncService.syncPendingQueue().catch(() => {});
          return { incident: json.incident || card, wasQueuedOffline: false, report: normalizedReport };
        }
      } catch {
        OfflineSyncService.enqueueCreate(incident);
        return { incident: card, wasQueuedOffline: true, report: normalizedReport };
      }
    }

    return { incident: card, wasQueuedOffline: false, report: normalizedReport };
  }

  static async updateIncidentStatus(
    reportId: string,
    newStatus: FieldEvidenceStatus,
    reviewerNotes?: string
  ): Promise<FieldReport | null> {
    const updated = FieldReportService.updateReportStatus(reportId, newStatus, reviewerNotes);
    
    // Live-only server update (Strictly prohibited offline to protect server ground-truth)
    if (API_BASE && !this.isOfflineSimulated && OfflineSyncService.isOnline()) {
      try {
        await fetch(`${API_BASE}/incidents/${reportId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, reviewer_notes: reviewerNotes })
        });
      } catch {
        // Fallback
      }
    }

    return updated;
  }

  static async triggerSOP(zoneId: string, actionType: string, authority: string = 'DDMA / SEOC Commander') {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/response/sop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zone_id: zoneId, action_type: actionType, authority })
        });
        if (res.ok) return await res.json();
      } catch {
        // Fallback
      }
    }

    return {
      status: 'DISPATCHED',
      timestamp: new Date().toLocaleTimeString('en-IN') + ' IST',
      zone_id: zoneId,
      action_type: actionType,
      details: {
        title: `Standard Operating Procedure: ${actionType}`,
        authorized_by: authority
      }
    };
  }

  // ==============================================================================
  // EPOCH PHASE 2 - AUTHORITATIVE DAMAGE ASSESSMENT ENGINE METHODS
  // ==============================================================================

  static async getAssessmentScenes(): Promise<BitemporalScenePair[]> {
    const fallbackScenes: BitemporalScenePair[] = [
      {
        eventId: 'sikkim-teesta-flood-2026',
        sceneId: 'sikkim-nh10-dikchu-sector',
        title: 'Sikkim Teesta Valley & NH-10 Corridor Inundation Assessment',
        location: {
          name: 'Dikchu – Singtam Highway Corridor',
          state: 'Sikkim',
          district: 'Pakyong',
          lat: 27.2389,
          lng: 88.6065,
          corridor: 'National Highway 10 (NH-10)'
        },
        beforeImage: '',
        afterImage: '',
        acquisitionDates: {
          before: '2026-08-14 (Pre-Disaster Baseline)',
          after: '2026-09-02 (Post-Debris Inundation)'
        },
        sensor: 'Demonstration High-Resolution Optical RGB Scene',
        resolutionGsd: '0.5m GSD (Synthetic Demonstration Scene)',
        mode: 'DEMO',
        structureCount: 10,
        disclaimer: 'SYNTHETIC DEMONSTRATION DATA'
      }
    ];

    return this.fetchWithFallback<BitemporalScenePair[]>('/assessment/scenes', fallbackScenes);
  }

  static async analyzeScene(payload: {
    eventId?: string;
    sceneId?: string;
    mode?: string;
    beforeImageBase64?: string;
    afterImageBase64?: string;
  }): Promise<AssessmentResult> {
    const sceneId = payload.sceneId || 'sikkim-singtam-dikchu';
    const eventId = payload.eventId || 'sikkim-teesta-flood-2026';

    if (API_BASE && !this.isOfflineSimulated) {
      try {
        const res = await fetch(`${API_BASE}/assessment/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Backend assessment API error, checking cache/fallback:', err);
      }
    }

    // Comprehensive Fallback Datasets per scene
    const singtamStructures: DetectedStructure[] = [
      {
        structureId: 'SK-SNG-BLD-01',
        name: 'Singtam Lower Riverbank Settlement Pier & Depot',
        geometry: { bbox: [545, 265, 55, 38], type: 'Polygon' },
        centerLat: 27.2348,
        centerLng: 88.4980,
        footprintAreaM2: 580.0,
        features: { pixelChange: 0.2662, edgeChange: 0.3146, textureChange: 0.1414, structuralChange: 0.1480, areaChange: 0.2904, builtUpChange: 0.0080, disappearanceEvidence: 0.0, appearanceEvidence: 0.0200 },
        changeScore: 0.2345,
        structuralChangeScore: 0.1480,
        damageClass: 'NO_DAMAGE',
        confidence: 0.9132,
        verificationStatus: 'UNVERIFIED',
        explanation: 'No significant structural change detected (Structural Change: 14.8% < 18%). High baseline correlation (85.2% intact fidelity) with intact roof and boundary geometry.',
        isSyntheticFootprint: true
      },
      {
        structureId: 'SK-SNG-BLD-05',
        name: 'Singtam River Bridge Approach Complex',
        geometry: { bbox: [570, 230, 48, 35], type: 'Polygon' },
        centerLat: 27.2355,
        centerLng: 88.4992,
        footprintAreaM2: 420.0,
        features: { pixelChange: 0.2438, edgeChange: 0.2867, textureChange: 0.2953, structuralChange: 0.2566, areaChange: 0.2653, builtUpChange: 0.1841, disappearanceEvidence: 0.3028, appearanceEvidence: 0.0061 },
        changeScore: 0.2569,
        structuralChangeScore: 0.2566,
        damageClass: 'MINOR_DAMAGE',
        confidence: 0.9534,
        verificationStatus: 'UNVERIFIED',
        explanation: 'Localized/superficial damage detected (Structural Change: 25.7% >= 18%). Core structural geometry intact with 24% localized spectral shift and perimeter debris encroachment.',
        isSyntheticFootprint: true
      },
      {
        structureId: 'SK-SNG-BLD-81',
        name: 'Singtam West Commercial & Residential Block',
        geometry: { bbox: [450, 210, 50, 38], type: 'Polygon' },
        centerLat: 27.2362,
        centerLng: 88.5005,
        footprintAreaM2: 460.0,
        features: { pixelChange: 0.2342, edgeChange: 0.2625, textureChange: 0.1039, structuralChange: 0.1242, areaChange: 0.2484, builtUpChange: 0.0, disappearanceEvidence: 0.0, appearanceEvidence: 0.0 },
        changeScore: 0.2019,
        structuralChangeScore: 0.1242,
        damageClass: 'NO_DAMAGE',
        confidence: 0.9238,
        verificationStatus: 'UNVERIFIED',
        explanation: 'No significant structural change detected (Structural Change: 12.4% < 18%). High baseline correlation (87.6% intact fidelity) with intact roof and boundary geometry.',
        isSyntheticFootprint: true
      },
      {
        structureId: 'SK-SNG-BLD-67',
        name: 'Upper Slope North Residential Facility',
        geometry: { bbox: [535, 175, 42, 32], type: 'Polygon' },
        centerLat: 27.2370,
        centerLng: 88.5018,
        footprintAreaM2: 310.0,
        features: { pixelChange: 0.1042, edgeChange: 0.1852, textureChange: 0.0618, structuralChange: 0.0872, areaChange: 0.1447, builtUpChange: 0.0, disappearanceEvidence: 0.0, appearanceEvidence: 0.0 },
        changeScore: 0.1144,
        structuralChangeScore: 0.0872,
        damageClass: 'NO_DAMAGE',
        confidence: 0.9079,
        verificationStatus: 'UNVERIFIED',
        explanation: 'No significant structural change detected (Structural Change: 8.7% < 18%). High baseline correlation (91.3% intact fidelity) with intact roof and boundary geometry.',
        isSyntheticFootprint: true
      },
      {
        structureId: 'SK-SHG-BLD-10',
        name: 'Highway North Transit & Storage Bunkhouse',
        geometry: { bbox: [615, 150, 42, 35], type: 'Polygon' },
        centerLat: 27.2378,
        centerLng: 88.5030,
        footprintAreaM2: 340.0,
        features: { pixelChange: 0.1983, edgeChange: 0.2819, textureChange: 0.1342, structuralChange: 0.1332, areaChange: 0.2401, builtUpChange: 0.0, disappearanceEvidence: 0.0, appearanceEvidence: 0.0 },
        changeScore: 0.1923,
        structuralChangeScore: 0.1332,
        damageClass: 'NO_DAMAGE',
        confidence: 0.9042,
        verificationStatus: 'UNVERIFIED',
        explanation: 'No significant structural change detected (Structural Change: 13.3% < 18%). High baseline correlation (86.7% intact fidelity) with intact roof and boundary geometry.',
        isSyntheticFootprint: true
      },
      {
        structureId: 'SK-SNG-BLD-00',
        name: 'South Riverbank Agricultural Station',
        geometry: { bbox: [430, 315, 48, 35], type: 'Polygon' },
        centerLat: 27.2385,
        centerLng: 88.5042,
        footprintAreaM2: 280.0,
        features: { pixelChange: 0.1325, edgeChange: 0.2104, textureChange: 0.0812, structuralChange: 0.0971, areaChange: 0.1715, builtUpChange: 0.0, disappearanceEvidence: 0.0, appearanceEvidence: 0.0 },
        changeScore: 0.1357,
        structuralChangeScore: 0.0971,
        damageClass: 'NO_DAMAGE',
        confidence: 0.9063,
        verificationStatus: 'UNVERIFIED',
        explanation: 'No significant structural change detected (Structural Change: 9.7% < 18%). High baseline correlation (90.3% intact fidelity) with intact roof and boundary geometry.',
        isSyntheticFootprint: true
      },
      {
        structureId: 'SK-SNG-BLD-04',
        name: 'Lower River Inundation Zone Facility',
        geometry: { bbox: [500, 325, 48, 38], type: 'Polygon' },
        centerLat: 27.2392,
        centerLng: 88.5055,
        footprintAreaM2: 490.0,
        features: { pixelChange: 0.1754, edgeChange: 0.2815, textureChange: 0.1412, structuralChange: 0.1329, areaChange: 0.2285, builtUpChange: 0.0, disappearanceEvidence: 0.0, appearanceEvidence: 0.0 },
        changeScore: 0.1817,
        structuralChangeScore: 0.1329,
        damageClass: 'NO_DAMAGE',
        confidence: 0.9091,
        verificationStatus: 'UNVERIFIED',
        explanation: 'No significant structural change detected (Structural Change: 13.3% < 18%). High baseline correlation (86.7% intact fidelity) with intact roof and boundary geometry.',
        isSyntheticFootprint: true
      },
      {
        structureId: 'SK-SNG-BLD-02',
        name: 'Central NH-10 Junction Commercial Hub',
        geometry: { bbox: [485, 235, 52, 42], type: 'Polygon' },
        centerLat: 27.2400,
        centerLng: 88.5068,
        footprintAreaM2: 510.0,
        features: { pixelChange: 0.2481, edgeChange: 0.2872, textureChange: 0.1255, structuralChange: 0.1354, areaChange: 0.2677, builtUpChange: 0.0, disappearanceEvidence: 0.0, appearanceEvidence: 0.0 },
        changeScore: 0.2165,
        structuralChangeScore: 0.1354,
        damageClass: 'NO_DAMAGE',
        confidence: 0.8984,
        verificationStatus: 'UNVERIFIED',
        explanation: 'No significant structural change detected (Structural Change: 13.5% < 18%). High baseline correlation (86.5% intact fidelity) with intact roof and boundary geometry.',
        isSyntheticFootprint: true
      },
      {
        structureId: 'SK-SNG-BLD-03',
        name: 'Singtam Clinic & Community Depot',
        geometry: { bbox: [430, 230, 48, 35], type: 'Polygon' },
        centerLat: 27.2408,
        centerLng: 88.5080,
        footprintAreaM2: 360.0,
        features: { pixelChange: 0.1412, edgeChange: 0.2215, textureChange: 0.0914, structuralChange: 0.1031, areaChange: 0.1814, builtUpChange: 0.0, disappearanceEvidence: 0.0, appearanceEvidence: 0.0 },
        changeScore: 0.1439,
        structuralChangeScore: 0.1031,
        damageClass: 'NO_DAMAGE',
        confidence: 0.9126,
        verificationStatus: 'UNVERIFIED',
        explanation: 'No significant structural change detected (Structural Change: 10.3% < 18%). High baseline correlation (89.7% intact fidelity) with intact roof and boundary geometry.',
        isSyntheticFootprint: true
      },
      {
        structureId: 'SK-SNG-BLD-08',
        name: 'Upper Terrace Residential Cabin',
        geometry: { bbox: [475, 155, 42, 32], type: 'Polygon' },
        centerLat: 27.2415,
        centerLng: 88.5092,
        footprintAreaM2: 290.0,
        features: { pixelChange: 0.2114, edgeChange: 0.2815, textureChange: 0.2141, structuralChange: 0.1985, areaChange: 0.2465, builtUpChange: 0.1250, disappearanceEvidence: 0.2100, appearanceEvidence: 0.0 },
        changeScore: 0.2209,
        structuralChangeScore: 0.1985,
        damageClass: 'MINOR_DAMAGE',
        confidence: 0.9152,
        verificationStatus: 'UNVERIFIED',
        explanation: 'Localized/superficial damage detected (Structural Change: 19.9% >= 18%). Core structural geometry intact with 21% localized spectral shift and perimeter debris encroachment.',
        isSyntheticFootprint: true
      }
    ];

    const isSingtam = sceneId.includes('singtam') || sceneId.includes('scene-03') || sceneId.includes('scene_03');
    const isChungthang = sceneId.includes('chungthang') || sceneId.includes('scene-02') || sceneId.includes('scene_02');

    const structuresToUse = isSingtam ? singtamStructures : (isChungthang ? singtamStructures.map((s, idx) => ({
      ...s,
      structureId: `SK-CTG-BLD-${(idx + 1).toString().padStart(2, '0')}`,
      damageClass: idx < 2 ? 'MINOR_DAMAGE' : 'NO_DAMAGE' as DamageClass
    })) : singtamStructures.map((s, idx) => ({
      ...s,
      structureId: `SK-DKC-BLD-${(idx + 1).toString().padStart(2, '0')}`,
      damageClass: idx < 3 ? 'MINOR_DAMAGE' : 'NO_DAMAGE' as DamageClass
    })));

    const minorCount = structuresToUse.filter(s => s.damageClass === 'MINOR_DAMAGE').length;
    const majorCount = structuresToUse.filter(s => s.damageClass === 'MAJOR_DAMAGE').length;
    const destroyedCount = structuresToUse.filter(s => s.damageClass === 'DESTROYED').length;
    const noDamageCount = structuresToUse.filter(s => s.damageClass === 'NO_DAMAGE').length;

    // Direct fetch fallback if API fails
    return this.fetchWithFallback<AssessmentResult>(`/assessment/result?sceneId=${sceneId}`, {
      eventId,
      sceneId,
      mode: 'DEMO',
      sceneMetadata: {
        title: isSingtam
          ? 'Singtam-Dikchu River Island & NH-10 Arterial Corridor Damage Assessment'
          : (isChungthang
            ? 'Chungthang Basin Teesta Stage-III Hydroelectric Corridor Damage Assessment'
            : 'Sikkim Teesta Valley & NH-10 Corridor Inundation Assessment'),
        location: {
          name: isSingtam ? 'Singtam – Dikchu River Island' : (isChungthang ? 'Chungthang Basin' : 'Dikchu – Singtam Highway Corridor'),
          state: 'Sikkim',
          district: isSingtam ? 'Pakyong / Gangtok' : (isChungthang ? 'Mangan' : 'Pakyong'),
          lat: isSingtam ? 27.2348 : (isChungthang ? 27.5981 : 27.2389),
          lng: isSingtam ? 88.4980 : (isChungthang ? 88.6506 : 88.6065),
          corridor: 'National Highway 10 (NH-10)'
        },
        sensor: 'Sentinel-2 MSI (10m L2A BOA Reflectance)',
        resolution: '10m GSD (Copernicus Sentinel-2)',
        acquisitionDates: {
          before: '2026-08-28 (Pre-Disaster Baseline)',
          after: '2026-09-03 (Post-GLOF Inundation)'
        },
        disclaimer: `SYNTHETIC DEMONSTRATION DATA (${isSingtam ? 'Singtam-Dikchu' : (isChungthang ? 'Chungthang' : 'Dikchu Corridor')})`,
        thresholdConfig: 'INITIAL DEMONSTRATION THRESHOLDS'
      },
      changeDetection: {
        changeScore: isSingtam ? 0.2346 : 0.3125,
        changedAreaM2: isSingtam ? 137509.2 : 18450.0,
        changePercentage: isSingtam ? 15.92 : 14.7,
        noiseFiltered: true,
        hotspotCount: 2,
        disclaimer: 'Deterministic optical difference analysis. Environmental terrain shifts filtered separately.'
      },
      structures: structuresToUse,
      statistics: {
        totalStructures: structuresToUse.length,
        destroyedCount,
        majorDamageCount: majorCount,
        minorDamageCount: minorCount,
        noDamageCount,
        destroyedPercentage: 0.0,
        majorDamagePercentage: 0.0,
        minorDamagePercentage: (minorCount / structuresToUse.length) * 100,
        noDamagePercentage: (noDamageCount / structuresToUse.length) * 100,
        averageConfidence: 0.9145,
        verifiedCount: 0,
        unverifiedCount: structuresToUse.length,
        needsReviewCount: 0,
        totalFootprintAreaM2: 4040.0,
        damagedFootprintAreaM2: 710.0
      },
      damageMapData: [],
      processingMetadata: {
        engine: 'SatGuard Deterministic Damage Assessment Engine v2.0',
        version: '2.0.0-DEMO',
        processingLatencyMs: 42,
        timestamp: new Date().toISOString(),
        alignmentMethod: 'ORB_HOMOGRAPHY_WITH_RIGID_FALLBACK',
        registrationLabel: 'Approximate Optical Feature Registration',
        thresholdStatus: 'INITIAL DEMONSTRATION THRESHOLDS'
      }
    });
  }

  static async getSceneResult(sceneId: string = 'sikkim-nh10-dikchu-sector'): Promise<AssessmentResult> {
    return this.analyzeScene({ sceneId, mode: 'DEMO' });
  }

  static async verifyStructure(request: VerificationActionRequest): Promise<AssessmentResult> {
    if (API_BASE && !this.isOfflineSimulated) {
      try {
        const res = await fetch(`${API_BASE}/assessment/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request)
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Backend verification API error:', err);
      }
    }

    // Return fresh state
    return this.getSceneResult(request.sceneId);
  }

  static getExportUrl(sceneId: string = 'sikkim-nh10-dikchu-sector', format: string = 'json'): string {
    return `${API_BASE || 'http://localhost:8000/api/v1'}/assessment/export?sceneId=${sceneId}&exportFormat=${format}`;
  }

  // ============================================================
  // PHASE 3: RISK INTELLIGENCE & EVENT HISTORY CLIENT METHODS
  // ============================================================

  static async getSikkimDemoRisk(): Promise<RiskAssessmentResult> {
    const fallback: RiskAssessmentResult = {
      zoneId: 'sikkim-teesta-zone-01',
      zoneName: 'Dikchu - Singtam NH-10 Corridor',
      state: 'Sikkim',
      district: 'Pakyong / East Sikkim',
      overallRiskScore: 84.7,
      riskLevel: 'CRITICAL',
      primaryFactor: 'Precipitation & Intensity',
      secondaryFactor: 'Geometrical Slope Angle',
      factorContributions: [
        {
          factor: 'Precipitation & Intensity',
          category: 'METEOROLOGICAL',
          rawValue: '1h: 22.4 mm/hr | 72h: 142.6 mm',
          normalizedScore: 84.87,
          configuredWeight: 0.38,
          effectiveWeight: 0.38,
          contributionPoints: 32.25,
          source: 'IMD Automated Weather Station (AWS-NH10) (SYNTHETIC DEMONSTRATION INPUT)',
          isAvailable: true,
          status: 'AVAILABLE',
          explanation: 'Antecedent 72h precipitation accumulation (142.6 mm) elevated pore-water pressures.'
        },
        {
          factor: 'Geometrical Slope Angle',
          category: 'GEOMORPHOLOGICAL',
          rawValue: '38.5° (Steep)',
          normalizedScore: 85.56,
          configuredWeight: 0.29,
          effectiveWeight: 0.29,
          contributionPoints: 24.81,
          source: 'SRTM 30m Digital Elevation Model (SYNTHETIC DEMONSTRATION INPUT)',
          isAvailable: true,
          status: 'AVAILABLE',
          explanation: 'Steep 38.5° valley walls flank NH-10 road formation.'
        },
        {
          factor: 'Volumetric Soil Moisture',
          category: 'HYDROLOGICAL',
          rawValue: '84.2% Saturation (Over-Saturated)',
          normalizedScore: 84.2,
          configuredWeight: 0.18,
          effectiveWeight: 0.18,
          contributionPoints: 15.16,
          source: 'ISRO / SAC InSAR Soil Saturation Mesh (SYNTHETIC DEMONSTRATION INPUT)',
          isAvailable: true,
          status: 'AVAILABLE',
          explanation: 'Subsurface topsoil over-saturation causing shear strength degradation.'
        },
        {
          factor: 'Historical Landslide Frequency',
          category: 'HISTORICAL',
          rawValue: '6 Events in past 5 Years',
          normalizedScore: 75.0,
          configuredWeight: 0.09,
          effectiveWeight: 0.09,
          contributionPoints: 6.75,
          source: 'Geological Survey of India National Landslide Database (SYNTHETIC DEMONSTRATION INPUT)',
          isAvailable: true,
          status: 'AVAILABLE',
          explanation: '6 recorded historical slope reactivations in this sector.'
        },
        {
          factor: 'Bedrock Lithology & Structure',
          category: 'GEOTECHNICAL',
          rawValue: 'Daling Group Weathered Phyllite and Colluvial Debris',
          normalizedScore: 95.0,
          configuredWeight: 0.06,
          effectiveWeight: 0.06,
          contributionPoints: 5.7,
          source: 'GSI Quadrangle Map 1:50k (SYNTHETIC DEMONSTRATION INPUT)',
          isAvailable: true,
          status: 'AVAILABLE',
          explanation: 'Highly weathered sheared phyllite matrix prone to rapid liquefaction.'
        }
      ],
      observedDamageContext: {
        totalStructures: 10,
        destroyedCount: 0,
        majorDamageCount: 3,
        minorDamageCount: 1,
        noDamageCount: 6,
        changeScore: 0.428,
        damagedFootprintAreaM2: 2190.0,
        damagedStructureDensityPct: 40.0,
        verifiedCount: 0,
        unverifiedCount: 10,
        provenance: 'IMAGE-DERIVED / OBSERVED',
        isSyntheticFootprints: true
      },
      exposureScore: 78.5,
      responsePriority: 'IMMEDIATE_DISPATCH',
      priorityAreas: [
        'NH-10 Highway Viaduct KM 42+200 (Pier 4)',
        'Singtam Intake Generating Station (Teesta Stage V)',
        'Dikchu Secondary School Low-Lying Compound',
        'Pakyong 33kV Substation Supply Line'
      ],
      missingFactorsHandled: [],
      disclaimer: 'Risk scores are calculated by a deterministic, interpretable multi-factor decision-support engine. Observed damage is analytically separate from geotechnical vulnerability risk.',
      isSynthetic: true,
      timestamp: new Date().toISOString()
    };

    return this.fetchWithFallback<RiskAssessmentResult>('/risk/sikkim-demo', fallback);
  }

  static async evaluateRisk(request: any): Promise<RiskAssessmentResult> {
    if (API_BASE && !this.isOfflineSimulated) {
      try {
        const res = await fetch(`${API_BASE}/risk/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request)
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Risk evaluate API error:', err);
      }
    }
    return this.getSikkimDemoRisk();
  }

  private static readonly STORAGE_KEY_HISTORY = 'satguard_historical_events_v2';

  private static getDefaultHistoricalEvents(): HistoricalEventRecord[] {
    return [
      {
        eventId: 'EVT-2026-09-03-SK03',
        eventName: 'Sikkim Singtam-Dikchu Basin Flood & Debris Inundation',
        location: 'Singtam–Dikchu Riverfront Corridor (NH-10)',
        state: 'Sikkim',
        district: 'Pakyong / East Sikkim',
        disasterType: 'FLASH_FLOOD_DEBRIS_FLOW',
        eventDate: '2026-09-03',
        imagery: {
          beforeImageRef: '/assets/satellite/scene_03_pre.jpg?v=4',
          afterImageRef: '/assets/satellite/scene_03_post.jpg?v=5',
          sensor: 'Sentinel-2 MSI (10m L2A)',
          acquisitionDates: '28 Aug 2026 (Pre) / 03 Sept 2026 (Post)',
          resolution: '10m GSD (Copernicus Sentinel-2)'
        },
        assessment: {
          totalStructures: 10,
          destroyedCount: 0,
          majorDamageCount: 3,
          minorDamageCount: 1,
          noDamageCount: 6,
          destroyedPercentage: 0.0,
          majorDamagePercentage: 30.0,
          minorDamagePercentage: 10.0,
          noDamagePercentage: 60.0,
          averageConfidence: 0.922,
          changeScore: 0.428,
          changedAreaM2: 89400.0,
          changePercentage: 26.4,
          damagedFootprintAreaM2: 2190.0
        },
        verification: {
          verifiedCount: 4,
          unverifiedCount: 6,
          needsReviewCount: 0,
          rejectedCount: 0,
          verificationProgressPct: 40.0,
          lastVerifiedAt: '2026-09-04T10:15:00Z'
        },
        riskAssessment: {
          overallRiskScore: 81.4,
          riskLevel: 'CRITICAL',
          primaryFactor: 'Precipitation & Intensity',
          secondaryFactor: 'Geometrical Slope Angle',
          factorContributions: [
            {
              factor: 'Precipitation & Intensity',
              category: 'METEOROLOGICAL',
              rawValue: '1h: 22.4 mm/hr | 72h: 142.6 mm',
              normalizedScore: 84.87,
              configuredWeight: 0.38,
              effectiveWeight: 0.38,
              contributionPoints: 32.25,
              source: 'IMD Automated Weather Station (AWS-NH10)',
              isAvailable: true,
              status: 'AVAILABLE',
              explanation: 'Antecedent 72h precipitation accumulation (142.6 mm) elevated pore-water pressures.'
            },
            {
              factor: 'Geometrical Slope Angle',
              category: 'GEOMORPHOLOGICAL',
              rawValue: '38.5° (Steep Valley Flank)',
              normalizedScore: 85.56,
              configuredWeight: 0.29,
              effectiveWeight: 0.29,
              contributionPoints: 24.81,
              source: 'SRTM 30m Digital Elevation Model',
              isAvailable: true,
              status: 'AVAILABLE',
              explanation: 'Steep 38.5° valley walls flank NH-10 road formation.'
            },
            {
              factor: 'Volumetric Soil Moisture',
              category: 'HYDROLOGICAL',
              rawValue: '84.2% Saturation (Over-Saturated)',
              normalizedScore: 84.2,
              configuredWeight: 0.18,
              effectiveWeight: 0.18,
              contributionPoints: 15.16,
              source: 'ISRO / SAC InSAR Soil Saturation Mesh',
              isAvailable: true,
              status: 'AVAILABLE',
              explanation: 'Subsurface topsoil over-saturation causing shear strength degradation.'
            },
            {
              factor: 'Historical Landslide Frequency',
              category: 'HISTORICAL',
              rawValue: '6 Events in past 5 Years',
              normalizedScore: 75.0,
              configuredWeight: 0.09,
              effectiveWeight: 0.09,
              contributionPoints: 6.75,
              source: 'Geological Survey of India Landslide DB',
              isAvailable: true,
              status: 'AVAILABLE',
              explanation: '6 recorded historical slope reactivations in this sector.'
            },
            {
              factor: 'Bedrock Lithology & Structure',
              category: 'GEOTECHNICAL',
              rawValue: 'Daling Group Weathered Phyllite',
              normalizedScore: 95.0,
              configuredWeight: 0.06,
              effectiveWeight: 0.06,
              contributionPoints: 5.7,
              source: 'GSI Quadrangle Map 1:50k',
              isAvailable: true,
              status: 'AVAILABLE',
              explanation: 'Highly weathered sheared phyllite matrix prone to rapid liquefaction.'
            }
          ]
        },
        metadata: {
          engine: 'SatGuard Unified Disaster Assessment Engine',
          version: '2.0.0-PROTOTYPE',
          mode: 'DEMO',
          recordedAt: '2026-09-03T18:30:00Z',
          recordedBy: 'Automatic Pipeline Operator',
          notes: 'Authoritative benchmark assessment for Singtam-Dikchu river corridor.'
        },
        tags: ['SIKKIM', 'NH-10', 'SINGTAM', 'FLASH_FLOOD', 'BENCHMARK']
      },
      {
        eventId: 'EVT-2026-09-03-SK02',
        eventName: 'Sikkim Chungthang Teesta-III Dam GLOF & Flash Surge',
        location: 'Chungthang Basin & Hydro Project Sector',
        state: 'Sikkim',
        district: 'Mangan / North Sikkim',
        disasterType: 'GLOF_FLASH_SURGE',
        eventDate: '2026-09-03',
        imagery: {
          beforeImageRef: '/assets/satellite/scene_02_pre.jpg?v=4',
          afterImageRef: '/assets/satellite/scene_02_post.jpg?v=4',
          sensor: 'Sentinel-2 MSI (10m L2A)',
          acquisitionDates: '28 Aug 2026 (Pre) / 03 Sept 2026 (Post)',
          resolution: '10m GSD (Copernicus Sentinel-2)'
        },
        assessment: {
          totalStructures: 14,
          destroyedCount: 4,
          majorDamageCount: 5,
          minorDamageCount: 2,
          noDamageCount: 3,
          destroyedPercentage: 28.6,
          majorDamagePercentage: 35.7,
          minorDamagePercentage: 14.3,
          noDamagePercentage: 21.4,
          averageConfidence: 0.941,
          changeScore: 0.684,
          changedAreaM2: 142000.0,
          changePercentage: 41.2,
          damagedFootprintAreaM2: 5820.0
        },
        verification: {
          verifiedCount: 11,
          unverifiedCount: 3,
          needsReviewCount: 0,
          rejectedCount: 0,
          verificationProgressPct: 78.6,
          lastVerifiedAt: '2026-09-04T12:00:00Z'
        },
        riskAssessment: {
          overallRiskScore: 92.8,
          riskLevel: 'CRITICAL',
          primaryFactor: 'South Lhonak Moraine Dam Outburst',
          secondaryFactor: 'Flash Surge Runoff Velocity',
          factorContributions: [
            {
              factor: 'Glacial Lake Outburst Surge',
              category: 'HYDROLOGICAL',
              rawValue: 'Peak Discharge > 3,800 m³/s',
              normalizedScore: 96.5,
              configuredWeight: 0.45,
              effectiveWeight: 0.45,
              contributionPoints: 43.43,
              source: 'CWC Telemetry Gauge Station',
              isAvailable: true,
              status: 'AVAILABLE',
              explanation: 'South Lhonak lake moraine breach created catastrophic downstream water wall.'
            },
            {
              factor: 'Downstream Inundation Extent',
              category: 'METEOROLOGICAL',
              rawValue: 'Water Level +8.4m above Datum',
              normalizedScore: 91.0,
              configuredWeight: 0.35,
              effectiveWeight: 0.35,
              contributionPoints: 31.85,
              source: 'Sentinel-1 SAR Flood Inundation Mesh',
              isAvailable: true,
              status: 'AVAILABLE',
              explanation: 'Severe river overtopping sweeping through Chungthang lowlands.'
            }
          ]
        },
        metadata: {
          engine: 'SatGuard Unified Disaster Assessment Engine',
          version: '2.0.0-PROTOTYPE',
          mode: 'DEMO',
          recordedAt: '2026-09-03T19:15:00Z',
          recordedBy: 'Automatic Pipeline Operator',
          notes: 'High-severity GLOF event affecting Teesta Stage III powerhouse and barrages.'
        },
        tags: ['SIKKIM', 'CHUNGTHANG', 'GLOF', 'CRITICAL_INFRASTRUCTURE']
      },
      {
        eventId: 'EVT-2026-08-14-SK01',
        eventName: 'Sikkim NH-10 Dikchu Landslide & Highway Pier Breach',
        location: 'NH-10 Dikchu River Highway Corridor KM 42',
        state: 'Sikkim',
        district: 'East Sikkim',
        disasterType: 'LANDSLIDE',
        eventDate: '2026-08-14',
        imagery: {
          beforeImageRef: '/assets/satellite/scene_01_predisaster.jpg?v=4',
          afterImageRef: '/assets/satellite/scene_02_postdisaster.jpg?v=4',
          sensor: 'Sentinel-2 MSI (10m L2A)',
          acquisitionDates: '14 Aug 2026 (Pre) / 02 Sept 2026 (Post)',
          resolution: '10m GSD (Copernicus Sentinel-2)'
        },
        assessment: {
          totalStructures: 8,
          destroyedCount: 2,
          majorDamageCount: 2,
          minorDamageCount: 1,
          noDamageCount: 3,
          destroyedPercentage: 25.0,
          majorDamagePercentage: 25.0,
          minorDamagePercentage: 12.5,
          noDamagePercentage: 37.5,
          averageConfidence: 0.915,
          changeScore: 0.512,
          changedAreaM2: 74500.0,
          changePercentage: 22.8,
          damagedFootprintAreaM2: 1840.0
        },
        verification: {
          verifiedCount: 8,
          unverifiedCount: 0,
          needsReviewCount: 0,
          rejectedCount: 0,
          verificationProgressPct: 100.0,
          lastVerifiedAt: '2026-08-16T14:30:00Z'
        },
        riskAssessment: {
          overallRiskScore: 76.5,
          riskLevel: 'HIGH',
          primaryFactor: 'Geometrical Slope Angle',
          secondaryFactor: 'Bedrock Weathering Matrix',
          factorContributions: [
            {
              factor: 'Geometrical Slope Angle',
              category: 'GEOMORPHOLOGICAL',
              rawValue: '41.2° Slope Scarp',
              normalizedScore: 88.0,
              configuredWeight: 0.40,
              effectiveWeight: 0.40,
              contributionPoints: 35.2,
              source: 'SRTM 30m DEM',
              isAvailable: true,
              status: 'AVAILABLE',
              explanation: 'Oversteepened road cut slope failure along NH-10.'
            }
          ]
        },
        metadata: {
          engine: 'SatGuard Unified Disaster Assessment Engine',
          version: '2.0.0-PROTOTYPE',
          mode: 'DEMO',
          recordedAt: '2026-08-15T09:00:00Z',
          recordedBy: 'Field Assessment Unit #4',
          notes: 'Complete verification achieved by BRO engineers.'
        },
        tags: ['SIKKIM', 'DIKCHU', 'NH-10', 'LANDSLIDE', 'ROAD_CORRIDOR']
      },
      {
        eventId: 'EVT-2024-07-30-KL01',
        eventName: 'Wayanad Chooralmala & Meppadi Multi-Tier Landslide',
        location: 'Chooralmala–Mundakkai Valley Corridor',
        state: 'Kerala',
        district: 'Wayanad',
        disasterType: 'LANDSLIDE',
        eventDate: '2024-07-30',
        imagery: {
          beforeImageRef: '/assets/satellite/scene_03_pre.jpg?v=4',
          afterImageRef: '/assets/satellite/scene_03_post.jpg?v=5',
          sensor: 'RISAT-1A / Sentinel-2 MSI',
          acquisitionDates: '24 Jul 2024 (Pre) / 31 Jul 2024 (Post)',
          resolution: '10m Optical / 3m SAR'
        },
        assessment: {
          totalStructures: 312,
          destroyedCount: 148,
          majorDamageCount: 76,
          minorDamageCount: 34,
          noDamageCount: 54,
          destroyedPercentage: 47.4,
          majorDamagePercentage: 24.4,
          minorDamagePercentage: 10.9,
          noDamagePercentage: 17.3,
          averageConfidence: 0.942,
          changeScore: 0.784,
          changedAreaM2: 420000.0,
          changePercentage: 48.2,
          damagedFootprintAreaM2: 34500.0
        },
        verification: {
          verifiedCount: 285,
          unverifiedCount: 27,
          needsReviewCount: 0,
          rejectedCount: 0,
          verificationProgressPct: 91.3,
          lastVerifiedAt: '2024-08-04T12:00:00Z'
        },
        riskAssessment: {
          overallRiskScore: 94.6,
          riskLevel: 'CRITICAL',
          primaryFactor: 'Extreme Monsoonal Precipitation',
          secondaryFactor: 'Colluvial Soil Overburden Saturation',
          factorContributions: []
        },
        metadata: {
          engine: 'SatGuard Disaster Assessment Catalog',
          version: '1.8.0',
          mode: 'REAL',
          recordedAt: '2024-08-05T08:30:00Z',
          recordedBy: 'NDRF Operational Center',
          notes: 'Catastrophic rainfall-triggered debris slide resulting in severe settlement damage.'
        },
        tags: ['KERALA', 'WAYANAD', 'CHOORALMALA', 'LANDSLIDE', 'HISTORICAL_BENCHMARK']
      },
      {
        eventId: 'EVT-2023-01-05-UK01',
        eventName: 'Joshimath Urban Slope Subsidence & Fissure Creep',
        location: 'Joshimath Town Sector (NH-07)',
        state: 'Uttarakhand',
        district: 'Chamoli',
        disasterType: 'SLOPE_COLLAPSE',
        eventDate: '2023-01-05',
        imagery: {
          beforeImageRef: '/assets/satellite/scene_02_pre.jpg?v=4',
          afterImageRef: '/assets/satellite/scene_02_post.jpg?v=4',
          sensor: 'Sentinel-1 InSAR / Cartosat-2',
          acquisitionDates: 'Dec 2022 / Jan 2023',
          resolution: 'Differential Interferometric PS-InSAR'
        },
        assessment: {
          totalStructures: 868,
          destroyedCount: 0,
          majorDamageCount: 181,
          minorDamageCount: 687,
          noDamageCount: 0,
          destroyedPercentage: 0.0,
          majorDamagePercentage: 20.9,
          minorDamagePercentage: 79.1,
          noDamagePercentage: 0.0,
          averageConfidence: 0.887,
          changeScore: 0.345,
          changedAreaM2: 185000.0,
          changePercentage: 18.5,
          damagedFootprintAreaM2: 52400.0
        },
        verification: {
          verifiedCount: 868,
          unverifiedCount: 0,
          needsReviewCount: 0,
          rejectedCount: 0,
          verificationProgressPct: 100.0,
          lastVerifiedAt: '2023-01-20T18:00:00Z'
        },
        riskAssessment: {
          overallRiskScore: 78.2,
          riskLevel: 'CRITICAL',
          primaryFactor: 'Geometrical Slope Angle',
          secondaryFactor: 'Bedrock Lithology & Structure',
          factorContributions: []
        },
        metadata: {
          engine: 'SatGuard Disaster Assessment Catalog',
          version: '1.5.0',
          mode: 'REAL',
          recordedAt: '2023-01-22T10:00:00Z',
          recordedBy: 'SDMA Uttarakhand Archive',
          notes: 'Reactivated morainic colluvium creep with structural foundation shear.'
        },
        tags: ['UTTARAKHAND', 'JOSHIMATH', 'SUBSIDENCE', 'HISTORICAL_BENCHMARK']
      }
    ];
  }

  private static getLocalStoredEvents(): HistoricalEventRecord[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_HISTORY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Local storage unreadable or unavailable
    }
    return [];
  }

  private static setLocalStoredEvents(events: HistoricalEventRecord[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(events));
    } catch {
      // Ignore local storage error
    }
  }

  static async getHistoricalEventRecords(state?: string): Promise<HistoricalEventRecord[]> {
    const defaultEvents = this.getDefaultHistoricalEvents();
    const localEvents = this.getLocalStoredEvents();

    // Merge local custom events with default baseline events (local first, no duplicates)
    const localIds = new Set(localEvents.map(e => e.eventId));
    const mergedFallback = [
      ...localEvents,
      ...defaultEvents.filter(e => !localIds.has(e.eventId))
    ];

    const endpoint = state && state.toUpperCase() !== 'ALL' ? `/history?state=${encodeURIComponent(state)}` : '/history';
    let records = await this.fetchWithFallback<HistoricalEventRecord[]>(endpoint, mergedFallback);

    if (!records || records.length === 0) {
      records = mergedFallback;
    }

    if (state && state.toUpperCase() !== 'ALL') {
      records = records.filter(r => r.state.toLowerCase() === state.toLowerCase());
    }

    return records;
  }

  static async getHistoricalEventRecord(eventId: string): Promise<HistoricalEventRecord | null> {
    const all = await this.getHistoricalEventRecords();
    const match = all.find(e => e.eventId === eventId) || null;
    return this.fetchWithFallback<HistoricalEventRecord | null>(`/history/${eventId}`, match);
  }

  static async saveHistoricalEventRecord(record: HistoricalEventRecord): Promise<HistoricalEventRecord> {
    const currentLocal = this.getLocalStoredEvents();
    const updated = [record, ...currentLocal.filter(e => e.eventId !== record.eventId)];
    this.setLocalStoredEvents(updated);

    if (API_BASE && !this.isOfflineSimulated) {
      try {
        const res = await fetch(`${API_BASE}/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Save history API error:', err);
      }
    }
    return record;
  }

  static async deleteHistoricalEventRecord(eventId: string): Promise<boolean> {
    const currentLocal = this.getLocalStoredEvents();
    const updated = currentLocal.filter(e => e.eventId !== eventId);
    this.setLocalStoredEvents(updated);

    if (API_BASE && !this.isOfflineSimulated) {
      try {
        const res = await fetch(`${API_BASE}/history/${eventId}`, {
          method: 'DELETE'
        });
        return res.ok;
      } catch (err) {
        console.warn('Delete history API error:', err);
      }
    }
    return true;
  }

  static async reopenHistoricalEventRecord(eventId: string): Promise<any> {
    if (API_BASE && !this.isOfflineSimulated) {
      try {
        const res = await fetch(`${API_BASE}/history/${eventId}/reopen`, {
          method: 'POST'
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Reopen history API error:', err);
      }
    }
    return { status: 'REOPENED', eventId };
  }
}

