"""
EPOCH Phase 2 - Authoritative Assessment Engine Orchestrator
Coordinates the end-to-end Damage Assessment pipeline:
BEFORE + AFTER -> VALIDATION -> ALIGNMENT -> CHANGE DETECTION -> BUILT-UP ANALYSIS ->
DAMAGE FEATURES -> 4-TIER CLASSIFICATION -> CONFIDENCE -> VERIFICATION -> STATISTICS
"""

import time
import numpy as np
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from app.models.assessment_schemas import (
    BitemporalScenePair,
    AssessmentResult,
    DetectedStructure,
    ChangeDetectionSummary,
    DamageMapItem,
    AssessmentMode,
    VerificationStatus,
    DamageClass,
    AnalyzeSceneRequest
)
from .config import CLASSIFICATION_CONFIG
from .image_processor import ImageProcessor
from .image_aligner import ImageAligner
from .change_detector import ChangeDetector
from .builtup_detector import BuiltUpDetector
from .building_detector import BuildingDetector
from .damage_feature_extractor import DamageFeatureExtractor
from .damage_classifier import DamageClassifier
from .confidence_calculator import ConfidenceCalculator
from .assessment_statistics import StatisticsCalculator
from .verification_engine import VerificationEngine


class AssessmentEngine:
    """Authoritative Backend Damage Assessment Engine for EPOCH."""

    # Primary validated demonstration scene
    DEFAULT_SIKKIM_SCENE = {
        "eventId": "sikkim-teesta-flood-2026",
        "sceneId": "sikkim-nh10-dikchu-sector",
        "title": "Sikkim Teesta Valley & NH-10 Corridor Inundation Assessment",
        "location": {
            "name": "Dikchu – Singtam Highway Corridor",
            "state": "Sikkim",
            "district": "Pakyong",
            "lat": 27.2389,
            "lng": 88.6065,
            "corridor": "National Highway 10 (NH-10)"
        },
        "acquisitionDates": {
            "before": "2026-08-14 (Pre-Disaster Baseline)",
            "after": "2026-09-02 (Post-Debris Inundation)"
        },
        "sensor": "Demonstration High-Resolution Optical RGB Scene",
        "resolutionGsd": "0.5m GSD (Synthetic Demonstration Scene)",
        "mode": "DEMO"
    }

    # Centralized scene configs for standard demonstration sectors
    DEMO_SCENES: Dict[str, Dict[str, Any]] = {
        "sikkim-nh10-dikchu-sector": {
            "eventId": "sikkim-teesta-flood-2026",
            "sceneId": "sikkim-nh10-dikchu-sector",
            "title": "Sikkim Teesta Valley & NH-10 Corridor Inundation Assessment",
            "location": {
                "name": "Dikchu – Singtam Highway Corridor",
                "state": "Sikkim",
                "district": "Pakyong",
                "lat": 27.2389,
                "lng": 88.6065,
                "corridor": "National Highway 10 (NH-10)"
            },
            "acquisitionDates": {
                "before": "2026-08-14 (Pre-Disaster Baseline)",
                "after": "2026-09-02 (Post-Debris Inundation)"
            },
            "sensor": "Demonstration High-Resolution Optical RGB Scene",
            "resolutionGsd": "0.5m GSD (Synthetic Demonstration Scene)",
            "mode": "DEMO"
        },
        "sikkim-chungthang-basin": {
            "eventId": "sikkim-teesta-flood-2026",
            "sceneId": "sikkim-chungthang-basin",
            "title": "Chungthang Basin Teesta Stage-III Hydroelectric Corridor Damage Assessment",
            "location": {
                "name": "Chungthang Basin Gorge Sector",
                "state": "Sikkim",
                "district": "Mangan",
                "lat": 27.59814,
                "lng": 88.65060,
                "corridor": "Teesta Stage-III Axis"
            },
            "acquisitionDates": {
                "before": "2026-08-28 (Pre-Disaster Baseline)",
                "after": "2026-09-03 (Post-GLOF Inundation)"
            },
            "sensor": "Sentinel-2 MSI (10m L2A BOA Reflectance)",
            "resolutionGsd": "10m GSD (Copernicus Sentinel-2)",
            "mode": "DEMO"
        },
        "sikkim-singtam-dikchu": {
            "eventId": "sikkim-teesta-flood-2026",
            "sceneId": "sikkim-singtam-dikchu",
            "title": "Singtam-Dikchu River Island & NH-10 Arterial Corridor Damage Assessment",
            "location": {
                "name": "Singtam – Dikchu River Island",
                "state": "Sikkim",
                "district": "Gangtok / Pakyong",
                "lat": 27.2348,
                "lng": 88.4980,
                "corridor": "National Highway 10 (NH-10)"
            },
            "acquisitionDates": {
                "before": "2026-08-28 (Pre-Disaster Baseline)",
                "after": "2026-09-03 (Post-GLOF Inundation)"
            },
            "sensor": "Sentinel-2 MSI (10m L2A BOA Reflectance)",
            "resolutionGsd": "10m GSD (Copernicus Sentinel-2)",
            "mode": "DEMO"
        }
    }

    @classmethod
    def get_scene_config(cls, scene_id: str) -> Dict[str, Any]:
        """Resolves authoritative scene metadata by scene ID or alias."""
        s_id = (scene_id or "").lower()
        if "chungthang" in s_id or "scene-02" in s_id or "scene_02" in s_id:
            return cls.DEMO_SCENES["sikkim-chungthang-basin"]
        if "singtam" in s_id or "scene-03" in s_id or "scene_03" in s_id:
            return cls.DEMO_SCENES["sikkim-singtam-dikchu"]
        return cls.DEMO_SCENES.get(scene_id, cls.DEFAULT_SIKKIM_SCENE)

    # In-memory scene results cache
    _RESULTS_CACHE: Dict[str, AssessmentResult] = {}

    @classmethod
    def get_available_scenes(cls) -> List[Dict[str, Any]]:
        """Returns the list of available demonstration scenes (Primary: Sikkim NH-10 Corridor)."""
        before_preview = ImageProcessor.to_base64(ImageProcessor.generate_synthetic_scene(is_after=False), "JPEG")
        after_preview = ImageProcessor.to_base64(ImageProcessor.generate_synthetic_scene(is_after=True), "JPEG")

        scenes = []
        for s_cfg in cls.DEMO_SCENES.values():
            scene_item = dict(s_cfg)
            scene_item["beforeImage"] = before_preview
            scene_item["afterImage"] = after_preview
            scene_item["structureCount"] = len(BuildingDetector.DEMO_SIKKIM_STRUCTURES)
            scene_item["disclaimer"] = "SYNTHETIC DEMONSTRATION DATA"
            scenes.append(scene_item)
        return scenes

    @classmethod
    def run_assessment(cls, request: AnalyzeSceneRequest) -> AssessmentResult:
        """
        Executes the authoritative damage assessment pipeline on a bitemporal scene pair.
        """
        start_time = time.time()
        scene_cfg = cls.get_scene_config(request.sceneId or cls.DEFAULT_SIKKIM_SCENE["sceneId"])
        scene_id = scene_cfg["sceneId"] if (not request.sceneId or request.sceneId in ["default", "sikkim-nh10-dikchu-sector"]) else request.sceneId
        event_id = request.eventId or scene_cfg["eventId"]
        mode = request.mode

        # 1. INGESTION & LOADING
        if request.beforeImageBase64 and request.afterImageBase64:
            raw_before = ImageProcessor.load_image(request.beforeImageBase64)
            raw_after = ImageProcessor.load_image(request.afterImageBase64)
        else:
            scene_paths = {
                "sikkim-singtam-dikchu": ("backend/data/scenes/scene_03_pre.jpg", "backend/data/scenes/scene_03_post.jpg"),
                "sikkim-chungthang-basin": ("frontend/public/assets/satellite/scene_02_pre.jpg", "frontend/public/assets/satellite/scene_02_post.jpg"),
                "sikkim-nh10-dikchu-sector": ("frontend/public/assets/satellite/scene_01_predisaster.jpg", "frontend/public/assets/satellite/scene_02_postdisaster.jpg")
            }
            if scene_id in scene_paths:
                pre_p, post_p = scene_paths[scene_id]
                raw_before = ImageProcessor.load_image(pre_p)
                raw_after = ImageProcessor.load_image(post_p)
            else:
                raw_before = ImageProcessor.generate_synthetic_scene(is_after=False)
                raw_after = ImageProcessor.generate_synthetic_scene(is_after=True)

        # 2. VALIDATION & NORMALIZATION
        before_norm, after_norm, norm_meta = ImageProcessor.validate_and_normalize(raw_before, raw_after)

        # 3. IMAGE ALIGNMENT
        aligned_before, aligned_after, align_meta = ImageAligner.align_scenes(before_norm, after_norm)

        # 4. CHANGE DETECTION
        change_mask_rgb, scene_change_score, change_meta = ChangeDetector.compute_change_mask(aligned_before, aligned_after)
        change_mask_base64 = ImageProcessor.to_base64(change_mask_rgb, "PNG")

        # 5. BUILT-UP ANALYSIS & FOOTPRINT DETECTION
        builtup_mask, builtup_meta = BuiltUpDetector.extract_builtup_mask(aligned_before)
        candidate_structures = BuildingDetector.get_structures_for_scene(scene_id, mode.value, builtup_mask)

        # Retrieve any existing human verification overrides for this scene
        overrides = VerificationEngine.get_overrides_for_scene(scene_id)

        # 6. LOCAL DAMAGE FEATURE EXTRACTION, CLASSIFICATION & CONFIDENCE
        detected_structures: List[DetectedStructure] = []
        for s_raw in candidate_structures:
            s_id = s_raw["structureId"]

            # Check if an existing human override exists
            if s_id in overrides:
                detected_structures.append(DetectedStructure(**overrides[s_id]))
                continue

            # Extract 8-dimensional quantitative damage features
            features, change_score, struct_change_score, before_crop, after_crop = DamageFeatureExtractor.extract_features_for_structure(
                aligned_before,
                aligned_after,
                s_raw
            )

            # Classify damage into one of 4 standardized classes
            damage_class, explanation = DamageClassifier.classify_damage(features, struct_change_score)

            # Calculate evidence confidence (independent of damage severity)
            confidence = ConfidenceCalculator.calculate_confidence(
                features,
                damage_class,
                struct_change_score,
                registration_confidence=align_meta.get("registration_confidence", 0.92)
            )

            structure_obj = DetectedStructure(
                structureId=s_id,
                name=s_raw["name"],
                geometry=s_raw["geometry"],
                centerLat=s_raw["centerLat"],
                centerLng=s_raw["centerLng"],
                footprintAreaM2=s_raw["footprintAreaM2"],
                beforeEvidence=before_crop,
                afterEvidence=after_crop,
                features=features,
                changeScore=change_score,
                structuralChangeScore=struct_change_score,
                damageClass=damage_class,
                confidence=confidence,
                verificationStatus=VerificationStatus.UNVERIFIED,
                explanation=explanation,
                isSyntheticFootprint=s_raw.get("isSyntheticFootprint", True)
            )
            detected_structures.append(structure_obj)

        # 7. DYNAMIC ASSESSMENT STATISTICS
        stats = StatisticsCalculator.calculate_statistics(detected_structures)

        # 8. MAP DATA CONTRACT (Clean decoupled map integration contract)
        damage_map_data = [
            DamageMapItem(
                structureId=s.structureId,
                geometry=s.geometry,
                damageClass=s.damageClass,
                confidence=s.confidence
            )
            for s in detected_structures
        ]

        # 9. ASSEMBLE COMPLETE RESULT CONTRACT
        processing_latency_ms = int((time.time() - start_time) * 1000)

        change_summary = ChangeDetectionSummary(
            changeScore=scene_change_score,
            changedAreaM2=float(change_meta["significant_pixel_count"] * 1.8),
            changePercentage=float(change_meta["change_percentage"]),
            noiseFiltered=True,
            changeMaskBase64=change_mask_base64,
            hotspotCount=len([s for s in detected_structures if s.damageClass != DamageClass.NO_DAMAGE]),
            disclaimer="Deterministic optical difference analysis. Environmental terrain shifts filtered separately."
        )

        scene_meta = {
            "title": scene_cfg.get("title", cls.DEFAULT_SIKKIM_SCENE["title"]),
            "location": request.customLocation or scene_cfg.get("location", cls.DEFAULT_SIKKIM_SCENE["location"]),
            "sensor": scene_cfg.get("sensor", cls.DEFAULT_SIKKIM_SCENE["sensor"]),
            "resolution": scene_cfg.get("resolutionGsd", cls.DEFAULT_SIKKIM_SCENE["resolutionGsd"]),
            "acquisitionDates": scene_cfg.get("acquisitionDates", cls.DEFAULT_SIKKIM_SCENE["acquisitionDates"]),
            "disclaimer": f"SYNTHETIC DEMONSTRATION DATA ({scene_cfg.get('location', {}).get('name', 'Sikkim')})" if mode == AssessmentMode.DEMO else "USER UPLOADED SCENE",
            "thresholdConfig": CLASSIFICATION_CONFIG["threshold_status"]
        }

        result = AssessmentResult(
            eventId=event_id,
            sceneId=scene_id,
            mode=mode,
            sceneMetadata=scene_meta,
            changeDetection=change_summary,
            structures=detected_structures,
            statistics=stats,
            damageMapData=damage_map_data,
            processingMetadata={
                "engine": CLASSIFICATION_CONFIG["engine_name"],
                "version": CLASSIFICATION_CONFIG["version"],
                "processingLatencyMs": processing_latency_ms,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "alignmentMethod": align_meta["method"],
                "registrationLabel": align_meta["registration_label"],
                "thresholdStatus": CLASSIFICATION_CONFIG["threshold_status"]
            }
        )

        cls._RESULTS_CACHE[scene_id] = result
        return result

    @classmethod
    def get_latest_result(cls, scene_id: str) -> Optional[AssessmentResult]:
        """Retrieves cached assessment result for a scene or executes initial analysis."""
        if scene_id in cls._RESULTS_CACHE:
            return cls._RESULTS_CACHE[scene_id]
        return cls.run_assessment(AnalyzeSceneRequest(sceneId=scene_id))
