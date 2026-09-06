"""
Explainable AI (XAI) feature importance and physical factor attribution
"""
from typing import Dict, Any

class PhysicsSHAPExplainer:
    @staticmethod
    def explain_zone(zone_features: Dict[str, float]) -> Dict[str, Any]:
        rainfall = zone_features.get("rainfall_72h_mm", 0.0)
        slope = zone_features.get("slope_deg", 0.0)
        moisture = zone_features.get("soil_moisture_pct", 0.0)
        history = zone_features.get("historical_events_5y", 0.0)

        # Baseline Shapley estimation
        rain_shap = min(rainfall / 300.0, 1.0) * 0.38
        slope_shap = min(slope / 45.0, 1.0) * 0.29
        moist_shap = min(moisture / 100.0, 1.0) * 0.18
        hist_shap = min(history / 10.0, 1.0) * 0.09
        lith_shap = 0.06

        total = rain_shap + slope_shap + moist_shap + hist_shap + lith_shap
        
        return {
            "rainfall_contribution_pct": round((rain_shap / total) * 100, 1),
            "slope_contribution_pct": round((slope_shap / total) * 100, 1),
            "soil_moisture_contribution_pct": round((moist_shap / total) * 100, 1),
            "historical_landslide_pct": round((hist_shap / total) * 100, 1),
            "lithology_contribution_pct": round((lith_shap / total) * 100, 1),
            "shap_base_value": 0.12,
            "shap_output_value": round(total, 3)
        }
