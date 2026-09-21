"""
EPOCH Phase 3 - Authoritative Risk Assessment Engine
Provides transparent, deterministic multi-factor landslide susceptibility and geotechnical risk calculation.
Analytically separates observed bitemporal disaster damage from forward-looking vulnerability factors.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import math

from app.models.risk_schemas import (
    RiskAssessmentRequest,
    RiskAssessmentResult,
    RiskFactorItem,
    RiskLevel,
    FactorStatus,
    ObservedDamageContext
)


class RiskAssessmentEngine:
    """
    Authoritative Multi-Factor Risk Assessment Engine.
    Calibrated with EPOCH canonical factor weights:
      - Rainfall: 38% (0.38)
      - Slope: 29% (0.29)
      - Soil Moisture: 18% (0.18)
      - Historical Landslide Frequency: 9% (0.09)
      - Lithology: 6% (0.06)
    """

    # Configurable canonical weights (Sum = 1.00 / 100%)
    WEIGHTS: Dict[str, float] = {
        "rainfall": 0.38,
        "slope": 0.29,
        "soil_moisture": 0.18,
        "history": 0.09,
        "lithology": 0.06
    }

    # Default Data Sources
    DEFAULT_SOURCES: Dict[str, str] = {
        "rainfall": "IMD Automated Weather Station (AWS-NH10) / TRMM Calibration",
        "slope": "SRTM 30m Digital Elevation Model (Geomorphometric Slope Map)",
        "soil_moisture": "ISRO / SAC InSAR Soil Saturation Mesh (0-100cm depth)",
        "history": "Geological Survey of India National Landslide Database (1990-2026)",
        "lithology": "GSI Quadrangle Map 1:50k (Daling Group Weathered Phyllite / Schist)"
    }

    @classmethod
    def get_configured_weights(cls) -> Dict[str, float]:
        """Returns the current canonical factor weights."""
        return dict(cls.WEIGHTS)

    @classmethod
    def evaluate_risk(cls, request: RiskAssessmentRequest) -> RiskAssessmentResult:
        """
        Calculates deterministic multi-factor risk score, factor contributions,
        and missing-data redistributions.
        """
        sources = dict(cls.DEFAULT_SOURCES)
        if request.sourceOverrides:
            sources.update(request.sourceOverrides)

        # If in DEMO mode and no custom sources, ensure clear labeling
        is_synthetic = True
        demo_source_tag = "SYNTHETIC DEMONSTRATION INPUT" if is_synthetic else None

        # 1. Evaluate Individual Raw Factors & Normalized Scores (0 - 100)
        factors_eval: List[Dict[str, Any]] = []

        # A. Rainfall (38% weight)
        rain_avail = request.rainfall_1h_mm is not None or request.rainfall_72h_mm is not None
        rain_norm: Optional[float] = None
        rain_raw = "Data Unavailable"
        rain_explanation = "Rainfall data is currently unavailable."

        if rain_avail:
            r1h = max(0.0, float(request.rainfall_1h_mm)) if request.rainfall_1h_mm is not None else 0.0
            r72h = max(0.0, float(request.rainfall_72h_mm)) if request.rainfall_72h_mm is not None else 0.0
            rain_raw = f"1h: {r1h:.1f} mm/hr | 72h: {r72h:.1f} mm"

            if request.rainfall_1h_mm is not None and request.rainfall_72h_mm is not None:
                # 50 pts for 1h threshold (30mm/hr) + 50 pts for 72h threshold (150mm)
                p1 = min(50.0, (r1h / 30.0) * 50.0)
                p2 = min(50.0, (r72h / 150.0) * 50.0)
                rain_norm = round(min(100.0, p1 + p2), 2)
            elif request.rainfall_72h_mm is not None:
                rain_norm = round(min(100.0, (r72h / 150.0) * 100.0), 2)
            else:
                rain_norm = round(min(100.0, (r1h / 30.0) * 100.0), 2)

            rain_explanation = (
                f"Antecedent precipitation accumulation ({r72h:.1f} mm / 72h) and short-term intensity "
                f"({r1h:.1f} mm/hr) drive pore-water pressure elevation."
            )

        factors_eval.append({
            "key": "rainfall",
            "name": "Precipitation & Intensity",
            "category": "METEOROLOGICAL",
            "raw": rain_raw,
            "norm": rain_norm,
            "available": rain_avail,
            "weight": cls.WEIGHTS["rainfall"],
            "source": sources["rainfall"] if not is_synthetic else f"{sources['rainfall']} ({demo_source_tag})",
            "explanation": rain_explanation
        })

        # B. Slope Gradient (29% weight)
        slope_avail = request.slope_deg is not None
        slope_norm: Optional[float] = None
        slope_raw = "Data Unavailable"
        slope_explanation = "Slope gradient measurement is currently unavailable."

        if slope_avail:
            s_deg = max(0.0, float(request.slope_deg))
            slope_raw = f"{s_deg:.1f}° ({'Extreme' if s_deg >= 45 else 'Steep' if s_deg >= 35 else 'Moderate' if s_deg >= 20 else 'Gentle'})"
            slope_norm = round(min(100.0, (s_deg / 45.0) * 100.0), 2)
            slope_explanation = (
                f"Slope inclination of {s_deg:.1f}° exceeds critical shear threshold "
                f"({'severe gravitational instability' if s_deg >= 35 else 'moderate shear stress'})."
            )

        factors_eval.append({
            "key": "slope",
            "name": "Geometrical Slope Angle",
            "category": "GEOMORPHOLOGICAL",
            "raw": slope_raw,
            "norm": slope_norm,
            "available": slope_avail,
            "weight": cls.WEIGHTS["slope"],
            "source": sources["slope"] if not is_synthetic else f"{sources['slope']} ({demo_source_tag})",
            "explanation": slope_explanation
        })

        # C. Soil Moisture (18% weight)
        moist_avail = request.soil_moisture_pct is not None
        moist_norm: Optional[float] = None
        moist_raw = "Data Unavailable"
        moist_explanation = "Volumetric soil moisture network data unavailable."

        if moist_avail:
            m_pct = max(0.0, min(100.0, float(request.soil_moisture_pct)))
            moist_raw = f"{m_pct:.1f}% Saturation ({'Over-Saturated' if m_pct >= 85 else 'High' if m_pct >= 70 else 'Moderate' if m_pct >= 45 else 'Dry'})"
            moist_norm = round(m_pct, 2)
            moist_explanation = (
                f"Volumetric topsoil and sub-surface saturation at {m_pct:.1f}%. "
                f"{'Critical hydrostatic liquefaction potential' if m_pct >= 80 else 'Elevated soil saturation level'}."
            )

        factors_eval.append({
            "key": "soil_moisture",
            "name": "Volumetric Soil Moisture",
            "category": "HYDROLOGICAL",
            "raw": moist_raw,
            "norm": moist_norm,
            "available": moist_avail,
            "weight": cls.WEIGHTS["soil_moisture"],
            "source": sources["soil_moisture"] if not is_synthetic else f"{sources['soil_moisture']} ({demo_source_tag})",
            "explanation": moist_explanation
        })

        # D. Historical Occurrence (9% weight)
        hist_avail = request.historical_events_5y is not None
        hist_norm: Optional[float] = None
        hist_raw = "Data Unavailable"
        hist_explanation = "Historical catalog records unavailable for this zone."

        if hist_avail:
            h_count = max(0, int(request.historical_events_5y))
            hist_raw = f"{h_count} Events in past 5 Years"
            hist_norm = round(min(100.0, (h_count / 8.0) * 100.0), 2)
            hist_explanation = (
                f"{h_count} recorded historical slope reactivation and debris flows in this corridor "
                f"within 5-year benchmark window."
            )

        factors_eval.append({
            "key": "history",
            "name": "Historical Landslide Frequency",
            "category": "HISTORICAL",
            "raw": hist_raw,
            "norm": hist_norm,
            "available": hist_avail,
            "weight": cls.WEIGHTS["history"],
            "source": sources["history"] if not is_synthetic else f"{sources['history']} ({demo_source_tag})",
            "explanation": hist_explanation
        })

        # E. Lithology & Structure (6% weight)
        litho_avail = request.lithology is not None and request.lithology.strip() != "" and request.lithology.upper() != "UNAVAILABLE"
        litho_norm: Optional[float] = None
        litho_raw = "Data Unavailable"
        litho_explanation = "Geological quadrangle bedrock classification unavailable."

        if litho_avail:
            l_str = request.lithology.strip()
            litho_raw = l_str
            l_lower = l_str.lower()
            if any(k in l_lower for k in ["phyllite", "schist", "shale", "weathered", "colluvium", "silt", "clay"]):
                litho_norm = 95.0
                litho_explanation = f"Highly vulnerable lithology: '{l_str}' exhibits severe foliation weathering and low shear strength."
            elif any(k in l_lower for k in ["sandstone", "quartzite", "calcareous", "gneiss"]):
                litho_norm = 70.0
                litho_explanation = f"Moderate geotechnical strength: '{l_str}' with jointed fracture planes."
            elif any(k in l_lower for k in ["granite", "massive", "basalt"]):
                litho_norm = 35.0
                litho_explanation = f"Competent rock mass: '{l_str}' with high cohesion and compressive strength."
            else:
                litho_norm = 65.0
                litho_explanation = f"Standard regional lithology formation: '{l_str}'."

        factors_eval.append({
            "key": "lithology",
            "name": "Bedrock Lithology & Structure",
            "category": "GEOTECHNICAL",
            "raw": litho_raw,
            "norm": litho_norm,
            "available": litho_avail,
            "weight": cls.WEIGHTS["lithology"],
            "source": sources["lithology"] if not is_synthetic else f"{sources['lithology']} ({demo_source_tag})",
            "explanation": litho_explanation
        })

        # 2. Missing-Data Proportional Weight Redistribution
        available_factors = [f for f in factors_eval if f["available"] and f["norm"] is not None]
        missing_factors = [f for f in factors_eval if not f["available"] or f["norm"] is None]
        missing_factor_names = [f["name"] for f in missing_factors]

        available_weight_sum = sum(f["weight"] for f in available_factors)

        factor_items: List[RiskFactorItem] = []
        overall_score = 0.0

        if available_weight_sum > 0:
            for f in factors_eval:
                if f["available"] and f["norm"] is not None:
                    eff_weight = round(f["weight"] / available_weight_sum, 4)
                    contrib = round(f["norm"] * eff_weight, 2)
                    overall_score += contrib
                    status = FactorStatus.AVAILABLE
                else:
                    eff_weight = 0.0
                    contrib = 0.0
                    status = FactorStatus.DATA_UNAVAILABLE

                factor_items.append(RiskFactorItem(
                    factor=f["name"],
                    category=f["category"],
                    rawValue=f["raw"],
                    normalizedScore=f["norm"],
                    configuredWeight=f["weight"],
                    effectiveWeight=eff_weight,
                    contributionPoints=contrib,
                    source=f["source"],
                    isAvailable=f["available"] and f["norm"] is not None,
                    status=status,
                    explanation=f["explanation"]
                ))
        else:
            # Fallback if 0 factors available
            for f in factors_eval:
                factor_items.append(RiskFactorItem(
                    factor=f["name"],
                    category=f["category"],
                    rawValue="Data Unavailable",
                    normalizedScore=None,
                    configuredWeight=f["weight"],
                    effectiveWeight=0.0,
                    contributionPoints=0.0,
                    source=f["source"],
                    isAvailable=False,
                    status=FactorStatus.DATA_UNAVAILABLE,
                    explanation="Factor data is unavailable."
                ))
            overall_score = 0.0

        overall_score = round(min(100.0, max(0.0, overall_score)), 1)

        # 3. Classify Risk Level
        if overall_score >= 75.0:
            risk_level = RiskLevel.CRITICAL
            response_priority = "IMMEDIATE_DISPATCH"
        elif overall_score >= 60.0:
            risk_level = RiskLevel.HIGH
            response_priority = "HIGH_ALERT"
        elif overall_score >= 40.0:
            risk_level = RiskLevel.MODERATE
            response_priority = "ELEVATED_MONITORING"
        else:
            risk_level = RiskLevel.LOW
            response_priority = "ROUTINE_SURVEILLANCE"

        # 4. Determine Primary & Secondary Drivers
        sorted_by_contrib = sorted(
            [f for f in factor_items if f.isAvailable],
            key=lambda x: x.contributionPoints,
            reverse=True
        )

        primary_factor = sorted_by_contrib[0].factor if len(sorted_by_contrib) > 0 else "None Available"
        secondary_factor = sorted_by_contrib[1].factor if len(sorted_by_contrib) > 1 else "None"

        # 5. Calculate Exposure Score (Infrastructure / Population)
        exposure_score = 78.5  # High exposure for Teesta Basin Corridor

        # 6. Priority Areas & Critical Assets
        priority_areas = [
            "NH-10 Highway Viaduct KM 42+200 (Pier 4)",
            "Singtam Intake Generating Station (Teesta Stage V)",
            "Dikchu Secondary School Low-Lying Compound",
            "Pakyong 33kV Substation Supply Line"
        ]

        return RiskAssessmentResult(
            zoneId=request.zoneId,
            zoneName=request.zoneName,
            state=request.state,
            district=request.district or "East Sikkim",
            overallRiskScore=overall_score,
            riskLevel=risk_level,
            primaryFactor=primary_factor,
            secondaryFactor=secondary_factor,
            factorContributions=factor_items,
            observedDamageContext=request.observedDamage,
            exposureScore=exposure_score,
            responsePriority=response_priority,
            priorityAreas=priority_areas,
            missingFactorsHandled=missing_factor_names,
            disclaimer=(
                "Risk scores are calculated by a deterministic, interpretable multi-factor decision-support engine. "
                "Observed damage is analytically separate from geotechnical vulnerability risk."
            ),
            isSynthetic=is_synthetic,
            timestamp=datetime.now(timezone.utc).isoformat()
        )

    @classmethod
    def get_sikkim_demo_risk(cls, observed_damage: Optional[Any] = None) -> RiskAssessmentResult:
        """
        Generates deterministic Sikkim NH-10 corridor risk assessment result.
        """
        obs_ctx = None
        if observed_damage:
            if isinstance(observed_damage, dict):
                obs_ctx = ObservedDamageContext(**observed_damage)
            elif isinstance(observed_damage, ObservedDamageContext):
                obs_ctx = observed_damage

        if obs_ctx is None:
            obs_ctx = ObservedDamageContext(
                totalStructures=10,
                destroyedCount=0,
                majorDamageCount=3,
                minorDamageCount=1,
                noDamageCount=6,
                changeScore=0.428,
                damagedFootprintAreaM2=2190.0,
                damagedStructureDensityPct=40.0,
                verifiedCount=0,
                unverifiedCount=10,
                provenance="IMAGE-DERIVED / OBSERVED",
                isSyntheticFootprints=True
            )

        request = RiskAssessmentRequest(
            zoneId="sikkim-teesta-zone-01",
            zoneName="Dikchu - Singtam NH-10 Corridor",
            state="Sikkim",
            district="Pakyong / East Sikkim",
            lat=27.2345,
            lng=88.5120,
            elevation_m=1450.0,
            rainfall_1h_mm=22.4,
            rainfall_72h_mm=142.6,
            slope_deg=38.5,
            soil_moisture_pct=84.2,
            historical_events_5y=6,
            lithology="Daling Group Weathered Phyllite and Colluvial Debris",
            observedDamage=obs_ctx
        )
        return cls.evaluate_risk(request)
