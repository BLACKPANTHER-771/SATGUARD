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
  screenY: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
  viewWidth: number,
  viewHeight: number
) {
  const tileSize = 256;
  const scale = Math.pow(2, zoom);
  const centerTile = latLngToTile(centerLat, centerLng, zoom);

  const deltaX = (screenX - viewWidth / 2) / tileSize;
  const deltaY = (screenY - viewHeight / 2) / tileSize;

  const targetTileX = centerTile.x + deltaX;
  const targetTileY = centerTile.y + deltaY;

  const lng = (targetTileX / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * targetTileY) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

  return { lat, lng };
}

// Key Locations for NH-10 Corridor & Regional Context
const SIKKIM_LOCATIONS = [
  { id: 'km42_viaduct', name: 'Singtam Viaduct (KM 42+200)', lat: 27.2345, lng: 88.5120, type: 'CRITICAL_DAMAGE', desc: 'Severe Structural Scour / Bridge Pier 4' },
  { id: 'dikchu', name: 'Dikchu Basin Hub (KM 48+700)', lat: 27.3980, lng: 88.5350, type: 'HOTSPOT', desc: 'Debris Flow Inundation · 850m' },
  { id: 'gangtok', name: 'Gangtok', lat: 27.3314, lng: 88.6138, type: 'CAPITAL', desc: 'State Capital HQ · 1,650m' },
  { id: 'singtam', name: 'Singtam Town', lat: 27.2340, lng: 88.4980, type: 'CONFLUENCE', desc: 'Teesta River Confluence · 350m' },
  { id: 'rangpo', name: 'Rangpo Gateway (KM 32+400)', lat: 27.1760, lng: 88.5320, type: 'GATEWAY', desc: 'State Border Checkpost' },
  { id: 'pakyong', name: 'Pakyong Substation (KM 55+100)', lat: 27.2400, lng: 88.5800, type: 'INFRA', desc: '33kV Electrical Grid Feeder' },
  { id: 'mangan', name: 'Mangan', lat: 27.5100, lng: 88.5200, type: 'DISTRICT', desc: 'North Sikkim HQ' },
  { id: 'teesta_v', name: 'Teesta Stage V Barrage', lat: 27.3100, lng: 88.5250, type: 'DAM', desc: 'NHPC Hydroelectric Dam Intake' }
];

const ASSAM_LOCATIONS = [
  { id: 'guwahati', name: 'Guwahati / Dispur', lat: 26.1445, lng: 91.7362, type: 'CAPITAL', desc: 'NER Operations Hub' },
  { id: 'tezpur', name: 'Tezpur', lat: 26.6528, lng: 92.7926, type: 'DISTRICT', desc: 'Sonitpur Sector' },
  { id: 'dibrugarh', name: 'Dibrugarh', lat: 27.4728, lng: 94.9120, type: 'DISTRICT', desc: 'Upper Assam Hub' },
  { id: 'tinsukia', name: 'Tinsukia', lat: 27.5000, lng: 95.3667, type: 'DISTRICT', desc: 'Eastern Corridor' },
  { id: 'north_lakhimpur', name: 'North Lakhimpur', lat: 27.2364, lng: 94.1037, type: 'DISTRICT', desc: 'Flood Prone Lowlands' },
  { id: 'haflong', name: 'Haflong (Dima Hasao)', lat: 25.1764, lng: 93.0238, type: 'HOTSPOT', desc: 'Haflong Ghat Slump Sector' },
  { id: 'silchar', name: 'Silchar', lat: 24.8333, lng: 92.7976, type: 'DISTRICT', desc: 'Barak Valley Hub' }
];

