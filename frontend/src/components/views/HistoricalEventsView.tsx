import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  CloudRain,
  Route,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Eye,
  PlusCircle,
  RefreshCw,
  FileText,
  BookmarkPlus,
  Layers,
  Compass,
  Cpu,
  Database,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Sliders,
  Sparkles,
  Search,
  Filter,
  Check,
  Clock,
  MapPin,
  TrendingUp,
  Activity,
  Maximize2
} from 'lucide-react';
import { HistoricalEventRecord, AssessmentResult, RiskAssessmentResult } from '../../types';
import { DataService } from '../../services/dataService';
import { ExecutiveReportModal } from '../reports/ExecutiveReportModal';

interface HistoricalEventsViewProps {
  events?: any[];
  selectedState?: string;
  onSelectView?: (view: any) => void;
}

export const HistoricalEventsView: React.FC<HistoricalEventsViewProps> = ({
  selectedState = 'Sikkim',
  onSelectView
}) => {
  const [historyRecords, setHistoryRecords] = useState<HistoricalEventRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEventRecord | null>(null);
  const [dossierTab, setDossierTab] = useState<'all' | 'metadata' | 'imagery' | 'change' | 'damage' | 'verification' | 'risk'>('all');
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [disasterTypeFilter, setDisasterTypeFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const records = await DataService.getHistoricalEventRecords(selectedState);
      setHistoryRecords(records);
      if (records.length > 0) {
        setSelectedEvent(records[0]);
      }
    } catch (err) {
      console.error('Error loading history records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [selectedState]);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const handleReopen = async (evt: HistoricalEventRecord) => {
    try {
      await DataService.reopenHistoricalEventRecord(evt.eventId);
      showNotification(`Event "${evt.eventName}" successfully restored into active operational memory.`);
      if (onSelectView) {
        onSelectView('damage_assessment');
      }
    } catch (err) {
      console.error('Error reopening event:', err);
    }
  };

  const handleDelete = async (evt: HistoricalEventRecord) => {
    if (!window.confirm(`Are you sure you want to delete historical record "${evt.eventName}" (${evt.eventId})?`)) return;
    try {
      await DataService.deleteHistoricalEventRecord(evt.eventId);
      setHistoryRecords(prev => prev.filter(e => e.eventId !== evt.eventId));
      if (selectedEvent?.eventId === evt.eventId) {
        const remaining = historyRecords.filter(e => e.eventId !== evt.eventId);
        setSelectedEvent(remaining.length > 0 ? remaining[0] : null);
      }
      showNotification(`Record "${evt.eventId}" deleted from persistent history.`);
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const handleSaveCurrentAssessment = async () => {
    try {
      const [damageResult, riskResult] = await Promise.all([
        DataService.getSceneResult('sikkim-singtam-dikchu'),
        DataService.getSikkimDemoRisk()
      ]);

      const newRecord: HistoricalEventRecord = {
        eventId: `EVT-${new Date().toISOString().split('T')[0]}-SNAP${Math.floor(Math.random() * 900 + 100)}`,
        eventName: `Sikkim Active Sector Assessment Snapshot (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        location: 'Singtam–Dikchu Riverfront Corridor (NH-10)',
        state: 'Sikkim',
        district: 'Pakyong / East Sikkim',
        disasterType: 'FLASH_FLOOD_DEBRIS_FLOW',
        eventDate: new Date().toISOString().split('T')[0],
        imagery: {
          beforeImageRef: '/assets/satellite/scene_03_pre.jpg?v=4',
          afterImageRef: '/assets/satellite/scene_03_post.jpg?v=4',
          sensor: 'Sentinel-2 MSI (10m L2A)',
          acquisitionDates: '28 Aug 2026 (Pre) / 03 Sept 2026 (Post)',
          resolution: '10m GSD (Copernicus Sentinel-2)'
        },
        assessment: {
          totalStructures: damageResult.statistics.totalStructures,
          destroyedCount: damageResult.statistics.destroyedCount,
          majorDamageCount: damageResult.statistics.majorDamageCount,
          minorDamageCount: damageResult.statistics.minorDamageCount,
          noDamageCount: damageResult.statistics.noDamageCount,
          destroyedPercentage: damageResult.statistics.destroyedPercentage,
          majorDamagePercentage: damageResult.statistics.majorDamagePercentage,
          minorDamagePercentage: damageResult.statistics.minorDamagePercentage,
          noDamagePercentage: damageResult.statistics.noDamagePercentage,
          averageConfidence: damageResult.statistics.averageConfidence,
          changeScore: damageResult.changeDetection.changeScore,
          changedAreaM2: damageResult.changeDetection.changedAreaM2,
          changePercentage: damageResult.changeDetection.changePercentage,
          damagedFootprintAreaM2: damageResult.statistics.damagedFootprintAreaM2
        },
        verification: {
          verifiedCount: damageResult.statistics.verifiedCount,
          unverifiedCount: damageResult.statistics.unverifiedCount,
          needsReviewCount: damageResult.statistics.needsReviewCount,
          rejectedCount: 0,
          verificationProgressPct: (damageResult.statistics.verifiedCount / Math.max(1, damageResult.statistics.totalStructures)) * 100,
          lastVerifiedAt: new Date().toISOString()
        },
        riskAssessment: {
          overallRiskScore: riskResult.overallRiskScore,
          riskLevel: riskResult.riskLevel,
          primaryFactor: riskResult.primaryFactor,
          secondaryFactor: riskResult.secondaryFactor,
          factorContributions: riskResult.factorContributions
        },
        metadata: {
          engine: 'SatGuard Unified Disaster Assessment Engine',
          version: '2.0.0-PROTOTYPE',
          mode: 'DEMO',
          recordedAt: new Date().toISOString(),
          recordedBy: 'Human Operator Snapshot',
          notes: 'User snapshot from live control room session.'
        },
        tags: ['LIVE_SNAPSHOT', 'SIKKIM', 'SATGUARD_ARCHIVE']
      };

      const saved = await DataService.saveHistoricalEventRecord(newRecord);
      setHistoryRecords(prev => [saved, ...prev.filter(e => e.eventId !== saved.eventId)]);
      setSelectedEvent(saved);
      showNotification(`Active disaster assessment successfully saved to persistent archive as ${saved.eventId}.`);
    } catch (err) {
      console.error('Error snapshotting assessment:', err);
    }
  };

  const getStatusBadge = (evt: HistoricalEventRecord) => {
    const verified = evt.verification?.verifiedCount || 0;
    const total = evt.assessment?.totalStructures || 0;
    const rejected = evt.verification?.rejectedCount || 0;
    const needsReview = evt.verification?.needsReviewCount || 0;

    if (rejected > 0) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 font-mono">
          REJECTED ({rejected})
        </span>
      );
    }
    if (needsReview > 0) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
          REVIEW ({needsReview})
        </span>
      );
    }
    if (total > 0 && verified === total) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
          VERIFIED ({verified}/{total})
        </span>
      );
    }
    if (verified > 0) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 font-mono">
          PARTIAL ({verified}/{total})
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30 font-mono">
        UNVERIFIED (0/{total})
      </span>
    );
  };

  const filteredRecords = historyRecords.filter(evt => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      evt.eventName.toLowerCase().includes(q) ||
      evt.eventId.toLowerCase().includes(q) ||
      evt.location.toLowerCase().includes(q) ||
      evt.state?.toLowerCase().includes(q) ||
      evt.district?.toLowerCase().includes(q);

    const matchesDisasterType =
      disasterTypeFilter === 'ALL' || evt.disasterType === disasterTypeFilter;

    const matchesDate =
      dateFilter === 'ALL' || evt.eventDate.startsWith(dateFilter);

    const verified = evt.verification?.verifiedCount || 0;
    const total = evt.assessment?.totalStructures || 0;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'VERIFIED' && total > 0 && verified === total) ||
      (statusFilter === 'PARTIAL' && verified > 0 && verified < total) ||
      (statusFilter === 'UNVERIFIED' && verified === 0);

    return matchesSearch && matchesDisasterType && matchesDate && matchesStatus;
  });

  return (
    <div className="h-full flex flex-col space-y-3 font-sans select-none overflow-y-auto pr-1 pb-4 bg-[#071018] text-slate-100">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="bg-[#0C1E2C] border border-sky-500/40 text-sky-200 px-4 py-2.5 rounded-lg text-xs font-mono shadow-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notificationMsg}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-slate-400 hover:text-white cursor-pointer ml-4">✕</button>
        </div>
      )}

      {/* 1. TOP HEADER BANNER (MISSION-CONTROL ARCHIVE WORKSTATION) */}
      <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3.5 shadow-lg flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
            <h1 className="font-mono font-bold text-sm text-slate-100 tracking-wider uppercase flex items-center gap-2">
              DISASTER EVENT ARCHIVE & TECHNICAL DOSSIER CATALOG
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 font-semibold uppercase">
              <span className="font-brand text-xs">SatGuard</span> PERSISTENT REPOSITORY
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            STRUCTURED PERSISTENT REPOSITORY OF BITEMPORAL SATELLITE ASSESSMENTS, CHANGE DETECTIONS, AND GEOTECHNICAL RISK AUDITS
          </p>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-mono">
          <button
            onClick={handleSaveCurrentAssessment}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-all shadow-[0_0_12px_rgba(56,189,248,0.25)] cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>+ Snapshot Active Session</span>
          </button>
          <button
            onClick={() => setIsReportOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#162E44] hover:bg-[#1E3E5C] text-slate-200 hover:text-white border border-slate-700 font-semibold transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Executive Dossier</span>
          </button>
        </div>
      </div>

      {/* 2. STRUCTURED DISASTER EVENT ARCHIVE REGISTER (DARK THEME) */}
      <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3.5 space-y-3 shadow-lg shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#162E44] pb-2.5">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-sky-400" />
            <h3 className="font-mono font-bold text-xs uppercase text-slate-200 tracking-wider">
              HISTORICAL DISASTER EVENT ARCHIVE REGISTER ({filteredRecords.length} / {historyRecords.length} EVENTS)
            </h3>
          </div>

          {/* Search & Multi-Filters Toolbar */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="Search event, ID, sector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#071018] border border-[#162E44] rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-52 transition-colors"
              />
            </div>

            <select
              value={disasterTypeFilter}
              onChange={(e) => setDisasterTypeFilter(e.target.value)}
              className="bg-[#071018] border border-[#162E44] rounded-lg px-2.5 py-1 text-xs text-slate-200 cursor-pointer focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Disaster Types</option>
              <option value="FLASH_FLOOD_DEBRIS_FLOW">Flash Flood & Debris Flow</option>
              <option value="GLOF_FLASH_SURGE">GLOF & Dam Surge</option>
              <option value="LANDSLIDE">Landslide & Mass Wasting</option>
              <option value="SLOPE_COLLAPSE">Slope Collapse & Subsidence</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#071018] border border-[#162E44] rounded-lg px-2.5 py-1 text-xs text-slate-200 cursor-pointer focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Verification Statuses</option>
              <option value="VERIFIED">Fully Verified (100%)</option>
              <option value="PARTIAL">Partially Verified</option>
              <option value="UNVERIFIED">Unverified (0%)</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-[#071018] border border-[#162E44] rounded-lg px-2.5 py-1 text-xs text-slate-200 cursor-pointer focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
        </div>

        {/* Dense Archive Table */}
        <div className="overflow-x-auto max-h-64 border border-[#162E44] rounded-lg">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="bg-[#071018] border-b border-[#162E44] text-[10px] uppercase font-mono font-bold text-slate-400 sticky top-0 z-10">
                <th className="p-2.5">Event ID</th>
                <th className="p-2.5">Disaster Title</th>
                <th className="p-2.5">AOI / Corridor</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Sensor / GSD</th>
                <th className="p-2.5 text-center">Structures</th>
                <th className="p-2.5">Damage Register</th>
                <th className="p-2.5 text-center">Risk Index</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#162E44] text-[11px] font-mono">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((evt) => {
                  const isSelected = selectedEvent?.eventId === evt.eventId;
                  const riskScore = evt.riskAssessment?.overallRiskScore || 0;
                  const riskLevel = evt.riskAssessment?.riskLevel || 'MODERATE';
                  const stats = evt.assessment;

                  const riskBadge =
                    riskLevel === 'CRITICAL' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                    riskLevel === 'HIGH' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                    'bg-sky-500/15 text-sky-400 border-sky-500/30';

                  return (
                    <tr
                      key={evt.eventId}
                      onClick={() => setSelectedEvent(evt)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-sky-500/10 text-slate-100 font-semibold ring-1 ring-sky-500'
                          : 'hover:bg-[#162E44]/40 text-slate-300'
                      }`}
                    >
                      <td className="p-2.5 font-bold text-sky-400">{evt.eventId}</td>
                      <td className="p-2.5 font-sans font-semibold text-slate-100 truncate max-w-[220px]" title={evt.eventName}>
                        {evt.eventName}
                      </td>
                      <td className="p-2.5 text-slate-400 truncate max-w-[150px]">{evt.location}</td>
                      <td className="p-2.5 text-slate-400">{evt.eventDate}</td>
                      <td className="p-2.5 text-slate-400 truncate max-w-[120px]">{evt.imagery?.sensor || 'Sentinel-2'}</td>
                      <td className="p-2.5 text-center font-bold text-slate-200">{stats?.totalStructures || 0}</td>
                      <td className="p-2.5">
                        <span className="text-[10px] text-rose-400 font-bold">
                          {stats?.destroyedCount || 0} Des
                        </span> • <span className="text-[10px] text-amber-400 font-bold">
                          {stats?.majorDamageCount || 0} Maj
                        </span> • <span className="text-[10px] text-emerald-400">
                          {stats?.noDamageCount || 0} Intact
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${riskBadge}`}>
                          {riskScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-2.5">
                        {getStatusBadge(evt)}
                      </td>
                      <td className="p-2.5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleReopen(evt)}
                          title="Restore into active working memory"
                          className="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          REOPEN
                        </button>
                        <button
                          onClick={() => handleDelete(evt)}
                          title="Delete from archive"
                          className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          DEL
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-400 font-mono text-xs">
                    No historical events matched the current search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TECHNICAL EVENT DOSSIER (COMPLETE 6-STAGE TECHNICAL TRACEABILITY)       */}
      {/* ========================================================================= */}
      {selectedEvent && (
        <div className="bg-[#0C1E2C]/90 border border-[#162E44] rounded-xl p-3.5 space-y-3 shadow-lg">
          {/* A. Dossier Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#162E44] pb-2.5">
            <div>
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <h3 className="font-mono font-bold text-xs uppercase text-slate-100 tracking-wider">
                  TECHNICAL EVENT DOSSIER: {selectedEvent.eventName}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
                ID: <strong className="text-sky-400">{selectedEvent.eventId}</strong> • LOCATION: {selectedEvent.location} ({selectedEvent.state}) • ACQUISITION: {selectedEvent.eventDate}
              </span>
            </div>

            {/* Dossier Tabs */}
            <div className="flex items-center bg-[#071018] p-0.5 rounded-lg border border-[#162E44] text-[10px] font-mono">
              {(['all', 'metadata', 'imagery', 'change', 'damage', 'verification', 'risk'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDossierTab(tab)}
                  className={`px-2.5 py-1 rounded cursor-pointer uppercase transition-colors ${
                    dossierTab === tab
                      ? 'bg-sky-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* B. Stage Grid / Tabbed Views */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. METADATA & INGESTION STAGE */}
            {(dossierTab === 'all' || dossierTab === 'metadata') && (
              <div className="bg-[#071018] border border-[#162E44] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-[#162E44] pb-1.5 text-xs">
                  <div className="flex items-center space-x-1.5 font-bold font-mono text-sky-400">
                    <Compass className="w-3.5 h-3.5" />
                    <span>1. METADATA & INGESTION</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    AUTHORITATIVE
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Disaster Category:</span>
                    <span className="font-semibold text-slate-200">{selectedEvent.disasterType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">State / District:</span>
                    <span className="text-slate-200">{selectedEvent.state} / {selectedEvent.district || 'Corridor'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Event Date:</span>
                    <span className="text-slate-200">{selectedEvent.eventDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Engine Version:</span>
                    <span className="text-slate-200">{selectedEvent.metadata?.engine || 'SatGuard v2.0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recorded By:</span>
                    <span className="text-slate-200">{selectedEvent.metadata?.recordedBy || 'NDRF / SDMA Ingestion'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. BITEMPORAL IMAGERY STAGE */}
            {(dossierTab === 'all' || dossierTab === 'imagery') && (
              <div className="bg-[#071018] border border-[#162E44] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-[#162E44] pb-1.5 text-xs">
                  <div className="flex items-center space-x-1.5 font-bold font-mono text-sky-400">
                    <Layers className="w-3.5 h-3.5" />
                    <span>2. BITEMPORAL IMAGERY</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    {selectedEvent.imagery?.sensor || 'Sentinel-2 MSI'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
                  <div className="border border-[#162E44] rounded p-1 bg-[#0C1E2C]">
                    <span className="text-slate-400 font-bold block mb-1">PRE-DISASTER</span>
                    <img
                      src={selectedEvent.imagery?.beforeImageRef || '/assets/satellite/scene_03_pre.jpg'}
                      alt="Pre Disaster"
                      className="w-full h-16 object-cover rounded"
                    />
                  </div>
                  <div className="border border-[#162E44] rounded p-1 bg-[#0C1E2C]">
                    <span className="text-slate-400 font-bold block mb-1">POST-DISASTER</span>
                    <img
                      src={selectedEvent.imagery?.afterImageRef || '/assets/satellite/scene_03_post.jpg'}
                      alt="Post Disaster"
                      className="w-full h-16 object-cover rounded"
                    />
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 flex justify-between pt-1">
                  <span>GSD: {selectedEvent.imagery?.resolution || '10m native'}</span>
                  <span>Acq: {selectedEvent.imagery?.acquisitionDates || 'Bitemporal'}</span>
                </div>
              </div>
            )}

            {/* 3. CHANGE DETECTION STAGE */}
            {(dossierTab === 'all' || dossierTab === 'change') && (
              <div className="bg-[#071018] border border-[#162E44] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-[#162E44] pb-1.5 text-xs">
                  <div className="flex items-center space-x-1.5 font-bold font-mono text-sky-400">
                    <Activity className="w-3.5 h-3.5" />
                    <span>3. CHANGE DETECTION</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    SCORE: {selectedEvent.assessment?.changeScore ? (selectedEvent.assessment.changeScore * 100).toFixed(1) : '42.8'}%
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Corridor Change Score:</span>
                    <span className="font-bold text-sky-400">{selectedEvent.assessment?.changeScore?.toFixed(3) || '0.428'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Changed Footprint Area:</span>
                    <span className="text-slate-200">{selectedEvent.assessment?.changedAreaM2?.toLocaleString() || '89,400'} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Changed Area %:</span>
                    <span className="text-slate-200">{selectedEvent.assessment?.changePercentage?.toFixed(1) || '26.4'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Damaged Footprint Area:</span>
                    <span className="text-rose-400 font-bold">{selectedEvent.assessment?.damagedFootprintAreaM2?.toLocaleString() || '2,190'} m²</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. DAMAGE ASSESSMENT STAGE */}
            {(dossierTab === 'all' || dossierTab === 'damage') && (
              <div className="bg-[#071018] border border-[#162E44] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-[#162E44] pb-1.5 text-xs">
                  <div className="flex items-center space-x-1.5 font-bold font-mono text-rose-400">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>4. DAMAGE REGISTER (4-TIER)</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">
                    TOTAL: {selectedEvent.assessment?.totalStructures || 0}
                  </span>
                </div>
                <div className="space-y-1.5 text-[10px] font-mono">
                  <div className="flex items-center justify-between text-rose-400 font-bold">
                    <span>Destroyed:</span>
                    <span>{selectedEvent.assessment?.destroyedCount || 0} ({selectedEvent.assessment?.destroyedPercentage?.toFixed(1) || '0.0'}%)</span>
                  </div>
                  <div className="h-1.5 bg-[#162E44] rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: `${selectedEvent.assessment?.destroyedPercentage || 0}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-amber-400 font-bold">
                    <span>Major Damage:</span>
                    <span>{selectedEvent.assessment?.majorDamageCount || 0} ({selectedEvent.assessment?.majorDamagePercentage?.toFixed(1) || '30.0'}%)</span>
                  </div>
                  <div className="h-1.5 bg-[#162E44] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${selectedEvent.assessment?.majorDamagePercentage || 30}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-sky-400 font-bold">
                    <span>Minor Damage:</span>
                    <span>{selectedEvent.assessment?.minorDamageCount || 0} ({selectedEvent.assessment?.minorDamagePercentage?.toFixed(1) || '10.0'}%)</span>
                  </div>
                  <div className="h-1.5 bg-[#162E44] rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500" style={{ width: `${selectedEvent.assessment?.minorDamagePercentage || 10}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span>No Damage (Intact):</span>
                    <span>{selectedEvent.assessment?.noDamageCount || 0} ({selectedEvent.assessment?.noDamagePercentage?.toFixed(1) || '60.0'}%)</span>
                  </div>
                  <div className="h-1.5 bg-[#162E44] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${selectedEvent.assessment?.noDamagePercentage || 60}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* 5. FIELD VERIFICATION AUDIT STAGE */}
            {(dossierTab === 'all' || dossierTab === 'verification') && (
              <div className="bg-[#071018] border border-[#162E44] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-[#162E44] pb-1.5 text-xs">
                  <div className="flex items-center space-x-1.5 font-bold font-mono text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>5. VERIFICATION AUDIT</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {selectedEvent.verification?.verificationProgressPct?.toFixed(1) || '40.0'}% DONE
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Verified by Field Ground-Truth:</span>
                    <span className="text-emerald-400 font-bold">{selectedEvent.verification?.verifiedCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Unverified (Satellite-Derived Only):</span>
                    <span className="text-slate-200">{selectedEvent.verification?.unverifiedCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Flagged For Review:</span>
                    <span className="text-amber-400">{selectedEvent.verification?.needsReviewCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Audit Timestamp:</span>
                    <span className="text-slate-400">{selectedEvent.verification?.lastVerifiedAt || '2026-09-04 10:15 UTC'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 6. RISK ASSESSMENT STAGE */}
            {(dossierTab === 'all' || dossierTab === 'risk') && (
              <div className="bg-[#071018] border border-[#162E44] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-[#162E44] pb-1.5 text-xs">
                  <div className="flex items-center space-x-1.5 font-bold font-mono text-amber-400">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>6. GEOTECHNICAL RISK MATRIX</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
                    {selectedEvent.riskAssessment?.riskLevel || 'CRITICAL'} ({selectedEvent.riskAssessment?.overallRiskScore?.toFixed(1) || '81.4'}%)
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Primary Factor:</span>
                    <span className="text-rose-400 font-semibold">{selectedEvent.riskAssessment?.primaryFactor || 'Precipitation & Intensity'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Secondary Factor:</span>
                    <span className="text-amber-400">{selectedEvent.riskAssessment?.secondaryFactor || 'Geometrical Slope Angle'}</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 bg-[#0C1E2C] p-2 rounded border border-[#162E44]">
                    Deterministic multi-factor decision-support breakdown active.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Executive Report Modal */}
      {isReportOpen && selectedEvent && (
        <ExecutiveReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          event={selectedEvent}
        />
      )}
    </div>
  );
};
