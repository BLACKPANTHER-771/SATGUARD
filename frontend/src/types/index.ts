export type ViewType = 
  | 'command_center'
  | 'damage_assessment'
  | 'change_detection'
  | 'truth_loop'
  | 'field_mode'
  | 'risk_intelligence'
  | 'map_3d'
  | 'forecast'
  | 'incidents'
  | 'infrastructure'
  | 'response_sop'
  | 'data_sources'
  | 'soil_moisture'
  | 'satellite_view'
  | 'historical_view'
  | 'alert_center'
  | 'pipeline_view';

// ==============================================================================
// EPOCH PHASE 2 - DAMAGE ASSESSMENT ENGINE TYPES
// ==============================================================================

export type DamageClass = 'DESTROYED' | 'MAJOR_DAMAGE' | 'MINOR_DAMAGE' | 'NO_DAMAGE';
export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'REJECTED' | 'NEEDS_REVIEW';
export type AssessmentMode = 'DEMO' | 'UPLOADED';
export type ProcessingStage = 
  | 'READY'
  | 'LOADING_IMAGERY'
  | 'VALIDATING'
  | 'ALIGNING'
  | 'DETECTING_CHANGE'
  | 'ANALYSING_STRUCTURES'
  | 'EXTRACTING_FEATURES'
  | 'CLASSIFYING'
  | 'CALCULATING_CONFIDENCE'
  | 'COMPLETE'
  | 'PROCESSING_ERROR';

export interface DamageFeatures {
  pixelChange: number;
  edgeChange: number;
  textureChange: number;
  structuralChange: number;
  areaChange: number;
  builtUpChange: number;
  disappearanceEvidence: number;
  appearanceEvidence: number;
}

export interface DamageMapItem {
  structureId: string;
  geometry: { bbox?: number[]; type?: string; coordinates?: any };
  damageClass: DamageClass;
  confidence: number;
}

export type HeightDataSource = 'ACTUAL_MEASURED' | 'DEM_DERIVED' | 'SYNTHETIC_DEMO';

