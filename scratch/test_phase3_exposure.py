import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.risk_engine.calculator import LandslideRiskEngine

def test_phase3():
    print("================================================================")
    print("EPOCH PHASE 3: RISK x EXPOSURE = RESPONSE PRIORITY TEST SUITE")
    print("================================================================")

    # 1. Sikkim Critical Zone (Dikchu KM 19)
    print("\n--- 1. SIKKIM CRITICAL ZONE TEST (Dikchu KM 19) ---")
    sikkim_risk = LandslideRiskEngine.calculate_susceptibility(
        rainfall_1h_mm=38.4,
        rainfall_72h_mm=265.0,
        slope_deg=34.8,
        soil_moisture_pct=81.0,
        historical_events_5y=6,
        lithology="Weathered Biotite Gneiss & Mica Schist"
    )
    sikkim_exp = LandslideRiskEngine.evaluate_exposure(
        population=1420,
        villages=["Dikchu Basti", "Lower Singtam", "Melli Colony"],
        roads=["NH-10 Teesta Lifeline Road (KM 18-24)", "Dikchu Bridge Approach"],
        bridges=["Dikchu River Bridge"],
        hospitals=["Dikchu Primary Health Sub-Centre"],
        schools=[],
        critical_infra=["Singtam Hydro Power Substation"]
    )
    sikkim_prio = LandslideRiskEngine.calculate_response_priority(
        risk_score=sikkim_risk["risk_score"],
        exposure_score=sikkim_exp["exposure_score"],
        roads=sikkim_exp["vulnerable_road_segments"],
        population=sikkim_exp["population_exposed"]
    )

    print(f"Risk Score: {sikkim_risk['risk_score']}% ({sikkim_risk['risk_level']})")
    print(f"Exposure Score: {sikkim_exp['exposure_score']}/100")
    print(f"Response Priority: {sikkim_prio['response_priority']} (Score: {sikkim_prio['response_priority_score']})")
    print(f"Rationale: {sikkim_prio['priority_rationale']}")
    assert sikkim_risk["risk_level"] == "CRITICAL"
    assert sikkim_prio["response_priority"] == "PRIORITY_1"

    # 2. Assam Critical Zone (Haflong Ghat NH-27)
    print("\n--- 2. ASSAM CRITICAL ZONE TEST (Haflong Ghat NH-27) ---")
    assam_risk = LandslideRiskEngine.calculate_susceptibility(
        rainfall_1h_mm=42.0,
        rainfall_72h_mm=310.0,
        slope_deg=36.2,
        soil_moisture_pct=88.0,
        historical_events_5y=9,
        lithology="Disang Shale & Sandstone Alternation"
    )
    assam_exp = LandslideRiskEngine.evaluate_exposure(
        population=2100,
        villages=["Jatinga Valley Settlement", "Lower Haflong Railway Colony"],
        roads=["NH-27 East-West Corridor", "Lumding-Badarpur Railway Line"],
        bridges=["Diyung River Railway Span", "Haflong Valley Viaduct"],
        hospitals=["Haflong Civil Hospital Access"],
        schools=["Haflong Government College / Shelter"],
        critical_infra=["Railway Traction Substation", "NF Railway Hill Alignment"]
    )
    assam_prio = LandslideRiskEngine.calculate_response_priority(
        risk_score=assam_risk["risk_score"],
        exposure_score=assam_exp["exposure_score"],
        roads=assam_exp["vulnerable_road_segments"],
        population=assam_exp["population_exposed"]
    )

    print(f"Risk Score: {assam_risk['risk_score']}% ({assam_risk['risk_level']})")
    print(f"Exposure Score: {assam_exp['exposure_score']}/100")
    print(f"Response Priority: {assam_prio['response_priority']} (Score: {assam_prio['response_priority_score']})")
    print(f"Rationale: {assam_prio['priority_rationale']}")
    assert assam_risk["risk_level"] == "CRITICAL"
    assert assam_prio["response_priority"] == "PRIORITY_1"

    # 3. HIGH Zone Test (Mangan - Chungthang)
    print("\n--- 3. HIGH RISK ZONE TEST (Mangan - Chungthang) ---")
    mangan_risk = LandslideRiskEngine.calculate_susceptibility(
        rainfall_1h_mm=26.0,
        rainfall_72h_mm=160.0,
        slope_deg=38.0,
        soil_moisture_pct=72.0,
        historical_events_5y=4,
        lithology="Foliated Daling Phyllite & Schist"
    )
    mangan_exp = LandslideRiskEngine.evaluate_exposure(
        population=3800,
        villages=["Mangan Bazaar", "Chungthang Hub"],
        roads=["North Sikkim Highway (Mangan-Chungthang Axis)"],
        bridges=["Chungthang Confluence Bridge"],
        hospitals=["Mangan District Hospital"],
        schools=[],
        critical_infra=["Teesta III Hydro Facility", "BRO Border Post"]
    )
    mangan_prio = LandslideRiskEngine.calculate_response_priority(
        risk_score=mangan_risk["risk_score"],
        exposure_score=mangan_exp["exposure_score"],
        roads=mangan_exp["vulnerable_road_segments"],
        population=mangan_exp["population_exposed"]
    )
    print(f"Risk Score: {mangan_risk['risk_score']}% ({mangan_risk['risk_level']})")
    print(f"Exposure Score: {mangan_exp['exposure_score']}/100")
    print(f"Response Priority: {mangan_prio['response_priority']} (Score: {mangan_prio['response_priority_score']})")
    assert mangan_risk["risk_level"] in ["HIGH", "CRITICAL"]

    # 4. MODERATE Zone Test (Upper Martam Ridge)
    print("\n--- 4. MODERATE RISK ZONE TEST (Upper Martam Ridge) ---")
    martam_risk = LandslideRiskEngine.calculate_susceptibility(
        rainfall_1h_mm=14.0,
        rainfall_72h_mm=85.0,
        slope_deg=24.0,
        soil_moisture_pct=58.0,
        historical_events_5y=2,
        lithology="Quartzite & Phyllite Alternation"
    )
    martam_exp = LandslideRiskEngine.evaluate_exposure(
        population=850,
        villages=["Martam Ridge Hamlet", "Upper Valley Farmsteads"],
        roads=["Singtam - Martam Ridge Service Road"],
        bridges=[],
        hospitals=["Local Health Clinic"],
        schools=["Martam Secondary School"],
        critical_infra=[]
    )
    martam_prio = LandslideRiskEngine.calculate_response_priority(
        risk_score=martam_risk["risk_score"],
        exposure_score=martam_exp["exposure_score"],
        roads=martam_exp["vulnerable_road_segments"],
        population=martam_exp["population_exposed"]
    )
    print(f"Risk Score: {martam_risk['risk_score']}% ({martam_risk['risk_level']})")
    print(f"Exposure Score: {martam_exp['exposure_score']}/100")
    print(f"Response Priority: {martam_prio['response_priority']} (Score: {martam_prio['response_priority_score']})")
    assert martam_risk["risk_level"] == "MODERATE"
    assert martam_prio["response_priority"] == "PRIORITY_3"

    # 5. Missing / Unavailable Exposure Data Test
    print("\n--- 5. UNAVAILABLE EXPOSURE DATA TEST ---")
    unavail_exp = LandslideRiskEngine.evaluate_exposure(
        population=None,
        villages=None,
        roads=["SH-5 Secondary Corridor"],
        bridges=None,
        hospitals=None,
        schools=None,
        critical_infra=None
    )
    unavail_prio = LandslideRiskEngine.calculate_response_priority(
        risk_score=70,
        exposure_score=unavail_exp["exposure_score"],
        roads=unavail_exp["vulnerable_road_segments"],
        population=unavail_exp["population_exposed"]
    )
    print(f"Partial Exposure (Only roads provided): Score = {unavail_exp['exposure_score']}/100")
    print(f"Response Priority: {unavail_prio['response_priority']} (Score: {unavail_prio['response_priority_score']})")
    assert unavail_exp["population_exposed"] is None
    assert unavail_exp["exposure_score"] == 75  # SH road normalized to 75, only available factor -> 75/100

    print("\nALL PHASE 3 TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_phase3()
