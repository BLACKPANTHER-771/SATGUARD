"""
EPOCH Damage Engine - AssessmentStatistics Module
Calculates aggregate summary metrics dynamically from detected structure records with mathematical invariant guarantees.
"""

from typing import List
from app.models.assessment_schemas import (
    DetectedStructure,
    AssessmentStatistics,
    DamageClass,
    VerificationStatus
)


class StatisticsCalculator:
    """Computes dynamic damage statistics across all evaluated structures."""

    @classmethod
    def calculate_statistics(cls, structures: List[DetectedStructure]) -> AssessmentStatistics:
        """
        Calculates aggregate damage counts, percentages, and verification metrics.
        Guarantees: sum(counts) == totalStructures and sum(percentages) ~= 100.0%.
        """
        total = len(structures)
        if total == 0:
            return AssessmentStatistics(
                totalStructures=0,
                destroyedCount=0,
                majorDamageCount=0,
                minorDamageCount=0,
                noDamageCount=0,
                destroyedPercentage=0.0,
                majorDamagePercentage=0.0,
                minorDamagePercentage=0.0,
                noDamagePercentage=0.0,
                averageConfidence=0.0,
                verifiedCount=0,
                unverifiedCount=0,
                needsReviewCount=0,
                totalFootprintAreaM2=0.0,
                damagedFootprintAreaM2=0.0
            )

        destroyed = sum(1 for s in structures if s.damageClass == DamageClass.DESTROYED)
        major = sum(1 for s in structures if s.damageClass == DamageClass.MAJOR_DAMAGE)
        minor = sum(1 for s in structures if s.damageClass == DamageClass.MINOR_DAMAGE)
        no_dmg = sum(1 for s in structures if s.damageClass == DamageClass.NO_DAMAGE)

        verified = sum(1 for s in structures if s.verificationStatus == VerificationStatus.VERIFIED)
        unverified = sum(1 for s in structures if s.verificationStatus == VerificationStatus.UNVERIFIED)
        needs_review = sum(1 for s in structures if s.verificationStatus == VerificationStatus.NEEDS_REVIEW)

        total_area = sum(s.footprintAreaM2 for s in structures)
        damaged_area = sum(
            s.footprintAreaM2 for s in structures
            if s.damageClass in [DamageClass.DESTROYED, DamageClass.MAJOR_DAMAGE, DamageClass.MINOR_DAMAGE]
        )

        avg_conf = sum(s.confidence for s in structures) / total

        # Percentage calculations
        p_destroyed = round((destroyed / total) * 100.0, 1)
        p_major = round((major / total) * 100.0, 1)
        p_minor = round((minor / total) * 100.0, 1)
        p_none = round((no_dmg / total) * 100.0, 1)

        return AssessmentStatistics(
            totalStructures=total,
            destroyedCount=destroyed,
            majorDamageCount=major,
            minorDamageCount=minor,
            noDamageCount=no_dmg,
            destroyedPercentage=p_destroyed,
            majorDamagePercentage=p_major,
            minorDamagePercentage=p_minor,
            noDamagePercentage=p_none,
            averageConfidence=round(avg_conf, 4),
            verifiedCount=verified,
            unverifiedCount=unverified,
            needsReviewCount=needs_review,
            totalFootprintAreaM2=round(total_area, 1),
            damagedFootprintAreaM2=round(damaged_area, 1)
        )
