"""
EPOCH Phase 3 - Event History Schemas
Defines structured schema for persistent historical disaster event records.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.models.risk_schemas import RiskLevel, RiskFactorItem, ObservedDamageContext


class EventImageryRecord(BaseModel):
    beforeImageRef: str = Field(..., description="URI or path to pre-disaster imagery")
    afterImageRef: str = Field(..., description="URI or path to post-disaster imagery")
    sensor: str = Field("Sentinel-2 MSI / Demonstration EO", description="Satellite sensor")
    acquisitionDates: str = Field("28 Aug 2026 / 03 Sept 2026", description="Acquisition timestamps")
    resolution: str = Field("source-dependent / demonstration imagery", description="Ground sampling distance")


class EventDamageAssessmentSummary(BaseModel):
    totalStructures: int = Field(..., description="Total candidate structures analyzed")
    destroyedCount: int = Field(0, description="Structures classified as Destroyed")
    majorDamageCount: int = Field(0, description="Structures classified as Major Damage")
    minorDamageCount: int = Field(0, description="Structures classified as Minor Damage")
    noDamageCount: int = Field(0, description="Structures classified as No Damage")
    destroyedPercentage: float = 0.0
    majorDamagePercentage: float = 0.0
    minorDamagePercentage: float = 0.0
    noDamagePercentage: float = 0.0
    averageConfidence: float = 0.0
    changeScore: float = 0.0
    changedAreaM2: float = 0.0
    changePercentage: float = 0.0
    damagedFootprintAreaM2: float = 0.0


class EventVerificationSummary(BaseModel):
    verifiedCount: int = 0
    unverifiedCount: int = 0
    needsReviewCount: int = 0
    rejectedCount: int = 0
    verificationProgressPct: float = 0.0
    lastVerifiedAt: Optional[str] = None


class EventRiskSummary(BaseModel):
    overallRiskScore: float = 0.0
    riskLevel: RiskLevel = RiskLevel.MODERATE
    primaryFactor: str = "Rainfall"
    secondaryFactor: str = "Slope"
    factorContributions: List[RiskFactorItem] = Field(default_factory=list)


class EventMetadata(BaseModel):
    engine: str = "EPOCH Unified Disaster Assessment Engine"
    version: str = "2.0.0-PROTOTYPE"
    mode: str = Field("DEMO", description="DEMO | UPLOADED | REAL")
    recordedAt: str
    recordedBy: str = "EPOCH Institutional Operations Desk"
    notes: Optional[str] = None


class HistoricalEventRecord(BaseModel):
    eventId: str = Field(..., description="Unique event identifier")
    eventName: str = Field(..., description="Descriptive event title")
    location: str = Field(..., description="Geographic location / corridor")
    state: str = Field(..., description="State name")
    district: Optional[str] = Field(None, description="District name")
    disasterType: str = Field(..., description="Type of natural hazard event")
    eventDate: str = Field(..., description="Date of occurrence")
    imagery: EventImageryRecord
    assessment: EventDamageAssessmentSummary
    verification: EventVerificationSummary
    riskAssessment: EventRiskSummary
    metadata: EventMetadata
    tags: List[str] = Field(default_factory=list)
