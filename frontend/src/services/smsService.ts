/**
 * EPOCH — Phase 12: SMS Gateway Client Service
 * 
 * Compliant with Phase-12 Constraints:
 * 1. Command/Read-only Client: Calls backend API as the single authority for SMS state.
 * 2. Zero In-Browser Faking: If backend is offline, reports 'SMS GATEWAY UNAVAILABLE'.
 *    Never creates fake local dispatch records.
 * 3. Masked Phone Display: Masks E.164 phone numbers for UI privacy.
 */

import type {
  SMSRecipient,
  SMSNotification,
  SMSProviderStatus,
  SMSDispatchResult
} from '../types/index.ts';

const API_BASE = '/api/v1';

export class SMSService {
  /**
   * Masks international E.164 phone number for secure UI display (e.g. +91******3210).
   */
  static maskPhoneNumber(phone?: string | null): string {
    if (!phone) return 'N/A';
    const clean = phone.trim();
    if (clean.length >= 8) {
      const prefix = clean.slice(0, 3);
      const suffix = clean.slice(-4);
      const maskedMiddle = '*'.repeat(clean.length - 7);
      return `${prefix}${maskedMiddle}${suffix}`;
    }
    return clean.slice(0, 2) + '****';
  }

  /**
   * Fetches the current SMS provider status from backend.
   */
  static async getProviderStatus(): Promise<SMSProviderStatus> {
    try {
      const res = await fetch(`${API_BASE}/notifications/sms/provider-status`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Backend offline
    }
    return {
      mode: 'UNAVAILABLE',
      provider: 'gateway-offline',
      configured: false,
      persistence_mode: 'UNAVAILABLE'
    };
  }

  /**
   * Fetches registered authoritative emergency responders.
   */
  static async getRecipients(aoiId?: string): Promise<SMSRecipient[]> {
    try {
      const url = aoiId
        ? `${API_BASE}/notifications/sms/recipients?aoi_id=${encodeURIComponent(aoiId)}`
        : `${API_BASE}/notifications/sms/recipients`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.recipients || [];
      }
    } catch {
      // Backend offline
    }
    return [];
  }

  /**
   * Fetches SMS notification audit log.
   */
  static async getNotifications(alertId?: string, aoiId?: string): Promise<SMSNotification[]> {
    try {
      let url = `${API_BASE}/notifications/sms`;
      const params = new URLSearchParams();
      if (alertId) params.append('alert_id', alertId);
      if (aoiId) params.append('aoi_id', aoiId);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.notifications || [];
      }
    } catch {
      // Backend offline
    }
    return [];
  }

  /**
   * Synchronizes alert approval/rejection status with backend authoritative registry.
   */
  static async syncAlertStatusToBackend(alertId: string, status: string, approvedBy?: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          approved_by: approvedBy
        })
      });
    } catch {
      // Backend sync attempt
    }
  }

  /**
   * Dispatches SMS for an approved alert via backend gateway.
   */
  static async dispatchAlertSMS(alertId: string): Promise<SMSDispatchResult> {
    try {
      const res = await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        return await res.json();
      } else {
        const err = await res.json().catch(() => ({}));
        return {
          success: false,
          status: 'BLOCKED',
          message: err.detail || 'SMS dispatch rejected by backend authorization gateway.',
          notifications: []
        };
      }
    } catch {
      return {
        success: false,
        status: 'UNAVAILABLE',
        message: 'SMS GATEWAY UNAVAILABLE — Backend connection unreachable.',
        notifications: []
      };
    }
  }

  /**
   * Triggers retry for a failed notification record.
   */
  static async retryNotification(notificationId: string): Promise<{ success: boolean; notification?: SMSNotification; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/notifications/sms/${encodeURIComponent(notificationId)}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, notification: data.notification };
      } else {
        const err = await res.json().catch(() => ({}));
        return { success: false, message: err.detail || 'Retry failed on backend.' };
      }
    } catch {
      return {
        success: false,
        message: 'SMS GATEWAY UNAVAILABLE — Backend connection unreachable.'
      };
    }
  }
}
