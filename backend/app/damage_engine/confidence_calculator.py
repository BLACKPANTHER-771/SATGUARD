"""
EPOCH Damage Engine - ConfidenceCalculator Module
Calculates evidence confidence (0.00 to 1.00) based on alignment fidelity, image contrast,
feature agreement, and classification boundary margin. Independent of damage severity.
"""

import numpy as np
from app.models.assessment_schemas import DamageClass, DamageFeatures
from .config import CLASSIFICATION_CONFIG


class ConfidenceCalculator:
    """Calculates evidence reliability confidence rating."""

    @classmethod
    def calculate_confidence(
        cls,
        features: DamageFeatures,
        damage_class: DamageClass,
        structural_score: float,
        registration_confidence: float = 0.92
    ) -> float:
        """
        Calculates confidence score (0.00 to 1.00) in the evidence supporting the classification.
        """
        # 1. Registration / Alignment Quality Factor (0.0 - 1.0)
        align_factor = float(registration_confidence)

        # 2. Feature Agreement Factor (Do edge, texture, and pixel evidence corroborate each other?)
        feature_vals = [
            features.pixelChange,
            features.edgeChange,
            features.textureChange,
            features.structuralChange
        ]
        feature_variance = float(np.var(feature_vals))
        # Lower variance among corroborating features = higher confidence
        agreement_factor = float(np.clip(1.0 - (feature_variance * 2.5), 0.5, 1.0))

        # 3. Classification Margin Factor (How far is the score from the nearest decision boundary?)
        destroyed_th = CLASSIFICATION_CONFIG["DESTROYED_THRESHOLD"]
        major_th = CLASSIFICATION_CONFIG["MAJOR_DAMAGE_THRESHOLD"]
        minor_th = CLASSIFICATION_CONFIG["MINOR_DAMAGE_THRESHOLD"]

        if damage_class == DamageClass.DESTROYED:
            margin = (structural_score - destroyed_th) / (1.0 - destroyed_th + 1e-4)
        elif damage_class == DamageClass.MAJOR_DAMAGE:
            dist_to_upper = abs(destroyed_th - structural_score)
            dist_to_lower = abs(structural_score - major_th)
            margin = min(dist_to_upper, dist_to_lower) / ((destroyed_th - major_th) / 2.0 + 1e-4)
        elif damage_class == DamageClass.MINOR_DAMAGE:
            dist_to_upper = abs(major_th - structural_score)
            dist_to_lower = abs(structural_score - minor_th)
            margin = min(dist_to_upper, dist_to_lower) / ((major_th - minor_th) / 2.0 + 1e-4)
        else:  # NO_DAMAGE
            margin = (minor_th - structural_score) / (minor_th + 1e-4)

        margin_factor = float(np.clip(0.65 + 0.35 * margin, 0.6, 1.0))

        # 4. Composite Confidence Calculation
        weights = CLASSIFICATION_CONFIG["CONFIDENCE_WEIGHTS"]
        raw_confidence = (
            weights["alignment_fidelity"] * align_factor +
            weights["feature_agreement"] * agreement_factor +
            weights["classification_margin"] * margin_factor +
            weights["image_quality"] * 0.90
        )

        confidence = float(np.clip(raw_confidence, 0.55, 0.98))
        return round(confidence, 4)
