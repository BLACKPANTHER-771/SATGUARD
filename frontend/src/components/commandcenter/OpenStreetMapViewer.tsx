import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Building,
  Shield,
  Radio,
  Cpu,
  Navigation as NavIcon,
  AlertTriangle
} from 'lucide-react';
import { WeatherLayerType } from './OpenWeatherCommandCenter';
import { RiskZone } from '../../types';
import { LANDSLIDE_HAZARD_ZONES, LandslideHazardZone } from '../../data/command-centre/hazardData';
import { getRiskColor, getRiskLevel, InterpretableRiskEngine } from '../../services/riskEngine';

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
}

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

// Detailed Geographic Markers for Sikkim & Assam
const SIKKIM_LOCATIONS = [
  { id: 'dikchu', name: 'Dikchu (Mile 14)', lat: 27.398, lng: 88.535, type: 'HOTSPOT', desc: 'Critical slope toe · 850m' },
  { id: 'gangtok', name: 'Gangtok', lat: 27.3314, lng: 88.6138, type: 'CAPITAL', desc: 'State Capital · 1,650m' },
  { id: 'singtam', name: 'Singtam', lat: 27.234, lng: 88.498, type: 'CONFLUENCE', desc: 'Teesta Confluence · 350m' },
  { id: 'rangpo', name: 'Rangpo', lat: 27.176, lng: 88.532, type: 'GATEWAY', desc: 'State Border Checkpost' },
  { id: 'mangan', name: 'Mangan', lat: 27.510, lng: 88.520, type: 'DISTRICT', desc: 'North Sikkim HQ' },
  { id: 'namchi', name: 'Namchi', lat: 27.167, lng: 88.364, type: 'DISTRICT', desc: 'South Sikkim HQ' },
  { id: 'chungthang', name: 'Chungthang', lat: 27.604, lng: 88.647, type: 'VALLEY', desc: 'Upper Teesta Basin' }
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
  onInspectZone
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewSize, setViewSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, lat: centerLat, lng: centerLng });

  // Update container dimensions on resize
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

  // Mouse Drag to Pan
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

  // Wheel to Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.4 : -0.4;
    const nextZoom = Math.min(Math.max(zoom + zoomDelta, 3.5), 16);
    onCenterChange(centerLat, centerLng, nextZoom);
  };

  // Calculate Tiles to Render for Viewport
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

        tiles.push({
          key: `${intZoom}-${wrappedX}-${y}`,
          url: `https://tile.openstreetmap.org/${intZoom}/${wrappedX}/${y}.png`,
          x: screenX,
          y: screenY
        });
      }
    }
  }

  // Location markers for current state
  const activeLocations = selectedState === 'Sikkim' ? SIKKIM_LOCATIONS : ASSAM_LOCATIONS;

  // Landslide hazard zones for current state
  const stateHazardZones = LANDSLIDE_HAZARD_ZONES.filter(
    hz => hz.state.toLowerCase() === selectedState.toLowerCase()
  );

  // Screen coordinates of high alert hotspots for active state
  const dikchuHotspotScreen = latLngToScreen(27.398, 88.535, centerLat, centerLng, zoom, viewSize.width, viewSize.height);
  const singtamHotspotScreen = latLngToScreen(27.234, 88.498, centerLat, centerLng, zoom, viewSize.width, viewSize.height);
  const haflongHotspotScreen = latLngToScreen(25.1764, 93.0238, centerLat, centerLng, zoom, viewSize.width, viewSize.height);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-full select-none overflow-hidden bg-[#E5E3DF] cursor-grab active:cursor-grabbing font-sans"
    >
      {/* 1. REAL OPENSTREETMAP BASEMAP TILES */}
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
              filter: 'contrast(1.05) saturate(1.1)'
            }}
          />
        ))}
      </div>

      {/* 2. VECTOR OVERLAYS (Red High Alert Zones, Rivers, Highways, Risk Areas) */}
      <svg
        className="absolute inset-0 pointer-events-none w-full h-full"
        style={{ width: viewSize.width, height: viewSize.height }}
      >
        <defs>
          {/* Proper SVG Gradient Definitions for Translucent Weather Radar & Alerts */}
          <radialGradient id="rainRadarGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#DC2626" stopOpacity="0.45" />
            <stop offset="35%" stopColor="#EA580C" stopOpacity="0.30" />
            <stop offset="70%" stopColor="#10B981" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
          </radialGradient>

          <radialGradient id="redHighAlertGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#DC2626" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#EF4444" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#DC2626" stopOpacity="0.0" />
          </radialGradient>
        </defs>

        {/* State Boundary Outline */}
        {selectedState === 'Sikkim' && (
          <polygon
            points={[
              latLngToScreen(27.08, 88.006, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.42, 88.08, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.85, 88.25, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(28.12, 88.55, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.90, 88.88, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.35, 88.75, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.10, 88.58, centerLat, centerLng, zoom, viewSize.width, viewSize.height)
            ].map(p => `${p.x},${p.y}`).join(' ')}
            fill="#167F78"
            fillOpacity="0.06"
            stroke="#167F78"
            strokeWidth="2.5"
            strokeDasharray="6 3"
          />
        )}

        {selectedState === 'Assam' && (
          <polygon
            points={[
              latLngToScreen(26.20, 89.85, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(26.65, 90.50, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(26.90, 91.80, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.00, 93.20, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.50, 94.60, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.80, 95.80, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.20, 96.00, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(26.50, 95.00, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(25.80, 93.80, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(25.00, 93.20, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(24.50, 92.80, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(25.00, 92.40, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(25.80, 91.50, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(25.90, 90.40, centerLat, centerLng, zoom, viewSize.width, viewSize.height)
            ].map(p => `${p.x},${p.y}`).join(' ')}
            fill="#587A68"
            fillOpacity="0.06"
            stroke="#587A68"
            strokeWidth="2.5"
            strokeDasharray="6 3"
          />
        )}

        {/* ------------------------------------------------------------- */}
        {/* DYNAMIC STATE LANDSLIDE HAZARD ZONES (SIKKIM & ASSAM 4-LEVELS) */}
        {/* ------------------------------------------------------------- */}
        {activeLayers.risk_heatmap && stateHazardZones.map((hz) => {
          const isSelected = selectedZone?.id === hz.id || selectedZone?.name?.includes(hz.name);
          const colorHex = getRiskColor(hz.riskScorePct);
          const isCritical = hz.threatLevel === 'CRITICAL';
          const isHigh = hz.threatLevel === 'HIGH';

          // Convert polygon coords [lng1, lat1, lng2, lat2, ...] to screen points
          const points: { x: number; y: number }[] = [];
          for (let i = 0; i < hz.polygonCoords.length; i += 2) {
            const lng = hz.polygonCoords[i];
            const lat = hz.polygonCoords[i + 1];
            points.push(latLngToScreen(lat, lng, centerLat, centerLng, zoom, viewSize.width, viewSize.height));
          }
          const ptsString = points.map(p => `${p.x},${p.y}`).join(' ');
          const centerScreen = latLngToScreen(hz.centerLat, hz.centerLng, centerLat, centerLng, zoom, viewSize.width, viewSize.height);

          return (
            <g key={hz.id}>
              {(isCritical || isHigh) && (
                <circle
                  cx={centerScreen.x}
                  cy={centerScreen.y}
                  r={zoom > 9 ? (isCritical ? "54" : "36") : (isCritical ? "28" : "18")}
                  fill="url(#redHighAlertGlow)"
                />
              )}
              <polygon
                points={ptsString}
                fill={colorHex}
                fillOpacity={isSelected ? 0.50 : (isCritical ? 0.42 : isHigh ? 0.35 : 0.22)}
                stroke={colorHex}
                strokeWidth={isSelected ? 3.0 : 2.0}
                strokeDasharray={isCritical ? '5 2' : (isHigh ? '4 2' : undefined)}
              />
            </g>
          );
        })}

        {/* River Vector Lines (Teesta & Brahmaputra) */}
        {selectedState === 'Sikkim' && (
          <path
            d={[
              latLngToScreen(27.80, 88.60, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.425, 88.542, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.398, 88.535, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.345, 88.528, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.284, 88.512, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.234, 88.498, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.176, 88.532, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.092, 88.455, centerLat, centerLng, zoom, viewSize.width, viewSize.height)
            ].reduce((acc, curr, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`, '')}
            fill="none"
            stroke="#2563EB"
            strokeWidth={zoom > 9 ? "4" : "2"}
            strokeOpacity="0.8"
          />
        )}

        {selectedState === 'Assam' && (
          <path
            d={[
              latLngToScreen(27.80, 95.50, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.20, 94.80, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(26.70, 93.80, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(26.30, 92.80, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(26.15, 91.70, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(26.10, 90.60, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(25.90, 89.80, centerLat, centerLng, zoom, viewSize.width, viewSize.height)
            ].reduce((acc, curr, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`, '')}
            fill="none"
            stroke="#1D4ED8"
            strokeWidth={zoom > 8 ? "4.5" : "2.5"}
            strokeOpacity="0.75"
          />
        )}

        {/* NH-10 Highway Corridor (Sikkim) */}
        {selectedState === 'Sikkim' && activeLayers.roads && (
          <path
            d={[
              latLngToScreen(26.727, 88.435, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.176, 88.532, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.234, 88.498, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.331, 88.613, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.398, 88.535, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.510, 88.520, centerLat, centerLng, zoom, viewSize.width, viewSize.height)
            ].reduce((acc, curr, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`, '')}
            fill="none"
            stroke="#DC2626"
            strokeWidth={zoom > 9 ? "3.5" : "2"}
            strokeDasharray="5 3"
          />
        )}

        {/* NH-717A Pakyong Alternative Bypass */}
        {selectedState === 'Sikkim' && activeLayers.roads && (
          <path
            d={[
              latLngToScreen(27.176, 88.532, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.205, 88.560, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.250, 88.590, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(27.331, 88.613, centerLat, centerLng, zoom, viewSize.width, viewSize.height)
            ].reduce((acc, curr, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`, '')}
            fill="none"
            stroke="#10B981"
            strokeWidth="3"
            strokeDasharray="4 2"
          />
        )}

        {/* NH-27 Corridor (Assam) */}
        {selectedState === 'Assam' && activeLayers.roads && (
          <path
            d={[
              latLngToScreen(26.144, 91.736, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(26.000, 92.500, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(25.500, 92.900, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(25.176, 93.024, centerLat, centerLng, zoom, viewSize.width, viewSize.height),
              latLngToScreen(24.833, 92.798, centerLat, centerLng, zoom, viewSize.width, viewSize.height)
            ].reduce((acc, curr, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`, '')}
            fill="none"
            stroke="#DC2626"
            strokeWidth={zoom > 8 ? "3.5" : "2"}
            strokeDasharray="5 3"
          />
        )}

        {/* Precipitation Radar Overlay (Using valid URL gradient) */}
        {activeLayers.precipitation && (
          <circle
            cx={latLngToScreen(selectedState === 'Sikkim' ? 27.35 : 25.25, selectedState === 'Sikkim' ? 88.55 : 93.0, centerLat, centerLng, zoom, viewSize.width, viewSize.height).x}
            cy={latLngToScreen(selectedState === 'Sikkim' ? 27.35 : 25.25, selectedState === 'Sikkim' ? 88.55 : 93.0, centerLat, centerLng, zoom, viewSize.width, viewSize.height).y}
            r={zoom * 15}
            fill="url(#rainRadarGrad)"
          />
        )}
      </svg>

      {/* 3. INTERACTIVE GEOGRAPHIC LABELS, HIGH ALERT BADGES & PINS */}
      <div className="absolute inset-0 pointer-events-auto">
        {/* Dynamic Interactive Risk Zone Badges & Hotspot Markers */}
        {activeLayers.risk_heatmap && stateHazardZones.map((hz) => {
          const centerPos = latLngToScreen(hz.centerLat, hz.centerLng, centerLat, centerLng, zoom, viewSize.width, viewSize.height);
          if (
            centerPos.x < -100 ||
            centerPos.x > viewSize.width + 100 ||
            centerPos.y < -100 ||
            centerPos.y > viewSize.height + 100
          ) {
            return null;
          }

          const colorHex = getRiskColor(hz.riskScorePct);
          const isSelected = selectedZone?.id === hz.id || selectedZone?.name?.includes(hz.name);
          const isCritical = hz.threatLevel === 'CRITICAL';

          const calc = InterpretableRiskEngine.evaluateRisk({
            zoneId: hz.id,
            zoneName: hz.name,
            rainfall_1h_mm: hz.rainfall1hMm,
            rainfall_72h_mm: hz.rainfall72hMm,
            slope_deg: hz.slopeAngleDeg,
            soil_moisture_pct: hz.soilMoisturePct,
            historical_events_5y: hz.historicalEvents5y,
            lithology: hz.geology,
            state: hz.state,
            district: hz.district,
            population_exposed: hz.populationExposed,
            villages_exposed: hz.villagesExposed,
            roads_affected: hz.roadsAffected,
            threatened_bridges: hz.threatenedBridges,
            critical_facilities: hz.criticalFacilities
          });

          const zoneData: RiskZone = zones?.find(z => z.id === hz.id || z.name?.includes(hz.name.split(' ')[0])) || {
            id: hz.id,
            name: hz.name,
            state: hz.state,
            district: hz.district,
            lat: hz.centerLat,
            lng: hz.centerLng,
            elevation_m: hz.state === 'Assam' ? 680 : 1240,
            slope_deg: hz.slopeAngleDeg,
            aspect: hz.state === 'Assam' ? 'South-East (145°)' : 'South-West (220°)',
            curvature: -0.15,
            lithology: hz.geology,
            soil_type: hz.state === 'Assam' ? 'Clayey Silt Colluvium' : 'Gravelly Sandy Loam',
            soil_moisture_pct: hz.soilMoisturePct,
            rainfall_1h_mm: hz.rainfall1hMm,
            rainfall_24h_mm: hz.rainfall1hMm * 3.5,
            rainfall_72h_mm: hz.rainfall72hMm,
            historical_events_5y: hz.historicalEvents5y,
            landslide_probability: calc.riskScore / 100,
            risk_trend: calc.riskTrend,
            previous_probability: Math.max(0, (calc.riskScore - 6) / 100),
            confidence_status: 'DEMONSTRATION' as const,
            risk_level: calc.riskLevel,
            exposure_score: calc.exposureScore / 100,
            vulnerability_score: calc.exposureScore / 100,
            impact_priority: calc.responsePriority as any,
            impact_priority_score: calc.responsePriorityScore,
            projected_3h_expansion_pct: calc.riskScore >= 60 ? 32 : 12,
            population_exposed: hz.populationExposed,
            villages_exposed: hz.villagesExposed,
            roads_affected: hz.roadsAffected,
            critical_facilities_affected: hz.criticalFacilities,
            threatened_bridges: hz.threatenedBridges,
            exposure_record: calc.exposureRecord,
            connectivity_importance: (calc.riskScore >= 75 ? 'CRITICAL' : calc.riskScore >= 50 ? 'HIGH' : 'MODERATE') as 'CRITICAL' | 'HIGH' | 'MODERATE',
            potential_isolation: (calc.riskScore >= 60 ? 'HIGH' : 'LOW') as 'HIGH' | 'MODERATE' | 'LOW',
            key_assets: hz.threatenedBridges.length > 0 ? [hz.roadsAffected[0], hz.threatenedBridges[0]] : hz.roadsAffected,
            provenance: 'SYNTHETIC' as const,
            risk_drivers_explanation: {
              disclaimer: 'Interpretable multi-factor risk model (SIH26001)',
              rainfall_contribution_pct: calc.factorBreakdown.find(f => f.id === 'F-RAIN')?.percentageOfTotal || 38,
              slope_contribution_pct: calc.factorBreakdown.find(f => f.id === 'F-SLOPE')?.percentageOfTotal || 29,
              soil_moisture_contribution_pct: calc.factorBreakdown.find(f => f.id === 'F-SOIL')?.percentageOfTotal || 18,
              historical_landslide_pct: calc.factorBreakdown.find(f => f.id === 'F-HIST')?.percentageOfTotal || 9,
              lithology_contribution_pct: calc.factorBreakdown.find(f => f.id === 'F-LITHO')?.percentageOfTotal || 6,
              critical_trigger: hz.triggerMechanism
            },
            recommended_actions: [
              'Geotechnical field inspection recommended',
              'Verify slope drainage and sensor telemetry'
            ]
          };

          const handleZoneClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            onSelectZone?.(zoneData);
            onInspectZone?.(zoneData);
          };

          return (
            <div
              key={hz.id}
              onClick={handleZoneClick}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-transform hover:scale-110 z-30 ${isSelected ? 'scale-110' : ''}`}
              style={{ left: `${centerPos.x}px`, top: `${centerPos.y - 20}px` }}
              title={`Click to inspect ${hz.name}`}
            >
              <div
                className="px-2.5 py-0.5 rounded-full text-white font-mono font-bold text-[10px] shadow-lg border border-white flex items-center space-x-1"
                style={{ backgroundColor: colorHex }}
              >
                {isCritical && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
                <span>{hz.riskScorePct}% {hz.threatLevel}</span>
              </div>
              <div className="mt-0.5 px-1.5 py-0.2 rounded bg-black/85 text-white font-medium text-[9px] shadow border border-white/20 whitespace-nowrap">
                {hz.name.split(' ')[0]} ({hz.district})
              </div>
            </div>
          );
        })}

        {/* City and Settlement Markers */}
        {activeLocations.map(loc => {
          const screenPos = latLngToScreen(loc.lat, loc.lng, centerLat, centerLng, zoom, viewSize.width, viewSize.height);

          if (
            screenPos.x < -100 ||
            screenPos.x > viewSize.width + 100 ||
            screenPos.y < -100 ||
            screenPos.y > viewSize.height + 100
          ) {
            return null;
          }

          const isHotspot = loc.type === 'HOTSPOT';
          const isCapital = loc.type === 'CAPITAL';

          return (
            <div
              key={loc.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-transform hover:scale-105"
              style={{ left: `${screenPos.x}px`, top: `${screenPos.y}px` }}
            >
              {isHotspot ? (
                <>
                  <div className="w-4 h-4 rounded-full bg-[#DC2626] border-2 border-white relative flex items-center justify-center shadow-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <div className="mt-1 px-2.5 py-0.5 rounded-md bg-[#172126] text-white font-bold text-xs shadow-md border border-[#DC2626] flex items-center space-x-1">
                    <span className="text-[#EF4444]">●</span>
                    <span>{loc.name}</span>
                  </div>
                  {zoom > 8 && (
                    <span className="text-[9px] font-mono text-[#FED7AA] bg-black/85 px-1.5 py-0.2 rounded mt-0.5 border border-[#DC2626]/30">
                      {loc.desc}
                    </span>
                  )}
                </>
              ) : isCapital ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full bg-[#167F78] border-2 border-white shadow-md" />
                  <div className="mt-0.5 px-2 py-0.5 rounded bg-[#FAF8F1] text-[#172126] font-bold text-[11px] shadow border border-[#D7DEDC]">
                    ★ {loc.name}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#374151] border border-white shadow-sm" />
                  {(zoom > 7 || loc.type === 'DISTRICT') && (
                    <div className="mt-0.5 px-1.5 py-0.2 rounded bg-[#FAF8F1]/95 text-[#172126] font-semibold text-[10px] shadow-sm border border-[#D7DEDC]">
                      {loc.name}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Real-time Highway Blockage Checkpoints */}
        {selectedState === 'Sikkim' && activeLayers.roads && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-start z-20"
            style={{
              left: `${dikchuHotspotScreen.x - 30}px`,
              top: `${dikchuHotspotScreen.y + 24}px`
            }}
          >
            <div className="px-2 py-0.5 rounded bg-[#DC2626] text-white font-mono font-bold text-[10px] shadow border border-white/40">
              ⛔ NH-10 KM 19 BLOCKED
            </div>
            <span className="text-[9px] font-mono text-[#FED7AA] bg-black/85 px-1 rounded">Colluvial Slump</span>
          </div>
        )}

        {selectedState === 'Assam' && activeLayers.roads && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-start z-20"
            style={{
              left: `${haflongHotspotScreen.x - 25}px`,
              top: `${haflongHotspotScreen.y + 24}px`
            }}
          >
            <div className="px-2 py-0.5 rounded bg-[#F59E0B] text-black font-mono font-bold text-[10px] shadow border border-black/20">
              ⚠️ NH-27 Single-Lane Convoy
            </div>
          </div>
        )}
      </div>

      {/* 4. OFFICIAL OPENSTREETMAP ATTRIBUTION TAG (Required) */}
      <div className="absolute bottom-1 right-2 z-30 bg-[#FAF8F1]/90 border border-[#D7DEDC] px-2 py-0.5 rounded text-[10px] font-mono text-[#667579] shadow-sm pointer-events-auto">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="text-[#167F78] underline hover:text-[#136E68]">OpenStreetMap contributors</a>
      </div>
    </div>
  );
};

export default OpenStreetMapViewer;
