"""
EPOCH Phase 3 - Risk Assessment API Endpoints
Provides authoritative endpoints for Multi-Factor Landslide Risk Assessment,
Factor Breakdown, and Scientific Explainability.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional

from app.models.risk_schemas import (
    RiskAssessmentRequest,
    RiskAssessmentResult,
    RiskFactorItem
)
from app.risk_engine.risk_assessment_engine import RiskAssessmentEngine
from app.damage_engine.orchestrator import AssessmentEngine

router = APIRouter(prefix="/risk", tags=["Risk Intelligence Engine"])


@router.post("/evaluate", response_model=RiskAssessmentResult)
def evaluate_risk(request: RiskAssessmentRequest) -> RiskAssessmentResult:
    """
    Evaluates multi-factor landslide vulnerability and geotechnical risk.
    """
    try:
        return RiskAssessmentEngine.evaluate_risk(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk evaluation error: {str(e)}")


@router.get("/sikkim-demo", response_model=RiskAssessmentResult)
def get_sikkim_demo_risk() -> RiskAssessmentResult:
    """
    Retrieves authoritative Sikkim NH-10 corridor risk intelligence,
    dynamically linked to the latest Phase 2 damage assessment.
    """
    # Fetch latest damage assessment if available
    latest_damage = AssessmentEngine.get_latest_result("sikkim-nh10-dikchu-sector")
    damage_ctx = None
    if latest_damage:
        damage_ctx = {
            "totalStructures": latest_damage.statistics.totalStructures,
            "destroyedCount": latest_damage.statistics.destroyedCount,
            "majorDamageCount": latest_damage.statistics.majorDamageCount,
            "minorDamageCount": latest_damage.statistics.minorDamageCount,
            "noDamageCount": latest_damage.statistics.noDamageCount,
            "changeScore": latest_damage.changeDetection.changeScore if latest_damage.changeDetection else 0.428,
            "damagedFootprintAreaM2": latest_damage.statistics.damagedFootprintAreaM2,
            "damagedStructureDensityPct": round(
                ((latest_damage.statistics.destroyedCount + latest_damage.statistics.majorDamageCount + latest_damage.statistics.minorDamageCount) /
                 max(1, latest_damage.statistics.totalStructures)) * 100.0, 1
            ),
            "verifiedCount": latest_damage.statistics.verifiedCount,
            "unverifiedCount": latest_damage.statistics.unverifiedCount,
            "provenance": "IMAGE-DERIVED / OBSERVED",
            "isSyntheticFootprints": True
        }

    return RiskAssessmentEngine.get_sikkim_demo_risk(damage_ctx)


@router.get("/weights")
def get_factor_weights() -> Dict[str, Any]:
    """Returns the current canonical factor weights and scientific thresholds."""
    return {
        "weights": RiskAssessmentEngine.get_configured_weights(),
        "totalWeight": sum(RiskAssessmentEngine.get_configured_weights().values()),
        "thresholds": {
            "rainfall_1h_threshold_mm": 30.0,
            "rainfall_72h_threshold_mm": 150.0,
            "slope_angle_threshold_deg": 45.0,
            "historical_events_5y_threshold": 8,
            "status": "CALIBRATED_HIMALAYAN_BASELINE"
        },
        "disclaimer": "Configured factor weights are used for deterministic multi-factor decision support."
    }
