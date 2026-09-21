"""
EPOCH Phase 3 - Risk Assessment Schemas
Defines structured data models for multi-factor risk intelligence, factor contributions,
and image-derived damage context.
"""

from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class FactorStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    DATA_UNAVAILABLE = "DATA_UNAVAILABLE"
    SYNTHETIC = "SYNTHETIC"


class RiskFactorItem(BaseModel):
    factor: str = Field(..., description="Factor name (e.g., Rainfall, Slope, Soil Moisture)")
    category: str = Field(..., description="Factor scientific category")
    rawValue: str = Field(..., description="Human-readable raw measured/simulated value")
    normalizedScore: Optional[float] = Field(None, description="Normalized score on 0.0 - 100.0 scale")
    configuredWeight: float = Field(..., description="Configured baseline weight (e.g., 0.38 for Rainfall)")
    effectiveWeight: float = Field(..., description="Weight after missing-factor proportional redistribution")
    contributionPoints: float = Field(0.0, description="Exact points contributed to the overall risk score")
    source: str = Field(..., description="Authoritative data source or SYNTHETIC DEMONSTRATION INPUT")
    isAvailable: bool = Field(True, description="Whether data for this factor was available")
    status: FactorStatus = Field(FactorStatus.AVAILABLE, description="Availability status")
    explanation: str = Field(..., description="Scientific explainability narrative for this factor")


class ObservedDamageContext(BaseModel):
    """
    Encapsulates Phase 2 Damage Assessment outputs for contextual awareness.
    Analytically distinct from the geotechnical risk score.
    """
    totalStructures: int = 0
    destroyedCount: int = 0
    majorDamageCount: int = 0
    minorDamageCount: int = 0
    noDamageCount: int = 0
    changeScore: float = 0.0
    damagedFootprintAreaM2: float = 0.0
    damagedStructureDensityPct: float = 0.0
    verifiedCount: int = 0
    unverifiedCount: int = 0
    provenance: str = "IMAGE-DERIVED / OBSERVED"
    isSyntheticFootprints: bool = True


class RiskAssessmentRequest(BaseModel):
    zoneId: str = Field("sikkim-teesta-zone-01", description="Identifier of the risk zone")
    zoneName: str = Field("Dikchu - Singtam Teesta Basin", description="Human-readable name")
    state: str = Field("Sikkim", description="Target state")
    district: Optional[str] = Field("East Sikkim", description="Target district")
    lat: Optional[float] = Field(27.2345, description="Latitude")
    lng: Optional[float] = Field(88.5120, description="Longitude")
    elevation_m: Optional[float] = Field(1450.0, description="Elevation AMSL")
    rainfall_1h_mm: Optional[float] = Field(None, description="1-hour rainfall intensity (mm/hr)")
    rainfall_72h_mm: Optional[float] = Field(None, description="72-hour antecedent precipitation (mm)")
    slope_deg: Optional[float] = Field(None, description="Slope gradient in degrees")
    soil_moisture_pct: Optional[float] = Field(None, description="Volumetric soil moisture percentage (0-100)")
    historical_events_5y: Optional[int] = Field(None, description="Historical landslide frequency in 5 years")
    lithology: Optional[str] = Field(None, description="Geological rock/soil formation")
    observedDamage: Optional[ObservedDamageContext] = Field(None, description="Observed Phase 2 damage context")
    sourceOverrides: Optional[Dict[str, str]] = Field(None, description="Custom data source labels")


class RiskAssessmentResult(BaseModel):
    zoneId: str
    zoneName: str
    state: str
    district: str
    overallRiskScore: float = Field(..., description="Overall calculated risk score (0 - 100)")
    riskLevel: RiskLevel = Field(..., description="4-tier risk classification")
    primaryFactor: str = Field(..., description="Highest contributing risk factor")
    secondaryFactor: str = Field(..., description="Second highest contributing risk factor")
    factorContributions: List[RiskFactorItem] = Field(..., description="Detailed transparent factor breakdown")
    observedDamageContext: Optional[ObservedDamageContext] = Field(None, description="Observed Phase 2 damage context")
    exposureScore: float = Field(..., description="Infrastructure & population exposure score (0 - 100)")
    responsePriority: str = Field(..., description="Response priority (IMMEDIATE, HIGH, ELEVATED, STANDARD)")
    priorityAreas: List[str] = Field(default_factory=list, description="Specific vulnerable assets/settlements")
    missingFactorsHandled: List[str] = Field(default_factory=list, description="List of unavailable factors redistributed")
    disclaimer: str = Field(
        "Risk scores are calculated by a deterministic, interpretable multi-factor decision-support engine. "
        "Observed damage is analytically separate from geotechnical vulnerability risk.",
        description="Scientific and operational disclaimer"
    )
    isSynthetic: bool = Field(True, description="Whether inputs or footprints are demonstration data")
    timestamp: str
