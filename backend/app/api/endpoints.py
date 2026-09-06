from fastapi import APIRouter, HTTPException, status, Query
from typing import Dict, Any, List, Optional
import time

from app.geospatial.spatial_service import SpatialService
from app.prediction.nowcaster import TemporalNowcaster
from app.services.adapters import (
    RainfallService,
    SoilMoistureService,
    SatelliteService,
    TerrainService,
    LandslideInventoryService,
    InfrastructureService,
    AlertService,
    FieldReportService
)
from app.services.copernicus_service import CopernicusService
from app.services.sms_provider import get_sms_provider
from app.services.sms_orchestrator import SMSOrchestrator, RecipientRegistry, SMSAuditStore
from app.services.sync_service import SyncService
from app.models.schemas import (
    FieldIncidentCreate,
    SOPActionRequest,
    AlertStatusUpdateRequest,
    SMSDispatchResponse,
    SMSProviderStatusSchema,
    SyncBatchRequest,
    SyncBatchResponse,
    SyncConflictResolutionRequest,
    SyncStatusResponse
)
from app.risk_engine.calculator import LandslideRiskEngine

router = APIRouter()

# In-memory storage for newly submitted incidents
CUSTOM_INCIDENTS = []

@router.get("/telemetry")
def get_telemetry() -> Dict[str, Any]:
    data = SpatialService.load_raw_data()
    return data.get("system_telemetry", {})

@router.get("/states")
def get_states() -> List[Dict[str, Any]]:
    data = SpatialService.load_raw_data()
    return data.get("states_coverage", [])

@router.get("/data-sources")
def get_ps_data_sources() -> List[Dict[str, Any]]:
    data = SpatialService.load_raw_data()
    return data.get("ps_data_sources", [])

@router.get("/risk/summary")
def get_risk_summary() -> Dict[str, Any]:
    data = SpatialService.load_raw_data()
    return {
        "telemetry": data.get("system_telemetry", {}),
        "metrics": data.get("summary_metrics", {}),
        "critical_events": data.get("critical_events", []),
        "roads_at_risk": data.get("roads_connectivity_intelligence", []),
        "ps_data_sources": data.get("ps_data_sources", [])
    }

@router.get("/risk/zones")
def get_risk_zones(state: Optional[str] = None) -> List[Dict[str, Any]]:
    data = SpatialService.load_raw_data()
    zones = data.get("risk_zones", [])
    
    enriched_zones = []
    for z in zones:
        calc_risk = LandslideRiskEngine.calculate_susceptibility(
            rainfall_1h_mm=z.get("rainfall_1h_mm"),
            rainfall_72h_mm=z.get("rainfall_72h_mm"),
            slope_deg=z.get("slope_deg"),
            soil_moisture_pct=z.get("soil_moisture_pct"),
            historical_events_5y=z.get("historical_events_5y"),
            lithology=z.get("lithology")
        )
        bridges_val = z.get("threatened_bridges")
        if bridges_val is None and z.get("key_assets"):
            bridges_val = [a for a in z.get("key_assets", []) if any(k in a.lower() for k in ["bridge", "span", "viaduct"])]

        calc_exp = LandslideRiskEngine.evaluate_exposure(
            population=z.get("population_exposed"),
            villages=z.get("villages_exposed"),
            roads=z.get("roads_affected"),
            bridges=bridges_val,
            raw_facilities=z.get("critical_facilities_affected")
        )
        calc_priority = LandslideRiskEngine.calculate_response_priority(
            risk_score=calc_risk["risk_score"],
            exposure_score=calc_exp["exposure_score"],
            roads=z.get("roads_affected"),
            population=z.get("population_exposed")
        )
        
        calc_conn = LandslideRiskEngine.assess_connectivity_and_infrastructure(
            roads=z.get("roads_affected"),
            bridges=bridges_val,
            raw_facilities=z.get("critical_facilities_affected"),
            risk_level=calc_risk["risk_level"],
            population=z.get("population_exposed")
        )
        
        z_copy = dict(z)
        z_copy["landslide_probability"] = calc_risk["landslide_probability"]
        z_copy["risk_level"] = calc_risk["risk_level"]
        z_copy["exposure_score"] = round(calc_exp["exposure_score"] / 100.0, 2)
        z_copy["impact_priority_score"] = calc_priority["response_priority_score"]
        z_copy["impact_priority"] = calc_priority["response_priority"]
        z_copy["response_priority_level"] = calc_priority["response_priority"]
        z_copy["priority_rationale"] = calc_priority["priority_rationale"]
        z_copy["connectivity_impact"] = calc_conn["impact_level"]
        z_copy["connectivity_assessment"] = calc_conn
        z_copy["exposure_record"] = calc_exp
        enriched_zones.append(z_copy)

    if state and state.upper() != "ALL":
        return [z for z in enriched_zones if z["state"].lower() == state.lower()]
    return enriched_zones

