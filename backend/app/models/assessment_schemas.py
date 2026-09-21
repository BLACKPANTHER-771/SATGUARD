"""
EPOCH Phase 2 - Authoritative Damage Assessment Schemas
Standardized data contracts for Bitemporal Scene Pairs, Damage Features, 4-Tier Classifications,
Confidence Ratings, Human Verification, and Assessment Statistics.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class DamageClass(str, Enum):
    DESTROYED = "DESTROYED"
    MAJOR_DAMAGE = "MAJOR_DAMAGE"
    MINOR_DAMAGE = "MINOR_DAMAGE"
    NO_DAMAGE = "NO_DAMAGE"


class VerificationStatus(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    NEEDS_REVIEW = "NEEDS_REVIEW"


class AssessmentMode(str, Enum):
    DEMO = "DEMO"
    UPLOADED = "UPLOADED"


class ProcessingStage(str, Enum):
    READY = "READY"
    LOADING_IMAGERY = "LOADING_IMAGERY"
    VALIDATING = "VALIDATING"
    ALIGNING = "ALIGNING"
    DETECTING_CHANGE = "DETECTING_CHANGE"
    ANALYSING_STRUCTURES = "ANALYSING_STRUCTURES"
    EXTRACTING_FEATURES = "EXTRACTING_FEATURES"
    CLASSIFYING = "CLASSIFYING"
    CALCULATING_CONFIDENCE = "CALCULATING_CONFIDENCE"
    COMPLETE = "COMPLETE"
    PROCESSING_ERROR = "PROCESSING_ERROR"


class BitemporalScenePair(BaseModel):
    eventId: str
    sceneId: str
    title: str
    location: Dict[str, Any]
    beforeImage: str  # URL, relative path, or data URI
    afterImage: str   # URL, relative path, or data URI
    acquisitionDates: Dict[str, str] = Field(default_factory=lambda: {"before": "2026-08-14", "after": "2026-09-02"})
    sensor: str = "Optical High-Resolution Demonstration Imagery"
    resolutionGsd: str = "Source-dependent / demonstration scene"
    mode: AssessmentMode = AssessmentMode.DEMO
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DamageFeatures(BaseModel):
    pixelChange: float = Field(0.0, ge=0.0, le=1.0, description="Normalized pixel/colour intensity shift (0-1)")
    edgeChange: float = Field(0.0, ge=0.0, le=1.0, description="Structural boundary & gradient change (0-1)")
    textureChange: float = Field(0.0, ge=0.0, le=1.0, description="Local entropy & texture variance difference (0-1)")
    structuralChange: float = Field(0.0, ge=0.0, le=1.0, description="Composite geometric structural deformation (0-1)")
    areaChange: float = Field(0.0, ge=0.0, le=1.0, description="Footprint area displacement ratio (0-1)")
    builtUpChange: float = Field(0.0, ge=0.0, le=1.0, description="Surrounding built-up density transition (0-1)")
    disappearanceEvidence: float = Field(0.0, ge=0.0, le=1.0, description="Envelope disruption / loss score (0-1)")
    appearanceEvidence: float = Field(0.0, ge=0.0, le=1.0, description="Debris / sediment encroachment score (0-1)")


class DamageMapItem(BaseModel):
    structureId: str
    geometry: Dict[str, Any]
    damageClass: DamageClass
    confidence: float


class DetectedStructure(BaseModel):
    structureId: str
    name: str
    geometry: Dict[str, Any]  # Normalized bounding box [x, y, w, h] or polygon coordinates
    centerLat: float
    centerLng: float
    footprintAreaM2: float
    beforeEvidence: Optional[str] = None
    afterEvidence: Optional[str] = None
    features: DamageFeatures
    changeScore: float
    structuralChangeScore: float
    damageClass: DamageClass
    confidence: float
    verificationStatus: VerificationStatus = VerificationStatus.UNVERIFIED
    explanation: str
    isSyntheticFootprint: bool = True
    assessorNotes: Optional[str] = None
    verifiedBy: Optional[str] = None
    verifiedAt: Optional[str] = None


class AssessmentStatistics(BaseModel):
    totalStructures: int
    destroyedCount: int
    majorDamageCount: int
    minorDamageCount: int
    noDamageCount: int
    destroyedPercentage: float
    majorDamagePercentage: float
    minorDamagePercentage: float
    noDamagePercentage: float
    averageConfidence: float
    verifiedCount: int
    unverifiedCount: int
    needsReviewCount: int
    totalFootprintAreaM2: float
    damagedFootprintAreaM2: float


class ChangeDetectionSummary(BaseModel):
    changeScore: float = Field(..., ge=0.0, le=1.0)
    changedAreaM2: float
    changePercentage: float
    noiseFiltered: bool = True
    changeMaskBase64: Optional[str] = None
    hotspotCount: int = 0
    disclaimer: str = "Deterministic RGB difference analysis. Not multispectral/SAR."


class AssessmentResult(BaseModel):
    eventId: str
    sceneId: str
    mode: AssessmentMode
    sceneMetadata: Dict[str, Any]
    changeDetection: ChangeDetectionSummary
    structures: List[DetectedStructure]
    statistics: AssessmentStatistics
    damageMapData: List[DamageMapItem]
    processingMetadata: Dict[str, Any]


class AnalyzeSceneRequest(BaseModel):
    eventId: Optional[str] = "sikkim-teesta-flood-2026"
    sceneId: Optional[str] = "sikkim-nh10-dikchu-sector"
    mode: AssessmentMode = AssessmentMode.DEMO
    beforeImageBase64: Optional[str] = None
    afterImageBase64: Optional[str] = None
    customLocation: Optional[Dict[str, Any]] = None


class VerificationActionRequest(BaseModel):
    sceneId: str
    structureId: str
    action: str  # VERIFY, REJECT, NEEDS_REVIEW, MODIFY_CLASSIFICATION
    modifiedClass: Optional[DamageClass] = None
    notes: Optional[str] = None
    assessorId: Optional[str] = "NDRF_GEOSPATIAL_OFFICER_01"
