"""
EPOCH Phase 12: SMS Gateway Backend Test Suite
Verifies backend orchestrator, provider abstraction, approval gate, E.164 validation,
idempotency, translation fallback, retry behavior, and credential safety.
"""

import sys
import os
import unittest

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.services.sms_provider import (
    SMSProvider,
    DryRunSMSProvider,
    ConfiguredSMSProvider,
    SMSProviderResult,
    get_sms_provider
)
from app.services.sms_orchestrator import (
    SMSOrchestrator,
    RecipientRegistry,
    SMSAuditStore,
    TRANSLATION_CATALOG
)
from app.risk_engine.calculator import LandslideRiskEngine

class TestPhase12SMSGateway(unittest.TestCase):

    def setUp(self):
        # Clear audit store overrides and notifications before each test
        SMSAuditStore._notifications = []
        SMSAuditStore._alert_status_override = {}

    def test_1_draft_alert_cannot_send(self):
        """1. DRAFT alert cannot send"""
        alert_id = "ALT-EPOCH-DRAFT-001"
        SMSAuditStore.set_alert_status(alert_id, "DRAFT")
        res = SMSOrchestrator.dispatch_alert_sms(alert_id)
        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "BLOCKED")
        self.assertIn("Only APPROVED alerts", res["message"])

    def test_2_approved_alert_can_enter_gateway(self):
        """2. APPROVED alert can enter gateway"""
        alert_id = "ALT-EPOCH-APPROVED-001"
        SMSAuditStore.set_alert_status(alert_id, "APPROVED")
        res = SMSOrchestrator.dispatch_alert_sms(alert_id)
        self.assertTrue(res["success"])
        self.assertEqual(res["status"], "COMPLETED")
        self.assertTrue(len(res["notifications"]) > 0)

    def test_3_rejected_alert_cannot_send(self):
        """3. REJECTED alert cannot send"""
        alert_id = "ALT-EPOCH-REJECTED-001"
        SMSAuditStore.set_alert_status(alert_id, "REJECTED")
        res = SMSOrchestrator.dispatch_alert_sms(alert_id)
        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "BLOCKED")

    def test_4_invalid_phone_is_rejected(self):
        """4. Invalid phone is rejected and marked FAILED"""
        alert_id = "ALT-EPOCH-APPROVED-PHONE-TEST"
        SMSAuditStore.set_alert_status(alert_id, "APPROVED")
        res = SMSOrchestrator.dispatch_alert_sms(alert_id)
        invalid_notifs = [n for n in res["notifications"] if n["recipientId"] == "REC-TEST-INVALID-PHONE"]
        self.assertTrue(len(invalid_notifs) > 0)
        self.assertEqual(invalid_notifs[0]["status"], "FAILED")
        self.assertIn("Invalid E.164", invalid_notifs[0]["failureReason"])

    def test_5_disabled_recipient_is_skipped(self):
        """5. Disabled recipient is skipped and marked SKIPPED"""
        alert_id = "ALT-EPOCH-APPROVED-DISABLED-TEST"
        SMSAuditStore.set_alert_status(alert_id, "APPROVED")
        res = SMSOrchestrator.dispatch_alert_sms(alert_id)
        disabled_notifs = [n for n in res["notifications"] if n["recipientId"] == "REC-TEST-DISABLED"]
        self.assertTrue(len(disabled_notifs) > 0)
        self.assertEqual(disabled_notifs[0]["status"], "SKIPPED")

    def test_6_idempotency_prevents_duplicate_sms(self):
        """6. Duplicate alert + recipient does not create duplicate SMS"""
        alert_id = "ALT-EPOCH-APPROVED-IDEMPOTENT-001"
        SMSAuditStore.set_alert_status(alert_id, "APPROVED")
        # First send
        res1 = SMSOrchestrator.dispatch_alert_sms(alert_id)
        count_1 = len(SMSAuditStore._notifications)
        # Second send
        res2 = SMSOrchestrator.dispatch_alert_sms(alert_id)
        count_2 = len(SMSAuditStore._notifications)
        self.assertEqual(count_1, count_2, "Idempotency must prevent new notification records on duplicate send")

    def test_7_language_selection_uses_phase11_translation(self):
        """7. Language selection uses Phase-11 translation"""
        alert = {
            "priority": "P1",
            "riskLevel": "CRITICAL",
            "riskScore": 92,
            "locationName": "Haflong Ghat",
            "district": "Dima Hasao"
        }
        body_hi = SMSOrchestrator.assemble_sms_body(alert, "hi")
        body_as = SMSOrchestrator.assemble_sms_body(alert, "as")
        body_bn = SMSOrchestrator.assemble_sms_body(alert, "bn")
        body_en = SMSOrchestrator.assemble_sms_body(alert, "en")

        self.assertIn(TRANSLATION_CATALOG["P1"]["hi"]["what"], body_hi)
        self.assertIn(TRANSLATION_CATALOG["P1"]["as"]["what"], body_as)
        self.assertIn(TRANSLATION_CATALOG["P1"]["bn"]["what"], body_bn)
        self.assertIn(TRANSLATION_CATALOG["P1"]["en"]["what"], body_en)

    def test_8_missing_translation_falls_back_to_english(self):
        """8. Missing/unsupported translation falls back to validated English"""
        alert = {
            "priority": "P1",
            "riskLevel": "CRITICAL",
            "riskScore": 92,
            "locationName": "Haflong Ghat",
            "district": "Dima Hasao"
        }
        body_unsupported = SMSOrchestrator.assemble_sms_body(alert, "de") # German
        self.assertIn(TRANSLATION_CATALOG["P1"]["en"]["what"], body_unsupported)

    def test_9_dry_run_never_reports_real_delivery(self):
        """9. DRY_RUN never reports real delivery"""
        alert_id = "ALT-EPOCH-APPROVED-DRYRUN-TEST"
        SMSAuditStore.set_alert_status(alert_id, "APPROVED")
        provider = DryRunSMSProvider()
        res = SMSOrchestrator.dispatch_alert_sms(alert_id, provider=provider)
        for notif in res["notifications"]:
            self.assertIsNone(notif["deliveredAt"], "DRY_RUN must never set deliveredAt")
            if notif["status"] == "SENT":
                self.assertTrue(notif["dryRun"])
                self.assertEqual(notif["providerStatus"], "simulated_dispatch")

    def test_10_provider_failure_becomes_failed(self):
        """10. Provider failure becomes FAILED"""
        class FailingSMSProvider(SMSProvider):
            def __init__(self):
                super().__init__()
                self.mode = "LIVE"
                self.provider_name = "failing-mock"
            def send_sms(self, to_phone, body, metadata=None):
                return SMSProviderResult(
                    success=False,
                    status="FAILED",
                    provider_status="mock_timeout",
                    failure_reason="Upstream gateway timed out (504)"
                )
            def health_check(self):
                return False

        alert_id = "ALT-EPOCH-FAILING-TEST"
        SMSAuditStore.set_alert_status(alert_id, "APPROVED")
        res = SMSOrchestrator.dispatch_alert_sms(alert_id, provider=FailingSMSProvider())
        valid_phone_notifs = [n for n in res["notifications"] if n["recipientId"] == "REC-SK-001"]
        self.assertEqual(valid_phone_notifs[0]["status"], "FAILED")
        self.assertIn("504", valid_phone_notifs[0]["failureReason"])

    def test_11_retry_works_only_for_failed_messages(self):
        """11. Retry works only for failed messages"""
        alert_id = "ALT-EPOCH-RETRY-TEST"
        SMSAuditStore.set_alert_status(alert_id, "APPROVED")
        notif_failed = {
            "notificationId": "NOTIF-FAIL-001",
            "alertId": alert_id,
            "aoiId": "sikkim-nh10-dikchu",
            "recipientId": "REC-SK-001",
            "phoneE164": "+919876543210",
            "maskedPhone": "+91******3210",
            "language": "en",
            "messageBody": "Test message",
            "provider": "dry-run",
            "providerStatus": "failed_temporary",
            "providerMessageId": None,
            "status": "FAILED",
            "createdAt": "2026-09-06 14:00:00 IST",
            "sentAt": None,
            "deliveredAt": None,
            "failureReason": "Temporary network glitch",
            "dryRun": True,
            "attemptNumber": 1,
            "idempotencyKey": f"{alert_id}:REC-SK-001"
        }
        SMSAuditStore.add_notification(notif_failed)

        # Retry should succeed
        retry_res = SMSOrchestrator.retry_notification("NOTIF-FAIL-001", provider=DryRunSMSProvider())
        self.assertTrue(retry_res["success"])
        self.assertEqual(retry_res["notification"]["attemptNumber"], 2)
        self.assertEqual(retry_res["notification"]["status"], "SENT")

        # Retry on non-failed message should fail
        retry_on_sent = SMSOrchestrator.retry_notification("NOTIF-FAIL-001", provider=DryRunSMSProvider())
        self.assertFalse(retry_on_sent["success"])
        self.assertIn("Only FAILED notifications", retry_on_sent["message"])

    def test_12_existing_risk_and_priority_invariants(self):
        """12. Existing Phase-2 risk & Phase-3 priority calculations remain strictly unchanged"""
        sikkim_risk = LandslideRiskEngine.calculate_susceptibility(
            rainfall_1h_mm=38.4,
            rainfall_72h_mm=265.0,
            slope_deg=34.8,
            soil_moisture_pct=84.0,
            historical_events_5y=6,
            lithology='Weathered Biotite Gneiss & Mica Schist'
        )
        sikkim_exp = LandslideRiskEngine.evaluate_exposure(
            population=1420,
            villages=['Dikchu Basti', 'Lower Singtam', 'Melli Colony'],
            roads=['NH-10 Teesta Lifeline Road (KM 18-24)', 'Dikchu Bridge Approach'],
            bridges=['Dikchu River Bridge'],
            raw_facilities=['Singtam Hydro Power Substation', 'Dikchu Primary Health Sub-Centre']
        )
        sikkim_priority = LandslideRiskEngine.calculate_response_priority(
            risk_score=sikkim_risk["risk_score"],
            exposure_score=sikkim_exp["exposure_score"],
            roads=['NH-10 Teesta Lifeline Road (KM 18-24)'],
            population=1420
        )
        self.assertEqual(sikkim_exp["exposure_score"], 69)
        self.assertEqual(sikkim_priority["response_priority"], "PRIORITY_1")

    def test_16_credential_isolation(self):
        """16. Security test: Provider credentials are never returned by public status endpoint"""
        provider = DryRunSMSProvider()
        status_info = provider.get_public_status()
        self.assertNotIn("api_key", status_info)
        self.assertNotIn("auth_token", status_info)
        self.assertNotIn("account_sid", status_info)
        self.assertNotIn("secret", status_info)
        self.assertIn("mode", status_info)
        self.assertIn("provider", status_info)
        self.assertIn("configured", status_info)


if __name__ == '__main__':
    unittest.main()
