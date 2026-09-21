import React, { useState, useEffect } from 'react';
import {
  Globe2,
  Activity,
  AlertTriangle,
  Navigation,
  ChevronRight,
  ChevronLeft,
  Layers,
  Shield,
  Clock,
  Sparkles,
  TrendingUp,
  X
} from 'lucide-react';
import { RiskZone, AssessmentResult, RiskAssessmentResult, VerificationActionRequest } from '../../types';
import { SyntheticEarthViewer } from '../map3d/SyntheticEarthViewer';
import { DataService } from '../../services/dataService';
import { SyntheticRiskEngine } from '../../data/synthetic/engine/syntheticRiskEngine';
import { NERegionCode } from '../../data/synthetic/types';

interface EarthExplorerViewProps {
  zones: RiskZone[];
  selectedZone: RiskZone;
  onSelectZone: (zone: RiskZone) => void;
  selectedState?: string;
  onSelectState?: (state: string) => void;
  timeOffset: number;
}

export const EarthExplorerView: React.FC<EarthExplorerViewProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  selectedState = 'Sikkim',
  onSelectState,
  timeOffset
}) => {
  const currentRegion: NERegionCode = selectedState?.toUpperCase() === 'ASSAM' ? 'ASSAM' : 'SIKKIM';
  const [activeTab, setActiveTab] = useState<'causes' | 'impact' | 'response'>('causes');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);

  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [riskResult, setRiskResult] = useState<RiskAssessmentResult | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dmg, risk] = await Promise.all([
          DataService.getSceneResult('sikkim-nh10-dikchu-sector'),
          DataService.getSikkimDemoRisk()
        ]);
        setAssessmentResult(dmg);
        setRiskResult(risk);
      } catch (err) {
        console.warn('Failed to load assessment data in EarthExplorerView:', err);
      }
    };
    loadData();
  }, []);

  const handleVerifyStructure = async (actionReq: VerificationActionRequest) => {
    try {
      const updated = await DataService.verifyStructure(actionReq);
      setAssessmentResult(updated);
      const updatedRisk = await DataService.getSikkimDemoRisk();
      setRiskResult(updatedRisk);
    } catch (err) {
      console.error('Verification error in EarthExplorerView:', err);
    }
  };

  const handleSelectRegion = (region: NERegionCode) => {
    if (onSelectState) {
      onSelectState(region === 'ASSAM' ? 'Assam' : 'Sikkim');
    }
  };

  const currentStateData = SyntheticRiskEngine.getStateData(currentRegion);
  const simulationState = SyntheticRiskEngine.calculateSimulationState(timeOffset, currentRegion);
  const isAssam = currentRegion === 'ASSAM';

  return (
    <div className="relative w-full h-full flex flex-col font-sans select-none overflow-hidden bg-[#11191D]">
      {/* Full-Screen Institutional Cesium 3D Digital Twin Viewer */}
      <div className="w-full h-full flex-1 relative">
        <SyntheticEarthViewer
          selectedRegion={currentRegion}
          onSelectRegion={handleSelectRegion}
          assessmentResult={assessmentResult}
          riskResult={riskResult}
          onVerifyStructure={handleVerifyStructure}
          timeOffset={timeOffset}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};
