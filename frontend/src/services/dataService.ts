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
  Phase10TruthMetrics
} from '../types';
import { FieldReportService } from './fieldReportService';
import { OfflineSyncService } from './offlineSyncService';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();

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
}
