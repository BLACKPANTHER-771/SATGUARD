import React from 'react';
import {
  Activity,
  AlertTriangle,
  Droplets,
  Mountain,
  History,
  Layers,
  MapPin,
  Building,
  Navigation,
  Shield,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  Truck,
  Home,
  Radio,
  Sparkles,
  Info
} from 'lucide-react';
import { RiskZone } from '../../types';
import { InterpretableRiskEngine, RiskEngineOutput } from '../../services/riskEngine';

interface RedZoneInspectorProps {
  zone: RiskZone;
  onClose: () => void;
  timeOffset?: number;
  onTriggerSOP?: () => void;
  isModal?: boolean;
}

export const RedZoneInspector: React.FC<RedZoneInspectorProps> = ({
  zone,
  onClose,
  timeOffset = 0,
  onTriggerSOP,
  isModal = true
}) => {
  const analysis: RiskEngineOutput = InterpretableRiskEngine.evaluateRisk({
    zoneId: zone.id,
    zoneName: zone.name,
    state: zone.state,
    district: zone.district || 'UNAVAILABLE',
    lat: zone.lat,
    lng: zone.lng,
    elevation_m: zone.elevation_m,
    slope_deg: zone.slope_deg,
    soil_moisture_pct: zone.soil_moisture_pct,
    rainfall_1h_mm: zone.rainfall_1h_mm,
    rainfall_72h_mm: zone.rainfall_72h_mm,
    historical_events_5y: zone.historical_events_5y,
    lithology: zone.lithology || 'UNAVAILABLE',
    soil_type: zone.soil_type || 'UNAVAILABLE',
    population_exposed: zone.population_exposed || 0,
    villages_exposed: zone.villages_exposed || [],
    roads_affected: zone.roads_affected || [],
    threatened_bridges: (zone as any).threatened_bridges || (zone as any).key_assets?.filter((a: string) => /bridge|span|viaduct/i.test(a)),
    critical_facilities: zone.critical_facilities_affected || [],
    satellite_los_displacement_mm: (zone as any).satellite_los_displacement_mm,
    coherence_drop_pct: (zone as any).coherence_drop_pct,
    field_verified: (zone as any).field_verified,
    time_offset_min: timeOffset
  });

  const isCritical = analysis.riskLevel === 'CRITICAL';
  const isHigh = analysis.riskLevel === 'HIGH';
  const isModerate = analysis.riskLevel === 'MODERATE';

  const content = (
    <div className="flex flex-col h-full space-y-3 font-sans text-xs text-[#172126] select-none overflow-y-auto pr-1">
      {/* 1. Header & Priority Banner */}
      <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2.5">
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded-lg ${
            isCritical
              ? 'bg-[#DC2626]/15 text-[#DC2626]'
              : isHigh
              ? 'bg-[#D97706]/15 text-[#D97706]'
              : isModerate
              ? 'bg-[#C58A24]/15 text-[#C58A24]'
              : 'bg-[#167F78]/15 text-[#167F78]'
          }`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm tracking-wide">{zone.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#E6EDEB] text-[#667579]">
                {zone.state || 'UNAVAILABLE'} · {zone.district || 'UNAVAILABLE'}
              </span>
            </div>
            <div className="text-[10px] text-[#667579] font-mono">
              LAT {zone.lat ? `${zone.lat.toFixed(4)}° N` : 'UNAVAILABLE'}, LNG {zone.lng ? `${zone.lng.toFixed(4)}° E` : 'UNAVAILABLE'} · ELEV {zone.elevation_m ? `${zone.elevation_m}m AMSL` : 'UNAVAILABLE'}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[#E6EDEB] text-[#667579] hover:text-[#172126] transition-colors cursor-pointer"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Primary Metrics Row: Risk Score + Risk Level + Trend + Exposure + Response Priority */}
      <div className="grid grid-cols-4 gap-2">
        {/* Risk Score */}
        <div className={`p-2.5 rounded-xl border ${
          isCritical
            ? 'bg-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626]'
            : isHigh
            ? 'bg-[#D97706]/10 border-[#D97706]/30 text-[#D97706]'
            : isModerate
            ? 'bg-[#C58A24]/10 border-[#C58A24]/30 text-[#C58A24]'
            : 'bg-[#167F78]/10 border-[#167F78]/30 text-[#167F78]'
        }`}>
          <div className="text-[10px] font-mono uppercase font-bold tracking-wider">RISK SCORE</div>
          <div className="text-xl font-mono font-bold mt-0.5">{analysis.riskScore}%</div>
          <div className="text-[10px] font-semibold uppercase">{analysis.riskLevel}</div>
        </div>

        {/* Risk Trend */}
        <div className="p-2.5 rounded-xl border border-[#D7DEDC] bg-[#FAF8F1]">
          <div className="text-[10px] font-mono text-[#667579] uppercase font-bold tracking-wider">TREND</div>
          <div className="text-sm font-mono font-bold text-[#172126] mt-1 flex items-center space-x-1">
            <span>{analysis.riskTrend === 'RISING' ? '↗ RISING' : analysis.riskTrend === 'FALLING' ? '↘ FALLING' : '→ STABLE'}</span>
          </div>
          <div className="text-[10px] text-[#667579] font-medium">3h Propagation</div>
        </div>

        {/* Exposure Score */}
        <div className="p-2.5 rounded-xl border border-[#D7DEDC] bg-[#FAF8F1]">
          <div className="text-[10px] font-mono text-[#667579] uppercase font-bold tracking-wider">EXPOSURE</div>
          <div className="text-xl font-mono font-bold text-[#172126] mt-0.5">{analysis.exposureScore}/100</div>
          <div className="text-[10px] text-[#667579] font-semibold truncate">
            {analysis.exposureRecord.exposed_population ? `${analysis.exposureRecord.exposed_population.toLocaleString()} Residents` : 'UNAVAILABLE'}
          </div>
        </div>

        {/* Response Priority */}
        <div className="p-2.5 rounded-xl border border-[#167F78]/30 bg-[#167F78]/10 text-[#167F78]">
          <div className="text-[10px] font-mono uppercase font-bold tracking-wider">PRIORITY</div>
          <div className="text-xs font-bold mt-1 font-mono uppercase truncate">
            {analysis.responsePriority.replace('_', ' ')}
          </div>
          <div className="text-[10px] font-semibold text-[#167F78]">Score: {analysis.responsePriorityScore}</div>
        </div>
      </div>

      {/* 3. Evidence Completeness & Provenance Strip */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-[#172126] flex items-center space-x-1">
            <Radio className="w-3.5 h-3.5 text-[#167F78]" />
            <span>Evidence Completeness:</span>
          </span>
          <span className="font-mono font-bold text-[#167F78] px-2 py-0.5 rounded bg-[#167F78]/10 border border-[#167F78]/20">
            {analysis.evidenceCompleteness.ratio} Indicators Verified
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-[#667579]">
          {analysis.evidenceCompleteness.items.map((item, idx) => (
            <div key={idx} className="flex items-center space-x-1 truncate bg-[#E6EDEB] p-1 rounded">
              <span className={item.present ? 'text-[#167F78] font-bold' : 'text-[#667579]'}>
                {item.present ? '✓' : '—'}
              </span>
              <span className="truncate">{item.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
        <div className="text-[10px] font-mono text-[#C58A24] flex items-center justify-between pt-1 border-t border-[#D7DEDC]/60">
          <span>MODEL: {InterpretableRiskEngine.ENGINE_NAME}</span>
          <span>PROVENANCE: SYNTHETIC</span>
        </div>
      </div>

      {/* 4. Section: WHY? Multi-Factor Trigger Attribution */}
      <div className="space-y-2 bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3">
        <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-1.5">
          <span className="font-bold text-[#172126] uppercase text-[11px] tracking-wider flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-[#DC2626]" />
            <span>Multi-Factor Trigger Attribution (WHY?)</span>
          </span>
          <span className="text-[10px] font-mono text-[#667579]">
            Formula: Score = Σ (Norm × Weight)
          </span>
        </div>

        <div className="space-y-2.5">
          {analysis.riskFactors.map((f) => {
            const isAvail = f.is_available !== false && f.normalized_score !== null && f.normalized_score !== undefined;
            return (
              <div key={f.id} className="space-y-1 p-2 rounded-lg bg-[#E6EDEB]/60 border border-[#D7DEDC]/60">
                <div className="flex justify-between items-center text-[11px]">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isAvail ? f.color : '#9CA3AF' }} />
                    <span className="font-semibold text-[#172126]">{f.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/5 text-[#667579]">
                      Weight: {Math.round(f.weight * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="text-[10px] font-bold text-[#172126]">
                      {isAvail ? `+${f.contribution_points?.toFixed(1)} pts` : 'UNAVAILABLE'}
                    </span>
                    <span className="text-[10px] text-[#667579]">
                      ({f.percentage}% of score)
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono text-[#667579]">
                  <span>Telemetry: {f.indicator_value}</span>
                  <span>{isAvail ? `Norm: ${f.normalized_score}/100` : 'Factor Unavailable'}</span>
                </div>

                <div className="w-full bg-[#D7DEDC] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${isAvail ? Math.max(f.percentage, 4) : 0}%`,
                      backgroundColor: isAvail ? f.color : '#9CA3AF'
                    }}
                  />
                </div>
                <div className="text-[10px] text-[#667579] leading-tight pt-0.5">
                  {f.trigger_narrative}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mathematical Sum Verification Row */}
        <div className="flex items-center justify-between pt-1.5 border-t border-[#D7DEDC] text-[10px] font-mono text-[#167F78] bg-[#167F78]/5 p-2 rounded-lg">
          <span>Σ Factor Contributions:</span>
          <span className="font-bold">
            {(
              (analysis.factorContributions.rainfall || 0) +
              (analysis.factorContributions.slope || 0) +
              (analysis.factorContributions.soilMoisture || 0) +
              (analysis.factorContributions.history || 0) +
              (analysis.factorContributions.lithology || 0)
            ).toFixed(1)} pts = Final Risk Score: {analysis.riskScore}/100
          </span>
        </div>
      </div>

      {/* 5. Section: WHAT IS EXPOSED? (7 Objective Exposure Dimensions) */}
      <div className="space-y-2 bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3">
        <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-1.5">
          <span className="font-bold text-[#172126] uppercase text-[11px] tracking-wider flex items-center space-x-1.5">
            <Building className="w-3.5 h-3.5 text-[#167F78]" />
            <span>Infrastructure & Population Exposure (WHAT?)</span>
          </span>
          <span className="text-[10px] font-mono text-[#C58A24] font-semibold px-2 py-0.5 rounded bg-[#C58A24]/10 border border-[#C58A24]/20">
            • SYNTHETIC / DEMONSTRATION DATA
          </span>
        </div>

        {/* Priority Reason / Rationale Callout */}
        <div className="p-2.5 rounded-lg bg-[#167F78]/10 border border-[#167F78]/25 text-[11px] space-y-1">
          <div className="flex items-center justify-between text-[#167F78] font-bold font-mono text-[10px] uppercase">
            <span>🎯 RESPONSE PRIORITY RATIONALE:</span>
            <span>{analysis.responsePriority.replace('_', ' ')} (Score: {analysis.responsePriorityScore}/100)</span>
          </div>
          <p className="text-[#172126] text-[11px] leading-relaxed font-medium">
            {analysis.priorityRationale}
          </p>
        </div>

        {/* 7 Objective Exposure Dimensions */}
        <div className="space-y-1.5 text-[11px]">
          {/* 1. Population */}
          <div className="flex justify-between items-center bg-[#E6EDEB] p-2 rounded-lg">
            <span className="text-[#667579] font-medium">Exposed Population:</span>
            <strong className="text-[#172126] font-mono font-semibold">
              {analysis.exposureRecord.exposed_population !== null && analysis.exposureRecord.exposed_population !== undefined
                ? `${analysis.exposureRecord.exposed_population.toLocaleString()} Residents`
                : 'UNAVAILABLE'}
            </strong>
          </div>

          {/* 2. Villages / Settlements */}
          <div className="flex justify-between items-center bg-[#E6EDEB] p-2 rounded-lg">
            <span className="text-[#667579] font-medium">Exposed Villages:</span>
            <strong className="text-[#172126] text-right font-medium truncate max-w-[65%]">
              {analysis.exposureRecord.exposed_villages.length > 0
                ? analysis.exposureRecord.exposed_villages.join(', ')
                : 'UNAVAILABLE'}
            </strong>
          </div>

          {/* 3. Roads & Highways */}
          <div className="flex justify-between items-center bg-[#E6EDEB] p-2 rounded-lg">
            <span className="text-[#667579] font-medium">Exposed Roads:</span>
            <strong className="text-[#DC2626] text-right font-mono font-semibold truncate max-w-[65%]">
              {analysis.exposureRecord.vulnerable_road_segments.length > 0
                ? analysis.exposureRecord.vulnerable_road_segments.join(' · ')
                : 'UNAVAILABLE'}
            </strong>
          </div>

          {/* 4. Threatened Bridges */}
          <div className="flex justify-between items-center bg-[#E6EDEB] p-2 rounded-lg">
            <span className="text-[#667579] font-medium">Exposed Bridges:</span>
            <strong className="text-[#172126] text-right truncate max-w-[65%]">
              {analysis.exposureRecord.threatened_bridges.length > 0
                ? analysis.exposureRecord.threatened_bridges.join(', ')
                : 'UNAVAILABLE'}
            </strong>
          </div>

          {/* 5. Hospitals / PHCs */}
          <div className="flex justify-between items-center bg-[#E6EDEB] p-2 rounded-lg">
            <span className="text-[#667579] font-medium">Exposed Hospitals / PHCs:</span>
            <strong className="text-[#172126] text-right truncate max-w-[65%]">
              {analysis.exposureRecord.exposed_hospitals.length > 0
                ? analysis.exposureRecord.exposed_hospitals.join(', ')
                : 'UNAVAILABLE'}
            </strong>
          </div>

          {/* 6. Schools / Shelters */}
          <div className="flex justify-between items-center bg-[#E6EDEB] p-2 rounded-lg">
            <span className="text-[#667579] font-medium">Exposed Schools:</span>
            <strong className="text-[#172126] text-right truncate max-w-[65%]">
              {analysis.exposureRecord.exposed_schools.length > 0
                ? analysis.exposureRecord.exposed_schools.join(', ')
                : 'UNAVAILABLE'}
            </strong>
          </div>

          {/* 7. Critical Infrastructure */}
          <div className="flex justify-between items-center bg-[#E6EDEB] p-2 rounded-lg">
            <span className="text-[#667579] font-medium">Critical Infrastructure:</span>
            <strong className="text-[#172126] text-right truncate max-w-[65%]">
              {analysis.exposureRecord.critical_infrastructure.length > 0
                ? analysis.exposureRecord.critical_infrastructure.join(', ')
                : 'UNAVAILABLE'}
            </strong>
          </div>
        </div>

        <div className="text-[10px] text-[#667579] italic pt-1 border-t border-[#D7DEDC]">
          Notice: Infrastructure exposure data is derived from demonstration GIS layers and should not be used as live census data without field verification.
        </div>
      </div>

      {/* 6. Section: CONNECTIVITY & CRITICAL ASSETS (PHASE 4) */}
      <div className="space-y-2 bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3">
        <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-1.5">
          <span className="font-bold text-[#172126] uppercase text-[11px] tracking-wider flex items-center space-x-1.5">
            <Truck className="w-3.5 h-3.5 text-[#167F78]" />
            <span>Connectivity & Critical Assets (WHAT IS THREATENED?)</span>
          </span>
          <div className="flex items-center space-x-1.5">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              analysis.connectivityImpact === 'CRITICAL'
                ? 'bg-[#DC2626]/15 text-[#DC2626] border-[#DC2626]/30'
                : analysis.connectivityImpact === 'HIGH'
                ? 'bg-[#D97706]/15 text-[#D97706] border-[#D97706]/30'
                : analysis.connectivityImpact === 'MODERATE'
                ? 'bg-[#C58A24]/15 text-[#C58A24] border-[#C58A24]/30'
                : analysis.connectivityImpact === 'UNAVAILABLE'
                ? 'bg-[#667579]/15 text-[#667579] border-[#667579]/30'
                : 'bg-[#167F78]/15 text-[#167F78] border-[#167F78]/30'
            }`}>
              IMPACT: {analysis.connectivityImpact}
            </span>
          </div>
        </div>

        {/* Connectivity Impact Summary & Isolation Risk Callout */}
        <div className="p-2.5 rounded-lg bg-[#E6EDEB] border border-[#D7DEDC] text-[11px] space-y-1">
          <div className="flex items-center justify-between text-[#172126] font-semibold text-[10px]">
            <span className="flex items-center space-x-1 font-mono uppercase font-bold text-[#167F78]">
              <Navigation className="w-3 h-3" />
              <span>TRANSPORT & LIFELINE ASSESSMENT</span>
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-black/5 text-[#667579]">
              Isolation Risk: <strong>{analysis.connectivityAssessment?.isolation_risk || 'UNAVAILABLE'}</strong>
            </span>
          </div>
          <p className="text-[#172126] text-[10px] leading-relaxed">
            {analysis.connectivityAssessment?.impact_summary || 'Baseline monitoring across active corridors.'}
          </p>
        </div>

        {/* Sub-block A: Road Connectivity */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#667579] uppercase font-bold px-1">
            <span>Road Connectivity</span>
            <span>Risk Relationship · Status</span>
          </div>

          {analysis.connectivityAssessment?.affected_roads && analysis.connectivityAssessment.affected_roads.length > 0 ? (
            analysis.connectivityAssessment.affected_roads.map((road) => (
              <div key={road.id} className="p-2 rounded-lg bg-[#E6EDEB] border border-[#D7DEDC] flex flex-col space-y-1 text-[11px]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1.5">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      road.road_class === 'NH'
                        ? 'bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30'
                        : road.road_class === 'SH'
                        ? 'bg-[#D97706]/15 text-[#D97706] border border-[#D97706]/30'
                        : road.road_class === 'RAILWAY'
                        ? 'bg-[#397FA8]/15 text-[#397FA8] border border-[#397FA8]/30'
                        : road.road_class === 'MDR'
                        ? 'bg-[#C58A24]/15 text-[#C58A24] border border-[#C58A24]/30'
                        : 'bg-[#667579]/15 text-[#667579] border border-[#667579]/30'
                    }`}>
                      {road.road_class}
                    </span>
                    <span className="font-bold text-[#172126] font-mono">{road.name}</span>
                  </div>
                  <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded ${
                    road.risk_relationship === 'INSIDE'
                      ? 'bg-[#DC2626]/10 text-[#DC2626]'
                      : road.risk_relationship === 'NEAR'
                      ? 'bg-[#D97706]/10 text-[#D97706]'
                      : 'bg-[#667579]/10 text-[#667579]'
                  }`}>
                    {road.risk_relationship} ZONE
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-[#667579] font-mono pt-0.5 border-t border-[#D7DEDC]/50">
                  <span className="text-[#172126] font-medium">{road.status_label}</span>
                  <span className="text-[9px] text-[#667579]">{road.connectivity_status.replace('_', ' ')}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-2 rounded-lg bg-[#E6EDEB] text-[10px] text-[#667579] italic">
              No road network telemetry available for this sector.
            </div>
          )}
        </div>

        {/* Sub-block B: Bridges */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#667579] uppercase font-bold px-1">
            <span>Bridges & Spans</span>
            <span>Verification Status</span>
          </div>

          {analysis.connectivityAssessment?.threatened_bridges && analysis.connectivityAssessment.threatened_bridges.length > 0 ? (
            analysis.connectivityAssessment.threatened_bridges.map((bridge) => (
              <div key={bridge.id} className="p-2 rounded-lg bg-[#E6EDEB] border border-[#D7DEDC] flex flex-col space-y-1 text-[11px]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#167F78]/15 text-[#167F78] border border-[#167F78]/30">
                      BRIDGE
                    </span>
                    <span className="font-semibold text-[#172126]">{bridge.name}</span>
                  </div>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-black/5 text-[#667579]">
                    {bridge.risk_relationship}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-[#667579] font-mono pt-0.5 border-t border-[#D7DEDC]/50">
                  <span>Carrying: <strong className="text-[#172126] font-mono">{bridge.carrying_road}</strong></span>
                  <span className="text-[#D97706] font-semibold">{bridge.status}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-2 rounded-lg bg-[#E6EDEB] text-[10px] text-[#667579] italic">
              No major bridge records intersecting immediate hazard zone perimeter.
            </div>
          )}
        </div>

        {/* Sub-block C: Critical Infrastructure */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#667579] uppercase font-bold px-1">
            <span>Critical Infrastructure Facilities</span>
            <span>Category · Status</span>
          </div>

          {analysis.connectivityAssessment?.critical_facilities && analysis.connectivityAssessment.critical_facilities.length > 0 ? (
            analysis.connectivityAssessment.critical_facilities.map((facility) => (
              <div key={facility.id} className="p-2 rounded-lg bg-[#E6EDEB] border border-[#D7DEDC] flex flex-col space-y-1 text-[11px]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#397FA8]/15 text-[#397FA8] border border-[#397FA8]/30">
                      {facility.category}
                    </span>
                    <span className="font-semibold text-[#172126]">{facility.name}</span>
                  </div>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-black/5 text-[#667579]">
                    {facility.risk_relationship}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-[#667579] font-mono pt-0.5 border-t border-[#D7DEDC]/50">
                  <span className="text-[#172126] font-medium">{facility.status}</span>
                  <span className="text-[9px] text-[#C58A24] font-semibold">{facility.provenance}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-2 rounded-lg bg-[#E6EDEB] text-[10px] text-[#667579] italic">
              No critical facilities logged in immediate hazard zone.
            </div>
          )}
        </div>

        {/* Data Honesty Provenance Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-[#D7DEDC] text-[9px] font-mono text-[#667579]">
          <span>EVIDENCE STATUS: <strong>SYNTHETIC / DEMONSTRATION</strong></span>
          <span className="text-[#167F78] font-bold">FIELD VERIFICATION PROTOCOL ACTIVE</span>
        </div>
      </div>

      {/* 7. Section: WHAT AUTHORITIES SHOULD DO? (Non-Autonomous Recommendations) */}
      <div className="space-y-2 bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3">
        <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-1.5">
          <span className="font-bold text-[#172126] uppercase text-[11px] tracking-wider flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-[#167F78]" />
            <span>Operational Decision Support (ACTION)</span>
          </span>
          <span className="text-[10px] font-mono text-[#667579]">DDMA / SDRF Actionable</span>
        </div>

        <div className="space-y-2">
          {analysis.recommendations.map((rec) => (
            <div key={rec.id} className="p-2.5 rounded-xl bg-[#E6EDEB] border border-[#D7DEDC] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#172126] text-[11px] flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#167F78]" />
                  <span>{rec.action}</span>
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#167F78]/10 text-[#167F78]">
                  {rec.target_authority}
                </span>
              </div>
              <p className="text-[10px] text-[#667579] leading-relaxed pl-4">
                {rec.rationale}
              </p>
              {rec.is_candidate_route && rec.candidate_route_details && (
                <div className="mt-1 pl-4 text-[10px] font-mono text-[#167F78] bg-[#167F78]/5 p-1.5 rounded-lg border border-[#167F78]/15">
                  <div className="font-bold">📍 Candidate Route: {rec.candidate_route_name}</div>
                  <div className="text-[#667579]">{rec.candidate_route_details}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 7. Mandatory Scientific Disclaimer */}
      <div className="p-2.5 rounded-xl bg-[#FAF8F1] border border-[#D7DEDC] text-[10px] text-[#667579] leading-relaxed flex items-start space-x-2">
        <Info className="w-4 h-4 text-[#667579] shrink-0 mt-0.5" />
        <div>
          <strong>EPOCH Decision-Support Disclaimer:</strong> {analysis.disclaimer}
        </div>
      </div>
    </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-2xl w-full max-w-2xl max-h-[92vh] p-4 shadow-panel flex flex-col">
        {content}
      </div>
    </div>
  );
};
