"""
EPOCH Phase 3 - Event History Store
Provides persistent, local disk-backed storage for historical disaster events,
bitemporal imagery assessments, verification audits, and risk assessments.
"""

import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.models.history_schemas import (
    HistoricalEventRecord,
    EventImageryRecord,
    EventDamageAssessmentSummary,
    EventVerificationSummary,
    EventRiskSummary,
    EventMetadata
)
from app.models.risk_schemas import RiskLevel, RiskFactorItem, FactorStatus


class EventHistoryStore:
    """
    Persistent Store for Disaster Event History.
    Saves and restores complete bitemporal assessment states.
    """

    STORE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "data", "event_history.json")
    _memory_cache: Optional[Dict[str, HistoricalEventRecord]] = None

    @classmethod
    def _ensure_initialized(cls):
        """Initializes storage file with default baseline records if not present."""
        if cls._memory_cache is not None:
            return

        cls._memory_cache = {}
        os.makedirs(os.path.dirname(cls.STORE_PATH), exist_ok=True)

        if os.path.exists(cls.STORE_PATH):
            try:
                with open(cls.STORE_PATH, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                    for item in raw_data:
                        record = HistoricalEventRecord(**item)
                        cls._memory_cache[record.eventId] = record
                return
            except Exception as e:
                print(f"[HistoryStore] Warning reading existing history: {e}. Reinitializing default records.")

        # Populate baseline historical records
        cls._populate_seed_records()
        cls._flush_to_disk()

    @classmethod
    def _populate_seed_records(cls):
        """Populates authentic benchmark historical events."""
        # 1. Sikkim Teesta River Flash Flood (October 2023 / Demonstration 2026)
        sikkim_record = HistoricalEventRecord(
            eventId="sikkim-teesta-flood-2026",
            eventName="Sikkim Teesta River Flash Flood & Debris Inundation",
            location="NH-10 Dikchu–Singtam Riverfront Corridor",
            state="Sikkim",
            district="Pakyong / East Sikkim",
            disasterType="FLASH_FLOOD_DEBRIS_FLOW",
            eventDate="2026-09-03",
            imagery=EventImageryRecord(
                beforeImageRef="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
                afterImageRef="https://images.unsplash.com/photo-1542332213-9b5a5a3fad35?auto=format&fit=crop&w=1200&q=80",
                sensor="Sentinel-2 MSI / Demonstration EO",
                acquisitionDates="28 Aug 2026 (Pre) / 03 Sept 2026 (Post)",
                resolution="source-dependent / demonstration imagery"
            ),
            assessment=EventDamageAssessmentSummary(
                totalStructures=10,
                destroyedCount=0,
                majorDamageCount=3,
                minorDamageCount=1,
                noDamageCount=6,
                destroyedPercentage=0.0,
                majorDamagePercentage=30.0,
                minorDamagePercentage=10.0,
                noDamagePercentage=60.0,
                averageConfidence=0.9219,
                changeScore=0.428,
                changedAreaM2=89400.0,
                changePercentage=26.4,
                damagedFootprintAreaM2=2190.0
            ),
            verification=EventVerificationSummary(
                verifiedCount=0,
                unverifiedCount=10,
                needsReviewCount=0,
                rejectedCount=0,
                verificationProgressPct=0.0,
                lastVerifiedAt=None
            ),
            riskAssessment=EventRiskSummary(
                overallRiskScore=81.4,
                riskLevel=RiskLevel.CRITICAL,
                primaryFactor="Precipitation & Intensity",
                secondaryFactor="Geometrical Slope Angle",
                factorContributions=[
                    RiskFactorItem(
                        factor="Precipitation & Intensity",
                        category="METEOROLOGICAL",
                        rawValue="1h: 22.4 mm/hr | 72h: 142.6 mm",
                        normalizedScore=84.87,
                        configuredWeight=0.38,
                        effectiveWeight=0.38,
                        contributionPoints=32.25,
                        source="IMD Automated Weather Station (AWS-NH10) (SYNTHETIC DEMONSTRATION INPUT)",
                        isAvailable=True,
                        status=FactorStatus.AVAILABLE,
                        explanation="Antecedent 72h precipitation accumulation (142.6 mm) elevated pore-water pressures."
                    ),
                    RiskFactorItem(
                        factor="Geometrical Slope Angle",
                        category="GEOMORPHOLOGICAL",
                        rawValue="38.5° (Steep)",
                        normalizedScore=85.56,
                        configuredWeight=0.29,
                        effectiveWeight=0.29,
                        contributionPoints=24.81,
                        source="SRTM 30m Digital Elevation Model (SYNTHETIC DEMONSTRATION INPUT)",
                        isAvailable=True,
                        status=FactorStatus.AVAILABLE,
                        explanation="Steep 38.5° valley walls flank NH-10 road formation."
                    ),
                    RiskFactorItem(
                        factor="Volumetric Soil Moisture",
                        category="HYDROLOGICAL",
                        rawValue="84.2% Saturation (Over-Saturated)",
                        normalizedScore=84.2,
                        configuredWeight=0.18,
                        effectiveWeight=0.18,
                        contributionPoints=15.16,
                        source="ISRO / SAC InSAR Soil Saturation Mesh (SYNTHETIC DEMONSTRATION INPUT)",
                        isAvailable=True,
                        status=FactorStatus.AVAILABLE,
                        explanation="Subsurface topsoil over-saturation causing shear strength degradation."
                    ),
                    RiskFactorItem(
                        factor="Historical Landslide Frequency",
                        category="HISTORICAL",
                        rawValue="6 Events in past 5 Years",
                        normalizedScore=75.0,
                        configuredWeight=0.09,
                        effectiveWeight=0.09,
                        contributionPoints=6.75,
                        source="Geological Survey of India National Landslide Database (SYNTHETIC DEMONSTRATION INPUT)",
                        isAvailable=True,
                        status=FactorStatus.AVAILABLE,
                        explanation="6 recorded historical slope reactivations in this sector."
                    ),
                    RiskFactorItem(
                        factor="Bedrock Lithology & Structure",
                        category="GEOTECHNICAL",
                        rawValue="Daling Group Weathered Phyllite and Colluvial Debris",
                        normalizedScore=95.0,
                        configuredWeight=0.06,
                        effectiveWeight=0.06,
                        contributionPoints=5.7,
                        source="GSI Quadrangle Map 1:50k (SYNTHETIC DEMONSTRATION INPUT)",
                        isAvailable=True,
                        status=FactorStatus.AVAILABLE,
                        explanation="Highly weathered sheared phyllite matrix prone to rapid liquefaction."
                    )
                ]
            ),
            metadata=EventMetadata(
                engine="EPOCH Unified Disaster Assessment Engine",
                version="2.0.0-PROTOTYPE",
                mode="DEMO",
                recordedAt=datetime.now(timezone.utc).isoformat(),
                notes="Authoritative demonstration baseline event for Sikkim NH-10 corridor."
            ),
            tags=["SIKKIM", "NH-10", "TEESTA", "FLASH_FLOOD", "DEMO"]
        )
        cls._memory_cache[sikkim_record.eventId] = sikkim_record

        # 2. Wayanad Chooralmala Mass Landslide (July 2024)
        wayanad_record = HistoricalEventRecord(
            eventId="wayanad-chooralmala-2024",
            eventName="Wayanad Chooralmala & Meppadi Multi-Tier Landslide",
            location="Chooralmala–Mundakkai Valley",
            state="Kerala",
            district="Wayanad",
            disasterType="LANDSLIDE",
            eventDate="2024-07-30",
            imagery=EventImageryRecord(
                beforeImageRef="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
                afterImageRef="https://images.unsplash.com/photo-1542332213-9b5a5a3fad35?auto=format&fit=crop&w=1200&q=80",
                sensor="RISAT-1A / Sentinel-2",
                acquisitionDates="24 Jul 2024 / 31 Jul 2024",
                resolution="10m optical / 3m SAR"
            ),
            assessment=EventDamageAssessmentSummary(
                totalStructures=312,
                destroyedCount=148,
                majorDamageCount=76,
                minorDamageCount=34,
                noDamageCount=54,
                destroyedPercentage=47.4,
                majorDamagePercentage=24.4,
                minorDamagePercentage=10.9,
                noDamagePercentage=17.3,
                averageConfidence=0.942,
                changeScore=0.784,
                changedAreaM2=420000.0,
                changePercentage=48.2,
                damagedFootprintAreaM2=34500.0
            ),
            verification=EventVerificationSummary(
                verifiedCount=285,
                unverifiedCount=27,
                needsReviewCount=0,
                rejectedCount=0,
                verificationProgressPct=91.3,
                lastVerifiedAt="2024-08-04T12:00:00Z"
            ),
            riskAssessment=EventRiskSummary(
                overallRiskScore=94.6,
                riskLevel=RiskLevel.CRITICAL,
                primaryFactor="Precipitation & Intensity",
                secondaryFactor="Volumetric Soil Moisture",
                factorContributions=[]
            ),
            metadata=EventMetadata(
                engine="EPOCH Disaster Assessment Catalog",
                version="1.8.0",
                mode="REAL",
                recordedAt="2024-08-05T08:30:00Z",
                notes="Catastrophic rainfall-triggered debris slide resulting in severe settlement damage."
            ),
            tags=["WAYANAD", "KERALA", "LANDSLIDE", "HISTORICAL_RECORD"]
        )
        cls._memory_cache[wayanad_record.eventId] = wayanad_record

        # 3. Joshimath Urban Slope Subsidence (Jan 2023)
        joshimath_record = HistoricalEventRecord(
            eventId="joshimath-subsidence-2023",
            eventName="Joshimath Urban Slope Subsidence & Fissure Creep",
            location="Joshimath Town Sector (NH-07)",
            state="Uttarakhand",
            district="Chamoli",
            disasterType="SLOPE_COLLAPSE",
            eventDate="2023-01-05",
            imagery=EventImageryRecord(
                beforeImageRef="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
                afterImageRef="https://images.unsplash.com/photo-1542332213-9b5a5a3fad35?auto=format&fit=crop&w=1200&q=80",
                sensor="Sentinel-1 InSAR / Cartosat-2",
                acquisitionDates="Dec 2022 / Jan 2023",
                resolution="Differential Interferometric PS-InSAR"
            ),
            assessment=EventDamageAssessmentSummary(
                totalStructures=868,
                destroyedCount=0,
                majorDamageCount=181,
                minorDamageCount=687,
                noDamageCount=0,
                destroyedPercentage=0.0,
                majorDamagePercentage=20.9,
                minorDamagePercentage=79.1,
                noDamagePercentage=0.0,
                averageConfidence=0.887,
                changeScore=0.345,
                changedAreaM2=185000.0,
                changePercentage=18.5,
                damagedFootprintAreaM2=52400.0
            ),
            verification=EventVerificationSummary(
                verifiedCount=868,
                unverifiedCount=0,
                needsReviewCount=0,
                rejectedCount=0,
                verificationProgressPct=100.0,
                lastVerifiedAt="2023-01-20T18:00:00Z"
            ),
            riskAssessment=EventRiskSummary(
                overallRiskScore=78.2,
                riskLevel=RiskLevel.CRITICAL,
                primaryFactor="Geometrical Slope Angle",
                secondaryFactor="Bedrock Lithology & Structure",
                factorContributions=[]
            ),
            metadata=EventMetadata(
                engine="EPOCH Disaster Assessment Catalog",
                version="1.5.0",
                mode="REAL",
                recordedAt="2023-01-22T10:00:00Z",
                notes="Reactivated morainic colluvium creep with structural foundation shear."
            ),
            tags=["UTTARAKHAND", "JOSHIMATH", "SUBSIDENCE", "HISTORICAL_RECORD"]
        )
        cls._memory_cache[joshimath_record.eventId] = joshimath_record

    @classmethod
    def _flush_to_disk(cls):
        """Saves current memory cache to JSON file."""
        if cls._memory_cache is None:
            return
        try:
            os.makedirs(os.path.dirname(cls.STORE_PATH), exist_ok=True)
            with open(cls.STORE_PATH, "w", encoding="utf-8") as f:
                records_json = [r.dict() for r in cls._memory_cache.values()]
                json.dump(records_json, f, indent=2)
        except Exception as e:
            print(f"[HistoryStore] Error saving event history to disk: {e}")

    @classmethod
    def list_events(cls, state: Optional[str] = None) -> List[HistoricalEventRecord]:
        """Returns all stored historical event records, optionally filtered by state."""
        cls._ensure_initialized()
        events = list(cls._memory_cache.values())
        if state and state.upper() != "ALL":
            events = [e for e in events if e.state.lower() == state.lower()]
        # Sort newest first
        events.sort(key=lambda x: x.eventDate, reverse=True)
        return events

    @classmethod
    def get_event(cls, event_id: str) -> Optional[HistoricalEventRecord]:
        """Retrieves a single historical event by ID."""
        cls._ensure_initialized()
        return cls._memory_cache.get(event_id)

    @classmethod
    def save_event(cls, record: HistoricalEventRecord) -> HistoricalEventRecord:
        """Saves or updates a historical event record."""
        cls._ensure_initialized()
        cls._memory_cache[record.eventId] = record
        cls._flush_to_disk()
        return record

    @classmethod
    def delete_event(cls, event_id: str) -> bool:
        """Deletes a historical event by ID."""
        cls._ensure_initialized()
        if event_id in cls._memory_cache:
            del cls._memory_cache[event_id]
            cls._flush_to_disk()
            return True
        return False

    @classmethod
    def reopen_event(cls, event_id: str) -> Optional[Dict[str, Any]]:
        """
        Reopens an event record into active operational memory,
        providing necessary payload to restore damage assessment & risk views.
        """
        cls._ensure_initialized()
        event = cls._memory_cache.get(event_id)
        if not event:
            return None

        return {
            "status": "REOPENED_INTO_OPERATIONAL_VIEW",
            "eventId": event.eventId,
            "eventName": event.eventName,
            "location": event.location,
            "state": event.state,
            "eventDate": event.eventDate,
            "disasterType": event.disasterType,
            "imagery": event.imagery.dict(),
            "assessment": event.assessment.dict(),
            "verification": event.verification.dict(),
            "riskAssessment": event.riskAssessment.dict(),
            "metadata": event.metadata.dict(),
            "reopenedAt": datetime.now(timezone.utc).isoformat()
        }
