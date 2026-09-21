import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Building,
  Shield,
  Radio,
  Cpu,
  Navigation as NavIcon,
  AlertTriangle,
  Layers,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Maximize2,
  Minimize2,
  Crosshair,
  Compass,
  Sliders,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Flame,
  Info,
  Calendar,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { WeatherLayerType } from './OpenWeatherCommandCenter';
import {
  RiskZone,
  AssessmentResult,
  RiskAssessmentResult,
  DetectedStructure,
  DamageClass,
  VerificationStatus,
  VerificationActionRequest,
  RiskSpatialLayer
} from '../../types';
import { LANDSLIDE_HAZARD_ZONES } from '../../data/command-centre/hazardData';
import { SIKKIM_NH10_RISK_SPATIAL_DATASET } from '../../data/command-centre/riskSpatialData';
import { getRiskColor } from '../../services/riskEngine';

interface OpenStreetMapViewerProps {
  centerLat: number;
  centerLng: number;
  zoom: number;
  onCenterChange: (lat: number, lng: number, zoom: number) => void;
  activeLayers: Record<WeatherLayerType, boolean>;
  selectedState: 'Sikkim' | 'Assam';
  selectedZone: RiskZone;
  onSelectZone?: (zone: RiskZone) => void;
  zones?: RiskZone[];
  onInspectZone?: (zone: RiskZone) => void;
  // Phase 4 Injected EO Damage & Risk Results
  assessmentResult?: AssessmentResult | null;
  riskResult?: RiskAssessmentResult | null;
  onVerifyStructure?: (actionReq: VerificationActionRequest) => Promise<void>;
}

export type BaseImageryType = 'osm' | 'sentinel_post' | 'sentinel_pre' | 'topo';

// Convert Lat/Lng to Slippy Map Tile Coordinates
function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

// Convert Lat/Lng to Viewport Screen Pixel Coordinates
function latLngToScreen(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
  viewWidth: number,
  viewHeight: number
) {
  const tileSize = 256;
  const centerTile = latLngToTile(centerLat, centerLng, zoom);
  const targetTile = latLngToTile(lat, lng, zoom);

  const deltaX = (targetTile.x - centerTile.x) * tileSize;
  const deltaY = (targetTile.y - centerTile.y) * tileSize;

  return {
    x: viewWidth / 2 + deltaX,
    y: viewHeight / 2 + deltaY
  };
}

// Convert Screen Pixel Coordinates to Lat/Lng
function screenToLatLng(
  screenX: number,
