/**
 * COMMAND CENTRE HAZARD & RISK OVERLAY DATASET
 * Contains geographically anchored Landslide polygons, Flood zones,
 * and Road Blockage checkpoints for Command Centre.
 * 
 * Every risk score and threat level is calculated deterministically
 * by the InterpretableRiskEngine using physical geotechnical parameters.
 */

import { InterpretableRiskEngine } from '../../services/riskEngine';

export interface LandslideHazardZone {
  id: string;
  name: string;
  state: string;
  district: string;
  centerLng: number;
  centerLat: number;
  polygonCoords: number[]; // [lng1, lat1, lng2, lat2, ...]
  riskScorePct: number;
  threatLevel: 'CRITICAL' | 'HIGH' | 'MODERATE_HIGH' | 'MODERATE' | 'LOW';
  exposureScore: number;
  responsePriority: 'PRIORITY_1' | 'PRIORITY_2' | 'PRIORITY_3' | 'PRIORITY_4' | string;
  responsePriorityScore: number;
  priorityRationale: string;
  triggerMechanism: string;
  soilMoisturePct: number;
  slopeAngleDeg: number;
  rainfall1hMm: number;
  rainfall72hMm: number;
  historicalEvents5y: number;
  geology: string;
  populationExposed: number;
  villagesExposed: string[];
  roadsAffected: string[];
  threatenedBridges: string[];
  criticalFacilities: string[];
}

export interface FloodHazardZone {
  id: string;
  name: string;
  riverName: string;
  centerLng: number;
  centerLat: number;
  polygonCoords: number[];
  inundationLevel: 'DANGER_LEVEL' | 'WARNING_LEVEL' | 'MONITORING';
  waterRiseRateCmHr: number;
}

export interface RoadBlockageIncident {
  id: string;
  roadName: string;
  highwayCode: string;
  lng: number;
  lat: number;
  blockageType: 'LANDSLIDE_DEBRIS' | 'ROAD_COLLAPSE' | 'FLASH_FLOOD' | 'MUDSLIDE';
  status: 'BLOCKED' | 'SINGLE_LANE_OPEN' | 'CLEARANCE_IN_PROGRESS';
  estimatedClearanceHours: number;
  detourRoute: string;
  reportedTime: string;
}

interface RawHazardDefinition {
  id: string;
  name: string;
  state: string;
  district: string;
  centerLng: number;
  centerLat: number;
  polygonCoords: number[];
  triggerMechanism: string;
  soilMoisturePct: number;
  slopeAngleDeg: number;
  rainfall1hMm: number;
  rainfall72hMm: number;
  historicalEvents5y: number;
  geology: string;
  populationExposed: number;
  villagesExposed: string[];
  roadsAffected: string[];
  threatenedBridges: string[];
  criticalFacilities: string[];
}

