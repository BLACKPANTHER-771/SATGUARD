"""
EPOCH — Interpretable Multi-Factor Landslide Risk Engine (Backend Core)
Deterministic Multi-Criteria Landslide Susceptibility & Decision Support Engine
Calibrated for Himalayan and North Eastern Geomorphology (SIH26001)
"""
import math
from typing import Dict, Any, Optional, List

class LandslideRiskEngine:
    ENGINE_NAME = "INTERPRETABLE MULTI-FACTOR RISK ENGINE"
    DISCLAIMER = (
        "Risk scores are calculated by a deterministic, interpretable multi-factor decision-support engine. "
        "This is NOT a black-box trained ML model or an engineering Factor-of-Safety calculation."
    )

    # Canonical Multi-Factor Weights (Sum = 1.00 / 100%)
    WEIGHT_RAINFALL = 0.40       # 40%
    WEIGHT_SLOPE = 0.26          # 26%
    WEIGHT_SOIL_MOISTURE = 0.18  # 18%
    WEIGHT_HISTORICAL = 0.09     # 9%
    WEIGHT_LITHOLOGY = 0.07      # 7%

    @classmethod
    def calculate_susceptibility(
        cls,
        rainfall_1h_mm: Optional[float] = None,
        rainfall_72h_mm: Optional[float] = None,
        slope_deg: Optional[float] = None,
        soil_moisture_pct: Optional[float] = None,
        historical_events_5y: Optional[int] = None,
        lithology_type: Optional[str] = None,
        lithology: Optional[str] = None
    ) -> Dict[str, Any]:
        l_type = lithology if lithology is not None else lithology_type
        """
        Calculates deterministic multi-factor landslide susceptibility score (0-100),
        probability (0.00-1.00), factor scores, and exact point contributions.
        Formula:
          Score = (Rainfall_norm * 0.40) + (Slope_norm * 0.26) + (Moisture_norm * 0.18) + (History_norm * 0.09) + (Lithology_norm * 0.07)
        """
        # 1. Normalize each factor to 0 - 100 scale

        # A. Rainfall (40% weight): Intensity threshold 30mm/hr (50 pts), 72h accumulation threshold 150mm (50 pts)
        rain_norm = None
        rain_available = False
        if rainfall_1h_mm is not None or rainfall_72h_mm is not None:
            rain_available = True
            r1h = max(0.0, float(rainfall_1h_mm)) if rainfall_1h_mm is not None else None
            r72h = max(0.0, float(rainfall_72h_mm)) if rainfall_72h_mm is not None else None

            if r1h is not None and r72h is not None:
                rain_norm = min(100.0, max(0.0, (r1h / 30.0 * 50.0) + (r72h / 150.0 * 50.0)))
            elif r1h is not None:
                rain_norm = min(100.0, max(0.0, (r1h / 30.0) * 100.0))
            elif r72h is not None:
                rain_norm = min(100.0, max(0.0, (r72h / 150.0) * 100.0))

        # B. Slope (26% weight): 45 deg threshold
        slope_norm = None
        slope_available = False
        if slope_deg is not None:
            slope_available = True
            s_deg = max(0.0, float(slope_deg))
            slope_norm = min(100.0, max(0.0, (s_deg / 45.0) * 100.0))

        # C. Soil Moisture (18% weight): Direct percentage 0-100%
        moisture_norm = None
        moisture_available = False
        if soil_moisture_pct is not None:
            moisture_available = True
            m_pct = max(0.0, float(soil_moisture_pct))
            moisture_norm = min(100.0, max(0.0, m_pct))

        # D. Historical Landslides (9% weight): 8 events in 5y threshold
        hist_norm = None
        hist_available = False
        if historical_events_5y is not None:
            hist_available = True
            h_count = max(0, int(historical_events_5y))
            hist_norm = min(100.0, max(0.0, (h_count / 8.0) * 100.0))

        # E. Lithology & Structure (7% weight): Weakness rating 0-100
        litho_norm = None
        litho_available = False
        if l_type and l_type.upper() != "UNAVAILABLE" and l_type.strip() != "":
            litho_available = True
            l_str = l_type.lower()
            if any(k in l_str for k in ["shale", "phyllite", "schist", "weathered", "colluvium", "silt"]):
                litho_norm = 95.0
            elif any(k in l_str for k in ["sandstone", "quartzite", "calcareous", "gneiss"]):
                litho_norm = 70.0
            elif any(k in l_str for k in ["granite", "massive", "basalt"]):
                litho_norm = 35.0
            else:
                litho_norm = 65.0

        # Missing Data Policy:
        # If any factor is missing, redistribute weights proportionally among available factors
        factors = [
            {"id": "rainfall", "weight": cls.WEIGHT_RAINFALL, "norm": rain_norm, "available": rain_available},
            {"id": "slope", "weight": cls.WEIGHT_SLOPE, "norm": slope_norm, "available": slope_available},
            {"id": "soil_moisture", "weight": cls.WEIGHT_SOIL_MOISTURE, "norm": moisture_norm, "available": moisture_available},
            {"id": "history", "weight": cls.WEIGHT_HISTORICAL, "norm": hist_norm, "available": hist_available},
            {"id": "lithology", "weight": cls.WEIGHT_LITHOLOGY, "norm": litho_norm, "available": litho_available}
        ]

        avail_weight_sum = sum(f["weight"] for f in factors if f["available"])
        raw_score = 0.0
        contributions = {}

        for f in factors:
            if f["available"] and f["norm"] is not None and avail_weight_sum > 0.0:
                eff_weight = f["weight"] / avail_weight_sum
                pts = f["norm"] * eff_weight
                contributions[f["id"]] = round(pts, 1)
                raw_score += pts
            else:
                contributions[f["id"]] = 0.0

        risk_score = round(raw_score) if avail_weight_sum > 0.0 else 0
        risk_score = min(100, max(0, risk_score))
        landslide_probability = round(risk_score / 100.0, 2)

        # Risk level determination
        if risk_score >= 75:
            risk_level = "CRITICAL"
        elif risk_score >= 60:
            risk_level = "HIGH"
        elif risk_score >= 40:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"

        # Percentage contributions of total score
        percentages = {}
        for f_id, pts in contributions.items():
            if raw_score > 0.0:
                percentages[f_id] = round((pts / raw_score) * 100.0, 1)
            else:
                percentages[f_id] = 0.0

        return {
            "risk_score": risk_score,
            "landslide_probability": landslide_probability,
            "risk_level": risk_level,
            "factor_scores": {
                "rainfall": round(rain_norm, 1) if rain_norm is not None else None,
                "slope": round(slope_norm, 1) if slope_norm is not None else None,
                "soil_moisture": round(moisture_norm, 1) if moisture_norm is not None else None,
                "history": round(hist_norm, 1) if hist_norm is not None else None,
                "lithology": round(litho_norm, 1) if litho_norm is not None else None
            },
            "factor_contributions": contributions,
            "explainability": {
                "rainfall_contribution_pct": percentages["rainfall"],
                "slope_contribution_pct": percentages["slope"],
                "soil_moisture_contribution_pct": percentages["soil_moisture"],
                "historical_landslide_pct": percentages["history"],
                "lithology_contribution_pct": percentages["lithology"]
            },
            "provenance": "SYNTHETIC",
            "model_description": cls.ENGINE_NAME,
            "disclaimer": cls.DISCLAIMER
        }

    @classmethod
    def evaluate_exposure(
        cls,
        population: Optional[int] = None,
        villages: Optional[List[str]] = None,
        roads: Optional[List[str]] = None,
        bridges: Optional[List[str]] = None,
        hospitals: Optional[List[str]] = None,
        schools: Optional[List[str]] = None,
        critical_infra: Optional[List[str]] = None,
        raw_facilities: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Authoritative Deterministic Exposure Evaluation Engine (Phase 3)
        7 Weighted Categories:
        - Population (25%): min(100, (pop / 5000) * 100)
        - Villages (15%): min(100, count * 33.33)
        - Roads (25%): NH=100, SH=75, MDR=50, Local=30
        - Bridges (10%): >=2/Major=100, 1=60, 0=0
        - Hospitals (10%): District/Civil=100, PHC/CHC=60, 0=0
        - Schools (5%): Secondary/College/Shelter=100, School=60, 0=0
        - Critical Infrastructure (10%): Power/Hydro/Dam/Railway=100, Other=50, 0=0
        """
        facilities = raw_facilities or []
        
        # Parse bridges
        b_list = bridges if bridges is not None else [f for f in facilities if any(k in f.lower() for k in ["bridge", "span", "viaduct", "culvert"])]
        # Parse hospitals
        h_list = hospitals if hospitals is not None else [f for f in facilities if any(k in f.lower() for k in ["hospital", "health", "phc", "chc", "clinic", "sub-centre"])]
        # Parse schools
        s_list = schools if schools is not None else [f for f in facilities if any(k in f.lower() for k in ["school", "college", "shelter", "community center"])]
        # Parse critical infra
        i_list = critical_infra if critical_infra is not None else [f for f in facilities if not any(k in f.lower() for k in ["hospital", "health", "phc", "school", "college"])]

        pop_norm = min(100.0, max(0.0, (population / 5000.0) * 100.0)) if population is not None else None
        vill_norm = min(100.0, len(villages) * 33.33) if villages is not None else None
        
        road_norm = None
        if roads is not None:
            if any("nh-" in r.lower() or "national" in r.lower() for r in roads):
                road_norm = 100.0
            elif any("sh-" in r.lower() or "state highway" in r.lower() or "highway" in r.lower() or "corridor" in r.lower() or "lifeline" in r.lower() for r in roads):
                road_norm = 75.0
            elif any("mdr" in r.lower() or "arterial" in r.lower() or "link" in r.lower() for r in roads):
                road_norm = 50.0
            elif len(roads) > 0:
                road_norm = 30.0
            else:
                road_norm = 0.0

        bridge_norm = None
        if bridges is not None or len(facilities) > 0:
            if len(b_list) >= 2 or any("major" in b.lower() or "railway span" in b.lower() or "interstate" in b.lower() for b in b_list):
                bridge_norm = 100.0
            elif len(b_list) == 1:
                bridge_norm = 60.0
            else:
                bridge_norm = 0.0

        hospital_norm = None
        if hospitals is not None or len(facilities) > 0:
            if any("district hospital" in h.lower() or "civil hospital" in h.lower() or "hospital" in h.lower() for h in h_list):
                hospital_norm = 100.0
            elif len(h_list) > 0:
                hospital_norm = 60.0
            else:
                hospital_norm = 0.0

        school_norm = None
        if schools is not None or len(facilities) > 0:
            if any("secondary" in s.lower() or "college" in s.lower() or "shelter" in s.lower() for s in s_list):
                school_norm = 100.0
            elif len(s_list) > 0:
                school_norm = 60.0
            else:
                school_norm = 0.0

        infra_norm = None
        if critical_infra is not None or len(facilities) > 0:
            if any(any(k in inf.lower() for k in ["hydro", "power", "dam", "substation", "railway", "tunnel", "pipeline", "tower", "border post"]) for inf in i_list):
                infra_norm = 100.0
            elif len(i_list) > 0:
                infra_norm = 50.0
            else:
                infra_norm = 0.0

        weights = [
            ("pop", pop_norm, 0.25),
            ("vill", vill_norm, 0.15),
            ("road", road_norm, 0.25),
            ("bridge", bridge_norm, 0.10),
            ("hospital", hospital_norm, 0.10),
            ("school", school_norm, 0.05),
            ("infra", infra_norm, 0.10),
        ]

        avail = [x for x in weights if x[1] is not None]
        total_avail_w = sum(x[2] for x in avail)

        raw_score = sum(x[1] * (x[2] / total_avail_w) for x in avail) if total_avail_w > 0 else 0.0
        exposure_score = min(100, max(0, round(raw_score)))

        return {
            "exposure_score": exposure_score,
            "population_exposed": population,
            "exposed_villages": villages or [],
            "vulnerable_road_segments": roads or [],
            "threatened_bridges": b_list,
            "exposed_hospitals": h_list,
            "exposed_schools": s_list,
            "critical_infrastructure": i_list,
            "provenance": "SYNTHETIC / DEMONSTRATION DATA"
        }

    @classmethod
    def calculate_response_priority(
        cls,
        risk_score: int,
        exposure_score: int,
        roads: Optional[List[str]] = None,
        population: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Formula: Response Priority Score = round(Risk Score * 0.55 + Exposure Score * 0.45)
        """
        priority_score = min(100, max(0, round((risk_score * 0.55) + (exposure_score * 0.45))))
        primary_asset = (roads or ["lifeline transport corridor"])[0]
        pop_str = f" ({population:,} residents)" if population else ""

        if priority_score >= 70 or (risk_score >= 75 and exposure_score >= 50):
            level = "PRIORITY_1"
            rationale = f"Critical landslide risk ({risk_score}%) intersecting high exposure assets (Exposure: {exposure_score}/100, Priority Score: {priority_score}). Urgent multi-agency emergency intervention, SDRF staging, and corridor evacuation required for {primary_asset}{pop_str}."
        elif priority_score >= 50 or (risk_score >= 60 and exposure_score >= 35):
            level = "PRIORITY_2"
            rationale = f"Elevated landslide risk ({risk_score}%) with active exposure (Exposure: {exposure_score}/100, Priority Score: {priority_score}). Pre-positioning heavy earthmoving clearance units, hospital alert, and continuous UAV reconnaissance advised."
        elif priority_score >= 30 or risk_score >= 40:
            level = "PRIORITY_3"
            rationale = f"Moderate risk ({risk_score}%) with monitored sector assets (Exposure: {exposure_score}/100, Priority Score: {priority_score}). Enhanced road patrols, culvert and drainage clearing, and periodic telemetry verification recommended."
        else:
            level = "PRIORITY_4"
            rationale = f"Baseline risk ({risk_score}%) with low exposure impact (Exposure: {exposure_score}/100, Priority Score: {priority_score}). Standard automated sensor heartbeat monitoring and situational logging active."

        return {
            "response_priority": level,
            "response_priority_score": priority_score,
            "priority_rationale": rationale
        }

    @classmethod
    def assess_connectivity_and_infrastructure(
        cls,
        roads: Optional[List[str]] = None,
        bridges: Optional[List[str]] = None,
        raw_facilities: Optional[List[str]] = None,
        risk_level: str = "MODERATE",
        population: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Deterministic Road Connectivity & Critical Infrastructure Assessment (Phase 4)
        """
        is_roads_provided = roads is not None
        is_facilities_provided = raw_facilities is not None
        is_bridges_provided = bridges is not None

        if not is_roads_provided and not is_facilities_provided and not is_bridges_provided:
            return {
                "impact_level": "UNAVAILABLE",
                "impact_summary": "Transportation and infrastructure asset telemetry UNAVAILABLE for this sector.",
                "affected_roads": [],
                "threatened_bridges": [],
                "critical_facilities": [],
                "isolation_risk": "UNAVAILABLE"
            }

        roads_list = roads or []
        affected_roads = []
        for idx, r_name in enumerate(roads_list):
            r_lower = r_name.lower()
            if any(k in r_lower for k in ["railway", "rail line", "track", "train", "nf rail"]):
                r_class = "RAILWAY"
            elif "nh-" in r_lower or "national" in r_lower:
                r_class = "NH"
            elif any(k in r_lower for k in ["sh-", "state highway", "highway", "corridor", "lifeline"]):
                r_class = "SH"
            elif any(k in r_lower for k in ["mdr", "arterial", "link"]):
                r_class = "MDR"
            else:
                r_class = "LOCAL"

            risk_rel = "INSIDE" if idx == 0 else "NEAR"
            if risk_level == "CRITICAL":
                status = "POTENTIAL_DISRUPTION"
                status_label = "Potential Connectivity Disruption — Priority Corridor Watch"
            elif risk_level == "HIGH":
                status = "AT_RISK"
                status_label = "At Risk — Preventive Patrol Active"
            elif risk_level == "MODERATE":
                status = "OPEN_MONITORING"
                status_label = "Open — Monitored Catchment Sector"
            else:
                status = "OPEN_MONITORING"
                status_label = "Open / Routine Monitoring"

            affected_roads.append({
                "id": f"ROAD-{idx + 1}",
                "name": r_name,
                "road_class": r_class,
                "risk_relationship": risk_rel,
                "connectivity_status": status,
                "status_label": status_label
            })

        facilities_list = raw_facilities or []
        b_list = bridges if bridges is not None else [f for f in facilities_list if any(k in f.lower() for k in ["bridge", "span", "viaduct", "culvert"])]
        
        threatened_bridges = []
        parent_road = roads_list[0] if roads_list else "Lifeline Road Sector"
        for idx, b_name in enumerate(b_list):
            threatened_bridges.append({
                "id": f"BRG-{idx + 1}",
                "name": b_name,
                "carrying_road": parent_road,
                "risk_relationship": "INSIDE" if idx == 0 else "NEAR",
                "status": "At Risk — Verification Required" if risk_level in ["CRITICAL", "HIGH"] else "Operational / Monitoring",
                "provenance": "SYNTHETIC / DEMONSTRATION DATA"
            })

        unique_facilities = []
        for f in facilities_list:
            if f not in unique_facilities:
                unique_facilities.append(f)

        crit_facilities = []
        for idx, f_name in enumerate(unique_facilities):
            f_lower = f_name.lower()
            if any(k in f_lower for k in ["hospital", "health", "phc", "chc", "clinic"]):
                cat = "HOSPITAL"
            elif any(k in f_lower for k in ["school", "college", "shelter"]):
                cat = "SCHOOL"
            elif any(k in f_lower for k in ["hydro", "dam", "powerhouse"]):
                cat = "HYDRO"
            elif any(k in f_lower for k in ["substation", "power", "electric"]):
                cat = "POWER"
            elif any(k in f_lower for k in ["railway", "station", "track"]):
                cat = "RAILWAY"
            elif any(k in f_lower for k in ["water", "pipeline", "intake"]):
                cat = "WATER"
            elif any(k in f_lower for k in ["defense", "border post", "bro"]):
                cat = "DEFENSE"
            else:
                cat = "OTHER"

            crit_facilities.append({
                "id": f"FAC-{idx + 1}",
                "name": f_name,
                "category": cat,
                "risk_relationship": "INSIDE" if idx == 0 else "NEAR",
                "status": "AT RISK — FIELD VERIFICATION REQUIRED" if risk_level in ["CRITICAL", "HIGH"] else "OPERATIONAL / STANDARD LOGGING",
                "provenance": "SYNTHETIC / DEMONSTRATION DATA"
            })

        has_nh = any(r["road_class"] == "NH" for r in affected_roads)
        has_sh = any(r["road_class"] == "SH" for r in affected_roads)
        has_major_brg = len(threatened_bridges) > 0
        has_rail = any(f["category"] == "RAILWAY" for f in crit_facilities)

        if (has_nh or (has_sh and has_major_brg) or has_rail) and risk_level in ["CRITICAL", "HIGH"]:
            impact_level = "CRITICAL"
            impact_summary = f"Critical arterial connectivity impact: National Highway ({affected_roads[0]['name'] if affected_roads else 'Lifeline'}) or rail link intersects high hazard zone. Potential isolation of regional transport corridor."
        elif (has_sh or has_major_brg or len(affected_roads) >= 2) and risk_level != "LOW":
            impact_level = "HIGH"
            impact_summary = "High connectivity impact: State Highway or strategic bridge threatened. Pre-positioning of clearance units and alternative route inspection recommended."
        elif len(affected_roads) > 0 and risk_level != "LOW":
            impact_level = "MODERATE"
            impact_summary = "Moderate connectivity impact: Local district connecting roads monitored for localized cut-slope blockages."
        elif len(affected_roads) == 0 and len(crit_facilities) == 0:
            impact_level = "LOW"
            impact_summary = "Low connectivity impact: No major transportation lifelines in direct hazard zone envelope."
        else:
            impact_level = "LOW"
            impact_summary = "Baseline risk across monitored infrastructure assets."

        pop = population or 0
        isolation_risk = "CRITICAL" if (impact_level == "CRITICAL" and pop > 1000) else "HIGH" if impact_level in ["CRITICAL", "HIGH"] else "MODERATE" if impact_level == "MODERATE" else "LOW"

        return {
            "impact_level": impact_level,
            "impact_summary": impact_summary,
            "affected_roads": affected_roads,
            "threatened_bridges": threatened_bridges,
            "critical_facilities": crit_facilities,
            "isolation_risk": isolation_risk
        }
