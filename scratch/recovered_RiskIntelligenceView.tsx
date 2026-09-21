import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  MapPin,
  Mountain,
  Activity,
  Shield,
  Eye,
  Info,
  Sliders,
  Sparkles,
  CloudRain,
  TrendingUp,
  Layers,
  AlertTriangle,
  Building2,
  RefreshCw,
  FileText,
  Compass,
  Crosshair,
  Maximize2,
  Cpu,
  Database,
  Navigation,
  CheckCircle2
} from 'lucide-react';
import { RiskZone, RiskAssessmentResult, AssessmentResult } from '../../types';
import { DataService } from '../../services/dataService';
import { ExecutiveReportModal } from '../reports/ExecutiveReportModal';

interface RiskIntelligenceViewProps {
  zones: RiskZone[];
  selectedZone: RiskZone;
  onSelectZone: (zone: RiskZone) => void;
  selectedState?: string;
}

export const RiskIntelligenceView: React.FC<RiskIntelligenceViewProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  selectedState = 'Sikkim'
}) => {
  const [riskResult, setRiskResult] = useState<RiskAssessmentResult | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  // Scenario Simulation States
  const [simRainfall1h, setSimRainfall1h] = useState<number>(22.4);
  const [simRainfall72h, setSimRainfall72h] = useState<number>(142.6);
  const [simSlope, setSimSlope] = useState<number>(38.5);
  const [simSoilMoisture, setSimSoilMoisture] = useState<number>(84.2);
  const [simHistory, setSimHistory] = useState<number>(6);
  const [simLithology, setSimLithology] = useState<string>('Daling Group Weathered Phyllite and Colluvial Debris');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeGeoLayer, setActiveGeoLayer] = useState<'susceptibility' | 'rainfall' | 'assets'>('susceptibility');
  const [selectedSpatialHotspot, setSelectedSpatialHotspot] = useState<string | null>('KM 42+200 Viaduct Sector');

  const fetchRiskAndDamage = async () => {
    setIsLoading(true);
    try {
      const [riskRes, dmgRes] = await Promise.all([
        DataService.getSikkimDemoRisk(),
        DataService.getSceneResult('sikkim-nh10-dikchu-sector')
      ]);
      setRiskResult(riskRes);
      setAssessmentResult(dmgRes);
    } catch (err) {
      console.error('Error loading risk data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskAndDamage();
  }, [selectedState]);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const res = await DataService.evaluateRisk({
        zoneId: selectedZone?.id || 'sikkim-teesta-zone-01',
        zoneName: selectedZone?.name || 'Dikchu - Singtam NH-10 Corridor',
        state: selectedState,
        rainfall_1h_mm: simRainfall1h,
        rainfall_72h_mm: simRainfall72h,
        slope_deg: simSlope,
        soil_moisture_pct: simSoilMoisture,
        historical_events_5y: simHistory,
        lithology: simLithology,
        observedDamage: riskResult?.observedDamageContext || undefined
      });
      setRiskResult(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
