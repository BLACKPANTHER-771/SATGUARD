/**
 * EPOCH — Field Geolocation Service (Phase 14)
 * 
 * Provides browser Geolocation API integration with STRICT GPS INTEGRITY:
 * - If GPS succeeds: stores real latitude, longitude, accuracy, capturedAt.
 * - If GPS fails, times out, or is denied: strictly stores lat: null, lng: null, locationStatus: 'UNAVAILABLE'.
 * - STRICT LOCK: NEVER substitutes AOI center, device IP, hardcoded coordinates, or previous report location.
 */

export interface GPSLocationInfo {
  lat: number | null;
  lng: number | null;
  accuracy: number | null; // in meters
  altitude?: number | null;
  capturedAt: string;
  locationStatus: 'AVAILABLE' | 'UNAVAILABLE';
  locationSource: 'BROWSER_GEOLOCATION' | 'MANUAL' | 'UNAVAILABLE';
  errorMessage?: string | null;
}

export class GeolocationService {
  /**
   * Captures high-accuracy GPS coordinates from browser Geolocation API.
   * If GPS is unavailable, returns null coordinates with 'UNAVAILABLE' status.
   */
  static async captureCurrentPosition(options: {
    timeoutMs?: number;
    enableHighAccuracy?: boolean;
    maximumAgeMs?: number;
  } = {}): Promise<GPSLocationInfo> {
    const timeout = options.timeoutMs ?? 10000;
    const enableHighAccuracy = options.enableHighAccuracy ?? true;
    const maximumAge = options.maximumAgeMs ?? 0;

    const capturedAt = new Date().toISOString();

    // Check if Geolocation API exists
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return {
        lat: null,
        lng: null,
        accuracy: null,
        capturedAt,
        locationStatus: 'UNAVAILABLE',
        locationSource: 'UNAVAILABLE',
        errorMessage: 'Browser Geolocation API not supported'
      };
    }

    return new Promise<GPSLocationInfo>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Success
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude || null,
            capturedAt,
            locationStatus: 'AVAILABLE',
            locationSource: 'BROWSER_GEOLOCATION',
            errorMessage: null
          });
        },
        (err) => {
          // Failure: STRICTLY NULL coordinates without fabrication
          let msg = 'Geolocation failed';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'GPS Permission Denied by User';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'GPS Position Unavailable (Terrain/Cloud obstruction)';
          } else if (err.code === err.TIMEOUT) {
            msg = 'GPS Signal Acquisition Timeout';
          }

          resolve({
            lat: null,
            lng: null,
            accuracy: null,
            capturedAt,
            locationStatus: 'UNAVAILABLE',
            locationSource: 'UNAVAILABLE',
            errorMessage: msg
          });
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge
        }
      );
    });
  }

  /**
   * Returns a safe empty/unavailable GPS record without fabricating coordinates
   */
  static createUnavailableLocation(reason: string = 'GPS NOT CAPTURED'): GPSLocationInfo {
    return {
      lat: null,
      lng: null,
      accuracy: null,
      capturedAt: new Date().toISOString(),
      locationStatus: 'UNAVAILABLE',
      locationSource: 'UNAVAILABLE',
      errorMessage: reason
    };
  }
}
