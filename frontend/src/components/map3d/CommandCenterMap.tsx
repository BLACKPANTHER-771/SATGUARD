import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import {
  Layers,
  Globe2,
  Mountain,
  Shield,
  Activity,
  AlertTriangle,
  Droplets,
  TrendingUp,
  Building,
  Plus,
  Minus,
  RotateCcw,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Navigation,
  CloudRain,
  Wind,
  Compass,
  MapPin,
  Route,
  Radio,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react';
import { RiskZone } from '../../types';
import {
  NE_STATE_BOUNDARIES,
  MAJOR_CITIES_DATA,
  MAJOR_RIVERS_DATA,
  HIGHWAYS_DATA,
  CRITICAL_INFRA_DATA
} from '../../data/command-centre/geographicData';
import {
  RAINFALL_RADAR_CELLS,
  RegionalWeatherReport,
  getWeatherDataForZone
} from '../../data/command-centre/weatherData';
import {
  LANDSLIDE_HAZARD_ZONES,
  FLOOD_HAZARD_ZONES,
  ROAD_BLOCKAGE_INCIDENTS
} from '../../data/command-centre/hazardData';
import {
  REGIONAL_CAMERA_PRESETS,
  CameraTarget
} from '../../data/command-centre/regionHierarchy';
import { WeatherProviderOrchestrator } from '../../services/weatherProviderOrchestrator';
import { getRiskColor, getRiskLevel } from '../../services/riskEngine';

interface CommandCenterMapProps {
  zones: RiskZone[];
  selectedZone: RiskZone;
  onSelectZone: (zone: RiskZone) => void;
  timeOffset: number;
  className?: string;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onSelectFeature?: (featureType: string, featureId: string) => void;
}

export type BaseMapStyle = 'satellite' | 'carto' | 'topo' | 'dark';
export type PerspectiveMode = '3d_oblique' | '2d_nadir';
export type ZoomLevelName = 'INDIA' | 'NORTHEAST' | 'SIKKIM' | 'ASSAM' | 'MEGHALAYA' | 'ARUNACHAL' | 'TARGET';
export type InSARMode = 'SAR' | 'COHERENCE' | 'DISPLACEMENT';

export const CommandCenterMap: React.FC<CommandCenterMapProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  timeOffset,
  className = '',
  isFullScreen = false,
  onToggleFullScreen,
  onSelectFeature
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const baseImageryLayerRef = useRef<Cesium.ImageryLayer | null>(null);

  // Active view state
  const [activeZoomLevel, setActiveZoomLevel] = useState<ZoomLevelName>('INDIA');
  const [baseMapStyle, setBaseMapStyle] = useState<BaseMapStyle>('carto');
  const [perspective, setPerspective] = useState<PerspectiveMode>('2d_nadir');
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);
  const [isWeatherPillOpen, setIsWeatherPillOpen] = useState(true);
  const [isLegendExpanded, setIsLegendExpanded] = useState(true);

  // Live weather report state
  const [currentWeather, setCurrentWeather] = useState<RegionalWeatherReport>(
    getWeatherDataForZone(selectedZone?.id, selectedZone?.state)
  );
  const [isLiveWeather, setIsLiveWeather] = useState<boolean>(true);
  const [weatherSourceLabel, setWeatherSourceLabel] = useState<string>('Live Meteorological Telemetry');

  // Active layer toggles
  const [activeLayers, setActiveLayers] = useState({
    weatherRadar: true,
    landslideHazards: true,
    floodZones: true,
    roads: true,
    infrastructure: true,
    rivers: true,
    boundaries: true,
    cities: true
  });

  // Entity groups storage for clean updates & error isolation
  const entitiesRef = useRef<{
    boundaries: Cesium.Entity[];
    cities: Cesium.Entity[];
    rivers: Cesium.Entity[];
    roads: Cesium.Entity[];
    infrastructure: Cesium.Entity[];
    landslides: Cesium.Entity[];
    floods: Cesium.Entity[];
    blockages: Cesium.Entity[];
    radar: Cesium.Entity[];
  }>({
    boundaries: [],
    cities: [],
    rivers: [],
    roads: [],
    infrastructure: [],
    landslides: [],
    floods: [],
    blockages: [],
    radar: []
  });

  // 1. Fetch live meteorological weather data whenever selectedZone changes
  useEffect(() => {
    let isCancelled = false;

    const fetchWeather = async () => {
      const lat = selectedZone?.lat || 27.3389;
      const lng = selectedZone?.lng || 88.6065;
      const zoneId = selectedZone?.id || 'sikkim-nh10-dikchu';
      const zoneName = selectedZone?.name || 'Dikchu-Singtam';
      const stateName = selectedZone?.state || 'Sikkim';

      const res = await WeatherProviderOrchestrator.getRegionalWeatherReport(lat, lng, zoneId, zoneName, stateName, selectedZone?.district);
      if (!isCancelled) {
        setCurrentWeather(res.report);
        setIsLiveWeather(res.isLive);
        setWeatherSourceLabel(res.errorStatus || 'Live Meteorological Telemetry');
      }
    };

    fetchWeather();

    return () => {
      isCancelled = true;
    };
  }, [selectedZone?.id, selectedZone?.lat, selectedZone?.lng, selectedZone?.name, selectedZone?.state]);

  // High-Resolution Smooth Imagery Provider Factory (maximumLevel capped to 17 to prevent grey 'no data' tiles and enable smooth bilinear upscaling/blur on deep zoom)
  const createImageryProvider = (style: BaseMapStyle): Cesium.ImageryProvider => {
    try {
      if (style === 'carto') {
        // High-Resolution World Topographic Map
        return new Cesium.UrlTemplateImageryProvider({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
          credit: new Cesium.Credit('Esri World Topographic Map'),
          maximumLevel: 17
        });
      }
      if (style === 'topo') {
        // Street / Regional Topo
        return new Cesium.UrlTemplateImageryProvider({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
          credit: new Cesium.Credit('Esri Street Map'),
          maximumLevel: 17
        });
      }
      if (style === 'dark') {
        // Dark Gray Canvas
        return new Cesium.UrlTemplateImageryProvider({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          credit: new Cesium.Credit('Esri Dark Gray Canvas'),
          maximumLevel: 16
        });
      }
      // Satellite (Esri World Imagery)
      return new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: new Cesium.Credit('Esri World Imagery'),
        maximumLevel: 17
      });
    } catch {
      return new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 17
      });
    }
  };

  // Switch Base Map Style safely
  const handleSwitchBaseMap = (style: BaseMapStyle) => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    try {
      const viewer = viewerRef.current;
      const newProvider = createImageryProvider(style);
      if (baseImageryLayerRef.current) {
        viewer.imageryLayers.remove(baseImageryLayerRef.current, true);
      }
      const newLayer = viewer.imageryLayers.addImageryProvider(newProvider, 0);
      baseImageryLayerRef.current = newLayer;
      setBaseMapStyle(style);
    } catch (err) {
      console.warn('Command Center base map switch error:', err);
    }
  };

  // 2. INITIALIZE CESIUM VIEWER AT FULL INDIA SCALE
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Configure Cesium Ion Token from environment variable without demo token fallback
      const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
      if (ionToken && ionToken.trim() !== '') {
        Cesium.Ion.defaultAccessToken = ionToken;
      } else {
        Cesium.Ion.defaultAccessToken = '';
      }

      const provider = createImageryProvider('carto');

      const viewer = new Cesium.Viewer(containerRef.current, {
        baseLayer: new Cesium.ImageryLayer(provider),
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        navigationInstructionsInitiallyVisible: false,
        shadows: false,
        shouldAnimate: true
      });

      viewerRef.current = viewer;
      baseImageryLayerRef.current = viewer.imageryLayers.get(0);

      // Clean operational GIS styling
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#EFE9DA');
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#11191D');
      viewer.scene.globe.enableLighting = false;
      viewer.scene.globe.showGroundAtmosphere = false;
      viewer.scene.globe.loadingDescendantLimit = 250;

      // DEFAULT CAMERA: PROMINENT FULL INDIA VIEW (Subcontinent Centered)
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(82.50, 22.20, 3100000),
        orientation: {
          heading: 0,
          pitch: Cesium.Math.toRadians(-89.9),
          roll: 0.0
        },
        duration: 1.2
      });

      // Click event handler for picking hazard zones and POIs
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

      handler.setInputAction((click: any) => {
        if (!viewer || viewer.isDestroyed()) return;

        const pickedObject = viewer.scene.pick(click.position);
        if (Cesium.defined(pickedObject) && pickedObject.id) {
          const entity = pickedObject.id;
          const props = entity.properties?.getValue ? entity.properties.getValue(Cesium.JulianDate.now()) : null;

          if (props?.type === 'HAZARD_ZONE' && props.zoneId) {
            const match = zones.find(z => z.id === props.zoneId);
            if (match) {
              onSelectZone(match);
              flyToTarget('TARGET', match);
            }
          } else if (props?.type === 'CITY' && props.cityId) {
            if (onSelectFeature) onSelectFeature('CITY', props.cityName);
          } else if (props?.type === 'INFRA' && props.infraId) {
            if (onSelectFeature) onSelectFeature('INFRA', props.infraName);
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      // Render all operational layers
      renderAllOperationalLayers(viewer);

      return () => {
        handler.destroy();
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }
      };
    } catch (err) {
      console.error('Failed to initialize Command Center Map viewer:', err);
    }
  }, []);

  // 3. RENDER ALL OPERATIONAL LAYERS
  const renderAllOperationalLayers = useCallback((viewer: Cesium.Viewer) => {
    if (!viewer || viewer.isDestroyed()) return;

    // A. STATE BOUNDARIES & AOI
    try {
      entitiesRef.current.boundaries.forEach(e => viewer.entities.remove(e));
      entitiesRef.current.boundaries = [];

      const bounds: Cesium.Entity[] = [];

      // Northeast 8 States Outlines & AOI Shading (without heavy national outline)
      Object.entries(NE_STATE_BOUNDARIES).forEach(([_, state]) => {
        const statePoly = viewer.entities.add({
          name: `${state.name} State AOI`,
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(state.coords),
            material: Cesium.Color.fromCssColorString(state.color).withAlpha(0.08),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString(state.color).withAlpha(0.85),
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          },
          properties: { type: 'STATE_BORDER', stateCode: state.code, stateName: state.name }
        });
        bounds.push(statePoly);
      });

      entitiesRef.current.boundaries = bounds;
    } catch (err) {
      console.warn('Boundaries layer render error:', err);
    }

    // B. MAJOR CITIES & REGIONAL HUBS
    try {
      entitiesRef.current.cities.forEach(e => viewer.entities.remove(e));
      entitiesRef.current.cities = [];

      const cities: Cesium.Entity[] = [];
      MAJOR_CITIES_DATA.forEach(city => {
        const isNE = city.region === 'NORTHEAST';
        const isSelected = selectedZone?.district?.toLowerCase().includes(city.name.toLowerCase());

        const cEnt = viewer.entities.add({
          name: city.name,
          position: Cesium.Cartesian3.fromDegrees(city.lng, city.lat, 20),
          point: {
            pixelSize: city.isCapital ? 9 : 6,
            color: isSelected
              ? Cesium.Color.fromCssColorString('#C95050')
              : (isNE ? Cesium.Color.fromCssColorString('#167F78') : Cesium.Color.fromCssColorString('#397FA8')),
            outlineColor: Cesium.Color.fromCssColorString('#FAF8F1'),
            outlineWidth: 2,
            distanceDisplayCondition: isNE
              ? new Cesium.DistanceDisplayCondition(0, 4500000)
              : new Cesium.DistanceDisplayCondition(0, 5000000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          label: {
            text: city.name,
            font: city.isCapital ? 'bold 11px sans-serif' : '10px sans-serif',
            fillColor: Cesium.Color.fromCssColorString('#172126'),
            outlineColor: Cesium.Color.fromCssColorString('#FAF8F1'),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -14),
            distanceDisplayCondition: city.isCapital
              ? new Cesium.DistanceDisplayCondition(0, 3000000)
              : new Cesium.DistanceDisplayCondition(0, 800000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          properties: { type: 'CITY', cityId: city.id, cityName: city.name }
        });
        cities.push(cEnt);
      });
      entitiesRef.current.cities = cities;
    } catch (err) {
      console.warn('Cities layer render error:', err);
    }

    // C. MAJOR RIVERS (Brahmaputra, Teesta, Barak, Ganga)
    try {
      entitiesRef.current.rivers.forEach(e => viewer.entities.remove(e));
      entitiesRef.current.rivers = [];

      const rivers: Cesium.Entity[] = [];
      MAJOR_RIVERS_DATA.forEach(riv => {
        let colorHex = '#397FA8';
        if (riv.flowSeverity === 'DANGER_LEVEL') colorHex = '#2563EB';

        const rEnt = viewer.entities.add({
          name: riv.name,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(riv.coords),
            width: riv.width,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.22,
              color: Cesium.Color.fromCssColorString(colorHex).withAlpha(0.9)
            }),
            clampToGround: true,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 4500000)
          }
        });
        rivers.push(rEnt);
      });
      entitiesRef.current.rivers = rivers;
    } catch (err) {
      console.warn('Rivers layer render error:', err);
    }

    // D. HIGHWAYS & CORRIDORS (Status-Coded)
    try {
      entitiesRef.current.roads.forEach(e => viewer.entities.remove(e));
      entitiesRef.current.roads = [];

      const roads: Cesium.Entity[] = [];
      HIGHWAYS_DATA.forEach(hwy => {
        let colorHex = '#587A68';
        if (hwy.status === 'WATCH') colorHex = '#C58A24';
        else if (hwy.status === 'AT_RISK') colorHex = '#EA580C';
        else if (hwy.status === 'BLOCKED') colorHex = '#DC2626';

        const hEnt = viewer.entities.add({
          name: `${hwy.code} (${hwy.status})`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(hwy.coords),
            width: hwy.status === 'BLOCKED' ? 5.5 : 4.0,
            material: Cesium.Color.fromCssColorString(colorHex).withAlpha(0.95),
            clampToGround: true,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2200000)
          }
        });
        roads.push(hEnt);
      });
      entitiesRef.current.roads = roads;
    } catch (err) {
      console.warn('Roads layer render error:', err);
    }

    // E. CRITICAL INFRASTRUCTURE POIs
    try {
      entitiesRef.current.infrastructure.forEach(e => viewer.entities.remove(e));
      entitiesRef.current.infrastructure = [];

      const infra: Cesium.Entity[] = [];
      CRITICAL_INFRA_DATA.forEach(poi => {
        let colorHex = '#397FA8';
        let badge = '[Asset]';
        if (poi.type === 'BRIDGE') { colorHex = '#C58A24'; badge = '[Bridge]'; }
        else if (poi.type === 'HOSPITAL') { colorHex = '#C95050'; badge = '[Hospital]'; }
        else if (poi.type === 'POWER') { colorHex = '#167F78'; badge = '[Power]'; }
        else if (poi.type === 'SHELTER') { colorHex = '#587A68'; badge = '[Shelter]'; }
        else if (poi.type === 'DEFENSE') { colorHex = '#8B5A2B'; badge = '[Defense]'; }
        else if (poi.type === 'TUNNEL') { colorHex = '#4F46E5'; badge = '[Tunnel]'; }

        const iEnt = viewer.entities.add({
          name: `${badge} ${poi.name}`,
          position: Cesium.Cartesian3.fromDegrees(poi.lng, poi.lat, 15),
          point: {
            pixelSize: 8,
            color: Cesium.Color.fromCssColorString(colorHex),
            outlineColor: Cesium.Color.fromCssColorString('#FAF8F1'),
            outlineWidth: 2,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          label: {
            text: `${badge} ${poi.name}`,
            font: '10px monospace',
            fillColor: Cesium.Color.fromCssColorString(colorHex),
            outlineColor: Cesium.Color.fromCssColorString('#172126'),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, 16),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 150000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          properties: { type: 'INFRA', infraId: poi.id, infraName: poi.name }
        });
        infra.push(iEnt);
      });
      entitiesRef.current.infrastructure = infra;
    } catch (err) {
      console.warn('Infrastructure layer render error:', err);
    }

    // F. ROAD BLOCKAGE CHECKPOINTS
    try {
      entitiesRef.current.blockages.forEach(e => viewer.entities.remove(e));
      entitiesRef.current.blockages = [];

      const blkEntities: Cesium.Entity[] = [];
      ROAD_BLOCKAGE_INCIDENTS.forEach(blk => {
        const bEnt = viewer.entities.add({
          name: `BLOCKAGE: ${blk.roadName}`,
          position: Cesium.Cartesian3.fromDegrees(blk.lng, blk.lat, 25),
          point: {
            pixelSize: 12,
            color: Cesium.Color.fromCssColorString('#DC2626'),
            outlineColor: Cesium.Color.fromCssColorString('#FAF8F1'),
            outlineWidth: 3,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 800000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          label: {
            text: `⛔ ${blk.highwayCode} BLOCKED`,
            font: 'bold 11px sans-serif',
            fillColor: Cesium.Color.fromCssColorString('#DC2626'),
            outlineColor: Cesium.Color.fromCssColorString('#FAF8F1'),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -18),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 300000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        });
        blkEntities.push(bEnt);
      });
      entitiesRef.current.blockages = blkEntities;
    } catch (err) {
      console.warn('Blockages layer render error:', err);
    }
  }, [selectedZone]);

  // 4. RENDER RAINFALL RADAR LAYER
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    const viewer = viewerRef.current;

    try {
      entitiesRef.current.radar.forEach(e => viewer.entities.remove(e));
      entitiesRef.current.radar = [];

      if (!activeLayers.weatherRadar) return;

      const radarEnts: Cesium.Entity[] = [];

      RAINFALL_RADAR_CELLS.forEach(cell => {
        cell.rings.forEach((ring, idx) => {
          const radiusMeters = cell.radiusKm * 1000 * ring.radiusMultiplier;

          const ringEntity = viewer.entities.add({
            name: `${cell.name} - ${ring.label}`,
            position: Cesium.Cartesian3.fromDegrees(cell.centerLng, cell.centerLat),
            ellipse: {
              semiMajorAxis: radiusMeters,
              semiMinorAxis: radiusMeters * 0.85,
              rotation: Cesium.Math.toRadians(idx * 25),
              material: Cesium.Color.fromCssColorString(ring.colorHex).withAlpha(Math.min(ring.alpha * 0.45, 0.22)),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString(ring.colorHex).withAlpha(0.5),
              outlineWidth: 1.5,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              // Fades out on deep zoom (< 45km) so the full 3D terrain, mountain ridges, and ground infrastructure are clearly visible underneath
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(45000, 4500000)
            }
          });
          radarEnts.push(ringEntity);
        });

        // Center Radar Marker (visible at mid-to-high zoom, hides on close 3D inspection)
        const centerMarker = viewer.entities.add({
          name: `Radar Center: ${cell.name}`,
          position: Cesium.Cartesian3.fromDegrees(cell.centerLng, cell.centerLat, 30),
          point: {
            pixelSize: 6,
            color: Cesium.Color.fromCssColorString('#EF4444'),
            outlineColor: Cesium.Color.fromCssColorString('#FAF8F1'),
            outlineWidth: 2,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(35000, 2500000)
          },
          label: {
            text: `🌧️ ${cell.intensityMmHr} mm/h`,
            font: 'bold 10px monospace',
            fillColor: Cesium.Color.fromCssColorString('#172126'),
            outlineColor: Cesium.Color.fromCssColorString('#FAF8F1'),
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, 14),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(35000, 1200000)
          }
        });
        radarEnts.push(centerMarker);
      });

      entitiesRef.current.radar = radarEnts;
    } catch (err) {
      console.warn('Rainfall radar layer render error:', err);
    }
  }, [activeLayers.weatherRadar, timeOffset]);

  // 5. RENDER LANDSLIDE & FLOOD HAZARDS
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    const viewer = viewerRef.current;

    try {
      entitiesRef.current.landslides.forEach(e => viewer.entities.remove(e));
      entitiesRef.current.landslides = [];

      entitiesRef.current.floods.forEach(e => viewer.entities.remove(e));
      entitiesRef.current.floods = [];

      const mults: Record<number, number> = { 0: 1.0, 30: 1.15, 60: 1.32, 120: 1.48, 180: 1.08 };
      const mult = mults[timeOffset] || 1.0;

      // Landslide Hazard Polygons
      if (activeLayers.landslideHazards) {
        const lsEnts: Cesium.Entity[] = [];

        LANDSLIDE_HAZARD_ZONES.forEach(haz => {
          const isSelected = selectedZone?.id === haz.id || selectedZone?.name?.includes(haz.name);
          const prob = Math.min(haz.riskScorePct * mult, 98);
          const colorHex = getRiskColor(prob);
          const alpha = isSelected ? 0.50 : 0.32;

          const lEnt = viewer.entities.add({
            name: `Landslide Hazard: ${haz.name}`,
            polygon: {
              hierarchy: Cesium.Cartesian3.fromDegreesArray(haz.polygonCoords),
              material: Cesium.Color.fromCssColorString(colorHex).withAlpha(alpha),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString(colorHex).withAlpha(0.95),
              outlineWidth: isSelected ? 3 : 1.5,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1500000)
            },
            properties: { type: 'HAZARD_ZONE', zoneId: haz.id }
          });
          lsEnts.push(lEnt);

          const flagEnt = viewer.entities.add({
            name: `${haz.name} Risk Level`,
            position: Cesium.Cartesian3.fromDegrees(haz.centerLng, haz.centerLat, 20),
            point: {
              pixelSize: isSelected ? 10 : 7,
              color: Cesium.Color.fromCssColorString(colorHex),
              outlineColor: Cesium.Color.fromCssColorString('#FAF8F1'),
              outlineWidth: 2,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1800000)
            },
            label: {
              text: `⚠️ ${Math.round(prob)}% RISK`,
              font: 'bold 10px monospace',
              fillColor: Cesium.Color.fromCssColorString(colorHex),
              outlineColor: Cesium.Color.fromCssColorString('#11191D'),
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -14),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 400000)
            }
          });
          lsEnts.push(flagEnt);
        });

        // Other active zones from props
        zones.forEach(z => {
          if (LANDSLIDE_HAZARD_ZONES.some(lh => lh.id === z.id)) return;
          const isSelected = selectedZone?.id === z.id;
          const prob = Math.min(z.landslide_probability * mult * 100, 98);
          const colorHex = getRiskColor(prob);

          const deltaLng = 0.015;
          const deltaLat = 0.012;
          const coords = [
            z.lng - deltaLng, z.lat - deltaLat,
            z.lng - deltaLng * 0.4, z.lat + deltaLat,
            z.lng + deltaLng, z.lat + deltaLat * 0.8,
            z.lng + deltaLng * 0.7, z.lat - deltaLat
          ];

          const zEnt = viewer.entities.add({
            name: z.name,
            polygon: {
              hierarchy: Cesium.Cartesian3.fromDegreesArray(coords),
              material: Cesium.Color.fromCssColorString(colorHex).withAlpha(isSelected ? 0.45 : 0.25),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString(colorHex).withAlpha(0.9),
              outlineWidth: isSelected ? 2.5 : 1.2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1500000)
            },
            properties: { type: 'HAZARD_ZONE', zoneId: z.id }
          });
          lsEnts.push(zEnt);
        });

        entitiesRef.current.landslides = lsEnts;
      }

      // Flood Inundation Polygons
      if (activeLayers.floodZones) {
        const fldEnts: Cesium.Entity[] = [];
        FLOOD_HAZARD_ZONES.forEach(fld => {
          const fEnt = viewer.entities.add({
            name: fld.name,
            polygon: {
              hierarchy: Cesium.Cartesian3.fromDegreesArray(fld.polygonCoords),
              material: Cesium.Color.fromCssColorString('#0284C7').withAlpha(0.35),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString('#0284C7').withAlpha(0.85),
              outlineWidth: 1.5,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1200000)
            }
          });
          fldEnts.push(fEnt);
        });
        entitiesRef.current.floods = fldEnts;
      }
    } catch (err) {
      console.warn('Hazard layers update error:', err);
    }
  }, [zones, selectedZone, timeOffset, activeLayers.landslideHazards, activeLayers.floodZones]);

  // 6. CAMERA NAVIGATION & ZOOM LEVEL HANDLER
  const flyToTarget = (targetKey: ZoomLevelName, customZone?: RiskZone) => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    const viewer = viewerRef.current;
    setActiveZoomLevel(targetKey);

    try {
      if (targetKey === 'TARGET') {
        const target = customZone || selectedZone;
        const targetPreset = REGIONAL_CAMERA_PRESETS[target.id] || {
          lng: target.lng,
          lat: target.lat,
          height: 10500,
          headingDeg: 12,
          pitchDeg: -38
        };

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(targetPreset.lng, targetPreset.lat - 0.015, targetPreset.height),
          orientation: {
            heading: Cesium.Math.toRadians(targetPreset.headingDeg),
            pitch: Cesium.Math.toRadians(perspective === '2d_nadir' ? -89.9 : targetPreset.pitchDeg),
            roll: 0.0
          },
          duration: 1.4
        });
      } else {
        const preset: CameraTarget = REGIONAL_CAMERA_PRESETS[targetKey] || REGIONAL_CAMERA_PRESETS['INDIA'];
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(preset.lng, preset.lat, preset.height),
          orientation: {
            heading: Cesium.Math.toRadians(preset.headingDeg),
            pitch: Cesium.Math.toRadians(perspective === '2d_nadir' ? -89.9 : preset.pitchDeg),
            roll: 0.0
          },
          duration: 1.4
        });
      }
    } catch (err) {
      console.warn('Camera flyTo error:', err);
    }
  };

  // Toggle 2D / 3D Perspective
  const togglePerspective = (mode: PerspectiveMode) => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    setPerspective(mode);
    const viewer = viewerRef.current;
    const curPos = viewer.camera.positionCartographic;
    const curLng = Cesium.Math.toDegrees(curPos.longitude);
    const curLat = Cesium.Math.toDegrees(curPos.latitude);
    const curHeight = curPos.height;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(curLng, curLat, curHeight),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(mode === '2d_nadir' ? -89.9 : -42.0),
        roll: 0.0
      },
      duration: 1.0
    });
  };

  // Layer Visibility Toggle Helper
  const toggleLayer = (key: keyof typeof activeLayers) => {
    setActiveLayers(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'boundaries') entitiesRef.current.boundaries.forEach(e => { e.show = next.boundaries; });
      if (key === 'cities') entitiesRef.current.cities.forEach(e => { e.show = next.cities; });
      if (key === 'rivers') entitiesRef.current.rivers.forEach(e => { e.show = next.rivers; });
      if (key === 'roads') {
        entitiesRef.current.roads.forEach(e => { e.show = next.roads; });
        entitiesRef.current.blockages.forEach(e => { e.show = next.roads; });
      }
      if (key === 'infrastructure') entitiesRef.current.infrastructure.forEach(e => { e.show = next.infrastructure; });
      if (key === 'landslideHazards') entitiesRef.current.landslides.forEach(e => { e.show = next.landslideHazards; });
      if (key === 'floodZones') entitiesRef.current.floods.forEach(e => { e.show = next.floodZones; });
      if (key === 'weatherRadar') entitiesRef.current.radar.forEach(e => { e.show = next.weatherRadar; });
      return next;
    });
  };

  const handleZoomIn = () => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    const camera = viewerRef.current.camera;
    camera.zoomIn(camera.positionCartographic.height * 0.35);
  };

  const handleZoomOut = () => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    const camera = viewerRef.current.camera;
    camera.zoomOut(camera.positionCartographic.height * 0.45);
  };

  return (
    <div className={`relative w-full h-full bg-[#EFE9DA] select-none overflow-hidden rounded-xl border border-[#D7DEDC] flex flex-col shadow-subtle font-sans ${className}`}>
      {/* 1. CESIUM MAP CANVAS */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 2. TOP-LEFT: HIERARCHICAL ZOOM PRESET CONTROLS */}
      <div className="absolute top-3 left-3 flex flex-col space-y-2 pointer-events-auto z-20 font-sans max-w-[90%]">
        {/* Hierarchical Breadcrumb & Zoom Bar */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF8F1]/95 border border-[#D7DEDC] p-1.5 rounded-xl backdrop-blur-md shadow-panel text-xs">
          <span className="text-[10px] font-mono text-[#667579] font-bold px-1.5 uppercase flex items-center">
            <Globe2 className="w-3.5 h-3.5 mr-1 text-[#167F78]" />
            VIEW:
          </span>

          <button
            onClick={() => flyToTarget('INDIA')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeZoomLevel === 'INDIA'
                ? 'bg-[#167F78] text-[#FAF8F1] shadow-subtle'
                : 'text-[#172126] hover:bg-[#E6EDEB]'
            }`}
          >
            🇮🇳 India (All)
          </button>

          <button
            onClick={() => flyToTarget('NORTHEAST')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeZoomLevel === 'NORTHEAST'
                ? 'bg-[#167F78] text-[#FAF8F1] shadow-subtle'
                : 'text-[#172126] hover:bg-[#E6EDEB]'
            }`}
          >
            🧭 Northeast (NER)
          </button>

          <button
            onClick={() => flyToTarget('SIKKIM')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeZoomLevel === 'SIKKIM'
                ? 'bg-[#167F78] text-[#FAF8F1] shadow-subtle'
                : 'text-[#172126] hover:bg-[#E6EDEB]'
            }`}
          >
            🏔️ Sikkim
          </button>

          <button
            onClick={() => flyToTarget('ASSAM')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeZoomLevel === 'ASSAM'
                ? 'bg-[#167F78] text-[#FAF8F1] shadow-subtle'
                : 'text-[#172126] hover:bg-[#E6EDEB]'
            }`}
          >
            🌿 Assam
          </button>

          <button
            onClick={() => flyToTarget('MEGHALAYA')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeZoomLevel === 'MEGHALAYA'
                ? 'bg-[#167F78] text-[#FAF8F1] shadow-subtle'
                : 'text-[#172126] hover:bg-[#E6EDEB]'
            }`}
          >
            🌧️ Meghalaya
          </button>

          <button
            onClick={() => flyToTarget('ARUNACHAL')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeZoomLevel === 'ARUNACHAL'
                ? 'bg-[#167F78] text-[#FAF8F1] shadow-subtle'
                : 'text-[#172126] hover:bg-[#E6EDEB]'
            }`}
          >
            ⛰️ Arunachal
          </button>

          <button
            onClick={() => flyToTarget('TARGET')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
              activeZoomLevel === 'TARGET'
                ? 'bg-[#C95050] text-[#FAF8F1] shadow-subtle'
                : 'bg-[#C95050]/10 text-[#C95050] hover:bg-[#C95050]/20'
            }`}
          >
            <MapPin className="w-3 h-3" />
            <span>Target: {selectedZone?.name?.split('(')[0] || 'Dikchu-Singtam'}</span>
          </button>
        </div>

        {/* Active Scale & Coordinate Status */}
        <div className="flex items-center space-x-2 bg-[#FAF8F1]/90 border border-[#D7DEDC] px-2.5 py-1 rounded-lg backdrop-blur-md shadow-subtle text-[10px] font-mono text-[#667579] w-fit">
          <span className="font-semibold text-[#172126]">Scale: {activeZoomLevel}</span>
          <span>•</span>
          <span>Lat: {selectedZone?.lat?.toFixed(3)}°N</span>
          <span>Lng: {selectedZone?.lng?.toFixed(3)}°E</span>
          <span>•</span>
          <span className="text-[#167F78] font-semibold">WGS84 EPSG:4326</span>
        </div>
      </div>

      {/* 3. TOP-RIGHT: OPENWEATHER / METEOROLOGICAL HUD */}
      <div className="absolute top-3 right-3 flex flex-col items-end space-y-2 pointer-events-auto z-20 font-sans max-w-sm">
        {isWeatherPillOpen && (
          <div className="bg-[#FAF8F1]/95 border border-[#D7DEDC] rounded-xl p-3 shadow-panel backdrop-blur-md flex flex-col space-y-2 text-xs w-72 animate-fadeIn">
            {/* Header with IMD Warning badge */}
            <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-1.5">
              <div className="flex items-center space-x-1.5">
                <CloudRain className="w-4 h-4 text-[#397FA8]" />
                <span className="font-bold text-[#172126] uppercase text-[11px] truncate max-w-[130px]">
                  {currentWeather.regionName}
                </span>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                currentWeather.warningLevel === 'RED_ALERT'
                  ? 'bg-[#C95050]/15 text-[#C95050] border-[#C95050]/40'
                  : (currentWeather.warningLevel === 'ORANGE_WARNING'
                    ? 'bg-[#C58A24]/15 text-[#C58A24] border-[#C58A24]/40'
                    : 'bg-[#167F78]/15 text-[#167F78] border-[#167F78]/40')
              }`}>
                {currentWeather.warningLevel.replace('_', ' ')}
              </span>
            </div>

            {/* Weather Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col bg-[#E6EDEB]/70 p-1.5 rounded-lg border border-[#D7DEDC]/60">
                <span className="text-[10px] text-[#667579]">Temperature</span>
                <span className="font-mono font-bold text-sm text-[#172126]">
                  {currentWeather.temperatureC}°C
                  <span className="text-[10px] font-normal text-[#667579] ml-1">({currentWeather.feelsLikeC}°C)</span>
                </span>
              </div>

              <div className="flex flex-col bg-[#E6EDEB]/70 p-1.5 rounded-lg border border-[#D7DEDC]/60">
                <span className="text-[10px] text-[#667579]">Rainfall (1h / 24h)</span>
                <span className="font-mono font-bold text-sm text-[#397FA8]">
                  {currentWeather.rainfall1hMm} <span className="text-[10px] font-normal text-[#667579]">/ {currentWeather.rainfall24hMm}mm</span>
                </span>
              </div>

              <div className="flex flex-col bg-[#E6EDEB]/70 p-1.5 rounded-lg border border-[#D7DEDC]/60">
                <span className="text-[10px] text-[#667579]">Humidity & Cloud</span>
                <span className="font-mono font-semibold text-xs text-[#172126]">
                  {currentWeather.humidityPct}% · {currentWeather.cloudCoveragePct}% {currentWeather.cloudCondition}
                </span>
              </div>

              <div className="flex flex-col bg-[#E6EDEB]/70 p-1.5 rounded-lg border border-[#D7DEDC]/60">
                <span className="text-[10px] text-[#667579]">Wind & Pressure</span>
                <span className="font-mono font-semibold text-xs text-[#172126] flex items-center">
                  <Wind className="w-3 h-3 mr-1 text-[#667579]" />
                  {currentWeather.windSpeedKmh} km/h {currentWeather.windDirectionCardinal} · {currentWeather.pressureHpa}hPa
                </span>
              </div>
            </div>

            {/* Weather Advisory */}
            <div className="text-[10px] text-[#667579] bg-[#FAF8F1] p-1.5 rounded border border-[#D7DEDC] leading-tight">
              <strong className="text-[#C95050]">Advisory: </strong>{currentWeather.warningAdvisory}
            </div>

            {/* Data Provenance Badge */}
            <div className="flex items-center justify-between text-[9px] font-mono pt-0.5 border-t border-[#D7DEDC]">
              {isLiveWeather ? (
                <span className="text-[#167F78] font-bold flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#167F78] mr-1 animate-pulse" />
                  LIVE WEATHER (OpenWeather API)
                </span>
              ) : (
                <span className="text-[#C58A24] font-semibold">
                  • SYNTHETIC DEMONSTRATION DATA
                </span>
              )}
              <span className="text-[#667579]">
                {weatherSourceLabel}
              </span>
            </div>
          </div>
        )}

        {/* Base Map & Layer Toggle Bar */}
        <div className="flex items-center space-x-1.5 bg-[#FAF8F1]/95 border border-[#D7DEDC] p-1 rounded-xl shadow-panel backdrop-blur-md text-xs">
          {/* Base Map Selector */}
          <div className="flex items-center space-x-1 bg-[#E6EDEB] p-0.5 rounded-lg border border-[#D7DEDC]">
            <button
              onClick={() => handleSwitchBaseMap('carto')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                baseMapStyle === 'carto' ? 'bg-[#FAF8F1] text-[#167F78] shadow-subtle font-bold' : 'text-[#667579]'
              }`}
            >
              Carto
            </button>
            <button
              onClick={() => handleSwitchBaseMap('satellite')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                baseMapStyle === 'satellite' ? 'bg-[#FAF8F1] text-[#167F78] shadow-subtle font-bold' : 'text-[#667579]'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => handleSwitchBaseMap('topo')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                baseMapStyle === 'topo' ? 'bg-[#FAF8F1] text-[#167F78] shadow-subtle font-bold' : 'text-[#667579]'
              }`}
            >
              Topo
            </button>
            <button
              onClick={() => handleSwitchBaseMap('dark')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                baseMapStyle === 'dark' ? 'bg-[#FAF8F1] text-[#167F78] shadow-subtle font-bold' : 'text-[#667579]'
              }`}
            >
              Dark
            </button>
          </div>

          {/* Perspective 2D/3D */}
          <div className="flex items-center space-x-0.5 bg-[#E6EDEB] p-0.5 rounded-lg border border-[#D7DEDC]">
            <button
              onClick={() => togglePerspective('2d_nadir')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                perspective === '2d_nadir' ? 'bg-[#FAF8F1] text-[#167F78] shadow-subtle' : 'text-[#667579]'
              }`}
            >
              2D
            </button>
            <button
              onClick={() => togglePerspective('3d_oblique')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                perspective === '3d_oblique' ? 'bg-[#FAF8F1] text-[#167F78] shadow-subtle' : 'text-[#667579]'
              }`}
            >
              3D
            </button>
          </div>

          {/* Layer Panel Button */}
          <button
            onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              isLayerPanelOpen ? 'bg-[#167F78] text-[#FAF8F1] border-[#167F78]' : 'bg-[#E6EDEB] text-[#172126] border-[#D7DEDC]'
            }`}
            title="Toggle Layers"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="p-1.5 bg-[#E6EDEB] hover:bg-[#FAF8F1] border border-[#D7DEDC] rounded-lg text-[#172126] transition-colors cursor-pointer shadow-subtle"
              title="Fullscreen"
            >
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Dropdown Layer Toggles Panel */}
        {isLayerPanelOpen && (
          <div className="bg-[#FAF8F1]/95 border border-[#D7DEDC] rounded-xl p-2.5 shadow-panel backdrop-blur-md flex flex-col space-y-1.5 text-xs w-56 animate-fadeIn">
            <span className="text-[10px] font-mono text-[#667579] font-bold uppercase pb-1 border-b border-[#D7DEDC]">
              ACTIVE MAP LAYERS
            </span>

            <label className="flex items-center justify-between cursor-pointer hover:bg-[#E6EDEB] p-1 rounded">
              <span className="text-[#172126] flex items-center">
                <CloudRain className="w-3.5 h-3.5 mr-1.5 text-[#397FA8]" /> Rainfall Radar
              </span>
              <input
                type="checkbox"
                checked={activeLayers.weatherRadar}
                onChange={() => toggleLayer('weatherRadar')}
                className="accent-[#167F78] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:bg-[#E6EDEB] p-1 rounded">
              <span className="text-[#172126] flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-[#C95050]" /> Landslide Hazards
              </span>
              <input
                type="checkbox"
                checked={activeLayers.landslideHazards}
                onChange={() => toggleLayer('landslideHazards')}
                className="accent-[#C95050] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:bg-[#E6EDEB] p-1 rounded">
              <span className="text-[#172126] flex items-center">
                <Droplets className="w-3.5 h-3.5 mr-1.5 text-[#0284C7]" /> Flood Zones
              </span>
              <input
                type="checkbox"
                checked={activeLayers.floodZones}
                onChange={() => toggleLayer('floodZones')}
                className="accent-[#0284C7] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:bg-[#E6EDEB] p-1 rounded">
              <span className="text-[#172126] flex items-center">
                <Route className="w-3.5 h-3.5 mr-1.5 text-[#C58A24]" /> Roads & Blockages
              </span>
              <input
                type="checkbox"
                checked={activeLayers.roads}
                onChange={() => toggleLayer('roads')}
                className="accent-[#C58A24] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:bg-[#E6EDEB] p-1 rounded">
              <span className="text-[#172126] flex items-center">
                <Building className="w-3.5 h-3.5 mr-1.5 text-[#167F78]" /> Critical Infrastructure
              </span>
              <input
                type="checkbox"
                checked={activeLayers.infrastructure}
                onChange={() => toggleLayer('infrastructure')}
                className="accent-[#167F78] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:bg-[#E6EDEB] p-1 rounded">
              <span className="text-[#172126] flex items-center">
                <Droplets className="w-3.5 h-3.5 mr-1.5 text-[#397FA8]" /> Major Rivers
              </span>
              <input
                type="checkbox"
                checked={activeLayers.rivers}
                onChange={() => toggleLayer('rivers')}
                className="accent-[#397FA8] cursor-pointer"
              />
            </label>
          </div>
        )}
      </div>

      {/* 4. RIGHT SIDE (BOTTOM-RIGHT): MULTI-COLORED ZONES KEY & SIMULATION DISCLAIMER */}
      <div className="absolute bottom-3 right-14 flex flex-col space-y-1.5 pointer-events-auto z-20 font-sans max-w-xs sm:max-w-sm">
        <div className="bg-[#FAF8F1]/95 border border-[#D7DEDC] p-2.5 rounded-xl shadow-panel backdrop-blur-md flex flex-col space-y-2 text-xs max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Header & Toggle */}
          <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-1.5 sticky top-0 bg-[#FAF8F1]/95 backdrop-blur-sm z-10">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#397FA8] animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-[#172126] uppercase tracking-wider">
                ZONE KEY & DISCLAIMER
              </span>
            </div>
            <button
              onClick={() => setIsLegendExpanded(!isLegendExpanded)}
              className="text-[#667579] hover:text-[#172126] text-[10px] font-mono flex items-center space-x-0.5 cursor-pointer px-1 py-0.5 rounded hover:bg-[#E6EDEB] transition-colors"
            >
              <span>{isLegendExpanded ? 'HIDE' : 'SHOW KEY'}</span>
              {isLegendExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>

          {isLegendExpanded && (
            <div className="flex flex-col space-y-2 animate-fadeIn">
              {/* 1. Concentric Multi-Colored Rainfall Rings */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-bold text-[#667579] uppercase">
                  Concentric Rainfall Envelopes (Nowcast Radar)
                </span>
                <div className="grid grid-cols-1 gap-1 text-[10px] font-sans">
                  <div className="flex items-center justify-between bg-[#E6EDEB]/70 px-2 py-1 rounded border border-[#D7DEDC]/50">
                    <span className="flex items-center text-[#172126] font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] mr-1.5 border border-[#B91C1C]" />
                      Red Core (Peak Intensity)
                    </span>
                    <span className="font-mono font-bold text-[#C95050] text-[9px]">&gt;50 mm/h (Critical)</span>
                  </div>

                  <div className="flex items-center justify-between bg-[#E6EDEB]/70 px-2 py-1 rounded border border-[#D7DEDC]/50">
                    <span className="flex items-center text-[#172126] font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] mr-1.5 border border-[#D97706]" />
                      Orange / Amber Middle Ring
                    </span>
                    <span className="font-mono font-bold text-[#C58A24] text-[9px]">25–50 mm/h (Surge)</span>
                  </div>

                  <div className="flex items-center justify-between bg-[#E6EDEB]/70 px-2 py-1 rounded border border-[#D7DEDC]/50">
                    <span className="flex items-center text-[#172126] font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] mr-1.5 border border-[#059669]" />
                      Green / Teal Outer Ring
                    </span>
                    <span className="font-mono font-bold text-[#167F78] text-[9px]">10–25 mm/h (Inflow)</span>
                  </div>
                </div>
              </div>

              {/* 2. Geotechnical & Infrastructure Hazard Types */}
              <div className="space-y-1 pt-1 border-t border-[#D7DEDC]">
                <span className="text-[9px] font-mono font-bold text-[#667579] uppercase">
                  Spatial Hazard & Lifeline Layers
                </span>
                <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
                  <span className="flex items-center px-1.5 py-0.5 rounded bg-[#C95050]/10 border border-[#C95050]/30 text-[#C95050] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-sm bg-[#C95050] mr-1" /> Landslide Hazard
                  </span>
                  <span className="flex items-center px-1.5 py-0.5 rounded bg-[#0284C7]/10 border border-[#0284C7]/30 text-[#0284C7] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-sm bg-[#0284C7] mr-1" /> Riverine Flood
                  </span>
                  <span className="flex items-center px-1.5 py-0.5 rounded bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mr-1" /> Road Blockage
                  </span>
                </div>
              </div>

              {/* 3. Mandatory Synthetic Simulation Disclaimer */}
              <div className="bg-[#FAF8F1] border border-[#C58A24]/40 p-2 rounded-lg text-[9px] text-[#667579] leading-relaxed shadow-inner">
                <div className="flex items-center space-x-1 text-[#C58A24] font-bold uppercase mb-0.5">
                  <AlertTriangle className="w-3 h-3 text-[#C58A24] shrink-0" />
                  <span>SIMULATION MODEL DISCLAIMER</span>
                </div>
                <p>
                  Concentric radar rings and multi-coloured hazard polygons represent spatial mathematical simulations generated for demonstration. Operational emergency and evacuation decisions must be corroborated by local DDMA ground truth and IMD/GSI bulletins.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. BOTTOM-RIGHT: NAVIGATION BUTTONS */}
      <div className="absolute bottom-3 right-3 flex flex-col items-center space-y-1.5 z-20 font-sans pointer-events-auto">
        <div className="flex flex-col bg-[#FAF8F1]/95 border border-[#D7DEDC] rounded-xl shadow-panel backdrop-blur-md overflow-hidden text-xs">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-[#E6EDEB] text-[#172126] transition-colors cursor-pointer border-b border-[#D7DEDC]"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-[#E6EDEB] text-[#172126] transition-colors cursor-pointer border-b border-[#D7DEDC]"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => flyToTarget('INDIA')}
            className="p-2 hover:bg-[#E6EDEB] text-[#172126] transition-colors cursor-pointer"
            title="Reset to India View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default CommandCenterMap;
