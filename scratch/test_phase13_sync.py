"""
EPOCH Phase 13: Offline Synchronization Backend Test Suite
Verifies batch sync, persistent idempotency (clientOperationId), server versioning,
conflict detection, Truth Loop verification protection, and geolocation safety.
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.services.sync_service import SyncService
from app.models.schemas import SyncItemRequest
from app.risk_engine.calculator import LandslideRiskEngine

class TestPhase13SyncBackend(unittest.TestCase):

    def setUp(self):
        SyncService._sync_operations_store = {}
        self.custom_incidents = []

    def test_1_create_operation_syncs_with_pending_status(self):
        """1. CREATE operation creates incident with serverVersion=1 and PENDING review status"""
        item = SyncItemRequest(
            queueId="Q-001",
            clientOperationId="OP-CREATE-001",
            entityType="FIELD_INCIDENT",
            operation="CREATE",
            payload={
                "location_name": "Dikchu Lower Sector",
                "lat": 27.398,
                "lng": 88.535,
                "incident_type": "Tension Crack",
                "notes": "Slope movement detected",
                # Malicious client attempt to pre-verify report:
                "evidence_status": "VERIFIED"
            }
        )

        res = SyncService.process_batch([item], self.custom_incidents)
        self.assertTrue(res["success"])
        self.assertEqual(res["syncedCount"], 1)

        created_incident = self.custom_incidents[0]
        self.assertEqual(created_incident["serverVersion"], 1)
        # CRITICAL TEST: Offline create CANNOT pre-verify report
        self.assertEqual(created_incident["evidence_status"], "PENDING")
        self.assertEqual(created_incident["verification_status"], "UNDER_INSPECTION")

    def test_2_idempotency_prevents_duplicate_records(self):
        """2. Repeated sync with same clientOperationId returns existing record without duplicate creation"""
        item = SyncItemRequest(
            queueId="Q-002",
            clientOperationId="OP-CREATE-IDEMPOTENT",
            entityType="FIELD_INCIDENT",
            operation="CREATE",
            payload={"location_name": "Haflong Slope", "lat": 25.1764, "lng": 93.0238, "incident_type": "Rockfall"}
        )

        # First sync
        res1 = SyncService.process_batch([item], self.custom_incidents)
        count1 = len(self.custom_incidents)

        # Second sync (same clientOperationId)
        res2 = SyncService.process_batch([item], self.custom_incidents)
        count2 = len(self.custom_incidents)

        self.assertEqual(count1, 1)
        self.assertEqual(count2, 1, "Idempotency must prevent duplicate creation")
        self.assertEqual(res1["results"][0]["entityId"], res2["results"][0]["entityId"])

    def test_3_version_conflict_detection(self):
        """3. Conflict detected when expectedServerVersion differs from current serverVersion"""
        # Create base incident (serverVersion = 1)
        create_item = SyncItemRequest(
            queueId="Q-003",
            clientOperationId="OP-CREATE-BASE",
            entityType="FIELD_INCIDENT",
            operation="CREATE",
            payload={"location_name": "Singtam Bridge Approach", "lat": 27.23, "lng": 88.50, "incident_type": "Slump"}
        )
        SyncService.process_batch([create_item], self.custom_incidents)
        incident_id = self.custom_incidents[0]["id"]

        # Simulate server-side edit (increments serverVersion to 2)
        self.custom_incidents[0]["serverVersion"] = 2
        self.custom_incidents[0]["description"] = "Updated on server by duty officer"

        # Offline update from a client expecting version 1
        update_item = SyncItemRequest(
            queueId="Q-004",
            clientOperationId="OP-UPDATE-STALE",
            entityType="FIELD_INCIDENT",
            entityId=incident_id,
            operation="UPDATE",
            expectedServerVersion=1,
            payload={"notes": "Offline field notes edit"}
        )

        res = SyncService.process_batch([update_item], self.custom_incidents)
        self.assertFalse(res["success"])
        self.assertEqual(res["conflictCount"], 1)
        conflict_res = res["results"][0]
        self.assertEqual(conflict_res["status"], "CONFLICT")
        self.assertEqual(conflict_res["conflictDetails"]["serverVersion"], 2)
        self.assertEqual(conflict_res["conflictDetails"]["expectedVersion"], 1)

    def test_4_conflict_resolution_keep_server_and_keep_local(self):
        """4. Conflict resolution supports explicit KEEP_SERVER and KEEP_LOCAL without silent overwrite"""
        # Incident at serverVersion = 2
        incident = {
            "id": "EVD-CONFLICT-TEST",
            "serverVersion": 2,
            "description": "Server authoritative description",
            "updated_at": "2026-09-06 14:00:00 IST"
        }
        self.custom_incidents.append(incident)

        # KEEP_SERVER resolution
        res_server = SyncService.resolve_conflict(
            op_id="OP-RES-1",
            entity_id="EVD-CONFLICT-TEST",
            resolution="KEEP_SERVER",
            expected_version=2,
            override_payload={"description": "Local override"},
            custom_incidents_list=self.custom_incidents
        )
        self.assertTrue(res_server["success"])
        self.assertEqual(self.custom_incidents[0]["description"], "Server authoritative description")

        # KEEP_LOCAL resolution
        res_local = SyncService.resolve_conflict(
            op_id="OP-RES-2",
            entity_id="EVD-CONFLICT-TEST",
            resolution="KEEP_LOCAL",
            expected_version=2,
            override_payload={"description": "Human authorized local override notes"},
            custom_incidents_list=self.custom_incidents
        )
        self.assertTrue(res_local["success"])
        self.assertEqual(self.custom_incidents[0]["description"], "Human authorized local override notes")
        self.assertEqual(self.custom_incidents[0]["serverVersion"], 3)

    def test_5_geolocation_safety_no_fabricated_coordinates(self):
        """5. Unavailable GPS preserves coordinates=null and does NOT fabricate dummy coordinates"""
        item = SyncItemRequest(
            queueId="Q-005",
            clientOperationId="OP-CREATE-NOGPS",
            entityType="FIELD_INCIDENT",
            operation="CREATE",
            payload={
                "location_name": "Remote Mountain Gully",
                "location_status": "UNAVAILABLE",
                "lat": None,
                "lng": None,
                "incident_type": "Debris Flow"
            }
        )

        res = SyncService.process_batch([item], self.custom_incidents)
        created = self.custom_incidents[0]
        self.assertIsNone(created["lat"])
        self.assertIsNone(created["lng"])
        self.assertEqual(created["location_status"], "UNAVAILABLE")
        self.assertIn("GPS UNAVAILABLE", created["coordinates"])

    def test_6_protected_fields_cannot_be_modified_offline(self):
        """6. Protected fields (evidence_status, verified_by, etc.) cannot be modified via offline UPDATE"""
        incident = {
            "id": "EVD-PROTECT-TEST",
            "serverVersion": 1,
            "evidence_status": "PENDING",
            "verification_status": "UNDER_INSPECTION",
            "description": "Original description"
        }
        self.custom_incidents.append(incident)

        update_item = SyncItemRequest(
            queueId="Q-006",
            clientOperationId="OP-UPDATE-PROTECTED",
            entityType="FIELD_INCIDENT",
            entityId="EVD-PROTECT-TEST",
            operation="UPDATE",
            expectedServerVersion=1,
            payload={
                "description": "Valid updated description",
                # Attempt to forge verification:
                "evidence_status": "VERIFIED",
                "verification_status": "CONFIRMED",
                "verified_by": "Forged Officer"
            }
        )

        res = SyncService.process_batch([update_item], self.custom_incidents)
        self.assertTrue(res["success"])
        self.assertEqual(self.custom_incidents[0]["description"], "Valid updated description")
        # Strict verification preservation:
        self.assertEqual(self.custom_incidents[0]["evidence_status"], "PENDING")
        self.assertEqual(self.custom_incidents[0]["verification_status"], "UNDER_INSPECTION")
        self.assertNotIn("verified_by", self.custom_incidents[0])


if __name__ == '__main__':
    unittest.main()
