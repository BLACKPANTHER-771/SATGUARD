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
  Satellite,
  X,
  ChevronDown,
  Building2,
  Compass,
  Eye,
  AlertCircle,
  Radio,
  FileText
} from 'lucide-react';
import { SyntheticRiskEngine } from '../../data/synthetic/engine/syntheticRiskEngine';
import { NERegionCode } from '../../data/synthetic/types';
import { RiskZone } from '../../types';
import { RedZoneInspector } from '../intelligence/RedZoneInspector';

interface SyntheticEarthViewerProps {
  selectedRegion?: NERegionCode;
  onSelectRegion?: (region: NERegionCode) => void;
  timeOffset: number;
  className?: string;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onSelectFeature?: (featureType: string, featureId: string) => void;
}

export type CameraPreset =
  | 'globe'
  | 'india'
  | 'ner'
  | 'state'
  | 'aoi'
  | 'slope';

export type LayerCategory = 'EARTH' | 'STRUCTURES' | 'ENVIRONMENT' | 'RISK' | 'OBSERVATION' | 'RESPONSE';

interface BuildingInspectionData {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  height_m: string;
  hazard_exposure: string;
  nearest_hazard: string;
  nearest_road: string;
  nearest_incident: string;
  is_osm: boolean;
}

export const SyntheticEarthViewer: React.FC<SyntheticEarthViewerProps> = ({
  selectedRegion = 'SIKKIM',
  onSelectRegion,
  timeOffset,
  className = '',
  isFullScreen = false,
  onToggleFullScreen,
  onSelectFeature
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const osmBuildingsTilesetRef = useRef<Cesium.Cesium3DTileset | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const [activePreset, setActivePreset] = useState<CameraPreset>('aoi');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [selectedLayerCat, setSelectedLayerCat] = useState<LayerCategory>('STRUCTURES');
  const [inspectedBuilding, setInspectedBuilding] = useState<BuildingInspectionData | null>(null);
  const [inspectedHazardZone, setInspectedHazardZone] = useState<RiskZone | null>(null);
  const [selectedLocationMenuOpen, setSelectedLocationMenuOpen] = useState(false);
  const [isHealthPanelOpen, setIsHealthPanelOpen] = useState(false);

  // Verified Provider Health States
  const [providerHealth, setProviderHealth] = useState({
    cesiumViewer: 'CONNECTED',
    cesiumAssets: 'CONNECTED',
    cesiumIon: 'NOT CONFIGURED',
    worldTerrain: 'UNAVAILABLE (ELLIPSOID)',
    osmBuildings: 'UNAVAILABLE',
    satelliteImagery: 'CONNECTED',
    copernicusSar: 'SYNTHETIC EVIDENCE',
    weatherTelemetry: 'SYNTHETIC TELEMETRY'
  });

  // 18 Organized GIS Operational Layers
  const [layers, setLayers] = useState({
    // EARTH
    '01_terrain': true,
    '02_base_imagery': true,
    // STRUCTURES
    '03_osm_buildings': true,
    '04_infrastructure': true,
    '05_bridges': true,
    // ENVIRONMENT
    '06_roads': true,
    '07_rivers': true,
    // RISK
    '08_hazard_polygons': true,
    '09_susceptibility': true,
    '10_incidents': true,
    // OBSERVATION
    '11_sentinel1_sar': false,
    '12_sentinel2_optical': false,
    '13_soil_moisture': true,
    '14_rainfall': true,
    // RESPONSE
    '15_blocked_roads': true,
    '16_vulnerable_corridors': true,
    '17_evacuation_routes': true
  });

  const entitiesRef = useRef<{
    stateBoundary: Cesium.Entity | null;
    roads: Cesium.Entity[];
    buildings: Cesium.Entity[];
    rivers: Cesium.Entity[];
    bridges: Cesium.Entity[];
    infrastructure: Cesium.Entity[];
    hazardPolygons: Cesium.Entity[];
    places: Cesium.Entity[];
    incidents: Cesium.Entity[];
    sarSwaths: Cesium.Entity[];
    radarOverlay: Cesium.Entity[];
    soilOverlay: Cesium.Entity[];
    responseRoutes: Cesium.Entity[];
    blockageMarker: Cesium.Entity | null;
    trees: Cesium.Entity[];
    railway: Cesium.Entity[];
  }>({
    stateBoundary: null,
    roads: [],
    buildings: [],
    rivers: [],
    bridges: [],
    infrastructure: [],
    hazardPolygons: [],
    places: [],
    incidents: [],
    sarSwaths: [],
    radarOverlay: [],
    soilOverlay: [],
    responseRoutes: [],
    blockageMarker: null,
    trees: [],
    railway: []
  });

  // 1. INITIALIZE AUTHORITATIVE CESIUM 3D VIEWER
  useEffect(() => {
    isMountedRef.current = true;
    if (!containerRef.current) return;

    let viewer: Cesium.Viewer | null = null;
    let clickHandler: Cesium.ScreenSpaceEventHandler | null = null;

    try {
      // Check Cesium Ion Token
      const rawToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
      const ionToken = typeof rawToken === 'string' && rawToken.trim() !== '' ? rawToken.trim() : '';

      if (ionToken) {
        Cesium.Ion.defaultAccessToken = ionToken;
        setProviderHealth((prev) => ({ ...prev, cesiumIon: 'CONNECTED' }));
      } else {
        Cesium.Ion.defaultAccessToken = '';
        setProviderHealth((prev) => ({ ...prev, cesiumIon: 'NOT CONFIGURED' }));
      }

      // High-Resolution Satellite Imagery Basemap (maximumLevel capped to 17 to prevent grey 'no data' tiles and enable smooth bilinear upscaling/blur on deep zoom)
      const globalImageryProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: new Cesium.Credit('Esri, Maxar, Earthstar Geographics, USDA, USGS'),
        maximumLevel: 17
      });

      // Instantiate Single Authoritative Cesium Viewer
      viewer = new Cesium.Viewer(containerRef.current, {
        baseLayer: new Cesium.ImageryLayer(globalImageryProvider),
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

      // Styling and scene properties for digital twin
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#11191D');
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#11191D');
      viewer.scene.globe.enableLighting = false;
      viewer.scene.globe.showGroundAtmosphere = true;
      viewer.scene.globe.loadingDescendantLimit = 200;
      viewer.scene.globe.depthTestAgainstTerrain = true;
      viewer.scene.verticalExaggeration = 1.35; // Enhance Himalayan vertical relief

      // Camera Controller Navigation Settings
      const controller = viewer.scene.screenSpaceCameraController;
      controller.enableZoom = true;
      controller.enableRotate = true;
      controller.enableTilt = true;
      controller.enableTranslate = true;
      controller.inertiaZoom = 0.82;
      controller.inertiaSpin = 0.82;
      controller.inertiaTranslate = 0.82;

      // A. Load World Terrain with Graceful Catch
      Cesium.createWorldTerrainAsync({ requestWaterMask: true, requestVertexNormals: true })
        .then((terrain) => {
          if (isMountedRef.current && viewerRef.current && !viewerRef.current.isDestroyed()) {
            viewerRef.current.terrainProvider = terrain;
            setProviderHealth((prev) => ({ ...prev, worldTerrain: 'CONNECTED' }));
          }
        })
        .catch((err) => {
          if (isMountedRef.current) {
            console.warn('[Cesium] World Terrain fallback (Ellipsoid baseline active):', err);
            setProviderHealth((prev) => ({ ...prev, worldTerrain: 'UNAVAILABLE (ELLIPSOID)' }));
          }
        });

      // B. Load Cesium OSM 3D Buildings with Graceful Catch
      Cesium.createOsmBuildingsAsync()
        .then((osmBuildings) => {
          if (isMountedRef.current && viewerRef.current && !viewerRef.current.isDestroyed()) {
            osmBuildingsTilesetRef.current = osmBuildings;

            // Restrained Architectural Color Palette
            osmBuildings.style = new Cesium.Cesium3DTileStyle({
              color: {
                conditions: [
                  ["${feature['building']} === 'hospital'", "color('#D97706', 0.95)"],
                  ["${feature['building']} === 'commercial' || ${feature['building']} === 'retail'", "color('#94A3B8', 0.92)"],
                  ["${feature['building']} === 'industrial' || ${feature['building']} === 'warehouse'", "color('#78716C', 0.92)"],
                  ["${feature['building']} === 'school' || ${feature['building']} === 'civic'", "color('#A7F3D0', 0.92)"],
                  ["${feature['building']} === 'residential' || ${feature['building']} === 'apartments'", "color('#E2E8F0', 0.95)"],
                  ["${feature['building']} === 'house'", "color('#F8FAFC', 0.95)"],
                  ["true", "color('#E2E8F0', 0.92)"]
                ]
              }
            });

            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
              viewerRef.current.scene.primitives.add(osmBuildings);
              setProviderHealth((prev) => ({ ...prev, osmBuildings: 'CONNECTED' }));
            }
          }
        })
        .catch((err) => {
          if (isMountedRef.current) {
            console.warn('[Cesium] OSM 3D Buildings unavailable (Ion token optional):', err);
            setProviderHealth((prev) => ({ ...prev, osmBuildings: 'UNAVAILABLE' }));
          }
        });

      // Set Initial Camera Position (Direct Tactical Disaster AOI View at 1150-1180m Altitude)
      const isAssamInit = selectedRegion === 'ASSAM';
      if (isAssamInit) {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(93.0185, 25.1690, 1180),
          orientation: { heading: Cesium.Math.toRadians(35), pitch: Cesium.Math.toRadians(-25), roll: 0.0 },
          duration: 1.2
        });
      } else {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(88.5365, 27.3920, 1150),
          orientation: { heading: Cesium.Math.toRadians(15), pitch: Cesium.Math.toRadians(-26), roll: 0.0 },
          duration: 1.2
        });
      }

      // Interactive Click Picker for Red Zone & Feature Inspection
      clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

      clickHandler.setInputAction((click: any) => {
        if (!viewer || viewer.isDestroyed()) return;

        const pickedObject = viewer.scene.pick(click.position);
        const cartesian = viewer.scene.pickPosition(click.position) || viewer.camera.pickEllipsoid(click.position);

        let clickedLat = 0;
        let clickedLng = 0;
        let clickedHeight = 0;

        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          clickedLng = Cesium.Math.toDegrees(cartographic.longitude);
          clickedLat = Cesium.Math.toDegrees(cartographic.latitude);
          clickedHeight = Math.round(cartographic.height);
        }

        // Case 1: Clicked a Hazard Zone Entity -> Open Red Zone Inspector
        if (Cesium.defined(pickedObject) && pickedObject.id) {
          const entity = pickedObject.id;
          const data = entity.properties?.getValue ? entity.properties.getValue(Cesium.JulianDate.now()) : null;

          if (data?.type === 'HAZARD_ZONE' || data?.type === 'RISK_ZONE') {
            const isAssam = selectedRegion === 'ASSAM';
            const zoneRecord: RiskZone = {
              id: data.id || (isAssam ? 'assam-dima-hasao-haflong' : 'sikkim-nh10-dikchu'),
              name: data.name || entity.name,
              state: isAssam ? 'Assam' : 'Sikkim',
              district: isAssam ? 'Dima Hasao' : 'Pakyong / Gangtok',
              lat: Number(clickedLat.toFixed(4)) || (isAssam ? 25.1764 : 27.3389),
              lng: Number(clickedLng.toFixed(4)) || (isAssam ? 93.0238 : 88.6065),
              elevation_m: clickedHeight || (isAssam ? 680 : 1240),
              slope_deg: isAssam ? 36.2 : 34.8,
              aspect: isAssam ? 'South-East (145°)' : 'South-West (220°)',
              curvature: isAssam ? -0.188 : -0.142,
              lithology: isAssam ? 'Disang Shale & Sandstone' : 'Weathered Biotite Gneiss & Mica Schist',
              soil_type: isAssam ? 'Clayey Silt Colluvium' : 'Gravelly Sandy Loam',
              soil_moisture_pct: isAssam ? 88.0 : 81.0,
              rainfall_1h_mm: isAssam ? 42.0 : 38.4,
              rainfall_24h_mm: isAssam ? 162.0 : 148.0,
              rainfall_72h_mm: isAssam ? 310.0 : 265.0,
              historical_events_5y: isAssam ? 9 : 6,
              landslide_probability: 0.82,
              risk_trend: 'RISING',
              previous_probability: 0.65,
              confidence_status: 'DEMONSTRATION',
              risk_level: 'CRITICAL',
              exposure_score: 0.88,
              vulnerability_score: 0.92,
              impact_priority: 'CRITICAL',
              impact_priority_score: 84.5,
              projected_3h_expansion_pct: 36,
              population_exposed: isAssam ? 6200 : 1420,
              villages_exposed: isAssam ? ['Jatinga Valley', 'Lower Haflong Settlement'] : ['Dikchu Basti', 'Lower Singtam'],
              roads_affected: isAssam ? ['NH-27 East-West Corridor (Haflong Ghat KM 84)'] : ['NH-10 Teesta Lifeline (KM 19)'],
              critical_facilities_affected: isAssam ? ['Haflong Civil Hospital Access'] : ['Singtam Hydro Substation'],
              connectivity_importance: 'CRITICAL',
              potential_isolation: 'HIGH',
              key_assets: isAssam ? ['NH-27 Highway', 'Lumding Railway'] : ['NH-10 Highway', 'Dikchu Bridge'],
              provenance: 'SYNTHETIC',
              risk_drivers_explanation: {
                disclaimer: 'Interpretable multi-factor model',
                rainfall_contribution_pct: 38,
                slope_contribution_pct: 29,
                soil_moisture_contribution_pct: 18,
                historical_landslide_pct: 9,
                lithology_contribution_pct: 6,
                critical_trigger: 'Antecedent precipitation on steep slope.'
              },
              recommended_actions: [
                'Road inspection recommended',
                'Traffic diversion assessment recommended — candidate alternate route identified'
              ]
            };
            setInspectedHazardZone(zoneRecord);
            return;
          }

          // Case 2: Clicked Building, Bridge, or Infrastructure
          if (data?.type === 'BUILDING') {
            setInspectedBuilding({
              id: data.id || entity.name || 'BLD-SYNTH',
              name: data.name || entity.name,
              type: data.type_desc || data.type || 'RESIDENTIAL',
              lat: Number(clickedLat.toFixed(5)),
              lng: Number(clickedLng.toFixed(5)),
              height_m: data.height_m ? `${data.height_m} m` : 'Structure footprint',
              hazard_exposure: data.is_in_hazard_zone ? 'CRITICAL EXPOSURE' : 'BASELINE RISK',
              nearest_hazard: data.is_in_hazard_zone ? 'Active Colluvial Toe Zone' : 'Clear',
              nearest_road: selectedRegion === 'ASSAM' ? 'NH-27 Ghat Corridor' : 'NH-10 Arterial Lifeline',
              nearest_incident: data.is_in_hazard_zone ? 'Ground cracks reported nearby' : 'Clear',
              is_osm: false
            });
            return;
          }

          if (data?.type === 'BRIDGE') {
            setInspectedBuilding({
              id: data.id || entity.name || 'BRG-01',
              name: data.name || entity.name,
              type: data.bridge_type ? `BRIDGE (${data.bridge_type})` : 'HIGHWAY BRIDGE',
              lat: Number(clickedLat.toFixed(5)),
              lng: Number(clickedLng.toFixed(5)),
              height_m: `Health: ${data.structural_health_pct || 90}% (${data.status || 'OPERATIONAL'})`,
              hazard_exposure: data.status?.includes('CAUTION') ? 'ELEVATED RISK' : 'OPERATIONAL',
              nearest_hazard: data.spanned_river ? `Spanning ${data.spanned_river}` : 'Lifeline Crossing',
              nearest_road: data.carrying_road || (selectedRegion === 'ASSAM' ? 'NH-27 Corridor' : 'NH-10 Lifeline'),
              nearest_incident: 'Structural Health Monitored',
              is_osm: false
            });
            return;
          }

          if (data?.type === 'INFRASTRUCTURE') {
            const inf = data.infra || {};
            setInspectedBuilding({
              id: inf.id || entity.name,
              name: inf.name || entity.name,
              type: inf.category || 'CRITICAL INFRASTRUCTURE',
              lat: Number(clickedLat.toFixed(5)),
              lng: Number(clickedLng.toFixed(5)),
              height_m: `${inf.capacity ? `Capacity: ${inf.capacity} persons` : 'Operational node'}`,
              hazard_exposure: inf.status || 'OPERATIONAL',
              nearest_hazard: inf.description || 'Monitored Asset',
              nearest_road: selectedRegion === 'ASSAM' ? 'NH-27 / NFR Route' : 'NH-10 Lifeline Corridor',
              nearest_incident: 'Priority Response Node',
              is_osm: false
            });
            return;
          }

          if (data?.type === 'PLACE' && onSelectFeature) {
            onSelectFeature('PLACE', data.name);
          }
        }

        // Case 3: Clicked OSM 3D Building
        if (Cesium.defined(pickedObject) && pickedObject instanceof Cesium.Cesium3DTileFeature) {
          const feature = pickedObject;
          const bldType = feature.getProperty('building') || 'Structure';
          const name = feature.getProperty('name') || 'Identified Structure';
          const estHeight = feature.getProperty('cesium#estimatedHeight');

          setInspectedBuilding({
            id: `OSM-${Math.abs(Math.round(clickedLat * 10000))}-${Math.abs(Math.round(clickedLng * 10000))}`,
            name: name,
            type: bldType.toUpperCase(),
            lat: Number(clickedLat.toFixed(5)),
            lng: Number(clickedLng.toFixed(5)),
            height_m: estHeight ? `${Math.round(estHeight)} m` : `${clickedHeight} m AMSL`,
            hazard_exposure: 'PROXIMITY MONITORED',
            nearest_hazard: selectedRegion === 'ASSAM' ? 'Haflong Ghat Escarpment' : 'Dikchu – Singtam Sector',
            nearest_road: selectedRegion === 'ASSAM' ? 'NH-27 Corridor' : 'NH-10 Himalayan Arterial',
            nearest_incident: 'Monitored Structural Asset',
            is_osm: true
          });
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      // Render State Vector Layers
      buildStateLayers(viewer, selectedRegion);
    } catch (err) {
      console.error('[Cesium] Viewer initialization error:', err);
      setProviderHealth((prev) => ({ ...prev, cesiumViewer: 'UNAVAILABLE' }));
    }

    // Cleanup strictly on unmount
    return () => {
      isMountedRef.current = false;
      if (clickHandler) {
        clickHandler.destroy();
      }
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // 2. BUILD STATE GEOGRAPHIC & VECTOR LAYERS
  const buildStateLayers = useCallback((viewer: Cesium.Viewer, region: NERegionCode) => {
    try {
      viewer.entities.removeAll();
      entitiesRef.current.roads = [];
      entitiesRef.current.buildings = [];
      entitiesRef.current.rivers = [];
      entitiesRef.current.bridges = [];
      entitiesRef.current.infrastructure = [];
      entitiesRef.current.places = [];
      entitiesRef.current.incidents = [];
      entitiesRef.current.responseRoutes = [];
      entitiesRef.current.hazardPolygons = [];
      entitiesRef.current.blockageMarker = null;

      const env = SyntheticRiskEngine.getEnvironmentLayers();
      const stateData = SyntheticRiskEngine.getStateData(region);
      const isSikkim = region === 'SIKKIM';
      const isAssam = region === 'ASSAM';
      const isDetailed3DScene = isSikkim || isAssam;

      // A. STATE AOI BOUNDARY
      const bounds = stateData.bounds;
      const boundaryEntity = viewer.entities.add({
        name: `${stateData.state_name} AOI Boundary`,
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray([
            bounds[0], bounds[1],
            bounds[2], bounds[1],
            bounds[2], bounds[3],
            bounds[0], bounds[3],
            bounds[0], bounds[1]
          ]),
          material: Cesium.Color.fromCssColorString('#167F78').withAlpha(0.04),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#167F78').withAlpha(0.75),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
      entitiesRef.current.stateBoundary = boundaryEntity;

      // B. MULTI-CORRIDOR ROAD NETWORK
      const roadEntities: Cesium.Entity[] = [];
      (env.roads.features as any[]).forEach((road) => {
        const roadId = road.properties.id || '';
        if (isAssam && !roadId.includes('ASM')) return;
        if (!isAssam && roadId.includes('ASM')) return;

        const isNational = road.properties.class === 'NATIONAL_HIGHWAY';
        const isState = road.properties.class === 'STATE_HIGHWAY';
        const isEmergency = road.properties.status === 'ACTIVE_EMERGENCY_ROUTE';

        let color = '#88A498';
        let width = 2.5;
        if (isNational) { color = '#D97706'; width = 5.0; }
        else if (isState) { color = '#587A68'; width = 3.6; }
        else if (isEmergency) { color = '#167F78'; width = 4.0; }

        const flatCoords: number[] = [];
        road.geometry.coordinates.forEach((pt: number[]) => {
          flatCoords.push(pt[0], pt[1]);
        });

        const rEnt = viewer.entities.add({
          name: road.properties.name,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(flatCoords),
            width: width,
            material: isEmergency
              ? new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.fromCssColorString(color), dashLength: 16 })
              : Cesium.Color.fromCssColorString(color).withAlpha(0.95),
            clampToGround: true,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, isNational ? 2000000 : 450000)
          },
          properties: { type: 'ROAD', ...road.properties }
        });

        if (isEmergency) {
          entitiesRef.current.responseRoutes.push(rEnt);
        } else {
          roadEntities.push(rEnt);
        }
      });
      entitiesRef.current.roads = roadEntities;

      // C. RIVER DRAINAGE SYSTEMS
      const riverEntities: Cesium.Entity[] = [];
      (env.rivers.features as any[]).forEach((riv) => {
        const rivId = riv.properties.id || '';
        if (isAssam && !rivId.includes('ASM')) return;
        if (!isAssam && rivId.includes('ASM')) return;

        const flatCoords: number[] = [];
        riv.geometry.coordinates.forEach((pt: number[]) => {
          flatCoords.push(pt[0], pt[1]);
        });

        const rivEnt = viewer.entities.add({
          name: riv.properties.name,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(flatCoords),
            width: riv.properties.type === 'MAIN_STEM' ? 6.5 : 3.5,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.25,
              color: Cesium.Color.fromCssColorString('#397FA8').withAlpha(0.9)
            }),
            clampToGround: true,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2500000)
          },
          properties: { type: 'RIVER', ...riv.properties }
        });
        riverEntities.push(rivEnt);
      });
      entitiesRef.current.rivers = riverEntities;

      // D. 3D DIGITAL TWIN BUILDINGS (Himalayan pitched-roof houses, multi-storey civic blocks, schools, hospitals)
      const buildingEntities: Cesium.Entity[] = [];
      const [bMinLng, bMinLat, bMaxLng, bMaxLat] = bounds;

      if (isDetailed3DScene) {
        // 1. Base building footprints from authoritative environment dataset
        (env.buildings.features as any[]).forEach((bld) => {
          const bldId = bld.properties.id || '';

          // Extract centroid coordinates from Polygon or Point geometry
          let centroidLng = 0;
          let centroidLat = 0;
          if (bld.geometry.type === 'Polygon' && bld.geometry.coordinates?.[0]) {
            const ring = bld.geometry.coordinates[0];
            let sumLng = 0;
            let sumLat = 0;
            for (let i = 0; i < ring.length; i++) {
              sumLng += ring[i][0];
              sumLat += ring[i][1];
            }
            centroidLng = sumLng / ring.length;
            centroidLat = sumLat / ring.length;
          } else if (bld.geometry.type === 'Point' && bld.geometry.coordinates) {
            centroidLng = bld.geometry.coordinates[0];
            centroidLat = bld.geometry.coordinates[1];
          }

          // Active State / AOI Spatial Filtering
          const inBounds =
            centroidLng >= bMinLng - 0.08 &&
            centroidLng <= bMaxLng + 0.08 &&
            centroidLat >= bMinLat - 0.08 &&
            centroidLat <= bMaxLat + 0.08;

          if (isAssam && !bldId.includes('ASM') && !inBounds) return;
          if (!isAssam && bldId.includes('ASM')) return;
          if (!inBounds) return;

          // Model Selection based on Building Classification & Realistic Himalayan Styling
          const heightM = Number(bld.properties.height_m) || 8.0;
          const bldType = bld.properties.type || 'RESIDENTIAL';
          const idHash = bldId.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
          let modelUri = '/models/house_himalayan_green.glb';
          let modelScale = 1.5;

          if (bldType === 'HOSPITAL' || bldId.includes('HSP') || bldId.includes('PHC')) {
            modelUri = '/models/hospital.glb';
            modelScale = 1.85;
          } else if (bldType === 'SCHOOL' || bldId.includes('SCH')) {
            modelUri = '/models/school.glb';
            modelScale = 1.75;
          } else if (bldType === 'GOVERNMENT' || bldId.includes('PWR') || bldId.includes('DEP')) {
            modelUri = '/models/substation_power.glb';
            modelScale = 1.85;
          } else if (bldType === 'COMMERCIAL' || (bld.properties.floors && bld.properties.floors >= 3) || heightM >= 12.0) {
            modelUri = '/models/building_multistorey.glb';
            modelScale = Math.max(1.4, heightM / 7.0);
          } else {
            // Realistic Himalayan residential styling variations (Green, Terracotta, Zinc)
            const styleIdx = idHash % 3;
            if (styleIdx === 0) modelUri = '/models/house_himalayan_green.glb';
            else if (styleIdx === 1) modelUri = '/models/house_himalayan_terracotta.glb';
            else modelUri = '/models/house_himalayan_zinc.glb';
            modelScale = Math.max(1.4, heightM / 5.2);
          }

          // Varied Mountain Slope Heading
          const headingDeg = (idHash * 37 + 15) % 360;
          const bldPos = Cesium.Cartesian3.fromDegrees(centroidLng, centroidLat, 0);
          const bldOrientation = Cesium.Transforms.headingPitchRollQuaternion(
            bldPos,
            new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(headingDeg), 0, 0)
          );

          const bEnt = viewer.entities.add({
            name: bld.properties.name || 'Building',
            position: bldPos,
            orientation: bldOrientation,
            model: {
              uri: modelUri,
              scale: modelScale,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 150000),
              shadows: Cesium.ShadowMode.DISABLED
            },
            properties: {
              type: 'BUILDING',
              type_desc: bldType,
              height_m: heightM,
              is_in_hazard_zone: bld.properties.is_in_hazard_zone,
              hazard_exposure_level: bld.properties.hazard_exposure_level,
              model_uri: modelUri,
              ...bld.properties
            }
          });
          buildingEntities.push(bEnt);
        });

        // 2. Realistic Hillside Settlement Dwellings along Primary Corridors
        if (isSikkim) {
          const sikkimSettlementCoords = [
            // Dikchu Riverbank & Bailey Bridge Cluster
            { id: 'DKC-SET-01', name: 'Dikchu Lower Basti Cottage A', lng: 88.5368, lat: 27.3942, model: '/models/house_himalayan_green.glb', scale: 1.55, heading: 35 },
            { id: 'DKC-SET-02', name: 'Dikchu Lower Basti Cottage B', lng: 88.5375, lat: 27.3948, model: '/models/house_himalayan_terracotta.glb', scale: 1.45, heading: 50 },
            { id: 'DKC-SET-03', name: 'Dikchu Riverview Homestead', lng: 88.5382, lat: 27.3955, model: '/models/house_himalayan_zinc.glb', scale: 1.6, heading: 25 },
            // Dikchu Central Hillside along NH-10
            { id: 'DKC-SET-04', name: 'Dikchu Hillside House 1', lng: 88.5358, lat: 27.3982, model: '/models/house_himalayan_green.glb', scale: 1.5, heading: 42 },
            { id: 'DKC-SET-05', name: 'Dikchu Hillside House 2', lng: 88.5362, lat: 27.3991, model: '/models/house_himalayan_terracotta.glb', scale: 1.45, heading: 68 },
            { id: 'DKC-SET-06', name: 'Dikchu Primary Health Post', lng: 88.5350, lat: 27.3970, model: '/models/hospital.glb', scale: 1.85, heading: 40 },
            { id: 'DKC-SET-07', name: 'Dikchu Government Primary School', lng: 88.5370, lat: 27.3965, model: '/models/school.glb', scale: 1.75, heading: 55 },
            { id: 'DKC-SET-08', name: 'Dikchu Terrace Residence', lng: 88.5385, lat: 27.3980, model: '/models/house_himalayan_zinc.glb', scale: 1.5, heading: 130 },
            // Milestone 14 Toe Zone Settlement (Right next to active hazard slope)
            { id: 'DKC-SET-09', name: 'Milestone 14 Hazard Toe Hamlet A', lng: 88.5335, lat: 27.4012, model: '/models/house_himalayan_zinc.glb', scale: 1.55, heading: 115 },
            { id: 'DKC-SET-10', name: 'Milestone 14 Hazard Toe Hamlet B', lng: 88.5328, lat: 27.4020, model: '/models/house_himalayan_green.glb', scale: 1.45, heading: 85 },
            { id: 'DKC-SET-11', name: 'Milestone 14 Escarpment Dwelling', lng: 88.5340, lat: 27.4045, model: '/models/house_himalayan_terracotta.glb', scale: 1.5, heading: 55 },
            { id: 'DKC-SET-12', name: 'Milestone 14 Riverbank Outpost', lng: 88.5320, lat: 27.3990, model: '/models/house_himalayan_zinc.glb', scale: 1.4, heading: 90 },
            // Singtam & Teesta Valley Corridor
            { id: 'DKC-SET-13', name: 'Singtam Hillside Residence 1', lng: 88.4970, lat: 27.2360, model: '/models/house_himalayan_green.glb', scale: 1.5, heading: 210 },
            { id: 'DKC-SET-14', name: 'Singtam Hillside Residence 2', lng: 88.4985, lat: 27.2372, model: '/models/house_himalayan_terracotta.glb', scale: 1.55, heading: 195 },
            { id: 'DKC-SET-15', name: 'Singtam Commercial Shophouse Block', lng: 88.4960, lat: 27.2350, model: '/models/building_multistorey.glb', scale: 1.6, heading: 240 },
            { id: 'DKC-SET-16', name: 'Teesta Overlook Himalayan Cottage', lng: 88.5140, lat: 27.2870, model: '/models/house_himalayan_green.glb', scale: 1.45, heading: 320 }
          ];

          sikkimSettlementCoords.forEach((s) => {
            const pos = Cesium.Cartesian3.fromDegrees(s.lng, s.lat, 0);
            const orientation = Cesium.Transforms.headingPitchRollQuaternion(
              pos,
              new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(s.heading), 0, 0)
            );
            const sEnt = viewer.entities.add({
              name: s.name,
              position: pos,
              orientation: orientation,
              model: {
                uri: s.model,
                scale: s.scale,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 150000),
                shadows: Cesium.ShadowMode.DISABLED
              },
              properties: {
                type: 'BUILDING',
                type_desc: 'HIMALAYAN RESIDENTIAL',
                height_m: 7.5,
                is_in_hazard_zone: s.name.includes('Milestone 14') || s.name.includes('Dikchu'),
                model_uri: s.model,
                id: s.id
              }
            });
            buildingEntities.push(sEnt);
          });
        }

        if (isAssam) {
          const assamSettlementCoords = [
            // Haflong Ghat Hillside Corridor (Stepped houses along NH-27 slope)
            { id: 'HFL-SET-01', name: 'Haflong Ghat Slope Residence A', lng: 93.0185, lat: 25.1710, model: '/models/house_himalayan_terracotta.glb', scale: 1.55, heading: 35 },
            { id: 'HFL-SET-02', name: 'Haflong Ghat Slope Residence B', lng: 93.0175, lat: 25.1695, model: '/models/house_himalayan_zinc.glb', scale: 1.6, heading: 160 },
            { id: 'HFL-SET-03', name: 'Haflong Ghat Hillside Cottage C', lng: 93.0195, lat: 25.1685, model: '/models/house_himalayan_green.glb', scale: 1.5, heading: 50 },
            { id: 'HFL-SET-04', name: 'Haflong Ghat Valley View House', lng: 93.0210, lat: 25.1725, model: '/models/house_himalayan_green.glb', scale: 1.45, heading: 220 },
            { id: 'HFL-SET-05', name: 'Haflong West Escarpment Outpost', lng: 93.0135, lat: 25.1685, model: '/models/house_himalayan_zinc.glb', scale: 1.4, heading: 310 },
            { id: 'HFL-SET-06', name: 'Haflong Borail Foothill Homestead 1', lng: 93.0150, lat: 25.1660, model: '/models/house_himalayan_terracotta.glb', scale: 1.55, heading: 15 },
            { id: 'HFL-SET-07', name: 'Haflong Borail Foothill Homestead 2', lng: 93.0160, lat: 25.1670, model: '/models/house_himalayan_zinc.glb', scale: 1.45, heading: 75 },
            // Haflong Upper Ridge & Town Center
            { id: 'HFL-SET-08', name: 'Haflong Upper Ridge House 1', lng: 93.0240, lat: 25.1780, model: '/models/house_himalayan_zinc.glb', scale: 1.55, heading: 45 },
            { id: 'HFL-SET-09', name: 'Haflong Upper Ridge House 2', lng: 93.0255, lat: 25.1765, model: '/models/house_himalayan_green.glb', scale: 1.5, heading: 70 },
            { id: 'HFL-SET-10', name: 'Haflong East Ridge Residence', lng: 93.0280, lat: 25.1770, model: '/models/house_himalayan_green.glb', scale: 1.5, heading: 125 },
            { id: 'HFL-SET-11', name: 'Haflong Lake Road Cottage', lng: 93.0270, lat: 25.1740, model: '/models/house_himalayan_green.glb', scale: 1.5, heading: 290 },
            { id: 'HFL-SET-12', name: 'Haflong Town Civic Center Block', lng: 93.0225, lat: 25.1750, model: '/models/building_multistorey.glb', scale: 1.7, heading: 110 },
            { id: 'HFL-SET-13', name: 'Haflong Government College Campus', lng: 93.0260, lat: 25.1720, model: '/models/school.glb', scale: 1.8, heading: 85 },
            { id: 'HFL-SET-14', name: 'Haflong Civil Hospital Annex', lng: 93.0238, lat: 25.1764, model: '/models/hospital.glb', scale: 1.9, heading: 30 },
            // Jatinga Valley Escarpment Settlement
            { id: 'HFL-SET-15', name: 'Jatinga Valley Hillside Dwelling 1', lng: 93.0460, lat: 25.1235, model: '/models/house_himalayan_terracotta.glb', scale: 1.5, heading: 180 },
            { id: 'HFL-SET-16', name: 'Jatinga Valley Hillside Dwelling 2', lng: 93.0480, lat: 25.1205, model: '/models/house_himalayan_zinc.glb', scale: 1.45, heading: 205 },
            { id: 'HFL-SET-17', name: 'Jatinga Valley Community Center', lng: 93.0495, lat: 25.1220, model: '/models/building_multistorey.glb', scale: 1.6, heading: 140 },
            { id: 'HFL-SET-18', name: 'Jatinga Ridge Overlook Dwelling', lng: 93.0440, lat: 25.1260, model: '/models/house_himalayan_green.glb', scale: 1.5, heading: 165 }
          ];

          assamSettlementCoords.forEach((s) => {
            const pos = Cesium.Cartesian3.fromDegrees(s.lng, s.lat, 0);
            const orientation = Cesium.Transforms.headingPitchRollQuaternion(
              pos,
              new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(s.heading), 0, 0)
            );
            const sEnt = viewer.entities.add({
              name: s.name,
              position: pos,
              orientation: orientation,
              model: {
                uri: s.model,
                scale: s.scale,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 150000),
                shadows: Cesium.ShadowMode.DISABLED
              },
              properties: {
                type: 'BUILDING',
                type_desc: 'HILLSIDE RESIDENTIAL',
                height_m: 8.0,
                is_in_hazard_zone: s.name.includes('Haflong Ghat') || s.name.includes('Borail'),
                model_uri: s.model,
                id: s.id
              }
            });
            buildingEntities.push(sEnt);
          });
        }
      }
      entitiesRef.current.buildings = buildingEntities;

      // E. BRIDGES & CROSSINGS (3D Model + Navigational POI Marker)
      const bridgeEntities: Cesium.Entity[] = [];
      (env.bridges.features as any[]).forEach((brg) => {
        const brgId = brg.properties.id || '';
        if (isAssam && !brgId.includes('ASM')) return;
        if (!isAssam && brgId.includes('ASM')) return;

        const coords = brg.geometry.coordinates;
        const pos = Cesium.Cartesian3.fromDegrees(coords[0], coords[1], 0);

        const bIdHash = brgId.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        const brgHeading = (bIdHash * 43 + 30) % 180;
        const brgOrientation = Cesium.Transforms.headingPitchRollQuaternion(
          pos,
          new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(brgHeading), 0, 0)
        );

        const bEnt = viewer.entities.add({
          name: `[Bridge] ${brg.properties.name}`,
          position: pos,
          orientation: brgOrientation,
          model: {
            uri: '/models/bridge_truss.glb',
            scale: 2.2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 150000),
            shadows: Cesium.ShadowMode.DISABLED
          },
          point: {
            pixelSize: 8,
            color: Cesium.Color.fromCssColorString('#D97706'),
            outlineColor: Cesium.Color.fromCssColorString('#FAF8F1'),
            outlineWidth: 2,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          label: {
            text: `[Bridge] ${brg.properties.name}`,
            font: '10px monospace',
            fillColor: Cesium.Color.fromCssColorString('#D97706'),
            outlineColor: Cesium.Color.fromCssColorString('#11191D'),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, 16),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 140000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          properties: { type: 'BRIDGE', ...brg.properties }
        });
        bridgeEntities.push(bEnt);
      });
      entitiesRef.current.bridges = bridgeEntities;

      // F. CRITICAL INFRASTRUCTURE POIs (3D Models + Navigational Markers)
      const infraEntities: Cesium.Entity[] = [];
      (env.infrastructure.features as any[]).forEach((inf) => {
        const infId = inf.properties.id || '';
        if (isAssam && !infId.includes('ASM')) return;
        if (!isAssam && infId.includes('ASM')) return;

        const coords = inf.geometry.coordinates;
        const pos = Cesium.Cartesian3.fromDegrees(coords[0], coords[1], 0);

        let iconColor = '#397FA8';
        let tag = '[Asset]';
        let modelUri = '/models/building_multistorey.glb';
        let modelScale = 1.8;

        if (inf.properties.category === 'HOSPITAL') {
          iconColor = '#DC2626';
          tag = '[Hospital]';
          modelUri = '/models/hospital.glb';
          modelScale = 1.95;
        } else if (inf.properties.category === 'SHELTER') {
          iconColor = '#167F78';
          tag = '[Shelter]';
          modelUri = '/models/school.glb';
          modelScale = 1.85;
        } else if (inf.properties.category === 'POWER_PLANT') {
          iconColor = '#D97706';
          tag = '[Power Plant]';
          modelUri = '/models/substation_power.glb';
          modelScale = 2.0;
        } else if (inf.properties.category === 'DEFENSE_BASE') {
          iconColor = '#4B5563';
          tag = '[Response Base]';
          modelUri = '/models/infrastructure_tower.glb';
          modelScale = 1.8;
        }

        const iIdHash = infId.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        const infraHeading = (iIdHash * 31) % 360;
        const infraOrientation = Cesium.Transforms.headingPitchRollQuaternion(
          pos,
          new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(infraHeading), 0, 0)
        );

        const iEnt = viewer.entities.add({
          name: `${tag} ${inf.properties.name}`,
          position: pos,
          orientation: infraOrientation,
          model: {
            uri: modelUri,
            scale: modelScale,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 150000),
            shadows: Cesium.ShadowMode.DISABLED
          },
          point: {
            pixelSize: 9,
            color: Cesium.Color.fromCssColorString(iconColor),
            outlineColor: Cesium.Color.fromCssColorString('#FAF8F1'),
            outlineWidth: 2,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 400000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          label: {
            text: `${tag} ${inf.properties.name}`,
            font: '10px monospace',
            fillColor: Cesium.Color.fromCssColorString(iconColor),
            outlineColor: Cesium.Color.fromCssColorString('#11191D'),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, 16),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 140000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          properties: { type: 'INFRASTRUCTURE', infra: inf.properties }
        });
        infraEntities.push(iEnt);
      });
      entitiesRef.current.infrastructure = infraEntities;

      // G. RAILWAY INFRASTRUCTURE (Assam Lumding–Badarpur Hill Section Viaduct)
      const railwayEntities: Cesium.Entity[] = [];
      if (isAssam) {
        const viaductPoints = [
          { lng: 93.0180, lat: 25.1680, heading: 40 },
          { lng: 93.0210, lat: 25.1705, heading: 45 }
        ];
        viaductPoints.forEach((vp, idx) => {
          const vPos = Cesium.Cartesian3.fromDegrees(vp.lng, vp.lat, 0);
          const vOrientation = Cesium.Transforms.headingPitchRollQuaternion(
            vPos,
            new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(vp.heading), 0, 0)
          );
          const vEnt = viewer.entities.add({
            name: `[Railway Viaduct] Lumding–Badarpur Hill Line Span ${idx + 1}`,
            position: vPos,
            orientation: vOrientation,
            model: {
              uri: '/models/railway_viaduct.glb',
              scale: 2.0,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 120000),
              shadows: Cesium.ShadowMode.DISABLED
            },
            properties: {
              type: 'INFRASTRUCTURE',
              infra: {
                id: `RLY-VIA-0${idx + 1}`,
                name: `Lumding–Badarpur Hill Section Railway Viaduct ${idx + 1}`,
                category: 'RAILWAY_VIADUCT',
                status: 'OPERATIONAL_CAUTION',
                description: 'Arched steel-concrete railway viaduct traversing Borail ridge corridor.'
              }
            }
          });
          railwayEntities.push(vEnt);
        });
      }
      entitiesRef.current.railway = railwayEntities;

      // H. LIGHTWEIGHT VEGETATION (Himalayan Pine Trees for Sikkim, Subtropical Broadleaf for Haflong)
      const treeEntities: Cesium.Entity[] = [];
      if (isSikkim) {
        // Sikkim Pine clusters along NH-10 and Dikchu/Milestone 14 slopes
        const sikkimTreeCoords = [
          [88.5350, 27.3970], [88.5355, 27.3980], [88.5365, 27.4005], [88.5370, 27.4010],
          [88.5345, 27.3990], [88.5330, 27.4005], [88.5325, 27.4015], [88.5380, 27.3965],
          [88.5390, 27.3970], [88.5400, 27.4020], [88.5405, 27.4030], [88.5315, 27.3985],
          [88.5310, 27.4035], [88.5348, 27.4040], [88.5358, 27.4050], [88.5368, 27.4060],
          [88.4965, 27.2345], [88.4975, 27.2355], [88.4980, 27.2365], [88.4990, 27.2375],
          [88.4950, 27.2330], [88.4945, 27.2320], [88.5130, 27.2860], [88.5145, 27.2875],
          [88.5125, 27.2850], [88.5150, 27.2885], [88.5332, 27.4025], [88.5360, 27.4035]
        ];
        sikkimTreeCoords.forEach((tc, idx) => {
          const tPos = Cesium.Cartesian3.fromDegrees(tc[0], tc[1], 0);
          const tScale = 1.35 + (idx % 5) * 0.12;
          const tEnt = viewer.entities.add({
            position: tPos,
            model: {
              uri: '/models/tree_pine.glb',
              scale: tScale,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 80000),
              shadows: Cesium.ShadowMode.DISABLED
            }
          });
          treeEntities.push(tEnt);
        });
      } else if (isAssam) {
        // Haflong Broadleaf clusters around lush Borail hill slopes
        const assamTreeCoords = [
          [93.0230, 25.1770], [93.0245, 25.1785], [93.0260, 25.1760], [93.0275, 25.1750],
          [93.0220, 25.1740], [93.0205, 25.1730], [93.0190, 25.1715], [93.0180, 25.1700],
          [93.0165, 25.1685], [93.0155, 25.1670], [93.0145, 25.1655], [93.0285, 25.1765],
          [93.0295, 25.1775], [93.0250, 25.1730], [93.0235, 25.1715], [93.0215, 25.1695],
          [93.0470, 25.1225], [93.0485, 25.1210], [93.0495, 25.1235], [93.0505, 25.1245],
          [93.0455, 25.1240], [93.0465, 25.1250], [93.0170, 25.1675], [93.0185, 25.1690]
        ];
        assamTreeCoords.forEach((tc, idx) => {
          const tPos = Cesium.Cartesian3.fromDegrees(tc[0], tc[1], 0);
          const tScale = 1.4 + (idx % 4) * 0.15;
          const tEnt = viewer.entities.add({
            position: tPos,
            model: {
              uri: '/models/tree_broadleaf.glb',
              scale: tScale,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 80000),
              shadows: Cesium.ShadowMode.DISABLED
            }
          });
          treeEntities.push(tEnt);
        });
      }
      entitiesRef.current.trees = treeEntities;

      // F. SETTLEMENT PLACES & LABELS
      const placeEntities: Cesium.Entity[] = [];
      stateData.towns.forEach((town) => {
        const isCrit = town.risk_level === 'CRITICAL';
        const pEnt = viewer.entities.add({
          name: town.name,
          position: Cesium.Cartesian3.fromDegrees(town.lng, town.lat, 12),
          point: {
            pixelSize: isCrit ? 9 : 7,
            color: isCrit ? Cesium.Color.fromCssColorString('#DC2626') : Cesium.Color.fromCssColorString('#FAF8F1'),
            outlineColor: Cesium.Color.fromCssColorString('#172126'),
            outlineWidth: 2,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500000)
          },
          label: {
            text: `${town.name}`,
            font: '11px sans-serif',
            fillColor: Cesium.Color.fromCssColorString('#FAF8F1'),
            outlineColor: Cesium.Color.fromCssColorString('#11191D'),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -16),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 450000)
          },
          properties: { type: 'PLACE', ...town }
        });
        placeEntities.push(pEnt);
      });
      entitiesRef.current.places = placeEntities;

      // G. FIELD REPORT MARKERS
      const events = SyntheticRiskEngine.getEvents();
      const incEntities: Cesium.Entity[] = [];
      events.fieldReports.forEach((rep: any) => {
        const isRepAssam = rep.state === 'Assam' || (rep.gps && rep.gps[0] > 91.0);
        if (isAssam && !isRepAssam) return;
        if (!isAssam && isRepAssam) return;

        const isVerified = rep.verification_status === 'FIELD VERIFIED';
        const rEnt = viewer.entities.add({
          name: rep.id,
          position: Cesium.Cartesian3.fromDegrees(rep.gps[0], rep.gps[1], 15),
          point: {
            pixelSize: 10,
            color: isVerified ? Cesium.Color.fromCssColorString('#167F78') : Cesium.Color.fromCssColorString('#DC2626'),
            outlineColor: Cesium.Color.fromCssColorString('#FAF8F1'),
            outlineWidth: 2,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350000)
          },
          label: {
            text: `[${rep.verification_status}] ${rep.hazard_type}`,
            font: '10px monospace',
            fillColor: isVerified ? Cesium.Color.fromCssColorString('#167F78') : Cesium.Color.fromCssColorString('#DC2626'),
            outlineColor: Cesium.Color.fromCssColorString('#11191D'),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -18),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 300000)
          },
          properties: { type: 'FIELD_REPORT', report: rep }
        });
        incEntities.push(rEnt);
      });
      entitiesRef.current.incidents = incEntities;
    } catch (err) {
      console.error('[Cesium] Error building state vector layers:', err);
    }
  }, []);

  // Update State Layers when selectedRegion changes
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    buildStateLayers(viewerRef.current, selectedRegion);
    flyToPreset('aoi');
  }, [selectedRegion, buildStateLayers]);

  // 3. TRANSLUCENT HAZARD POLYGONS
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    const viewer = viewerRef.current;

    try {
      entitiesRef.current.hazardPolygons.forEach((e) => viewer.entities.remove(e));
      entitiesRef.current.hazardPolygons = [];
      if (entitiesRef.current.blockageMarker) {
        viewer.entities.remove(entitiesRef.current.blockageMarker);
        entitiesRef.current.blockageMarker = null;
      }

      if (!layers['08_hazard_polygons']) return;

      const sim = SyntheticRiskEngine.calculateSimulationState(timeOffset, selectedRegion);
      const isAssam = selectedRegion === 'ASSAM';
      const newHazards: Cesium.Entity[] = [];

      sim.active_hazard_zones.forEach((z) => {
        const isCrit = z.risk_level === 'CRITICAL';
        const colorHex = isCrit ? '#DC2626' : '#D97706';
        const baseAlpha = isCrit ? 0.28 : 0.16; // Translucent overlay so topography underneath is fully visible

        const flatCoords: number[] = [];
        z.polygon.forEach((pt) => {
          flatCoords.push(pt[0], pt[1]);
        });

        const hEnt = viewer.entities.add({
          name: z.name,
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(flatCoords),
            material: Cesium.Color.fromCssColorString(colorHex).withAlpha(baseAlpha),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString(colorHex).withAlpha(0.85),
            outlineWidth: 2.5,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1200000)
          },
          properties: { type: 'HAZARD_ZONE', ...z }
        });
        newHazards.push(hEnt);
      });
      entitiesRef.current.hazardPolygons = newHazards;

      // Road Blockage Warning Marker
      if (sim.is_nh10_blocked) {
        const blockagePos = isAssam
          ? Cesium.Cartesian3.fromDegrees(93.020, 25.170, 20)
          : Cesium.Cartesian3.fromDegrees(88.535, 27.398, 20);

        const bMarker = viewer.entities.add({
          name: isAssam ? 'ROAD BLOCKED — NH-27 Haflong Ghat' : 'ROAD BLOCKED — NH-10 Milestone 14',
          position: blockagePos,
          point: {
            pixelSize: 13,
            color: Cesium.Color.fromCssColorString('#DC2626'),
            outlineColor: Cesium.Color.fromCssColorString('#FAF8F1'),
            outlineWidth: 3,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          label: {
            text: isAssam ? '⛔ ROAD BLOCKED (NH-27 KM 84)' : '⛔ ROAD BLOCKED (Milestone 14)',
            font: 'bold 11px sans-serif',
            fillColor: Cesium.Color.fromCssColorString('#DC2626'),
            outlineColor: Cesium.Color.fromCssColorString('#11191D'),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -22),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        });
        entitiesRef.current.blockageMarker = bMarker;
      }
    } catch (err) {
      console.error('[Cesium] Hazard polygon update error:', err);
    }
  }, [timeOffset, selectedRegion, layers['08_hazard_polygons']]);

  // 4. OBSERVATION SATELLITE & SENSOR LAYERS
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    const viewer = viewerRef.current;

    try {
      entitiesRef.current.sarSwaths.forEach((e) => viewer.entities.remove(e));
      entitiesRef.current.radarOverlay.forEach((e) => viewer.entities.remove(e));
      entitiesRef.current.soilOverlay.forEach((e) => viewer.entities.remove(e));
      entitiesRef.current.sarSwaths = [];
      entitiesRef.current.radarOverlay = [];
      entitiesRef.current.soilOverlay = [];

      const isAssam = selectedRegion === 'ASSAM';

      // Sentinel-1 SAR Swath
      if (layers['11_sentinel1_sar']) {
        const sarBounds = isAssam
          ? Cesium.Rectangle.fromDegrees(92.4, 24.8, 93.6, 25.6)
          : Cesium.Rectangle.fromDegrees(88.42, 27.05, 88.68, 27.48);

        const sarEntity = viewer.entities.add({
          name: 'Copernicus Sentinel-1 C-SAR Swath (5.405 GHz)',
          rectangle: {
            coordinates: sarBounds,
            material: Cesium.Color.fromCssColorString('#397FA8').withAlpha(0.20),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString('#397FA8').withAlpha(0.8),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1800000)
          }
        });
        entitiesRef.current.sarSwaths.push(sarEntity);
      }

      // IMD / OpenWeather Rainfall Plume
      if (layers['14_rainfall']) {
        const radarPos = isAssam
          ? Cesium.Cartesian3.fromDegrees(93.020, 25.170)
          : Cesium.Cartesian3.fromDegrees(88.535, 27.350);

        const radarEntity = viewer.entities.add({
          name: 'Rainfall Radar Telemetry Overlay',
          ellipse: {
            semiMinorAxis: 15000 * (1 + (timeOffset / 180) * 0.35),
            semiMajorAxis: 24000 * (1 + (timeOffset / 180) * 0.35),
            material: Cesium.Color.fromCssColorString('#397FA8').withAlpha(0.18),
            rotation: Cesium.Math.toRadians(35),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1400000)
          },
          position: radarPos
        });
        entitiesRef.current.radarOverlay.push(radarEntity);
      }

      // Soil Moisture Sensor Plume
      if (layers['13_soil_moisture']) {
        const soilPos = isAssam
          ? Cesium.Cartesian3.fromDegrees(93.045, 25.140)
          : Cesium.Cartesian3.fromDegrees(88.515, 27.280);

        const soilEntity = viewer.entities.add({
          name: 'In-Situ Soil Moisture Saturation Sensor Mesh',
          ellipse: {
            semiMinorAxis: 12000,
            semiMajorAxis: 18000,
            material: Cesium.Color.fromCssColorString('#167F78').withAlpha(0.16),
            rotation: Cesium.Math.toRadians(20),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1400000)
          },
          position: soilPos
        });
        entitiesRef.current.soilOverlay.push(soilEntity);
      }
    } catch (err) {
      console.error('[Cesium] Observation layer render error:', err);
    }
  }, [layers, selectedRegion, timeOffset]);

  // 5. LAYER TOGGLE DISPATCHER
  const toggleLayer = (layerKey: keyof typeof layers) => {
    setLayers((prev) => {
      const nextVal = !prev[layerKey];
      const updated = { ...prev, [layerKey]: nextVal };

      if (layerKey === '03_osm_buildings') {
        if (osmBuildingsTilesetRef.current) {
          osmBuildingsTilesetRef.current.show = nextVal;
        }
        entitiesRef.current.buildings.forEach((e) => (e.show = nextVal));
        entitiesRef.current.trees.forEach((e) => (e.show = nextVal));
      } else if (layerKey === '04_infrastructure') {
        entitiesRef.current.infrastructure.forEach((e) => (e.show = nextVal));
      } else if (layerKey === '05_bridges') {
        entitiesRef.current.bridges.forEach((e) => (e.show = nextVal));
      } else if (layerKey === '06_roads') {
        entitiesRef.current.roads.forEach((e) => (e.show = nextVal));
        entitiesRef.current.railway.forEach((e) => (e.show = nextVal));
      } else if (layerKey === '07_rivers') {
        entitiesRef.current.rivers.forEach((e) => (e.show = nextVal));
      } else if (layerKey === '10_incidents') {
        entitiesRef.current.incidents.forEach((e) => (e.show = nextVal));
      } else if (layerKey === '17_evacuation_routes') {
        entitiesRef.current.responseRoutes.forEach((e) => (e.show = nextVal));
      }

      return updated;
    });
  };

  // 6. MULTI-SCALE CAMERA PRESET NAVIGATION
  const flyToPreset = (preset: CameraPreset) => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    const viewer = viewerRef.current;
    setActivePreset(preset);

    const isAssam = selectedRegion === 'ASSAM';

    switch (preset) {
      case 'globe':
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(82.0, 22.0, 18000000),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-89.9), roll: 0.0 },
          duration: 1.8
        });
        break;
      case 'india':
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(79.5, 22.5, 4200000),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-88), roll: 0.0 },
          duration: 1.5
        });
        break;
      case 'ner':
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(92.5, 26.2, 1100000),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-80), roll: 0.0 },
          duration: 1.4
        });
        break;
      case 'state':
        if (isAssam) {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(92.80, 26.20, 380000),
            orientation: { heading: 0, pitch: Cesium.Math.toRadians(-72), roll: 0.0 },
            duration: 1.4
          });
        } else {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(88.55, 27.50, 160000),
            orientation: { heading: Cesium.Math.toRadians(5), pitch: Cesium.Math.toRadians(-65), roll: 0.0 },
            duration: 1.3
          });
        }
        break;
      case 'aoi':
        if (isAssam) {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(93.0185, 25.1690, 1180),
            orientation: { heading: Cesium.Math.toRadians(35), pitch: Cesium.Math.toRadians(-25), roll: 0.0 },
            duration: 1.2
          });
        } else {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(88.5365, 27.3920, 1150),
            orientation: { heading: Cesium.Math.toRadians(15), pitch: Cesium.Math.toRadians(-26), roll: 0.0 },
            duration: 1.2
          });
        }
        break;
      case 'slope':
        if (isAssam) {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(93.0185, 25.1700, 880),
            orientation: { heading: Cesium.Math.toRadians(45), pitch: Cesium.Math.toRadians(-22), roll: 0.0 },
            duration: 1.0
          });
        } else {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(88.5365, 27.3960, 850),
            orientation: { heading: Cesium.Math.toRadians(35), pitch: Cesium.Math.toRadians(-22), roll: 0.0 },
            duration: 1.0
          });
        }
        break;
    }
  };

  const flyToLocation = (lat: number, lng: number) => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, 1180),
      orientation: { heading: Cesium.Math.toRadians(25), pitch: Cesium.Math.toRadians(-26), roll: 0.0 },
      duration: 1.2
    });
    setSelectedLocationMenuOpen(false);
  };

  const handleZoom = (factor: number) => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    const camera = viewerRef.current.camera;
    camera.zoomIn(camera.positionCartographic.height * factor);
  };

  const handleTilt = () => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    const camera = viewerRef.current.camera;
    const targetPitch = camera.pitch < -0.8 ? Cesium.Math.toRadians(-25) : Cesium.Math.toRadians(-88);
    camera.flyTo({
      destination: camera.position,
      orientation: { heading: camera.heading, pitch: targetPitch, roll: 0.0 },
      duration: 0.8
    });
  };

  const handleResetNorth = () => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    const camera = viewerRef.current.camera;
    camera.flyTo({
      destination: camera.position,
      orientation: { heading: 0, pitch: camera.pitch, roll: 0.0 },
      duration: 0.8
    });
  };

  const sikkimLocations = [
    { name: 'Dikchu – Singtam Corridor (AOI)', lat: 27.3920, lng: 88.5365 },
    { name: 'Milestone 14 Hazard Toe Zone', lat: 27.4012, lng: 88.5335 },
    { name: 'Dikchu Bailey Bridge & Basti', lat: 27.3955, lng: 88.5382 },
    { name: 'Singtam Hydro Substation', lat: 27.2360, lng: 88.4970 },
    { name: 'Rangpo Border Checkpost', lat: 27.1760, lng: 88.5320 },
    { name: 'Gangtok Urban Ridge', lat: 27.3314, lng: 88.6138 }
  ];

  const assamLocations = [
    { name: 'Haflong Ghat Corridor (AOI)', lat: 25.1690, lng: 93.0185 },
    { name: 'Haflong Civil Hospital & Town', lat: 25.1764, lng: 93.0238 },
    { name: 'Lumding Railway Viaduct Crossing', lat: 25.1680, lng: 93.0180 },
    { name: 'Jatinga Valley Escarpment', lat: 25.1235, lng: 93.0460 },
    { name: 'Borail Foothill Sector', lat: 25.1660, lng: 93.0150 }
  ];

  const activeLocations = selectedRegion === 'ASSAM' ? assamLocations : sikkimLocations;
  const activeLayersCount = Object.values(layers).filter(Boolean).length;

  return (
    <div className={`relative w-full h-full bg-[#11191D] select-none overflow-hidden rounded-none flex flex-col font-sans ${className}`}>
      {/* 1. CESIUM 3D GLOBE CANVAS */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 2. TOP-LEFT FLOATING HUD: Navigation Hierarchy, State Toggle & Presets */}
      <div className="absolute top-3 left-3 flex flex-col space-y-2 pointer-events-auto z-20 font-sans max-w-[95vw]">
        {/* Navigation Breadcrumb Bar */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF8F1]/95 border border-[#D7DEDC] px-3 py-1.5 rounded-xl backdrop-blur-md shadow-panel text-xs">
          <Globe2 className="w-4 h-4 text-[#167F78]" />
          <span className="text-[10px] font-mono text-[#667579] font-semibold">VIEW:</span>

          {(['globe', 'india', 'ner', 'state', 'aoi', 'slope'] as CameraPreset[]).map((p, idx) => {
            const labels: Record<CameraPreset, string> = {
              globe: 'World',
              india: 'India',
              ner: 'NER',
              state: selectedRegion === 'ASSAM' ? 'Assam' : 'Sikkim',
              aoi: selectedRegion === 'ASSAM' ? 'Haflong Sector' : 'Dikchu Sector',
              slope: '3D Slope'
            };
            const isActive = activePreset === p;
            return (
              <React.Fragment key={p}>
                {idx > 0 && <span className="text-[#D7DEDC] text-[10px]">/</span>}
                <button
                  onClick={() => flyToPreset(p)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#167F78] text-white font-bold shadow-subtle'
                      : 'text-[#667579] hover:text-[#172126] hover:bg-[#E6EDEB]'
                  }`}
                >
                  {labels[p]}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* State / Region Selector + AOI Digital Twin Preset */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1 bg-[#FAF8F1]/95 border border-[#D7DEDC] p-1 rounded-xl backdrop-blur-md shadow-panel text-xs">
            <span className="text-[10px] font-mono text-[#667579] px-2 font-bold uppercase">STATE:</span>
            {(['SIKKIM', 'ASSAM'] as NERegionCode[]).map((st) => {
              const isSelected = selectedRegion === st;
              return (
                <button
                  key={st}
                  onClick={() => onSelectRegion ? onSelectRegion(st) : null}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#167F78] text-white shadow-subtle'
                      : 'text-[#667579] hover:text-[#172126] hover:bg-[#E6EDEB]'
                  }`}
                >
                  {st === 'SIKKIM' ? 'Sikkim' : 'Assam'}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => flyToPreset('aoi')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#167F78] hover:bg-[#126862] text-white font-bold text-xs shadow-panel backdrop-blur-md cursor-pointer transition-all border border-[#167F78]/50 active:scale-95"
            title="Focus camera on Localized 3D Disaster Digital Twin"
          >
            <Building2 className="w-4 h-4 text-[#FAF8F1]" />
            <span>3D DISASTER DIGITAL TWIN ({selectedRegion === 'ASSAM' ? 'HAFLONG' : 'DIKCHU'})</span>
          </button>

          {/* Location Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSelectedLocationMenuOpen(!selectedLocationMenuOpen)}
              className="flex items-center space-x-1.5 bg-[#FAF8F1]/95 border border-[#D7DEDC] px-2.5 py-1.5 rounded-xl backdrop-blur-md shadow-panel text-xs text-[#172126] font-medium hover:border-[#167F78] transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 text-[#167F78]" />
              <span>Locations</span>
              <ChevronDown className="w-3 h-3 text-[#667579]" />
            </button>

            {selectedLocationMenuOpen && (
              <div className="absolute left-0 mt-1.5 w-52 bg-[#FAF8F1]/98 border border-[#D7DEDC] rounded-xl p-1.5 shadow-panel backdrop-blur-md z-30 text-xs space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-mono text-[#667579] font-bold uppercase border-b border-[#D7DEDC]">
                  {selectedRegion} Sectors
                </div>
                {activeLocations.map((loc) => (
                  <button
                    key={loc.name}
                    onClick={() => flyToLocation(loc.lat, loc.lng)}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-medium text-[#172126] hover:bg-[#E6EDEB] hover:text-[#167F78] transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>{loc.name}</span>
                    <span className="text-[9px] font-mono text-[#667579]">3D FLY</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Operational Status Badges (Verified Provider States) */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono bg-[#FAF8F1]/90 border border-[#D7DEDC] px-2.5 py-1 rounded-lg shadow-subtle backdrop-blur-md text-[#667579]">
          <span className="font-bold text-[#172126]">EPOCH 3D DIGITAL TWIN</span>
          <span>•</span>
          <span className="text-[#167F78] font-bold">
            ✓ 3D GLB MODELS ACTIVE
          </span>
          <span>•</span>
          <span className={providerHealth.worldTerrain === 'CONNECTED' ? 'text-[#397FA8] font-semibold' : 'text-[#667579]'}>
            {providerHealth.worldTerrain === 'CONNECTED' ? '✓ 3D WORLD TERRAIN' : 'TERRAIN: BASELINE (ELLIPSOID)'}
          </span>
          <span>•</span>
          <span className="text-[#D97706] font-bold">• SYNTHETIC DEMONSTRATION DATA</span>
        </div>
      </div>

      {/* 3. TOP-RIGHT FLOATING HUD: Provider Health & GIS Layer Stack */}
      <div className="absolute top-3 right-3 flex items-center space-x-2 z-20 font-sans pointer-events-auto">
        {/* Provider Health Check Button */}
        <div className="relative">
          <button
            onClick={() => setIsHealthPanelOpen(!isHealthPanelOpen)}
            className="flex items-center space-x-1.5 bg-[#FAF8F1]/95 border border-[#D7DEDC] px-2.5 py-1.5 rounded-xl backdrop-blur-md shadow-panel text-xs text-[#172126] font-medium hover:border-[#167F78] cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-[#167F78]" />
            <span className="text-[10px] font-mono font-bold uppercase">Provider Health</span>
          </button>

          {isHealthPanelOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-[#FAF8F1]/98 border border-[#D7DEDC] rounded-2xl p-3 shadow-panel backdrop-blur-md z-30 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-1.5">
                <span className="font-bold uppercase text-[11px] text-[#172126]">System Provider Health</span>
                <button onClick={() => setIsHealthPanelOpen(false)} className="text-[#667579] hover:text-[#172126]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1 text-[10px] font-mono">
                {Object.entries(providerHealth).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center bg-[#E6EDEB] p-1.5 rounded">
                    <span className="text-[#667579] uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className={`font-bold ${val.includes('CONNECTED') || val.includes('LIVE') ? 'text-[#167F78]' : 'text-[#D97706]'}`}>
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 18 GIS Layer Stack Controller Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all backdrop-blur-md cursor-pointer shadow-panel ${
              isLayerMenuOpen
                ? 'bg-[#167F78] text-white border-[#167F78]'
                : 'bg-[#FAF8F1]/95 border-[#D7DEDC] text-[#172126] hover:bg-[#FAF8F1]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>GIS Layers</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
              isLayerMenuOpen ? 'bg-white/20 text-white' : 'bg-[#E6EDEB] text-[#667579]'
            }`}>
              {activeLayersCount}/17
            </span>
          </button>

          {isLayerMenuOpen && (
            <div className="absolute right-0 mt-2 w-88 bg-[#FAF8F1]/98 border border-[#D7DEDC] rounded-2xl p-3 shadow-panel backdrop-blur-md z-30 text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2 text-[#667579] font-bold text-[11px] uppercase tracking-wider">
                <span className="flex items-center space-x-1.5 text-[#172126]">
                  <Layers className="w-4 h-4 text-[#167F78]" />
                  <span>Geospatial Layer Stack</span>
                </span>
                <button
                  onClick={() => setIsLayerMenuOpen(false)}
                  className="text-[#667579] hover:text-[#172126] p-0.5 cursor-pointer rounded-md hover:bg-[#E6EDEB]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Layer Categories Tab Bar */}
              <div className="grid grid-cols-3 gap-1 bg-[#E6EDEB] p-1 rounded-xl text-[10px] font-semibold text-[#667579]">
                {(['EARTH', 'STRUCTURES', 'ENVIRONMENT', 'RISK', 'OBSERVATION', 'RESPONSE'] as LayerCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedLayerCat(cat)}
                    className={`py-1 text-center rounded-lg transition-colors cursor-pointer capitalize ${
                      selectedLayerCat === cat
                        ? 'bg-[#FAF8F1] text-[#167F78] font-bold shadow-subtle'
                        : 'hover:text-[#172126]'
                    }`}
                  >
                    {cat.toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Filtered Layer List */}
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {selectedLayerCat === 'EARTH' && [
                  { key: '01_terrain' as const, label: 'Cesium World 3D Terrain', desc: 'Real USGS/SRTM 3D mountain topography' },
                  { key: '02_base_imagery' as const, label: 'High-Res Satellite Basemap', desc: 'Esri World Imagery 0-19L' }
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => toggleLayer(item.key)}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#D7DEDC] hover:border-[#167F78] cursor-pointer transition-colors shadow-subtle"
                  >
                    <div>
                      <div className="font-semibold text-[#172126] text-[11px]">{item.label}</div>
                      <div className="text-[10px] text-[#667579]">{item.desc}</div>
                    </div>
                    <span className={`w-3.5 h-3.5 rounded-full border-2 ${layers[item.key] ? 'bg-[#167F78] border-[#167F78]' : 'border-[#D7DEDC]'}`} />
                  </div>
                ))}

                {selectedLayerCat === 'STRUCTURES' && [
                  { key: '03_osm_buildings' as const, label: '3D Building Models & OSM', desc: 'Actual 3D models + OSM structures' },
                  { key: '04_infrastructure' as const, label: '3D Critical Infrastructure', desc: 'Hospitals, Shelters, Substation, Towers' },
                  { key: '05_bridges' as const, label: '3D Highway Truss Bridges', desc: 'Truss crossings & lifeline bridges' }
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => toggleLayer(item.key)}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#D7DEDC] hover:border-[#167F78] cursor-pointer transition-colors shadow-subtle"
                  >
                    <div>
                      <div className="font-semibold text-[#172126] text-[11px]">{item.label}</div>
                      <div className="text-[10px] text-[#667579]">{item.desc}</div>
                    </div>
                    <span className={`w-3.5 h-3.5 rounded-full border-2 ${layers[item.key] ? 'bg-[#167F78] border-[#167F78]' : 'border-[#D7DEDC]'}`} />
                  </div>
                ))}

                {selectedLayerCat === 'ENVIRONMENT' && [
                  { key: '06_roads' as const, label: 'National & State Corridors', desc: 'NH-10 / NH-717A / NH-27 / NH-37 networks' },
                  { key: '07_rivers' as const, label: 'River Drainage & Waterways', desc: 'Teesta / Brahmaputra / Barak streams' }
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => toggleLayer(item.key)}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#D7DEDC] hover:border-[#167F78] cursor-pointer transition-colors shadow-subtle"
                  >
                    <div>
                      <div className="font-semibold text-[#172126] text-[11px]">{item.label}</div>
                      <div className="text-[10px] text-[#667579]">{item.desc}</div>
                    </div>
                    <span className={`w-3.5 h-3.5 rounded-full border-2 ${layers[item.key] ? 'bg-[#167F78] border-[#167F78]' : 'border-[#D7DEDC]'}`} />
                  </div>
                ))}

                {selectedLayerCat === 'RISK' && [
                  { key: '08_hazard_polygons' as const, label: 'Landslide Hazard Polygons', desc: 'Translucent slope prediction failure envelopes' },
                  { key: '09_susceptibility' as const, label: 'GSI Slope Susceptibility', desc: 'Zone-V Geotechnical surface overlay' },
                  { key: '10_incidents' as const, label: 'Ground Incident Markers', desc: 'Verified field truth observations' }
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => toggleLayer(item.key)}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#D7DEDC] hover:border-[#167F78] cursor-pointer transition-colors shadow-subtle"
                  >
                    <div>
                      <div className="font-semibold text-[#172126] text-[11px]">{item.label}</div>
                      <div className="text-[10px] text-[#667579]">{item.desc}</div>
                    </div>
                    <span className={`w-3.5 h-3.5 rounded-full border-2 ${layers[item.key] ? 'bg-[#DC2626] border-[#DC2626]' : 'border-[#D7DEDC]'}`} />
                  </div>
                ))}

                {selectedLayerCat === 'OBSERVATION' && [
                  { key: '11_sentinel1_sar' as const, label: 'Copernicus Sentinel-1 SAR', desc: 'C-Band 5.405 GHz deformation evidence' },
                  { key: '12_sentinel2_optical' as const, label: 'Copernicus Sentinel-2 Optical', desc: 'Multispectral 10m surface change indicator' },
                  { key: '13_soil_moisture' as const, label: 'In-Situ Soil Moisture Saturation', desc: 'Dielectric pore pressure sensor mesh' },
                  { key: '14_rainfall' as const, label: 'Precipitation Telemetry Plume', desc: 'IMD AWS nowcast intensity overlay' }
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => toggleLayer(item.key)}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#D7DEDC] hover:border-[#167F78] cursor-pointer transition-colors shadow-subtle"
                  >
                    <div>
                      <div className="font-semibold text-[#172126] text-[11px]">{item.label}</div>
                      <div className="text-[10px] text-[#667579]">{item.desc}</div>
                    </div>
                    <span className={`w-3.5 h-3.5 rounded-full border-2 ${layers[item.key] ? 'bg-[#397FA8] border-[#397FA8]' : 'border-[#D7DEDC]'}`} />
                  </div>
                ))}

                {selectedLayerCat === 'RESPONSE' && [
                  { key: '15_blocked_roads' as const, label: 'Blocked Highway Corridors', desc: 'Active debris roadblocks' },
                  { key: '16_vulnerable_corridors' as const, label: 'Vulnerable Road Segments', desc: 'Highways under warning advisory' },
                  { key: '17_evacuation_routes' as const, label: 'Candidate Alternate Routes', desc: 'Tactical bypass routes to relief shelters' }
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => toggleLayer(item.key)}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#D7DEDC] hover:border-[#167F78] cursor-pointer transition-colors shadow-subtle"
                  >
                    <div>
                      <div className="font-semibold text-[#172126] text-[11px]">{item.label}</div>
                      <div className="text-[10px] text-[#667579]">{item.desc}</div>
                    </div>
                    <span className={`w-3.5 h-3.5 rounded-full border-2 ${layers[item.key] ? 'bg-[#167F78] border-[#167F78]' : 'border-[#D7DEDC]'}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Toggle */}
        {onToggleFullScreen && (
          <button
            onClick={onToggleFullScreen}
            className="p-2 bg-[#FAF8F1]/95 border border-[#D7DEDC] rounded-xl text-[#667579] hover:text-[#172126] transition-colors backdrop-blur-md cursor-pointer shadow-panel"
            title="Toggle Fullscreen"
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* 4. FAR-RIGHT 3D NAVIGATION CONTROLLER */}
      <div className="absolute top-16 right-3 flex flex-col items-center space-y-2 z-20 font-sans pointer-events-auto">
        <div
          onClick={handleResetNorth}
          className="w-10 h-10 rounded-full bg-[#FAF8F1]/95 border border-[#D7DEDC] shadow-panel backdrop-blur-md flex items-center justify-center relative cursor-pointer hover:border-[#167F78] transition-colors group"
          title="Reset North Orientation"
        >
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[9px] border-b-[#DC2626] absolute top-1.5" />
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[9px] border-t-[#667579] absolute bottom-1.5" />
          <span className="text-[9px] font-bold text-[#172126] font-mono absolute top-0.5">N</span>
        </div>

        <div className="flex flex-col bg-[#FAF8F1]/95 border border-[#D7DEDC] rounded-xl shadow-panel backdrop-blur-md overflow-hidden text-xs">
          <button
            onClick={() => handleZoom(0.35)}
            className="p-2.5 hover:bg-[#E6EDEB] text-[#172126] transition-colors cursor-pointer border-b border-[#D7DEDC]"
            title="Zoom In (+)"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(-0.35)}
            className="p-2.5 hover:bg-[#E6EDEB] text-[#172126] transition-colors cursor-pointer border-b border-[#D7DEDC]"
            title="Zoom Out (-)"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={handleTilt}
            className="p-2.5 hover:bg-[#E6EDEB] text-[#172126] transition-colors cursor-pointer font-bold text-[10px] border-b border-[#D7DEDC]"
            title="Toggle 3D Tilt Angle"
          >
            3D
          </button>
          <button
            onClick={() => flyToPreset('aoi')}
            className="p-2.5 hover:bg-[#E6EDEB] text-[#172126] transition-colors cursor-pointer"
            title="Reset to 3D Disaster Digital Twin View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5. BOTTOM-LEFT FLOATING BAR: Pipeline Hierarchy */}
      <div className="absolute bottom-3 left-3 flex items-center space-x-2 z-20 pointer-events-auto">
        <div className="flex items-center space-x-1.5 bg-[#FAF8F1]/95 border border-[#D7DEDC] px-3 py-1.5 rounded-xl backdrop-blur-md shadow-panel text-[11px] font-mono text-[#667579]">
          <span className="font-bold text-[#172126]">PIPELINE:</span>
          <span className="text-[#167F78] font-semibold">OBSERVE</span>
          <span>→</span>
          <span className="text-[#167F78] font-semibold">ANALYZE</span>
          <span>→</span>
          <span className="text-[#167F78] font-semibold">PREDICT</span>
          <span>→</span>
          <span className="text-[#167F78] font-semibold">VERIFY</span>
          <span>→</span>
          <span className="text-[#D97706] font-semibold">PRIORITIZE</span>
          <span>→</span>
          <span className="text-[#DC2626] font-semibold">RESPOND</span>
        </div>
      </div>

      {/* 6. RED ZONE INSPECTOR MODAL */}
      {inspectedHazardZone && (
        <RedZoneInspector
          zone={inspectedHazardZone}
          timeOffset={timeOffset}
          onClose={() => setInspectedHazardZone(null)}
          isModal={true}
        />
      )}

      {/* 7. STRUCTURE GIS INSPECTOR MODAL */}
      {inspectedBuilding && (
        <div className="absolute bottom-12 left-3 w-84 bg-[#FAF8F1]/98 border border-[#D7DEDC] rounded-2xl p-3.5 shadow-panel backdrop-blur-md z-30 font-sans text-xs space-y-2 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2">
            <div className="flex items-center space-x-1.5">
              <Building className="w-4 h-4 text-[#167F78]" />
              <span className="font-bold text-[#172126] text-xs">Structure GIS Inspector</span>
            </div>
            <button
              onClick={() => setInspectedBuilding(null)}
              className="text-[#667579] hover:text-[#172126] p-0.5 cursor-pointer rounded-md hover:bg-[#E6EDEB]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="bg-[#E6EDEB] p-2 rounded-xl">
              <div className="text-[10px] font-mono text-[#667579] uppercase font-bold">Identified Structure</div>
              <div className="font-bold text-[#172126]">{inspectedBuilding.name}</div>
              <div className="text-[10px] font-mono text-[#167F78]">{inspectedBuilding.id}</div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-[#E6EDEB]/60 p-1.5 rounded-lg">
                <span className="text-[10px] text-[#667579] block">Classification</span>
                <strong className="text-[#172126] font-mono">{inspectedBuilding.type}</strong>
              </div>
              <div className="bg-[#E6EDEB]/60 p-1.5 rounded-lg">
                <span className="text-[10px] text-[#667579] block">Elevation / Height</span>
                <strong className="text-[#172126] font-mono">{inspectedBuilding.height_m}</strong>
              </div>
            </div>

            <div className="bg-[#E6EDEB]/60 p-1.5 rounded-lg flex justify-between">
              <span className="text-[10px] text-[#667579]">Coordinates</span>
              <strong className="text-[#172126] font-mono">{inspectedBuilding.lat}° N, {inspectedBuilding.lng}° E</strong>
            </div>

            <div className="bg-[#E6EDEB]/60 p-1.5 rounded-lg space-y-0.5">
              <div className="flex justify-between">
                <span className="text-[10px] text-[#667579]">Hazard Proximity</span>
                <strong className="text-[#DC2626] font-semibold">{inspectedBuilding.hazard_exposure}</strong>
              </div>
              <div className="text-[10px] text-[#667579]">{inspectedBuilding.nearest_hazard}</div>
            </div>
          </div>

          <div className="pt-1.5 border-t border-[#D7DEDC] flex items-center justify-between text-[10px] font-mono text-[#667579]">
            <span>{inspectedBuilding.is_osm ? '• CESIUM OSM 3D TILES' : '• 3D GLB DIGITAL TWIN MODEL'}</span>
            <span className="text-[#167F78] font-bold">DIGITAL TWIN NODE</span>
          </div>
        </div>
      )}
    </div>
  );
};
