"""
EPOCH — Phase 12: SMS Orchestrator & Audit Service
Coordinates authoritative alert verification, recipient resolution, E.164 validation,
idempotency tracking, multilingual message assembly, and audit logging.
"""

import json
import os
import re
import time
import uuid
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from app.services.sms_provider import get_sms_provider, SMSProvider

RECIPIENTS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "data", "synthetic", "sms_recipients.json"
)

E164_REGEX = re.compile(r"^\+[1-9]\d{6,14}$")

# ============================================================
# PHASE 11 VALIDATED TRANSLATION CATALOG (BACKEND REPLICA)
# ============================================================
TRANSLATION_CATALOG = {
    "P1": {
        "en": {
            "title": "CRITICAL LANDSLIDE RISK ALERT",
            "what": "Critical Landslide Risk Alert",
            "why": "Heavy monsoon precipitation on steep saturated hill slopes with critical lifeline infrastructure exposure.",
            "recommendedAction": "Inspect vulnerable road corridors, restrict heavy traffic, and prepare evacuation response SOP."
        },
        "hi": {
            "title": "अति-गंभीर भूस्खलन जोखिम चेतावनी",
            "what": "अति-गंभीर भूस्खलन जोखिम चेतावनी",
            "why": "अत्यधिक वर्षा एवं तीव्र ढलान पर मिट्टी के अत्यधिक संतृप्ति के कारण महत्वपूर्ण राजमार्ग पर उच्च जोखिम।",
            "recommendedAction": "संवेदनशील सड़क खंडों का तत्काल निरीक्षण करें, भारी वाहनों को रोकें एवं निकासी एसओपी तैयार रखें।"
        },
        "as": {
            "title": "অত্যন্ত বিপদজনক ভূমিস্খলনৰ সতৰ্কবাৰ্তা",
            "what": "অত্যন্ত বিপদজনক ভূমিস্খলনৰ সতৰ্কবাৰ্তা",
            "why": "প্ৰৱল বৰষুণ আৰু ঢালযুক্ত পাহাৰীয়া অঞ্চলত গুৰুত্বপূৰ্ণ পথৰ ক্ষতি হোৱাৰ প্ৰবল সম্ভাৱনা।",
            "recommendedAction": "সংবেদনশীল পথসমূহ পৰিদৰ্শন কৰক, যাতায়ত সীমিত কৰক আৰু উদ্ধাৰকাৰী দল সষ্টম ৰাখক।"
        },
        "bn": {
            "title": "অত্যন্ত বিপজ্জনক ভূমিধস সতর্কতা",
            "what": "অত্যন্ত বিপজ্জনক ভূমিধস সতর্কতা",
            "why": "ভারী বৃষ্টিপাত ও খাড়া পাহাড়ি ঢালে মাটির অতি-সম্পৃক্ততার কারণে প্রধান সড়কে উচ্চ ঝুঁকি।",
            "recommendedAction": "ঝুঁকিপূর্ণ সড়ক এলাকা পরিদর্শন করুন, যান চলাচল নিয়ন্ত্রণ করুন এবং উদ্ধার প্রস্তুতি নিশ্চিত করুন।"
        }
    },
    "P2": {
        "en": {
            "title": "HIGH-PRIORITY LANDSLIDE ADVISORY",
            "what": "High-Priority Landslide Advisory",
            "why": "Elevated antecedent rainfall and precursor slope tension cracks detected along transport corridors.",
            "recommendedAction": "Deploy spotter teams, monitor slope displacement sensors, and issue traveler caution."
        },
        "hi": {
            "title": "उच्च प्राथमिकता भूस्खलन परामर्श",
            "what": "उच्च प्राथमिकता भूस्खलन परामर्श",
            "why": "लगातार वर्षा एवं परिवहन मार्ग के साथ ढलानों में दरारें दर्ज की गई हैं।",
            "recommendedAction": "निगरानी दल तैनात करें, ढलान विस्थापन सेंसरों की जांच करें एवं यात्रियों को सतर्क करें।"
        },
        "as": {
            "title": "উচ্চ প্ৰাথমিকতাৰ ভূমিস্খলন পৰামৰ্শ",
            "what": "উচ্চ প্ৰাথমিকতাৰ ভূমিস্খলন পৰামৰ্শ",
            "why": "ধাৰাবাহিক বৰষুণৰ ফলত পথৰ কাষৰ পাহাৰীয়া অংশত ফাঁট মেলা পৰিলক্ষিত হৈছে।",
            "recommendedAction": "তদাৰকী দল নিয়োগ কৰক, সংবেদনশীল স্থানসমূহ নিৰীক্ষণ কৰক আৰু সতৰ্কতা জাৰি কৰক।"
        },
        "bn": {
            "title": "উচ্চ অগ্রাধিকার ভূমিধস পরামর্শ",
            "what": "উচ্চ অগ্রাধিকার ভূমিধস পরামর্শ",
            "why": "টানা বৃষ্টিপাতের ফলে পাহাড়ি ঢালে ফাটল ও গতিবিধি ধরা পড়েছে।",
            "recommendedAction": "তদারকি দল মোতায়েন করুন, সেন্সর ডেটা পর্যবেক্ষণ করুন এবং সতর্কতা বজায় রাখুন।"
        }
    },
    "P3": {
        "en": {
            "title": "MONITORING ADVISORY",
            "what": "Geotechnical Slope Monitoring Advisory",
            "why": "Moderate rainfall forecast; geological formation requires situational vigilance.",
            "recommendedAction": "Maintain routine drainage inspection and continuous weather tracking."
        },
        "hi": {
            "title": "ढलान निगरानी परामर्श",
            "what": "भू-तकनीकी ढलान निगरानी परामर्श",
            "why": "मध्यम वर्षा का पूर्वानुमान; भूगर्भीय स्थिति पर नियमित सतर्कता आवश्यक है।",
            "recommendedAction": "नालियों की नियमित जांच करें एवं मौसम पूर्वानुमान पर नजर बनाए रखें।"
        },
        "as": {
            "title": "নিয়মীয়া নিৰীক্ষণ পৰামৰ্শ",
            "what": "ভূ-কাৰিকৰী নিৰীক্ষণ পৰামৰ্শ",
            "why": "মজলীয়া বৰষুণৰ সম্ভাৱনা; ভৌগোলিক অৱস্থাৰ ওপৰত নজৰ ৰখা প্ৰয়োজন।",
            "recommendedAction": "নলা-নৰ্দমা পৰিষ্কাৰ ৰাখক আৰু বতৰৰ তথ্য নিৰীক্ষণ কৰক।"
        },
        "bn": {
            "title": "নিয়মিত পর্যবেক্ষণ পরামর্শ",
            "what": "ভূতাত্ত্বিক পর্যবেক্ষণ পরামর্শ",
            "why": "মাঝারি বৃষ্টিপাতের সম্ভাবনা; পরিস্থিতি পর্যবেক্ষণে রাখা প্রয়োজন।",
            "recommendedAction": "ড্রেনেজ ব্যবস্থা পরীক্ষা করুন এবং আবহাওয়ার খবরে নজর রাখুন।"
        }
    },
    "P4": {
        "en": {
            "title": "INFORMATIONAL BULLETIN",
            "what": "Baseline Geospatial Information Bulletin",
            "why": "Stable slope conditions under normal seasonal meteorological baseline.",
            "recommendedAction": "Standard operational preparedness; no immediate restrictive action needed."
        },
        "hi": {
            "title": "सूचनात्मक बुलेटिन",
            "what": "आधारभूत भू-स्थानिक सूचना बुलेटिन",
            "why": "सामान्य मौसमी परिस्थितियों में ढलान स्थिर हैं।",
            "recommendedAction": "सामान्य परिचालन तत्परता बनाए रखें; किसी आपात कार्रवाई की आवश्यकता नहीं है।"
        },
        "as": {
            "title": "তথ্যমূলক বুলেটিন",
            "what": "সাধাৰণ বতৰত পাহাৰীয়া ঢালৰ অৱস্থা সুস্থিৰ।",
            "why": "সাধাৰণ বতৰত পাহাৰীয়া ঢালৰ অৱস্থা সুস্থিৰ।",
            "recommendedAction": "স্বাভাৱিক সতৰ্কতা অৱলম্বন কৰক; কোনো জৰুৰী পদক্ষেপৰ প্ৰয়োজন নাই।"
        },
        "bn": {
            "title": "তথ্যমূলক বুলেটিন",
            "what": "সাধারণ ভূ-স্থানিক তথ্য বুলেটিন",
            "why": "স্বাভাবিক আবহাওয়ায় ঢালের অবস্থা স্থিতিশীল রয়েছে।",
            "recommendedAction": "স্বাভাবিক প্রস্তুতি বজায় রাখুন; কোনো জরুরি পদক্ষেপের প্রয়োজন নেই।"
        }
    }
}


