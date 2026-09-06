import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Satellite,
  Camera,
  MapPin,
  Clock,
  Activity,
  BrainCircuit,
  Plus,
  ShieldCheck,
  Check,
  X,
  FileCheck,
  HelpCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';
import { CommandCenterMap } from '../map3d/CommandCenterMap';
import { RiskZone, EvidenceCard, TruthMetrics, FieldEvidenceStatus, OfflineQueueItem } from '../../types';
import { FieldReportService } from '../../services/fieldReportService';
import { DataService } from '../../services/dataService';
import { OfflineSyncService } from '../../services/offlineSyncService';

interface EpochTruthLoopViewProps {
  zones: RiskZone[];
  selectedZone: RiskZone;
  selectedState?: string;
  onSelectZone: (zone: RiskZone) => void;
  evidenceCards: EvidenceCard[];
  truthMetrics: TruthMetrics;
  onOpenReportModal: () => void;
}

export const EpochTruthLoopView: React.FC<EpochTruthLoopViewProps> = ({
  zones,
  selectedZone,
  selectedState = 'Sikkim',
  onSelectZone,
  evidenceCards,
  truthMetrics,
  onOpenReportModal
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [syncQueue, setSyncQueue] = useState<OfflineQueueItem[]>(() => OfflineSyncService.getQueue());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnlineState, setIsOnlineState] = useState<boolean>(() => OfflineSyncService.isOnline());
  const [activeConflictItem, setActiveConflictItem] = useState<OfflineQueueItem | null>(null);
  const [conflictResolving, setConflictResolving] = useState<boolean>(false);

  // Subscribe to offline queue changes and network status
  useEffect(() => {
    const unsub = OfflineSyncService.subscribe((q) => {
      setSyncQueue([...q]);
    });

    const handleOnline = () => {
      setIsOnlineState(true);
      OfflineSyncService.syncPendingQueue().catch(() => {});
    };
    const handleOffline = () => setIsOnlineState(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnlineState(OfflineSyncService.isOnline());

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const pendingCount = syncQueue.filter(i => i.syncStatus === 'PENDING' || i.syncStatus === 'SYNCING').length;
  const failedCount = syncQueue.filter(i => i.syncStatus === 'FAILED').length;
  const conflictCount = syncQueue.filter(i => i.syncStatus === 'CONFLICT').length;
  const syncedCount = syncQueue.filter(i => i.syncStatus === 'SYNCED').length;

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await OfflineSyncService.syncPendingQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResolveConflict = async (item: OfflineQueueItem, resolution: 'KEEP_SERVER' | 'KEEP_LOCAL') => {
    setConflictResolving(true);
    try {
      const expectedVersion = item.conflictDetails?.serverVersion || 1;
      await OfflineSyncService.resolveConflict(
        item.clientOperationId,
        item.entityId || '',
        resolution,
        expectedVersion,
        item.payload
      );
      setActiveConflictItem(null);
    } finally {
      setConflictResolving(false);
    }
  };

  // Normalize all cards into typed FieldReports
  const normalizedReports = evidenceCards.map(c => FieldReportService.normalizeReport(c));

  // Count Live vs Synthetic
  const liveCount = normalizedReports.filter(r => !r.synthetic).length;
  const syntheticCount = normalizedReports.filter(r => r.synthetic).length;

  const phase10Metrics = FieldReportService.computeTruthMetrics(normalizedReports, zones);

  const handleStatusTransition = async (reportId: string, newStatus: FieldEvidenceStatus) => {
    setUpdatingId(reportId);
    try {
      await DataService.updateIncidentStatus(reportId, newStatus);
    } catch {
      // Handled
    } finally {
      setTimeout(() => setUpdatingId(null), 400);
    }
  };

  const sortedReports = [...normalizedReports].sort((a, b) => {
    if (selectedState && selectedState !== 'ALL') {
      const aMatch = a.locationName.toLowerCase().includes(selectedState.toLowerCase());
      const bMatch = b.locationName.toLowerCase().includes(selectedState.toLowerCase());
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
    }
    return 0;
  });

  const filteredReports = sortedReports.filter((report) => {
    if (filterStatus === 'ALL') return true;
    return report.evidenceStatus === filterStatus;
  });

  const pipeline = [
    { id: 'predict', label: 'PREDICT', sub: 'Interpretable Risk Model', status: 'ACTIVE' },
    { id: 'warn', label: 'WARN', sub: 'CAP Multilingual Alert', status: 'ACTIVE' },
    { id: 'satellite_verify', label: 'SATELLITE SAR', sub: 'Copernicus CDSE Anomaly', status: 'ACTIVE' },
    { id: 'field_report', label: 'FIELD REPORT', sub: 'Geo-tagged Ground Data', status: 'ACTIVE' },
    { id: 'confirm', label: 'CONFIRM', sub: 'Ground Truth Triage', status: 'VALIDATED' },
    { id: 'learn', label: 'AUDIT LOOP', sub: 'Conservative Model Audit', status: 'CONTINUOUS' }
  ];

  return (
    <div className="h-full flex flex-col space-y-3 font-sans select-none overflow-y-auto pr-1">
      {/* Top Banner: Truth Loop */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-subtle card-hover-lift">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#167F78]" />
            <h1 className="font-semibold text-sm text-[#172126] tracking-wide">
              EPOCH TRUTH LOOP & FIELD VERIFICATION ENGINE
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#167F78]/10 text-[#167F78] border border-[#167F78]/25 font-semibold">
              CLOSED-LOOP AUDIT
            </span>
          </div>
          <p className="text-xs text-[#667579] mt-1">
            Operational decision-support triage comparing deterministic hazard predictions against real-world field evidence and Copernicus Sentinel-1 SAR observations.
          </p>
        </div>

        {/* Live vs Synthetic Badges & Action Button */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 font-mono text-[11px]">
            <span className="px-2 py-1 rounded bg-[#167F78]/10 text-[#167F78] border border-[#167F78]/20 font-semibold">
              LIVE FIELD REPORTS: {liveCount}
            </span>
            <span className="px-2 py-1 rounded bg-[#C58A24]/10 text-[#C58A24] border border-[#C58A24]/20 font-semibold">
              SYNTHETIC DEMO: {syntheticCount}
            </span>
          </div>

          <button
            onClick={onOpenReportModal}
            className="px-3 py-1.5 rounded-lg bg-[#167F78] hover:bg-[#136E68] text-[#FAF8F1] font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-subtle ml-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>SUBMIT FIELD EVIDENCE</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* PHASE 13: OFFLINE SYNCHRONIZATION & NETWORK STATUS STATION */}
      {/* ============================================================ */}
      <div className="bg-[#E6EDEB]/80 border border-[#D7DEDC] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-subtle">
        <div className="flex flex-wrap items-center gap-2">
          {/* Network Indicator */}
          <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md font-mono text-xs font-semibold border ${
            isOnlineState
              ? 'bg-[#167F78]/15 text-[#167F78] border-[#167F78]/30'
              : 'bg-[#C58A24]/15 text-[#C58A24] border-[#C58A24]/30'
          }`}>
            {isOnlineState ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-[#167F78]" />
                <span>NETWORK: ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-[#C58A24]" />
                <span>NETWORK: OFFLINE</span>
              </>
            )}
          </div>

          {/* Sync Queue Summary */}
          <span className="text-[11px] font-mono text-[#667579]">
            {pendingCount === 0 && failedCount === 0 && conflictCount === 0 ? (
              <strong className="text-[#167F78]">SYNC: {syncedCount}/{syncedCount} SYNCHRONIZED</strong>
            ) : (
              <span>SYNC QUEUE: <strong className="text-[#172126]">{pendingCount} PENDING</strong></span>
            )}
          </span>

          {failedCount > 0 && (
            <span className="px-2 py-0.5 rounded bg-[#C95050]/15 text-[#C95050] border border-[#C95050]/30 font-mono font-semibold text-[10px]">
              FAILED: {failedCount}
            </span>
          )}

          {conflictCount > 0 && (
            <span className="px-2 py-0.5 rounded bg-[#C58A24]/15 text-[#C58A24] border border-[#C58A24]/30 font-mono font-semibold text-[10px]">
              CONFLICTS: {conflictCount}
            </span>
          )}
        </div>

        {/* Sync Controls */}
        <div className="flex items-center space-x-2">
          {conflictCount > 0 && (
            <button
              onClick={() => setActiveConflictItem(syncQueue.find(i => i.syncStatus === 'CONFLICT') || null)}
              className="px-2.5 py-1 rounded bg-[#C58A24] text-[#FAF8F1] font-semibold text-xs transition-colors flex items-center space-x-1 cursor-pointer shadow-subtle"
            >
              <AlertCircle className="w-3 h-3" />
              <span>REVIEW CONFLICTS ({conflictCount})</span>
            </button>
          )}

          <button
            onClick={handleManualSync}
            disabled={isSyncing || (!isOnlineState && pendingCount === 0)}
            className="px-3 py-1 rounded-lg bg-[#FAF8F1] hover:bg-[#E6EDEB] border border-[#D7DEDC] text-[#172126] font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-subtle disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#167F78] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'SYNCHRONIZING...' : 'SYNC NOW'}</span>
          </button>
        </div>
      </div>

      {/* CONFLICT RESOLUTION MODAL / DRAWER */}
      {activeConflictItem && (
        <div className="bg-[#FAF8F1] border-2 border-[#C58A24] rounded-xl p-3.5 space-y-3 shadow-subtle animate-in fade-in select-text">
          <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-[#C58A24]" />
              <span className="font-semibold text-xs text-[#172126] tracking-wide">
                VERSION CONFLICT DETECTED · EXPLICIT RESOLUTION REQUIRED
              </span>
            </div>
            <button
              onClick={() => setActiveConflictItem(null)}
              className="text-[#667579] hover:text-[#172126] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[#667579]">
            This report was modified on the server while being queued offline. Choose which version to retain without automatic overwrite:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Local Version */}
            <div className="bg-[#E6EDEB] p-3 rounded-lg border border-[#D7DEDC] space-y-2">
              <div className="font-semibold text-[#172126] flex items-center justify-between">
                <span>LOCAL DEVICE VERSION</span>
                <span className="text-[10px] font-mono text-[#667579]">Queued Offline</span>
              </div>
              <div className="text-[11px] text-[#172126] bg-[#FAF8F1] p-2 rounded border border-[#D7DEDC]">
                {activeConflictItem.payload?.notes || activeConflictItem.payload?.description || 'Offline modified notes.'}
              </div>
              <button
                onClick={() => handleResolveConflict(activeConflictItem, 'KEEP_LOCAL')}
                disabled={conflictResolving}
                className="w-full py-1.5 rounded bg-[#167F78] hover:bg-[#136E68] text-[#FAF8F1] font-semibold text-xs transition-colors cursor-pointer"
              >
                KEEP LOCAL VERSION
              </button>
            </div>

            {/* Server Version */}
            <div className="bg-[#E6EDEB] p-3 rounded-lg border border-[#D7DEDC] space-y-2">
              <div className="font-semibold text-[#172126] flex items-center justify-between">
                <span>SERVER AUTHORITATIVE VERSION</span>
                <span className="text-[10px] font-mono text-[#167F78]">Rev #{activeConflictItem.conflictDetails?.serverVersion || 1}</span>
              </div>
              <div className="text-[11px] text-[#172126] bg-[#FAF8F1] p-2 rounded border border-[#D7DEDC]">
                {activeConflictItem.conflictDetails?.serverRecord?.description || activeConflictItem.conflictDetails?.serverRecord?.image_caption || 'Current server observation record.'}
              </div>
              <button
                onClick={() => handleResolveConflict(activeConflictItem, 'KEEP_SERVER')}
                disabled={conflictResolving}
                className="w-full py-1.5 rounded bg-[#397FA8] hover:bg-[#2F6B8E] text-[#FAF8F1] font-semibold text-xs transition-colors cursor-pointer"
              >
                KEEP SERVER VERSION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HORIZONTAL OPERATIONAL PIPELINE */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3 shadow-subtle card-hover-lift">
        <div className="text-[10px] uppercase text-[#667579] font-semibold mb-2 flex items-center justify-between">
          <span>OPERATIONAL TRUTH PIPELINE:</span>
          <span className="text-[#167F78] font-mono text-[10px] font-semibold">FEEDBACK LOOP</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {pipeline.map((stage) => (
            <div
              key={stage.id}
              className="bg-[#E6EDEB] border border-[#D7DEDC] p-2.5 rounded-lg flex flex-col justify-between hover:border-[#CBD5D2] transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[#172126] tracking-wide">{stage.label}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#167F78]" />
              </div>
              <div className="text-[10px] text-[#667579]">{stage.sub}</div>
              <div className="mt-2 text-[10px] font-mono font-medium text-[#167F78] flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1 text-[#167F78] shrink-0" />
                {stage.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PREDICTION VS REALITY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-[#FAF8F1] border border-[#D7DEDC] p-3 rounded-xl shadow-subtle card-hover-lift">
          <div className="text-[10px] text-[#667579] font-semibold uppercase">PREDICTED HIGH-RISK</div>
          <div className="text-2xl font-bold text-[#172126] mt-1 font-mono">
            {phase10Metrics.predictedHighRiskEvents}
          </div>
          <div className="text-[10px] text-[#667579] mt-0.5">Active hazard envelopes</div>
        </div>

        <div className="bg-[#FAF8F1] border border-[#167F78]/30 p-3 rounded-xl shadow-subtle card-hover-lift">
          <div className="text-[10px] text-[#167F78] uppercase font-semibold">FIELD EVIDENCE VERIFIED</div>
          <div className="text-2xl font-bold text-[#167F78] mt-1 font-mono">
            {phase10Metrics.verifiedReportsCount}
          </div>
          <div className="text-[10px] text-[#167F78] mt-0.5">Ground-truth confirmed</div>
        </div>

        <div className="bg-[#FAF8F1] border border-[#C58A24]/30 p-3 rounded-xl shadow-subtle card-hover-lift">
          <div className="text-[10px] text-[#C58A24] uppercase font-semibold">PENDING REVIEW</div>
          <div className="text-2xl font-bold text-[#C58A24] mt-1 font-mono">
            {phase10Metrics.pendingReportsCount + phase10Metrics.reviewedReportsCount}
          </div>
          <div className="text-[10px] text-[#667579] mt-0.5">Under technical triage</div>
        </div>

        <div className="bg-[#FAF8F1] border border-[#C95050]/30 p-3 rounded-xl shadow-subtle card-hover-lift">
          <div className="text-[10px] text-[#C95050] uppercase font-semibold">REJECTED / FALSE POS</div>
          <div className="text-2xl font-bold text-[#C95050] mt-1 font-mono">
            {phase10Metrics.rejectedReportsCount}
          </div>
          <div className="text-[10px] text-[#667579] mt-0.5">Mitigated / Disproved</div>
        </div>

        <div className="bg-[#FAF8F1] border border-[#397FA8]/30 p-3 rounded-xl shadow-subtle card-hover-lift flex flex-col justify-between">
          <div className="text-[10px] text-[#397FA8] uppercase font-semibold">EVALUATION METRICS</div>
          <div className="text-xs font-bold text-[#172126] mt-1 font-mono">
            {phase10Metrics.evaluationDataStatus}
          </div>
          <div className="text-[9px] text-[#667579] mt-0.5">No manufactured accuracy</div>
        </div>
      </div>

      {/* Dual Pane View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-[500px]">
        {/* LEFT: 3D Mountain Map with predicted zones */}
        <div className="lg:col-span-6 flex flex-col rounded-xl overflow-hidden border border-[#D7DEDC] bg-[#11191D] h-[480px] lg:h-auto shadow-subtle">
          <div className="bg-[#FAF8F1] px-3 py-2 border-b border-[#D7DEDC] flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Satellite className="w-3.5 h-3.5 text-[#397FA8]" />
              <span className="font-semibold text-[#172126]">PREDICTED LANDSLIDE ZONES & SECTORS</span>
            </div>
            <span className="text-[10px] text-[#667579]">Click slope to focus</span>
          </div>

          <div className="flex-1 relative">
            <CommandCenterMap
              zones={zones}
              selectedZone={selectedZone}
              onSelectZone={onSelectZone}
              timeOffset={0}
              className="h-full"
            />
          </div>
        </div>

        {/* RIGHT: Geo-tagged Evidence Cards */}
        <div className="lg:col-span-6 flex flex-col space-y-2.5 bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3 shadow-subtle card-hover-lift">
          <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-[#167F78]" />
              <span className="font-semibold text-xs text-[#172126] uppercase">GEO-TAGGED EVIDENCE STREAM</span>
            </div>

            <div className="flex items-center space-x-1 text-xs">
              {['ALL', 'VERIFIED', 'PENDING', 'REVIEWED', 'REJECTED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                    filterStatus === status
                      ? 'bg-[#E6EDEB] text-[#167F78] font-semibold shadow-subtle'
                      : 'text-[#667579] hover:text-[#172126]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Feed */}
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[520px] pr-1">
            {filteredReports.map((report) => {
              const isVerified = report.evidenceStatus === 'VERIFIED';
              const isRejected = report.evidenceStatus === 'REJECTED';
              const isReviewed = report.evidenceStatus === 'REVIEWED';
              const isPending = report.evidenceStatus === 'PENDING';

              const correlation = FieldReportService.getTruthLoopCorrelation(report, zones);

              return (
                <div
                  key={report.reportId}
                  className="bg-[#E6EDEB] border border-[#D7DEDC] hover:border-[#CBD5D2] rounded-lg p-3 transition-colors space-y-2.5 select-text"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center space-x-1.5 font-semibold text-[#172126]">
                        <MapPin className="w-3.5 h-3.5 text-[#167F78] shrink-0" />
                        <span className="truncate">{report.locationName}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold border ${
                            report.synthetic
                              ? 'bg-[#C58A24]/10 text-[#C58A24] border-[#C58A24]/25'
                              : 'bg-[#167F78]/10 text-[#167F78] border-[#167F78]/25'
                          }`}
                        >
                          {report.synthetic ? 'SOURCE: SYNTHETIC' : `SOURCE: ${report.source}`}
                        </span>
                        <span className="text-[10px] text-[#667579] font-mono">
                          AOI: {report.aoiStatus}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {/* Separate Sync Status Badge */}
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FAF8F1] text-[#167F78] border border-[#D7DEDC] font-semibold">
                        SYNCED
                      </span>

                      {/* Separate Truth Loop Evidence Status Badge */}
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border shrink-0 ${
                          isVerified
                            ? 'bg-[#167F78]/15 text-[#167F78] border-[#167F78]/30'
                            : isRejected
                            ? 'bg-[#C95050]/15 text-[#C95050] border-[#C95050]/30'
                            : isReviewed
                            ? 'bg-[#397FA8]/15 text-[#397FA8] border-[#397FA8]/30'
                            : 'bg-[#C58A24]/15 text-[#C58A24] border-[#C58A24]/30'
                        }`}
                      >
                        {isVerified ? 'FIELD EVIDENCE VERIFIED' : isRejected ? 'EVIDENCE REJECTED' : isReviewed ? 'REVIEWED' : 'PENDING REVIEW'}
                      </span>
                    </div>
                  </div>

                  {/* 3-TIER OPERATIONAL DISTINCTION */}
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] bg-[#FAF8F1] p-2 rounded-md border border-[#D7DEDC]">
                    <div className="border-r border-[#D7DEDC] pr-1">
                      <span className="text-[#667579] font-semibold block uppercase">1. PREDICTION</span>
                      <span className="font-mono font-bold text-[#172126]">
                        {correlation.epochRiskAtReportTime ? `${correlation.epochRiskAtReportTime.riskScore}% (${correlation.epochRiskAtReportTime.riskLevel})` : 'UNAVAILABLE'}
                      </span>
                    </div>

                    <div className="border-r border-[#D7DEDC] pr-1">
                      <span className="text-[#667579] font-semibold block uppercase">2. OBSERVATION</span>
                      <span className="font-medium text-[#172126] truncate block">
                        {report.incidentType} ({report.evidenceType})
                      </span>
                    </div>

                    <div>
                      <span className="text-[#667579] font-semibold block uppercase">3. STATUS</span>
                      <span className="font-bold text-[#167F78] truncate block">
                        {report.evidenceStatus}
                      </span>
                    </div>
                  </div>

                  {/* Evidence Observation Content */}
                  <div className="bg-[#FAF8F1] rounded-md p-2 border border-[#D7DEDC] text-xs space-y-1">
                    <p className="text-[#172126] text-[11px] leading-relaxed font-normal">{report.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-[#667579] pt-1 border-t border-[#D7DEDC]/60 font-mono">
                      <span>GPS: {report.location.lat ? `${report.location.lat.toFixed(4)}°N, ${report.location.lng?.toFixed(4)}°E` : 'UNAVAILABLE (OFFLINE GPS PRESERVED)'}</span>
                      <span>TIME: {report.timestamp}</span>
                    </div>
                  </div>

                  {/* CORRELATED SNAPSHOT (Multi-Modal Context) */}
                  <div className="bg-[#FAF8F1] rounded-md p-2 border border-[#397FA8]/25 text-[10px] space-y-1">
                    <div className="flex items-center justify-between text-[#397FA8] font-semibold">
                      <span>CORRELATED CONTEXTUAL SNAPSHOT</span>
                      <span className="text-[9px] text-[#667579] font-normal font-mono">Non-causal correlation</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[#667579]">
                      <div>
                        <strong className="text-[#172126]">IMD Weather:</strong> {correlation.imdWeatherAtReportTime?.weatherCondition} ({correlation.imdWeatherAtReportTime?.rainfall1hMm} mm/h)
                      </div>
                      <div>
                        <strong className="text-[#172126]">SAR Correlation:</strong> {correlation.sarObservationAtReportTime?.sarCorrelationStatus === 'AVAILABLE' ? 'Available (Observation Anomaly)' : 'Not Available'}
                      </div>
                    </div>
                  </div>

                  {/* Footer & Status Actions */}
                  <div className="flex items-center justify-between text-[11px] text-[#667579] border-t border-[#D7DEDC] pt-1.5">
                    <span className="text-[#167F78] font-medium truncate max-w-[200px]">
                      Action: {report.actionTaken || 'Awaiting triage'}
                    </span>

                    {/* Verification Actions */}
                    <div className="flex items-center space-x-1">
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleStatusTransition(report.reportId, 'REVIEWED')}
                            className="px-2 py-0.5 rounded bg-[#397FA8]/10 text-[#397FA8] hover:bg-[#397FA8]/20 text-[10px] font-semibold border border-[#397FA8]/20 cursor-pointer"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => handleStatusTransition(report.reportId, 'VERIFIED')}
                            className="px-2 py-0.5 rounded bg-[#167F78] text-[#FAF8F1] hover:bg-[#136E68] text-[10px] font-semibold cursor-pointer"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleStatusTransition(report.reportId, 'REJECTED')}
                            className="px-2 py-0.5 rounded bg-[#C95050]/10 text-[#C95050] hover:bg-[#C95050]/20 text-[10px] font-semibold border border-[#C95050]/20 cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {isReviewed && (
                        <>
                          <button
                            onClick={() => handleStatusTransition(report.reportId, 'VERIFIED')}
                            className="px-2 py-0.5 rounded bg-[#167F78] text-[#FAF8F1] hover:bg-[#136E68] text-[10px] font-semibold cursor-pointer"
                          >
                            Verify Evidence
                          </button>
                          <button
                            onClick={() => handleStatusTransition(report.reportId, 'REJECTED')}
                            className="px-2 py-0.5 rounded bg-[#C95050]/10 text-[#C95050] hover:bg-[#C95050]/20 text-[10px] font-semibold border border-[#C95050]/20 cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {(isVerified || isRejected) && (
                        <button
                          onClick={() => handleStatusTransition(report.reportId, 'PENDING')}
                          className="px-2 py-0.5 rounded text-[#667579] hover:text-[#172126] text-[10px] font-mono cursor-pointer"
                        >
                          Re-open
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