const RAW_HAZARD_DEFINITIONS: RawHazardDefinition[] = [
  // SIKKIM 1: CRITICAL - Chungthang Basin (Teesta-III Dam Corridor)
  {
    id: 'HAZ-SK-01',
    name: 'Chungthang Basin (Teesta-III Dam Corridor)',
    state: 'Sikkim',
    district: 'Mangan',
    centerLng: 88.65060,
    centerLat: 27.59814,
    polygonCoords: [
      88.642, 27.590,  88.643, 27.608,  88.658, 27.609,  88.662, 27.594,  88.652, 27.588
    ],
    triggerMechanism: 'South Lhonak Glacial Lake Outburst Flood (GLOF) surge pulse wave exceeding 2,500 m³/s through Teesta gorge',
    soilMoisturePct: 88,
    slopeAngleDeg: 38.5,
    rainfall1hMm: 42.0,
    rainfall72hMm: 295.0,
    historicalEvents5y: 5,
    geology: 'Higher Himalayan Biotite Gneiss & Granitic Gneiss with deep glaciolacustrine alluvium',
    populationExposed: 4200,
    villagesExposed: ['Chungthang Town', 'Lachen Riverbank Basti', 'Lachung Confluence Hamlets'],
    roadsAffected: ['North Sikkim Highway (Chungthang Axis KM 0-12)', 'Teesta-III Dam Access Road'],
    threatenedBridges: ['Chungthang Suspension Bridge', 'Lachen–Lachung Confluence Bailey Span'],
    criticalFacilities: ['Teesta-III Concrete Gravity Dam', 'Chungthang Sub-Divisional Hospital', 'Teesta Powerhouse Control Block']
  },
  // SIKKIM 2: HIGH - Mangan - Chungthang North Axis
  {
    id: 'HAZ-SK-02',
    name: 'Mangan - Chungthang North Axis',
    state: 'Sikkim',
    district: 'Mangan',
    centerLng: 88.520,
    centerLat: 27.510,
    polygonCoords: [
      88.505, 27.495,  88.512, 27.525,  88.535, 27.530,  88.540, 27.505,  88.522, 27.490
    ],
    triggerMechanism: 'High infiltration from saturated slope crest along North Sikkim Highway',
    soilMoisturePct: 72,
    slopeAngleDeg: 38.0,
    rainfall1hMm: 26.0,
    rainfall72hMm: 160.0,
    historicalEvents5y: 4,
    geology: 'Foliated Daling Phyllite & Schist',
    populationExposed: 3800,
    villagesExposed: ['Mangan Bazaar', 'Chungthang Hub'],
    roadsAffected: ['North Sikkim Highway (Mangan-Chungthang Axis)'],
    threatenedBridges: ['Chungthang Confluence Bridge'],
    criticalFacilities: ['Mangan District Hospital', 'Teesta III Hydro Facility', 'BRO Border Post']
  },
  // SIKKIM 3: MODERATE - Upper Martam Ridge
  {
    id: 'HAZ-SK-03',
    name: 'Upper Martam Ridge Valley Sector',
    state: 'Sikkim',
    district: 'Gangtok',
    centerLng: 88.498,
    centerLat: 27.234,
    polygonCoords: [
      88.486, 27.225,  88.492, 27.245,  88.510, 27.248,  88.514, 27.230,  88.502, 27.220
    ],
    triggerMechanism: 'Moderate seepage along quartzite discontinuities under standard rainfall',
    soilMoisturePct: 58,
    slopeAngleDeg: 24.0,
    rainfall1hMm: 14.0,
    rainfall72hMm: 85.0,
    historicalEvents5y: 2,
    geology: 'Quartzite & Phyllite Alternation',
    populationExposed: 850,
    villagesExposed: ['Martam Ridge Hamlet', 'Upper Valley Farmsteads'],
    roadsAffected: ['Singtam - Martam Ridge Service Road'],
    threatenedBridges: [],
    criticalFacilities: ['Martam Secondary School', 'Local Health Clinic']
  },
  // SIKKIM 4: LOW - Rangpo - Melli Border Sector
  {
    id: 'HAZ-SK-04',
    name: 'Rangpo - Melli Interstate Corridor',
    state: 'Sikkim',
    district: 'Pakyong',
    centerLng: 88.532,
    centerLat: 27.176,
    polygonCoords: [
      88.515, 27.165,  88.522, 27.190,  88.545, 27.192,  88.548, 27.170,  88.530, 27.160
    ],
    triggerMechanism: 'Stable competent granitic gneiss with engineered retaining walls',
    soilMoisturePct: 35,
    slopeAngleDeg: 12.0,
    rainfall1hMm: 6.0,
    rainfall72hMm: 25.0,
    historicalEvents5y: 0,
    geology: 'Competent Granitic Gneiss',
    populationExposed: 5800,
    villagesExposed: ['Rangpo Checkpost Sector'],
    roadsAffected: ['NH-10 Rangpo Gateway Corridor'],
    threatenedBridges: ['Rangpo Interstate Bridge'],
    criticalFacilities: ['Rangpo Border Police Post', 'Commercial Checkpoint']
  },

  // ASSAM 1: CRITICAL - Haflong Ghat (NH-27 KM 84)
  {
    id: 'HAZ-AS-01',
    name: 'Haflong Ghat Disang Flysch Slump',
    state: 'Assam',
    district: 'Dima Hasao',
    centerLng: 93.024,
    centerLat: 25.176,
    polygonCoords: [
      93.010, 25.165,  93.015, 25.190,  93.038, 25.195,  93.042, 25.172,  93.028, 25.160
    ],
    triggerMechanism: 'Rotational slump in fractured Disang shale along railway & highway cut',
    soilMoisturePct: 88,
    slopeAngleDeg: 36.2,
    rainfall1hMm: 42.0,
    rainfall72hMm: 310.0,
    historicalEvents5y: 9,
    geology: 'Disang Shale & Sandstone',
    populationExposed: 2100,
    villagesExposed: ['Jatinga Valley Settlement', 'Lower Haflong Railway Colony'],
    roadsAffected: ['NH-27 East-West Corridor', 'Lumding-Badarpur Railway Line'],
    threatenedBridges: ['Diyung River Railway Span', 'Haflong Valley Viaduct'],
    criticalFacilities: ['Haflong Civil Hospital Access', 'Railway Traction Substation']
  },
  // ASSAM 2: HIGH - Jatinga Valley Rail Corridor
  {
    id: 'HAZ-AS-02',
    name: 'Jatinga Valley Rail Corridor',
    state: 'Assam',
    district: 'Dima Hasao',
    centerLng: 93.050,
    centerLat: 25.120,
    polygonCoords: [
      93.035, 25.105,  93.042, 25.135,  93.065, 25.140,  93.070, 25.115,  93.052, 25.100
    ],
    triggerMechanism: 'Progressive debris creep along railway track embankment during heavy monsoon showers',
    soilMoisturePct: 78,
    slopeAngleDeg: 30.5,
    rainfall1hMm: 24.0,
    rainfall72hMm: 155.0,
    historicalEvents5y: 5,
    geology: 'Fractured Disang Shale & Siltstone',
    populationExposed: 4200,
    villagesExposed: ['Jatinga Valley Village', 'Hill Station Track Hamlet'],
    roadsAffected: ['Jatinga Access Spur Road', 'Lumding Rail Track Alignment'],
    threatenedBridges: ['Access Road Bridge'],
    criticalFacilities: ['Jatinga Community Center', 'Railway Signal Post']
  },
  // ASSAM 3: MODERATE - Guwahati Nilachal Slopes
  {
    id: 'HAZ-AS-03',
    name: 'Guwahati Nilachal Hill Slopes',
    state: 'Assam',
    district: 'Kamrup Metropolitan',
    centerLng: 91.705,
    centerLat: 26.162,
    polygonCoords: [
      91.690, 26.150,  91.695, 26.175,  91.720, 26.178,  91.725, 26.155,  91.708, 26.145
    ],
    triggerMechanism: 'Urban cut-slope erosion on weathered granite gneiss crest',
    soilMoisturePct: 60,
    slopeAngleDeg: 22.0,
    rainfall1hMm: 16.0,
    rainfall72hMm: 90.0,
    historicalEvents5y: 2,
    geology: 'Weathered Granite Gneiss & Colluvium',
    populationExposed: 12500,
    villagesExposed: ['Kamakhya Hillside Ward', 'Nilachal Foothill Settlement'],
    roadsAffected: ['Kamakhya Temple Access Road'],
    threatenedBridges: [],
    criticalFacilities: ['Kamakhya Primary Health Center', 'Kamrup Metro Water Substation']
  },
  // ASSAM 4: LOW - Cachar Kalain Foothills
  {
    id: 'HAZ-AS-04',
    name: 'Cachar Kalain Foothill Corridor',
    state: 'Assam',
    district: 'Cachar',
    centerLng: 92.650,
    centerLat: 24.950,
    polygonCoords: [
      92.635, 24.935,  92.640, 24.965,  92.668, 24.970,  92.672, 24.945,  92.655, 24.930
    ],
    triggerMechanism: 'Gentle alluvial terrace with stable drainage channels',
    soilMoisturePct: 38,
    slopeAngleDeg: 11.0,
    rainfall1hMm: 8.0,
    rainfall72hMm: 28.0,
    historicalEvents5y: 0,
    geology: 'Surma Group Siltstone & Clay',
    populationExposed: 3200,
    villagesExposed: ['Kalain Bazaar'],
    roadsAffected: ['NH-6 Cachar Valley Highway'],
    threatenedBridges: [],
    criticalFacilities: ['Kalain Community Health Center']
  },

  // Meghalaya: Sohra Rim
  {
    id: 'HAZ-ML-01',
    name: 'Sohra Escarpment Southern Rim',
    state: 'Meghalaya',
    district: 'East Khasi Hills',
    centerLng: 91.730,
    centerLat: 25.280,
    polygonCoords: [
      91.710, 25.265,  91.718, 25.295,  91.745, 25.300,  91.750, 25.275,  91.732, 25.260
    ],
    triggerMechanism: 'Extreme orographic rainfall on jointed limestone & sandstone cliff face',
    soilMoisturePct: 92,
    slopeAngleDeg: 42.0,
    rainfall1hMm: 48.0,
    rainfall72hMm: 340.0,
    historicalEvents5y: 8,
    geology: 'Mahadek Sandstone & Calcareous Gneiss',
    populationExposed: 1800,
    villagesExposed: ['Sohra Rim Hamlet', 'Nongriat Trail Cluster'],
    roadsAffected: ['SH-5 Shillong - Sohra Highway'],
    threatenedBridges: ['Wahkaba Stream Crossing'],
    criticalFacilities: ['Water Intake Pipeline', 'Sohra Community Shelter']
  },
  // Arunachal Pradesh: Sela Pass
  {
    id: 'HAZ-AR-01',
    name: 'Sela Pass Alpine Corridor (NH-13)',
    state: 'Arunachal Pradesh',
    district: 'Tawang',
    centerLng: 92.100,
    centerLat: 27.500,
    polygonCoords: [
      92.080, 27.485,  92.088, 27.518,  92.115, 27.520,  92.122, 27.495,  92.105, 27.480
    ],
    triggerMechanism: 'Freeze-thaw wedge splitting on high-altitude fractured granitic gneiss',
    soilMoisturePct: 76,
    slopeAngleDeg: 38.5,
    rainfall1hMm: 32.0,
    rainfall72hMm: 190.0,
    historicalEvents5y: 5,
    geology: 'High-Grade Quartzite & Pelitic Gneiss',
    populationExposed: 650,
    villagesExposed: ['Jaswantgarh Outpost Settlement', 'Sela Lake Hamlet'],
    roadsAffected: ['NH-13 Trans-Arunachal Highway'],
    threatenedBridges: ['Tawang River Bailey Bridge'],
    criticalFacilities: ['Sela Tunnel Northern Portal Approach', 'Forward Logistics Hub']
  }
];