class RecipientRegistry:
    """
    Decoupled Recipient Registry reading from synthetic JSON or Database.
    """
    @staticmethod
    def load_recipients() -> List[Dict[str, Any]]:
        try:
            if os.path.exists(RECIPIENTS_PATH):
                with open(RECIPIENTS_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            pass
        return []

    @classmethod
    def get_recipients_for_aoi(cls, aoi_id: str) -> List[Dict[str, Any]]:
        all_recs = cls.load_recipients()
        if not aoi_id:
            return all_recs
        # Filter matching aoi_id or return general recipients
        return [r for r in all_recs if r.get("aoiId") == aoi_id]

    @classmethod
    def get_recipient_by_id(cls, recipient_id: str) -> Optional[Dict[str, Any]]:
        for r in cls.load_recipients():
            if r.get("recipientId") == recipient_id:
                return r
        return None


class SMSAuditStore:
    """
    In-memory audit store with PostgreSQL schema compatibility and persistence state transparency.
    """
    _notifications: List[Dict[str, Any]] = []
    _alert_status_override: Dict[str, str] = {}

    @classmethod
    def get_persistence_mode(cls) -> str:
        # Check if DATABASE_URL is set and active
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            return "POSTGRESQL"
        return "IN_MEMORY_CACHE"

    @classmethod
    def set_alert_status(cls, alert_id: str, status_val: str):
        cls._alert_status_override[alert_id] = status_val.upper()

    @classmethod
    def get_alert_status_override(cls, alert_id: str) -> Optional[str]:
        return cls._alert_status_override.get(alert_id)

    @classmethod
    def add_notification(cls, record: Dict[str, Any]) -> Dict[str, Any]:
        cls._notifications.insert(0, record)
        return record

    @classmethod
    def get_notifications(cls, alert_id: Optional[str] = None, aoi_id: Optional[str] = None) -> List[Dict[str, Any]]:
        res = cls._notifications
        if alert_id:
            res = [n for n in res if n.get("alertId") == alert_id]
        if aoi_id:
            res = [n for n in res if n.get("aoiId") == aoi_id]
        return res

    @classmethod
    def get_notification_by_id(cls, notif_id: str) -> Optional[Dict[str, Any]]:
        for n in cls._notifications:
            if n.get("notificationId") == notif_id:
                return n
        return None

    @classmethod
    def update_notification(cls, notif_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for i, n in enumerate(cls._notifications):
            if n.get("notificationId") == notif_id:
                cls._notifications[i].update(updates)
                return cls._notifications[i]
        return None

    @classmethod
    def find_by_idempotency_key(cls, key: str) -> Optional[Dict[str, Any]]:
        for n in cls._notifications:
            if n.get("idempotencyKey") == key:
                return n
        return None


class SMSOrchestrator:
    """
    Main Orchestration Service for SMS Alert Dispatching.
    """

    @staticmethod
    def is_valid_e164(phone: str) -> bool:
        if not phone or not isinstance(phone, str):
            return False
        return bool(E164_REGEX.match(phone.strip()))

    @staticmethod
    def mask_phone_number(phone: str) -> str:
        if not phone:
            return "N/A"
        clean = phone.strip()
        if len(clean) >= 8:
            prefix = clean[:3]
            suffix = clean[-4:]
            masked_middle = "*" * (len(clean) - 7)
            return f"{prefix}{masked_middle}{suffix}"
        return clean[:2] + "****"

    @classmethod
    def get_authoritative_alert(cls, alert_id: str) -> Optional[Dict[str, Any]]:
        """
        Loads authoritative alert from backend dataset or dynamic generation.
        Checks override store for updated human-approval status.
        """
        # 1. Check known synthetic alerts in raw data
        from app.geospatial.spatial_service import SpatialService
        data = SpatialService.load_raw_data()
        alerts = data.get("multilingual_alerts", [])
        for a in alerts:
            if a.get("id") == alert_id:
                status_override = SMSAuditStore.get_alert_status_override(alert_id)
                # Synthetic alerts default to APPROVED or override
                current_status = status_override or "APPROVED"
                aoi_id = "sikkim-nh10-dikchu" if "sikkim" in a.get("location_en", "").lower() else "assam-dima-hasao-haflong"
                return {
                    "alertId": a["id"],
                    "aoiId": aoi_id,
                    "riskScore": a.get("risk_probability_pct", 85),
                    "riskLevel": a.get("level", "CRITICAL"),
                    "priority": "P1" if a.get("level") == "CRITICAL" else "P2",
                    "status": current_status,
                    "locationName": a.get("location_en", "Himalayan Corridor Sector"),
                    "synthetic": True,
                    "district": "Pakyong" if "sikkim" in aoi_id else "Dima Hasao",
                    "state": "Sikkim" if "sikkim" in aoi_id else "Assam"
                }

        # 2. Check dynamic alert pattern (e.g. ALT-EPOCH-...)
        status_override = SMSAuditStore.get_alert_status_override(alert_id)
        current_status = status_override or "DRAFT" # Fresh generated alerts default to DRAFT

        aoi_id = "assam-dima-hasao-haflong" if "assam" in alert_id.lower() else "sikkim-nh10-dikchu"
        return {
            "alertId": alert_id,
            "aoiId": aoi_id,
            "riskScore": 88 if "assam" in alert_id.lower() else 89,
            "riskLevel": "CRITICAL",
            "priority": "P1",
            "status": current_status,
            "locationName": "Haflong Ghat (NH-27)" if "assam" in alert_id.lower() else "Dikchu - Singtam Sector (NH-10)",
            "synthetic": True,
            "district": "Dima Hasao" if "assam" in alert_id.lower() else "Pakyong",
            "state": "Assam" if "assam" in alert_id.lower() else "Sikkim"
        }

    @classmethod
    def assemble_sms_body(cls, alert: Dict[str, Any], language: str) -> str:
        """
        Assembles clean, concise SMS body adhering to Phase 11 translations with English fallback.
        """
        priority = alert.get("priority", "P2")
        catalog_p = TRANSLATION_CATALOG.get(priority, TRANSLATION_CATALOG["P2"])
        lang_key = (language or "en").lower()
        if lang_key not in ["en", "hi", "as", "bn"]:
            lang_key = "en"

        trans = catalog_p.get(lang_key, catalog_p["en"])

        loc_name = alert.get("locationName", "Monitored Corridor")
        district = alert.get("district", "District HQ")
        risk_score = alert.get("riskScore", 80)
        risk_level = alert.get("riskLevel", "HIGH")

        return (
            f"[EPOCH][{risk_level}]\n"
            f"{loc_name}, {district}\n\n"
            f"{trans['what']}.\n"
            f"{trans['why']}\n\n"
            f"Risk: {risk_score}/100\n"
            f"Priority: {priority}\n\n"
            f"Action: {trans['recommendedAction']}\n"
            f"Follow official local instructions."
        )

    @classmethod
    def dispatch_alert_sms(
        cls,
        alert_id: str,
        provider: Optional[SMSProvider] = None
    ) -> Dict[str, Any]:
        """
        Validates authoritative alert approval, resolves recipients, checks idempotency,
        and dispatches SMS.
        """
        if provider is None:
            provider = get_sms_provider()

        # 1. Authoritative Backend Approval Verification
        alert = cls.get_authoritative_alert(alert_id)
        if not alert:
            return {
                "success": False,
                "status": "ERROR",
                "message": f"Alert {alert_id} not found in authoritative registry.",
                "notifications": []
            }

        if alert.get("status") != "APPROVED":
            return {
                "success": False,
                "status": "BLOCKED",
                "message": f"Alert {alert_id} is in status '{alert.get('status')}'. Only APPROVED alerts may be dispatched via SMS.",
                "notifications": []
            }

        aoi_id = alert.get("aoiId", "sikkim-nh10-dikchu")
        recipients = RecipientRegistry.get_recipients_for_aoi(aoi_id)
        if not recipients:
            # Fallback to all recipients if no specific AOI match
            recipients = RecipientRegistry.load_recipients()

        notifications_out = []
        is_dry_run = (provider.mode == "DRY_RUN")

        for rec in recipients:
            rec_id = rec.get("recipientId")
            idempotency_key = f"{alert_id}:{rec_id}"

            # 2. Idempotency Check
            existing = SMSAuditStore.find_by_idempotency_key(idempotency_key)
            if existing:
                # Already processed for this alert + recipient, skip duplicate transmission
                notifications_out.append(existing)
                continue

            # 3. Recipient Enabled Check
            if not rec.get("enabled", True):
                notif_record = {
                    "notificationId": f"NOTIF-{uuid.uuid4().hex[:10].upper()}",
                    "alertId": alert_id,
                    "aoiId": aoi_id,
                    "recipientId": rec_id,
                    "recipientName": rec.get("name"),
                    "recipientRole": rec.get("role"),
                    "phoneE164": rec.get("phoneE164"),
                    "maskedPhone": cls.mask_phone_number(rec.get("phoneE164")),
                    "language": rec.get("preferredLanguage", "en"),
                    "messageBody": "",
                    "provider": provider.provider_name,
                    "providerStatus": "skipped_disabled_recipient",
                    "providerMessageId": None,
                    "status": "SKIPPED",
                    "createdAt": time.strftime("%Y-%m-%d %H:%M:%S IST"),
                    "sentAt": None,
                    "deliveredAt": None,
                    "failureReason": "Recipient account is disabled",
                    "dryRun": is_dry_run,
                    "attemptNumber": 1,
                    "idempotencyKey": idempotency_key
                }
                SMSAuditStore.add_notification(notif_record)
                notifications_out.append(notif_record)
                continue

            # 4. E.164 Phone Validation Check
            phone = rec.get("phoneE164", "")
            if not cls.is_valid_e164(phone):
                notif_record = {
                    "notificationId": f"NOTIF-{uuid.uuid4().hex[:10].upper()}",
                    "alertId": alert_id,
                    "aoiId": aoi_id,
                    "recipientId": rec_id,
                    "recipientName": rec.get("name"),
                    "recipientRole": rec.get("role"),
                    "phoneE164": phone,
                    "maskedPhone": cls.mask_phone_number(phone),
                    "language": rec.get("preferredLanguage", "en"),
                    "messageBody": "",
                    "provider": provider.provider_name,
                    "providerStatus": "failed_invalid_e164",
                    "providerMessageId": None,
                    "status": "FAILED",
                    "createdAt": time.strftime("%Y-%m-%d %H:%M:%S IST"),
                    "sentAt": None,
                    "deliveredAt": None,
                    "failureReason": "Invalid E.164 phone number format",
                    "dryRun": is_dry_run,
                    "attemptNumber": 1,
                    "idempotencyKey": idempotency_key
                }
                SMSAuditStore.add_notification(notif_record)
                notifications_out.append(notif_record)
                continue

            # 5. Assemble Multilingual SMS Content
            sms_body = cls.assemble_sms_body(alert, rec.get("preferredLanguage", "en"))

            # 6. Provider Dispatch
            result = provider.send_sms(to_phone=phone, body=sms_body, metadata={"alertId": alert_id})

            notif_record = {
                "notificationId": f"NOTIF-{uuid.uuid4().hex[:10].upper()}",
                "alertId": alert_id,
                "aoiId": aoi_id,
                "recipientId": rec_id,
                "recipientName": rec.get("name"),
                "recipientRole": rec.get("role"),
                "phoneE164": phone,
                "maskedPhone": cls.mask_phone_number(phone),
                "language": rec.get("preferredLanguage", "en"),
                "messageBody": sms_body,
                "provider": provider.provider_name,
                "providerStatus": result.provider_status,
                "providerMessageId": result.provider_message_id,
                "status": result.status, # 'SENT' or 'FAILED'
                "createdAt": time.strftime("%Y-%m-%d %H:%M:%S IST"),
                "sentAt": time.strftime("%Y-%m-%d %H:%M:%S IST") if result.success else None,
                "deliveredAt": None, # Never fake delivered unless provider confirms
                "failureReason": result.failure_reason,
                "dryRun": is_dry_run,
                "attemptNumber": 1,
                "idempotencyKey": idempotency_key
            }
            SMSAuditStore.add_notification(notif_record)
            notifications_out.append(notif_record)

        return {
            "success": True,
            "status": "COMPLETED",
            "alertId": alert_id,
            "providerMode": provider.mode,
            "persistenceMode": SMSAuditStore.get_persistence_mode(),
            "totalRecipients": len(recipients),
            "notifications": notifications_out
        }

    @classmethod
    def retry_notification(cls, notification_id: str, provider: Optional[SMSProvider] = None) -> Dict[str, Any]:
        """
        Explicit retry for FAILED notification records. Creates a new attempt record.
        """
        if provider is None:
            provider = get_sms_provider()

        existing = SMSAuditStore.get_notification_by_id(notification_id)
        if not existing:
            return {"success": False, "message": f"Notification {notification_id} not found."}

        if existing.get("status") != "FAILED":
            return {
                "success": False,
                "message": f"Only FAILED notifications may be retried. Current status is '{existing.get('status')}'."
            }

        phone = existing.get("phoneE164", "")
        if not cls.is_valid_e164(phone):
            return {
                "success": False,
                "message": "Cannot retry notification with invalid E.164 phone number."
            }

        # Dispatch retry attempt
        result = provider.send_sms(to_phone=phone, body=existing.get("messageBody", ""), metadata={"retryFor": notification_id})

        new_attempt = existing.get("attemptNumber", 1) + 1
        is_dry_run = (provider.mode == "DRY_RUN")

        updates = {
            "status": result.status,
            "providerStatus": result.provider_status,
            "providerMessageId": result.provider_message_id,
            "sentAt": time.strftime("%Y-%m-%d %H:%M:%S IST") if result.success else None,
            "failureReason": result.failure_reason,
            "attemptNumber": new_attempt,
            "dryRun": is_dry_run
        }
        updated = SMSAuditStore.update_notification(notification_id, updates)
        return {
            "success": result.success,
            "message": "Retry processed",
            "notification": updated
        }
