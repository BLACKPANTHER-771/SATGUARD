import React, { useState, useEffect, useRef } from 'react';
import {
  Satellite,
  Radio,
  Activity,
  Layers,
  TrendingUp,
  MapPin,
  Compass,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Sliders,
  X,
  ChevronRight,
  ChevronLeft,
  Info,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Crosshair,
  Waves,
  ShieldAlert,
  ExternalLink,
  Grid,
  Cpu,
  Database,
  Server,
  Wifi,
  Zap,
  BarChart3,
  Box,
  Layers2,
  SplitSquareVertical,
  Columns,
  Mountain,
  Droplets,
  Shield,
  FileText,
  Upload,
  Building2,
  Check,
  HelpCircle,
  XCircle,
  Save,
  ArrowRight,
  Filter,
  Search
} from 'lucide-react';
import type {
  SatelliteObservation,
  Sentinel1Observation,
  Sentinel1PairAnalysis,
  ViewType,
  RiskZone,
  DamageClass,
  VerificationStatus,
  AssessmentResult,
  DetectedStructure,
  VerificationActionRequest,
  RiskAssessmentResult
} from '../../types/index.ts';
import { Sentinel1Service } from '../../services/sentinel1Service.ts';
import { DataService } from '../../services/dataService.ts';
import { getPrimaryAOIForState } from '../../data/command-centre/aoiRegistry.ts';
import { ExecutiveReportModal } from '../reports/ExecutiveReportModal.tsx';

interface SatelliteIntelligenceViewProps {
  observations?: SatelliteObservation[];
  selectedState?: string;
  onSelectView?: (view: ViewType) => void;
  selectedZone?: RiskZone | null;
  onSelectZone?: (zone: RiskZone) => void;
  zones?: RiskZone[];
}

interface SceneDatasetItem {
  id: number;
  code: string;
  sceneId: string;
  title: string;
  subtitle: string;
  datePre: string;
  datePost: string;
  sensor: string;
  productPre: string;
  productPost: string;
  imagePathPre: string;
  imagePathPost: string;
  type: 'PRE' | 'POST' | 'CHANGE' | 'SAR' | 'DAMAGE';
  mode: 'DEMO' | 'UPLOADED';
}

const OPERATIONAL_PROCESSING_STEPS = [
  '01 VALIDATING IMAGERY',
  '02 ALIGNING BITEMPORAL SCENES',
  '03 DETECTING CHANGE',
  '04 ANALYZING BUILT-UP / STRUCTURAL CHANGE',
  '05 EXTRACTING DAMAGE FEATURES',
  '06 CLASSIFYING DAMAGE',
  '07 CALCULATING CONFIDENCE',
  '08 ROUTING CASES FOR VERIFICATION',
  '09 PUBLISHING ASSESSMENT'
];

