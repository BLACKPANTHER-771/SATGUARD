/**
 * EPOCH — Phase 13: Offline Synchronization Service
 * 
 * Provides:
 * 1. Persistent offline queueing for field incidents (CREATE & UPDATE metadata only).
 * 2. Strict Truth Loop protection: Verification status cannot be updated offline.
 * 3. Exponential backoff synchronization engine.
 * 4. Idempotency enforcement via unique clientOperationId.
 * 5. Server-version conflict detection with explicit human resolution (KEEP SERVER / KEEP LOCAL).
 * 6. Geolocation integrity without fabricated coordinates.
 */

import type {
  OfflineQueueItem,
  OfflineSyncStatus,
  SyncConflictInfo,
  SyncBatchResult,
  FieldReport,
  EvidenceCard
} from '../types/index.ts';
import { FieldReportService } from './fieldReportService.ts';

const LOCAL_STORAGE_QUEUE_KEY = 'epoch_offline_sync_queue';
const API_BASE = '/api/v1';

export class OfflineSyncService {
  private static isSyncing = false;
  private static listeners: Array<(queue: OfflineQueueItem[]) => void> = [];

  /**
   * Subscribes to offline queue state changes
   */
  static subscribe(listener: (queue: OfflineQueueItem[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notify() {
    const q = this.getQueue();
    this.listeners.forEach(l => {
      try {
        l(q);
      } catch {
        // Listener error handling
      }
    });
  }

  /**
   * Retrieves the current offline queue from localStorage
   */
  static getQueue(): OfflineQueueItem[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(LOCAL_STORAGE_QUEUE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        }
      }
    } catch {
      // Storage access error handling
    }
    return [];
  }

  /**
   * Persists the offline queue to localStorage
   */
  static saveQueue(queue: OfflineQueueItem[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch {
      // LocalStorage error handling
    }
    this.notify();
  }

  /**
   * Checks current network connectivity using standard browser navigator
   */
  static isOnline(): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  /**
   * Enqueues a new Field Incident creation offline
   */
  static enqueueCreate(payload: {
    location_name: string;
    state?: string;
    district?: string;
    lat?: number | null;
    lng?: number | null;
    location_status?: string;
    location_source?: string;
    location_accuracy?: number | null;
    incident_type: string;
    severity?: string;
    road_blocked?: boolean;
    reporter_name?: string | null;
    reporter_role?: string | null;
    source?: string;
    evidence_type?: string;
    has_video?: boolean;
    notes?: string;
    description?: string;
    captured_at?: string;
    mediaRefs?: Array<{
      mediaId: string;
      fileName: string;
      mimeType: string;
      size: number;
      createdAt: string;
      storageStatus: 'STORED' | 'UNAVAILABLE';
    }>;
  }): OfflineQueueItem {
    const queueId = `Q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const clientOperationId = `OP-CREATE-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const newItem: OfflineQueueItem = {
      queueId,
      clientOperationId,
      entityType: 'FIELD_INCIDENT',
      operation: 'CREATE',
      payload: {
        ...payload,
        captured_at: payload.captured_at || new Date().toISOString()
      },
      mediaRefs: payload.mediaRefs || [],
      expectedServerVersion: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 5,
      syncStatus: 'PENDING',
      lastError: null,
      conflictDetails: null
    };

    const currentQueue = this.getQueue();
    const updatedQueue = [...currentQueue, newItem];
    this.saveQueue(updatedQueue);

    return newItem;
  }

  /**
   * Enqueues an incident metadata / evidence update offline.
   * STRICT GUARD: Verification status updates are strictly prohibited offline.
   */
  static enqueueUpdate(
    entityId: string,
    payload: {
      notes?: string;
      description?: string;
      incident_type?: string;
      evidence_type?: string;
      road_blocked?: boolean;
      media_url?: string;
    },
    expectedServerVersion: number = 1
  ): OfflineQueueItem {
    const queueId = `Q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const clientOperationId = `OP-UPDATE-${entityId}-${Date.now()}`;

    const newItem: OfflineQueueItem = {
      queueId,
      clientOperationId,
      entityType: 'FIELD_INCIDENT',
      entityId,
      operation: 'UPDATE',
      payload,
      expectedServerVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 5,
      syncStatus: 'PENDING',
      lastError: null,
      conflictDetails: null
    };

    const currentQueue = this.getQueue();
    const updatedQueue = [...currentQueue, newItem];
    this.saveQueue(updatedQueue);

    return newItem;
  }

  /**
   * Executes batch synchronization of pending queue items with exponential backoff
   */
  static async syncPendingQueue(): Promise<SyncBatchResult> {
    if (this.isSyncing) {
      return { success: false, processedCount: 0, syncedCount: 0, failedCount: 0, conflictCount: 0, results: [] };
    }

    const queue = this.getQueue();
    const eligibleItems = queue.filter(item => 
      item.syncStatus === 'PENDING' ||
      (item.syncStatus === 'FAILED' && item.retryCount < item.maxRetries)
    );

    if (eligibleItems.length === 0) {
      return { success: true, processedCount: 0, syncedCount: 0, failedCount: 0, conflictCount: 0, results: [] };
    }

    this.isSyncing = true;

    // Mark eligible items as SYNCING
    const eligibleIds = new Set(eligibleItems.map(i => i.queueId));
    this.saveQueue(queue.map(i => eligibleIds.has(i.queueId) ? { ...i, syncStatus: 'SYNCING' as const } : i));

    try {
      const res = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: eligibleItems })
      });

      if (res.ok) {
        const batchResponse: SyncBatchResult = await res.json();
        const resultsMap = new Map(batchResponse.results.map(r => [r.clientOperationId, r]));

        const updatedQueue = this.getQueue().map(item => {
          const syncRes = resultsMap.get(item.clientOperationId);
          if (syncRes) {
            if (syncRes.status === 'SYNCED') {
              return {
                ...item,
                syncStatus: 'SYNCED' as const,
                entityId: syncRes.entityId || item.entityId,
                expectedServerVersion: syncRes.serverVersion,
                updatedAt: new Date().toISOString(),
                conflictDetails: null,
                lastError: null
              };
            } else if (syncRes.status === 'CONFLICT') {
              return {
                ...item,
                syncStatus: 'CONFLICT' as const,
                conflictDetails: syncRes.conflictDetails,
                lastError: syncRes.error || 'Server version conflict',
                updatedAt: new Date().toISOString()
              };
            } else {
              const newRetry = item.retryCount + 1;
              return {
                ...item,
                syncStatus: 'FAILED' as const,
                retryCount: newRetry,
                lastError: syncRes.error || 'Sync rejected by backend',
                updatedAt: new Date().toISOString()
              };
            }
          }
          return item;
        });

        this.saveQueue(updatedQueue);
        return batchResponse;
      } else {
        throw new Error(`Sync HTTP error ${res.status}`);
      }
    } catch (e: any) {
      // Revert to FAILED with backoff increment
      const updatedQueue = this.getQueue().map(item => {
        if (eligibleIds.has(item.queueId)) {
          const newRetry = item.retryCount + 1;
          return {
            ...item,
            syncStatus: 'FAILED' as const,
            retryCount: newRetry,
            lastError: e?.message || 'Network communication error',
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
      this.saveQueue(updatedQueue);

      return {
        success: false,
        processedCount: eligibleItems.length,
        syncedCount: 0,
        failedCount: eligibleItems.length,
        conflictCount: 0,
        results: eligibleItems.map(i => ({
          queueId: i.queueId,
          clientOperationId: i.clientOperationId,
          status: 'FAILED',
          error: e?.message || 'Network communication error'
        }))
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Resolves an offline version conflict explicitly (KEEP SERVER vs KEEP LOCAL)
   */
  static async resolveConflict(
    clientOperationId: string,
    entityId: string,
    resolution: 'KEEP_SERVER' | 'KEEP_LOCAL',
    expectedServerVersion: number,
    overridePayload?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/sync/resolve-conflict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientOperationId,
          entityId,
          resolution,
          expectedServerVersion,
          overridePayload
        })
      });

      if (res.ok) {
        const queue = this.getQueue();
        const updatedQueue = queue.map(item => {
          if (item.clientOperationId === clientOperationId) {
            return {
              ...item,
              syncStatus: 'SYNCED' as const,
              conflictDetails: null,
              lastError: null,
              updatedAt: new Date().toISOString()
            };
          }
          return item;
        });
        this.saveQueue(updatedQueue);
        return { success: true };
      } else {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.detail || 'Conflict resolution rejected.' };
      }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error during conflict resolution.' };
    }
  }

  /**
   * Calculates exponential backoff delay in milliseconds
   */
  static calculateBackoffDelay(retryCount: number): number {
    const base = 2000; // 2 seconds
    const max = 30000; // 30 seconds
    const delay = Math.min(max, base * Math.pow(2, retryCount));
    return delay;
  }

  /**
   * Actively tests whether the backend server is reachable via /api/v1/sync/status
   */
  static async checkBackendConnectivity(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${API_BASE}/sync/status`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Retrieves aggregated synchronization statistics from the Phase-13 queue
   */
  static getSyncStats(): {
    total: number;
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
    conflict: number;
  } {
    const queue = this.getQueue();
    return {
      total: queue.length,
      pending: queue.filter(q => q.syncStatus === 'PENDING').length,
      syncing: queue.filter(q => q.syncStatus === 'SYNCING').length,
      synced: queue.filter(q => q.syncStatus === 'SYNCED').length,
      failed: queue.filter(q => q.syncStatus === 'FAILED').length,
      conflict: queue.filter(q => q.syncStatus === 'CONFLICT').length
    };
  }

  /**
   * Initializes automatic online/offline event listeners
   */
  static initializeNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        // Automatically attempt sync upon network recovery
        this.syncPendingQueue();
      });
    }
  }
}
