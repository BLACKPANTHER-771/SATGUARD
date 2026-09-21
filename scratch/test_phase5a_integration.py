"""
Test Phase 5A Integration Suite
Validates Damage Engine ↔ Multi-Scene Assessment, Verification, and Contract Integrity.
"""

from app.damage_engine.orchestrator import AssessmentEngine
from app.damage_engine.verification_engine import VerificationEngine
from app.models.assessment_schemas import (
    AnalyzeSceneRequest,
    VerificationActionRequest,
    DamageClass,
    VerificationStatus,
    AssessmentMode
)


def test_scene_01_dikchu_assessment():
    res = AssessmentEngine.run_assessment(AnalyzeSceneRequest(sceneId="sikkim-nh10-dikchu-sector"))
    assert res.sceneId == "sikkim-nh10-dikchu-sector"
    assert len(res.structures) == 10
    assert res.structures[0].structureId.startswith("SK-DKC-")
    assert all(s.isSyntheticFootprint is True for s in res.structures)
    assert res.statistics.totalStructures == 10
    print("✓ Scene 01 (Dikchu) Assessment Verified")


def test_scene_02_chungthang_assessment():
    res = AssessmentEngine.run_assessment(AnalyzeSceneRequest(sceneId="sikkim-chungthang-basin"))
    assert res.sceneId == "sikkim-chungthang-basin"
    assert len(res.structures) == 10
    assert res.structures[0].structureId.startswith("SK-CTG-")
    assert all(s.isSyntheticFootprint is True for s in res.structures)
    assert res.statistics.totalStructures == 10
    print("✓ Scene 02 (Chungthang) Assessment Verified")


def test_scene_03_singtam_assessment():
    res = AssessmentEngine.run_assessment(AnalyzeSceneRequest(sceneId="sikkim-singtam-dikchu"))
    assert res.sceneId == "sikkim-singtam-dikchu"
    assert len(res.structures) == 10
    assert res.structures[0].structureId.startswith("SK-SNG-")
    assert all(s.isSyntheticFootprint is True for s in res.structures)
    assert res.statistics.totalStructures == 10
    print("✓ Scene 03 (Singtam) Assessment Verified")


def test_verification_across_scenes():
    scene_id = "sikkim-singtam-dikchu"
    res = AssessmentEngine.run_assessment(AnalyzeSceneRequest(sceneId=scene_id))
    target_id = res.structures[0].structureId

    # Apply Human Verification
    req = VerificationActionRequest(
        sceneId=scene_id,
        structureId=target_id,
        action="VERIFY",
        assessorId="NDRF_EO_ASSESSOR_01"
    )
    updated = VerificationEngine.apply_verification_action(res, req)
    verified_struct = next(s for s in updated.structures if s.structureId == target_id)
    assert verified_struct.verificationStatus == VerificationStatus.VERIFIED
    assert updated.statistics.verifiedCount >= 1
    print("✓ Human Verification Propagation Verified")


if __name__ == "__main__":
    print("--- RUNNING PHASE 5A INTEGRATION SUITE ---")
    test_scene_01_dikchu_assessment()
    test_scene_02_chungthang_assessment()
    test_scene_03_singtam_assessment()
    test_verification_across_scenes()
    print("--- ALL PHASE 5A INTEGRATION TESTS PASSED ---")
