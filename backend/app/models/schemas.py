from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class Telemetry(BaseModel):
    system_name: str
    version: str
    region: str
    command_center: str
    status: str
    datum: str
    active_satellites: List[str]
    sensor_nodes_online: int
    last_sync_ist: str
    threat_level: str

class SummaryMetrics(BaseModel):
    max_landslide_probability: float
    current_risk_index_pct: int
    risk_trend_pct: int
    model_confidence_pct: int
    current_rainfall_intensity_mm_hr: float
    rainfall_trend_pct: int
    cumulative_rainfall_24h_mm: float
    high_risk_zones_count: int
    moderate_risk_zones_count: int
    low_risk_zones_count: int
    total_monitored_zones: int
    roads_at_risk_count: int
    villages_exposed_count: int
    critical_assets_count: int
    ndrf_battalions_standby: int
    sdrf_teams_deployed: int

class Explainability(BaseModel):
    rainfall_contribution_pct: float
    slope_contribution_pct: float
    soil_moisture_contribution_pct: float
    historical_landslide_pct: float
    lithology_contribution_pct: float
    critical_trigger: str
    factor_of_safety: float

class RiskZone(BaseModel):
    id: str
    name: str
    state: str
    district: str
    lat: float
    lng: float
    elevation_m: float
    slope_deg: float
    aspect: str
    curvature: float
    lithology: str
    soil_type: str
    soil_moisture_pct: float
    rainfall_1h_mm: float
    rainfall_24h_mm: float
    rainfall_72h_mm: float
    historical_events_5y: int
    landslide_probability: float
    model_confidence: float
    risk_level: str
    exposure_score: float
    vulnerability_score: float
    impact_priority: float
    projected_3h_expansion_pct: float
    population_exposed: int
    key_assets: List[str]
    explainability: Explainability

class CriticalEvent(BaseModel):
    id: str
    zone_id: str
    title: str
    severity: str
    time_ago: str
    highway: str
    impact: str
    action_required: str

class RoadHazard(BaseModel):
    code: str
    name: str
    state: str
    status: str
    blockage_prob: float
    threat_chainage: str
    detour_route: str
    impacted_traffic_daily: int

class EvidenceCard(BaseModel):
    id: str
    timestamp: str
    location: str
    coordinates: str
    incident_type: str
    reporter: str
    ai_evidence_score: float
    verification_status: str
    sar_coherence_drop: str
    image_caption: str
    verified_at: str
    action_taken: str

class TruthMetrics(BaseModel):
    predicted_events: int
    field_confirmed: int
    false_positives: int
    unverified: int
    model_accuracy_pct: float
    precision_pct: float
    recall_pct: float
    brier_score: float
    roc_auc: float

class PipelineStage(BaseModel):
    id: str
    name: str
    status: str
    description: str

class OperationalPipelineStep(BaseModel):
    step_number: int
    title: str
    sources: List[str]
    status: str
    throughput: str
    latency_ms: int

class FieldIncidentCreate(BaseModel):
    location_name: str
    state: Optional[str] = "Sikkim"
    district: Optional[str] = "Pakyong"
    lat: float
    lng: float
    incident_type: str
    severity: Optional[str] = "SEVERE"
    road_blocked: Optional[bool] = False
    reporter_name: Optional[str] = None
    reporter_role: Optional[str] = None
    source: Optional[str] = "FIELD_OFFICIAL"
    evidence_type: Optional[str] = "PHOTO"
    has_video: Optional[bool] = False
    photo_url: Optional[str] = None
    notes: Optional[str] = None

class FieldIncidentStatusUpdate(BaseModel):
    status: str # 'PENDING', 'REVIEWED', 'VERIFIED', 'REJECTED'
    reviewer_notes: Optional[str] = None
    action_taken: Optional[str] = None

class SOPActionRequest(BaseModel):
    zone_id: str
    action_type: str # 'MOBILIZE_NDRF', 'ROADBLOCK_ADVISORY', 'BROADCAST_CAP_SMS', 'EVACUATION_ALERT'
    authority: str

class SMSRecipientSchema(BaseModel):
    recipientId: str
    name: str
    phoneE164: str
    role: str
    aoiId: str
    preferredLanguage: str = "en"
    enabled: bool = True
    synthetic: bool = True

class SMSNotificationSchema(BaseModel):
    notificationId: str
    alertId: str
    aoiId: str
    recipientId: str
    recipientName: Optional[str] = None
    recipientRole: Optional[str] = None
    phoneE164: Optional[str] = None
    maskedPhone: str
    language: str
    messageBody: str
    provider: str
    providerStatus: str
    providerMessageId: Optional[str] = None
    status: str # 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED', 'UNAVAILABLE'
    createdAt: str
    sentAt: Optional[str] = None
    deliveredAt: Optional[str] = None
    failureReason: Optional[str] = None
    dryRun: bool
    attemptNumber: int = 1
    idempotencyKey: str

class SMSProviderStatusSchema(BaseModel):
    mode: str # 'DRY_RUN' | 'LIVE' | 'UNAVAILABLE'
    provider: str
    configured: bool
    persistence_mode: Optional[str] = "IN_MEMORY_CACHE"

class SMSDispatchResponse(BaseModel):
    success: bool
    status: str
    message: Optional[str] = None
    alertId: Optional[str] = None
    providerMode: Optional[str] = None
    persistenceMode: Optional[str] = None
    totalRecipients: Optional[int] = 0
    notifications: List[SMSNotificationSchema] = []

class AlertStatusUpdateRequest(BaseModel):
    status: str # 'APPROVED' | 'REJECTED' | 'DRAFT'
    approved_by: Optional[str] = None

# ============================================================
# PHASE 13: OFFLINE SYNC SCHEMAS
# ============================================================

class SyncItemRequest(BaseModel):
    queueId: str
    clientOperationId: str
    entityType: str = "FIELD_INCIDENT" # 'FIELD_INCIDENT'
    entityId: Optional[str] = None
    operation: str # 'CREATE' | 'UPDATE'
    payload: Dict[str, Any]
    expectedServerVersion: Optional[int] = None
    clientUpdatedAt: Optional[str] = None

class SyncBatchRequest(BaseModel):
    items: List[SyncItemRequest]

class SyncItemResult(BaseModel):
    queueId: str
    clientOperationId: str
    entityId: Optional[str] = None
    status: str # 'SYNCED' | 'FAILED' | 'CONFLICT'
    serverVersion: Optional[int] = None
    serverRecord: Optional[Dict[str, Any]] = None
    conflictDetails: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class SyncBatchResponse(BaseModel):
    success: bool
    processedCount: int
    syncedCount: int
    failedCount: int
    conflictCount: int
    results: List[SyncItemResult]

class SyncConflictResolutionRequest(BaseModel):
    clientOperationId: str
    entityId: str
    resolution: str # 'KEEP_SERVER' | 'KEEP_LOCAL'
    expectedServerVersion: int
    overridePayload: Optional[Dict[str, Any]] = None

class SyncStatusResponse(BaseModel):
    status: str
    persistence_mode: str
    total_operations_recorded: int
    total_active_incidents: int
    offline_sync_supported_entities: List[str]

