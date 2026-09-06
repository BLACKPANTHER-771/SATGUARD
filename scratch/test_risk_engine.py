import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
from app.risk_engine.calculator import LandslideRiskEngine

def test_dynamic_factors():
    print("==================================================")
    print("1. DYNAMIC FACTOR TESTING")
    print("==================================================")

    # Base parameters
    base = {
        "rainfall_1h_mm": 35.0,
        "rainfall_72h_mm": 180.0,
        "slope_deg": 35.0,
        "soil_moisture_pct": 80.0,
        "historical_events_5y": 5,
        "lithology_type": "Weathered Biotite Gneiss & Mica Schist"
    }

    base_res = LandslideRiskEngine.calculate_susceptibility(**base)
    print(f"Base Configuration Score: {base_res['risk_score']} ({base_res['risk_level']})")
    print(f"Base Contributions: {base_res['factor_contributions']}")
    print(f"Sum of Contributions: {sum(base_res['factor_contributions'].values()):.1f}")
    assert abs(sum(base_res['factor_contributions'].values()) - base_res['risk_score']) <= 0.5, "Sum of contributions must equal risk score"

    # Test 1: Change ONLY rainfall
    print("\n--- Testing ONLY Rainfall change ---")
    low_rain = dict(base, rainfall_1h_mm=5.0, rainfall_72h_mm=20.0)
    low_rain_res = LandslideRiskEngine.calculate_susceptibility(**low_rain)
    print(f"Low Rain Score: {low_rain_res['risk_score']} ({low_rain_res['risk_level']}) | Rain Contrib: {low_rain_res['factor_contributions']['rainfall']}")
    assert low_rain_res['factor_contributions']['rainfall'] < base_res['factor_contributions']['rainfall'], "Rainfall contribution must decrease"
    assert low_rain_res['risk_score'] < base_res['risk_score'], "Total risk score must decrease"
    assert low_rain_res['factor_contributions']['slope'] == base_res['factor_contributions']['slope'], "Slope contribution must remain unchanged"

    # Test 2: Change ONLY slope
    print("\n--- Testing ONLY Slope change ---")
    flat_slope = dict(base, slope_deg=10.0)
    flat_slope_res = LandslideRiskEngine.calculate_susceptibility(**flat_slope)
    print(f"Flat Slope Score: {flat_slope_res['risk_score']} ({flat_slope_res['risk_level']}) | Slope Contrib: {flat_slope_res['factor_contributions']['slope']}")
    assert flat_slope_res['factor_contributions']['slope'] < base_res['factor_contributions']['slope'], "Slope contribution must decrease"
    assert flat_slope_res['factor_contributions']['rainfall'] == base_res['factor_contributions']['rainfall'], "Rainfall contribution must remain unchanged"

    # Test 3: Change ONLY soil moisture
    print("\n--- Testing ONLY Soil Moisture change ---")
    dry_soil = dict(base, soil_moisture_pct=20.0)
    dry_soil_res = LandslideRiskEngine.calculate_susceptibility(**dry_soil)
    print(f"Dry Soil Score: {dry_soil_res['risk_score']} ({dry_soil_res['risk_level']}) | Moisture Contrib: {dry_soil_res['factor_contributions']['soil_moisture']}")
    assert dry_soil_res['factor_contributions']['soil_moisture'] < base_res['factor_contributions']['soil_moisture'], "Moisture contribution must decrease"

    # Test 4: Change ONLY historical events
    print("\n--- Testing ONLY Historical Events change ---")
    zero_hist = dict(base, historical_events_5y=0)
    zero_hist_res = LandslideRiskEngine.calculate_susceptibility(**zero_hist)
    print(f"Zero History Score: {zero_hist_res['risk_score']} ({zero_hist_res['risk_level']}) | History Contrib: {zero_hist_res['factor_contributions']['history']}")
    assert zero_hist_res['factor_contributions']['history'] < base_res['factor_contributions']['history'], "History contribution must decrease"

    # Test 5: Change ONLY lithology
    print("\n--- Testing ONLY Lithology change ---")
    hard_rock = dict(base, lithology_type="Archaean Granite Gneiss")
    hard_rock_res = LandslideRiskEngine.calculate_susceptibility(**hard_rock)
    print(f"Hard Granite Score: {hard_rock_res['risk_score']} ({hard_rock_res['risk_level']}) | Lithology Contrib: {hard_rock_res['factor_contributions']['lithology']}")
    assert hard_rock_res['factor_contributions']['lithology'] < base_res['factor_contributions']['lithology'], "Lithology contribution must decrease"

def test_missing_data():
    print("\n==================================================")
    print("2. MISSING DATA HANDLING TEST")
    print("==================================================")
    
    # Missing rainfall
    missing_rain = {
        "rainfall_1h_mm": None,
        "rainfall_72h_mm": None,
        "slope_deg": 35.0,
        "soil_moisture_pct": 80.0,
        "historical_events_5y": 5,
        "lithology_type": "Weathered Biotite Gneiss & Mica Schist"
    }
    res = LandslideRiskEngine.calculate_susceptibility(**missing_rain)
    print(f"Missing Rainfall Result: Score={res['risk_score']}, Factor Scores={res['factor_scores']}")
    print(f"Contributions={res['factor_contributions']}")
    assert res['factor_scores']['rainfall'] is None, "Missing factor score must be None"
    assert res['factor_contributions']['rainfall'] == 0.0, "Missing factor contribution must be 0"
    assert abs(sum(res['factor_contributions'].values()) - res['risk_score']) <= 0.5, "Sum of available contributions must equal risk score"

def test_sikkim_and_assam():
    print("\n==================================================")
    print("3. SIKKIM & ASSAM ZONE DATASET CALCULATION AUDIT")
    print("==================================================")
    data_path = Path(__file__).resolve().parent.parent / "data/synthetic/ner_risk_data.json"
    with open(data_path, "r") as f:
        data = json.load(f)

    for z in data["risk_zones"]:
        calc = LandslideRiskEngine.calculate_susceptibility(
            rainfall_1h_mm=z.get("rainfall_1h_mm"),
            rainfall_72h_mm=z.get("rainfall_72h_mm"),
            slope_deg=z.get("slope_deg"),
            soil_moisture_pct=z.get("soil_moisture_pct"),
            historical_events_5y=z.get("historical_events_5y"),
            lithology_type=z.get("lithology")
        )
        print(f"Zone: {z['id']} ({z['state']}) -> Score={calc['risk_score']}% Level={calc['risk_level']} [Rain={calc['factor_contributions']['rainfall']}pts, Slope={calc['factor_contributions']['slope']}pts, Soil={calc['factor_contributions']['soil_moisture']}pts, Hist={calc['factor_contributions']['history']}pts, Litho={calc['factor_contributions']['lithology']}pts]")
        assert calc['risk_level'] in ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']

if __name__ == "__main__":
    test_dynamic_factors()
    test_missing_data()
    test_sikkim_and_assam()
    print("\nALL PYTHON ENGINE TESTS PASSED SUCCESSFULLY!")