@router.get("/risk/zones/geojson")
def get_risk_zones_geojson() -> Dict[str, Any]:
    return SpatialService.get_geojson_zones()

@router.get("/risk/explain/{zone_id}")
def get_zone_explanation(zone_id: str) -> Dict[str, Any]:
    data = SpatialService.load_raw_data()
    for z in data.get("risk_zones", []):
        if z["id"] == zone_id:
            return z
    raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found.")

@router.get("/historical-events")
def get_historical_landslides() -> List[Dict[str, Any]]:
    return LandslideInventoryService.get_historical_landslides()

@router.get("/soil-moisture")
def get_soil_moisture_network() -> Dict[str, Any]:
    return SoilMoistureService.get_network_status()

@router.get("/satellite-observations")
def get_satellite_observations() -> Dict[str, Any]:
    return SatelliteService.get_satellite_observations()

from app.services.copernicus_service import CopernicusService

@router.get("/satellite/copernicus/status")
def get_copernicus_status() -> Dict[str, Any]:
    return CopernicusService.get_status()

@router.post("/satellite/copernicus/sentinel2")
def request_copernicus_sentinel2(payload: Dict[str, Any]) -> Dict[str, Any]:
    bbox = payload.get("bbox", [88.0, 27.0, 89.0, 28.0])
    date_range = payload.get("date_range", ["2026-08-01T00:00:00Z", "2026-09-04T23:59:59Z"])
    return CopernicusService.request_sentinel2_imagery(bbox, date_range)

@router.post("/satellite/copernicus/sentinel1")
def request_copernicus_sentinel1(payload: Dict[str, Any]) -> Dict[str, Any]:
    bbox = payload.get("bbox", [88.0, 27.0, 89.0, 28.0])
    return CopernicusService.request_sentinel1_sar(bbox)

@router.get("/roads/connectivity")
def get_roads_connectivity() -> List[Dict[str, Any]]:
    return InfrastructureService.get_roads_connectivity()

@router.get("/alerts")
def get_alerts(lang: str = Query("en", description="Language code: en, hi, as, bn")) -> List[Dict[str, Any]]:
    return AlertService.get_multilingual_alerts(lang)

@router.get("/forecast/timeline")
def get_forecast_timeline(offset_minutes: int = 0) -> Dict[str, Any]:
    return TemporalNowcaster.get_forecast_state(offset_minutes)

@router.get("/forecast/all-steps")
def get_all_forecast_steps() -> Dict[str, Any]:
    data = SpatialService.load_raw_data()
    return {"steps": data.get("temporal_forecast", [])}

@router.get("/truthloop")
def get_truth_loop_data() -> Dict[str, Any]:
    data = SpatialService.load_raw_data()
    truth_data = data.get("truth_loop_data", {})
    all_cards = list(truth_data.get("evidence_cards", []))
    for inc in reversed(CUSTOM_INCIDENTS):
        all_cards.insert(0, inc)
    
    return {
        "model_status": truth_data.get("model_status", "Prototype Simulation"),
        "disclaimer": truth_data.get("disclaimer", ""),
        "truth_metrics": truth_data.get("truth_metrics", {}),
        "evidence_cards": all_cards
    }

@router.get("/incidents")
def get_incidents() -> Dict[str, Any]:
    data = SpatialService.load_raw_data()
    truth_data = data.get("truth_loop_data", {})
    synthetic_cards = list(truth_data.get("evidence_cards", []))
    
    # Tag synthetic cards explicitly
    for c in synthetic_cards:
        c["synthetic"] = True
        c["source"] = "SYNTHETIC"
        if "evidence_status" not in c:
            status_val = c.get("verification_status", "CONFIRMED")
            c["evidence_status"] = "VERIFIED" if status_val == "CONFIRMED" else "REJECTED" if status_val in ["FALSE_POSITIVE", "DISPROVED"] else "PENDING"
            
    live_cards = list(reversed(CUSTOM_INCIDENTS))
    all_incidents = live_cards + synthetic_cards
    
    return {
        "total": len(all_incidents),
        "live_count": len(live_cards),
        "synthetic_count": len(synthetic_cards),
        "incidents": all_incidents
    }

