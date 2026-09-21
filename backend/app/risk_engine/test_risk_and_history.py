"""
EPOCH Phase 3 - Risk Intelligence & Event History Test Suite
Validates:
1. Risk score calculation
2. Weight contribution calculation (Sum == Overall Score)
3. Factor totals & normalization
4. Damage-to-risk data handoff & analytical separation
5. History save & retrieve
6. History reopen
7. Missing-data handling & proportional redistribution
8. Deterministic reproducibility
"""

import sys
import os
import math

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.models.risk_schemas import (
    RiskAssessmentRequest,
    RiskAssessmentResult,
    RiskLevel,
    FactorStatus,
    ObservedDamageContext
)
from app.models.history_schemas import (
    HistoricalEventRecord,
    EventImageryRecord,
    EventDamageAssessmentSummary,
    EventVerificationSummary,
    EventRiskSummary,
    EventMetadata
)
from app.risk_engine.risk_assessment_engine import RiskAssessmentEngine
from app.history_engine.history_store import EventHistoryStore


def test_1_risk_calculation_and_weights():
    """Test 1: Canonical weights and risk score calculation."""
    weights = RiskAssessmentEngine.get_configured_weights()
    assert abs(weights["rainfall"] - 0.38) < 1e-4, f"Expected 0.38 for rainfall, got {weights['rainfall']}"
    assert abs(weights["slope"] - 0.29) < 1e-4, f"Expected 0.29 for slope, got {weights['slope']}"
    assert abs(weights["soil_moisture"] - 0.18) < 1e-4, f"Expected 0.18 for moisture, got {weights['soil_moisture']}"
    assert abs(weights["history"] - 0.09) < 1e-4, f"Expected 0.09 for history, got {weights['history']}"
    assert abs(weights["lithology"] - 0.06) < 1e-4, f"Expected 0.06 for lithology, got {weights['lithology']}"
    assert abs(sum(weights.values()) - 1.00) < 1e-4, f"Sum of weights must be 1.00, got {sum(weights.values())}"
    print("✓ Test 1: Canonical factor weights verified (Rainfall 38%, Slope 29%, Soil 18%, History 9%, Lithology 6%)")


def test_2_factor_contributions_sum():
    """Test 2: Factor contributions sum strictly to overall risk score."""
    req = RiskAssessmentRequest(
        zoneId="test-zone",
        zoneName="Test Geotechnical Sector",
        state="Sikkim",
        rainfall_1h_mm=15.0,
        rainfall_72h_mm=75.0,
        slope_deg=30.0,
        soil_moisture_pct=60.0,
        historical_events_5y=4,
        lithology="Sandstone and Quartzite"
    )
    result = RiskAssessmentEngine.evaluate_risk(req)
    assert result.overallRiskScore > 0, "Risk score must be positive"
    contrib_sum = sum(f.contributionPoints for f in result.factorContributions)
    assert abs(contrib_sum - result.overallRiskScore) < 0.2, (
        f"Sum of contributions ({contrib_sum}) must equal overall risk score ({result.overallRiskScore})"
    )
    print(f"✓ Test 2: Factor contributions sum ({contrib_sum:.1f}) matches overall risk score ({result.overallRiskScore})")


def test_3_missing_data_handling():
    """Test 3: Missing factor triggers proportional redistribution and is marked DATA_UNAVAILABLE."""
    # Request with missing Soil Moisture and History
    req = RiskAssessmentRequest(
        zoneId="test-zone-missing",
        zoneName="Incomplete Data Sector",
        state="Sikkim",
        rainfall_1h_mm=20.0,
        rainfall_72h_mm=100.0,
        slope_deg=40.0,
        soil_moisture_pct=None,      # Missing
        historical_events_5y=None,    # Missing
        lithology="Weathered Phyllite"
    )
    result = RiskAssessmentEngine.evaluate_risk(req)
    assert "Volumetric Soil Moisture" in result.missingFactorsHandled
    assert "Historical Landslide Frequency" in result.missingFactorsHandled

    # Available weights were 0.38 + 0.29 + 0.06 = 0.73
    # Effective weight of rainfall should be 0.38 / 0.73 ≈ 0.5205
    rain_factor = next(f for f in result.factorContributions if f.factor == "Precipitation & Intensity")
    assert rain_factor.isAvailable is True
    assert rain_factor.status == FactorStatus.AVAILABLE
    assert abs(rain_factor.effectiveWeight - (0.38 / 0.73)) < 0.01

    moist_factor = next(f for f in result.factorContributions if f.factor == "Volumetric Soil Moisture")
    assert moist_factor.isAvailable is False
    assert moist_factor.status == FactorStatus.DATA_UNAVAILABLE
    assert moist_factor.contributionPoints == 0.0
    print("✓ Test 3: Missing factor proportional weight redistribution and data unavailable handling verified")


