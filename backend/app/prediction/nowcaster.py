import copy
from typing import Dict, Any, List
from app.geospatial.spatial_service import SpatialService
from app.risk_engine.calculator import LandslideRiskEngine

class TemporalNowcaster:
    @staticmethod
    def get_forecast_state(offset_minutes: int) -> Dict[str, Any]:
        """
        Simulates tactical forecast at NOW (0), +30m (30), +1h (60), +2h (120), +3h (180).
        Dynamically evolves rainfall intensity, soil saturation, and landslide susceptibility for every zone.
        """
        raw_data = SpatialService.load_raw_data()
        
        # Rainfall progression multipliers across time
        multipliers = {
            0: 1.0,
            30: 1.18,
            60: 1.38,
            120: 1.52,
            180: 1.05
        }
        mult = multipliers.get(offset_minutes, 1.0 + (offset_minutes / 180.0) * 0.4)

        evolved_zones = []
        high_risk_count = 0
        max_prob = 0.0

        for zone in raw_data["risk_zones"]:
            z = copy.deepcopy(zone)
            # Extrapolate rainfall and moisture
            z["rainfall_1h_mm"] = round(z["rainfall_1h_mm"] * mult, 1)
            z["rainfall_72h_mm"] = round(z["rainfall_72h_mm"] + (z["rainfall_1h_mm"] * (offset_minutes / 60.0)), 1)
            z["soil_moisture_pct"] = round(min(z["soil_moisture_pct"] * (1.0 + (mult - 1.0) * 0.15), 98.5), 1)

            # Recalculate with physics engine
            calc_result = LandslideRiskEngine.calculate_susceptibility(
                rainfall_1h_mm=z["rainfall_1h_mm"],
                rainfall_72h_mm=z["rainfall_72h_mm"],
                slope_deg=z["slope_deg"],
                soil_moisture_pct=z["soil_moisture_pct"],
                historical_events_5y=z["historical_events_5y"],
                lithology_type=z["lithology"]
            )

            z["landslide_probability"] = calc_result["landslide_probability"]
            z["risk_level"] = calc_result["risk_level"]
            if "risk_drivers_explanation" in z:
                z["risk_drivers_explanation"].update(calc_result["explainability"])
            if "explainability" in z:
                z["explainability"].update(calc_result["explainability"])
            
            z["impact_priority_score"] = LandslideRiskEngine.calculate_impact_priority(
                z["landslide_probability"], z["exposure_score"], z["vulnerability_score"]
            )
            z["projected_3h_expansion_pct"] = round(z["projected_3h_expansion_pct"] * (1.0 + (offset_minutes / 180.0) * 0.6), 1)

            if z["landslide_probability"] > max_prob:
                max_prob = z["landslide_probability"]
            if z["risk_level"] in ["HIGH", "CRITICAL"]:
                high_risk_count += 1

            evolved_zones.append(z)

        time_label_map = {0: "NOW", 30: "+30m", 60: "+1h", 120: "+2h", 180: "+3h"}
        
        return {
            "offset_minutes": offset_minutes,
            "time_label": time_label_map.get(offset_minutes, f"+{offset_minutes}m"),
            "rainfall_multiplier": mult,
            "max_landslide_probability": max_prob,
            "current_risk_index_pct": int(max_prob * 100),
            "high_risk_zones_count": high_risk_count,
            "rainfall_intensity_mm_hr": round(raw_data["summary_metrics"]["current_rainfall_intensity_mm_hr"] * mult, 1),
            "zones": evolved_zones
        }