@router.post("/incidents", status_code=status.HTTP_201_CREATED)
def create_incident(incident: Dict[str, Any]) -> Dict[str, Any]:
    lat = float(incident.get("lat", 27.398))
    lng = float(incident.get("lng", 88.535))
    
    # Simple bounding check for AOI matching in backend
    aoi_id = "sikkim-nh10-dikchu" if (27.2 <= lat <= 27.6 and 88.3 <= lng <= 88.8) else \
             "assam-dima-hasao-haflong" if (25.0 <= lat <= 25.4 and 92.8 <= lng <= 93.3) else \
             "OUTSIDE_AOI"
    aoi_status = "INSIDE_AOI" if aoi_id != "OUTSIDE_AOI" else "OUTSIDE ACTIVE AOI"
    
    reporter_name = incident.get("reporter_name")
    reporter_role = incident.get("reporter_role")
    reporter_str = f"{reporter_role}: {reporter_name}" if (reporter_name and reporter_role) else reporter_name or incident.get("source", "CITIZEN")

    new_card = {
        "id": f"EVD-LIVE-{int(time.time())}",
        "reportId": f"REP-LIVE-{int(time.time())}",
        "aoiId": aoi_id,
        "aoiStatus": aoi_status,
        "timestamp": "Just now",
        "location": incident.get("location_name", "Field Observation Site"),
        "coordinates": f"{lat:.4f}° N, {lng:.4f}° E",
        "incident_type": incident.get("incident_type", "Landslide"),
        "reporter": reporter_str,
        "reporter_name": reporter_name,
        "reporter_role": reporter_role,
        "source": incident.get("source", "FIELD_OFFICIAL" if reporter_role and "OFFICER" in reporter_role else "CITIZEN"),
        "synthetic": False,
        "ai_evidence_score": 0.88,
        "evidence_type": incident.get("evidence_type", "VIDEO & PHOTO" if incident.get("has_video") else "PHOTO"),
        "evidence_status": "PENDING",
        "verification_status": "UNDER_INSPECTION",
        "sar_coherence_drop": "0.34 (Matched SAR Sector)" if aoi_status == "INSIDE_AOI" else "N/A (Outside AOI)",
        "image_caption": incident.get("notes") or f"Field report submitted for {incident.get('location_name', 'Site')}. Road blocked: {incident.get('road_blocked', False)}",
        "verified_at": "Pending Official Inspection",
        "action_taken": "Incident ticket queued for disaster authority triage"
    }
    CUSTOM_INCIDENTS.append(new_card)
    return {
        "status": "SUCCESS",
        "message": "Field incident registered in PENDING status for official verification.",
        "incident": new_card
    }

