"""
EPOCH Damage Engine - DamageClassifier Module
Performs deterministic, explainable 4-tier damage classification adhering to centralized demonstration thresholds.
"""

from typing import Tuple
from app.models.assessment_schemas import DamageClass, DamageFeatures
from .config import CLASSIFICATION_CONFIG


class DamageClassifier:
    """Classifies structural damage into one of 4 standardized institutional categories."""

    @classmethod
    def classify_damage(cls, features: DamageFeatures, structural_change_score: float) -> Tuple[DamageClass, str]:
        """
        Classifies damage using centralized thresholds and returns (DamageClass, explanation).
        """
        destroyed_th = CLASSIFICATION_CONFIG["DESTROYED_THRESHOLD"]
        major_th = CLASSIFICATION_CONFIG["MAJOR_DAMAGE_THRESHOLD"]
        minor_th = CLASSIFICATION_CONFIG["MINOR_DAMAGE_THRESHOLD"]

        score = structural_change_score

        if score >= destroyed_th:
            damage_class = DamageClass.DESTROYED
            explanation = (
                f"Severe structural failure detected (Structural Change: {score*100:.1f}% >= {destroyed_th*100:.0f}%). "
                f"Evidence shows {features.disappearanceEvidence*100:.0f}% envelope disruption and "
                f"{features.appearanceEvidence*100:.0f}% debris/sediment inundation."
            )
        elif score >= major_th:
            damage_class = DamageClass.MAJOR_DAMAGE
            explanation = (
                f"Substantial structural impairment detected (Structural Change: {score*100:.1f}% >= {major_th*100:.0f}%). "
                f"Footprint remains discernible with {features.edgeChange*100:.0f}% boundary fracture and "
                f"{features.textureChange*100:.0f}% roof texture deformation."
            )
        elif score >= minor_th:
            damage_class = DamageClass.MINOR_DAMAGE
            explanation = (
                f"Localized/superficial damage detected (Structural Change: {score*100:.1f}% >= {minor_th*100:.0f}%). "
                f"Core structural geometry intact with {features.pixelChange*100:.0f}% localized spectral shift and "
                f"perimeter debris encroachment."
            )
        else:
            damage_class = DamageClass.NO_DAMAGE
            explanation = (
                f"No significant structural change detected (Structural Change: {score*100:.1f}% < {minor_th*100:.0f}%). "
                f"High baseline correlation ({ (1.0 - score)*100:.1f}% intact fidelity) with intact roof and boundary geometry."
            )

        return damage_class, explanation