export interface DetectedStructure {
  structureId: string;
  name: string;
  geometry: { bbox: number[]; type: string };
  centerLat: number;
  centerLng: number;
  footprintAreaM2: number;
  estimatedHeightM?: number;
  heightSource?: HeightDataSource;
  beforeEvidence?: string;
  afterEvidence?: string;
  features: DamageFeatures;
  changeScore: number;
  structuralChangeScore: number;
  damageClass: DamageClass;
  confidence: number;
  verificationStatus: VerificationStatus;
  explanation: string;
  isSyntheticFootprint: boolean;
  assessorNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

// Phase 4 Spatial Risk Layer Contract
export interface RiskSpatialLayer {
  layerId: string;
  factorName: string;
  category: 'METEOROLOGICAL' | 'GEOMORPHOLOGICAL' | 'HYDROLOGICAL' | 'HISTORICAL' | 'GEOTECHNICAL';
  geometryType: 'Polygon' | 'MultiPolygon' | 'LineString' | 'Point';
  coordinates: any;
  value: string | number;
  normalizedScore: number;
  source: string;
  timestamp: string;
  confidence: number;
  threatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface RiskSpatialDataset {
  zoneId: string;
  layers: RiskSpatialLayer[];
  metadata: {
    crs: string;
    datum: string;
    generatedAt: string;
    disclaimer: string;
  };
}

export interface AssessmentStatistics {
  totalStructures: number;
  destroyedCount: number;
  majorDamageCount: number;
  minorDamageCount: number;
  noDamageCount: number;
  destroyedPercentage: number;
  majorDamagePercentage: number;
  minorDamagePercentage: number;
  noDamagePercentage: number;
  averageConfidence: number;
  verifiedCount: number;
  unverifiedCount: number;
  needsReviewCount: number;
  totalFootprintAreaM2: number;
  damagedFootprintAreaM2: number;
}

export interface ChangeDetectionSummary {
  changeScore: number;
  changedAreaM2: number;
  changePercentage: number;
  noiseFiltered: boolean;
  changeMaskBase64?: string;
  hotspotCount: number;
  disclaimer: string;
}

export interface AssessmentResult {
  eventId: string;
  sceneId: string;
  mode: AssessmentMode;
  sceneMetadata: {
    title: string;
    location: {
      name: string;
      state: string;
      district: string;
      lat: number;
      lng: number;
      corridor?: string;
    };
    sensor: string;
    resolution: string;
    acquisitionDates: { before: string; after: string };
    disclaimer: string;
    thresholdConfig: string;
  };
  changeDetection: ChangeDetectionSummary;
  structures: DetectedStructure[];
  statistics: AssessmentStatistics;
  damageMapData: DamageMapItem[];
  processingMetadata: {
    engine: string;
    version: string;
    processingLatencyMs: number;
    timestamp: string;
    alignmentMethod: string;
    registrationLabel: string;
    thresholdStatus?: string;
  };
}

// ============================================================
// PHASE 3: RISK INTELLIGENCE & EVENT HISTORY TYPES
// ============================================================

export interface RiskFactorContribution {
  factor: string;
  category: string;
  rawValue: string;
  normalizedScore: number | null;
  configuredWeight: number;
  effectiveWeight: number;
  contributionPoints: number;
  source: string;
  isAvailable: boolean;
  status: 'AVAILABLE' | 'DATA_UNAVAILABLE' | 'SYNTHETIC';
  explanation: string;
}

export interface ObservedDamageContext {
  totalStructures: number;
  destroyedCount: number;
  majorDamageCount: number;
  minorDamageCount: number;
  noDamageCount: number;
  changeScore: number;
  damagedFootprintAreaM2: number;
  damagedStructureDensityPct: number;
  verifiedCount: number;
  unverifiedCount: number;
  provenance: string;
  isSyntheticFootprints: boolean;
}

export interface RiskAssessmentResult {
  zoneId: string;
  zoneName: string;
  state: string;
  district: string;
  overallRiskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  primaryFactor: string;
  secondaryFactor: string;
  factorContributions: RiskFactorContribution[];
  observedDamageContext?: ObservedDamageContext | null;
  exposureScore: number;
  responsePriority: string;
  priorityAreas: string[];
  missingFactorsHandled: string[];
  disclaimer: string;
  isSynthetic: boolean;
  timestamp: string;
}

export interface EventImageryRecord {
  beforeImageRef: string;
  afterImageRef: string;
  sensor: string;
  acquisitionDates: string;
  resolution: string;
}

export interface EventDamageAssessmentSummary {
  totalStructures: number;
  destroyedCount: number;
  majorDamageCount: number;
  minorDamageCount: number;
  noDamageCount: number;
  destroyedPercentage: number;
  majorDamagePercentage: number;
  minorDamagePercentage: number;
  noDamagePercentage: number;
  averageConfidence: number;
  changeScore: number;
  changedAreaM2: number;
  changePercentage: number;
  damagedFootprintAreaM2: number;
}

export interface EventVerificationSummary {
  verifiedCount: number;
  unverifiedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  verificationProgressPct: number;
  lastVerifiedAt?: string | null;
}

export interface EventRiskSummary {
  overallRiskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  primaryFactor: string;
  secondaryFactor: string;
  factorContributions: RiskFactorContribution[];
}

export interface EventMetadata {
  engine: string;
  version: string;
  mode: 'DEMO' | 'UPLOADED' | 'REAL';
  recordedAt: string;
  recordedBy: string;
  notes?: string | null;
}

export interface HistoricalEventRecord {
  eventId: string;
  eventName: string;
  location: string;
  state: string;
  district?: string | null;
  disasterType: string;
  eventDate: string;
  imagery: EventImageryRecord;
  assessment: EventDamageAssessmentSummary;
  verification: EventVerificationSummary;
  riskAssessment: EventRiskSummary;
  metadata: EventMetadata;
  tags?: string[];
}

export interface BitemporalScenePair {
  eventId: string;
  sceneId: string;
  title: string;
  location: {
    name: string;
    state: string;
    district: string;
    lat: number;
    lng: number;
    corridor?: string;
  };
  beforeImage: string;
  afterImage: string;
  acquisitionDates: { before: string; after: string };
  sensor: string;
  resolutionGsd: string;
  mode: AssessmentMode;
  structureCount?: number;
  disclaimer?: string;
  metadata?: Record<string, any>;
}

export interface VerificationActionRequest {
  sceneId: string;
  structureId: string;
  action: 'VERIFY' | 'REJECT' | 'NEEDS_REVIEW' | 'MODIFY_CLASSIFICATION';
  modifiedClass?: DamageClass;
  notes?: string;
  assessorId?: string;
}


export type LanguageCode = 'en' | 'hi' | 'as' | 'bn';
export type SyncStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNCED';

export type DataProvenanceStatus = 'LIVE' | 'API' | 'SYNTHETIC' | 'DEMO' | 'DERIVED' | 'UNAVAILABLE';
export type ConfidenceStatus = 'HIGH' | 'MEDIUM' | 'LOW' | 'DEMONSTRATION';
export type RiskLevel = 'LOW' | 'MODERATE' | 'MODERATE_HIGH' | 'HIGH' | 'CRITICAL';
export type ResponsePriorityLevel = 'PRIORITY_1' | 'PRIORITY_2' | 'PRIORITY_3' | 'PRIORITY_4' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ProviderStatusType = 'CONNECTED' | 'DEGRADED' | 'UNAVAILABLE' | 'NOT CONFIGURED' | 'SYNTHETIC';

export interface ProviderHealth {
  name: string;
  category: 'CESIUM' | 'IMAGERY' | 'TERRAIN' | 'BUILDINGS' | 'SATELLITE' | 'WEATHER' | 'DATABASE';
  status: ProviderStatusType;
  details: string;
  lastChecked: string;
}

export interface SystemProviderHealth {
  cesiumViewer: ProviderHealth;
  cesiumAssets: ProviderHealth;
  cesiumIon: ProviderHealth;
  worldTerrain: ProviderHealth;
  osmBuildings: ProviderHealth;
  satelliteImagery: ProviderHealth;
  copernicusSar: ProviderHealth;
  weatherTelemetry: ProviderHealth;
}

export interface EvidenceCompleteness {
  score: number; // e.g. 4
  total: number; // e.g. 5
  ratio: string; // "4/5"
  items: Array<{
    name: string;
    present: boolean;
    provenance: DataProvenanceStatus;
    label: string;
  }>;
}

export interface RiskFactorItem {
  id: string;
  name: string;
  category: 'METEOROLOGICAL' | 'GEOTECHNICAL' | 'HYDROLOGICAL' | 'HISTORICAL' | 'SATELLITE_EVIDENCE';
  percentage: number;
  normalized_score?: number | null;
  contribution_points?: number;
  is_available?: boolean;
  indicator_value: string;
  weight: number;
  color: string;
  trigger_narrative: string;
}

export type RoadClass = 'NH' | 'SH' | 'MDR' | 'LOCAL' | 'RAILWAY' | 'UNAVAILABLE';
export type AssetRiskRelationship = 'INSIDE' | 'NEAR' | 'NOT_AFFECTED' | 'UNAVAILABLE';
export type RoadConnectivityStatus = 'AT_RISK' | 'POTENTIAL_DISRUPTION' | 'OPEN_MONITORING' | 'BLOCKED' | 'UNAVAILABLE';
export type ConnectivityImpactLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNAVAILABLE';

export interface ThreatRoadAsset {
  id: string;
  name: string;
  road_class: RoadClass;
  risk_relationship: AssetRiskRelationship;
  connectivity_status: RoadConnectivityStatus;
  status_label: string;
}

export interface ThreatBridgeAsset {
  id: string;
  name: string;
  carrying_road: string;
  risk_relationship: AssetRiskRelationship;
  status: string;
  provenance: string;
}

export interface ThreatCriticalFacility {
  id: string;
  name: string;
  category: 'HOSPITAL' | 'SCHOOL' | 'POWER' | 'HYDRO' | 'RAILWAY' | 'WATER' | 'DEFENSE' | 'OTHER';
  risk_relationship: AssetRiskRelationship;
  status: string;
  provenance: string;
}

export interface ConnectivityAssessment {
  impact_level: ConnectivityImpactLevel;
  impact_summary: string;
  affected_roads: ThreatRoadAsset[];
  threatened_bridges: ThreatBridgeAsset[];
  critical_facilities: ThreatCriticalFacility[];
  isolation_risk: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNAVAILABLE';
}

export interface ExposureRecord {
  exposed_population: number | null;
  exposed_villages: string[];
  vulnerable_road_segments: string[];
  threatened_bridges: string[];
  exposed_hospitals: string[];
  exposed_schools: string[];
  critical_infrastructure: string[];
  critical_facilities: string[];
  isolation_potential: 'HIGH' | 'MODERATE' | 'LOW' | 'UNAVAILABLE';
  lifeline_importance: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'UNAVAILABLE';
  exposure_score: number;
  exposure_breakdown?: {
    population_score: number | null;
    settlements_score: number | null;
    roads_score: number | null;
    bridges_score: number | null;
    hospitals_score: number | null;
    schools_score: number | null;
    critical_infra_score: number | null;
  };
  connectivity_assessment?: ConnectivityAssessment;
  provenance: 'SYNTHETIC / DEMONSTRATION DATA' | string;
}

export interface ResponseRecommendation {
  id: string;
  action: string;
  rationale: string;
  urgency: 'IMMEDIATE' | 'HIGH' | 'PREPAREDNESS' | 'ROUTINE';
  target_authority: 'DDMA' | 'SDMA' | 'SDRF' | 'BRO_PWD' | 'HEALTH_DEPT' | 'LOCAL_ADMIN';
  is_candidate_route?: boolean;
  candidate_route_name?: string;
  candidate_route_details?: string;
}

export interface SystemTelemetry {
  system_name: string;
  version: string;
  model_status: string;
  data_confidence: string;
  region: string;
  active_state_focus: string;
  command_center: string;
  status: string;
  datum: string;
  active_satellites: string[];
  sensor_nodes_online: number;
  last_sync_ist: string;
  threat_level: string;
  provenance_tag: string;
}

export interface StateCoverage {
  code: string;
  name: string;
  is_primary_showcase: boolean;
  focus_sectors: string[];
  active_risk_pct: number;
}

export interface SummaryMetrics {
  max_landslide_probability: number;
  current_risk_index_pct: number;
  previous_risk_index_pct: number;
  risk_trend_pct: number;
  risk_trend_direction: 'RISING' | 'STABLE' | 'FALLING';
  confidence_status?: ConfidenceStatus;
  confidence_method?: string;
  evidence_completeness?: EvidenceCompleteness;
  current_rainfall_intensity_mm_hr: number;
  rainfall_trend_pct: number;
  rainfall_trend_direction: 'RISING' | 'STABLE' | 'FALLING';
  cumulative_rainfall_24h_mm: number;
  high_risk_zones_count: number;
  critical_zones_count: number;
  rapidly_rising_zones_count: number;
  moderate_risk_zones_count: number;
  low_risk_zones_count: number;
  total_monitored_zones: number;
  roads_at_risk_count: number;
  isolated_villages_potential_count: number;
  villages_exposed_count: number;
  critical_assets_count: number;
  connectivity_risk_index: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'SEVERED';
  ndrf_battalions_standby: number;
  sdrf_teams_deployed: number;
}

export interface PSDataSource {
  category: string;
  source_name: string;
  status: string;
  last_update: string;
  data_type: string;
  confidence: string;
  provenance: DataProvenanceStatus | 'GOVERNMENT' | 'EXTERNAL' | 'DERIVED' | 'GOVERNMENT DATA - MOCKED';
  ready_for: string;
  spatial_resolution: string;
}

export interface RiskDriversExplanation {
  disclaimer: string;
  rainfall_contribution_pct: number;
  slope_contribution_pct: number;
  soil_moisture_contribution_pct: number;
  historical_landslide_pct: number;
  lithology_contribution_pct: number;
  critical_trigger: string;
}

export interface OperationalPipelineStep {
  step_number: number;
  title: string;
  sources: string[];
  status: string;
  throughput: string;
  latency_ms: number;
}

export interface RiskZone {
  id: string;
  name: string;
  state: string;
  district: string;
  lat: number;
  lng: number;
  elevation_m: number;
  slope_deg: number;
  aspect: string;
  curvature: number;
  lithology: string;
  soil_type: string;
  soil_moisture_pct: number;
  rainfall_1h_mm: number;
  rainfall_24h_mm: number;
  rainfall_72h_mm: number;
  historical_events_5y: number;
  landslide_probability: number;
  model_confidence?: number;
  risk_trend: 'RISING' | 'STABLE' | 'FALLING';
  previous_probability: number;
  confidence_status?: ConfidenceStatus;
  evidence_completeness?: EvidenceCompleteness;
  risk_level: 'LOW' | 'MODERATE' | 'MODERATE_HIGH' | 'HIGH' | 'CRITICAL';
  exposure_score: number;
  vulnerability_score: number;
  impact_priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  response_priority_level?: ResponsePriorityLevel;
  impact_priority_score: number;
  projected_3h_expansion_pct: number;
  population_exposed: number;
  villages_exposed: string[];
  roads_affected: string[];
  critical_facilities_affected: string[];
  threatened_bridges?: string[];
  exposed_hospitals?: string[];
  exposed_schools?: string[];
  critical_infrastructure?: string[];
  connectivity_importance: string;
  potential_isolation: string;
  key_assets: string[];
  provenance: DataProvenanceStatus | string;
  risk_drivers_explanation: RiskDriversExplanation;
  risk_factors?: RiskFactorItem[];
  exposure_record?: ExposureRecord;
  explainability?: any;
  recommended_actions: string[];
  structured_recommendations?: ResponseRecommendation[];
}

export interface CriticalEvent {
  id: string;
  zone_id: string;
  location: string;
  probability_pct: number;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  affected_infrastructure: string;
  trend: string;
  time_ago: string;
  recommended_action: string;
}

export interface RoadConnectivity {
  code: string;
  name: string;
  state: string;
  importance: string;
  current_status: 'OPEN' | 'WATCH' | 'AT_RISK' | 'BLOCKED';
  predicted_status_1h: 'OPEN' | 'WATCH' | 'AT_RISK' | 'BLOCKED';
  predicted_status_2h: 'OPEN' | 'WATCH' | 'AT_RISK' | 'BLOCKED';
  predicted_status_3h: 'OPEN' | 'WATCH' | 'AT_RISK' | 'BLOCKED' | 'RESTRICTED';
  blockage_prob: number;
  nearby_landslide_probability: number;
  affected_villages: string[];
  alternate_route: string;
  estimated_isolation_impact: string;
  connectivity_risk_score: number;
}

export interface HistoricalEvent {
  id: string;
  date: string;
  location: string;
  state: string;
  severity: string;
  trigger_rainfall_mm: string;
  road_impact: string;
  exposure_notes: string;
  verification_status: string;
  provenance: string;
}

export interface MultilingualAlert {
  id: string;
  level: 'WATCH' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
  target_audience: string;
  location_en: string;
  location_hi: string;
  location_as: string;
  location_bn: string;
  reason_en: string;
  reason_hi: string;
  reason_as: string;
  reason_bn: string;
  risk_probability_pct: number;
  expected_time_window: string;
  affected_roads_villages_en: string;
  affected_roads_villages_hi: string;
  affected_roads_villages_as: string;
  affected_roads_villages_bn: string;
  recommended_action_en: string;
  recommended_action_hi: string;
  recommended_action_as: string;
  recommended_action_bn: string;
  timestamp: string;
  channels: string[];
  source_confidence: string;
}

export interface SoilMoistureStation {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  moisture_pct: number;
  saturation_trend: string;
  sensor_health: string;
  provenance: string;
}

export interface SatelliteObservation {
  id: string;
  target_sector: string;
  state: string;
  coherence_loss_pct: number;
  line_of_sight_displacement_mm: number;
  vegetation_disturbance_ndvi: string;
  surface_change_indicator: string;
  provenance: string;
}

export interface EvidenceCard {
  id: string;
  timestamp: string;
  location: string;
  coordinates: string;
  incident_type: string;
  reporter: string;
  ai_evidence_score: number;
  vision_analysis: string;
  media_type: string;
  verification_status: 'CONFIRMED' | 'FALSE_POSITIVE' | 'UNDER_INSPECTION' | 'DISPROVED';
  sar_coherence_drop: string;
  image_caption: string;
  verified_at: string;
  action_taken: string;
}

export interface TruthMetrics {
  predicted_events: number;
  field_confirmed: number;
  false_positives: number;
  unverified: number;
  simulation_confidence: string;
}

export interface ForecastStep {
  time_label: string;
  offset_minutes: number;
  rainfall_intensity_mm_hr: number;
  max_risk_pct: number;
  high_risk_zones: number;
  roads_at_risk: number;
  villages_exposed: number;
  critical_assets: number;
  connectivity_risk: string;
  summary: string;
}

// ============================================================
// PHASE 7: REAL FORECAST TELEMETRY & DYNAMIC RISK CONTRACTS
// ============================================================

export type ForecastProvenance = 'LIVE' | 'FALLBACK' | 'UNAVAILABLE';
export type SimulationProvenance = 'SYNTHETIC';
export type ForecastAvailability = 'AVAILABLE' | 'UNAVAILABLE';

export interface NormalizedForecastTimestep {
  timestampIso: string;
  forecastHorizon: string; // e.g. "NOW", "NEXT AVAILABLE (+3h)", "+6h", "+9h", "+12h", "+24h", etc.
  offsetHours: number;
  rainfallIntensityMmHr: number | null; // normalized rate mm/hr
  intervalRainMm: number | null; // precipitation in provider timestep
  rolling72hAccumulationMm: number | null; // calculated only if rolling 72h window exists
  temperatureC: number | null;
  humidityPct: number | null;
  windSpeedKmh: number | null;
  pressureHpa: number | null;
  weatherCondition: string;
  cloudCoveragePct: number | null;
  source: string;
  provenance: ForecastProvenance;
  availability: ForecastAvailability;
}

export interface EvaluatedForecastTimestep extends NormalizedForecastTimestep {
  forecastRainfallScore: number | null;
  forecastRiskScore: number | null;
  forecastRiskLevel: RiskLevel | 'UNAVAILABLE';
  forecastExposureScore: number | null;
  forecastPriority: ResponsePriorityLevel | 'UNAVAILABLE';
  factorContributions?: {
    rainfall: number;
    slope: number;
    soilMoisture: number;
    history: number;
    lithology: number;
  };
}

export interface RegionalForecastDataset {
  regionId: string;
  regionName: string;
  state: string;
  coordinates: { lat: number; lng: number };
  currentObserved: {
    rainfall1hMm: number | null;
    rainfall72hMm: number | null;
    temperatureC: number | null;
    humidityPct: number | null;
    windSpeedKmh: number | null;
    weatherCondition: string;
    riskScore: number | null;
    riskLevel: RiskLevel | 'UNAVAILABLE';
    exposureScore: number | null;
    responsePriority: ResponsePriorityLevel | 'UNAVAILABLE';
    provenance: 'LIVE' | 'FALLBACK' | 'UNAVAILABLE';
    source: string;
  };
  timesteps: NormalizedForecastTimestep[];
  provenance: ForecastProvenance;
  source: string;
  fetchedAt: string;
}

// ============================================================
// PHASE 8: OFFICIAL IMD INTEGRATION & WEATHER ORCHESTRATOR CONTRACTS
// ============================================================

export type WeatherTelemetryGranularity = 'STATION' | 'DISTRICT' | 'STATE' | 'UNAVAILABLE';
export type WeatherProviderType = 'IMD' | 'OPENWEATHER' | 'OPENMETEO' | 'UNAVAILABLE';

export interface IMDOfficialWarning {
  warningColor: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | null;
  warningCodes: number[];
  warningPhenomena: string[];
  issuedAt: string;
  validUpto?: string;
  affectedDistricts: string[];
  rawText?: string;
}

export interface IMDStationMetadata {
  stationCode: string;
  stationName: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  elevationM?: number;
  stationType: 'AWS' | 'ARG' | 'SYNOPTIC' | 'RADAR' | 'DISTRICT_CENTROID';
  isVerified: boolean;
  resolvedAt: string;
}

export interface NormalizedWeatherTelemetry {
  provider: WeatherProviderType;
  providerStatus: 'IMD LIVE' | 'FALLBACK: OPENWEATHER' | 'FALLBACK: OPEN-METEO' | 'UNAVAILABLE';
  granularity: WeatherTelemetryGranularity;
  stationMetadata?: IMDStationMetadata | null;
  regionId: string;
  regionName: string;
  district: string;
  state: string;
  coordinates: { lat: number; lng: number };
  temperatureC: number | null;
  feelsLikeC: number | null;
  rainfall1hMm: number | null;
  rainfall24hMm: number | null;
  rainfall72hMm: number | null; // strictly null if not provided by endpoint
  rainfallIntensity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'UNAVAILABLE';
  humidityPct: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  windDirectionCardinal: string;
  pressureHpa: number | null;
  dewPointC: number | null;
  visibilityKm: number | null;
  cloudCoveragePct: number | null;
  cloudCondition: string;
  uvIndex: number | null;
  officialWarning?: IMDOfficialWarning | null;
  provenance: 'LIVE' | 'FALLBACK' | 'UNAVAILABLE';
  source: string;
  fetchedAt: string;
  isLive: boolean;
}

// ============================================================
// PHASE 9: OFFICIAL COPERNICUS SENTINEL-1 SAR CONTRACTS
// ============================================================

export interface Sentinel1Observation {
  observationId: string;
  aoiId: string;
  acquisitionTime: string;
  processedAt?: string;
  mission: 'SENTINEL-1';
  platform: 'SENTINEL-1A' | 'SENTINEL-1C' | 'UNKNOWN';
  productType: 'GRD' | 'SLC' | 'OTHER';
  orbitDirection?: 'ASCENDING' | 'DESCENDING' | 'UNKNOWN';
  polarization?: string[];
  backscatterDb?: number | null;
  coherence?: number | null;
  losDisplacementMm?: number | null;
  baselineDays?: number | null;
  source: 'COPERNICUS-CDSE' | 'SYNTHETIC' | 'UNAVAILABLE';
  provenance: 'LIVE' | 'SYNTHETIC' | 'UNAVAILABLE';
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  granularity?: string;
  swathMode?: string;
  safePackageName?: string;
  relativeOrbitNumber?: number;
  footprintGeoJson?: any;
  interpretationNotes?: string;
}

export interface Sentinel1PairAnalysis {
  aoiId: string;
  masterObservation: Sentinel1Observation;
  slaveObservation: Sentinel1Observation;
  temporalBaselineDays: number;
  perpendicularBaselineMeters?: number | null;
  isInterferometricPair: boolean;
  coherenceMean?: number | null;
  peakLosDisplacementMm?: number | null;
  surfaceMotionAnomalyDetected: boolean;
  scientificDisclaimer: string;
  requiresFieldVerification: boolean;
}

// ============================================================
// PHASE 10: FIELD VERIFICATION & TRUTH LOOP CONTRACTS
// ============================================================

export type FieldIncidentType =
  | 'CRACK'
  | 'SLOPE_MOVEMENT'
  | 'ROCKFALL'
  | 'LANDSLIDE'
  | 'ROAD_BLOCKAGE'
  | 'FLOODING'
  | 'OTHER';

export type FieldEvidenceType =
  | 'PHOTO'
  | 'VIDEO'
  | 'TEXT'
  | 'MULTIMODAL';

export type FieldEvidenceStatus =
  | 'PENDING'
  | 'REVIEWED'
  | 'VERIFIED'
  | 'REJECTED';

export type FieldReportSource =
  | 'FIELD_OFFICIAL'
  | 'CITIZEN'
  | 'SYNTHETIC';

export interface FieldReport {
  reportId: string;
  aoiId: string;
  aoiStatus: 'INSIDE_AOI' | 'OUTSIDE ACTIVE AOI';
  timestamp: string;
  location: {
    lat: number;
    lng: number;
  };
  incidentType: FieldIncidentType;
  description: string;
  evidenceType: FieldEvidenceType;
  evidenceStatus: FieldEvidenceStatus;
  source: FieldReportSource;
  synthetic: boolean;
  locationName: string;
  reporterName?: string | null;
  reporterRole?: string | null;
  roadBlocked?: boolean;
  verifiedAt?: string | null;
  actionTaken?: string | null;
  notes?: string | null;
}

export interface TruthLoopCorrelation {
  reportId: string;
  aoiId: string;
  correlatedAt: string;
  isCorrelatedSnapshot: boolean;
  epochRiskAtReportTime: {
    riskScore: number | null;
    riskLevel: RiskLevel | 'UNAVAILABLE';
    source: string;
  } | null;
  imdWeatherAtReportTime: {
    rainfall1hMm: number | null;
    rainfall24hMm: number | null;
    weatherCondition: string;
    warningColor?: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | null;
    providerStatus: string;
  } | null;
  sarObservationAtReportTime: {
    observationId?: string;
    surfaceMotionAnomalyDetected?: boolean;
    backscatterDb?: number | null;
    acquisitionTime?: string;
    sarCorrelationStatus: 'AVAILABLE' | 'NOT_AVAILABLE';
  } | null;
  infrastructureContext: {
    affectedRoads: string[];
    threatenedBridges: string[];
    criticalFacilities: string[];
  };
}

export interface Phase10TruthMetrics {
  predictedHighRiskEvents: number;
  totalReports: number;
  liveReportsCount: number;
  syntheticReportsCount: number;
  verifiedReportsCount: number;
  pendingReportsCount: number;
  reviewedReportsCount: number;
  rejectedReportsCount: number;
  evaluationDataStatus: 'EVALUATION DATA INSUFFICIENT' | 'VALIDATED';
  contingencyMatrix?: {
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
  } | null;
}

// ============================================================
// PHASE 11: MULTILINGUAL ALERT SYSTEM CONTRACTS
// ============================================================

export type AlertPriority = 'P1' | 'P2' | 'P3' | 'P4';

export type AlertStatus = 'DRAFT' | 'APPROVED' | 'EXPIRED' | 'REJECTED';

export type AlertSource = 'EPOCH' | 'IMD' | 'SYNTHETIC';

export type AlertLanguage = 'en' | 'hi' | 'as' | 'bn';

export interface AlertTranslationContent {
  title: string;
  message: string;
  what: string;
  where: string;
  why: string;
  severity: string;
  recommendedAction: string;
}

export interface EpochAlert {
  alertId: string;
  aoiId: string;
  generatedAt: string;
  validUntil?: string | null;
  riskScore: number;
  riskLevel: string;
  priority: AlertPriority;
  title: string;
  message: string;
  language: AlertLanguage;
  source: AlertSource;
  status: AlertStatus;
  synthetic: boolean;
  what: string;
  where: string;
  why: string;
  severity: string;
  recommendedAction: string;
  affectedInfrastructure: string[];
  contextSources: {
    imd: boolean;
    sentinel1: boolean;
    fieldVerification: boolean;
  };
  capStatus: 'SIMULATION_DRAFT' | 'UNAVAILABLE';
  approvedBy?: string | null;
  approvedAt?: string | null;
  translations: Record<string, AlertTranslationContent>;
}

// ============================================================
// PHASE 12: SMS EMERGENCY GATEWAY CONTRACTS
// ============================================================

export type SMSDeliveryStatus =
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'SKIPPED'
  | 'UNAVAILABLE';

export type SMSProviderMode = 'DRY_RUN' | 'LIVE' | 'UNAVAILABLE';

export interface SMSRecipient {
  recipientId: string;
  name: string;
  phoneE164: string;
  maskedPhone?: string;
  role: string;
  aoiId: string;
  preferredLanguage: AlertLanguage;
  enabled: boolean;
  synthetic: boolean;
}

export interface SMSNotification {
  notificationId: string;
  alertId: string;
  aoiId: string;
  recipientId: string;
  recipientName?: string | null;
  recipientRole?: string | null;
  phoneE164?: string | null;
  maskedPhone: string;
  language: AlertLanguage;
  messageBody: string;
  provider: string;
  providerStatus: string;
  providerMessageId?: string | null;
  status: SMSDeliveryStatus;
  createdAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  failureReason?: string | null;
  dryRun: boolean;
  attemptNumber: number;
  idempotencyKey: string;
}

export interface SMSProviderStatus {
  mode: SMSProviderMode;
  provider: string;
  configured: boolean;
  persistence_mode?: string;
}

export interface SMSDispatchResult {
  success: boolean;
  status: string;
  message?: string;
  alertId?: string;
  providerMode?: SMSProviderMode;
  persistenceMode?: string;
  totalRecipients?: number;
  notifications: SMSNotification[];
}

// ============================================================
// PHASE 13: OFFLINE SYNCHRONIZATION CONTRACTS
// ============================================================

export type OfflineOperationType = 'CREATE' | 'UPDATE';

export type OfflineSyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';

export interface OfflineQueueItem {
  queueId: string;
  clientOperationId: string;
  entityType: 'FIELD_INCIDENT';
  entityId?: string;
  operation: OfflineOperationType;
  payload: any;
  mediaRefs?: Array<{
    mediaId: string;
    fileName: string;
    mimeType: string;
    size: number;
    createdAt: string;
    storageStatus: 'STORED' | 'UNAVAILABLE';
  }>;
  expectedServerVersion?: number;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  maxRetries: number;
  syncStatus: OfflineSyncStatus;
  lastError?: string | null;
  conflictDetails?: {
    serverVersion: number;
    expectedVersion?: number;
    serverUpdatedAt?: string;
    serverRecord?: any;
    localPayload?: any;
  } | null;
}

export interface SyncConflictInfo {
  queueId: string;
  clientOperationId: string;
  entityId: string;
  serverVersion: number;
  expectedVersion?: number;
  serverRecord: any;
  localPayload: any;
  serverUpdatedAt?: string;
}

export interface SyncBatchResult {
  success: boolean;
  processedCount: number;
  syncedCount: number;
  failedCount: number;
  conflictCount: number;
  results: {
    queueId: string;
    clientOperationId: string;
    entityId?: string;
    status: OfflineSyncStatus;
    serverVersion?: number;
    serverRecord?: any;
    conflictDetails?: any;
    error?: string;
  }[];
}





