"""
Feature extraction and terrain attribute engineering for landslide risk modeling
"""
from typing import Dict, Any, List

def extract_geotechnical_features(raw_zone: Dict[str, Any]) -> Dict[str, float]:
    """
    Extracts normalized ML features for Susceptibility Inference
    """
    return {
        "slope_deg": float(raw_zone.get("slope_deg", 0.0)),
        "elevation_m": float(raw_zone.get("elevation_m", 0.0)),
        "soil_moisture_pct": float(raw_zone.get("soil_moisture_pct", 0.0)),
        "rainfall_1h_mm": float(raw_zone.get("rainfall_1h_mm", 0.0)),
        "rainfall_24h_mm": float(raw_zone.get("rainfall_24h_mm", 0.0)),
        "rainfall_72h_mm": float(raw_zone.get("rainfall_72h_mm", 0.0)),
        "historical_events_5y": float(raw_zone.get("historical_events_5y", 0.0)),
        "curvature": float(raw_zone.get("curvature", 0.0))
    }
