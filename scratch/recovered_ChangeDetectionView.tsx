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
    imagePathPre: '/assets/satellite/scene_03_pre.jpg?v=4',
    imagePathPost: '/assets/satellite/scene_03_post.jpg?v=4'
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

