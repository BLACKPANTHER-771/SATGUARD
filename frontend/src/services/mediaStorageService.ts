/**
 * EPOCH — Media Storage Service (Phase 14)
 * 
 * Provides robust binary media storage in IndexedDB (epoch_field_media_db).
 * - Strictly keeps large photos & videos out of localStorage.
 * - Produces lightweight mediaRefs for Phase-13 OfflineQueueItems.
 * - Provides explicit 'MEDIA STORAGE UNAVAILABLE' error handling on storage quota / db failures.
 */

export interface MediaRecord {
  mediaId: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  storageStatus: 'STORED' | 'UNAVAILABLE';
}

export interface MediaRef {
  mediaId: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  storageStatus: 'STORED' | 'UNAVAILABLE';
}

const DB_NAME = 'epoch_field_media_db';
const STORE_NAME = 'media_records';
const DB_VERSION = 1;

export class MediaStorageService {
  private static dbPromise: Promise<IDBDatabase> | null = null;
  // In-memory fallback map for non-browser/test environments
  private static memoryFallbackStore: Map<string, MediaRecord> = new Map();

  private static getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB not supported in current environment'));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        try {
          const request = indexedDB.open(DB_NAME, DB_VERSION);

          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME, { keyPath: 'mediaId' });
            }
          };

          request.onsuccess = () => {
            resolve(request.result);
          };

          request.onerror = () => {
            reject(request.error || new Error('Failed to open IndexedDB'));
          };
        } catch (e) {
          reject(e);
        }
      });
    }

    return this.dbPromise;
  }

  /**
   * Stores photo or video binary in IndexedDB, returns lightweight MediaRef.
   * If storage fails or is unavailable, returns storageStatus: 'UNAVAILABLE' with explicit message.
   */
  static async storeMedia(
    file: File | Blob,
    metadata: { fileName?: string; mimeType?: string } = {}
  ): Promise<{ ref: MediaRef; error?: string }> {
    const mediaId = `MED-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const mimeType = metadata.mimeType || file.type || 'image/jpeg';
    const fileName = metadata.fileName || (file instanceof File ? file.name : `evidence-${mediaId}.jpg`);
    const size = file.size;
    const createdAt = new Date().toISOString();

    const record: MediaRecord = {
      mediaId,
      blob: file,
      fileName,
      mimeType,
      size,
      createdAt,
      storageStatus: 'STORED'
    };

    const mediaRef: MediaRef = {
      mediaId,
      fileName,
      mimeType,
      size,
      createdAt,
      storageStatus: 'STORED'
    };

    try {
      if (typeof indexedDB !== 'undefined') {
        const db = await this.getDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const putReq = store.put(record);

          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error || new Error('Failed to put media into IndexedDB'));
          tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
        });

        return { ref: mediaRef };
      } else {
        // Fallback for mock/test environments
        this.memoryFallbackStore.set(mediaId, record);
        return { ref: mediaRef };
      }
    } catch (err: any) {
      console.warn('[MediaStorageService] Storage failed:', err);
      return {
        ref: {
          ...mediaRef,
          storageStatus: 'UNAVAILABLE'
        },
        error: 'MEDIA STORAGE UNAVAILABLE'
      };
    }
  }

  /**
   * Retrieves binary media Blob by mediaId
   */
  static async getMedia(mediaId: string): Promise<Blob | null> {
    try {
      if (typeof indexedDB !== 'undefined') {
        const db = await this.getDB();
        return new Promise<Blob | null>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const getReq = store.get(mediaId);

          getReq.onsuccess = () => {
            const result: MediaRecord = getReq.result;
            resolve(result ? result.blob : null);
          };
          getReq.onerror = () => reject(getReq.error);
        });
      } else {
        const item = this.memoryFallbackStore.get(mediaId);
        return item ? item.blob : null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Deletes media record from IndexedDB
   */
  static async deleteMedia(mediaId: string): Promise<boolean> {
    try {
      if (typeof indexedDB !== 'undefined') {
        const db = await this.getDB();
        return new Promise<boolean>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const delReq = store.delete(mediaId);

          delReq.onsuccess = () => resolve(true);
          delReq.onerror = () => reject(delReq.error);
        });
      } else {
        return this.memoryFallbackStore.delete(mediaId);
      }
    } catch {
      return false;
    }
  }

  /**
   * Returns list of all stored media references
   */
  static async getAllMediaRefs(): Promise<MediaRef[]> {
    try {
      if (typeof indexedDB !== 'undefined') {
        const db = await this.getDB();
        return new Promise<MediaRef[]>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const getAllReq = store.getAll();

          getAllReq.onsuccess = () => {
            const records: MediaRecord[] = getAllReq.result || [];
            resolve(
              records.map(r => ({
                mediaId: r.mediaId,
                fileName: r.fileName,
                mimeType: r.mimeType,
                size: r.size,
                createdAt: r.createdAt,
                storageStatus: r.storageStatus
              }))
            );
          };
          getAllReq.onerror = () => reject(getAllReq.error);
        });
      } else {
        return Array.from(this.memoryFallbackStore.values()).map(r => ({
          mediaId: r.mediaId,
          fileName: r.fileName,
          mimeType: r.mimeType,
          size: r.size,
          createdAt: r.createdAt,
          storageStatus: r.storageStatus
        }));
      }
    } catch {
      return [];
    }
  }
}