def test_4_damage_vs_risk_separation():
    """Test 4: Damage Assessment and Risk Assessment remain analytically separate."""
    damage_ctx = ObservedDamageContext(
        totalStructures=10,
        destroyedCount=2,
        majorDamageCount=4,
        minorDamageCount=1,
        noDamageCount=3,
        changeScore=0.55,
        damagedFootprintAreaM2=2500.0,
        damagedStructureDensityPct=70.0,
        verifiedCount=5,
        unverifiedCount=5,
        provenance="IMAGE-DERIVED / OBSERVED",
        isSyntheticFootprints=True
    )

    req = RiskAssessmentRequest(
        zoneId="sikkim-test",
        zoneName="Dikchu Sector",
        state="Sikkim",
        rainfall_1h_mm=10.0,
        rainfall_72h_mm=50.0,
        slope_deg=25.0,
        soil_moisture_pct=50.0,
        historical_events_5y=2,
        lithology="Granite",
        observedDamage=damage_ctx
    )

    result = RiskAssessmentEngine.evaluate_risk(req)
    assert result.observedDamageContext is not None
    assert result.observedDamageContext.totalStructures == 10
    assert result.observedDamageContext.destroyedCount == 2
    assert result.observedDamageContext.provenance == "IMAGE-DERIVED / OBSERVED"

    # Verify that geotechnical risk score calculation does NOT add damaged structure counts directly
    # Granite + low rain + low slope should yield LOW/MODERATE risk regardless of high damage context
    assert result.overallRiskScore < 60.0, f"Geotechnical risk score ({result.overallRiskScore}) should be independent of damage count"
    print("✓ Test 4: Damage Assessment vs Risk Context analytical separation verified")


def test_5_event_history_persistence():
    """Test 5: Event History save, list, retrieve, and delete."""
    test_id = "unit-test-event-2026"
    test_record = HistoricalEventRecord(
        eventId=test_id,
        eventName="Unit Test Landslide Event",
        location="NH-10 Test KM 34",
        state="Sikkim",
        disasterType="LANDSLIDE",
        eventDate="2026-09-20",
        imagery=EventImageryRecord(
            beforeImageRef="test_before.jpg",
            afterImageRef="test_after.jpg"
        ),
        assessment=EventDamageAssessmentSummary(
            totalStructures=5,
            destroyedCount=1,
            majorDamageCount=2,
            minorDamageCount=1,
            noDamageCount=1,
            destroyedPercentage=20.0,
            majorDamagePercentage=40.0,
            minorDamagePercentage=20.0,
            noDamagePercentage=20.0,
            averageConfidence=0.91,
            changeScore=0.35,
            changedAreaM2=12000.0,
            changePercentage=15.0,
            damagedFootprintAreaM2=1100.0
        ),
        verification=EventVerificationSummary(
            verifiedCount=3,
            unverifiedCount=2,
            needsReviewCount=0,
            rejectedCount=0,
            verificationProgressPct=60.0
        ),
        riskAssessment=EventRiskSummary(
            overallRiskScore=65.0,
            riskLevel=RiskLevel.HIGH,
            primaryFactor="Slope",
            secondaryFactor="Rainfall"
        ),
        metadata=EventMetadata(
            engine="EPOCH Test Engine",
            version="2.0.0",
            mode="DEMO",
            recordedAt="2026-09-20T12:00:00Z"
        )
    )

    # Save
    saved = EventHistoryStore.save_event(test_record)
    assert saved.eventId == test_id

    # Retrieve
    retrieved = EventHistoryStore.get_event(test_id)
    assert retrieved is not None
    assert retrieved.eventName == "Unit Test Landslide Event"
    assert retrieved.assessment.totalStructures == 5

    # List
    all_events = EventHistoryStore.list_events()
    assert any(e.eventId == test_id for e in all_events)

    # Reopen
    reopened = EventHistoryStore.reopen_event(test_id)
    assert reopened is not None
    assert reopened["status"] == "REOPENED_INTO_OPERATIONAL_VIEW"
    assert reopened["eventId"] == test_id

    # Delete
    deleted = EventHistoryStore.delete_event(test_id)
    assert deleted is True
    assert EventHistoryStore.get_event(test_id) is None
    print("✓ Test 5: Event History persistence, retrieve, reopen, and delete workflow verified")


def test_6_deterministic_sikkim_reproducibility():
    """Test 6: Deterministic Sikkim NH-10 demonstration reproducibility."""
    res1 = RiskAssessmentEngine.get_sikkim_demo_risk()
    res2 = RiskAssessmentEngine.get_sikkim_demo_risk()

    assert res1.overallRiskScore == res2.overallRiskScore
    assert res1.riskLevel == res2.riskLevel
    assert res1.primaryFactor == res2.primaryFactor
    assert res1.secondaryFactor == res2.secondaryFactor
    assert len(res1.factorContributions) == len(res2.factorContributions)

    for f1, f2 in zip(res1.factorContributions, res2.factorContributions):
        assert f1.factor == f2.factor
        assert f1.contributionPoints == f2.contributionPoints
        assert f1.effectiveWeight == f2.effectiveWeight

    print(f"✓ Test 6: Deterministic Sikkim NH-10 risk reproducibility verified (Score: {res1.overallRiskScore}%, Level: {res1.riskLevel})")


if __name__ == "__main__":
    print("\n--- RUNNING PHASE 3 RISK INTELLIGENCE & EVENT HISTORY TEST SUITE ---")
    test_1_risk_calculation_and_weights()
    test_2_factor_contributions_sum()
    test_3_missing_data_handling()
    test_4_damage_vs_risk_separation()
    test_5_event_history_persistence()
    test_6_deterministic_sikkim_reproducibility()
    print("--- ALL 6 PHASE 3 TESTS PASSED SUCCESSFULLY! ---\n")
