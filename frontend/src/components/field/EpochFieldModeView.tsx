import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  WifiOff,
  Crosshair,
  Camera,
  Video,
  Send,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Download,
  Smartphone,
  Info,
  X,
  FileCheck2,
  Trash2,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { RiskZone, EvidenceCard, FieldReport } from '../../types';
import { OfflineSyncService } from '../../services/offlineSyncService';
import { GeolocationService, GPSLocationInfo } from '../../services/geolocationService';
import { MediaStorageService, MediaRef } from '../../services/mediaStorageService';
import { FieldReportService } from '../../services/fieldReportService';
import { DataService } from '../../services/dataService';

interface EpochFieldModeViewProps {
  zones: RiskZone[];
  selectedZone: RiskZone;
  selectedState: string;
  onSelectZone: (zone: RiskZone) => void;
  evidenceCards: EvidenceCard[];
  onIncidentSubmitted?: (newIncident: EvidenceCard, wasOffline: boolean) => void;
  onOpenCommandCenter?: () => void;
}

export const EpochFieldModeView: React.FC<EpochFieldModeViewProps> = ({
  zones,
  selectedZone,
  selectedState,
  onSelectZone,
  evidenceCards,
  onIncidentSubmitted,
  onOpenCommandCenter
}) => {
  // Connectivity & Backend States
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(OfflineSyncService.isOnline());
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStats, setSyncStats] = useState(OfflineSyncService.getSyncStats());

  // GPS State
  const [gpsInfo, setGpsInfo] = useState<GPSLocationInfo>({
    lat: selectedZone?.lat ?? null,
    lng: selectedZone?.lng ?? null,
    accuracy: 15,
    capturedAt: new Date().toISOString(),
    locationStatus: 'AVAILABLE',
    locationSource: 'MANUAL'
  });
  const [isCapturingGps, setIsCapturingGps] = useState<boolean>(false);

  // Media Attachment State
  const [attachedMedia, setAttachedMedia] = useState<MediaRef[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [incidentType, setIncidentType] = useState<string>('LANDSLIDE');
  const [locationName, setLocationName] = useState<string>(selectedZone ? `${selectedZone.name}` : 'Sikkim NH-10 Sector');
  const [notes, setNotes] = useState<string>('');
  const [severity, setSeverity] = useState<string>('SEVERE');
  const [roadBlocked, setRoadBlocked] = useState<boolean>(true);
  const [reporterName, setReporterName] = useState<string>('Field Officer (Mobile PWA)');
  const [reporterRole, setReporterRole] = useState<string>('DISTRICT_OFFICER');

  // Submission Feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  // Subscribe to offline queue changes
  useEffect(() => {
    const unsubscribe = OfflineSyncService.subscribe(() => {
      setSyncStats(OfflineSyncService.getSyncStats());
    });

    const updateNetworkStatus = () => {
      setIsNetworkOnline(OfflineSyncService.isOnline());
      checkBackend();
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Periodic backend check
    const checkBackend = async () => {
      const ok = await OfflineSyncService.checkBackendConnectivity();
      setIsBackendConnected(ok);
    };
    checkBackend();
    const interval = setInterval(checkBackend, 15000);

    // PWA Install Event Listeners
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check standalone display mode
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    return () => {
      unsubscribe();
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearInterval(interval);
    };
  }, []);

  // Update location name if selectedZone changes
  useEffect(() => {
    if (selectedZone) {
      setLocationName(selectedZone.name);
    }
  }, [selectedZone]);

  // Handle GPS Capture
  const handleCaptureGPS = async () => {
    setIsCapturingGps(true);
    try {
      const pos = await GeolocationService.captureCurrentPosition({ timeoutMs: 12000 });
      setGpsInfo(pos);
    } catch {
      setGpsInfo(GeolocationService.createUnavailableLocation('Failed to capture GPS coordinates.'));
    } finally {
      setIsCapturingGps(false);
    }
  };

  // Handle File Media Attachment (IndexedDB)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMediaError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await MediaStorageService.storeMedia(file);
      if (result.error || result.ref.storageStatus === 'UNAVAILABLE') {
        setMediaError(result.error || 'MEDIA STORAGE UNAVAILABLE: Browser storage quota exceeded or unavailable.');
      } else {
        setAttachedMedia((prev) => [...prev, result.ref]);
      }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveMedia = async (mediaId: string) => {
    await MediaStorageService.deleteMedia(mediaId);
    setAttachedMedia((prev) => prev.filter((m) => m.mediaId !== mediaId));
  };

  // Handle Sync Now
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await OfflineSyncService.syncPendingQueue();
      setSyncStats(OfflineSyncService.getSyncStats());
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle PWA Install Click
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstallGuide(true);
    }
  };

  // Handle Form Submission
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMediaError(null);

    const payload = {
      location_name: locationName,
      state: selectedZone?.state || selectedState || 'Sikkim',
      district: selectedZone?.district || 'Pakyong',
      lat: gpsInfo.locationStatus === 'AVAILABLE' ? gpsInfo.lat : null,
      lng: gpsInfo.locationStatus === 'AVAILABLE' ? gpsInfo.lng : null,
      location_status: gpsInfo.locationStatus,
      location_source: gpsInfo.locationSource,
      location_accuracy: gpsInfo.accuracy,
      incident_type: incidentType,
      severity: severity,
      road_blocked: roadBlocked,
      reporter_name: reporterName,
      reporter_role: reporterRole,
      has_video: attachedMedia.some((m) => m.mimeType.startsWith('video/')),
      notes: notes,
      mediaRefs: attachedMedia
    };

    try {
      const res = await DataService.submitIncident(payload);
      setLastSubmittedId(res.incident.id);
      setIsSubmitting(false);
      setSubmissionSuccess(true);

      if (onIncidentSubmitted) {
        onIncidentSubmitted(res.incident, res.wasQueuedOffline);
      }

      // Reset form after short delay
      setTimeout(() => {
        setNotes('');
        setAttachedMedia([]);
        setSubmissionSuccess(false);
      }, 2500);
    } catch (err: any) {
      setIsSubmitting(false);
      setMediaError(err?.message || 'Failed to process report.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#EEE9DC] text-[#172126] font-sans overflow-y-auto">
      {/* 1. TOP MOBILE FIELD STATUS BAR */}
      <div className="bg-[#172126] text-[#FAF8F1] px-4 py-3 shadow-md sticky top-0 z-20">
        <div className="max-w-xl mx-auto flex flex-col space-y-2">
          {/* Brand & Mode Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-[#167F78] animate-pulse" />
              <span className="font-bold text-sm tracking-wider uppercase">EPOCH FIELD APP</span>
              <span className="px-1.5 py-0.5 rounded bg-[#FAF8F1]/10 text-[10px] font-mono text-[#C58A24]">
                PWA FIELD MODE
              </span>
            </div>

            {/* Install / Standalone Badge */}
            <div className="flex items-center space-x-1.5">
              {isStandalone ? (
                <span className="flex items-center text-[10px] bg-[#167F78]/30 border border-[#167F78]/50 text-[#8CE3DD] px-2 py-0.5 rounded-full font-mono">
                  <Smartphone className="w-3 h-3 mr-1" /> STANDALONE
                </span>
              ) : (
                <button
                  onClick={handleInstallClick}
                  className="flex items-center text-[10px] bg-[#C58A24] hover:bg-[#b07b20] text-[#172126] font-bold px-2 py-0.5 rounded-full transition-colors cursor-pointer shadow-sm"
                  title="Install EPOCH Field PWA"
                >
                  <Download className="w-3 h-3 mr-1" /> INSTALL PWA
                </button>
              )}
            </div>
          </div>

          {/* Persistent Telemetry Grid */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 text-xs">
            {/* Network & Backend Indicator */}
            <div className="flex flex-col bg-white/5 p-2 rounded border border-white/10">
              <span className="text-[9px] text-[#A2B1B4] font-semibold uppercase">NETWORK</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                {isNetworkOnline ? (
                  <Wifi className="w-3.5 h-3.5 text-[#167F78]" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-[#C95050]" />
                )}
                <span className={`font-mono text-[11px] font-bold ${isNetworkOnline ? 'text-[#8CE3DD]' : 'text-[#C95050]'}`}>
                  {isNetworkOnline ? (isBackendConnected ? 'ONLINE' : 'BACKEND UNREACHABLE') : 'OFFLINE'}
                </span>
              </div>
            </div>

            {/* GPS Telemetry Indicator */}
            <div className="flex flex-col bg-white/5 p-2 rounded border border-white/10">
              <span className="text-[9px] text-[#A2B1B4] font-semibold uppercase">GPS STATUS</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <Crosshair className={`w-3.5 h-3.5 ${gpsInfo.locationStatus === 'AVAILABLE' ? 'text-[#167F78]' : 'text-[#C58A24]'}`} />
                <span className={`font-mono text-[11px] font-bold ${gpsInfo.locationStatus === 'AVAILABLE' ? 'text-[#8CE3DD]' : 'text-[#C58A24]'}`}>
                  {gpsInfo.locationStatus === 'AVAILABLE' ? `±${gpsInfo.accuracy ?? 15}m` : 'UNAVAILABLE'}
                </span>
              </div>
            </div>

            {/* Phase-13 Sync Queue Indicator */}
            <div className="flex flex-col bg-white/5 p-2 rounded border border-white/10">
              <span className="text-[9px] text-[#A2B1B4] font-semibold uppercase">SYNC QUEUE</span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-mono text-[11px] font-bold text-[#FAF8F1]">
                  {syncStats.pending} PENDING
                </span>
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing || !isNetworkOnline}
                  className="text-white/70 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Trigger Phase-13 Synchronization"
                >
                  <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN MOBILE CONTENT CONTAINER */}
      <div className="max-w-xl w-full mx-auto p-4 flex-1 flex flex-col space-y-4">
        {/* Storage / Media Error Alert */}
        {mediaError && (
          <div className="bg-[#C95050]/15 border border-[#C95050] text-[#7A1D1D] p-3 rounded-xl flex items-start space-x-2 text-xs">
            <AlertTriangle className="w-4 h-4 text-[#C95050] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block uppercase tracking-wide">Storage Notice:</span>
              <span>{mediaError}</span>
            </div>
            <button onClick={() => setMediaError(null)} className="text-[#7A1D1D] hover:text-black">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Successful Incident Submission Screen */}
        {submissionSuccess ? (
          <div className="bg-[#FAF8F1] border border-[#167F78] rounded-2xl p-6 shadow-md text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#167F78] mx-auto animate-bounce" />
            <h3 className="font-bold text-base text-[#172126]">
              {isNetworkOnline ? 'Incident Transmitted to Ground Truth Hub' : 'Incident Queued Locally in PWA Store'}
            </h3>
            <p className="text-xs text-[#667579]">
              {isNetworkOnline
                ? `Evidence record ${lastSubmittedId} submitted. Status assigned: PENDING REVIEW.`
                : 'Report, metadata, and media stored safely offline in Phase-13 queue. Will auto-sync on connection.'}
            </p>
            <div className="p-2 bg-[#E6EDEB] rounded-lg text-[11px] font-mono text-[#167F78] font-semibold">
              ID: {lastSubmittedId} • STATUS: PENDING REVIEW
            </div>
          </div>
        ) : (
          /* 3. REPORT INCIDENT FORM */
          <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2.5">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-[#167F78]" />
                <h2 className="font-bold text-sm text-[#172126] tracking-wide">
                  REPORT FIELD INCIDENT
                </h2>
              </div>
              <span className="text-[10px] text-[#667579] font-mono">
                {selectedState}
              </span>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3.5 text-xs">
              {/* Incident Type Selector */}
              <div>
                <label className="block text-[#667579] font-bold text-[11px] mb-1 uppercase tracking-wider">
                  INCIDENT / HAZARD TYPE *
                </label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full bg-[#E6EDEB] border border-[#D7DEDC] rounded-xl px-3 py-2.5 text-[#172126] font-semibold text-xs focus:border-[#167F78] focus:outline-none"
                >
                  <option value="LANDSLIDE">Mass Landslide Failure / Mudslide</option>
                  <option value="ROCKFALL">Rockfall / Boulder Roll</option>
                  <option value="CRACK">Ground Tension Crack / Fissure</option>
                  <option value="SLOPE_MOVEMENT">Slope Slump / Creep Movement</option>
                  <option value="ROAD_BLOCKAGE">Carriageway Debris Blockage</option>
                  <option value="FLOODING">Flash Flood / Culvert Breach</option>
                  <option value="OTHER">Other Disaster Evidence</option>
                </select>
              </div>

              {/* Location & Sector */}
              <div>
                <label className="block text-[#667579] font-bold text-[11px] mb-1 uppercase tracking-wider">
                  LOCATION & SECTOR NAME *
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. NH-10 Dikchu-Singtam Sector KM 14"
                  required
                  className="w-full bg-[#E6EDEB] border border-[#D7DEDC] rounded-xl px-3 py-2 text-[#172126] text-xs focus:border-[#167F78] focus:outline-none"
                />
              </div>

              {/* GPS Geolocation Controls */}
              <div className="bg-[#E6EDEB]/70 border border-[#D7DEDC] p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#667579] uppercase tracking-wider">
                    GPS GEOLOCATION INTEGRITY
                  </span>
                  <button
                    type="button"
                    onClick={handleCaptureGPS}
                    disabled={isCapturingGps}
                    className="flex items-center space-x-1 text-[11px] font-bold text-[#167F78] hover:text-[#136E68] bg-[#FAF8F1] px-2.5 py-1 rounded-lg border border-[#D7DEDC] shadow-xs cursor-pointer"
                  >
                    <Crosshair className={`w-3.5 h-3.5 ${isCapturingGps ? 'animate-spin' : ''}`} />
                    <span>{isCapturingGps ? 'ACQUIRING...' : 'CAPTURE LIVE GPS'}</span>
                  </button>
                </div>

                <div className="text-[11px] font-mono text-[#172126] flex items-center justify-between">
                  {gpsInfo.locationStatus === 'AVAILABLE' && gpsInfo.lat !== null ? (
                    <span className="text-[#167F78] font-bold">
                      GPS: {gpsInfo.lat.toFixed(4)}°N, {gpsInfo.lng?.toFixed(4)}°E (±{gpsInfo.accuracy}m)
                    </span>
                  ) : (
                    <span className="text-[#C95050] font-semibold">
                      GPS: UNAVAILABLE (Coordinates null - No fake data inserted)
                    </span>
                  )}
                  <span className="text-[10px] text-[#667579]">
                    {gpsInfo.locationSource}
                  </span>
                </div>
              </div>

              {/* Evidence Media Upload (IndexedDB) */}
              <div className="bg-[#E6EDEB]/70 border border-[#D7DEDC] p-3 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#667579] uppercase tracking-wider">
                    MEDIA EVIDENCE (INDEXEDDB STORAGE)
                  </span>
                  <span className="text-[10px] text-[#667579]">
                    {attachedMedia.length} Attached
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 bg-[#FAF8F1] hover:bg-white border border-[#D7DEDC] rounded-xl text-xs font-semibold text-[#172126] cursor-pointer shadow-xs transition-colors"
                  >
                    <Camera className="w-4 h-4 text-[#167F78]" />
                    <span>Attach Photo / Video</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Stored Media List */}
                {attachedMedia.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {attachedMedia.map((m) => (
                      <div
                        key={m.mediaId}
                        className="flex items-center justify-between bg-[#FAF8F1] px-2.5 py-1.5 rounded-lg border border-[#D7DEDC] text-[11px]"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {m.mimeType.startsWith('video') ? (
                            <Video className="w-3.5 h-3.5 text-[#C58A24] shrink-0" />
                          ) : (
                            <Camera className="w-3.5 h-3.5 text-[#167F78] shrink-0" />
                          )}
                          <span className="truncate font-medium">{m.fileName}</span>
                          <span className="text-[9px] text-[#667579] font-mono">
                            ({(m.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(m.mediaId)}
                          className="text-[#667579] hover:text-[#C95050] p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Road Blockage & Severity */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#667579] font-bold text-[10px] mb-1 uppercase tracking-wider">
                    SEVERITY
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg px-2.5 py-2 text-[#172126] font-medium text-xs focus:outline-none"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="SEVERE">SEVERE</option>
                    <option value="MODERATE">MODERATE</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center space-x-2 bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC] w-full cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roadBlocked}
                      onChange={(e) => setRoadBlocked(e.target.checked)}
                      className="w-4 h-4 rounded text-[#C95050]"
                    />
                    <span className="text-[11px] font-semibold text-[#172126]">
                      Road Blocked
                    </span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[#667579] font-bold text-[11px] mb-1 uppercase tracking-wider">
                  OBSERVATION DETAILS & FIELD NOTES
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe slope movement, rock debris size, or water breach..."
                  className="w-full bg-[#E6EDEB] border border-[#D7DEDC] rounded-xl px-3 py-2 text-[#172126] text-xs focus:border-[#167F78] focus:outline-none"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#167F78] hover:bg-[#136E68] text-[#FAF8F1] rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'PROCESSING...'
                    : isNetworkOnline
                    ? 'SUBMIT FIELD REPORT'
                    : 'QUEUE LOCALLY (OFFLINE PWA)'}
                </span>
              </button>
            </form>
          </div>
        )}

        {/* 4. RECENT FIELD EVIDENCE STREAM */}
        <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2">
            <div className="flex items-center space-x-2">
              <FileCheck2 className="w-4 h-4 text-[#167F78]" />
              <h3 className="font-bold text-xs text-[#172126] tracking-wide uppercase">
                RECENT FIELD REPORTS & TRUTH STATUS
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#667579]">
              {evidenceCards.length} Total
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {evidenceCards.slice(0, 5).map((card) => {
              const rep = FieldReportService.normalizeReport(card);
              return (
                <div
                  key={card.id}
                  className="bg-[#E6EDEB]/70 border border-[#D7DEDC] p-2.5 rounded-xl text-xs flex flex-col space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#172126] text-[11px] truncate max-w-[200px]">
                      {rep.locationName || card.location}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                        rep.evidenceStatus === 'VERIFIED'
                          ? 'bg-[#167F78]/15 text-[#167F78] border border-[#167F78]/30'
                          : rep.evidenceStatus === 'REJECTED'
                          ? 'bg-[#C95050]/15 text-[#C95050] border border-[#C95050]/30'
                          : 'bg-[#C58A24]/15 text-[#C58A24] border border-[#C58A24]/30'
                      }`}
                    >
                      {rep.evidenceStatus || 'PENDING REVIEW'}
                    </span>
                  </div>

                  <div className="text-[10px] text-[#667579] flex items-center justify-between">
                    <span>{rep.incidentType}</span>
                    <span>{card.timestamp}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. PLATFORM INSTALLATION GUIDANCE MODAL */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans select-none">
          <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-2xl max-w-sm w-full p-5 relative shadow-2xl space-y-3">
            <button
              onClick={() => setShowInstallGuide(false)}
              className="absolute top-4 right-4 text-[#667579] hover:text-[#172126]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 border-b border-[#D7DEDC] pb-2">
              <Smartphone className="w-5 h-5 text-[#167F78]" />
              <h3 className="font-bold text-sm text-[#172126]">
                INSTALL EPOCH FIELD PWA
              </h3>
            </div>

            <div className="text-xs text-[#667579] space-y-2.5">
              <p>
                To install EPOCH Field on your mobile device for offline field operation:
              </p>
              <div className="bg-[#E6EDEB] p-3 rounded-xl space-y-1.5 font-medium text-[#172126]">
                <div><strong>iOS / Safari:</strong> Tap the <span className="font-bold text-[#167F78]">Share</span> icon at the bottom, then choose <span className="font-bold text-[#167F78]">Add to Home Screen</span>.</div>
                <div><strong>Android / Chrome:</strong> Tap the browser menu (<span className="font-bold">⋮</span>) and select <span className="font-bold text-[#167F78]">Install App</span> or <span className="font-bold text-[#167F78]">Add to Home screen</span>.</div>
              </div>
              <p className="text-[11px]">
                Once installed, EPOCH Field will launch full-screen and continue to record incidents, GPS, and media even when cellular connectivity drops.
              </p>
            </div>

            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full py-2 bg-[#167F78] text-white rounded-xl font-bold text-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
