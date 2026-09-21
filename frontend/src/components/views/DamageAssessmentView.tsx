import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  Download,
  Eye,
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Send,
  FileSpreadsheet
} from 'lucide-react';
import {
  DetectedStructure,
  AssessmentResult,
  DamageClass,
  VerificationStatus,
  VerificationActionRequest
} from '../../types';
import { DataService } from '../../services/dataService';
import { BeforeAfterSatelliteWorkstation } from '../workstation/BeforeAfterSatelliteWorkstation';

interface DamageAssessmentViewProps {
  onSelectView?: (view: any) => void;
}

interface SceneOption {
  id: number;
  code: string;
  sceneId: string;
  title: string;
  subtitle: string;
  datePre: string;
  datePost: string;
  imagePathPre: string;
  imagePathPost: string;
}

const DAMAGE_ENGINE_SCENES: SceneOption[] = [
  {
    id: 3,
    code: 'SCENE-03',
    sceneId: 'sikkim-singtam-dikchu',
    title: 'Scene 03 — Singtam-Dikchu Basin Pre vs Post-Disaster',
    subtitle: 'AOI: Singtam-Dikchu | Pre vs Post-Disaster Footprint Delineation',
    datePre: '28 AUG 2026',
    datePost: '03 SEP 2026',
    imagePathPre: '/assets/satellite/scene_03_pre.jpg?v=5',
    imagePathPost: '/assets/satellite/scene_03_post.jpg?v=5'
  },
  {
    id: 2,
    code: 'SCENE-02',
    sceneId: 'sikkim-chungthang-basin',
    title: 'Scene 02 — Chungthang Settlement Footprints',
    subtitle: 'Sentinel-2 L2A Chungthang Basin Post-Disaster Footprints',
    datePre: '28 AUG 2026',
    datePost: '03 SEP 2026',
    imagePathPre: '/assets/satellite/scene_02_pre.jpg?v=4',
    imagePathPost: '/assets/satellite/scene_02_post.jpg?v=4'
  },
  {
    id: 1,
    code: 'SCENE-01',
    sceneId: 'sikkim-nh10-dikchu-sector',
    title: 'Scene 01 — Dikchu River Basin & Highway 10 Corridor',
    subtitle: 'High-Res Optical Pre/Post Inundation Baseline',
    datePre: '14 AUG 2026',
    datePost: '02 SEP 2026',
    imagePathPre: '/assets/satellite/scene_01_predisaster.jpg?v=4',
    imagePathPost: '/assets/satellite/scene_02_postdisaster.jpg?v=4'
  }
];

