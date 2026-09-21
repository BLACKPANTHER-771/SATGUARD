"""
EPOCH Phase 2 - Damage Assessment API Endpoints
Provides authoritative endpoints for Bitemporal Scene Analysis, Human Verification, and Damage Export.
"""

from fastapi import APIRouter, HTTPException, Query, Response
from typing import Dict, Any, List, Optional
import json
import csv
import io

from app.models.assessment_schemas import (
    AssessmentResult,
    AnalyzeSceneRequest,
    VerificationActionRequest,
    AssessmentMode
)
from app.damage_engine.orchestrator import AssessmentEngine
from app.damage_engine.verification_engine import VerificationEngine

router = APIRouter(prefix="/assessment", tags=["Damage Assessment Engine"])


@router.get("/scenes")
def get_assessment_scenes() -> List[Dict[str, Any]]:
    """Returns available demonstration scenes for bitemporal analysis."""
    return AssessmentEngine.get_available_scenes()


@router.post("/analyze", response_model=AssessmentResult)
def analyze_scene(request: AnalyzeSceneRequest) -> AssessmentResult:
    """
    Executes the authoritative damage assessment engine on a bitemporal scene pair.
    """
    try:
        result = AssessmentEngine.run_assessment(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assessment Engine execution error: {str(e)}")


@router.get("/result", response_model=AssessmentResult)
def get_scene_result_query(sceneId: str = Query("sikkim-nh10-dikchu-sector", description="Target scene ID")) -> AssessmentResult:
    """
    Retrieves the latest damage assessment result for a scene via query param.
    """
    result = AssessmentEngine.get_latest_result(sceneId)
    if not result:
        raise HTTPException(status_code=404, detail=f"No assessment result found for scene '{sceneId}'.")
    return result


@router.get("/result/{scene_id}", response_model=AssessmentResult)
def get_scene_result_path(scene_id: str) -> AssessmentResult:
    """
    Retrieves the latest damage assessment result for a scene via path param.
    """
    result = AssessmentEngine.get_latest_result(scene_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"No assessment result found for scene '{scene_id}'.")
    return result


@router.post("/verify", response_model=AssessmentResult)
def verify_structure(request: VerificationActionRequest) -> AssessmentResult:
    """
    Applies human assessor verification (VERIFY, REJECT, NEEDS_REVIEW, MODIFY_CLASSIFICATION).
    Dynamically recalculates summary damage statistics.
    """
    current_result = AssessmentEngine.get_latest_result(request.sceneId)
    if not current_result:
        raise HTTPException(status_code=404, detail=f"Scene '{request.sceneId}' not found.")

    try:
        updated_result = VerificationEngine.apply_verification_action(current_result, request)
        return updated_result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.get("/export")
def export_damage_register(
    sceneId: str = Query("sikkim-nh10-dikchu-sector"),
    exportFormat: str = Query("json", enum=["json", "csv", "geojson"])
):
    """
    Exports damage assessment register in JSON, CSV, or GeoJSON format.
    """
    result = AssessmentEngine.get_latest_result(sceneId)
    if not result:
        raise HTTPException(status_code=404, detail="Scene not found")

    if exportFormat == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "StructureID", "Name", "DamageClass", "Confidence", "VerificationStatus",
            "StructuralChangeScore", "PixelChange", "EdgeChange", "TextureChange",
            "DisappearanceEvidence", "AppearanceEvidence", "Latitude", "Longitude", "AreaM2"
        ])
        for s in result.structures:
            writer.writerow([
                s.structureId, s.name, s.damageClass.value, s.confidence, s.verificationStatus.value,
                s.structuralChangeScore, s.features.pixelChange, s.features.edgeChange, s.features.textureChange,
                s.features.disappearanceEvidence, s.features.appearanceEvidence,
                s.centerLat, s.centerLng, s.footprintAreaM2
            ])
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=epoch_damage_register_{sceneId}.csv"}
        )

    if exportFormat == "geojson":
        features = []
        for s in result.structures:
            x, y, w, h = s.geometry.get("bbox", [0, 0, 0, 0])
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [s.centerLng, s.centerLat]
                },
                "properties": {
                    "structureId": s.structureId,
                    "name": s.name,
                    "damageClass": s.damageClass.value,
                    "confidence": s.confidence,
                    "verificationStatus": s.verificationStatus.value,
                    "structuralChangeScore": s.structuralChangeScore,
                    "footprintAreaM2": s.footprintAreaM2,
                    "bbox": [x, y, w, h]
                }
            })
        geojson_doc = {
            "type": "FeatureCollection",
            "metadata": {
                "eventId": result.eventId,
                "sceneId": result.sceneId,
                "timestamp": result.processingMetadata.get("timestamp"),
                "totalStructures": result.statistics.totalStructures
            },
            "features": features
        }
        return geojson_doc

    # Default: JSON
    return result
