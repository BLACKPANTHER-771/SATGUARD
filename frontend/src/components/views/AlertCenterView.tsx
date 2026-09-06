import React, { useState, useEffect } from 'react';
import {
  Bell,
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldAlert,
  CloudRain,
  MapPin,
  Check,
  X,
  Send,
  RefreshCw,
  Phone,
  UserCheck,
  Radio,
  Server,
  AlertCircle
} from 'lucide-react';
import {
  MultilingualAlert,
  LanguageCode,
  AlertLanguage,
  AlertStatus,
  EpochAlert,
  SMSRecipient,
  SMSNotification,
  SMSProviderStatus
} from '../../types';
import { AlertService } from '../../services/alertService';
import { SMSService } from '../../services/smsService';
import { getPrimaryAOIForState } from '../../data/command-centre/aoiRegistry';

interface AlertCenterViewProps {
  alerts: MultilingualAlert[];
  selectedLanguage: LanguageCode;
  selectedState?: string;
  onSelectLanguage: (lang: LanguageCode) => void;
}

export const AlertCenterView: React.FC<AlertCenterViewProps> = ({
  alerts,
  selectedLanguage,
  selectedState = 'Sikkim',
  onSelectLanguage
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [providerStatus, setProviderStatus] = useState<SMSProviderStatus>({
    mode: 'DRY_RUN',
    provider: 'dry-run',
    configured: false,
    persistence_mode: 'IN_MEMORY_CACHE'
  });
  const [recipients, setRecipients] = useState<SMSRecipient[]>([]);
  const [notifications, setNotifications] = useState<SMSNotification[]>([]);
  const [dispatchLoadingAlertId, setDispatchLoadingAlertId] = useState<string | null>(null);
  const [retryLoadingId, setRetryLoadingId] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const [localAlertsState, setLocalAlertsState] = useState<EpochAlert[]>(() => {
    const stored = AlertService.getStoredAlerts();
    const converted = alerts.map(a => AlertService.fromMultilingualAlert(a));
    const merged = [...stored];
    const existingIds = new Set(stored.map(s => s.alertId));
    for (const c of converted) {
      if (!existingIds.has(c.alertId)) {
        merged.push(c);
        existingIds.add(c.alertId);
      }
    }
    return merged;
  });

  const languageNames: Record<AlertLanguage, string> = {
    en: 'English',
    hi: 'हिंदी (Hindi)',
    as: 'অসমীয়া (Assamese)',
    bn: 'বাংলা (Bengali)'
  };

  // Fetch initial SMS provider status, recipients, and audit logs from backend
  useEffect(() => {
    let isMounted = true;
    const loadSMSData = async () => {
      const [statusRes, recsRes, notifsRes] = await Promise.all([
        SMSService.getProviderStatus(),
        SMSService.getRecipients(),
        SMSService.getNotifications()
      ]);
      if (isMounted) {
        setProviderStatus(statusRes);
        setRecipients(recsRes);
        setNotifications(notifsRes);
      }
    };
    loadSMSData();
    return () => { isMounted = false; };
  }, []);

  const handleApprove = async (alertId: string) => {
    const approver = 'District Disaster Officer (SEOC Duty Commander)';
    const updated = AlertService.updateAlertStatus(alertId, 'APPROVED', approver);
    setLocalAlertsState(prev => prev.map(a => a.alertId === alertId ? (updated || { ...a, status: 'APPROVED', approvedBy: approver, approvedAt: new Date().toLocaleTimeString('en-IN') + ' IST' }) : a));
    // Synchronize authoritative status with backend
    await SMSService.syncAlertStatusToBackend(alertId, 'APPROVED', approver);
  };

  const handleReject = async (alertId: string) => {
    const updated = AlertService.updateAlertStatus(alertId, 'REJECTED', 'Duty Officer (Dismissed)');
    setLocalAlertsState(prev => prev.map(a => a.alertId === alertId ? (updated || { ...a, status: 'REJECTED' }) : a));
    // Synchronize authoritative status with backend
    await SMSService.syncAlertStatusToBackend(alertId, 'REJECTED');
  };

  const handleDispatchSMS = async (alertId: string) => {
    setDispatchLoadingAlertId(alertId);
    setDispatchError(null);
    try {
      const res = await SMSService.dispatchAlertSMS(alertId);
      if (res.success && res.notifications.length > 0) {
        setNotifications(prev => {
          const newIds = new Set(res.notifications.map(n => n.notificationId));
          return [...res.notifications, ...prev.filter(n => !newIds.has(n.notificationId))];
        });
      } else if (!res.success) {
        setDispatchError(res.message || 'SMS dispatch failed');
      }
    } catch (e: any) {
      setDispatchError(e?.message || 'Gateway communication error');
    } finally {
      setDispatchLoadingAlertId(null);
    }
  };

  const handleRetrySMS = async (notificationId: string) => {
    setRetryLoadingId(notificationId);
    try {
      const res = await SMSService.retryNotification(notificationId);
      if (res.success && res.notification) {
        setNotifications(prev => prev.map(n => n.notificationId === notificationId ? res.notification! : n));
      }
    } catch {
      // Error handling
    } finally {
      setRetryLoadingId(null);
    }
  };

  const currentAOI = getPrimaryAOIForState(selectedState);

  const sortedAlerts = [...localAlertsState].sort((a, b) => {
    if (selectedState && selectedState !== 'ALL') {
      const aMatch = (a.where || '').toLowerCase().includes(selectedState.toLowerCase()) || a.aoiId.includes(selectedState.toLowerCase());
      const bMatch = (b.where || '').toLowerCase().includes(selectedState.toLowerCase()) || b.aoiId.includes(selectedState.toLowerCase());
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
    }
    return 0;
  });

  const filteredAlerts = sortedAlerts.filter((alert) => {
    if (filterStatus === 'ALL') return true;
    return alert.status === filterStatus;
  });

  return (
    <div className="h-full flex flex-col space-y-3 font-sans select-none overflow-y-auto pr-1">
      {/* Header */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-subtle card-hover-lift">
        <div>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-[#C58A24]" />
            <h1 className="font-semibold text-sm text-[#172126] tracking-wide">
              MULTILINGUAL EMERGENCY ALERT BROADCAST CENTER
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#167F78]/10 text-[#167F78] border border-[#167F78]/25 font-semibold">
              CAP SIMULATION · DRAFT
            </span>
          </div>
          <p className="text-xs text-[#667579] mt-1">
            Common Alerting Protocol (CAP) and SMS emergency notification dispatch across English, Hindi, Assamese, and Bengali. All dispatches strictly require human approval.
          </p>
        </div>

        {/* Language Switcher Bar */}
        <div className="flex items-center space-x-1.5 bg-[#E6EDEB] p-1.5 rounded-lg border border-[#D7DEDC] text-xs">
          <Globe className="w-3.5 h-3.5 text-[#167F78] ml-1" />
          <span className="text-[#667579] text-[11px] mr-1 font-semibold">LANGUAGE:</span>
          {(['en', 'hi', 'as', 'bn'] as AlertLanguage[]).map((lang) => (
            <button
              key={lang}
              onClick={() => onSelectLanguage(lang as LanguageCode)}
              className={`px-2.5 py-1 rounded-md transition-colors text-xs font-medium cursor-pointer ${
                selectedLanguage === lang
                  ? 'bg-[#FAF8F1] text-[#167F78] font-semibold shadow-subtle'
                  : 'text-[#667579] hover:text-[#172126]'
              }`}
            >
              {languageNames[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* SEPARATION BANNER: IMD METEOROLOGICAL WARNING VS EPOCH DECISION SUPPORT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* IMD Official Warning Box */}
        <div className="bg-[#FAF8F1] border border-[#C58A24]/40 rounded-xl p-3 shadow-subtle card-hover-lift flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-[#C58A24]/15 text-[#C58A24] shrink-0 mt-0.5">
            <CloudRain className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-[#C58A24]/10 text-[#C58A24] font-semibold border border-[#C58A24]/25">
                OFFICIAL IMD METEOROLOGICAL SOURCE
              </span>
              <span className="text-[10px] text-[#667579] font-mono">SEOC AWS Feed</span>
            </div>
            <div className="font-semibold text-[#172126]">
              IMD Heavy Rainfall Warning (RED / ORANGE Alert)
            </div>
            <p className="text-[11px] text-[#667579] leading-relaxed">
              Official IMD Bulletin: Continuous convective rainfall exceeding 25–40 mm/hr across Himalayan & Barak Valley sectors. Issued by India Meteorological Department.
            </p>
          </div>
        </div>

        {/* EPOCH Decision Alert Box */}
        <div className="bg-[#FAF8F1] border border-[#167F78]/40 rounded-xl p-3 shadow-subtle card-hover-lift flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-[#167F78]/15 text-[#167F78] shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-[#167F78]/10 text-[#167F78] font-semibold border border-[#167F78]/25">
                EPOCH DECISION-SUPPORT ALERT
              </span>
              <span className="text-[10px] text-[#167F78] font-mono font-semibold">HUMAN APPROVAL REQUIRED</span>
            </div>
            <div className="font-semibold text-[#172126]">
              Multi-Factor Landslide & Lifeline Corridor Advisory
            </div>
            <p className="text-[11px] text-[#667579] leading-relaxed">
              Correlating IMD precipitation triggers with Cartosat-3 slope geometry, antecedent soil saturation, and Sentinel-1 SAR observations. Requires duty commander approval.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-[#FAF8F1] p-2 rounded-xl border border-[#D7DEDC]">
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-[11px] text-[#667579] font-semibold uppercase px-2">ALERT STATUS:</span>
          {['ALL', 'DRAFT', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filterStatus === st
                  ? 'bg-[#167F78] text-[#FAF8F1] font-semibold shadow-subtle'
                  : 'text-[#667579] hover:text-[#172126] bg-[#E6EDEB]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="text-[11px] font-mono text-[#667579] pr-2">
          SHOWING: {filteredAlerts.length} ALERTS ({selectedState})
        </div>
      </div>

      {/* Alert Cards Grid */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => {
          const isP1 = alert.priority === 'P1';
          const isApproved = alert.status === 'APPROVED';
          const isRejected = alert.status === 'REJECTED';
          const isDraft = alert.status === 'DRAFT';

          const content = AlertService.getAlertContent(alert, selectedLanguage);

          // Get SMS notifications associated with this alert
          const alertNotifications = notifications.filter(n => n.alertId === alert.alertId);
          const sentCount = alertNotifications.filter(n => n.status === 'SENT' || n.status === 'DELIVERED').length;
          const failedCount = alertNotifications.filter(n => n.status === 'FAILED').length;
          const skippedCount = alertNotifications.filter(n => n.status === 'SKIPPED').length;

          // Target recipients for this AOI
          const aoiRecipients = recipients.filter(r => !r.aoiId || r.aoiId === alert.aoiId);
          const totalRecipientsCount = aoiRecipients.length > 0 ? aoiRecipients.length : recipients.length;

          return (
            <div
              key={alert.alertId}
              className={`bg-[#FAF8F1] border rounded-xl p-4 space-y-3.5 shadow-subtle transition-all card-hover-lift select-text ${
                isP1
                  ? 'border-[#C95050]/40'
                  : 'border-[#C58A24]/40'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2">
                <div className="flex items-center space-x-2.5">
                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                      isP1
                        ? 'bg-[#C95050]/15 text-[#C95050] border-[#C95050]/30'
                        : 'bg-[#C58A24]/15 text-[#C58A24] border-[#C58A24]/30'
                    }`}
                  >
                    {alert.priority} — {alert.riskLevel}
                  </span>

                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                      isApproved
                        ? 'bg-[#167F78]/15 text-[#167F78] border-[#167F78]/30'
                        : isRejected
                        ? 'bg-[#C95050]/15 text-[#C95050] border-[#C95050]/30'
                        : 'bg-[#C58A24]/15 text-[#C58A24] border-[#C58A24]/30'
                    }`}
                  >
                    STATUS: {alert.status}
                  </span>

                  <span className="text-xs font-semibold text-[#172126] tracking-wide">{content.title}</span>
                </div>

                <div className="flex items-center space-x-2 text-[11px] text-[#667579] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-[#E6EDEB] border border-[#D7DEDC] text-[10px]">
                    SOURCE: {alert.source}
                  </span>
                  <span>•</span>
                  <span>{alert.generatedAt}</span>
                </div>
              </div>

              {/* 7-PART STANDARDIZED CONTENT (WHAT, WHERE, WHY, SEVERITY, ACTION) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Left Column: WHAT / WHERE / WHY / SEVERITY */}
                <div className="bg-[#E6EDEB] p-3 rounded-lg border border-[#D7DEDC] space-y-2">
                  <div>
                    <span className="text-[10px] text-[#667579] uppercase font-semibold block">1. LOCATION (WHERE):</span>
                    <div className="text-[#172126] font-medium leading-relaxed flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#167F78] shrink-0" />
                      <span>{content.where}</span>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-[#D7DEDC]">
                    <span className="text-[10px] text-[#667579] uppercase font-semibold block">2. HAZARD DRIVERS (WHY):</span>
                    <div className="text-[#172126] font-medium leading-relaxed mt-0.5">{content.why}</div>
                  </div>

                  <div className="pt-1 border-t border-[#D7DEDC] flex items-center justify-between font-mono text-[11px]">
                    <div>
                      <strong className="text-[#667579]">SEVERITY:</strong>{' '}
                      <span className="text-[#C95050] font-bold">{alert.riskScore}/100 ({alert.riskLevel})</span>
                    </div>
                    <div>
                      <strong className="text-[#667579]">VALID:</strong> {alert.validUntil || 'NEXT 3 HOURS'}
                    </div>
                  </div>
                </div>

                {/* Right Column: RECOMMENDED ADVISORY & ACTIONS */}
                <div className="bg-[#E6EDEB] p-3 rounded-lg border border-[#D7DEDC] space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-[#667579] uppercase font-semibold block">
                      3. RECOMMENDED ADVISORY & ACTIONS:
                    </span>
                    <div className="text-[#167F78] font-medium leading-relaxed mt-1 bg-[#FAF8F1] p-2.5 rounded border border-[#167F78]/25">
                      {content.recommendedAction}
                    </div>
                  </div>

                  {/* Context Sources Badges */}
                  <div className="pt-1 border-t border-[#D7DEDC]">
                    <span className="text-[10px] text-[#667579] uppercase font-semibold block mb-1">
                      CORRELATED EVIDENCE CONTEXT:
                    </span>
                    <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-[#FAF8F1] border border-[#D7DEDC] text-[#397FA8]">
                        IMD: {alert.contextSources.imd ? 'ATTACHED' : 'UNAVAILABLE'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#FAF8F1] border border-[#D7DEDC] text-[#167F78]">
                        SAR: {alert.contextSources.sentinel1 ? 'ATTACHED' : 'UNAVAILABLE'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#FAF8F1] border border-[#D7DEDC] text-[#C58A24]">
                        GROUND TRUTH: {alert.contextSources.fieldVerification ? 'MATCHED' : 'PENDING'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ============================================================ */}
              {/* PHASE 12: SMS EMERGENCY GATEWAY DISPATCH STATION */}
              {/* ============================================================ */}
              <div className="bg-[#E6EDEB]/70 border border-[#D7DEDC] rounded-xl p-3 space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D7DEDC] pb-2">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-[#167F78]" />
                    <span className="font-semibold text-xs text-[#172126] tracking-wide">
                      SMS EMERGENCY GATEWAY
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.2 rounded font-semibold border ${
                      providerStatus.mode === 'LIVE'
                        ? 'bg-[#167F78]/15 text-[#167F78] border-[#167F78]/30'
                        : providerStatus.mode === 'UNAVAILABLE'
                        ? 'bg-[#C95050]/15 text-[#C95050] border-[#C95050]/30'
                        : 'bg-[#C58A24]/15 text-[#C58A24] border-[#C58A24]/30'
                    }`}>
                      {providerStatus.mode === 'LIVE'
                        ? 'SMS GATEWAY CONNECTED · LIVE'
                        : providerStatus.mode === 'UNAVAILABLE'
                        ? 'LIVE PROVIDER VERIFICATION BLOCKED'
                        : 'SMS GATEWAY READY · DRY-RUN MODE (SIMULATION)'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] font-mono text-[#667579]">
                    <span>RECIPIENTS: <strong className="text-[#172126]">{totalRecipientsCount}</strong></span>
                    <span>SENT: <strong className="text-[#167F78]">{sentCount}</strong></span>
                    {failedCount > 0 && <span>FAILED: <strong className="text-[#C95050]">{failedCount}</strong></span>}
                    {skippedCount > 0 && <span>SKIPPED: <strong className="text-[#667579]">{skippedCount}</strong></span>}
                  </div>
                </div>

                {/* Dispatch Controls & Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-[11px] text-[#667579]">
                    {isDraft && (
                      <span className="text-[#C58A24] flex items-center space-x-1 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>HUMAN APPROVAL REQUIRED: SMS dispatch is locked until alert is approved.</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="text-[#C95050] flex items-center space-x-1 font-medium">
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>ALERT REJECTED: SMS dispatch is prohibited for rejected drafts.</span>
                      </span>
                    )}
                    {isApproved && alertNotifications.length === 0 && (
                      <span className="text-[#167F78] flex items-center space-x-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>AUTHORIZED FOR DISPATCH: Ready to transmit targeted emergency SMS in recipient preferred languages.</span>
                      </span>
                    )}
                    {isApproved && alertNotifications.length > 0 && (
                      <span className="text-[#167F78] flex items-center space-x-1 font-mono">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>DISPATCH COMPLETED ({sentCount} active, {skippedCount} skipped, {failedCount} failed) · IDEMPOTENCY ACTIVE</span>
                      </span>
                    )}
                  </div>

                  {isApproved && (
                    <button
                      onClick={() => handleDispatchSMS(alert.alertId)}
                      disabled={dispatchLoadingAlertId === alert.alertId}
                      className="px-3.5 py-1.5 rounded-lg bg-[#167F78] hover:bg-[#136E68] disabled:opacity-50 text-[#FAF8F1] font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-subtle"
                    >
                      {dispatchLoadingAlertId === alert.alertId ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>TRANSMITTING...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>DISPATCH SMS NOTIFICATIONS ({providerStatus.mode})</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Recipient Audit Log Cards */}
                {alertNotifications.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-[#D7DEDC]">
                    <div className="text-[10px] font-mono uppercase text-[#667579] font-semibold flex items-center justify-between">
                      <span>DISPATCH AUDIT LOG (MASKED FOR PRIVACY):</span>
                      <span>PERSISTENCE: {providerStatus.persistence_mode || 'IN_MEMORY_CACHE'}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {alertNotifications.map((notif) => {
                        const isSent = notif.status === 'SENT' || notif.status === 'DELIVERED';
                        const isFailed = notif.status === 'FAILED';
                        const isSkipped = notif.status === 'SKIPPED';

                        return (
                          <div
                            key={notif.notificationId}
                            className="bg-[#FAF8F1] p-2 rounded-lg border border-[#D7DEDC] flex items-start justify-between space-x-2 text-[11px]"
                          >
                            <div className="space-y-0.5">
                              <div className="font-semibold text-[#172126] flex items-center space-x-1">
                                <Phone className="w-3 h-3 text-[#167F78]" />
                                <span>{notif.recipientName || 'Responder'}</span>
                                <span className="text-[10px] font-mono text-[#667579]">({notif.maskedPhone})</span>
                              </div>
                              <div className="text-[10px] text-[#667579]">{notif.recipientRole}</div>
                              <div className="text-[10px] font-mono text-[#667579] flex items-center space-x-2 pt-0.5">
                                <span>LANG: <strong className="text-[#172126]">{notif.language?.toUpperCase()}</strong></span>
                                <span>•</span>
                                <span>ATTEMPT: #{notif.attemptNumber}</span>
                                {notif.dryRun && <span className="text-[#C58A24] font-semibold">(DRY RUN)</span>}
                              </div>
                              {isFailed && notif.failureReason && (
                                <div className="text-[10px] text-[#C95050] font-medium pt-0.5">
                                  Error: {notif.failureReason}
                                </div>
                              )}
                            </div>

                            <div className="shrink-0 flex flex-col items-end space-y-1">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                                  isSent
                                    ? 'bg-[#167F78]/15 text-[#167F78] border-[#167F78]/30'
                                    : isFailed
                                    ? 'bg-[#C95050]/15 text-[#C95050] border-[#C95050]/30'
                                    : 'bg-[#667579]/15 text-[#667579] border-[#667579]/30'
                                }`}
                              >
                                {notif.status === 'SENT' && notif.dryRun ? 'SENT (DRY_RUN)' : notif.status}
                              </span>

                              {isFailed && (
                                <button
                                  onClick={() => handleRetrySMS(notif.notificationId)}
                                  disabled={retryLoadingId === notif.notificationId}
                                  className="px-2 py-0.5 rounded bg-[#C95050]/15 hover:bg-[#C95050]/25 text-[#C95050] font-semibold text-[10px] border border-[#C95050]/30 transition-colors flex items-center space-x-1 cursor-pointer"
                                >
                                  <RefreshCw className={`w-2.5 h-2.5 ${retryLoadingId === notif.notificationId ? 'animate-spin' : ''}`} />
                                  <span>RETRY</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer: Human Approval Action Controls */}
              <div className="flex flex-wrap items-center justify-between border-t border-[#D7DEDC] pt-2 text-[11px] text-[#667579] gap-2">
                <div className="flex items-center space-x-2">
                  <span>CAP STATUS: <strong className="text-[#172126]">SIMULATION / DRAFT</strong></span>
                  <span>•</span>
                  <span>APPROVAL: {alert.approvedBy ? `${alert.approvedBy} (${alert.approvedAt})` : 'Awaiting Review'}</span>
                </div>

                {/* Approval Triage Actions */}
                <div className="flex items-center space-x-2">
                  {isDraft && (
                    <>
                      <button
                        onClick={() => handleApprove(alert.alertId)}
                        className="px-3 py-1 rounded-lg bg-[#167F78] hover:bg-[#136E68] text-[#FAF8F1] font-semibold text-xs transition-colors flex items-center space-x-1 cursor-pointer shadow-subtle"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>APPROVE & AUTHORIZE</span>
                      </button>
                      <button
                        onClick={() => handleReject(alert.alertId)}
                        className="px-3 py-1 rounded-lg bg-[#C95050]/10 hover:bg-[#C95050]/20 text-[#C95050] font-semibold text-xs border border-[#C95050]/20 transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>REJECT DRAFT</span>
                      </button>
                    </>
                  )}

                  {isApproved && (
                    <span className="text-[#167F78] font-semibold flex items-center space-x-1 font-mono text-xs">
                      <CheckCircle2 className="w-4 h-4 text-[#167F78]" />
                      <span>APPROVED & BROADCAST READY</span>
                    </span>
                  )}

                  {isRejected && (
                    <span className="text-[#C95050] font-semibold flex items-center space-x-1 font-mono text-xs">
                      <XCircle className="w-4 h-4 text-[#C95050]" />
                      <span>DRAFT REJECTED</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
