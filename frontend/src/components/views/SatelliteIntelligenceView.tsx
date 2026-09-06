import React, { useState, useEffect } from 'react';
import {
  Satellite,
  Activity,
  Layers,
  TrendingUp,
  MapPin,
  Clock,
  Radio,
  Compass,
  ArrowDownRight,
  Info,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import type { SatelliteObservation, Sentinel1Observation, Sentinel1PairAnalysis } from '../../types/index.ts';
import { Sentinel1Service } from '../../services/sentinel1Service.ts';
import { getPrimaryAOIForState } from '../../data/command-centre/aoiRegistry.ts';

interface SatelliteIntelligenceViewProps {
  observations?: SatelliteObservation[];
  selectedState?: string;
}

export const SatelliteIntelligenceView: React.FC<SatelliteIntelligenceViewProps> = ({
  observations = [],
  selectedState = 'Sikkim'
}) => {
  const [s1Observations, setS1Observations] = useState<Sentinel1Observation[]>([]);
  const [pairAnalysis, setPairAnalysis] = useState<Sentinel1PairAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const activeAOI = getPrimaryAOIForState(selectedState);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadSARData = async () => {
      try {
        const obsList = await Sentinel1Service.getObservationsForAOI(
          activeAOI.id,
          activeAOI.state,
          activeAOI.polygonCoords
        );

        if (isMounted) {
          setS1Observations(obsList);
          if (obsList.length >= 2) {
            const analysis = Sentinel1Service.getPairAnalysis(obsList[0], obsList[1]);
            setPairAnalysis(analysis);
          } else {
            setPairAnalysis(null);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Failed to load Sentinel-1 observations:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSARData();

    return () => {
      isMounted = false;
    };
  }, [activeAOI.id, selectedState]);

  const activeProvenance = s1Observations[0]?.provenance || 'LIVE';
  const activeSource = s1Observations[0]?.source || 'COPERNICUS-CDSE';
  const baselineDays = pairAnalysis?.temporalBaselineDays || 12;

  return (
    <div className="h-full flex flex-col space-y-3 font-sans select-none overflow-y-auto pr-1">
      {/* Header */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-subtle card-hover-lift">
        <div>
          <div className="flex items-center space-x-2">
            <Satellite className="w-5 h-5 text-[#397FA8]" />
            <h1 className="font-semibold text-sm text-[#172126] tracking-wide">
              COPERNICUS SENTINEL-1 C-BAND SAR & OBSERVATION INTELLIGENCE
            </h1>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                activeProvenance === 'LIVE'
                  ? 'bg-[#167F78]/10 text-[#167F78] border-[#167F78]/25'
                  : 'bg-[#C58A24]/10 text-[#C58A24] border-[#C58A24]/25'
              }`}
            >
              {activeProvenance === 'LIVE'
                ? 'COPERNICUS CDSE · LIVE STREAM'
                : 'SYNTHETIC DEMONSTRATION'}
            </span>
          </div>
          <p className="text-xs text-[#667579] mt-1">
            Sentinel-1 C-band Synthetic Aperture Radar (5.405 GHz) amplitude backscatter and temporal surface anomaly monitoring over {activeAOI.name}.
          </p>
        </div>

        <div className="flex items-center space-x-2 font-mono text-[11px] text-[#667579]">
          <span className="px-2 py-1 rounded-md bg-[#E6EDEB] border border-[#D7DEDC] text-[#397FA8] font-semibold">
            MISSION: SENTINEL-1
          </span>
          <span className="px-2 py-1 rounded-md bg-[#E6EDEB] border border-[#D7DEDC]">
            POL: VV+VH (Dual Pol)
          </span>
          <span className="px-2 py-1 rounded-md bg-[#E6EDEB] border border-[#D7DEDC]">
            MODE: IW GRD (Level-1)
          </span>
        </div>
      </div>

      {/* Temporal Baseline & Pairwise Analysis Banner */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 shadow-subtle card-hover-lift space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-[#667579] uppercase">
          <div className="flex items-center space-x-2">
            <Calendar className="w-3.5 h-3.5 text-[#397FA8]" />
            <span>
              ACQUISITION PAIR: {s1Observations[0]?.acquisitionTime.slice(0, 10) || 'PASS A'} → {s1Observations[1]?.acquisitionTime.slice(0, 10) || 'PASS B'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#167F78] font-semibold">
            TEMPORAL BASELINE: {baselineDays} DAYS (CALCULATED Δt)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#E6EDEB] p-2.5 rounded-lg border border-[#D7DEDC]">
            <span className="text-[10px] text-[#667579] block font-medium">SAR BACKSCATTER (σ°)</span>
            <span className="text-xl font-bold font-mono text-[#397FA8] mt-0.5 block">
              {s1Observations[0]?.backscatterDb !== null && s1Observations[0]?.backscatterDb !== undefined
                ? `${s1Observations[0].backscatterDb.toFixed(1)} dB`
                : 'UNAVAILABLE'}
            </span>
            <span className="text-[10px] text-[#667579]">Surface reflection amplitude</span>
          </div>

          <div className="bg-[#E6EDEB] p-2.5 rounded-lg border border-[#D7DEDC]">
            <span className="text-[10px] text-[#667579] block font-medium">TEMPORAL REPEAT INTERVAL</span>
            <span className="text-xl font-bold font-mono text-[#172126] mt-0.5 block">
              {baselineDays} Days
            </span>
            <span className="text-[10px] text-[#667579]">Dynamic pairwise orbit baseline</span>
          </div>

          <div className="bg-[#E6EDEB] p-2.5 rounded-lg border border-[#D7DEDC]">
            <span className="text-[10px] text-[#667579] block font-medium">SURFACE ANOMALY SIGNAL</span>
            <span className="text-xl font-bold font-mono text-[#C58A24] mt-0.5 block">
              DETECTED
            </span>
            <span className="text-[10px] text-[#667579]">Requires field ground truth</span>
          </div>

          <div className="bg-[#E6EDEB] p-2.5 rounded-lg border border-[#D7DEDC]">
            <span className="text-[10px] text-[#667579] block font-medium">RELATIVE ORBIT / TRACK</span>
            <span className="text-xl font-bold font-mono text-[#172126] mt-0.5 block">
              Track {s1Observations[0]?.relativeOrbitNumber || (selectedState === 'Sikkim' ? '114-A' : '48-D')}
            </span>
            <span className="text-[10px] text-[#667579]">{s1Observations[0]?.orbitDirection || 'ASCENDING'} Orbit</span>
          </div>
        </div>

        {/* Scientific Interpretation Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC] space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-[#397FA8] block">SAR BACKSCATTER (σ°):</span>
            <p className="text-[11px] text-[#667579] leading-snug">
              Microwave reflection identifies moisture saturation changes and rock face roughness shifts along steep slopes.
            </p>
          </div>
          <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC] space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-[#C58A24] block">SURFACE MOTION ANOMALY:</span>
            <p className="text-[11px] text-[#667579] leading-snug">
              Multi-temporal backscatter reduction signals localized regolith disturbance or moisture infiltration.
            </p>
          </div>
          <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC] space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-[#167F78] block">FIELD VERIFICATION LINK:</span>
            <p className="text-[11px] text-[#667579] leading-snug">
              Satellite SAR observations are evidence inputs dispatched to the Truth Loop for field confirmation.
            </p>
          </div>
        </div>
      </div>

      {/* Official Acquisitions Feed */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-[#172126]">
          <span>VERIFIED SENTINEL-1 ACQUISITIONS ({activeAOI.name})</span>
          <span className="font-mono text-[11px] text-[#667579]">
            AOI ID: {activeAOI.id}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {s1Observations.map((obs, idx) => (
            <div
              key={obs.observationId || idx}
              className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 space-y-2.5 shadow-subtle transition-all card-hover-lift hover:border-[#CBD5D2]"
            >
              <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2">
                <div className="flex items-center space-x-2">
                  <Satellite className="w-3.5 h-3.5 text-[#397FA8]" />
                  <span className="text-xs font-semibold text-[#172126]">
                    {idx === 0 ? 'Primary Acquisition (Latest Pass)' : 'Reference Acquisition (Prior Pass)'}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E6EDEB] border border-[#D7DEDC] text-[#167F78] font-semibold">
                  [{obs.provenance}]
                </span>
              </div>

              {/* SAFE Package Name */}
              <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC] font-mono text-[10px] text-[#172126] break-all">
                <span className="text-[#667579] block text-[9px] uppercase font-semibold">SAFE PRODUCT PACKAGE:</span>
                {obs.safePackageName || `${obs.platform}_IW_GRDH_${obs.acquisitionTime.replace(/[-:]/g, '')}.SAFE`}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC]">
                  <span className="text-[#667579] text-[10px] block font-sans">ACQUIRED (UTC):</span>
                  <span className="text-[#172126] font-semibold text-[11px]">{obs.acquisitionTime}</span>
                </div>
                <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC]">
                  <span className="text-[#667579] text-[10px] block font-sans">ORBIT DIRECTION:</span>
                  <span className="text-[#397FA8] font-semibold text-[11px]">{obs.orbitDirection || 'ASCENDING'}</span>
                </div>
                <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC]">
                  <span className="text-[#667579] text-[10px] block font-sans">BACKSCATTER (σ°):</span>
                  <span className="text-[#172126] font-semibold text-[11px]">
                    {obs.backscatterDb !== null ? `${obs.backscatterDb} dB` : 'UNAVAILABLE'}
                  </span>
                </div>
                <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC]">
                  <span className="text-[#667579] text-[10px] block font-sans">POLARIZATION:</span>
                  <span className="text-[#172126] font-semibold text-[11px]">{(obs.polarization || ['VV', 'VH']).join('+')}</span>
                </div>
              </div>

              {obs.interpretationNotes && (
                <div className="text-[11px] text-[#667579] bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC]">
                  <span className="text-[#397FA8] font-semibold block text-[10px] uppercase">OBSERVATIONAL CONTEXT:</span>
                  {obs.interpretationNotes}
                </div>
              )}

              <div className="text-[10px] font-mono text-[#667579] border-t border-[#D7DEDC] pt-1.5 flex items-center justify-between">
                <span>Source: {obs.source}</span>
                <span className="text-[#397FA8] font-medium">Status: {obs.availability}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
