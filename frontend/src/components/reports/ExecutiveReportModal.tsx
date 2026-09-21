import React, { useState } from 'react';
import {
  X,
  FileText,
  Shield,
  AlertTriangle,
  Building2,
  Calendar,
  MapPin,
  CheckCircle2,
  Layers,
  Sparkles,
  Info,
  TrendingUp,
  Activity,
  Sliders,
  Printer
} from 'lucide-react';
import { AssessmentResult, RiskAssessmentResult, HistoricalEventRecord } from '../../types';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentResult?: AssessmentResult | null;
  riskResult?: RiskAssessmentResult | null;
  event?: HistoricalEventRecord | null;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  assessmentResult,
  riskResult,
  event
}) => {
  const [activeSection, setActiveSection] = useState<string>('all');

  if (!isOpen) return null;

  const meta = assessmentResult?.sceneMetadata || (event ? {
    sceneId: event.eventId,
    title: event.eventName,
    location: event.location,
    sensor: event.imagery?.sensor || 'Sentinel-2 MSI',
    acquisitionDates: event.imagery?.acquisitionDates || event.eventDate,
    resolution: event.imagery?.resolution || '10m GSD',
    disasterType: event.disasterType
  } : undefined);

  const stats = assessmentResult?.statistics || (event?.assessment ? {
    totalStructures: event.assessment.totalStructures,
    destroyedCount: event.assessment.destroyedCount,
    majorDamageCount: event.assessment.majorDamageCount,
    minorDamageCount: event.assessment.minorDamageCount,
    noDamageCount: event.assessment.noDamageCount,
    destroyedPercentage: event.assessment.destroyedPercentage,
    majorDamagePercentage: event.assessment.majorDamagePercentage,
    minorDamagePercentage: event.assessment.minorDamagePercentage,
    noDamagePercentage: event.assessment.noDamagePercentage,
    averageConfidence: event.assessment.averageConfidence,
    damagedFootprintAreaM2: event.assessment.damagedFootprintAreaM2,
    damagedStructureDensityPct: (event.assessment.majorDamageCount / Math.max(1, event.assessment.totalStructures)) * 100,
    verifiedCount: event.verification?.verifiedCount || 0,
    unverifiedCount: event.verification?.unverifiedCount || 0,
    needsReviewCount: event.verification?.needsReviewCount || 0,
    provenance: 'IMAGE-DERIVED / OBSERVED',
    isSyntheticFootprints: true
  } : undefined);

  const change = assessmentResult?.changeDetection || (event?.assessment ? {
    changeScore: event.assessment.changeScore,
    changedAreaM2: event.assessment.changedAreaM2,
    changePercentage: event.assessment.changePercentage,
    deltaFromBaselinePct: event.assessment.changePercentage,
    activeThreshold: 0.18,
    changeDistribution: { critical: 0.35, substantial: 0.4, moderate: 0.15, negligible: 0.1 }
  } : undefined);

  const structures = assessmentResult?.structures || [];

  const riskScore = riskResult?.overallRiskScore || event?.riskAssessment?.overallRiskScore || 81.4;
  const riskLevel = riskResult?.riskLevel || event?.riskAssessment?.riskLevel || 'CRITICAL';
  const factors = riskResult?.factorContributions || event?.riskAssessment?.factorContributions || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] w-full max-w-5xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#172126]">
        {/* Modal Header */}
        <div className="bg-[#172126] text-[#FAF8F1] px-6 py-4 flex items-center justify-between border-b border-[#2C3B42] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#167F78]/20 border border-[#167F78]/40 flex items-center justify-center text-[#5D8F89]">
              <FileText className="w-5 h-5 text-[#167F78]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-base tracking-wide uppercase">
                  EXECUTIVE DISASTER ASSESSMENT & RISK INTELLIGENCE REPORT
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C58A24]/20 text-[#C58A24] border border-[#C58A24]/40 font-semibold">
                  SYNTHETIC DEMONSTRATION
                </span>
              </div>
              <p className="text-xs text-[#9EAAA7] font-mono mt-0.5">
                DOC-REF: SATGUARD-CR-2026-SK01 • TEESTA RIVER BASIN CORRIDOR • CLASSIFICATION: OFFICIAL USE
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#24333B] hover:bg-[#2C3E47] text-xs font-semibold text-[#FAF8F1] border border-[#3A4E58] transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#5D8F89]" />
              <span>Print / View PDF View</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#24333B] hover:bg-[#2C3E47] text-[#9EAAA7] hover:text-[#FAF8F1] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="bg-[#E6EDEB] border-b border-[#D7DEDC] px-6 py-2 flex items-center space-x-2 overflow-x-auto text-xs font-semibold shrink-0">
          {[
            { id: 'all', label: 'Complete Report' },
            { id: 'summary', label: '1. Event Summary' },
            { id: 'imagery', label: '2. Satellite & Change' },
            { id: 'damage', label: '3. Damage Assessment' },
            { id: 'verification', label: '4. Human Verification' },
            { id: 'risk', label: '5. Risk Matrix' },
            { id: 'findings', label: '6. Key Findings & Caveats' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeSection === tab.id
                  ? 'bg-[#FAF8F1] text-[#167F78] shadow-sm border border-[#D7DEDC]'
                  : 'text-[#667579] hover:text-[#172126] hover:bg-[#FAF8F1]/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Report Document Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-sans select-text">
          {/* 1. EVENT SUMMARY & HEADER BANNER */}
          {(activeSection === 'all' || activeSection === 'summary') && (
            <section className="space-y-3">
              <div className="border-b border-[#D7DEDC] pb-2 flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#167F78] flex items-center">
                  <span className="w-2 h-2 rounded-full bg-[#167F78] mr-2" />
                  SECTION 1: DISASTER EVENT PROFILE & LOCATION SUMMARY
                </h3>
                <span className="text-[11px] font-mono text-[#667579]">AUDIT TIMESTAMP: {new Date().toISOString()}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-[#E6EDEB] p-3 rounded-xl border border-[#D7DEDC]">
                  <span className="text-[10px] text-[#667579] block font-semibold uppercase">EVENT IDENTIFIER</span>
                  <span className="text-xs font-mono font-bold text-[#172126] mt-0.5 block truncate">
                    {assessmentResult?.eventId || 'sikkim-teesta-flood-2026'}
                  </span>
                </div>
                <div className="bg-[#E6EDEB] p-3 rounded-xl border border-[#D7DEDC]">
                  <span className="text-[10px] text-[#667579] block font-semibold uppercase">GEOGRAPHIC CORRIDOR</span>
                  <span className="text-xs font-semibold text-[#172126] mt-0.5 block truncate">
                    NH-10 Dikchu–Singtam Riverfront Sector
                  </span>
                </div>
                <div className="bg-[#E6EDEB] p-3 rounded-xl border border-[#D7DEDC]">
                  <span className="text-[10px] text-[#667579] block font-semibold uppercase">HAZARD PHENOMENOLOGY</span>
                  <span className="text-xs font-semibold text-[#C95050] mt-0.5 block">
                    Flash Flood & Debris Torrent
                  </span>
                </div>
                <div className="bg-[#E6EDEB] p-3 rounded-xl border border-[#D7DEDC]">
                  <span className="text-[10px] text-[#667579] block font-semibold uppercase">ACQUISITION DATES</span>
                  <span className="text-xs font-mono text-[#172126] mt-0.5 block">
                    {typeof meta?.acquisitionDates === 'string'
                      ? meta.acquisitionDates
                      : `${meta?.acquisitionDates?.before || '28 Aug 2026'} / ${meta?.acquisitionDates?.after || '03 Sept 2026'}`}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* 2. BITEMPORAL SATELLITE & CHANGE DETECTION */}
          {(activeSection === 'all' || activeSection === 'imagery') && (
            <section className="space-y-3">
              <div className="border-b border-[#D7DEDC] pb-2 flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#167F78] flex items-center">
                  <span className="w-2 h-2 rounded-full bg-[#167F78] mr-2" />
                  SECTION 2: BITEMPORAL OPTICAL SATELLITE IMAGERY & CHANGE ANOMALY ANALYSIS
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#E6EDEB] p-3 rounded-xl border border-[#D7DEDC] space-y-1">
                  <span className="text-[10px] text-[#667579] block font-semibold uppercase">OPTICAL CORRIDOR CHANGE</span>
                  <div className="text-xl font-bold font-mono text-[#C58A24]">
                    {((change?.changeScore || 0.428) * 100).toFixed(1)}%
                  </div>
                  <p className="text-[11px] text-[#667579]">Calculated via multi-channel difference & Sobel edge gradients.</p>
                </div>
                <div className="bg-[#E6EDEB] p-3 rounded-xl border border-[#D7DEDC] space-y-1">
                  <span className="text-[10px] text-[#667579] block font-semibold uppercase">TOTAL CHANGED AREA</span>
                  <div className="text-xl font-bold font-mono text-[#172126]">
                    {(change?.changedAreaM2 || 89400).toLocaleString()} <span className="text-xs font-normal">m²</span>
                  </div>
                  <p className="text-[11px] text-[#667579]">Surface inundation and bank erosion footprint.</p>
                </div>
                <div className="bg-[#E6EDEB] p-3 rounded-xl border border-[#D7DEDC] space-y-1">
                  <span className="text-[10px] text-[#667579] block font-semibold uppercase">OPTICAL REGISTRATION METHOD</span>
                  <div className="text-xs font-mono font-bold text-[#167F78] mt-1">
                    ORB + Homography Rigid Fallback
                  </div>
                  <p className="text-[11px] text-[#667579]">Approximate optical alignment (pixel displacement verified).</p>
                </div>
              </div>
            </section>
          )}

          {/* 3. 4-TIER STRUCTURAL DAMAGE CLASSIFICATION */}
          {(activeSection === 'all' || activeSection === 'damage') && (
            <section className="space-y-3">
              <div className="border-b border-[#D7DEDC] pb-2 flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#167F78] flex items-center">
                  <span className="w-2 h-2 rounded-full bg-[#167F78] mr-2" />
                  SECTION 3: 4-TIER DETERMINISTIC STRUCTURAL DAMAGE ASSESSMENT
                </h3>
              </div>

              {/* 4-Tier Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#C95050]/10 border border-[#C95050]/30 p-3 rounded-xl">
                  <div className="flex justify-between items-center text-xs text-[#C95050] font-bold">
                    <span>1. DESTROYED</span>
                    <span>{stats?.destroyedPercentage || 0}%</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#C95050] mt-1">
                    {stats?.destroyedCount || 0} <span className="text-xs font-normal text-[#667579]">structures</span>
                  </div>
                  <p className="text-[10px] text-[#667579] mt-0.5">Structural collapse / &gt;65% loss</p>
                </div>

                <div className="bg-[#D97706]/10 border border-[#D97706]/30 p-3 rounded-xl">
                  <div className="flex justify-between items-center text-xs text-[#D97706] font-bold">
                    <span>2. MAJOR DAMAGE</span>
                    <span>{stats?.majorDamagePercentage || 30}%</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#D97706] mt-1">
                    {stats?.majorDamageCount || 3} <span className="text-xs font-normal text-[#667579]">structures</span>
                  </div>
                  <p className="text-[10px] text-[#667579] mt-0.5">Substantial boundary change (40-65%)</p>
                </div>

                <div className="bg-[#C58A24]/10 border border-[#C58A24]/30 p-3 rounded-xl">
                  <div className="flex justify-between items-center text-xs text-[#C58A24] font-bold">
                    <span>3. MINOR DAMAGE</span>
                    <span>{stats?.minorDamagePercentage || 10}%</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#C58A24] mt-1">
                    {stats?.minorDamageCount || 1} <span className="text-xs font-normal text-[#667579]">structures</span>
                  </div>
                  <p className="text-[10px] text-[#667579] mt-0.5">Localized roof displacement (18-40%)</p>
                </div>

                <div className="bg-[#4F9D69]/10 border border-[#4F9D69]/30 p-3 rounded-xl">
                  <div className="flex justify-between items-center text-xs text-[#4F9D69] font-bold">
                    <span>4. NO DAMAGE</span>
                    <span>{stats?.noDamagePercentage || 60}%</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#4F9D69] mt-1">
                    {stats?.noDamageCount || 6} <span className="text-xs font-normal text-[#667579]">structures</span>
                  </div>
                  <p className="text-[10px] text-[#667579] mt-0.5">Structure intact &lt;18% change</p>
                </div>
              </div>

              {/* Sample Structure Register Table */}
              <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl overflow-hidden shadow-subtle mt-2">
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-[#E6EDEB] border-b border-[#D7DEDC] text-[10px] uppercase font-bold text-[#667579]">
                      <th className="p-2.5">Structure ID</th>
                      <th className="p-2.5">Facility Name</th>
                      <th className="p-2.5">Damage Class</th>
                      <th className="p-2.5">Structural Change</th>
                      <th className="p-2.5">Confidence</th>
                      <th className="p-2.5">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D7DEDC]">
                    {structures.slice(0, 5).map(s => (
                      <tr key={s.structureId} className="hover:bg-[#E6EDEB]/40">
                        <td className="p-2.5 font-mono font-bold text-[#167F78]">{s.structureId}</td>
                        <td className="p-2.5 font-semibold text-[#172126]">{s.name}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            s.damageClass === 'DESTROYED' ? 'bg-[#C95050]/15 text-[#C95050]' :
                            s.damageClass === 'MAJOR_DAMAGE' ? 'bg-[#D97706]/15 text-[#D97706]' :
                            s.damageClass === 'MINOR_DAMAGE' ? 'bg-[#C58A24]/15 text-[#C58A24]' :
                            'bg-[#4F9D69]/15 text-[#4F9D69]'
                          }`}>
                            {s.damageClass}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono">{(s.structuralChangeScore * 100).toFixed(1)}%</td>
                        <td className="p-2.5 font-mono">{(s.confidence * 100).toFixed(1)}%</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            s.verificationStatus === 'VERIFIED' ? 'bg-[#167F78]/15 text-[#167F78]' : 'bg-[#C58A24]/15 text-[#C58A24]'
                          }`}>
                            {s.verificationStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 4. TRANSPARENT MULTI-FACTOR RISK MATRIX */}
          {(activeSection === 'all' || activeSection === 'risk') && (
            <section className="space-y-3">
              <div className="border-b border-[#D7DEDC] pb-2 flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#167F78] flex items-center">
                  <span className="w-2 h-2 rounded-full bg-[#167F78] mr-2" />
                  SECTION 4: TRANSPARENT MULTI-FACTOR GEOTECHNICAL RISK MATRIX
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C95050]/15 text-[#C95050] font-bold">
                  OVERALL RISK SCORE: {riskScore}% ({riskLevel})
                </span>
              </div>

              <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl overflow-hidden shadow-subtle">
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-[#E6EDEB] border-b border-[#D7DEDC] text-[10px] uppercase font-bold text-[#667579]">
                      <th className="p-2.5">Risk Factor</th>
                      <th className="p-2.5">Measured / Input Value</th>
                      <th className="p-2.5">Configured Weight</th>
                      <th className="p-2.5">Contribution Points</th>
                      <th className="p-2.5">Authoritative Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D7DEDC]">
                    {factors.map((f, idx) => (
                      <tr key={idx} className="hover:bg-[#E6EDEB]/40">
                        <td className="p-2.5 font-bold text-[#172126]">{f.factor}</td>
                        <td className="p-2.5 font-mono text-[#167F78]">{f.rawValue}</td>
                        <td className="p-2.5 font-mono">{(f.configuredWeight * 100).toFixed(0)}%</td>
                        <td className="p-2.5 font-mono font-bold text-[#C95050]">{f.contributionPoints.toFixed(2)} pts</td>
                        <td className="p-2.5 text-[10px] text-[#667579] font-mono">{f.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 5. KEY OPERATIONAL FINDINGS & LIMITATIONS */}
          {(activeSection === 'all' || activeSection === 'findings') && (
            <section className="space-y-3">
              <div className="border-b border-[#D7DEDC] pb-2 flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#167F78] flex items-center">
                  <span className="w-2 h-2 rounded-full bg-[#167F78] mr-2" />
                  SECTION 5: KEY OPERATIONAL FINDINGS & SCIENTIFIC CAVEATS
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#FAF8F1] border border-[#D7DEDC] p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-xs text-[#172126] uppercase flex items-center">
                    <CheckCircle2 className="w-4 h-4 text-[#167F78] mr-1.5" />
                    Key Operational Directives
                  </h4>
                  <ul className="text-xs text-[#667579] space-y-1.5 list-disc pl-4">
                    <li><strong className="text-[#172126]">NH-10 Transport Arterial:</strong> Significant debris inundation detected across Singtam Viaduct approach pier. Heavy vehicle diversion recommended.</li>
                    <li><strong className="text-[#172126]">Pore-Water Saturation:</strong> Volumetric soil moisture at 84.2% requires mandatory geotechnical slope monitor dispatch before road clearance.</li>
                    <li><strong className="text-[#172126]">Priority Infrastructure:</strong> Singtam Hydro Intake Station and Dikchu Secondary School identified for priority ground inspection.</li>
                  </ul>
                </div>

                <div className="bg-[#FAF8F1] border border-[#C58A24]/30 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-xs text-[#C58A24] uppercase flex items-center">
                    <AlertTriangle className="w-4 h-4 text-[#C58A24] mr-1.5" />
                    Scientific Caveats & Limitations
                  </h4>
                  <ul className="text-xs text-[#667579] space-y-1.5 list-disc pl-4">
                    <li><strong className="text-[#172126]">Optical Image Registration:</strong> Approximate feature-based alignment utilized. Sub-pixel geospatial registration requires authoritative GIS RPC files.</li>
                    <li><strong className="text-[#172126]">Synthetic Footprints:</strong> Candidate building geometries are synthetic demonstration polygons and require cadastral validation.</li>
                    <li><strong className="text-[#172126]">Multi-Factor Decision Support:</strong> Geotechnical risk represents susceptibility indices, not structural Factor-of-Safety engineering predictions.</li>
                  </ul>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#FAF8F1] border-t border-[#D7DEDC] px-6 py-3 flex items-center justify-between shrink-0 text-xs text-[#667579]">
          <span className="font-mono text-[11px]">SATGUARD EARTH OBSERVATION DISASTER COMMAND CENTER • PHASE 3</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#167F78] hover:bg-[#136C67] text-[#FAF8F1] font-semibold transition-colors cursor-pointer"
          >
            Close Executive Report
          </button>
        </div>
      </div>
    </div>
  );
};
