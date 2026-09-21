"""
EPOCH Damage Engine - VerificationEngine Module
Manages human operator verification states (UNVERIFIED, VERIFIED, REJECTED, NEEDS_REVIEW)
and applies classification overrides with real-time audit logging.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from app.models.assessment_schemas import (
    DetectedStructure,
    DamageClass,
    VerificationStatus,
    VerificationActionRequest,
    AssessmentResult
)
from .assessment_statistics import StatisticsCalculator


class VerificationEngine:
    """Handles operator human verification actions, audit trail, and dynamic statistics recalculation."""

    # In-memory storage for verified structure overrides per sceneId
    _OVERRIDES: Dict[str, Dict[str, Dict[str, Any]]] = {}

    @classmethod
    def apply_verification_action(
        cls,
        assessment_result: AssessmentResult,
        request: VerificationActionRequest
    ) -> AssessmentResult:
        """
        Applies human assessor verification or classification override to a structure.
        Recalculates summary statistics dynamically and returns updated AssessmentResult.
        """
        scene_id = request.sceneId
        struct_id = request.structureId
        action = request.action.upper()

        if scene_id not in cls._OVERRIDES:
            cls._OVERRIDES[scene_id] = {}

        now_iso = datetime.now(timezone.utc).isoformat()
        assessor = request.assessorId or "NDRF_GEOSPATIAL_OFFICER_01"

        updated_structures = []
        target_found = False

        for s in assessment_result.structures:
            s_dict = s.model_dump()
            if s.structureId == struct_id:
                target_found = True
                if action == "VERIFY":
                    s_dict["verificationStatus"] = VerificationStatus.VERIFIED
                elif action == "REJECT":
                    s_dict["verificationStatus"] = VerificationStatus.REJECTED
                elif action in ["NEEDS_REVIEW", "FLAG_FOR_FIELD"]:
                    s_dict["verificationStatus"] = VerificationStatus.NEEDS_REVIEW
                elif action in ["MODIFY", "MODIFY_CLASSIFICATION"]:
                    if request.modifiedClass:
                        s_dict["damageClass"] = request.modifiedClass
                        s_dict["verificationStatus"] = VerificationStatus.VERIFIED
                        s_dict["explanation"] += f" [Human Assessor Override to {request.modifiedClass.value}: {request.notes or 'Manual Inspection'}]"

                if request.notes:
                    s_dict["assessorNotes"] = request.notes
                s_dict["verifiedBy"] = assessor
                s_dict["verifiedAt"] = now_iso

                # Record override
                cls._OVERRIDES[scene_id][struct_id] = s_dict

            updated_structures.append(DetectedStructure(**s_dict))

        if not target_found:
            raise ValueError(f"Structure with ID '{struct_id}' not found in scene '{scene_id}'.")

        # Recalculate statistics dynamically from updated structures
        updated_stats = StatisticsCalculator.calculate_statistics(updated_structures)

        # Update map data object
        updated_map_data = [
            {
                "structureId": s.structureId,
                "geometry": s.geometry,
                "damageClass": s.damageClass,
                "confidence": s.confidence
            }
            for s in updated_structures
        ]

        assessment_result.structures = updated_structures
        assessment_result.statistics = updated_stats
        assessment_result.damageMapData = updated_map_data

        return assessment_result

    @classmethod
    def get_overrides_for_scene(cls, scene_id: str) -> Dict[str, Dict[str, Any]]:
        """Returns recorded human verification overrides for a given sceneId."""
        return cls._OVERRIDES.get(scene_id, {})
