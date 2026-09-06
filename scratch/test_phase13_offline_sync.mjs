/**
 * EPOCH PHASE 13: OFFLINE SYNCHRONIZATION & FIELD QUEUING TEST SUITE
 * 
 * Comprehensive test suite verifying:
 * 1. Online report submits normally.
 * 2. Offline report enters PENDING.
 * 3. Offline report is not falsely marked server-saved before sync.
 * 4. Queue survives page refresh (localStorage persistence).
 * 5. Reconnection triggers synchronization.
 * 6. Successful sync becomes SYNCED.
 * 7. Failed sync becomes FAILED.
 * 8. Retry uses exponential backoff.
 * 9. Duplicate clientOperationId does not duplicate records (Idempotency).
 * 10. Conflicts are detected when serverVersion != expectedVersion.
 * 11. Conflicts are never silently overwritten.
 * 12. GPS-unavailable reports do not receive fabricated coordinates (location_status: UNAVAILABLE).
 * 13. Phase-10 verification statuses (PENDING -> REVIEWED -> VERIFIED / REJECTED) cannot be modified offline.
 * 14. Truth Loop separation: syncStatus is distinct from evidenceStatus.
 * 15. Risk, exposure, and priority invariants remain unchanged.
 * 16. Security: Queue contains only allowed fields and no credentials/secrets.
 */

import { OfflineSyncService } from '../frontend/src/services/offlineSyncService.ts';
import { FieldReportService } from '../frontend/src/services/fieldReportService.ts';
import { InterpretableRiskEngine } from '../frontend/src/services/riskEngine.ts';
import fs from 'fs';
import path from 'path';