export const SatelliteIntelligenceView: React.FC<SatelliteIntelligenceViewProps> = ({
  observations = [],
  selectedState = 'Sikkim',
  onSelectView,
  selectedZone,
  onSelectZone,
  zones = []
}) => {
  const [s1Observations, setS1Observations] = useState<Sentinel1Observation[]>([]);
  const [pairAnalysis, setPairAnalysis] = useState<Sentinel1PairAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Authoritative Damage Assessment Result from Backend
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [riskResult, setRiskResult] = useState<RiskAssessmentResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [processingStepIndex, setProcessingStepIndex] = useState<number>(8); // Default: Step 9 Complete
  const [processingStatus, setProcessingStatus] = useState<string>('COMPLETE');
  const [inputError, setInputError] = useState<string | null>(null);

  // Active Viewing Mode: 'SIDE_BY_SIDE' (Default) | 'SWIPE_COMPARISON' | 'SINGLE_SCENE'
  const [viewMode, setViewMode] = useState<'SIDE_BY_SIDE' | 'SWIPE_COMPARISON' | 'SINGLE_SCENE'>('SIDE_BY_SIDE');
  const [activeSceneId, setActiveSceneId] = useState<number>(2);

  // Swipe slider position (0% to 100%)
  const [swipePosition, setSwipePosition] = useState<number>(50);
  const [isDraggingSwipe, setIsDraggingSwipe] = useState<boolean>(false);
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan state for Primary Observation Windows
  const [isSyncPan, setIsSyncPan] = useState<boolean>(true);
  const [zoomPre, setZoomPre] = useState<number>(1);
  const [zoomPost, setZoomPost] = useState<number>(1);
  const [panPre, setPanPre] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panPost, setPanPost] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Toggles for EO visualization layers
  const [showCrosshairs, setShowCrosshairs] = useState<boolean>(true);
  const [show3dStructuralLayer, setShow3dStructuralLayer] = useState<boolean>(true);
  const [showChangeMaskOverlay, setShowChangeMaskOverlay] = useState<boolean>(true);

  // Metadata inspector overlay states
  const [showMetadataPre, setShowMetadataPre] = useState<boolean>(false);
  const [showMetadataPost, setShowMetadataPost] = useState<boolean>(false);
  const [fullscreenPanel, setFullscreenPanel] = useState<'PRE' | 'POST' | 'SWIPE' | null>(null);

  // Verification & Inspection Drawers & Modals
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>('SK-CTG-BLD-01');
  const [isVerificationQueueOpen, setIsVerificationQueueOpen] = useState<boolean>(false);
  const [isExecutiveReportOpen, setIsExecutiveReportOpen] = useState<boolean>(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  // Search and filters for structure table
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterVerification, setFilterVerification] = useState<string>('ALL');

  // Custom Uploader State
  const [uploadBeforeFile, setUploadBeforeFile] = useState<File | null>(null);
  const [uploadAfterFile, setUploadAfterFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Drag tracking for pan
  const [isDraggingPre, setIsDraggingPre] = useState<boolean>(false);
  const [isDraggingPost, setIsDraggingPost] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });

  // Dynamic cursor coordinates (Center: Chungthang Basin 27.59814° N, 88.65060° E)
  const [cursorCoordPre, setCursorCoordPre] = useState<{ lat: number; lng: number }>({ lat: 27.59814, lng: 88.65060 });
  const [cursorCoordPost, setCursorCoordPost] = useState<{ lat: number; lng: number }>({ lat: 27.59814, lng: 88.65060 });

  // Authoritative AOI
  const activeAOI = getPrimaryAOIForState(selectedState);

  // Dataset of 5 Satellite Scenes
  const sceneDataset: SceneDatasetItem[] = [
    {
      id: 1,
      code: 'SCENE-01',
      sceneId: 'sikkim-nh10-dikchu-sector',
      title: 'Scene 01 — Pre-Disaster Baseline vs Post-GLOF',
      subtitle: 'Sentinel-2 L2A True Colour Baseline vs Post-Disaster',
      datePre: '28 AUG 2026 04:42 UTC',
      datePost: '03 SEP 2026 04:45 UTC',
      sensor: 'MSI Optical (B04, B03, B02)',
      productPre: 'Level-2A BOA Reflectance',
      productPost: 'Level-2A Surface Anomaly',
      imagePathPre: '/assets/satellite/scene_01_predisaster.jpg?v=4',
      imagePathPost: '/assets/satellite/scene_02_postdisaster.jpg?v=4',
      type: 'PRE',
      mode: 'DEMO'
    },
    {
      id: 2,
      code: 'SCENE-02',
      sceneId: 'sikkim-chungthang-basin',
      title: 'Scene 02 — Chungthang Settlement Footprints & Damage Scars',
      subtitle: 'Sentinel-2 L2A Chungthang Basin Post-Disaster Footprints vs Heatmap',
      datePre: '03 SEP 2026 04:45 UTC',
      datePost: '03 SEP 2026 04:45 UTC (Processed)',
      sensor: 'Sentinel-2 MSI (10m Resolution)',
      productPre: 'L2A True Colour (Monitored Footprints)',
      productPost: 'L2A True Colour (Damage Anomaly Heatmaps)',
      imagePathPre: '/assets/satellite/scene_02_pre.jpg?v=4',
      imagePathPost: '/assets/satellite/scene_02_post.jpg?v=4',
      type: 'POST',
      mode: 'DEMO'
    },
    {
      id: 3,
      code: 'SCENE-03',
      sceneId: 'sikkim-singtam-dikchu',
      title: 'Scene 03 — Singtam-Dikchu Basin Pre vs Post-Disaster',
      subtitle: 'AOI: Singtam-Dikchu | Pre vs Post-Disaster Footprint Delineation',
      datePre: '28 AUG 2026 04:42 UTC',
      datePost: '03 SEP 2026 04:45 UTC',
      sensor: 'Sentinel-2 MSI (10m Resolution)',
      productPre: 'L2A True Colour (Pre-Disaster)',
      productPost: 'L2A True Colour (Post-Disaster Delineation)',
      imagePathPre: '/assets/satellite/scene_03_pre.jpg?v=4',
      imagePathPost: '/assets/satellite/scene_03_post.jpg?v=5',
      type: 'CHANGE',
      mode: 'DEMO'
    },
    {
      id: 4,
      code: 'SCENE-04',
      sceneId: 'sikkim-sar-backscatter',
      title: 'Scene 04 — SAR Backscatter Intensity',
      subtitle: 'Sentinel-1 C-Band SAR Backscatter (dB)',
      datePre: '20 AUG 2026 12:18 UTC',
      datePost: '02 SEP 2026 12:18 UTC',
      sensor: 'Sentinel-1A C-band SAR (5.405 GHz)',
      productPre: 'Pre-Event Reference (IW GRD)',
      productPost: 'Post-Event Backscatter Intensity (dB)',
      imagePathPre: '/assets/satellite/scene_01_predisaster.jpg?v=4',
      imagePathPost: '/assets/satellite/scene_04_sar_backscatter.png?v=4',
      type: 'SAR',
      mode: 'DEMO'
    },
    {
      id: 5,
      code: 'SCENE-05',
      sceneId: 'sikkim-damage-ruins',
      title: 'Scene 05 — 4-Tier Structural Damage Assessment',
      subtitle: 'High-Res Damage Footprint & Ruin Assessment',
      datePre: '03 SEP 2026 04:45 UTC',
      datePost: '03 SEP 2026 04:45 UTC',
      sensor: 'MSI + InSAR Fusion',
      productPre: 'Detected Structural Footprints',
      productPost: '4-Tier Damage Classification Model',
      imagePathPre: '/assets/satellite/scene_02_pre.jpg?v=4',
      imagePathPost: '/assets/satellite/scene_05_damage_structures.jpg?v=4',
      type: 'DAMAGE',
      mode: 'DEMO'
    }
  ];

  const activeScene = sceneDataset.find(s => s.id === activeSceneId) || sceneDataset[1];

  // Fetch Authoritative Damage Assessment Result on Scene Change
  const fetchSceneAssessment = async (sceneIdToLoad: string) => {
    setIsLoading(true);
    setInputError(null);
    try {
      const [res, rsk] = await Promise.all([
        DataService.getSceneResult(sceneIdToLoad),
        DataService.getSikkimDemoRisk()
      ]);
      setAssessmentResult(res);
      setRiskResult(rsk);
      if (res.structures && res.structures.length > 0) {
        setSelectedStructureId(res.structures[0].structureId);
      }
    } catch (err) {
      console.warn('Error fetching scene assessment result:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSceneAssessment(activeScene.sceneId);
  }, [activeSceneId]);

  // Load InSAR Data
  useEffect(() => {
    const loadSentinelData = async () => {
      try {
        const s1Data = await Sentinel1Service.getObservationsForAOI(activeAOI.id, selectedState);
        setS1Observations(s1Data);
        if (s1Data && s1Data.length >= 2) {
          const analysis = Sentinel1Service.getPairAnalysis(s1Data[0], s1Data[1]);
          setPairAnalysis(analysis);
        }
      } catch (err) {
        console.warn('Error loading InSAR observations:', err);
      }
    };
    loadSentinelData();
  }, [selectedState, activeAOI.id]);

  // Launch Authoritative Damage Engine with Operational Sequence
  const handleLaunchDamageEngine = async () => {
    if (!activeScene.imagePathPre || !activeScene.imagePathPost) {
      setInputError('BITEMPORAL INPUT INCOMPLETE — Pre and Post satellite imagery required.');
      return;
    }

    setIsAnalyzing(true);
    setInputError(null);
    setProcessingStatus('ANALYZING');

    try {
      // Execute authoritative backend damage engine
      const result = await DataService.analyzeScene({
        sceneId: activeScene.sceneId,
        mode: activeScene.mode
      });

      setAssessmentResult(result);
      setProcessingStepIndex(8);
      setProcessingStatus('COMPLETE');

      if (result.structures && result.structures.length > 0) {
        setSelectedStructureId(result.structures[0].structureId);
      }
    } catch (err) {
      console.error('Damage Engine execution failed:', err);
      setInputError('Damage Engine execution error. Verify backend availability.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Authoritative Human Verification Action Handler
  const handleVerifyStructure = async (
    structureId: string,
    action: 'VERIFY' | 'REJECT' | 'NEEDS_REVIEW' | 'MODIFY_CLASSIFICATION',
    modifiedClass?: DamageClass
  ) => {
    if (!assessmentResult) return;
    setIsVerifying(true);
    try {
      const updated = await DataService.verifyStructure({
        sceneId: assessmentResult.sceneId,
        structureId,
        action,
        modifiedClass,
        notes: `Assessor verification action: ${action}`,
        assessorId: 'NDRF_EO_ASSESSOR_01'
      });
      setAssessmentResult(updated);
      setSaveSuccessToast(`Structure ${structureId} verified as ${action}`);
      setTimeout(() => setSaveSuccessToast(null), 3500);
    } catch (err) {
      console.error('Verification failed:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  // Save Current Assessment to Persistent Event History
  const handleSaveToHistory = async () => {
    if (!assessmentResult) return;
    try {
      await DataService.saveHistoricalEventRecord({
        eventId: assessmentResult.eventId,
        eventName: `${assessmentResult.sceneMetadata.title} (EO Assessment)`,
        location: assessmentResult.sceneMetadata.location.name,
        state: selectedState,
        district: assessmentResult.sceneMetadata.location.district,
        disasterType: 'GLOF / Heavy Inundation Event',
        eventDate: new Date().toISOString().split('T')[0],
        imagery: {
          beforeImageRef: activeScene.imagePathPre,
          afterImageRef: activeScene.imagePathPost,
          sensor: activeScene.sensor,
          acquisitionDates: `${activeScene.datePre} -> ${activeScene.datePost}`,
          resolution: '10m / High-Res GSD'
        },
        assessment: {
          totalStructures: assessmentResult.statistics.totalStructures,
          destroyedCount: assessmentResult.statistics.destroyedCount,
          majorDamageCount: assessmentResult.statistics.majorDamageCount,
          minorDamageCount: assessmentResult.statistics.minorDamageCount,
          noDamageCount: assessmentResult.statistics.noDamageCount,
          destroyedPercentage: assessmentResult.statistics.destroyedPercentage,
          majorDamagePercentage: assessmentResult.statistics.majorDamagePercentage,
          minorDamagePercentage: assessmentResult.statistics.minorDamagePercentage,
          noDamagePercentage: assessmentResult.statistics.noDamagePercentage,
          averageConfidence: assessmentResult.statistics.averageConfidence,
          changeScore: assessmentResult.changeDetection.changeScore,
          changedAreaM2: assessmentResult.changeDetection.changedAreaM2,
          changePercentage: assessmentResult.changeDetection.changePercentage,
          damagedFootprintAreaM2: assessmentResult.statistics.damagedFootprintAreaM2
        },
        verification: {
          verifiedCount: assessmentResult.statistics.verifiedCount,
          unverifiedCount: assessmentResult.statistics.unverifiedCount,
          needsReviewCount: assessmentResult.statistics.needsReviewCount,
          rejectedCount: 0,
          verificationProgressPct: Math.round(
            (assessmentResult.statistics.verifiedCount / (assessmentResult.statistics.totalStructures || 1)) * 100
          ),
          lastVerifiedAt: new Date().toISOString()
        },
        riskAssessment: {
          overallRiskScore: riskResult?.overallRiskScore || 84.7,
          riskLevel: riskResult?.riskLevel || 'CRITICAL',
          primaryFactor: 'Precipitation & Inundation Flow',
          secondaryFactor: 'Geomorphological Slope Angle',
          factorContributions: riskResult?.factorContributions || []
        },
        metadata: {
          engine: assessmentResult.processingMetadata.engine,
          version: assessmentResult.processingMetadata.version,
          mode: assessmentResult.mode,
          recordedAt: new Date().toISOString(),
          recordedBy: 'NDRF_EO_ASSESSOR_01'
        }
      });
      setSaveSuccessToast('Assessment committed to persistent History Store.');
      setTimeout(() => setSaveSuccessToast(null), 3500);
    } catch (err) {
      console.error('Save to history error:', err);
    }
  };

  // Custom Image Upload Execution
  const handleExecuteUploadedAssessment = async () => {
    if (!uploadBeforeFile || !uploadAfterFile) {
      setUploadError('Please select both Before and After satellite images.');
      return;
    }

    setUploadError(null);
    setIsAnalyzing(true);
    setIsUploaderOpen(false);

    try {
      const readerBefore = new FileReader();
      const readerAfter = new FileReader();

      const readAsDataURL = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(file);
        });

      const [b64Before, b64After] = await Promise.all([
        readAsDataURL(uploadBeforeFile),
        readAsDataURL(uploadAfterFile)
      ]);

      const uploadedResult = await DataService.analyzeScene({
        sceneId: `uploaded-${Date.now()}`,
        mode: 'UPLOADED',
        beforeImageBase64: b64Before,
        afterImageBase64: b64After
      });

      setAssessmentResult(uploadedResult);
      setSaveSuccessToast('Custom uploaded imagery assessed successfully.');
      setTimeout(() => setSaveSuccessToast(null), 3500);
    } catch (err) {
      setUploadError('INSUFFICIENT EVIDENCE FOR BUILDING-LEVEL ASSESSMENT: Unable to extract candidate footprints.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Zoom & Pan Handlers
  const handleZoom = (target: 'PRE' | 'POST' | 'BOTH', delta: number) => {
    if (target === 'PRE' || (isSyncPan && target === 'BOTH')) {
      setZoomPre(prev => Math.max(1, Math.min(4, prev + delta)));
    }
    if (target === 'POST' || (isSyncPan && target === 'BOTH')) {
      setZoomPost(prev => Math.max(1, Math.min(4, prev + delta)));
    }
  };

  const handleResetZoomPan = () => {
    setZoomPre(1);
    setZoomPost(1);
    setPanPre({ x: 0, y: 0 });
    setPanPost({ x: 0, y: 0 });
  };

  const handleMouseDown = (target: 'PRE' | 'POST', e: React.MouseEvent) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const currentPan = target === 'PRE' ? panPre : panPost;
    dragStartRef.current = { x: startX, y: startY, panX: currentPan.x, panY: currentPan.y };

    if (target === 'PRE') setIsDraggingPre(true);
    else setIsDraggingPost(true);
  };

  const handleMouseMove = (target: 'PRE' | 'POST', e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;

    const baseLat = 27.59814;
    const baseLng = 88.65060;
    const latSpan = 0.04;
    const lngSpan = 0.04;

    const currentLat = baseLat + (0.5 - relY) * latSpan;
    const currentLng = baseLng + (relX - 0.5) * lngSpan;

    if (target === 'PRE') {
      setCursorCoordPre({ lat: currentLat, lng: currentLng });
      if (isDraggingPre) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        const newPan = { x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy };
        setPanPre(newPan);
        if (isSyncPan) setPanPost(newPan);
      }
    } else {
      setCursorCoordPost({ lat: currentLat, lng: currentLng });
      if (isDraggingPost) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        const newPan = { x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy };
        setPanPost(newPan);
        if (isSyncPan) setPanPre(newPan);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDraggingPre(false);
    setIsDraggingPost(false);
  };

  const handleSwipeMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!swipeContainerRef.current) return;
    const rect = swipeContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSwipePosition(percent);
  };

  const getDamageBadgeStyle = (cls: DamageClass) => {
    switch (cls) {
      case 'DESTROYED':
        return { bg: 'bg-[#DC2626]', text: 'text-[#FAF8F1]', border: 'border-[#DC2626]', hex: '#DC2626', label: 'DESTROYED' };
      case 'MAJOR_DAMAGE':
        return { bg: 'bg-[#EA580C]', text: 'text-[#FAF8F1]', border: 'border-[#EA580C]', hex: '#EA580C', label: 'MAJOR DAMAGE' };
      case 'MINOR_DAMAGE':
        return { bg: 'bg-[#EAB308]', text: 'text-[#172126]', border: 'border-[#EAB308]', hex: '#EAB308', label: 'MINOR DAMAGE' };
      case 'NO_DAMAGE':
      default:
        return { bg: 'bg-[#10B981]', text: 'text-[#FAF8F1]', border: 'border-[#10B981]', hex: '#10B981', label: 'NO DAMAGE' };
    }
  };

  const getVerificationBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return { bg: 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/50', icon: Check, label: 'VERIFIED' };
      case 'REJECTED':
        return { bg: 'bg-[#DC2626]/20 text-[#DC2626] border-[#DC2626]/50', icon: XCircle, label: 'REJECTED' };
      case 'NEEDS_REVIEW':
        return { bg: 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/50', icon: HelpCircle, label: 'NEEDS REVIEW' };
      case 'UNVERIFIED':
      default:
        return { bg: 'bg-[#64748B]/20 text-[#94A3B8] border-[#64748B]/50', icon: AlertTriangle, label: 'UNVERIFIED' };
    }
  };

  // Authoritative structures from backend AssessmentResult
  const structuresList = assessmentResult?.structures || [];
  const stats = assessmentResult?.statistics;
  const changeMeta = assessmentResult?.changeDetection;

  // Filtered structures for search / table
  const filteredStructures = structuresList.filter(s => {
    const matchesSearch =
      s.structureId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSeverity = filterSeverity === 'ALL' || s.damageClass === filterSeverity;
    const matchesVerification = filterVerification === 'ALL' || s.verificationStatus === filterVerification;
    return matchesSearch && matchesSeverity && matchesVerification;
  });

  const unverifiedStructures = structuresList.filter(
    s => s.verificationStatus === 'UNVERIFIED' || s.verificationStatus === 'NEEDS_REVIEW' || s.confidence < 0.85
  );

  return (
    <div
      onMouseUp={handleMouseUp}
      className="h-full w-full bg-[#070D12] text-[#E2E8F0] flex flex-col font-sans select-none overflow-y-auto text-xs rounded-xl border border-[#1C2A35]"
    >
      {/* Toast Notification */}
      {saveSuccessToast && (
        <div className="fixed top-4 right-4 z-50 bg-[#0B1319] border border-[#10B981] text-[#10B981] px-4 py-2 rounded-lg shadow-2xl font-mono text-xs flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          <span>{saveSuccessToast}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. DATA PROVIDER / MISSION / SENSOR / ORBIT / AOI HEADER     */}
      {/* ============================================================ */}
      <header className="bg-[#0B1319] border-b border-[#1C2A35] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
        {/* Left: Authoritative Data Source Terminology */}
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded bg-[#167F78]/15 border border-[#167F78]/40 text-[#00E5FF]">
            <Satellite className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-xs text-[#FAF8F1] tracking-wider uppercase">
                COPERNICUS DATA SPACE ECOSYSTEM / SENTINEL EO
              </span>
              <span className="text-[10px] text-[#64748B] font-mono">|</span>
              <span className="font-mono text-[11px] text-[#38BDF8] font-semibold">
                {activeScene.title.split('—')[1]?.trim() || activeScene.title}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[10px] font-mono text-[#94A3B8] mt-0.5">
              <span>MISSION: <strong className="text-[#E2E8F0]">DISASTER ASSESSMENT</strong></span>
              <span>•</span>
              <span>PLATFORM: <strong className="text-[#E2E8F0]">SENTINEL-2</strong></span>
              <span>•</span>
              <span>PRODUCT: <strong className="text-[#10B981]">L2A</strong></span>
              <span>•</span>
              <span>SENSOR: <strong className="text-[#00E5FF]">{activeScene.sensor}</strong></span>
            </div>
          </div>
        </div>

        {/* Center: Live Pass Orbit Telemetry */}
        <div className="hidden lg:flex items-center space-x-2.5 bg-[#0E171E] px-3 py-1 rounded-md border border-[#1C2A35] font-mono text-[11px]">
          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          <span className="text-[#94A3B8]">CURRENT TRACK:</span>
          <span className="text-[#FAF8F1] font-bold">ORBIT 114-A (ASC)</span>
          <span className="text-[#64748B]">•</span>
          <span className="text-[#38BDF8]">27.5981° N, 88.6506° E</span>
          <span className="text-[#64748B]">•</span>
          <span className="text-[#10B981]">STATUS: {processingStatus}</span>
        </div>

        {/* Right: Explicit Synthetic Demo Badge & Action Routes */}
        <div className="flex items-center space-x-2 font-mono text-[10px]">
          <div className="flex items-center space-x-1.5 bg-[#0E171E] border border-[#F59E0B]/40 px-2 py-0.5 rounded text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
            <span className="text-[#F59E0B] font-bold">
              {activeScene.mode === 'DEMO' ? 'SYNTHETIC DEMONSTRATION DATA' : 'UPLOADED SCENE DATA'}
            </span>
          </div>

          <button
            onClick={() => setIsUploaderOpen(true)}
            className="px-2 py-1 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-[#E2E8F0] rounded transition-colors cursor-pointer flex items-center space-x-1"
            title="Upload Custom Before/After Satellite Images"
          >
            <Upload className="w-3 h-3 text-[#38BDF8]" />
            <span>Upload Scene</span>
          </button>

          <button
            onClick={handleSaveToHistory}
            className="px-2 py-1 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-[#E2E8F0] rounded transition-colors cursor-pointer flex items-center space-x-1"
            title="Persist authoritative assessment to History Store"
          >
            <Save className="w-3 h-3 text-[#10B981]" />
            <span>Save History</span>
          </button>

          <button
            onClick={() => setIsExecutiveReportOpen(true)}
            className="px-2 py-1 bg-[#167F78]/20 hover:bg-[#167F78]/40 border border-[#167F78]/50 text-[#00E5FF] rounded transition-colors cursor-pointer flex items-center space-x-1"
            title="Generate executive PDF report from authoritative result"
          >
            <FileText className="w-3 h-3" />
            <span>View Report</span>
          </button>

          {onSelectView && (
            <div className="flex items-center space-x-1 pl-1">
              <button
                onClick={() => onSelectView('risk_intelligence')}
                className="px-2 py-1 bg-[#F59E0B]/20 hover:bg-[#F59E0B]/40 border border-[#F59E0B]/50 text-[#FCD34D] rounded transition-colors cursor-pointer flex items-center space-x-1"
                title="Send observed damage context into Risk Intelligence Engine"
              >
                <span>Risk Matrix</span>
                <ChevronRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => onSelectView('command_center')}
                className="px-2 py-1 bg-[#3B82F6]/20 hover:bg-[#3B82F6]/40 border border-[#3B82F6]/50 text-[#93C5FD] rounded transition-colors cursor-pointer flex items-center space-x-1"
                title="Inspect affected structure cluster on 2D/3D Earth"
              >
                <span>2D/3D Map</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Input Error Warning */}
      {inputError && (
        <div className="bg-[#DC2626]/15 border-b border-[#DC2626]/40 px-4 py-1.5 flex items-center justify-between text-[#FCA5A5] font-mono text-[11px]">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
            <span>{inputError}</span>
          </div>
          <button onClick={() => setInputError(null)} className="text-[#FCA5A5] hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. OPERATIONAL 9-STEP DAMAGE ASSESSMENT PIPELINE EXECUTION   */}
      {/* ============================================================ */}
      <div className="bg-[#0B141B] border-b border-[#1C2A35] px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 font-mono text-[10px]">
        {/* Left: Execution Trigger & Status */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleLaunchDamageEngine}
            disabled={isAnalyzing}
            className={`px-3 py-1.5 rounded-md font-bold flex items-center space-x-1.5 shadow transition-all cursor-pointer ${
              isAnalyzing
                ? 'bg-[#1C2A35] text-[#94A3B8] border border-[#1C2A35]'
                : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white border border-[#DC2626]'
            }`}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00E5FF]" />
                <span>PROCESSING PIPELINE...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-yellow-300" />
                <span>LAUNCH DAMAGE ENGINE</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsVerificationQueueOpen(!isVerificationQueueOpen)}
            className={`px-2.5 py-1.5 rounded-md border flex items-center space-x-1.5 transition-colors cursor-pointer ${
              isVerificationQueueOpen
                ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#FCD34D]'
                : 'bg-[#0E171E] border-[#1C2A35] text-[#94A3B8] hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>HUMAN VERIFICATION QUEUE</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#F59E0B] text-black font-bold text-[9px]">
              {unverifiedStructures.length}
            </span>
          </button>
        </div>

        {/* Center: 9 Operational Step Progression Indicator */}
        <div className="hidden xl:flex items-center space-x-1 overflow-x-auto max-w-2xl py-0.5">
          {OPERATIONAL_PROCESSING_STEPS.map((stepName, idx) => {
            const isCurrent = isAnalyzing && processingStepIndex === idx;
            const isCompleted = processingStepIndex >= idx;

            return (
              <div
                key={stepName}
                className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[8px] font-semibold border ${
                  isCurrent
                    ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF] animate-pulse'
                    : isCompleted
                    ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
                    : 'bg-[#0E171E] border-[#1C2A35] text-[#64748B]'
                }`}
              >
                <span>{stepName}</span>
                {isCompleted && <Check className="w-2.5 h-2.5 text-[#10B981]" />}
              </div>
            );
          })}
        </div>

        {/* Right: Latency & Engine Version Metadata */}
        <div className="flex items-center space-x-2 text-[9px] text-[#64748B]">
          <span>ENGINE: <strong className="text-[#FAF8F1]">{assessmentResult?.processingMetadata?.engine || 'SatGuard v2.0'}</strong></span>
          <span>•</span>
          <span>LATENCY: <strong className="text-[#10B981]">{assessmentResult?.processingMetadata?.processingLatencyMs || 42} ms</strong></span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. MAIN IMAGERY AREA: PRE-DISASTER vs POST-DISASTER          */}
      {/* ============================================================ */}
      <div className="flex flex-col shrink-0">
        {/* Mode & Layer Control Strip */}
        <div className="bg-[#0A1015] border-b border-[#1C2A35] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
          {/* Left: View Mode Selector */}
          <div className="flex items-center space-x-1 bg-[#0E171E] p-0.5 rounded border border-[#1C2A35]">
            <button
              onClick={() => setViewMode('SIDE_BY_SIDE')}
              className={`px-2 py-1 rounded flex items-center space-x-1 transition-all cursor-pointer ${
                viewMode === 'SIDE_BY_SIDE'
                  ? 'bg-[#167F78] text-white font-bold shadow'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Side-by-Side Dual View</span>
            </button>
            <button
              onClick={() => setViewMode('SWIPE_COMPARISON')}
              className={`px-2 py-1 rounded flex items-center space-x-1 transition-all cursor-pointer ${
                viewMode === 'SWIPE_COMPARISON'
                  ? 'bg-[#167F78] text-white font-bold shadow'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <SplitSquareVertical className="w-3 h-3" />
              <span>Swipe Comparison Slider</span>
            </button>
          </div>

          {/* Center: Authoritative Data Flow */}
          <div className="hidden xl:flex items-center space-x-1.5 text-[#00E5FF]">
            <span className="bg-[#0E171E] px-1.5 py-0.5 rounded border border-[#1C2A35] text-[#FAF8F1]">
              SATELLITE IMAGE
            </span>
            <span className="text-[#64748B]">→</span>
            <span className="bg-[#0E171E] px-1.5 py-0.5 rounded border border-[#1C2A35] text-[#F59E0B]">
              DAMAGE ENGINE
            </span>
            <span className="text-[#64748B]">→</span>
            <span className="bg-[#0E171E] px-1.5 py-0.5 rounded border border-[#1C2A35] text-[#DC2626] font-bold">
              ASSESSED STRUCTURES
            </span>
            <span className="text-[#64748B]">→</span>
            <span className="bg-[#0E171E] px-1.5 py-0.5 rounded border border-[#1C2A35] text-[#10B981]">
              HUMAN VERIFICATION
            </span>
          </div>

          {/* Right: Layer Toggles */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShow3dStructuralLayer(!show3dStructuralLayer)}
              className={`px-2 py-1 rounded border transition-all cursor-pointer flex items-center space-x-1.5 ${
                show3dStructuralLayer
                  ? 'bg-[#DC2626]/20 border-[#DC2626] text-[#FCA5A5]'
                  : 'bg-[#0E171E] border-[#1C2A35] text-[#64748B]'
              }`}
            >
              <Box className="w-3 h-3" />
              <span>3D Structure Overlay</span>
            </button>

            <button
              onClick={() => setShowCrosshairs(!showCrosshairs)}
              className={`px-2 py-1 rounded border transition-all cursor-pointer flex items-center space-x-1.5 ${
                showCrosshairs
                  ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#38BDF8]'
                  : 'bg-[#0E171E] border-[#1C2A35] text-[#64748B]'
              }`}
            >
              <Crosshair className="w-3 h-3" />
              <span>Target Reticle</span>
            </button>

            <button
              onClick={handleResetZoomPan}
              className="p-1 rounded bg-[#0E171E] border border-[#1C2A35] text-[#94A3B8] hover:text-[#FAF8F1] transition-colors cursor-pointer"
              title="Reset Zoom & Pan"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* PRIMARY VIEWPORT: SIDE-BY-SIDE DUAL VIEW */}
        {viewMode === 'SIDE_BY_SIDE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 p-1.5 h-[420px] bg-[#070D12]">
            {/* ======================================================== */}
            {/* LEFT: PRE-DISASTER SATELLITE IMAGERY                     */}
            {/* ======================================================== */}
            <div
              className={`relative bg-[#091117] border border-[#1C2A35] rounded-lg overflow-hidden flex flex-col ${
                fullscreenPanel === 'PRE' ? 'fixed inset-4 z-50 shadow-2xl' : ''
              }`}
            >
              {/* Panel Header */}
              <div className="bg-[#0B141B]/95 border-b border-[#1C2A35] px-2.5 py-1 flex items-center justify-between z-10 font-mono text-[10px]">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <span className="font-bold text-[#FAF8F1]">{activeScene.code} — PRE / BASELINE</span>
                  <span className="text-[#64748B]">•</span>
                  <span className="text-[#38BDF8]">{activeScene.datePre}</span>
                  <span className="text-[#64748B]">•</span>
                  <span className="text-[#10B981]">{activeScene.productPre}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleZoom('PRE', 0.4)}
                    className="p-1 rounded bg-[#0E171E] border border-[#1C2A35] text-[#94A3B8] hover:text-[#FAF8F1] cursor-pointer"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleZoom('PRE', -0.4)}
                    className="p-1 rounded bg-[#0E171E] border border-[#1C2A35] text-[#94A3B8] hover:text-[#FAF8F1] cursor-pointer"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setShowMetadataPre(!showMetadataPre)}
                    className="p-1 rounded bg-[#0E171E] border border-[#1C2A35] text-[#94A3B8] hover:text-[#FAF8F1] cursor-pointer"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setFullscreenPanel(fullscreenPanel === 'PRE' ? null : 'PRE')}
                    className="p-1 rounded bg-[#0E171E] border border-[#1C2A35] text-[#94A3B8] hover:text-[#FAF8F1] cursor-pointer"
                  >
                    {fullscreenPanel === 'PRE' ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Canvas */}
              <div
                onMouseDown={(e) => handleMouseDown('PRE', e)}
                onMouseMove={(e) => handleMouseMove('PRE', e)}
                className={`flex-1 relative overflow-hidden flex items-center justify-center ${
                  zoomPre > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
                }`}
              >
                <img
                  src={activeScene.imagePathPre}
                  alt={`${activeScene.title} Pre`}
                  className="w-full h-full object-cover transition-transform duration-75"
                  style={{
                    transform: `translate(${panPre.x}px, ${panPre.y}px) scale(${zoomPre})`
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/assets/satellite/scene_01_predisaster.jpg';
                  }}
                />

                {/* Reticle */}
                {showCrosshairs && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                    <div className="relative w-16 h-16 border border-[#00E5FF]/40 rounded-full flex items-center justify-center">
                      <div className="absolute w-full h-[1px] bg-[#00E5FF]/50" />
                      <div className="absolute h-full w-[1px] bg-[#00E5FF]/50" />
                    </div>
                  </div>
                )}

                {/* Cursor Readout */}
                <div className="absolute bottom-2 right-2 bg-black/85 border border-[#1C2A35] px-2 py-0.5 rounded font-mono text-[9px] text-[#00E5FF] pointer-events-none">
                  {cursorCoordPre.lat.toFixed(5)}° N, {cursorCoordPre.lng.toFixed(5)}° E
                </div>
              </div>

              <div className="bg-[#0B141B] border-t border-[#1C2A35] px-2.5 py-0.5 flex items-center justify-between font-mono text-[9px] text-[#64748B]">
                <span>AOI: {activeScene.title.split('—')[1]?.trim() || activeScene.title}</span>
                <span className="text-[#10B981]">PRE-DISASTER REFERENCE BASELINE</span>
              </div>
            </div>

            {/* ======================================================== */}
            {/* RIGHT: POST-DISASTER SATELLITE IMAGERY                   */}
            {/* ======================================================== */}
            <div
              className={`relative bg-[#091117] border border-[#1C2A35] rounded-lg overflow-hidden flex flex-col ${
                fullscreenPanel === 'POST' ? 'fixed inset-4 z-50 shadow-2xl' : ''
              }`}
            >
              {/* Panel Header */}
              <div className="bg-[#0B141B]/95 border-b border-[#1C2A35] px-2.5 py-1 flex items-center justify-between z-10 font-mono text-[10px]">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" />
                  <span className="font-bold text-[#FAF8F1]">{activeScene.code} — POST / ANOMALY</span>
                  <span className="text-[#64748B]">•</span>
                  <span className="text-[#FCA5A5]">{activeScene.datePost}</span>
                  <span className="text-[#64748B]">•</span>
                  <span className="text-[#DC2626]">{activeScene.productPost}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleZoom('POST', 0.4)}
                    className="p-1 rounded bg-[#0E171E] border border-[#1C2A35] text-[#94A3B8] hover:text-[#FAF8F1] cursor-pointer"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleZoom('POST', -0.4)}
                    className="p-1 rounded bg-[#0E171E] border border-[#1C2A35] text-[#94A3B8] hover:text-[#FAF8F1] cursor-pointer"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setShowMetadataPost(!showMetadataPost)}
                    className="p-1 rounded bg-[#0E171E] border border-[#1C2A35] text-[#94A3B8] hover:text-[#FAF8F1] cursor-pointer"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setFullscreenPanel(fullscreenPanel === 'POST' ? null : 'POST')}
                    className="p-1 rounded bg-[#0E171E] border border-[#1C2A35] text-[#94A3B8] hover:text-[#FAF8F1] cursor-pointer"
                  >
                    {fullscreenPanel === 'POST' ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Canvas */}
              <div
                onMouseDown={(e) => handleMouseDown('POST', e)}
                onMouseMove={(e) => handleMouseMove('POST', e)}
                className={`flex-1 relative overflow-hidden flex items-center justify-center ${
                  zoomPost > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
                }`}
              >
                <img
                  src={activeScene.imagePathPost}
                  alt={`${activeScene.title} Post`}
                  className="w-full h-full object-cover transition-transform duration-75"
                  style={{
                    transform: `translate(${panPost.x}px, ${panPost.y}px) scale(${zoomPost})`
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/assets/satellite/scene_02_post.jpg';
                  }}
                />

                {/* Reticle */}
                {showCrosshairs && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                    <div className="relative w-16 h-16 border border-[#DC2626]/40 rounded-full flex items-center justify-center">
                      <div className="absolute w-full h-[1px] bg-[#DC2626]/50" />
                      <div className="absolute h-full w-[1px] bg-[#DC2626]/50" />
                    </div>
                  </div>
                )}

                {/* Cursor Readout */}
                <div className="absolute bottom-2 right-2 bg-black/85 border border-[#1C2A35] px-2 py-0.5 rounded font-mono text-[9px] text-[#DC2626] pointer-events-none">
                  {cursorCoordPost.lat.toFixed(5)}° N, {cursorCoordPost.lng.toFixed(5)}° E
                </div>
              </div>

              <div className="bg-[#0B141B] border-t border-[#1C2A35] px-2.5 py-0.5 flex items-center justify-between font-mono text-[9px] text-[#64748B]">
                <span>DAMAGE DETECTED: {stats?.destroyedCount || 0} DESTROYED / {stats?.majorDamageCount || 0} MAJOR</span>
                <span className="text-[#DC2626]">CONFIDENCE: {Math.round((stats?.averageConfidence || 0.88) * 100)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* PRIMARY VIEWPORT: DRAG/SWIPE COMPARISON SLIDER */}
        {viewMode === 'SWIPE_COMPARISON' && (
          <div className="p-1.5 h-[420px] bg-[#070D12]">
            <div
              ref={swipeContainerRef}
              onMouseMove={handleSwipeMove}
              onMouseDown={() => setIsDraggingSwipe(true)}
              onMouseUp={() => setIsDraggingSwipe(false)}
              className="relative w-full h-full bg-[#091117] border border-[#1C2A35] rounded-lg overflow-hidden select-none cursor-ew-resize"
            >
              {/* Layer Post-Disaster */}
              <img
                src={activeScene.imagePathPost}
                alt={`${activeScene.title} Post Layer`}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/assets/satellite/scene_02_post.jpg';
                }}
              />

              {/* Layer Pre-Disaster (Clipped) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${swipePosition}%` }}
              >
                <img
                  src={activeScene.imagePathPre}
                  alt={`${activeScene.title} Pre Layer`}
                  className="absolute inset-0 w-full h-full object-cover max-w-none"
                  style={{ width: swipeContainerRef.current?.clientWidth || '100%' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/assets/satellite/scene_01_predisaster.jpg';
                  }}
                />
              </div>

              {/* Swipe Dividing Line & Handle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-[#00E5FF] shadow-lg flex items-center justify-center pointer-events-none"
                style={{ left: `${swipePosition}%` }}
              >
                <div className="w-7 h-7 rounded-full bg-[#0B1319] border-2 border-[#00E5FF] flex items-center justify-center text-[10px] font-mono font-bold text-[#00E5FF] shadow-2xl">
                  ↔
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono font-bold text-[#10B981] border border-[#10B981]/40 pointer-events-none">
                PRE / BASE ({activeScene.datePre})
              </div>
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono font-bold text-[#DC2626] border border-[#DC2626]/40 pointer-events-none">
                POST / ANOMALY ({activeScene.datePost})
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCENE DATASET CAROUSEL BAR (SCENE-01 to SCENE-05)            */}
        {/* ============================================================ */}
        <div className="bg-[#0A1015] border-y border-[#1C2A35] px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 font-mono text-[10px]">
          <div className="flex items-center space-x-2">
            <span className="text-[#94A3B8] font-bold text-[9px] uppercase">
              SCENE DATASET:
            </span>
            <button
              onClick={() => setActiveSceneId(prev => (prev > 1 ? prev - 1 : 5))}
              className="p-1 rounded bg-[#0E171E] border border-[#1C2A35] text-[#94A3B8] hover:text-white cursor-pointer"
              title="Previous Scene"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[#00E5FF] font-bold">
              0{activeSceneId} / 05
            </span>
            <button
              onClick={() => setActiveSceneId(prev => (prev < 5 ? prev + 1 : 1))}
              className="p-1 rounded bg-[#0E171E] border border-[#1C2A35] text-[#94A3B8] hover:text-white cursor-pointer"
              title="Next Scene"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 5 Clickable Scene Buttons without broken image tags */}
          <div className="flex items-center space-x-2 overflow-x-auto py-0.5">
            {sceneDataset.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSceneId(s.id);
                  if (s.type === 'PRE' || s.type === 'POST' || s.type === 'CHANGE') setViewMode('SIDE_BY_SIDE');
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded border transition-all cursor-pointer ${
                  activeSceneId === s.id
                    ? 'bg-[#167F78]/30 border-[#00E5FF] text-[#FAF8F1] shadow'
                    : 'bg-[#0E171E] border-[#1C2A35] text-[#94A3B8] hover:text-white hover:border-[#64748B]'
                }`}
              >
                <div className="text-left">
                  <div className={`font-bold text-[10px] ${activeSceneId === s.id ? 'text-[#00E5FF]' : 'text-[#FAF8F1]'}`}>
                    {s.code}
                  </div>
                  <div className="text-[8px] text-[#94A3B8] whitespace-nowrap">
                    {s.title.split('—')[1]?.trim() || s.title}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center space-x-2 text-[9px] text-[#64748B]">
            <span>CORRIDOR: <strong className="text-[#FAF8F1]">SIKKIM NH-10 AXIS</strong></span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. DYNAMIC DAMAGE STATISTICS BAR (DERIVED FROM RESULT)       */}
        {/* ============================================================ */}
        <div className="p-2 bg-[#070D12] grid grid-cols-2 md:grid-cols-7 gap-1.5 font-mono text-[10px]">
          <div className="bg-[#0B1319] border border-[#1C2A35] rounded p-2 flex flex-col justify-between">
            <span className="text-[#94A3B8] text-[9px]">TOTAL STRUCTURES</span>
            <strong className="text-sm font-bold text-[#FAF8F1] mt-0.5">
              {stats?.totalStructures ?? structuresList.length}
            </strong>
          </div>

          <div className="bg-[#0B1319] border border-[#DC2626]/40 rounded p-2 flex flex-col justify-between bg-[#DC2626]/5">
            <span className="text-[#DC2626] font-bold text-[9px]">DESTROYED</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <strong className="text-sm font-bold text-[#DC2626]">{stats?.destroyedCount ?? 0}</strong>
              <span className="text-[9px] text-[#DC2626]/80 font-bold">
                ({stats?.destroyedPercentage?.toFixed(0) ?? 0}%)
              </span>
            </div>
          </div>

          <div className="bg-[#0B1319] border border-[#EA580C]/40 rounded p-2 flex flex-col justify-between bg-[#EA580C]/5">
            <span className="text-[#EA580C] font-bold text-[9px]">MAJOR DAMAGE</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <strong className="text-sm font-bold text-[#EA580C]">{stats?.majorDamageCount ?? 0}</strong>
              <span className="text-[9px] text-[#EA580C]/80 font-bold">
                ({stats?.majorDamagePercentage?.toFixed(0) ?? 0}%)
              </span>
            </div>
          </div>

          <div className="bg-[#0B1319] border border-[#EAB308]/40 rounded p-2 flex flex-col justify-between bg-[#EAB308]/5">
            <span className="text-[#EAB308] font-bold text-[9px]">MINOR DAMAGE</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <strong className="text-sm font-bold text-[#EAB308]">{stats?.minorDamageCount ?? 0}</strong>
              <span className="text-[9px] text-[#EAB308]/80 font-bold">
                ({stats?.minorDamagePercentage?.toFixed(0) ?? 0}%)
              </span>
            </div>
          </div>

          <div className="bg-[#0B1319] border border-[#10B981]/40 rounded p-2 flex flex-col justify-between bg-[#10B981]/5">
            <span className="text-[#10B981] font-bold text-[9px]">NO DAMAGE</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <strong className="text-sm font-bold text-[#10B981]">{stats?.noDamageCount ?? 0}</strong>
              <span className="text-[9px] text-[#10B981]/80 font-bold">
                ({stats?.noDamagePercentage?.toFixed(0) ?? 0}%)
              </span>
            </div>
          </div>

          <div className="bg-[#0B1319] border border-[#1C2A35] rounded p-2 flex flex-col justify-between">
            <span className="text-[#94A3B8] text-[9px]">AVG CONFIDENCE</span>
            <strong className="text-sm font-bold text-[#38BDF8] mt-0.5">
              {Math.round((stats?.averageConfidence || 0.88) * 100)}%
            </strong>
          </div>

          <div className="bg-[#0B1319] border border-[#F59E0B]/40 rounded p-2 flex flex-col justify-between bg-[#F59E0B]/5">
            <span className="text-[#F59E0B] font-bold text-[9px]">VERIFICATION REQ</span>
            <strong className="text-sm font-bold text-[#F59E0B] mt-0.5">
              {stats?.unverifiedCount ?? unverifiedStructures.length}
            </strong>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5. AUTHORITATIVE BUILDING-LEVEL ASSESSMENT REGISTER TABLE    */}
        {/* ============================================================ */}
        <div className="p-2 pt-0 bg-[#070D12]">
          <div className="bg-[#0B1319] border border-[#1C2A35] rounded-md overflow-hidden">
            {/* Table Header & Controls */}
            <div className="bg-[#0E171E] border-b border-[#1C2A35] p-2.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-[#00E5FF]" />
                <span className="font-bold text-[#FAF8F1] uppercase">
                  AUTHORITATIVE BUILDING DAMAGE REGISTER
                </span>
                <span className="px-1.5 py-0.2 rounded bg-[#070D12] text-[#94A3B8] border border-[#1C2A35] text-[9px]">
                  {activeScene.mode === 'DEMO' ? 'DEMO / SYNTHETIC STRUCTURE CANDIDATES' : 'UPLOADED PROPOSALS'}
                </span>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-2 text-[#64748B]" />
                  <input
                    type="text"
                    placeholder="Search structure..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#070D12] border border-[#1C2A35] rounded pl-6 pr-2 py-1 text-[10px] text-[#FAF8F1] focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="bg-[#070D12] border border-[#1C2A35] rounded px-2 py-1 text-[10px] text-[#FAF8F1] focus:outline-none focus:border-[#00E5FF]"
                >
                  <option value="ALL">All Severities</option>
                  <option value="DESTROYED">Destroyed</option>
                  <option value="MAJOR_DAMAGE">Major Damage</option>
                  <option value="MINOR_DAMAGE">Minor Damage</option>
                  <option value="NO_DAMAGE">No Damage</option>
                </select>

                <select
                  value={filterVerification}
                  onChange={(e) => setFilterVerification(e.target.value)}
                  className="bg-[#070D12] border border-[#1C2A35] rounded px-2 py-1 text-[10px] text-[#FAF8F1] focus:outline-none focus:border-[#00E5FF]"
                >
                  <option value="ALL">All Verification</option>
                  <option value="UNVERIFIED">Unverified</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="NEEDS_REVIEW">Needs Review</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            {/* Structure Rows */}
            <div className="max-h-64 overflow-y-auto divide-y divide-[#1C2A35] font-mono text-[10px]">
              {filteredStructures.length === 0 ? (
                <div className="p-4 text-center text-[#64748B]">
                  No structures matching search criteria.
                </div>
              ) : (
                filteredStructures.map((s) => {
                  const badge = getDamageBadgeStyle(s.damageClass);
                  const verBadge = getVerificationBadge(s.verificationStatus);
                  const isSelected = selectedStructureId === s.structureId;

                  return (
                    <div
                      key={s.structureId}
                      onClick={() => setSelectedStructureId(s.structureId)}
                      className={`p-2.5 flex flex-wrap items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#167F78]/15 border-l-2 border-[#00E5FF]' : 'hover:bg-[#0E171E]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-[#FAF8F1]">{s.structureId}</span>
                        <span className="text-[#94A3B8] text-[9px] max-w-xs truncate">{s.name}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Damage Class Badge */}
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] border ${badge.bg}/20 ${badge.border} ${badge.text}`}>
                          {badge.label}
                        </span>

                        {/* Confidence */}
                        <span className="text-[#38BDF8] text-[9px]">
                          CONF: <strong>{Math.round(s.confidence * (s.confidence > 1 ? 1 : 100))}%</strong>
                        </span>

                        {/* Change Score */}
                        <span className="text-[#F59E0B] text-[9px]">
                          Δ: <strong>{(s.structuralChangeScore ?? s.changeScore ?? 0).toFixed(2)}</strong>
                        </span>

                        {/* Footprint Area (Only when available) */}
                        {s.footprintAreaM2 && (
                          <span className="text-[#94A3B8] text-[9px]">
                            {s.footprintAreaM2.toFixed(0)} m²
                          </span>
                        )}

                        {/* Verification Badge */}
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${verBadge.bg}`}>
                          {verBadge.label}
                        </span>

                        {/* Verification Action Buttons */}
                        <div className="flex items-center space-x-1 pl-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerifyStructure(s.structureId, 'VERIFY');
                            }}
                            className="p-1 rounded bg-[#10B981]/20 hover:bg-[#10B981]/40 text-[#10B981] border border-[#10B981]/40"
                            title="Verify Structure Assessment"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerifyStructure(s.structureId, 'NEEDS_REVIEW');
                            }}
                            className="p-1 rounded bg-[#F59E0B]/20 hover:bg-[#F59E0B]/40 text-[#F59E0B] border border-[#F59E0B]/40"
                            title="Flag For Further Field Review"
                          >
                            <HelpCircle className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerifyStructure(s.structureId, 'REJECT');
                            }}
                            className="p-1 rounded bg-[#DC2626]/20 hover:bg-[#DC2626]/40 text-[#DC2626] border border-[#DC2626]/40"
                            title="Reject Damage Classification"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 6. RESTRAINED SCIENTIFIC EO ANALYTICAL PLOTS (ROW 1: 4 PLOTS)*/}
        {/* ============================================================ */}
        <div className="p-2 pt-0 bg-[#070D12] grid grid-cols-1 md:grid-cols-4 gap-2 font-mono text-[10px]">
          {/* PLOT 1: Spectral Reflectance Profile */}
          <div className="bg-[#0B1319] border border-[#1C2A35] rounded-md p-2 flex flex-col justify-between space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-[#64748B] uppercase font-bold">1. SPECTRAL REFLECTANCE PROFILE</span>
              <span className="text-[#38BDF8]">400–2400 nm</span>
            </div>
            <div className="h-20 w-full relative">
              <svg className="w-full h-full" viewBox="0 0 100 50">
                <line x1="10" y1="10" x2="95" y2="10" stroke="#1C2A35" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="10" y1="25" x2="95" y2="25" stroke="#1C2A35" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="10" y1="40" x2="95" y2="40" stroke="#1C2A35" strokeWidth="0.8" />
                <line x1="10" y1="5" x2="10" y2="40" stroke="#1C2A35" strokeWidth="0.8" />

                <polyline
                  points="10,36 25,34 40,32 55,12 75,20 95,28"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="1.5"
                />
                <polyline
                  points="10,32 25,28 40,24 55,27 75,18 95,14"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="1.5"
                  strokeDasharray="2,1"
                />
              </svg>
            </div>
            <div className="flex justify-between text-[8px] text-[#64748B]">
              <span>VIS (B2-B4)</span>
              <span className="text-[#10B981]">NIR (B8)</span>
              <span className="text-[#DC2626]">SWIR (B11-B12)</span>
            </div>
          </div>

          {/* PLOT 2: Change Magnitude Histogram */}
          <div className="bg-[#0B1319] border border-[#1C2A35] rounded-md p-2 flex flex-col justify-between space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-[#64748B] uppercase font-bold">2. CHANGE MAGNITUDE HISTOGRAM</span>
              <span className="text-[#F59E0B]">|ΔR| [0.0–1.0]</span>
            </div>
            <div className="h-20 w-full relative">
              <svg className="w-full h-full" viewBox="0 0 100 50">
                <line x1="10" y1="40" x2="95" y2="40" stroke="#1C2A35" strokeWidth="0.8" />
                <line x1="10" y1="5" x2="10" y2="40" stroke="#1C2A35" strokeWidth="0.8" />

                <rect x="14" y="32" width="14" height="8" fill="#167F78" opacity="0.8" />
                <rect x="30" y="24" width="14" height="16" fill="#EAB308" opacity="0.8" />
                <rect x="46" y="16" width="14" height="24" fill="#EA580C" opacity="0.8" />
                <rect x="62" y="10" width="14" height="30" fill="#F97316" opacity="0.8" />
                <rect x="78" y="6" width="14" height="34" fill="#DC2626" opacity="0.85" />

                <line x1="74" y1="5" x2="74" y2="40" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2,2" />
              </svg>
            </div>
            <div className="flex justify-between text-[8px] text-[#64748B]">
              <span>None</span>
              <span>Minor</span>
              <span>Mod</span>
              <span className="text-[#DC2626] font-bold">Severe (≥0.65)</span>
            </div>
          </div>

          {/* PLOT 3: SAR Backscatter Profile */}
          <div className="bg-[#0B1319] border border-[#1C2A35] rounded-md p-2 flex flex-col justify-between space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-[#64748B] uppercase font-bold">3. SAR BACKSCATTER PROFILE</span>
              <span className="text-[#00E5FF]">σ° (dB)</span>
            </div>
            <div className="h-20 w-full relative">
              <svg className="w-full h-full" viewBox="0 0 100 50">
                <line x1="10" y1="18" x2="95" y2="18" stroke="#1C2A35" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="10" y1="40" x2="95" y2="40" stroke="#1C2A35" strokeWidth="0.8" />
                <line x1="10" y1="5" x2="10" y2="40" stroke="#1C2A35" strokeWidth="0.8" />

                <polyline
                  points="10,18 25,19 45,18 65,19 75,34 95,35"
                  fill="none"
                  stroke="#00E5FF"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div className="flex justify-between text-[8px] text-[#64748B]">
              <span>15-AUG (-6 dB)</span>
              <span className="text-[#DC2626] font-bold">Δσ° = -11.4 dB</span>
              <span>03-SEP (-17.4 dB)</span>
            </div>
          </div>

          {/* PLOT 4: Damage Classification Matrix */}
          <div className="bg-[#0B1319] border border-[#1C2A35] rounded-md p-2 flex flex-col justify-between space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-[#64748B] uppercase font-bold">4. DAMAGE CLASSIFICATION MATRIX</span>
              <span className="text-[#FAF8F1]">10 MONITORED</span>
            </div>
            <div className="space-y-1 py-1">
              <div className="flex items-center justify-between text-[9px]">
                <span className="flex items-center space-x-1 text-[#DC2626]">
                  <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                  <span>DESTROYED</span>
                </span>
                <strong className="text-[#FAF8F1]">{stats?.destroyedCount ?? 2} ({stats?.destroyedPercentage?.toFixed(0) ?? 20}%)</strong>
              </div>
              <div className="flex items-center justify-between text-[9px]">
                <span className="flex items-center space-x-1 text-[#EA580C]">
                  <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
                  <span>MAJOR DAMAGE</span>
                </span>
                <strong className="text-[#FAF8F1]">{stats?.majorDamageCount ?? 3} ({stats?.majorDamagePercentage?.toFixed(0) ?? 30}%)</strong>
              </div>
              <div className="flex items-center justify-between text-[9px]">
                <span className="flex items-center space-x-1 text-[#EAB308]">
                  <span className="w-2 h-2 rounded-full bg-[#EAB308]" />
                  <span>MINOR DAMAGE</span>
                </span>
                <strong className="text-[#FAF8F1]">{stats?.minorDamageCount ?? 1} ({stats?.minorDamagePercentage?.toFixed(0) ?? 10}%)</strong>
              </div>
              <div className="flex items-center justify-between text-[9px]">
                <span className="flex items-center space-x-1 text-[#10B981]">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <span>NO DAMAGE</span>
                </span>
                <strong className="text-[#FAF8F1]">{stats?.noDamageCount ?? 4} ({stats?.noDamagePercentage?.toFixed(0) ?? 40}%)</strong>
              </div>
            </div>
            <div className="text-[8px] text-[#64748B] pt-0.5 flex justify-between">
              <span>MEAN CONF: <strong className="text-[#FAF8F1]">{Math.round((stats?.averageConfidence || 0.914) * 100)}%</strong></span>
              <span>AREA: <strong className="text-[#FAF8F1]">{stats?.damagedFootprintAreaM2 || 2840} m²</strong></span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 7. SECONDARY SCIENTIFIC ROW: LAND-COVER & TERRAIN/SOIL       */}
        {/* ============================================================ */}
        <div className="p-2 pt-0 bg-[#070D12] grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[10px]">
          {/* PLOT 5: Land-Cover Transition Graphic */}
          <div className="bg-[#0B1319] border border-[#1C2A35] rounded-md p-1.5 flex flex-col justify-between overflow-hidden shadow-lg">
            <div className="relative w-full h-[230px] rounded overflow-hidden bg-[#070D12] border border-[#1C2A35]/60 flex items-center justify-center">
              <img
                src="/assets/satellite/chart_land_cover_scene03.jpg"
                alt="Land-Cover Transition — Pre vs Post Event"
                className="w-full h-full object-contain bg-[#070D12]"
              />
            </div>
          </div>

          {/* PLOT 6: Terrain Elevation & Surface Moisture Profile Graphic */}
          <div className="bg-[#0B1319] border border-[#1C2A35] rounded-md p-1.5 flex flex-col justify-between overflow-hidden shadow-lg">
            <div className="relative w-full h-[230px] rounded overflow-hidden bg-[#070D12] border border-[#1C2A35]/60 flex items-center justify-center">
              <img
                src="/assets/satellite/chart_terrain_moisture_scene03.png"
                alt="Terrain Elevation & Surface Moisture Profile"
                className="w-full h-full object-contain bg-[#070D12]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 8. HUMAN VERIFICATION QUEUE DRAWER                           */}
      {/* ============================================================ */}
      {isVerificationQueueOpen && (
        <div className="fixed inset-y-0 right-0 w-96 bg-[#0B1319] border-l border-[#1C2A35] shadow-2xl z-50 p-4 flex flex-col justify-between font-mono text-[11px] animate-in slide-in-from-right-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#1C2A35] pb-2">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-[#F59E0B]" />
                <span className="font-bold text-[#FAF8F1] uppercase">
                  HUMAN VERIFICATION QUEUE ({unverifiedStructures.length})
                </span>
              </div>
              <button onClick={() => setIsVerificationQueueOpen(false)} className="text-[#64748B] hover:text-[#FAF8F1]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-[#94A3B8]">
              Review low-confidence and unverified structure anomalies. Assessor verification directly updates the authoritative AssessmentResult.
            </p>

            <div className="max-h-[70vh] overflow-y-auto space-y-2 pr-1">
              {unverifiedStructures.length === 0 ? (
                <div className="p-4 rounded bg-[#070D12] border border-[#1C2A35] text-center text-[#10B981]">
                  ✓ All structures verified in this sector.
                </div>
              ) : (
                unverifiedStructures.map((s) => {
                  const badge = getDamageBadgeStyle(s.damageClass);

                  return (
                    <div key={s.structureId} className="p-2.5 rounded bg-[#070D12] border border-[#1C2A35] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#FAF8F1]">{s.structureId}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${badge.bg}/20 ${badge.border} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#94A3B8]">{s.name}</div>
                      <div className="flex items-center justify-between text-[9px] text-[#64748B]">
                        <span>CONFIDENCE: <strong className="text-[#38BDF8]">{Math.round(s.confidence * (s.confidence > 1 ? 1 : 100))}%</strong></span>
                        <span>Δ: <strong className="text-[#F59E0B]">{(s.structuralChangeScore ?? s.changeScore ?? 0).toFixed(2)}</strong></span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-1">
                        <button
                          onClick={() => handleVerifyStructure(s.structureId, 'VERIFY')}
                          disabled={isVerifying}
                          className="px-2 py-1 rounded bg-[#10B981]/20 hover:bg-[#10B981]/40 text-[#10B981] border border-[#10B981]/40 font-bold text-[9px] transition-colors cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleVerifyStructure(s.structureId, 'NEEDS_REVIEW')}
                          disabled={isVerifying}
                          className="px-2 py-1 rounded bg-[#F59E0B]/20 hover:bg-[#F59E0B]/40 text-[#F59E0B] border border-[#F59E0B]/40 font-bold text-[9px] transition-colors cursor-pointer"
                        >
                          Review
                        </button>
                        <button
                          onClick={() => handleVerifyStructure(s.structureId, 'REJECT')}
                          disabled={isVerifying}
                          className="px-2 py-1 rounded bg-[#DC2626]/20 hover:bg-[#DC2626]/40 text-[#DC2626] border border-[#DC2626]/40 font-bold text-[9px] transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. CUSTOM IMAGE UPLOADER MODAL                               */}
      {/* ============================================================ */}
      {isUploaderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-mono text-[11px]">
          <div className="bg-[#0B1319] border border-[#1C2A35] rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1C2A35] pb-2">
              <div className="flex items-center space-x-2 text-[#00E5FF]">
                <Upload className="w-4 h-4" />
                <span className="font-bold text-[#FAF8F1] uppercase">UPLOAD BITEMPORAL SCENE</span>
              </div>
              <button onClick={() => setIsUploaderOpen(false)} className="text-[#64748B] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-2.5 rounded bg-[#DC2626]/15 border border-[#DC2626]/40 text-[#FCA5A5] text-[10px]">
                {uploadError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-[#94A3B8] font-bold block mb-1">
                  1. PRE-DISASTER BASELINE IMAGE (JPEG/PNG)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => setUploadBeforeFile(e.target.files?.[0] || null)}
                  className="w-full bg-[#070D12] border border-[#1C2A35] rounded p-2 text-[10px] text-[#FAF8F1]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#94A3B8] font-bold block mb-1">
                  2. POST-DISASTER ANOMALY IMAGE (JPEG/PNG)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => setUploadAfterFile(e.target.files?.[0] || null)}
                  className="w-full bg-[#070D12] border border-[#1C2A35] rounded p-2 text-[10px] text-[#FAF8F1]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#1C2A35]">
              <button
                onClick={() => setIsUploaderOpen(false)}
                className="px-3 py-1.5 rounded bg-[#1C2A35] hover:bg-[#334155] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteUploadedAssessment}
                className="px-3 py-1.5 rounded bg-[#00E5FF] hover:bg-[#00B4D8] text-[#070D12] font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <span>Run Assessment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 10. EXECUTIVE REPORT MODAL (CONSUMING AUTHORITATIVE RESULT)   */}
      {/* ============================================================ */}
      <ExecutiveReportModal
        isOpen={isExecutiveReportOpen}
        onClose={() => setIsExecutiveReportOpen(false)}
        assessmentResult={assessmentResult}
        riskResult={riskResult}
      />
    </div>
  );
};
export default SatelliteIntelligenceView;