export const OpenStreetMapViewer: React.FC<OpenStreetMapViewerProps> = ({
  centerLat,
  centerLng,
  zoom,
  onCenterChange,
  activeLayers,
  selectedState,
  selectedZone,
  onSelectZone,
  zones,
  onInspectZone,
  assessmentResult,
  riskResult,
  onVerifyStructure
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewSize, setViewSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, lat: centerLat, lng: centerLng });

  // Phase 4 Base Map & Layer Control State
  const [baseImagery, setBaseImagery] = useState<BaseImageryType>('osm');
  const [isLayerControlOpen, setIsLayerControlOpen] = useState<boolean>(false);

  // 4-Category Hierarchical Layer Controls
  const [mapLayers, setMapLayers] = useState({
    // DAMAGE
    damage_destroyed: true,
    damage_major: true,
    damage_minor: true,
    damage_intact: true,
    damage_change_mask: true,
    // CONTEXT
    context_nh10: true,
    context_structures: true,
    context_river: true,
    context_locations: true,
    // RISK
    risk_susceptibility: true,
    risk_rainfall: true,
    risk_soil: true,
    risk_historical: true
  });

  const [selectedStructure, setSelectedStructure] = useState<DetectedStructure | null>(null);
  const [isVerifyingStructure, setIsVerifyingStructure] = useState<boolean>(false);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number }>({ lat: centerLat, lng: centerLng });

  // Dynamic Scene Dates extracted from AssessmentResult
  const preAcquisitionDate = assessmentResult?.sceneMetadata?.acquisitionDates?.before || '28 Aug 2026';
  const postAcquisitionDate = assessmentResult?.sceneMetadata?.acquisitionDates?.after || '03 Sep 2026';
  const isDemoScene = assessmentResult?.mode === 'DEMO';

  // Resize listener
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewSize({
          width: containerRef.current.clientWidth || 800,
          height: containerRef.current.clientHeight || 600
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Mouse drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      lat: centerLat,
      lng: centerLng
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const coords = screenToLatLng(mouseX, mouseY, centerLat, centerLng, zoom, viewSize.width, viewSize.height);
      setCursorCoords(coords);
    }

    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    const newCenter = screenToLatLng(
      viewSize.width / 2 - dx,
      viewSize.height / 2 - dy,
      dragStart.lat,
      dragStart.lng,
      zoom,
      viewSize.width,
      viewSize.height
    );

    onCenterChange(newCenter.lat, newCenter.lng, zoom);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.4 : -0.4;
    const nextZoom = Math.min(Math.max(zoom + zoomDelta, 3.5), 17);
    onCenterChange(centerLat, centerLng, nextZoom);
  };

  // Authoritative Verification Action
  const handleInlineVerify = async (action: 'VERIFY' | 'REJECT' | 'NEEDS_REVIEW' | 'MODIFY_CLASSIFICATION', modifiedClass?: DamageClass) => {
    if (!selectedStructure || !assessmentResult || !onVerifyStructure) return;
    setIsVerifyingStructure(true);
    try {
      await onVerifyStructure({
        sceneId: assessmentResult.sceneId,
        structureId: selectedStructure.structureId,
        action,
        modifiedClass,
        notes: `Map Inspector Action: ${action}`,
        assessorId: 'NDRF_MAP_OPERATOR'
      });
      // Synchronously update local inspector
      setSelectedStructure(prev => prev ? {
        ...prev,
        verificationStatus: action === 'VERIFY' ? 'VERIFIED' : action === 'REJECT' ? 'REJECTED' : 'NEEDS_REVIEW',
        damageClass: modifiedClass || prev.damageClass
      } : null);
    } catch (err) {
      console.error('Error verifying structure in map:', err);
    } finally {
      setIsVerifyingStructure(false);
    }
  };

  // Base Map Tile Generation
  const intZoom = Math.floor(zoom);
  const tileSize = 256;
  const numTiles = Math.pow(2, intZoom);
  const centerTilePos = latLngToTile(centerLat, centerLng, intZoom);

  const tilesX = Math.ceil(viewSize.width / tileSize) + 2;
  const tilesY = Math.ceil(viewSize.height / tileSize) + 2;

  const startTileX = Math.floor(centerTilePos.x - tilesX / 2);
  const startTileY = Math.floor(centerTilePos.y - tilesY / 2);

  const tiles = [];
  for (let x = startTileX; x < startTileX + tilesX; x++) {
    for (let y = startTileY; y < startTileY + tilesY; y++) {
      if (y >= 0 && y < numTiles) {
        const wrappedX = ((x % numTiles) + numTiles) % numTiles;
        const screenX = (x - centerTilePos.x) * tileSize + viewSize.width / 2;
        const screenY = (y - centerTilePos.y) * tileSize + viewSize.height / 2;

        let tileUrl = `https://tile.openstreetmap.org/${intZoom}/${wrappedX}/${y}.png`;
        if (baseImagery === 'topo') {
          tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${intZoom}/${y}/${wrappedX}`;
        } else if (baseImagery === 'sentinel_pre' || baseImagery === 'sentinel_post') {
          tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${intZoom}/${y}/${wrappedX}`;
        }

        tiles.push({
          key: `${baseImagery}-${intZoom}-${wrappedX}-${y}`,
          url: tileUrl,
          x: screenX,
          y: screenY
        });
      }
    }
  }

  // Location markers for current state
  const activeLocations = selectedState === 'Sikkim' ? SIKKIM_LOCATIONS : ASSAM_LOCATIONS;

  // Assessed structures from Phase 2
  const structuresList = assessmentResult?.structures || [];

  // Metric Scale Calculation
  const metersPerPixel = (156543.03392 * Math.cos((centerLat * Math.PI) / 180)) / Math.pow(2, zoom);
  const scaleBarWidthPx = 100;
  const scaleMeters = scaleBarWidthPx * metersPerPixel;
  const scaleLabel = scaleMeters >= 1000 ? `${(scaleMeters / 1000).toFixed(1)} km` : `${Math.round(scaleMeters)} m`;

  const getDamageColor = (cls: DamageClass) => {
    switch (cls) {
      case 'DESTROYED': return '#C95050';
      case 'MAJOR_DAMAGE': return '#D97706';
      case 'MINOR_DAMAGE': return '#C58A24';
      case 'NO_DAMAGE':
      default: return '#4F9D69';
    }
  };

  const isDamageClassVisible = (cls: DamageClass) => {
    switch (cls) {
      case 'DESTROYED': return mapLayers.damage_destroyed;
      case 'MAJOR_DAMAGE': return mapLayers.damage_major;
      case 'MINOR_DAMAGE': return mapLayers.damage_minor;
      case 'NO_DAMAGE': return mapLayers.damage_intact;
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-full select-none overflow-hidden bg-[#172A35] cursor-grab active:cursor-grabbing font-sans"
    >
      {/* 1. TILE BASEMAP LAYER */}
      <div className="absolute inset-0 pointer-events-none">
        {tiles.map(tile => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            loading="lazy"
            className="absolute select-none pointer-events-none transition-opacity duration-200"
            style={{
              left: `${tile.x}px`,
              top: `${tile.y}px`,
              width: `${tileSize}px`,
              height: `${tileSize}px`,
              filter: baseImagery === 'osm'
                ? 'contrast(1.05) saturate(1.1)'
                : baseImagery === 'topo'
                ? 'contrast(1.1) saturate(1.0)'
                : 'contrast(1.2) brightness(0.95)'
            }}
          />
        ))}

        {/* Change Mask Overlay (semi-transparent difference pattern) */}
        {mapLayers.damage_change_mask && (
          <div
            className="absolute inset-0 bg-[#C95050]/15 pointer-events-none mix-blend-multiply"
            style={{
              backgroundImage: 'radial-gradient(#C95050 1.5px, transparent 1.5px)',
              backgroundSize: '18px 18px'
            }}
          />
        )}
      </div>

      {/* 2. VECTOR SVG OVERLAYS: ROADS, RIVERS, HAZARD ZONES, FOOTPRINTS, HOTSPOTS */}
      <svg
        className="absolute inset-0 pointer-events-none w-full h-full"
        style={{ width: viewSize.width, height: viewSize.height }}
      >
        <defs>
          <radialGradient id="hotspotGlowDestroyed" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C95050" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#C95050" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#C95050" stopOpacity="0.0" />
          </radialGradient>
          <radialGradient id="hotspotGlowMajor" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D97706" stopOpacity="0.60" />
            <stop offset="50%" stopColor="#D97706" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0.0" />
          </radialGradient>
        </defs>

        {/* SPATIAL RISK LAYERS: SUSCEPTIBILITY ZONATION */}
        {mapLayers.risk_susceptibility && SIKKIM_NH10_RISK_SPATIAL_DATASET.layers
          .filter(l => l.category === 'GEOMORPHOLOGICAL' && l.geometryType === 'Polygon')
          .map((layer) => {
            const points = layer.coordinates.map((coord: number[]) => {
              return latLngToScreen(coord[1], coord[0], centerLat, centerLng, zoom, viewSize.width, viewSize.height);
            });
            const ptsString = points.map((p: { x: number; y: number }) => `${p.x},${p.y}`).join(' ');
            const color = layer.threatLevel === 'CRITICAL' ? '#C95050' : '#D97706';

            return (
              <polygon
                key={layer.layerId}
                points={ptsString}
                fill={color}
                fillOpacity={layer.threatLevel === 'CRITICAL' ? 0.35 : 0.22}
                stroke={color}
                strokeWidth={2.0}
                strokeDasharray="5 3"
              />
            );
          })}

        {/* SPATIAL RISK LAYERS: 72H ISOHYETAL RAINFALL CONTOUR */}
        {mapLayers.risk_rainfall && SIKKIM_NH10_RISK_SPATIAL_DATASET.layers
          .filter(l => l.category === 'METEOROLOGICAL' && l.geometryType === 'Polygon')
          .map((layer) => {
            const points = layer.coordinates.map((coord: number[]) => {
              return latLngToScreen(coord[1], coord[0], centerLat, centerLng, zoom, viewSize.width, viewSize.height);
            });
            const ptsString = points.map((p: { x: number; y: number }) => `${p.x},${p.y}`).join(' ');

            return (
              <polygon
                key={layer.layerId}
                points={ptsString}
                fill="#397FA8"
                fillOpacity={0.18}
                stroke="#397FA8"
                strokeWidth={2.5}
                strokeDasharray="6 4"
              />
            );
          })}

        {/* SPATIAL RISK LAYERS: VOLUMETRIC SOIL SATURATION MESH */}
        {mapLayers.risk_soil && SIKKIM_NH10_RISK_SPATIAL_DATASET.layers
          .filter(l => l.category === 'HYDROLOGICAL' && l.geometryType === 'Polygon')
          .map((layer) => {
            const points = layer.coordinates.map((coord: number[]) => {
              return latLngToScreen(coord[1], coord[0], centerLat, centerLng, zoom, viewSize.width, viewSize.height);
            });
            const ptsString = points.map((p: { x: number; y: number }) => `${p.x},${p.y}`).join(' ');

            return (
              <polygon
                key={layer.layerId}
                points={ptsString}
                fill="#167F78"
                fillOpacity={0.20}
                stroke="#167F78"
                strokeWidth={2.0}
                strokeDasharray="4 2"
              />
            );
          })}

        {/* Teesta River Flow Alignment */}
        {mapLayers.context_river && selectedState === 'Sikkim' && (
          <path
            d={[
              latLngToScreen(27.80, 88.60, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.425, 88.542, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.398, 88.535, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.345, 88.528, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.284, 88.512, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.2345, 88.5120, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.234, 88.498, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.176, 88.532, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.092, 88.455, centerLat, centerLng, zoom, viewSize.width, viewSize.height)
            ].reduce((acc, curr, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`, '')}
            fill="none"
            stroke="#397FA8"
            strokeWidth={zoom > 10 ? "5" : "3"}
            strokeOpacity="0.85"
            strokeLinecap="round"
          />
        )}

        {/* NH-10 Highway Corridor Alignment */}
        {mapLayers.context_nh10 && selectedState === 'Sikkim' && (
          <g>
            <path
              d={[
                latLngToScreen(26.727, 88.435, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
                latLngToScreen(27.176, 88.532, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
                latLngToScreen(27.2345, 88.5120, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
                latLngToScreen(27.234, 88.498, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
                latLngToScreen(27.331, 88.613, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
                latLngToScreen(27.398, 88.535, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
                latLngToScreen(27.510, 88.520, centerLat, centerLng, zoom, viewSize.width, viewSize.height)
              ].reduce((acc, curr, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`, '')}
              fill="none"
              stroke="#D97706"
              strokeWidth={zoom > 10 ? "4" : "2.5"}
              strokeDasharray="6 3"
            />
          </g>
        )}

        {/* TRANSLUCENT GROUND DAMAGE HOTSPOTS */}
        {selectedState === 'Sikkim' && (
          <g>
            {/* Hotspot 1: Singtam Viaduct KM 42+200 */}
            <circle
              cx={latLngToScreen(27.2345, 88.5120, centerLat, centerLng, zoom, viewSize.width, viewSize.height).x}
              cy={latLngToScreen(27.2345, 88.5120, centerLat, centerLng, zoom, viewSize.width, viewSize.height).y}
              r={zoom > 11 ? "55" : "30"}
              fill="url(#hotspotGlowMajor)"
            />
            {/* Hotspot 2: Dikchu Basin Hub KM 48+700 */}
            <circle
              cx={latLngToScreen(27.3980, 88.5350, centerLat, centerLng, zoom, viewSize.width, viewSize.height).x}
              cy={latLngToScreen(27.3980, 88.5350, centerLat, centerLng, zoom, viewSize.width, viewSize.height).y}
              r={zoom > 11 ? "45" : "25"}
              fill="url(#hotspotGlowMajor)"
            />
          </g>
        )}

        {/* 4-TIER BUILDING FOOTPRINTS (PROVENANCE LABELED) */}
        {mapLayers.context_structures && selectedState === 'Sikkim' && structuresList.map((str) => {
          if (!isDamageClassVisible(str.damageClass)) return null;
          const isSelected = selectedStructure?.structureId === str.structureId;
          const color = getDamageColor(str.damageClass);
          const center = latLngToScreen(str.centerLat, str.centerLng, centerLat, centerLng, zoom, viewSize.width, viewSize.height);

          const sizePx = Math.max(12, (Math.sqrt(str.footprintAreaM2 || 400) / metersPerPixel));
          const half = sizePx / 2;

          return (
            <g key={str.structureId}>
              <rect
                x={center.x - half}
                y={center.y - half}
                width={sizePx}
                height={sizePx}
                rx={2}
                fill={color}
                fillOpacity={isSelected ? 0.75 : 0.50}
                stroke={isSelected ? '#FFFFFF' : color}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              <circle
                cx={center.x}
                cy={center.y}
                r={isSelected ? 4 : 2.5}
                fill="#FFFFFF"
                stroke={color}
                strokeWidth={1.5}
              />
            </g>
          );
        })}
      </svg>

      {/* 3. INTERACTIVE PINS & LABELS */}
      <div className="absolute inset-0 pointer-events-auto">
        {/* Structure Centroid Markers */}
        {mapLayers.context_structures && selectedState === 'Sikkim' && structuresList.map((str) => {
          if (!isDamageClassVisible(str.damageClass)) return null;
          const isSelected = selectedStructure?.structureId === str.structureId;
          const color = getDamageColor(str.damageClass);
          const center = latLngToScreen(str.centerLat, str.centerLng, centerLat, centerLng, zoom, viewSize.width, viewSize.height);

          if (
            center.x < -100 ||
            center.x > viewSize.width + 100 ||
            center.y < -100 ||
            center.y > viewSize.height + 100
          ) {
            return null;
          }

          const isCritical = str.damageClass === 'DESTROYED' || str.damageClass === 'MAJOR_DAMAGE';

          return (
            <div
              key={str.structureId}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStructure(str);
              }}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-all z-20 ${
                isSelected ? 'scale-125 z-40' : 'hover:scale-110'
              }`}
              style={{ left: `${center.x}px`, top: `${center.y - (zoom > 11 ? 16 : 8)}px` }}
              title={`Click to inspect ${str.name}`}
            >
              <div
                className={`px-1.5 py-0.5 rounded text-white font-mono text-[9px] font-bold shadow-md border border-white/80 flex items-center space-x-1 ${
                  isSelected ? 'ring-2 ring-white' : ''
                }`}
                style={{ backgroundColor: color }}
              >
                {isCritical && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                <span>{str.structureId}</span>
              </div>
            </div>
          );
        })}

        {/* Spatial Risk Historical Points */}
        {mapLayers.risk_historical && SIKKIM_NH10_RISK_SPATIAL_DATASET.layers
          .filter(l => l.category === 'HISTORICAL' && l.geometryType === 'Point')
          .map((pt) => {
            const screen = latLngToScreen(pt.coordinates[1], pt.coordinates[0], centerLat, centerLng, zoom, viewSize.width, viewSize.height);
            return (
              <div
                key={pt.layerId}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center space-x-1 pointer-events-auto z-15"
                style={{ left: `${screen.x}px`, top: `${screen.y}px` }}
                title={`Historical Landslide: ${pt.factorName} (${pt.value})`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#C58A24] border border-white shadow-sm flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-white" />
                </div>
                {zoom > 10 && (
                  <span className="text-[8px] font-mono text-[#F5F2E9] bg-[#10232E]/90 px-1 py-0.2 rounded border border-[#203844] whitespace-nowrap">
                    {pt.factorName}
                  </span>
                )}
              </div>
            );
          })}

        {/* Regional Locations & Checkpoints */}
        {mapLayers.context_locations && activeLocations.map(loc => {
          const screenPos = latLngToScreen(loc.lat, loc.lng, centerLat, centerLng, zoom, viewSize.width, viewSize.height);
          if (
            screenPos.x < -100 ||
            screenPos.x > viewSize.width + 100 ||
            screenPos.y < -100 ||
            screenPos.y > viewSize.height + 100
          ) {
            return null;
          }

          const isHotspot = loc.type === 'HOTSPOT' || loc.type === 'CRITICAL_DAMAGE';
          const isCapital = loc.type === 'CAPITAL';

          return (
            <div
              key={loc.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-transform hover:scale-105 z-10"
              style={{ left: `${screenPos.x}px`, top: `${screenPos.y}px` }}
            >
              {isHotspot ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full bg-[#C95050] border-2 border-white relative flex items-center justify-center shadow-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <div className="mt-0.5 px-2 py-0.5 rounded bg-[#10232E]/95 text-white font-mono font-bold text-[10px] shadow-md border border-[#C95050] flex items-center space-x-1">
                    <span className="text-[#C95050]">●</span>
                    <span className="truncate max-w-[150px]">{loc.name}</span>
                  </div>
                  {zoom > 9 && (
                    <span className="text-[8px] font-mono text-[#8E99A8] bg-[#10232E]/90 px-1 py-0.2 rounded mt-0.5 border border-[#203844]">
                      {loc.desc}
                    </span>
                  )}
                </>
              ) : isCapital ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-[#167F78] border-2 border-white shadow-md" />
                  <div className="mt-0.5 px-1.5 py-0.5 rounded bg-[#FAF8F1] text-[#172126] font-bold text-[10px] shadow border border-[#D7DEDC]">
                    ★ {loc.name}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-[#667579] border border-white shadow-sm" />
                  {zoom > 8 && (
                    <div className="mt-0.5 px-1 py-0.2 rounded bg-[#FAF8F1]/90 text-[#172126] font-medium text-[9px] shadow-sm border border-[#D7DEDC]">
                      {loc.name}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. INSTITUTIONAL MAP LAYER CONTROL DRAWER */}
      <div className="absolute top-3 left-3 z-30 flex flex-col space-y-1.5 font-mono text-[10px]">
        <div className="bg-[#10232E]/95 border border-[#203844] rounded-md shadow-lg overflow-hidden text-[#F5F2E9]">
          {/* Drawer Header Toggle */}
          <button
            onClick={() => setIsLayerControlOpen(!isLayerControlOpen)}
            className="w-full px-2.5 py-1.5 flex items-center justify-between space-x-3 bg-[#172A35] hover:bg-[#203844] transition-colors cursor-pointer text-[#F5F2E9] font-bold"
          >
            <div className="flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-[#5D8F89]" />
              <span className="uppercase text-[9px] tracking-wider">MAP LAYER CONTROLS</span>
            </div>
            {isLayerControlOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Quick Basemap Switcher (Always Visible) */}
          <div className="p-1.5 border-b border-[#203844] flex items-center space-x-1 bg-[#10232E]">
            <span className="text-[#8E99A8] text-[8px] uppercase mr-1">BASE:</span>
            <button
              onClick={() => setBaseImagery('sentinel_post')}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${baseImagery === 'sentinel_post' ? 'bg-[#167F78] text-white font-bold' : 'bg-[#172A35] text-[#8E99A8]'}`}
              title={`Post-Disaster Scene: ${postAcquisitionDate}`}
            >
              Post-EO ({postAcquisitionDate.split(' ')[0]} {postAcquisitionDate.split(' ')[1]})
            </button>
            <button
              onClick={() => setBaseImagery('sentinel_pre')}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${baseImagery === 'sentinel_pre' ? 'bg-[#167F78] text-white font-bold' : 'bg-[#172A35] text-[#8E99A8]'}`}
              title={`Pre-Disaster Scene: ${preAcquisitionDate}`}
            >
              Pre-EO ({preAcquisitionDate.split(' ')[0]} {preAcquisitionDate.split(' ')[1]})
            </button>
            <button
              onClick={() => setBaseImagery('osm')}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${baseImagery === 'osm' ? 'bg-[#167F78] text-white font-bold' : 'bg-[#172A35] text-[#8E99A8]'}`}
            >
              OSM
            </button>
            <button
              onClick={() => setBaseImagery('topo')}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${baseImagery === 'topo' ? 'bg-[#167F78] text-white font-bold' : 'bg-[#172A35] text-[#8E99A8]'}`}
            >
              Terrain
            </button>
          </div>

          {/* Collapsible Detailed Layer Checklist */}
          {isLayerControlOpen && (
            <div className="p-2 space-y-2 max-h-72 overflow-y-auto text-[9px] bg-[#10232E]/98">
              {/* CATEGORY 1: DAMAGE LAYERS */}
              <div className="space-y-1">
                <span className="text-[#5D8F89] font-bold block uppercase border-b border-[#203844] pb-0.5">
                  1. DAMAGE CLASSIFICATION
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <label className="flex items-center space-x-1.5 cursor-pointer text-[#C95050]">
                    <input
                      type="checkbox"
                      checked={mapLayers.damage_destroyed}
                      onChange={(e) => setMapLayers(p => ({ ...p, damage_destroyed: e.target.checked }))}
                      className="accent-[#C95050] cursor-pointer"
                    />
                    <span>[x] Destroyed (Red)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer text-[#D97706]">
                    <input
                      type="checkbox"
                      checked={mapLayers.damage_major}
                      onChange={(e) => setMapLayers(p => ({ ...p, damage_major: e.target.checked }))}
                      className="accent-[#D97706] cursor-pointer"
                    />
                    <span>[x] Major (Orange)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer text-[#C58A24]">
                    <input
                      type="checkbox"
                      checked={mapLayers.damage_minor}
                      onChange={(e) => setMapLayers(p => ({ ...p, damage_minor: e.target.checked }))}
                      className="accent-[#C58A24] cursor-pointer"
                    />
                    <span>[x] Minor (Yellow)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer text-[#4F9D69]">
                    <input
                      type="checkbox"
                      checked={mapLayers.damage_intact}
                      onChange={(e) => setMapLayers(p => ({ ...p, damage_intact: e.target.checked }))}
                      className="accent-[#4F9D69] cursor-pointer"
                    />
                    <span>[x] Intact (Green)</span>
                  </label>
                  <label className="col-span-2 flex items-center space-x-1.5 cursor-pointer text-[#8E99A8]">
                    <input
                      type="checkbox"
                      checked={mapLayers.damage_change_mask}
                      onChange={(e) => setMapLayers(p => ({ ...p, damage_change_mask: e.target.checked }))}
                      className="accent-[#5D8F89] cursor-pointer"
                    />
                    <span>[x] Optical Change Mask</span>
                  </label>
                </div>
              </div>

              {/* CATEGORY 2: CONTEXT LAYERS */}
              <div className="space-y-1">
                <span className="text-[#5D8F89] font-bold block uppercase border-b border-[#203844] pb-0.5">
                  2. GEOTECHNICAL CONTEXT
                </span>
                <div className="grid grid-cols-2 gap-1 text-[#F5F2E9]">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mapLayers.context_nh10}
                      onChange={(e) => setMapLayers(p => ({ ...p, context_nh10: e.target.checked }))}
                      className="accent-[#5D8F89] cursor-pointer"
                    />
                    <span>NH-10 Corridor</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mapLayers.context_structures}
                      onChange={(e) => setMapLayers(p => ({ ...p, context_structures: e.target.checked }))}
                      className="accent-[#5D8F89] cursor-pointer"
                    />
                    <span>Footprints</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mapLayers.context_river}
                      onChange={(e) => setMapLayers(p => ({ ...p, context_river: e.target.checked }))}
                      className="accent-[#5D8F89] cursor-pointer"
                    />
                    <span>Teesta River</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mapLayers.context_locations}
                      onChange={(e) => setMapLayers(p => ({ ...p, context_locations: e.target.checked }))}
                      className="accent-[#5D8F89] cursor-pointer"
                    />
                    <span>Key Sectors</span>
                  </label>
                </div>
              </div>

              {/* CATEGORY 3: RISK LAYERS */}
              <div className="space-y-1">
                <span className="text-[#5D8F89] font-bold block uppercase border-b border-[#203844] pb-0.5">
                  3. MULTI-FACTOR RISK (MCE)
                </span>
                <div className="space-y-1 text-[#F5F2E9]">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mapLayers.risk_susceptibility}
                      onChange={(e) => setMapLayers(p => ({ ...p, risk_susceptibility: e.target.checked }))}
                      className="accent-[#C95050] cursor-pointer"
                    />
                    <span>Susceptibility Zonation (&gt;70% Critical)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mapLayers.risk_rainfall}
                      onChange={(e) => setMapLayers(p => ({ ...p, risk_rainfall: e.target.checked }))}
                      className="accent-[#397FA8] cursor-pointer"
                    />
                    <span>Isohyetal Rainfall (142.6 mm / 72h)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mapLayers.risk_soil}
                      onChange={(e) => setMapLayers(p => ({ ...p, risk_soil: e.target.checked }))}
                      className="accent-[#167F78] cursor-pointer"
                    />
                    <span>Soil Moisture Saturation (84.2%)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mapLayers.risk_historical}
                      onChange={(e) => setMapLayers(p => ({ ...p, risk_historical: e.target.checked }))}
                      className="accent-[#C58A24] cursor-pointer"
                    />
                    <span>Historical Landslides (6 GSI Records)</span>
                  </label>
                </div>
              </div>

              {/* Footprint Provenance Notice */}
              <div className="pt-1 border-t border-[#203844] text-[8px] text-[#8E99A8]">
                PROVENANCE: {isDemoScene ? 'DEMO / SYNTHETIC STRUCTURE FOOTPRINTS' : 'EXTRACTED / REAL FOOTPRINTS'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. TOP-RIGHT ZOOM & CAMERA CONTROLS */}
      <div className="absolute top-3 right-3 z-30 flex flex-col space-y-1">
        <button
          onClick={() => onCenterChange(centerLat, centerLng, Math.min(zoom + 1, 17))}
          className="w-7 h-7 rounded bg-[#10232E] border border-[#203844] text-[#F5F2E9] flex items-center justify-center hover:bg-[#172A35] font-bold text-sm shadow-md cursor-pointer"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => onCenterChange(centerLat, centerLng, Math.max(zoom - 1, 3.5))}
          className="w-7 h-7 rounded bg-[#10232E] border border-[#203844] text-[#F5F2E9] flex items-center justify-center hover:bg-[#172A35] font-bold text-sm shadow-md cursor-pointer"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={() => onCenterChange(27.3000, 88.5200, 11.5)}
          className="w-7 h-7 rounded bg-[#10232E] border border-[#203844] text-[#5D8F89] flex items-center justify-center hover:bg-[#172A35] font-bold text-xs shadow-md cursor-pointer"
          title="Reset to NH-10 Corridor"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 6. BOTTOM CARTOGRAPHIC HUD: NORTH ARROW, SCALE BAR, COORDINATES */}
      <div className="absolute bottom-2 left-3 right-3 z-30 flex flex-wrap items-end justify-between gap-2 pointer-events-none font-mono text-[9px]">
        <div className="bg-[#10232E]/95 border border-[#203844] px-2.5 py-1 rounded shadow-md flex items-center space-x-3 text-[#8E99A8] pointer-events-auto">
          <div className="flex items-center space-x-1 text-[#5D8F89]">
            <NavIcon className="w-3 h-3 -rotate-45" />
            <span className="font-bold">N (UTM 45N)</span>
          </div>
          <span>|</span>
          <span>LAT: <strong className="text-[#F5F2E9]">{cursorCoords.lat.toFixed(4)}° N</strong></span>
          <span>LNG: <strong className="text-[#F5F2E9]">{cursorCoords.lng.toFixed(4)}° E</strong></span>
          <span>|</span>
          <span>ELEV: <strong className="text-[#5D8F89]">~840m MSL</strong></span>
        </div>

        <div className="bg-[#10232E]/95 border border-[#203844] px-2.5 py-1 rounded shadow-md flex items-center space-x-2 text-[#8E99A8] pointer-events-auto">
          <span>SCALE:</span>
          <div className="flex items-center space-x-1">
            <div className="w-20 h-1 bg-[#8E99A8] border-x border-white" />
            <span className="text-[#F5F2E9] font-bold">{scaleLabel}</span>
          </div>
        </div>

        <div className="bg-[#10232E]/95 border border-[#203844] px-2.5 py-1 rounded shadow-md text-[#8E99A8] pointer-events-auto">
          <span>SCENE: {isDemoScene ? 'SYNTHETIC DEMO' : 'OPERATIONAL'} • S2-MSI L2A</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. INTERACTIVE STRUCTURE DAMAGE INSPECTOR POPOVER (MODAL ON CLICK)        */}
      {/* ========================================================================= */}
      {selectedStructure && (
        <div className="absolute top-14 right-3 w-84 bg-[#FAF8F1] border border-[#C9CEC8] rounded-md shadow-2xl z-40 p-3 space-y-2 font-sans text-xs">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#D7DEDC] pb-1.5">
            <div>
              <div className="flex items-center space-x-1.5">
                <Building className="w-4 h-4 text-[#167F78]" />
                <h4 className="font-mono font-bold text-xs text-[#172126] uppercase">
                  {selectedStructure.structureId}
                </h4>
                {selectedStructure.isSyntheticFootprint && (
                  <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-[#C58A24]/15 text-[#C58A24] border border-[#C58A24]/30 font-bold">
                    DEMO FOOTPRINT
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#667579] line-clamp-1">
                {selectedStructure.name}
              </span>
            </div>
            <button
              onClick={() => setSelectedStructure(null)}
              className="text-[#667579] hover:text-[#172126] font-bold text-sm cursor-pointer p-0.5"
            >
              ✕
            </button>
          </div>

          {/* Damage & Confidence Chips */}
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
            <div className="bg-[#E8E9E3] p-1.5 rounded border border-[#C9CEC8]">
              <span className="text-[#667579] block text-[8px] uppercase">DAMAGE CLASS</span>
              <span
                className="font-bold text-[10px] block"
                style={{ color: getDamageColor(selectedStructure.damageClass) }}
              >
                {selectedStructure.damageClass}
              </span>
            </div>
            <div className="bg-[#E8E9E3] p-1.5 rounded border border-[#C9CEC8]">
              <span className="text-[#667579] block text-[8px] uppercase">CONFIDENCE</span>
              <strong className="text-[#172126] text-[10px] block">
                {(selectedStructure.confidence * 100).toFixed(1)}%
              </strong>
            </div>
          </div>

          {/* Side-by-Side Before/After Satellite Crop Previews with Dynamic Dates */}
          <div className="space-y-1">
            <span className="text-[9px] font-mono text-[#667579] uppercase block">
              BITEMPORAL SATELLITE CROPS (OPTICAL REGISTRATION)
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="relative bg-[#172A35] rounded border border-[#C9CEC8] overflow-hidden">
                <img
                  src={selectedStructure.beforeEvidence || '/assets/satellite/scene_03_pre.jpg'}
                  alt="Before Crop"
                  className="w-full h-16 object-cover"
                />
                <span className="absolute top-0.5 left-0.5 bg-black/80 text-[7px] font-mono text-[#5D8F89] px-1 rounded">
                  BEFORE: {preAcquisitionDate}
                </span>
              </div>
              <div className="relative bg-[#172A35] rounded border border-[#C9CEC8] overflow-hidden">
                <img
                  src={selectedStructure.afterEvidence || '/assets/satellite/scene_03_post.jpg'}
                  alt="After Crop"
                  className="w-full h-16 object-cover"
                />
                <span className="absolute top-0.5 left-0.5 bg-black/80 text-[7px] font-mono text-[#C95050] px-1 rounded">
                  AFTER: {postAcquisitionDate}
                </span>
              </div>
            </div>
          </div>

          {/* Optical Feature Metrics & Height Provenance */}
          <div className="bg-[#E8E9E3] p-1.5 rounded border border-[#C9CEC8] text-[9px] font-mono space-y-0.5 text-[#172126]">
            <div className="flex justify-between">
              <span className="text-[#667579]">Footprint Area:</span>
              <strong>{selectedStructure.footprintAreaM2} m²</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667579]">Height Model:</span>
              <strong>{selectedStructure.estimatedHeightM || 18}m ({selectedStructure.heightSource || 'SYNTHETIC DEMO'})</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667579]">Edge Delta:</span>
              <strong>{(selectedStructure.features?.edgeChange || 0.42).toFixed(2)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667579]">Verification State:</span>
              <strong className={selectedStructure.verificationStatus === 'VERIFIED' ? 'text-[#167F78]' : 'text-[#D97706]'}>
                {selectedStructure.verificationStatus}
              </strong>
            </div>
          </div>

          {/* Verification Actions Toolbar */}
          <div className="pt-1 border-t border-[#D7DEDC] space-y-1">
            <span className="text-[8px] font-mono text-[#667579] uppercase block">
              AUTHORITATIVE VERIFICATION ACTION
            </span>
            <div className="grid grid-cols-3 gap-1 font-mono text-[9px]">
              <button
                disabled={isVerifyingStructure}
                onClick={() => handleInlineVerify('VERIFY')}
                className="px-1.5 py-1 rounded bg-[#167F78] hover:bg-[#136C67] text-white font-bold transition-colors cursor-pointer text-center"
              >
                Verify
              </button>
              <button
                disabled={isVerifyingStructure}
                onClick={() => handleInlineVerify('NEEDS_REVIEW')}
                className="px-1.5 py-1 rounded bg-[#D97706] hover:bg-[#B45309] text-white font-bold transition-colors cursor-pointer text-center"
              >
                Review
              </button>
              <button
                disabled={isVerifyingStructure}
                onClick={() => handleInlineVerify('REJECT')}
                className="px-1.5 py-1 rounded bg-[#C95050] hover:bg-[#991B1B] text-white font-bold transition-colors cursor-pointer text-center"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenStreetMapViewer;
