import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Sparkles,
  Sliders,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  MapPin,
  TrendingUp,
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Crosshair,
  FileSpreadsheet,
  ChevronDown,
  Cpu,
  Database,
  ExternalLink,
  ShieldAlert,
  Building,
  Check
} from 'lucide-react';
import {
  AssessmentResult,
  DetectedStructure,
  DamageClass,
  VerificationStatus,
  ViewType
} from '../../types';
import { DataService } from '../../services/dataService';

interface ChangeDetectionViewProps {
  onSelectView?: (view: ViewType) => void;
}

interface SceneOption {
  id: number;
  code: string;
  sceneId: string;
  title: string;
  subtitle: string;
  location: string;
  sensor: string;
  nativeResolution: string;
  demoResolution: string;
  datePre: string;
  datePost: string;
  imagePathPre: string;
  imagePathPost: string;
}

const DEMO_SCENES: SceneOption[] = [
  {
    id: 3,
    code: '03',
    sceneId: 'sikkim-singtam-dikchu',
    title: '03 — Singtam-Dikchu',
    subtitle: 'Singtam-Dikchu River Corridor & Settlement Basin',
    location: 'Sikkim, India',
    sensor: 'Sentinel-2 MSI',
    nativeResolution: '10 m',
    demoResolution: '0.5 m (Demo Imagery)',
    datePre: '2026-08-28',
    datePost: '2026-09-03',
    imagePathPre: '/assets/satellite/scene_03_pre.jpg?v=5',
    imagePathPost: '/assets/satellite/scene_03_post.jpg?v=5'
  },
  {
    id: 2,
    code: '02',
    sceneId: 'sikkim-chungthang-basin',
    title: '02 — Chungthang Basin',
    subtitle: 'Chungthang Teesta-III Dam Corridor & Settlement',
    location: 'Mangan, Sikkim',
    sensor: 'Sentinel-2 MSI',
    nativeResolution: '10 m',
    demoResolution: '0.5 m (Demo Imagery)',
    datePre: '2026-08-28',
    datePost: '2026-09-03',
    imagePathPre: '/assets/satellite/scene_02_pre.jpg?v=4',
    imagePathPost: '/assets/satellite/scene_02_post.jpg?v=4'
  },
  {
    id: 1,
    code: '01',
    sceneId: 'sikkim-nh10-dikchu-sector',
    title: '01 — Dikchu River Basin',
    subtitle: 'NH-10 Dikchu River Highway Corridor',
    location: 'Dikchu, Sikkim',
    sensor: 'Sentinel-2 MSI',
    nativeResolution: '10 m',
    demoResolution: '0.5 m (Demo Imagery)',
    datePre: '2026-08-14',
    datePost: '2026-09-02',
    imagePathPre: '/assets/satellite/scene_01_predisaster.jpg?v=4',
    imagePathPost: '/assets/satellite/scene_02_postdisaster.jpg?v=4'
  }
];

interface PipelineStep {
  name: string;
  status: 'Complete' | 'Processing' | 'Pending';
  time: string;
}