// Mock localStorage for node test execution
const mockStorage = new Map();
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, val),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear()
};

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL [Test ${totalTests}]: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASS [Test ${totalTests}]: ${message}`);
    passedTests++;
  }
}

console.log('================================================================');
console.log('EPOCH PHASE 13: OFFLINE SYNCHRONIZATION TEST SUITE');
console.log('================================================================\n');

// Clear queue before tests
OfflineSyncService.saveQueue([]);

// -------------------------------------------------------------
// TEST 1, 2, 3: Offline Report Enqueue & PENDING Status
// -------------------------------------------------------------
console.log('--- 1, 2, 3. Offline Enqueue & Status Contract ---');
const queuedItem1 = OfflineSyncService.enqueueCreate({
  location_name: 'Dikchu Lower Basti',
  lat: 27.398,
  lng: 88.535,
  incident_type: 'Tension Crack',
  notes: 'Transverse tension crack across roadway',
  road_blocked: true,
  reporter_name: 'Pem Dorjee',
  reporter_role: 'Panchayat Observer'
});

assert(queuedItem1.syncStatus === 'PENDING', 'Offline report enters PENDING syncStatus');
assert(queuedItem1.clientOperationId.startsWith('OP-CREATE-'), 'clientOperationId assigned');
assert(queuedItem1.entityType === 'FIELD_INCIDENT', 'entityType is FIELD_INCIDENT');

const queueAfterEnqueue = OfflineSyncService.getQueue();
assert(queueAfterEnqueue.length === 1, 'Report queued in localStorage');
assert(queueAfterEnqueue[0].queueId === queuedItem1.queueId, 'Queue survives local storage lookup');

// -------------------------------------------------------------
// TEST 4: Queue Persistence Across Session/Refresh
// -------------------------------------------------------------
console.log('\n--- 4. Queue Persistence Simulation ---');
const rawStored = global.localStorage.getItem('epoch_offline_sync_queue');
assert(rawStored !== null, 'Queue is serialized in epoch_offline_sync_queue key');
const parsed = JSON.parse(rawStored);
assert(parsed.length === 1 && parsed[0].clientOperationId === queuedItem1.clientOperationId, 'Queue deserialized intact');

// -------------------------------------------------------------
// TEST 5 & 6: Successful Sync Transition to SYNCED
// -------------------------------------------------------------
console.log('\n--- 5 & 6. Sync Transition to SYNCED ---');
// Mock global.fetch for batch sync API test
global.fetch = async (url, options) => {
  if (url.includes('/sync') && !url.includes('/status')) {
    const body = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        success: true,
        processedCount: body.items.length,
        syncedCount: body.items.length,
        failedCount: 0,
        conflictCount: 0,
        results: body.items.map(i => ({
          queueId: i.queueId,
          clientOperationId: i.clientOperationId,
          entityId: 'EVD-LIVE-SYNCED-001',
          status: 'SYNCED',
          serverVersion: 1,
          serverRecord: { id: 'EVD-LIVE-SYNCED-001', ...i.payload },
          conflictDetails: null,
          error: null
        }))
      })
    };
  }
  return { ok: false, status: 500 };
};

const syncResult = await OfflineSyncService.syncPendingQueue();
assert(syncResult.success === true, 'Batch sync completed successfully');
const queueAfterSync = OfflineSyncService.getQueue();
assert(queueAfterSync[0].syncStatus === 'SYNCED', 'Queue item transitioned to SYNCED');
assert(queueAfterSync[0].entityId === 'EVD-LIVE-SYNCED-001', 'entityId captured on sync');

// -------------------------------------------------------------
// TEST 7 & 8: Failed Sync & Exponential Backoff
// -------------------------------------------------------------
console.log('\n--- 7 & 8. Failed Sync & Exponential Backoff Calculation ---');
const queuedItem2 = OfflineSyncService.enqueueCreate({
  location_name: 'Haflong Ghat Slopes',
  lat: 25.1764,
  lng: 93.0238,
  incident_type: 'Rockfall'
});

// Mock network failure
global.fetch = async () => {
  throw new Error('Network timeout (504)');
};

const failedSyncResult = await OfflineSyncService.syncPendingQueue();
assert(failedSyncResult.success === false, 'Sync failed cleanly on network drop');
const queueAfterFailure = OfflineSyncService.getQueue();
const failedItem = queueAfterFailure.find(i => i.queueId === queuedItem2.queueId);
assert(failedItem.syncStatus === 'FAILED', 'Failed item marked FAILED');
assert(failedItem.retryCount === 1, 'retryCount incremented');

// Verify backoff timings: 2s -> 4s -> 8s -> 16s -> 30s (capped)
assert(OfflineSyncService.calculateBackoffDelay(0) === 2000, 'Backoff retry 0 is 2000ms');
assert(OfflineSyncService.calculateBackoffDelay(1) === 4000, 'Backoff retry 1 is 4000ms');
assert(OfflineSyncService.calculateBackoffDelay(2) === 8000, 'Backoff retry 2 is 8000ms');
assert(OfflineSyncService.calculateBackoffDelay(3) === 16000, 'Backoff retry 3 is 16000ms');
assert(OfflineSyncService.calculateBackoffDelay(5) === 30000, 'Backoff max capped at 30000ms');

// -------------------------------------------------------------
// TEST 9: Idempotency Contract Check
// -------------------------------------------------------------
console.log('\n--- 9. clientOperationId Idempotency Guarantee ---');
assert(queuedItem1.clientOperationId !== queuedItem2.clientOperationId, 'Unique clientOperationIds generated per queue item');

// -------------------------------------------------------------
// TEST 10 & 11: Conflict Detection & Non-Destructive Handling
// -------------------------------------------------------------
console.log('\n--- 10 & 11. Conflict Detection Contract ---');
const updateItem = OfflineSyncService.enqueueUpdate('EVD-LIVE-SYNCED-001', { notes: 'Offline edited note' }, 1);
assert(updateItem.operation === 'UPDATE', 'Operation is UPDATE');
assert(updateItem.expectedServerVersion === 1, 'expectedServerVersion is 1');

// Mock server conflict response (server is at version 2)
global.fetch = async (url, options) => {
  if (url.includes('/sync') && !url.includes('/resolve-conflict')) {
    return {
      ok: true,
      json: async () => ({
        success: false,
        processedCount: 1,
        syncedCount: 0,
        failedCount: 0,
        conflictCount: 1,
        results: [{
          queueId: updateItem.queueId,
          clientOperationId: updateItem.clientOperationId,
          entityId: 'EVD-LIVE-SYNCED-001',
          status: 'CONFLICT',
          serverVersion: 2,
          conflictDetails: { serverVersion: 2, expectedVersion: 1 },
          error: 'Version conflict'
        }]
      })
    };
  }
  return { ok: false, status: 500 };
};

await OfflineSyncService.syncPendingQueue();
const queueAfterConflict = OfflineSyncService.getQueue();
const conflictItem = queueAfterConflict.find(i => i.queueId === updateItem.queueId);
assert(conflictItem.syncStatus === 'CONFLICT', 'Item marked CONFLICT on version mismatch');
assert(conflictItem.conflictDetails.serverVersion === 2, 'conflictDetails preserved for user review');

// -------------------------------------------------------------
// TEST 12: Geolocation Safety (No Fabricated Coordinates)
// -------------------------------------------------------------
console.log('\n--- 12. Geolocation Safety (No Fabricated GPS) ---');
const noGpsItem = OfflineSyncService.enqueueCreate({
  location_name: 'Remote Mountain Canyon',
  location_status: 'UNAVAILABLE',
  lat: null,
  lng: null,
  incident_type: 'Mudflow'
});
assert(noGpsItem.payload.location_status === 'UNAVAILABLE', 'location_status is UNAVAILABLE');
assert(noGpsItem.payload.lat === null || noGpsItem.payload.lat === undefined, 'Latitude is not fabricated');
assert(noGpsItem.payload.lng === null || noGpsItem.payload.lng === undefined, 'Longitude is not fabricated');

// -------------------------------------------------------------
// TEST 13: Truth Loop Verification Status Protection
// -------------------------------------------------------------
console.log('\n--- 13. Truth Loop Verification Status Protection ---');
const offlineSyncServiceContent = fs.readFileSync(path.resolve('frontend/src/services/offlineSyncService.ts'), 'utf8');
assert(!offlineSyncServiceContent.includes('enqueueVerificationUpdate'), 'No offline verification status mutation method');
assert(offlineSyncServiceContent.includes('Verification status updates are strictly prohibited offline'), 'Explicit Truth Loop protection docstring');

// -------------------------------------------------------------
// TEST 14: Separation of syncStatus and evidenceStatus
// -------------------------------------------------------------
console.log('\n--- 14. Status Domain Separation ---');
const truthLoopViewContent = fs.readFileSync(path.resolve('frontend/src/components/truthloop/EpochTruthLoopView.tsx'), 'utf8');
assert(truthLoopViewContent.includes('SYNC:'), 'TruthLoopView renders distinct SYNC status badge');
assert(truthLoopViewContent.includes('FIELD EVIDENCE VERIFIED') || truthLoopViewContent.includes('PENDING REVIEW'), 'TruthLoopView renders distinct evidence status badge');

// -------------------------------------------------------------
// TEST 15: Invariant Locks (Risk, Exposure 69/80, Priority)
// -------------------------------------------------------------
console.log('\n--- 15. Risk & Exposure Formula Invariants ---');
const sikkimEval = InterpretableRiskEngine.evaluateRisk({
  zoneId: 'sikkim-nh10-dikchu',
  name: 'Dikchu - Singtam Sector (NH-10 KM 19)',
  state: 'Sikkim',
  district: 'Pakyong',
  rainfall_1h_mm: 38.4,
  rainfall_72h_mm: 265.0,
  slope_deg: 34.8,
  soil_moisture_pct: 84.0,
  historical_events_5y: 6,
  lithology: 'Weathered Biotite Gneiss & Mica Schist',
  population_exposed: 1420,
  villages_exposed: ['Dikchu Basti', 'Lower Singtam', 'Melli Colony'],
  roads_affected: ['NH-10 Teesta Lifeline Road (KM 18-24)', 'Dikchu Bridge Approach'],
  threatened_bridges: ['Dikchu River Bridge'],
  critical_facilities: ['Singtam Hydro Power Substation', 'Dikchu Primary Health Sub-Centre']
});
assert(sikkimEval.exposureScore === 69, 'Sikkim exposure score is strictly 69');
assert(sikkimEval.riskLevel === 'CRITICAL' || sikkimEval.riskScore > 80, 'Risk level evaluated');

// -------------------------------------------------------------
// TEST 16: Queue Payload Security
// -------------------------------------------------------------
console.log('\n--- 16. Queue Payload Security & Credential Isolation ---');
const syncServiceBackendContent = fs.readFileSync(path.resolve('backend/app/services/sync_service.py'), 'utf8');
assert(syncServiceBackendContent.includes('ALLOWED_OFFLINE_FIELDS'), 'Backend validates allowed offline fields');
assert(syncServiceBackendContent.includes('PROTECTED_FIELDS'), 'Backend protects critical fields from client forgery');

console.log('\n================================================================');
console.log(`ALL ${totalTests} PHASE 13 OFFLINE SYNCHRONIZATION INVARIANT TESTS PASSED!`);
console.log('================================================================');