// 1. HIGH-PRECISION LANDSLIDE HAZARD POLYGONS WITH ENGINE-CALCULATED SCORES
export const LANDSLIDE_HAZARD_ZONES: LandslideHazardZone[] = RAW_HAZARD_DEFINITIONS.map(raw => {
  const calc = InterpretableRiskEngine.evaluateRisk({
    zoneId: raw.id,
    zoneName: raw.name,
    state: raw.state,
    district: raw.district,
    rainfall_1h_mm: raw.rainfall1hMm,
    rainfall_72h_mm: raw.rainfall72hMm,
    slope_deg: raw.slopeAngleDeg,
    soil_moisture_pct: raw.soilMoisturePct,
    historical_events_5y: raw.historicalEvents5y,
    lithology: raw.geology,
    population_exposed: raw.populationExposed,
    villages_exposed: raw.villagesExposed,
    roads_affected: raw.roadsAffected,
    threatened_bridges: raw.threatenedBridges,
    critical_facilities: raw.criticalFacilities
  });

  return {
    id: raw.id,
    name: raw.name,
    state: raw.state,
    district: raw.district,
    centerLng: raw.centerLng,
    centerLat: raw.centerLat,
    polygonCoords: raw.polygonCoords,
    riskScorePct: calc.riskScore,
    threatLevel: calc.riskLevel,
    exposureScore: calc.exposureScore,
    responsePriority: calc.responsePriority,
    responsePriorityScore: calc.responsePriorityScore,
    priorityRationale: calc.priorityRationale,
    triggerMechanism: raw.triggerMechanism,
    soilMoisturePct: raw.soilMoisturePct,
    slopeAngleDeg: raw.slopeAngleDeg,
    rainfall1hMm: raw.rainfall1hMm,
    rainfall72hMm: raw.rainfall72hMm,
    historicalEvents5y: raw.historicalEvents5y,
    geology: raw.geology,
    populationExposed: raw.populationExposed,
    villagesExposed: raw.villagesExposed,
    roadsAffected: raw.roadsAffected,
    threatenedBridges: raw.threatenedBridges,
    criticalFacilities: raw.criticalFacilities
  };
});