export const ChangeDetectionView: React.FC<ChangeDetectionViewProps> = ({ onSelectView }) => {
  // Scene Selection
  const [selectedSceneId, setSelectedSceneId] = useState<number>(3);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>('SK-SNG-BLD-01');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Viewer Controls & States
  const [viewMode, setViewMode] = useState<'SWIPE' | 'PRE' | 'POST'>('SWIPE');
  const [swipePosition, setSwipePosition] = useState<number>(50);
  const [isDraggingSwipe, setIsDraggingSwipe] = useState<boolean>(false);
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; startX: number; startY: number }>({ x: 0, y: 0, startX: 0, startY: 0 });

  // Map 2 Zoom & Pan (Change Map)
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [mapPan, setMapPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMapPanning, setIsMapPanning] = useState<boolean>(false);
  const mapPanStartRef = useRef<{ x: number; y: number; startX: number; startY: number }>({ x: 0, y: 0, startX: 0, startY: 0 });

  // Layer Toggles matching reference image
  const [toggleChangeMask, setToggleChangeMask] = useState<boolean>(true);
  const [toggleBuiltUpChange, setToggleBuiltUpChange] = useState<boolean>(true);
  const [toggleStructuralChange, setToggleStructuralChange] = useState<boolean>(true);
  const [toggleRoadChange, setToggleRoadChange] = useState<boolean>(false);
  const [toggleTerrainChange, setToggleTerrainChange] = useState<boolean>(false);

  // Analysis & Pipeline States
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activePipelineStage, setActivePipelineStage] = useState<number>(7); // 0-7

  const activeScene = DEMO_SCENES.find(s => s.id === selectedSceneId) || DEMO_SCENES[0];

  // Pipeline steps - initially Pending until Analyze Changes is executed
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([
    { name: 'Scene Validation', status: 'Pending', time: '-' },
    { name: 'Image Alignment', status: 'Pending', time: '-' },
    { name: 'Change Detection', status: 'Pending', time: '-' },
    { name: 'Built-up Analysis', status: 'Pending', time: '-' },
    { name: 'Structural Analysis', status: 'Pending', time: '-' },
    { name: 'Change Mask', status: 'Pending', time: '-' },
    { name: 'Damage Engine', status: 'Pending', time: '-' }
  ]);

  // Fetch Authoritative Result from DataService
  const fetchResult = async (sceneIdToLoad: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await DataService.getSceneResult(sceneIdToLoad);
      if (!res) {
        throw new Error('Scene assessment data is currently unavailable.');
      }
      setAssessmentResult(res);
      if (res.structures && res.structures.length > 0) {
        setSelectedStructureId(res.structures[0].structureId);
      }
    } catch (err: any) {
      console.error('Error fetching change detection result:', err);
      setErrorMessage(err?.message || 'Unable to load bitemporal satellite data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Reset pipeline steps to Pending when switching scenes
    setPipelineSteps([
      { name: 'Scene Validation', status: 'Pending', time: '-' },
      { name: 'Image Alignment', status: 'Pending', time: '-' },
      { name: 'Change Detection', status: 'Pending', time: '-' },
      { name: 'Built-up Analysis', status: 'Pending', time: '-' },
      { name: 'Structural Analysis', status: 'Pending', time: '-' },
      { name: 'Change Mask', status: 'Pending', time: '-' },
      { name: 'Damage Engine', status: 'Pending', time: '-' }
    ]);
    fetchResult(activeScene.sceneId);
  }, [selectedSceneId]);

  // Run Step-by-Step Analysis Simulation
  const handleAnalyzeChanges = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    const stepTimings = [
      { name: 'Scene Validation', delay: 400, time: '00:00' },
      { name: 'Image Alignment', delay: 600, time: '00:02' },
      { name: 'Change Detection', delay: 700, time: '00:04' },
      { name: 'Built-up Analysis', delay: 600, time: '00:06' },
      { name: 'Structural Analysis', delay: 700, time: '00:08' },
      { name: 'Change Mask', delay: 500, time: '00:10' },
      { name: 'Damage Engine', delay: 600, time: '00:12' }
    ];

    // Reset pipeline to pending at the start of analysis
    setPipelineSteps(stepTimings.map(s => ({ name: s.name, status: 'Pending', time: '-' })));

    for (let i = 0; i < stepTimings.length; i++) {
      setActivePipelineStage(i);
      setPipelineSteps(prev =>
        prev.map((step, idx) => {
          if (idx < i) return { ...step, status: 'Complete', time: stepTimings[idx].time };
          if (idx === i) return { ...step, status: 'Processing', time: stepTimings[idx].time };
          return { ...step, status: 'Pending', time: '-' };
        })
      );
      await new Promise(r => setTimeout(r, stepTimings[i].delay));
    }

    // Mark all complete only when the full pipeline analysis run is finished
    setPipelineSteps(stepTimings.map(s => ({ name: s.name, status: 'Complete', time: s.time })));
    await fetchResult(activeScene.sceneId);
    setIsAnalyzing(false);
    setActivePipelineStage(stepTimings.length);
  };

  const handleResetControls = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setMapZoom(1);
    setMapPan({ x: 0, y: 0 });
    setSwipePosition(50);
    setViewMode('SWIPE');
    setToggleChangeMask(true);
    setToggleBuiltUpChange(true);
    setToggleStructuralChange(true);
    setToggleRoadChange(false);
    setToggleTerrainChange(false);
    setPipelineSteps([
      { name: 'Scene Validation', status: 'Pending', time: '-' },
      { name: 'Image Alignment', status: 'Pending', time: '-' },
      { name: 'Change Detection', status: 'Pending', time: '-' },
      { name: 'Built-up Analysis', status: 'Pending', time: '-' },
      { name: 'Structural Analysis', status: 'Pending', time: '-' },
      { name: 'Change Mask', status: 'Pending', time: '-' },
      { name: 'Damage Engine', status: 'Pending', time: '-' }
    ]);
  };

  // Swipe Mouse Handlers
  const handleSwipeMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSwipe || !swipeContainerRef.current) return;
    const rect = swipeContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSwipePosition(percent);
  };

  // Pan Handlers for Bitemporal Viewer
  const handleMouseDownPan = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, startX: panOffset.x, startY: panOffset.y };
  };

  const handleMouseMovePan = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPanOffset({ x: panStartRef.current.startX + dx, y: panStartRef.current.startY + dy });
  };

  const handleMouseUpPan = () => {
    setIsPanning(false);
  };

  // Pan Handlers for Change Map
  const handleMouseDownMapPan = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsMapPanning(true);
    mapPanStartRef.current = { x: e.clientX, y: e.clientY, startX: mapPan.x, startY: mapPan.y };
  };

  const handleMouseMoveMapPan = (e: React.MouseEvent) => {
    if (!isMapPanning) return;
    const dx = e.clientX - mapPanStartRef.current.x;
    const dy = e.clientY - mapPanStartRef.current.y;
    setMapPan({ x: mapPanStartRef.current.startX + dx, y: mapPanStartRef.current.startY + dy });
  };

  const handleMouseUpMapPan = () => {
    setIsMapPanning(false);
  };

  // Error / Insufficient Evidence View
  if (errorMessage && !assessmentResult) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#071018] text-[#EF4444] font-mono p-4">
        <div className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-[#0C1E2C] border border-[#EF4444]/40 shadow-2xl max-w-md text-center">
          <AlertTriangle className="w-8 h-8 text-[#EF4444]" />
          <span className="text-xs tracking-wider uppercase font-semibold text-[#F0F6FC]">
            INSUFFICIENT EVIDENCE / SENSOR DROPOUT
          </span>
          <span className="text-[11px] text-[#94A3B8]">
            {errorMessage}
          </span>
          <button
            onClick={() => fetchResult(activeScene.sceneId)}
            className="px-3 py-1.5 rounded bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold font-sans flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Analysis</span>
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !assessmentResult) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#071018] text-[#38BDF8] font-mono">
        <div className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-[#0C1E2C] border border-[#162E44] shadow-2xl">
          <RefreshCw className="w-8 h-8 animate-spin text-[#38BDF8]" />
          <span className="text-xs tracking-wider uppercase font-semibold text-[#F0F6FC]">
            LOADING AUTHORITATIVE CHANGE DETECTION WORKSTATION...
          </span>
          <span className="text-[10px] text-[#94A3B8]">
            Ingesting bitemporal satellite data for {activeScene.title}
          </span>
        </div>
      </div>
    );
  }

  const change = assessmentResult.changeDetection;
  const stats = assessmentResult.statistics;
  const structures = assessmentResult.structures || [];

  // Dynamic calculations from authoritative assessment
  const totalAnalyzedAreaKm2 = +(stats.totalFootprintAreaM2 > 0 ? (stats.totalFootprintAreaM2 * 4.2 / 1000000).toFixed(2) : 2.48);
  const changedAreaKm2 = +(change.changedAreaM2 > 0 ? (change.changedAreaM2 / 1000000).toFixed(2) : (totalAnalyzedAreaKm2 * change.changePercentage / 100).toFixed(2));
  const changePct = +(change.changePercentage || 14.5).toFixed(1);
  const unchangedPct = +(100 - changePct).toFixed(1);

  const affectedStructuresCount = (stats.destroyedCount || 0) + (stats.majorDamageCount || 0) + (stats.minorDamageCount || 0);
  const majorChangeCount = (stats.destroyedCount || 0) + (stats.majorDamageCount || 0);
  const minorChangeCount = stats.minorDamageCount || 0;
  const avgConfidencePct = +(stats.averageConfidence ? stats.averageConfidence * 100 : 87.3).toFixed(1);
  const builtUpAreaChangeKm2 = +(changedAreaKm2 * 0.61).toFixed(2);
  const builtUpAreaChangePct = +((builtUpAreaChangeKm2 / totalAnalyzedAreaKm2) * 100).toFixed(1);

  // Status Badge Helper
  const getStatusBadge = (cls: DamageClass) => {
    switch (cls) {
      case 'DESTROYED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF4444] text-white shadow-sm">Destroyed</span>;
      case 'MAJOR_DAMAGE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F97316] text-white shadow-sm">Major Damage</span>;
      case 'MINOR_DAMAGE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B] text-white shadow-sm">Minor Damage</span>;
      case 'NO_DAMAGE':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981] text-white shadow-sm">No Damage</span>;
    }
  };

  const getStructuralChangeLabel = (score: number) => {
    if (score >= 0.60) return 'High';
    if (score >= 0.25) return 'Medium';
    return 'Low';
  };

  // Histogram Bins calculation
  const binCounts = [0, 0, 0, 0, 0];
  structures.forEach(s => {
    const score = s.changeScore || 0;
    if (score < 0.2) binCounts[0]++;
    else if (score < 0.4) binCounts[1]++;
    else if (score < 0.6) binCounts[2]++;
    else if (score < 0.8) binCounts[3]++;
    else binCounts[4]++;
  });

  return (
    <div className="h-full w-full bg-[#071018] text-[#F0F6FC] font-sans select-none overflow-y-auto overflow-x-hidden p-2.5 space-y-2.5">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & METADATA BAR                                              */}
      {/* ========================================================================= */}
      <div className="bg-[#0C1E2C] border border-[#162E44] rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div>
          <h1 className="text-sm font-bold tracking-wide text-[#F0F6FC] flex items-center space-x-2">
            <span>Change Detection Dashboard</span>
          </h1>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">
            Bitemporal analysis to detect changes, assess damage and generate actionable intelligence.
          </p>
        </div>

        {/* Scene Info Strip */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
          {/* Scene Selector Dropdown */}
          <div className="flex items-center space-x-1 bg-[#102436] px-2 py-1 rounded border border-[#1B3A54]">
            <span className="text-[#64748B]">Scene:</span>
            <select
              value={selectedSceneId}
              onChange={(e) => setSelectedSceneId(Number(e.target.value))}
              className="bg-transparent text-[#38BDF8] font-bold focus:outline-none cursor-pointer text-[10px]"
            >
              {DEMO_SCENES.map(sc => (
                <option key={sc.id} value={sc.id} className="bg-[#0C1E2C] text-[#F0F6FC]">
                  {sc.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1 bg-[#102436] px-2 py-1 rounded border border-[#1B3A54]">
            <span className="text-[#64748B]">Location:</span>
            <span className="text-[#F0F6FC] font-semibold">{activeScene.location}</span>
          </div>

          <div className="flex items-center space-x-1 bg-[#102436] px-2 py-1 rounded border border-[#1B3A54]">
            <span className="text-[#64748B]">Sensor:</span>
            <span className="text-[#F0F6FC] font-semibold">{activeScene.sensor}</span>
          </div>

          <div className="flex items-center space-x-1 bg-[#102436] px-2 py-1 rounded border border-[#1B3A54]">
            <span className="text-[#64748B]">Resolution:</span>
            <span className="text-[#F0F6FC] font-semibold">{activeScene.nativeResolution}</span>
          </div>

          <div className="flex items-center space-x-1 bg-[#102436] px-2 py-1 rounded border border-[#1B3A54]">
            <span className="text-[#64748B]">Pre:</span>
            <span className="text-[#38BDF8] font-semibold">{activeScene.datePre}</span>
          </div>

          <div className="flex items-center space-x-1 bg-[#102436] px-2 py-1 rounded border border-[#1B3A54]">
            <span className="text-[#64748B]">Post:</span>
            <span className="text-[#F87171] font-semibold">{activeScene.datePost}</span>
          </div>

          {/* Demonstration Badge */}
          <div className="px-2 py-0.5 rounded bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] font-bold text-[9px]">
            SYNTHETIC DEMONSTRATION
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP GRID: BITEMPORAL VIEWER + CONTROLS + STATISTICS                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Left: Bitemporal Viewer (6 cols) */}
        <div className="lg:col-span-6 bg-[#0C1E2C] border border-[#162E44] rounded-lg p-2.5 flex flex-col space-y-2 shadow-md">
          {/* Header Controls */}
          <div className="flex items-center justify-between border-b border-[#162E44] pb-1.5">
            <h2 className="text-xs font-bold text-[#F0F6FC]">Bitemporal Viewer</h2>

            <div className="flex items-center space-x-2 text-[10px] font-mono">
              <div className="flex items-center bg-[#102436] p-0.5 rounded border border-[#1B3A54]">
                <button
                  onClick={() => setViewMode('PRE')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    viewMode === 'PRE' ? 'bg-[#38BDF8] text-[#071018] font-bold' : 'text-[#94A3B8] hover:text-[#F0F6FC]'
                  }`}
                >
                  Pre
                </button>
                <button
                  onClick={() => setViewMode('POST')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    viewMode === 'POST' ? 'bg-[#38BDF8] text-[#071018] font-bold' : 'text-[#94A3B8] hover:text-[#F0F6FC]'
                  }`}
                >
                  Post
                </button>
              </div>

              {/* Swipe Compare Switch */}
              <div className="flex items-center space-x-1.5 bg-[#102436] px-2 py-0.5 rounded border border-[#1B3A54]">
                <span className="text-[#94A3B8]">Swipe Compare</span>
                <button
                  onClick={() => setViewMode(viewMode === 'SWIPE' ? 'POST' : 'SWIPE')}
                  className={`w-7 h-3.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                    viewMode === 'SWIPE' ? 'bg-[#38BDF8]' : 'bg-[#1E3A52]'
                  }`}
                >
                  <div
                    className={`bg-white w-2.5 h-2.5 rounded-full shadow-md transform transition-transform ${
                      viewMode === 'SWIPE' ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Canvas Viewport */}
          <div
            ref={swipeContainerRef}
            onMouseMove={handleSwipeMove}
            onMouseDown={() => {
              if (viewMode === 'SWIPE') setIsDraggingSwipe(true);
            }}
            onMouseUp={() => setIsDraggingSwipe(false)}
            onMouseLeave={() => setIsDraggingSwipe(false)}
            className="relative w-full h-64 bg-[#071018] rounded-md overflow-hidden border border-[#162E44] select-none cursor-crosshair"
          >
            {/* Layer A: Post-Disaster Image */}
            {(viewMode === 'SWIPE' || viewMode === 'POST') && (
              <img
                src={activeScene.imagePathPost}
                alt="Post-Disaster"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
                }}
              />
            )}

            {/* Layer B: Pre-Disaster Image (Clipped if in SWIPE mode) */}
            {(viewMode === 'SWIPE' || viewMode === 'PRE') && (
              <div
                className={`absolute inset-y-0 left-0 overflow-hidden pointer-events-none ${
                  viewMode === 'SWIPE' ? 'border-r-2 border-[#38BDF8] shadow-2xl' : 'w-full'
                }`}
                style={{ width: viewMode === 'SWIPE' ? `${swipePosition}%` : '100%' }}
              >
                <img
                  src={activeScene.imagePathPre}
                  alt="Pre-Disaster"
                  className="absolute inset-0 w-full h-full object-cover max-w-none transition-transform duration-75"
                  style={{
                    width: swipeContainerRef.current ? `${swipeContainerRef.current.clientWidth}px` : '100%',
                    height: '100%',
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
                  }}
                />
              </div>
            )}

            {/* Swipe Handle Indicator */}
            {viewMode === 'SWIPE' && (
              <div
                className="absolute inset-y-0 flex items-center justify-center pointer-events-none"
                style={{ left: `${swipePosition}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-6 h-6 rounded-full bg-[#0C1E2C] border-2 border-[#38BDF8] shadow-xl flex items-center justify-center text-[9px] text-[#38BDF8] font-bold">
                  ‹›
                </div>
              </div>
            )}

            {/* Floating Zoom & Pan Controls on Left */}
            <div className="absolute top-2 left-2 flex flex-col space-y-1 z-10">
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.3, 3.0))}
                className="w-6 h-6 rounded bg-[#0C1E2C]/90 border border-[#1B3A54] text-[#F0F6FC] hover:bg-[#38BDF8] hover:text-[#071018] flex items-center justify-center cursor-pointer text-xs"
                title="Zoom In"
              >
                +
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.3, 1.0))}
                className="w-6 h-6 rounded bg-[#0C1E2C]/90 border border-[#1B3A54] text-[#F0F6FC] hover:bg-[#38BDF8] hover:text-[#071018] flex items-center justify-center cursor-pointer text-xs"
                title="Zoom Out"
              >
                -
              </button>
              <button
                onClick={() => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}
                className="w-6 h-6 rounded bg-[#0C1E2C]/90 border border-[#1B3A54] text-[#F0F6FC] hover:bg-[#38BDF8] hover:text-[#071018] flex items-center justify-center cursor-pointer"
                title="Reset View"
              >
                <Crosshair className="w-3 h-3" />
              </button>
            </div>

            {/* HUD Overlay Badges */}
            <div className="absolute top-2 left-10 bg-[#0C1E2C]/90 border border-[#1B3A54] px-2 py-0.5 rounded text-[9px] font-mono text-[#38BDF8] font-semibold backdrop-blur-sm pointer-events-none">
              PRE-DISASTER ({activeScene.datePre})
            </div>

            <div className="absolute top-2 right-2 bg-[#0C1E2C]/90 border border-[#1B3A54] px-2 py-0.5 rounded text-[9px] font-mono text-[#F87171] font-semibold backdrop-blur-sm pointer-events-none">
              POST-DISASTER ({activeScene.datePost})
            </div>

            {/* Scale Bar */}
            <div className="absolute bottom-2 left-2 bg-[#0C1E2C]/80 border border-[#1B3A54] px-1.5 py-0.5 rounded text-[8px] font-mono text-[#94A3B8] flex items-center space-x-1">
              <div className="w-8 h-1 bg-[#38BDF8]" />
              <span>100 m</span>
            </div>
          </div>
        </div>

        {/* Center: Change Detection Controls (3 cols) */}
        <div className="lg:col-span-3 bg-[#0C1E2C] border border-[#162E44] rounded-lg p-2.5 flex flex-col justify-between shadow-md">
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-[#F0F6FC] border-b border-[#162E44] pb-1.5">
              Change Detection Controls
            </h2>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleAnalyzeChanges}
                disabled={isAnalyzing}
                className="flex-1 bg-[#0284C7] hover:bg-[#0369A1] text-white py-1.5 px-2 rounded text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isAnalyzing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>{isAnalyzing ? 'Processing...' : 'Analyze Changes'}</span>
              </button>

              <button
                onClick={handleResetControls}
                className="p-1.5 rounded bg-[#102436] hover:bg-[#1B3A54] border border-[#1B3A54] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                title="Reset All Layers & Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Layer Toggles List */}
            <div className="space-y-1.5 pt-1 text-xs">
              {/* Toggle 1: Change Mask */}
              <div className="flex items-center justify-between py-1 px-1.5 rounded bg-[#102436]/60 border border-[#1B3A54]/50">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                  <span className="text-[11px] text-[#F0F6FC]">Change Mask</span>
                </div>
                <button
                  onClick={() => setToggleChangeMask(!toggleChangeMask)}
                  className={`w-7 h-3.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                    toggleChangeMask ? 'bg-[#38BDF8]' : 'bg-[#1E3A52]'
                  }`}
                >
                  <div className={`bg-white w-2.5 h-2.5 rounded-full transform transition-transform ${toggleChangeMask ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Toggle 2: Built-up Change */}
              <div className="flex items-center justify-between py-1 px-1.5 rounded bg-[#102436]/60 border border-[#1B3A54]/50">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <span className="text-[11px] text-[#F0F6FC]">Built-up Change</span>
                </div>
                <button
                  onClick={() => setToggleBuiltUpChange(!toggleBuiltUpChange)}
                  className={`w-7 h-3.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                    toggleBuiltUpChange ? 'bg-[#10B981]' : 'bg-[#1E3A52]'
                  }`}
                >
                  <div className={`bg-white w-2.5 h-2.5 rounded-full transform transition-transform ${toggleBuiltUpChange ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Toggle 3: Structural Change */}
              <div className="flex items-center justify-between py-1 px-1.5 rounded bg-[#102436]/60 border border-[#1B3A54]/50">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                  <span className="text-[11px] text-[#F0F6FC]">Structural Change</span>
                </div>
                <button
                  onClick={() => setToggleStructuralChange(!toggleStructuralChange)}
                  className={`w-7 h-3.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                    toggleStructuralChange ? 'bg-[#F97316]' : 'bg-[#1E3A52]'
                  }`}
                >
                  <div className={`bg-white w-2.5 h-2.5 rounded-full transform transition-transform ${toggleStructuralChange ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Toggle 4: Road/Infrastructure Change */}
              <div className="flex items-center justify-between py-1 px-1.5 rounded bg-[#102436]/60 border border-[#1B3A54]/50">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                  <span className="text-[11px] text-[#F0F6FC]">Road/Infrastructure</span>
                </div>
                <button
                  onClick={() => setToggleRoadChange(!toggleRoadChange)}
                  className={`w-7 h-3.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                    toggleRoadChange ? 'bg-[#38BDF8]' : 'bg-[#1E3A52]'
                  }`}
                >
                  <div className={`bg-white w-2.5 h-2.5 rounded-full transform transition-transform ${toggleRoadChange ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Toggle 5: Terrain/Surface Change */}
              <div className="flex items-center justify-between py-1 px-1.5 rounded bg-[#102436]/60 border border-[#1B3A54]/50">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#64748B]" />
                  <span className="text-[11px] text-[#F0F6FC]">Terrain/Surface Change</span>
                </div>
                <button
                  onClick={() => setToggleTerrainChange(!toggleTerrainChange)}
                  className={`w-7 h-3.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                    toggleTerrainChange ? 'bg-[#64748B]' : 'bg-[#1E3A52]'
                  }`}
                >
                  <div className={`bg-white w-2.5 h-2.5 rounded-full transform transition-transform ${toggleTerrainChange ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Change Statistics (3 cols) */}
        <div className="lg:col-span-3 bg-[#0C1E2C] border border-[#162E44] rounded-lg p-2.5 flex flex-col justify-between shadow-md">
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-[#F0F6FC] border-b border-[#162E44] pb-1.5">
              Change Statistics
            </h2>

            {/* 3 Main Stat Cards */}
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-[#102436] p-1.5 rounded border border-[#1B3A54] text-center">
                <span className="text-[9px] text-[#94A3B8] block">Total Analyzed</span>
                <span className="text-xs font-bold text-[#F0F6FC]">{totalAnalyzedAreaKm2} <span className="text-[9px] font-normal">km²</span></span>
              </div>

              <div className="bg-[#102436] p-1.5 rounded border border-[#1B3A54] text-center">
                <span className="text-[9px] text-[#94A3B8] block">Changed Area</span>
                <span className="text-xs font-bold text-[#F87171]">{changedAreaKm2} <span className="text-[9px] font-normal">km²</span></span>
              </div>

              <div className="bg-[#102436] p-1.5 rounded border border-[#1B3A54] text-center">
                <span className="text-[9px] text-[#94A3B8] block">Change %</span>
                <span className="text-xs font-bold text-[#F59E0B]">{changePct}%</span>
              </div>
            </div>

            {/* Detailed Metric Rows */}
            <div className="space-y-1.5 pt-1 text-[11px] font-mono">
              <div className="flex items-center justify-between border-b border-[#162E44]/60 pb-1">
                <span className="text-[#94A3B8] flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] mr-1.5" />
                  Built-up Area Change
                </span>
                <span className="text-[#F0F6FC] font-semibold">{builtUpAreaChangeKm2} km² ({builtUpAreaChangePct}%)</span>
              </div>

              <div className="flex items-center justify-between border-b border-[#162E44]/60 pb-1">
                <span className="text-[#94A3B8] flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] mr-1.5" />
                  Structures Affected
                </span>
                <span className="text-[#F87171] font-semibold">{affectedStructuresCount} / {stats.totalStructures || 10}</span>
              </div>

              <div className="flex items-center justify-between border-b border-[#162E44]/60 pb-1">
                <span className="text-[#94A3B8] flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] mr-1.5" />
                  Major Change Count
                </span>
                <span className="text-[#F97316] font-semibold">{majorChangeCount}</span>
              </div>

              <div className="flex items-center justify-between border-b border-[#162E44]/60 pb-1">
                <span className="text-[#94A3B8] flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mr-1.5" />
                  Minor Change Count
                </span>
                <span className="text-[#F59E0B] font-semibold">{minorChangeCount}</span>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[#94A3B8] flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] mr-1.5" />
                  Confidence (Avg.)
                </span>
                <span className="text-[#38BDF8] font-semibold">{avgConfidencePct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MIDDLE GRID: CHANGE MAP + PROCESSING PIPELINE                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Left: Change Map (8 cols) */}
        <div className="lg:col-span-8 bg-[#0C1E2C] border border-[#162E44] rounded-lg p-2.5 flex flex-col space-y-2 shadow-md">
          {/* Header with Severity Legends */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#162E44] pb-1.5">
            <h2 className="text-xs font-bold text-[#F0F6FC]">Change Map</h2>

            {/* Legend */}
            <div className="flex items-center space-x-3 text-[10px] font-mono">
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#475569]" />
                <span className="text-[#94A3B8]">Unchanged</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" />
                <span className="text-[#F59E0B]">Minor</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#F97316]" />
                <span className="text-[#F97316]">Moderate</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />
                <span className="text-[#EF4444]">Major</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#A855F7]" />
                <span className="text-[#A855F7]">Severe</span>
              </div>
            </div>
          </div>

          {/* Change Map Canvas */}
          <div
            onMouseDown={handleMouseDownMapPan}
            onMouseMove={handleMouseMoveMapPan}
            onMouseUp={handleMouseUpMapPan}
            className="relative w-full h-80 bg-[#071018] rounded-md overflow-hidden border border-[#162E44] cursor-grab active:cursor-grabbing select-none"
          >
            {/* Base Satellite Image (Post Disaster with Contour) */}
            <img
              src={activeScene.imagePathPost}
              alt="Change Map Baseline"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-75"
              style={{
                transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`
              }}
            />

            {/* Structural Footprint Highlights Layer */}
            {toggleStructuralChange && (
              <div
                className="absolute inset-0 pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`
                }}
              >
                {/* SVG Polygons for structures */}
                <svg className="w-full h-full absolute inset-0">
                  {structures.map((s, idx) => {
                    const isSelected = selectedStructureId === s.structureId;
                    const changeScore = s.changeScore || 0;
                    const color =
                      changeScore >= 0.65
                        ? '#A855F7'
                        : changeScore >= 0.40
                        ? '#EF4444'
                        : changeScore >= 0.25
                        ? '#F97316'
                        : changeScore >= 0.15
                        ? '#F59E0B'
                        : '#475569';

                    // Normalized bbox positions
                    const bbox = s.geometry.bbox || [200 + idx * 50, 100 + (idx % 3) * 40, 30, 20];
                    const cx = (bbox[0] / 1024) * 100;
                    const cy = (bbox[1] / 560) * 100;
                    const w = (bbox[2] / 1024) * 100;
                    const h = (bbox[3] / 560) * 100;

                    return (
                      <g key={s.structureId}>
                        <rect
                          x={`${cx}%`}
                          y={`${cy}%`}
                          width={`${Math.max(w, 2.5)}%`}
                          height={`${Math.max(h, 2.5)}%`}
                          fill={color}
                          fillOpacity={0.45}
                          stroke={color}
                          strokeWidth={isSelected ? 2 : 1}
                          strokeDasharray={isSelected ? '2,2' : undefined}
                          className="transition-all"
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            {/* Map Zoom Controls */}
            <div className="absolute top-2 left-2 flex flex-col space-y-1 z-10">
              <button
                onClick={() => setMapZoom(prev => Math.min(prev + 0.3, 3.0))}
                className="w-6 h-6 rounded bg-[#0C1E2C]/90 border border-[#1B3A54] text-[#F0F6FC] hover:bg-[#38BDF8] hover:text-[#071018] flex items-center justify-center cursor-pointer text-xs"
                title="Zoom In"
              >
                +
              </button>
              <button
                onClick={() => setMapZoom(prev => Math.max(prev - 0.3, 1.0))}
                className="w-6 h-6 rounded bg-[#0C1E2C]/90 border border-[#1B3A54] text-[#F0F6FC] hover:bg-[#38BDF8] hover:text-[#071018] flex items-center justify-center cursor-pointer text-xs"
                title="Zoom Out"
              >
                -
              </button>
              <button
                onClick={() => { setMapZoom(1); setMapPan({ x: 0, y: 0 }); }}
                className="w-6 h-6 rounded bg-[#0C1E2C]/90 border border-[#1B3A54] text-[#F0F6FC] hover:bg-[#38BDF8] hover:text-[#071018] flex items-center justify-center cursor-pointer"
                title="Reset View"
              >
                <Crosshair className="w-3 h-3" />
              </button>
            </div>

            {/* Top Right Inset Minimap */}
            <div className="absolute top-2 right-2 w-28 h-20 bg-[#0C1E2C]/95 border border-[#1B3A54] rounded overflow-hidden shadow-lg pointer-events-none">
              <img
                src={activeScene.imagePathPre}
                alt="Minimap"
                className="w-full h-full object-cover opacity-70"
              />
              <div className="absolute inset-4 border border-[#38BDF8] bg-[#38BDF8]/20" />
            </div>

            {/* Change Mask Summary Card Overlay (Donut Chart) */}
            <div className="absolute bottom-2 right-2 bg-[#0C1E2C]/95 border border-[#1B3A54] rounded-lg p-2.5 shadow-2xl backdrop-blur-md w-44 font-sans pointer-events-auto">
              <h4 className="text-[10px] font-bold text-[#F0F6FC] mb-1.5 border-b border-[#162E44] pb-1">
                Change Mask Summary
              </h4>

              <div className="flex items-center space-x-2">
                {/* Donut SVG */}
                <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    {/* Background Circle */}
                    <path
                      className="text-[#1E3A52]"
                      strokeWidth="4.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Changed Arc */}
                    <path
                      className="text-[#EF4444]"
                      strokeDasharray={`${changePct}, 100`}
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold text-[#F0F6FC] leading-none">{changePct}%</span>
                    <span className="text-[7px] text-[#94A3B8]">Changed</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-1 text-[9px] font-mono">
                  <div className="flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                    <span className="text-[#94A3B8]">Changed:</span>
                    <span className="text-[#F0F6FC] font-semibold">{changePct}%</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#475569]" />
                    <span className="text-[#94A3B8]">Unchanged:</span>
                    <span className="text-[#F0F6FC] font-semibold">{unchangedPct}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Left Scale Bar */}
            <div className="absolute bottom-2 left-2 bg-[#0C1E2C]/80 border border-[#1B3A54] px-1.5 py-0.5 rounded text-[8px] font-mono text-[#94A3B8] flex items-center space-x-1">
              <div className="w-8 h-1 bg-[#38BDF8]" />
              <span>100 m</span>
            </div>
          </div>
        </div>

        {/* Right: Processing Pipeline (4 cols) */}
        <div className="lg:col-span-4 bg-[#0C1E2C] border border-[#162E44] rounded-lg p-2.5 flex flex-col justify-between shadow-md">
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-[#F0F6FC] border-b border-[#162E44] pb-1.5">
              Processing Pipeline
            </h2>

            {/* Pipeline Stage List */}
            <div className="space-y-1.5 pt-0.5 font-mono text-[11px]">
              {pipelineSteps.map((step, idx) => (
                <div
                  key={step.name}
                  className={`flex items-center justify-between p-1.5 rounded border transition-colors ${
                    step.status === 'Processing'
                      ? 'bg-[#0284C7]/20 border-[#0284C7] text-[#38BDF8]'
                      : step.status === 'Complete'
                      ? 'bg-[#102436]/50 border-[#1B3A54]/60 text-[#F0F6FC]'
                      : 'bg-[#071018]/30 border-transparent text-[#64748B]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {step.status === 'Complete' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    ) : step.status === 'Processing' ? (
                      <RefreshCw className="w-3.5 h-3.5 text-[#38BDF8] animate-spin" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-[#475569] flex items-center justify-center text-[8px]">
                        ○
                      </div>
                    )}
                    <span className="font-medium text-[10px]">{step.name}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-[9px]">
                    <span
                      className={`font-semibold ${
                        step.status === 'Complete'
                          ? 'text-[#10B981]'
                          : step.status === 'Processing'
                          ? 'text-[#38BDF8]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      {step.status}
                    </span>
                    <span className="text-[#64748B] w-8 text-right">{step.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM GRID: CHANGE ANALYSIS + STRUCTURE TABLE + INTEGRATION           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Left: Change Analysis (5 cols) - 3 Sub-Charts */}
        <div className="lg:col-span-5 bg-[#0C1E2C] border border-[#162E44] rounded-lg p-2.5 flex flex-col space-y-2 shadow-md">
          <h2 className="text-xs font-bold text-[#F0F6FC] border-b border-[#162E44] pb-1.5">
            Change Analysis
          </h2>

          <div className="grid grid-cols-3 gap-2">
            {/* Chart 1: Change Magnitude Histogram */}
            <div className="bg-[#102436] p-2 rounded border border-[#1B3A54] flex flex-col justify-between">
              <span className="text-[9px] font-bold text-[#94A3B8] block mb-1">
                Change Magnitude Histogram
              </span>
              <div className="h-20 flex items-end justify-between px-1 pt-2 space-x-1">
                {[
                  { label: '0.0', count: Math.max(binCounts[0], 2), color: '#38BDF8' },
                  { label: '0.2', count: Math.max(binCounts[1], 4), color: '#0284C7' },
                  { label: '0.4', count: Math.max(binCounts[2], 3), color: '#F59E0B' },
                  { label: '0.6', count: Math.max(binCounts[3], 2), color: '#F97316' },
                  { label: '0.8', count: Math.max(binCounts[4], 1), color: '#EF4444' },
                  { label: '1.0', count: 1, color: '#A855F7' }
                ].map(b => (
                  <div key={b.label} className="flex-1 flex flex-col items-center space-y-0.5">
                    <div
                      className="w-full rounded-t transition-all"
                      style={{ height: `${b.count * 12}px`, backgroundColor: b.color }}
                    />
                    <span className="text-[7px] font-mono text-[#64748B]">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Spectral Difference (Pre vs Post) */}
            <div className="bg-[#102436] p-2 rounded border border-[#1B3A54] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-bold text-[#94A3B8]">Spectral Difference</span>
                <div className="flex items-center space-x-1.5 text-[8px] font-mono">
                  <span className="text-[#38BDF8]">● Pre</span>
                  <span className="text-[#F97316]">● Post</span>
                </div>
              </div>
              <div className="h-20 relative flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 100 60">
                  {/* Pre line */}
                  <polyline
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="1.5"
                    points="5,45 15,35 25,40 35,25 45,30 55,20 65,22 75,10 85,35 95,40"
                  />
                  {/* Post line */}
                  <polyline
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="1.5"
                    points="5,50 15,40 25,45 35,32 45,42 55,30 65,34 75,15 85,42 95,48"
                  />
                  {/* Bands text */}
                  <text x="5" y="58" fill="#64748B" fontSize="6">B1</text>
                  <text x="25" y="58" fill="#64748B" fontSize="6">B3</text>
                  <text x="50" y="58" fill="#64748B" fontSize="6">B6</text>
                  <text x="75" y="58" fill="#64748B" fontSize="6">B8A</text>
                  <text x="90" y="58" fill="#64748B" fontSize="6">B12</text>
                </svg>
              </div>
            </div>

            {/* Chart 3: Built-up Change Comparison */}
            <div className="bg-[#102436] p-2 rounded border border-[#1B3A54] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-bold text-[#94A3B8]">Land Cover Shift</span>
                <div className="flex items-center space-x-1.5 text-[8px] font-mono">
                  <span className="text-[#38BDF8]">● Pre</span>
                  <span className="text-[#F97316]">● Post</span>
                </div>
              </div>
              <div className="h-20 flex items-end justify-between px-1 pt-1 space-x-1.5">
                {[
                  { name: 'Built-up', pre: 42, post: 28 },
                  { name: 'Veg', pre: 50, post: 32 },
                  { name: 'Soil', pre: 15, post: 28 },
                  { name: 'Water', pre: 10, post: 24 }
                ].map(lc => (
                  <div key={lc.name} className="flex-1 flex flex-col items-center space-y-0.5">
                    <div className="w-full flex items-end space-x-0.5 h-14">
                      <div className="w-1/2 bg-[#38BDF8] rounded-t" style={{ height: `${lc.pre}px` }} />
                      <div className="w-1/2 bg-[#F97316] rounded-t" style={{ height: `${lc.post}px` }} />
                    </div>
                    <span className="text-[7px] font-mono text-[#64748B] truncate">{lc.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Structure Change Table (4 cols) */}
        <div className="lg:col-span-4 bg-[#0C1E2C] border border-[#162E44] rounded-lg p-2.5 flex flex-col space-y-1.5 shadow-md">
          <div className="flex items-center justify-between border-b border-[#162E44] pb-1.5">
            <h2 className="text-xs font-bold text-[#F0F6FC]">Structure Change Table</h2>
            <span className="text-[9px] font-mono text-[#38BDF8] cursor-pointer hover:underline">
              {structures.length} Detected
            </span>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto max-h-36 pr-0.5">
            <table className="w-full text-left border-collapse text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#162E44] text-[#64748B] uppercase bg-[#102436]/40">
                  <th className="py-1 px-1">ID</th>
                  <th className="py-1 px-1">Change Score</th>
                  <th className="py-1 px-1">Structural Change</th>
                  <th className="py-1 px-1">Status</th>
                  <th className="py-1 px-1">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162E44]/50">
                {structures.map((s) => {
                  const isSelected = selectedStructureId === s.structureId;
                  const score = s.changeScore || 0;
                  const confPct = Math.round((s.confidence || 0.88) * 100);

                  return (
                    <tr
                      key={s.structureId}
                      onClick={() => setSelectedStructureId(s.structureId)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#102436] font-bold text-white'
                          : 'hover:bg-[#102436]/50 text-[#94A3B8]'
                      }`}
                    >
                      <td className="py-1 px-1 text-[#38BDF8] font-bold">{s.structureId}</td>
                      <td className="py-1 px-1">{score.toFixed(2)}</td>
                      <td className="py-1 px-1">{getStructuralChangeLabel(score)}</td>
                      <td className="py-1 px-1">{getStatusBadge(s.damageClass)}</td>
                      <td className="py-1 px-1 text-[#F0F6FC]">{confPct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Integration & Next Steps (3 cols) */}
        <div className="lg:col-span-3 bg-[#0C1E2C] border border-[#162E44] rounded-lg p-2.5 flex flex-col justify-between space-y-2 shadow-md">
          <div>
            <h2 className="text-xs font-bold text-[#F0F6FC] border-b border-[#162E44] pb-1.5 mb-2">
              Integration & Next Steps
            </h2>

            {/* Pipeline Output Flow Pills */}
            <div className="space-y-1 text-[10px] font-mono">
              <div className="flex items-center space-x-1.5 p-1 rounded bg-[#102436] border border-[#1B3A54] text-[#10B981]">
                <Check className="w-3 h-3" />
                <span>ChangeDetectionResult</span>
              </div>
              <div className="text-center text-[#64748B] text-[8px] leading-none">↓</div>
              <div className="flex items-center space-x-1.5 p-1 rounded bg-[#102436] border border-[#1B3A54] text-[#38BDF8]">
                <Cpu className="w-3 h-3" />
                <span>Damage Engine</span>
              </div>
              <div className="text-center text-[#64748B] text-[8px] leading-none">↓</div>
              <div className="flex items-center space-x-1.5 p-1 rounded bg-[#102436] border border-[#1B3A54] text-[#F0F6FC]">
                <FileSpreadsheet className="w-3 h-3" />
                <span>AssessmentResult</span>
              </div>
            </div>
          </div>

          {/* Feeds to Existing Modules */}
          <div className="border-t border-[#162E44] pt-1.5 space-y-1">
            <span className="text-[9px] font-mono text-[#64748B] uppercase block">
              Feeds to Existing Modules:
            </span>
            <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
              <button
                onClick={() => onSelectView && onSelectView('damage_assessment')}
                className="p-1 rounded bg-[#102436] hover:bg-[#1B3A54] text-[#38BDF8] border border-[#1B3A54] text-left flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <span>› Damage Map</span>
              </button>

              <button
                onClick={() => onSelectView && onSelectView('risk_intelligence')}
                className="p-1 rounded bg-[#102436] hover:bg-[#1B3A54] text-[#F97316] border border-[#1B3A54] text-left flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <span>› Risk Matrix</span>
              </button>

              <button
                onClick={() => onSelectView && onSelectView('historical_view')}
                className="p-1 rounded bg-[#102436] hover:bg-[#1B3A54] text-[#F0F6FC] border border-[#1B3A54] text-left flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <span>› History</span>
              </button>

              <button
                onClick={() => onSelectView && onSelectView('map_3d')}
                className="p-1 rounded bg-[#102436] hover:bg-[#1B3A54] text-[#10B981] border border-[#1B3A54] text-left flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <span>› 3D Earth</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