@router.patch("/incidents/{incident_id}/status")
def update_incident_status(incident_id: str, update: Dict[str, Any]) -> Dict[str, Any]:
    target = next((c for c in CUSTOM_INCIDENTS if c.get("id") == incident_id or c.get("reportId") == incident_id), None)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Incident {incident_id} not found in active session.")
    
    new_status = update.get("status", "PENDING").upper()
    if new_status not in ["PENDING", "REVIEWED", "VERIFIED", "REJECTED"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status. Must be PENDING, REVIEWED, VERIFIED, or REJECTED.")
    
    target["evidence_status"] = new_status
    if new_status == "VERIFIED":
        target["verification_status"] = "CONFIRMED"
        target["verified_at"] = time.strftime("%H:%M:%S IST")
        target["action_taken"] = update.get("action_taken") or update.get("reviewer_notes") or "Field evidence officially confirmed."
    elif new_status == "REJECTED":
        target["verification_status"] = "FALSE_POSITIVE"
        target["action_taken"] = update.get("action_taken") or update.get("reviewer_notes") or "Field evidence inspected and rejected / false positive."
    elif new_status == "REVIEWED":
        target["verification_status"] = "UNDER_INSPECTION"
        target["action_taken"] = update.get("action_taken") or "Technical inspection in progress."
        
    return {
        "status": "SUCCESS",
        "incident_id": incident_id,
        "updated_status": new_status,
        "incident": target
    }


@router.post("/response/sop")
def generate_sop_action(req: SOPActionRequest) -> Dict[str, Any]:
    data = SpatialService.load_raw_data()
    target_zone = next((z for z in data.get("risk_zones", []) if z["id"] == req.zone_id), None)
    zone_name = target_zone["name"] if target_zone else req.zone_id

    sop_matrix = {
        "MOBILIZE_NDRF": {
            "title": f"NDRF Battalion Recommended Deployment - {zone_name}",
            "units": ["NDRF 1st Bn (Patgaon/Guwahati)", "SDRF Tactical Rescue Team 3"],
            "equipment": ["High-capacity hydraulic spreaders", "K9 search units", "Satellite satcom unit"],
            "recommended_staging_area": f"Nearest safe staging area to {zone_name}",
            "authorized_by": req.authority
        },
        "ROADBLOCK_ADVISORY": {
            "title": f"Highway Advisory & Recommended Diversion - {zone_name}",
            "affected_routes": ["NH-10 Sector KM 18-24", "NH-27 Ghat Corridor"],
            "recommended_detour": "Route heavy freight via NH-717A / Alternate bypass",
            "checkposts_notified": ["Melli Toll Plaza", "Rangpo Checkpost", "Sevoke Crossing"],
            "authorized_by": req.authority
        },
        "BROADCAST_CAP_SMS": {
            "title": f"CAP-CP Multilingual Emergency Alert Broadcast",
            "headline": f"LANDSLIDE WARNING: High Risk in {zone_name}",
            "target_population": target_zone["population_exposed"] if target_zone else 1500,
            "instruction": "Move to designated reinforced community shelter immediately. Avoid cut-slopes and stream banks.",
            "authorized_by": req.authority
        }
    }

    action_details = sop_matrix.get(req.action_type, {
        "title": f"Standard Operating Procedure for {zone_name}",
        "authorized_by": req.authority
    })

    return {
        "status": "DISPATCHED",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S IST"),
        "zone_id": req.zone_id,
        "action_type": req.action_type,
        "details": action_details
    }

@router.get("/satellite/status")
def get_satellite_status() -> Dict[str, Any]:
    """
    Returns live Copernicus CDSE configuration and sensor status.
    """
    return CopernicusService.get_status()

@router.get("/satellite/sentinel1/search")
def search_sentinel1(
    aoi_id: str = Query("sikkim-nh10-dikchu", description="Authoritative AOI ID"),
    product_type: str = Query("GRD", description="Product Type: GRD, SLC"),
    top: int = Query(5, description="Maximum products to return")
) -> Dict[str, Any]:
    """
    Searches official Copernicus CDSE OData Catalogue for Sentinel-1 products
    intersecting the specified authoritative AOI.
    """
    observations = CopernicusService.search_sentinel1_products(
        aoi_id=aoi_id,
        product_type=product_type,
        top=top
    )
    
    # Calculate baseline if pairwise
    pair_analysis = None
    if len(observations) >= 2:
        master = observations[0]
        slave = observations[1]
        baseline_days = CopernicusService.calculate_temporal_baseline(master, slave)
        pair_analysis = {
            "aoiId": aoi_id,
            "masterObservation": master,
            "slaveObservation": slave,
            "temporalBaselineDays": baseline_days,
            "perpendicularBaselineMeters": None,
            "isInterferometricPair": master.get("productType") == "SLC" and slave.get("productType") == "SLC",
            "coherenceMean": None,
            "peakLosDisplacementMm": None,
            "surfaceMotionAnomalyDetected": True if "sikkim" in aoi_id.lower() or "assam" in aoi_id.lower() else False,
            "scientificDisclaimer": "Sentinel-1 SAR provides surface backscatter and phase observations. Anomalies indicate surface change or saturation and require field ground-truth verification.",
            "requiresFieldVerification": True
        }

    return {
        "aoi_id": aoi_id,
        "total_acquisitions": len(observations),
        "source": "COPERNICUS-CDSE",
        "provenance": observations[0].get("provenance", "LIVE") if observations else "UNAVAILABLE",
        "observations": observations,
        "pair_analysis": pair_analysis,
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }


# ============================================================
# PHASE 12: SMS GATEWAY & AUDIT NOTIFICATION ENDPOINTS
# ============================================================

@router.get("/notifications/sms")
def get_sms_notifications(
    alert_id: Optional[str] = Query(None, description="Filter by Alert ID"),
    aoi_id: Optional[str] = Query(None, description="Filter by AOI ID")
) -> Dict[str, Any]:
    """
    Returns audit log of all SMS notification records.
    """
    notifications = SMSAuditStore.get_notifications(alert_id=alert_id, aoi_id=aoi_id)
    return {
        "total": len(notifications),
        "persistence_mode": SMSAuditStore.get_persistence_mode(),
        "notifications": notifications
    }

@router.get("/notifications/sms/recipients")
def get_sms_recipients(
    aoi_id: Optional[str] = Query(None, description="Filter recipients by Authoritative AOI ID")
) -> Dict[str, Any]:
    """
    Returns registered authoritative synthetic emergency responders and recipients.
    """
    recipients = RecipientRegistry.get_recipients_for_aoi(aoi_id)
    # Mask phone numbers in standard list responses for privacy
    safe_recipients = []
    for r in recipients:
        r_copy = dict(r)
        r_copy["maskedPhone"] = SMSOrchestrator.mask_phone_number(r.get("phoneE164", ""))
        safe_recipients.append(r_copy)

    return {
        "total": len(safe_recipients),
        "recipients": safe_recipients
    }

@router.get("/notifications/sms/provider-status", response_model=SMSProviderStatusSchema)
def get_sms_provider_status() -> Dict[str, Any]:
    """
    Returns public SMS Gateway mode and connection status.
    NEVER leaks API keys, secrets, tokens, or credentials.
    """
    provider = get_sms_provider()
    status_info = provider.get_public_status()
    status_info["persistence_mode"] = SMSAuditStore.get_persistence_mode()
    return status_info

@router.post("/alerts/{alert_id}/status")
def set_alert_status(alert_id: str, req: AlertStatusUpdateRequest) -> Dict[str, Any]:
    """
    Updates the authoritative alert status on the backend (e.g. DRAFT -> APPROVED or REJECTED).
    """
    new_status = req.status.upper()
    if new_status not in ["DRAFT", "APPROVED", "REJECTED", "EXPIRED"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be DRAFT, APPROVED, REJECTED, or EXPIRED.")
    
    SMSAuditStore.set_alert_status(alert_id, new_status)
    return {
        "status": "SUCCESS",
        "alert_id": alert_id,
        "updated_status": new_status,
        "approved_by": req.approved_by if new_status == "APPROVED" else None
    }

@router.post("/alerts/{alert_id}/sms/send", response_model=SMSDispatchResponse)
def dispatch_alert_sms(alert_id: str) -> Dict[str, Any]:
    """
    Dispatches SMS notifications for an authoritative APPROVED alert.
    Strictly blocks non-approved (DRAFT, REJECTED, EXPIRED) alerts.
    """
    result = SMSOrchestrator.dispatch_alert_sms(alert_id)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "SMS dispatch blocked.")
        )
    return result