export const DamageAssessmentView: React.FC<DamageAssessmentViewProps> = ({ onSelectView }) => {
  const [activeSceneId, setActiveSceneId] = useState<number>(3);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStructure, setSelectedStructure] = useState<DetectedStructure | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<string>('ALL');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [overrideClass, setOverrideClass] = useState<DamageClass>('DESTROYED');
  const [assessorNotes, setAssessorNotes] = useState<string>('');

  const activeScene = DAMAGE_ENGINE_SCENES.find(s => s.id === activeSceneId) || DAMAGE_ENGINE_SCENES[0];

  const fetchAssessment = async (sceneIdToLoad?: string) => {
    setIsLoading(true);
    try {
      const res = await DataService.getSceneResult(sceneIdToLoad || activeScene.sceneId);
      setAssessmentResult(res);
      if (res.structures && res.structures.length > 0) {
        setSelectedStructure(res.structures[0]);
      }
    } catch (err) {
      console.error('Error fetching damage assessment:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessment(activeScene.sceneId);
  }, [activeSceneId]);

  const handleVerificationAction = async (action: 'VERIFY' | 'REJECT' | 'NEEDS_REVIEW' | 'MODIFY_CLASSIFICATION') => {
    if (!selectedStructure || !assessmentResult) return;
    setIsVerifying(true);

    const req: VerificationActionRequest = {
      sceneId: assessmentResult.sceneId,
      structureId: selectedStructure.structureId,
      action: action,
      modifiedClass: action === 'MODIFY_CLASSIFICATION' ? overrideClass : undefined,
      notes: assessorNotes || `Field Verification action: ${action}`,
      assessorId: 'NDRF_OFFICER_T_SANGMA'
    };

    try {
      const updated = await DataService.verifyStructure(req);
      setAssessmentResult(updated);
      const updatedTarget = updated.structures.find(s => s.structureId === selectedStructure.structureId);
      if (updatedTarget) setSelectedStructure(updatedTarget);
      setAssessorNotes('');
    } catch (err) {
      console.error('Verification error:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading || !assessmentResult) {
    return (
      <div className="h-full flex items-center justify-center p-8 font-sans">
        <div className="bg-[#FAF8F1] border border-[#D7DEDC] p-6 rounded-2xl shadow-subtle text-center space-y-3 max-w-sm">
          <RefreshCw className="w-8 h-8 text-[#167F78] animate-spin mx-auto" />
          <h3 className="font-bold text-sm text-[#172126]">RUNNING AUTHORITATIVE ASSESSMENT ENGINE...</h3>
          <p className="text-xs text-[#667579]">
            Ingesting bitemporal optical satellite pair, computing edge/texture difference masks, and classifying structures.
          </p>
        </div>
      </div>
    );
  }

  const stats = assessmentResult.statistics;
  const filteredStructures = assessmentResult.structures.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.structureId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || s.damageClass === severityFilter;
    const matchesVerification = verificationFilter === 'ALL' || s.verificationStatus === verificationFilter;
    return matchesSearch && matchesSeverity && matchesVerification;
  });

  const getDamageBadgeStyle = (cls: DamageClass) => {
    switch (cls) {
      case 'DESTROYED':
        return { bg: 'bg-[#C95050]/15 text-[#C95050] border-[#C95050]/40', label: 'DESTROYED' };
      case 'MAJOR_DAMAGE':
        return { bg: 'bg-[#D9822B]/15 text-[#D9822B] border-[#D9822B]/40', label: 'MAJOR DAMAGE' };
      case 'MINOR_DAMAGE':
        return { bg: 'bg-[#C5A52A]/15 text-[#854D0E] border-[#C5A52A]/40', label: 'MINOR DAMAGE' };
      case 'NO_DAMAGE':
      default:
        return { bg: 'bg-[#4F9D69]/15 text-[#4F9D69] border-[#4F9D69]/40', label: 'NO DAMAGE' };
    }
  };

  return (
    <div className="h-full flex flex-col space-y-2.5 font-sans select-none overflow-y-auto pr-1">
      {/* 1. Header & Demonstration Disclaimer with Scene Selector */}
      <div className="bg-[#10232E] border border-[#203844] rounded-md p-2.5 text-[#F5F2E9] shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#5D8F89]" />
            <h1 className="font-mono font-bold text-xs text-[#F5F2E9] tracking-wider uppercase">
              POST-DISASTER STRUCTURAL DAMAGE ASSESSMENT ENGINE ({activeScene.code} / {activeScene.title})
            </h1>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#C58A24]/20 text-[#C58A24] border border-[#C58A24]/40 font-semibold">
              SYNTHETIC DEMONSTRATION
            </span>
          </div>
          <p className="text-[10px] font-mono text-[#8E99A8] mt-0.5">
            NRSC-NDEM DSS COMPATIBLE • BITEMPORAL ORB OPTICAL REGISTRATION • 4-TIER DETERMINISTIC CLASSIFIER
          </p>
        </div>

        {/* Scene Selection Switcher */}
        <div className="flex items-center space-x-1 bg-[#172A35] p-1 rounded border border-[#203844] text-[10px] font-mono">
          {DAMAGE_ENGINE_SCENES.map(sc => (
            <button
              key={sc.id}
              onClick={() => setActiveSceneId(sc.id)}
              className={`px-2.5 py-1 rounded transition-colors font-semibold cursor-pointer ${
                activeSceneId === sc.id
                  ? 'bg-[#5D8F89] text-white shadow-sm'
                  : 'text-[#8E99A8] hover:text-white hover:bg-[#203844]'
              }`}
            >
              {sc.code}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 text-[10px] font-mono">
          <a
            href={DataService.getExportUrl(assessmentResult.sceneId, 'csv')}
            download="satguard_damage_register.csv"
            className="px-2.5 py-1 rounded bg-[#172A35] hover:bg-[#203844] border border-[#203844] text-[#F5F2E9] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3 text-[#5D8F89]" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => fetchAssessment(activeScene.sceneId)}
            className="px-2.5 py-1 rounded bg-[#5D8F89] hover:bg-[#4E7D77] text-white font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Re-Analyze Scene</span>
          </button>
        </div>
      </div>

      {/* 2. 4-Tier Standard Damage Statistics Header Cards (Sharper, Compact) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 font-mono shrink-0">
        {/* Tier 1: DESTROYED */}
        <div className="bg-[#FAF8F1] border border-[#C9CEC8] rounded-md p-2 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between text-[11px] text-[#667579]">
            <span className="font-bold text-[#C95050] uppercase flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C95050] mr-1" />
              1. DESTROYED
            </span>
            <span className="font-bold text-[#C95050]">{stats.destroyedPercentage}%</span>
          </div>
          <div className="text-xl font-bold text-[#C95050]">{stats.destroyedCount} <span className="text-[10px] font-normal text-[#667579]">structures</span></div>
          <p className="text-[9px] text-[#667579]">Structural collapse &gt;65% loss</p>
        </div>

        {/* Tier 2: MAJOR DAMAGE */}
        <div className="bg-[#FAF8F1] border border-[#C9CEC8] rounded-md p-2 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between text-[11px] text-[#667579]">
            <span className="font-bold text-[#D9822B] uppercase flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9822B] mr-1" />
              2. MAJOR DAMAGE
            </span>
            <span className="font-bold text-[#D9822B]">{stats.majorDamagePercentage}%</span>
          </div>
          <div className="text-xl font-bold text-[#D9822B]">{stats.majorDamageCount} <span className="text-[10px] font-normal text-[#667579]">structures</span></div>
          <p className="text-[9px] text-[#667579]">Substantial loss (40-65%)</p>
        </div>

        {/* Tier 3: MINOR DAMAGE */}
        <div className="bg-[#FAF8F1] border border-[#C9CEC8] rounded-md p-2 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between text-[11px] text-[#667579]">
            <span className="font-bold text-[#C5A52A] uppercase flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A52A] mr-1" />
              3. MINOR DAMAGE
            </span>
            <span className="font-bold text-[#C5A52A]">{stats.minorDamagePercentage}%</span>
          </div>
          <div className="text-xl font-bold text-[#C5A52A]">{stats.minorDamageCount} <span className="text-[10px] font-normal text-[#667579]">structures</span></div>
          <p className="text-[9px] text-[#667579]">Localized displacement (18-40%)</p>
        </div>

        {/* Tier 4: NO DAMAGE */}
        <div className="bg-[#FAF8F1] border border-[#C9CEC8] rounded-md p-2 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between text-[11px] text-[#667579]">
            <span className="font-bold text-[#4F9D69] uppercase flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F9D69] mr-1" />
              4. NO DAMAGE
            </span>
            <span className="font-bold text-[#4F9D69]">{stats.noDamagePercentage}%</span>
          </div>
          <div className="text-xl font-bold text-[#4F9D69]">{stats.noDamageCount} <span className="text-[10px] font-normal text-[#667579]">structures</span></div>
          <p className="text-[9px] text-[#667579]">Structure intact &lt;18% change</p>
        </div>
      </div>

      {/* 3. Bitemporal Workstation (Dual Canvas Split Comparison with Real Satellite Images) */}
      <BeforeAfterSatelliteWorkstation
        beforeImage={activeScene.imagePathPre}
        afterImage={activeScene.imagePathPost}
        changeMaskBase64={assessmentResult.changeDetection.changeMaskBase64}
        structures={assessmentResult.structures}
        selectedStructure={selectedStructure}
        onSelectStructure={setSelectedStructure}
        sceneTitle={activeScene.title}
        acquisitionDates={{ before: activeScene.datePre, after: activeScene.datePost }}
      />

      {/* 4. Main Two-Column Analysis Grid: Structure Table + Structure Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Left Column: Structure Inventory Table (7 cols) */}
        <div className="lg:col-span-7 bg-[#FAF8F1] border border-[#C9CEC8] rounded-md p-3 space-y-2.5 shadow-sm flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D7DEDC] pb-2">
            <div className="flex items-center space-x-2">
              <h3 className="font-mono font-bold text-xs text-[#172126] uppercase">
                STRUCTURE INVENTORY REGISTER ({filteredStructures.length} / {stats.totalStructures})
              </h3>
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center space-x-2 text-xs">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg px-2 py-1 text-xs text-[#172126] font-medium cursor-pointer"
              >
                <option value="ALL">All Severities</option>
                <option value="DESTROYED">Destroyed</option>
                <option value="MAJOR_DAMAGE">Major Damage</option>
                <option value="MINOR_DAMAGE">Minor Damage</option>
                <option value="NO_DAMAGE">No Damage</option>
              </select>

              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg px-2 py-1 text-xs text-[#172126] font-medium cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="UNVERIFIED">Unverified</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#667579] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search structure by ID or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#172126] placeholder-[#667579] focus:outline-none"
            />
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-x-auto max-h-[380px] pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D7DEDC] text-[10px] font-mono text-[#667579] uppercase bg-[#E6EDEB]/50">
                  <th className="py-2 px-2">ID</th>
                  <th className="py-2 px-2">Structure Name</th>
                  <th className="py-2 px-2">Classification</th>
                  <th className="py-2 px-2">Structural Change</th>
                  <th className="py-2 px-2">Confidence</th>
                  <th className="py-2 px-2">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D7DEDC]/60 font-sans">
                {filteredStructures.map((s) => {
                  const badge = getDamageBadgeStyle(s.damageClass);
                  const isSelected = selectedStructure?.structureId === s.structureId;

                  return (
                    <tr
                      key={s.structureId}
                      onClick={() => setSelectedStructure(s)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#E6EDEB] font-semibold'
                          : 'hover:bg-[#E6EDEB]/40'
                      }`}
                    >
                      <td className="py-2 px-2 font-mono text-[11px] text-[#167F78]">{s.structureId}</td>
                      <td className="py-2 px-2 text-[#172126] truncate max-w-[180px]">{s.name}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-mono text-[#172126]">{Math.round(s.structuralChangeScore * 100)}%</td>
                      <td className="py-2 px-2 font-mono text-[#167F78]">{Math.round(s.confidence * 100)}%</td>
                      <td className="py-2 px-2">
                        <span className={`text-[9px] font-mono font-semibold ${
                          s.verificationStatus === 'VERIFIED'
                            ? 'text-[#4F9D69]'
                            : s.verificationStatus === 'REJECTED'
                            ? 'text-[#C95050]'
                            : s.verificationStatus === 'NEEDS_REVIEW'
                            ? 'text-[#C58A24]'
                            : 'text-[#667579]'
                        }`}>
                          {s.verificationStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Detailed Structure Inspector & Verification Desk (5 cols) */}
        <div className="lg:col-span-5 bg-[#FAF8F1] border border-[#C9CEC8] rounded-md p-3 space-y-2.5 shadow-sm flex flex-col">
          {selectedStructure ? (
            <>
              {/* Structure Inspector Header */}
              <div className="border-b border-[#D7DEDC] pb-2 flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-mono text-[#167F78] font-bold uppercase">
                    STRUCTURE INSPECTOR · {selectedStructure.structureId}
                  </div>
                  <h4 className="font-bold text-sm text-[#172126] leading-tight mt-0.5">
                    {selectedStructure.name}
                  </h4>
                  <span className="text-[10px] text-[#667579] font-mono">
                    Area: {selectedStructure.footprintAreaM2} m² · Lat: {selectedStructure.centerLat.toFixed(4)}°N, Lng: {selectedStructure.centerLng.toFixed(4)}°E
                  </span>
                </div>

                <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border ${getDamageBadgeStyle(selectedStructure.damageClass).bg}`}>
                  {getDamageBadgeStyle(selectedStructure.damageClass).label}
                </span>
              </div>

              {/* Bitemporal Cropped Evidence Previews */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC] flex flex-col space-y-1">
                  <span className="text-[10px] font-mono text-[#667579] font-bold">PRE-DISASTER CROP</span>
                  {selectedStructure.beforeEvidence ? (
                    <img src={selectedStructure.beforeEvidence} alt="Pre-Disaster Evidence" className="w-full h-24 object-cover rounded border border-[#D7DEDC]" />
                  ) : (
                    <div className="w-full h-24 bg-[#FAF8F1] flex items-center justify-center text-[10px] text-[#667579]">Baseline Crop</div>
                  )}
                </div>

                <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC] flex flex-col space-y-1">
                  <span className="text-[10px] font-mono text-[#C95050] font-bold">POST-DISASTER CROP</span>
                  {selectedStructure.afterEvidence ? (
                    <img src={selectedStructure.afterEvidence} alt="Post-Disaster Evidence" className="w-full h-24 object-cover rounded border border-[#D7DEDC]" />
                  ) : (
                    <div className="w-full h-24 bg-[#FAF8F1] flex items-center justify-center text-[10px] text-[#667579]">Post Evidence</div>
                  )}
                </div>
              </div>

              {/* 8-Dimensional Quantitative Damage Features */}
              <div className="bg-[#E6EDEB] p-3 rounded-lg border border-[#D7DEDC] space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#172126] uppercase">
                  <span>MEASURABLE DAMAGE FEATURES</span>
                  <span className="text-[10px] font-mono text-[#167F78]">Confidence: {Math.round(selectedStructure.confidence * 100)}%</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#667579]">Structural Loss:</span>
                    <strong className="font-mono text-[#172126]">{Math.round(selectedStructure.features.structuralChange * 100)}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#667579]">Boundary Fracture:</span>
                    <strong className="font-mono text-[#172126]">{Math.round(selectedStructure.features.edgeChange * 100)}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#667579]">Envelope Disruption:</span>
                    <strong className="font-mono text-[#172126]">{Math.round(selectedStructure.features.disappearanceEvidence * 100)}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#667579]">Debris Inundation:</span>
                    <strong className="font-mono text-[#172126]">{Math.round(selectedStructure.features.appearanceEvidence * 100)}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#667579]">Spectral Shift:</span>
                    <strong className="font-mono text-[#172126]">{Math.round(selectedStructure.features.pixelChange * 100)}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#667579]">Texture Variance:</span>
                    <strong className="font-mono text-[#172126]">{Math.round(selectedStructure.features.textureChange * 100)}%</strong>
                  </div>
                </div>
              </div>

              {/* Explainable AI (XAI) Attribution Explanation */}
              <div className="bg-[#E6EDEB] p-2.5 rounded-lg border border-[#D7DEDC] text-[11px] text-[#172126] leading-relaxed">
                <strong className="text-[#167F78]">Engine Explanation: </strong>
                {selectedStructure.explanation}
              </div>

              {/* Human Assessor Verification Actions */}
              <div className="pt-1 border-t border-[#D7DEDC] space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#172126] uppercase">
                  <span>HUMAN VERIFICATION DESK</span>
                  <span className="font-mono text-[10px] text-[#667579]">STATUS: {selectedStructure.verificationStatus}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleVerificationAction('VERIFY')}
                    disabled={isVerifying}
                    className="py-1.5 rounded-lg bg-[#4F9D69] hover:bg-[#3F7D54] text-[#FAF8F1] font-semibold text-xs transition-colors cursor-pointer shadow-subtle flex items-center justify-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>VERIFY</span>
                  </button>

                  <button
                    onClick={() => handleVerificationAction('NEEDS_REVIEW')}
                    disabled={isVerifying}
                    className="py-1.5 rounded-lg bg-[#C58A24] hover:bg-[#A8741B] text-[#FAF8F1] font-semibold text-xs transition-colors cursor-pointer shadow-subtle flex items-center justify-center space-x-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>NEEDS REVIEW</span>
                  </button>

                  <button
                    onClick={() => handleVerificationAction('REJECT')}
                    disabled={isVerifying}
                    className="py-1.5 rounded-lg bg-[#C95050] hover:bg-[#B33E3E] text-[#FAF8F1] font-semibold text-xs transition-colors cursor-pointer shadow-subtle flex items-center justify-center space-x-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>REJECT</span>
                  </button>
                </div>

                {/* Optional Override Category Selector */}
                <div className="flex items-center space-x-2 pt-1">
                  <select
                    value={overrideClass}
                    onChange={(e) => setOverrideClass(e.target.value as DamageClass)}
                    className="flex-1 bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg px-2 py-1 text-xs text-[#172126] font-medium"
                  >
                    <option value="DESTROYED">Override: DESTROYED</option>
                    <option value="MAJOR_DAMAGE">Override: MAJOR DAMAGE</option>
                    <option value="MINOR_DAMAGE">Override: MINOR DAMAGE</option>
                    <option value="NO_DAMAGE">Override: NO DAMAGE</option>
                  </select>

                  <button
                    onClick={() => handleVerificationAction('MODIFY_CLASSIFICATION')}
                    disabled={isVerifying}
                    className="px-3 py-1 rounded-lg bg-[#167F78] hover:bg-[#136E68] text-[#FAF8F1] text-xs font-semibold cursor-pointer shadow-subtle"
                  >
                    Modify
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center text-xs text-[#667579]">
              <Building2 className="w-8 h-8 text-[#667579]/40 mb-2" />
              Select a structure from the inventory or satellite workstation to inspect damage features.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
