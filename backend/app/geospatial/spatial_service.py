import json
import os
from typing import List, Dict, Any, Optional

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data", "synthetic", "ner_risk_data.json")

class SpatialService:
    @staticmethod
    def load_raw_data() -> Dict[str, Any]:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def get_geojson_zones() -> Dict[str, Any]:
        data = SpatialService.load_raw_data()
        features = []
        for zone in data.get("risk_zones", []):
            lat = zone["lat"]
            lng = zone["lng"]
            # Generate a realistic hexagonal/irregular mountain polygon around center point
            delta = 0.012
            coords = [
                [lng - delta * 0.8, lat - delta * 0.5],
                [lng - delta * 0.4, lat + delta * 0.8],
                [lng + delta * 0.6, lat + delta * 0.7],
                [lng + delta * 0.9, lat - delta * 0.2],
                [lng + delta * 0.3, lat - delta * 0.9],
                [lng - delta * 0.8, lat - delta * 0.5]
            ]
            feature = {
                "type": "Feature",
                "id": zone["id"],
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [coords]
                },
                "properties": {
                    "id": zone["id"],
                    "name": zone["name"],
                    "state": zone["state"],
                    "district": zone["district"],
                    "probability": zone["landslide_probability"],
                    "risk_level": zone["risk_level"],
                    "slope_deg": zone["slope_deg"],
                    "soil_moisture_pct": zone["soil_moisture_pct"],
                    "rainfall_1h_mm": zone["rainfall_1h_mm"],
                    "impact_priority": zone["impact_priority"],
                    "population_exposed": zone["population_exposed"]
                }
            }
            features.append(feature)

        return {
            "type": "FeatureCollection",
            "features": features
        }