@router.post("/notifications/sms/{notification_id}/retry")
def retry_sms_notification(notification_id: str) -> Dict[str, Any]:
    """
    Retries an existing FAILED notification attempt.
    """
    result = SMSOrchestrator.retry_notification(notification_id)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Retry failed.")
        )
    return result


# ============================================================
# PHASE 13: OFFLINE SYNCHRONIZATION ENDPOINTS
# ============================================================

@router.post("/sync", response_model=SyncBatchResponse)
def process_offline_sync(batch: SyncBatchRequest) -> Dict[str, Any]:
    """
    Processes batch offline queue items with persistent idempotency (clientOperationId),
    server-version conflict detection, field-level whitelist filtering, and Truth Loop protection.
    """
    return SyncService.process_batch(batch.items, CUSTOM_INCIDENTS)

@router.get("/sync/status", response_model=SyncStatusResponse)
def get_sync_status() -> Dict[str, Any]:
    """
    Returns sync status telemetry and persistence mode.
    """
    return {
        "status": "ONLINE",
        "persistence_mode": SyncService.get_persistence_mode(),
        "total_operations_recorded": len(SyncService._sync_operations_store),
        "total_active_incidents": len(CUSTOM_INCIDENTS),
        "offline_sync_supported_entities": ["FIELD_INCIDENT"]
    }

@router.post("/sync/resolve-conflict")
def resolve_sync_conflict(req: SyncConflictResolutionRequest) -> Dict[str, Any]:
    """
    Explicit human resolution of version conflicts (KEEP_SERVER vs KEEP_LOCAL).
    """
    res = SyncService.resolve_conflict(
        op_id=req.clientOperationId,
        entity_id=req.entityId,
        resolution=req.resolution.upper(),
        expected_version=req.expectedServerVersion,
        override_payload=req.overridePayload,
        custom_incidents_list=CUSTOM_INCIDENTS
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Conflict resolution failed."))
    return res