// 2. FLOOD HAZARD CORRIDORS
export const FLOOD_HAZARD_ZONES: FloodHazardZone[] = [
  {
    id: 'FLD-SK-01',
    name: 'Teesta River Basin (Singtam Confluence)',
    riverName: 'Teesta',
    centerLng: 88.498,
    centerLat: 27.234,
    polygonCoords: [
      88.480, 27.220,  88.485, 27.245,  88.512, 27.248,  88.518, 27.228,  88.495, 27.215
    ],
    inundationLevel: 'DANGER_LEVEL',
    waterRiseRateCmHr: 8.4
  },
  {
    id: 'FLD-AS-01',
    name: 'Brahmaputra Floodplain (Guwahati Reach)',
    riverName: 'Brahmaputra',
    centerLng: 91.736,
    centerLat: 26.144,
    polygonCoords: [
      91.710, 26.130,  91.718, 26.160,  91.755, 26.162,  91.760, 26.135,  91.730, 26.125
    ],
    inundationLevel: 'WARNING_LEVEL',
    waterRiseRateCmHr: 4.2
  }
];

// 3. ROAD BLOCKAGE CHECKPOINTS
export const ROAD_BLOCKAGE_INCIDENTS: RoadBlockageIncident[] = [
  {
    id: 'BLK-SK-01',
    roadName: 'NH-10 Siliguri - Gangtok Highway (KM 19 Dikchu)',
    highwayCode: 'NH-10',
    lng: 88.535,
    lat: 27.398,
    blockageType: 'LANDSLIDE_DEBRIS',
    status: 'BLOCKED',
    estimatedClearanceHours: 4.5,
    detourRoute: 'NH-717A Pakyong - Lava Bypass Active',
    reportedTime: '13:42 IST'
  },
  {
    id: 'BLK-AS-01',
    roadName: 'NH-27 East-West Corridor (Haflong Ghat KM 84)',
    highwayCode: 'NH-27',
    lng: 93.024,
    lat: 25.176,
    blockageType: 'ROAD_COLLAPSE',
    status: 'SINGLE_LANE_OPEN',
    estimatedClearanceHours: 2.0,
    detourRoute: 'Jatinga - Lumding Link Road Bypass',
    reportedTime: '12:15 IST'
  }
];
