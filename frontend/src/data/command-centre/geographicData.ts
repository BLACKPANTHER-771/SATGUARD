/**
 * COMMAND CENTRE GEOGRAPHIC INTELLIGENCE DATASET
 * Dedicated strictly to Command Centre map rendering.
 * Contains national India boundaries, 8 Northeast state boundaries,
 * major rivers, highway corridors, major cities, and critical infrastructure POIs.
 */

export interface GeoCoordinate {
  lng: number;
  lat: number;
}

export interface CityHub {
  id: string;
  name: string;
  state: string;
  lng: number;
  lat: number;
  isCapital: boolean;
  population?: string;
  region: 'INDIA_MAJOR' | 'NORTHEAST';
}

export interface RiverData {
  id: string;
  name: string;
  coords: number[]; // [lng1, lat1, lng2, lat2, ...]
  width: number;
  flowSeverity: 'NORMAL' | 'ELEVATED' | 'FLOOD_WARNING' | 'DANGER_LEVEL';
}

export interface HighwayCorridor {
  id: string;
  code: string;
  name: string;
  coords: number[]; // [lng1, lat1, lng2, lat2, ...]
  status: 'OPEN' | 'WATCH' | 'AT_RISK' | 'BLOCKED';
  state: string;
  blockagePoint?: { lng: number; lat: number; reason: string };
}

export interface CriticalInfraPOI {
  id: string;
  name: string;
  type: 'BRIDGE' | 'HOSPITAL' | 'POWER' | 'SHELTER' | 'DEFENSE' | 'TUNNEL';
  lng: number;
  lat: number;
  state: string;
  district: string;
  status: 'OPERATIONAL' | 'THREATENED' | 'ISOLATED' | 'STANDBY';
}

// 1. INDIA NATIONAL BOUNDARY (Simplified smooth outer polygon for high performance)
export const INDIA_NATIONAL_BOUNDARY: number[] = [
  // Northwest / Kashmir / Ladakh
  74.8, 35.8,  76.5, 36.5,  78.2, 35.5,  79.5, 33.5,  78.8, 32.2,
  // Himachal / Uttarakhand
  79.2, 31.0,  80.2, 30.5,  81.0, 30.2,
  // Nepal Border northern edge to Sikkim
  83.0, 27.8,  85.5, 27.0,  88.0, 27.2,
  // Sikkim
  88.2, 28.1,  88.8, 28.0,  88.9, 27.3,
  // Bhutan Border to Arunachal
  90.0, 27.3,  91.8, 27.4,  92.5, 28.2,  94.5, 29.0,  96.5, 28.5,  97.4, 28.0,
  // Eastern Tip / Myanmar Border / Nagaland / Manipur / Mizoram
  97.0, 27.0,  95.5, 26.0,  94.5, 24.8,  93.4, 23.8,  93.2, 22.4,  92.8, 22.0,
  // Tripura / Bangladesh Border
  92.0, 22.8,  91.4, 23.5,  92.1, 24.5,  90.5, 25.1,  89.8, 25.8,  89.0, 25.5,
  // West Bengal / Odisha / Coastline
  88.2, 22.2,  86.8, 21.0,  85.0, 19.5,  83.2, 17.8,  80.3, 16.0,  80.2, 13.0,
  // Southern Tip (Tamil Nadu / Kanyakumari)
  79.8, 10.5,  78.0, 8.5,   77.5, 8.0,   76.5, 8.8,
  // West Coast (Kerala / Karnataka / Goa / Maharashtra / Gujarat)
  75.5, 11.5,  74.5, 14.5,  73.8, 15.5,  72.8, 19.0,  72.6, 21.2,
  // Gujarat / Rann of Kutch
  70.0, 21.0,  68.8, 22.5,  68.5, 23.8,  70.5, 24.5,
  // Rajasthan / Punjab / J&K Western Border
  71.0, 26.5,  71.8, 28.5,  73.8, 30.5,  74.8, 32.5,  74.8, 35.8
];

// 2. ALL 8 NORTHEAST STATE BOUNDARIES (WGS84)
export const NE_STATE_BOUNDARIES: Record<string, { name: string; code: string; color: string; coords: number[]; capital: string }> = {
  Sikkim: {
    name: 'Sikkim',
    code: 'SK',
    color: '#167F78',
    capital: 'Gangtok',
    coords: [
      88.006, 27.080,  88.080, 27.420,  88.250, 27.850,  88.550, 28.120,
      88.880, 27.900,  88.750, 27.350,  88.580, 27.100,  88.006, 27.080
    ]
  },
  Assam: {
    name: 'Assam',
    code: 'AS',
    color: '#587A68',
    capital: 'Dispur / Guwahati',
    coords: [
      89.85, 26.20,  90.50, 26.65,  91.80, 26.90,  93.20, 27.00,
      94.60, 27.50,  95.80, 27.80,  96.00, 27.20,  95.00, 26.50,
      93.80, 25.80,  93.20, 25.00,  92.80, 24.50,  92.40, 25.00,
      91.50, 25.80,  90.40, 25.90,  89.85, 26.20
    ]
  },
  Meghalaya: {
    name: 'Meghalaya',
    code: 'ML',
    color: '#397FA8',
    capital: 'Shillong',
    coords: [
      90.00, 25.20,  90.30, 25.85,  91.50, 25.80,  92.50, 25.60,
      92.80, 25.20,  92.50, 25.00,  91.20, 25.10,  90.00, 25.20
    ]
  },
  ArunachalPradesh: {
    name: 'Arunachal Pradesh',
    code: 'AR',
    color: '#C58A24',
    capital: 'Itanagar',
    coords: [
      91.70, 27.35,  92.20, 28.00,  93.50, 28.70,  95.00, 29.00,
      96.50, 28.60,  97.35, 28.15,  96.80, 27.20,  95.50, 27.30,
      94.20, 27.10,  93.00, 27.00,  91.70, 27.35
    ]
  },
  Nagaland: {
    name: 'Nagaland',
    code: 'NL',
    color: '#9C6644',
    capital: 'Kohima',
    coords: [
      93.50, 25.60,  94.20, 26.10,  95.10, 26.85,  95.35, 26.40,
      94.80, 25.70,  93.80, 25.20,  93.50, 25.60
    ]
  },
  Manipur: {
    name: 'Manipur',
    code: 'MN',
    color: '#A0522D',
    capital: 'Imphal',
    coords: [
      93.10, 24.30,  93.50, 25.40,  94.30, 25.60,  94.70, 24.80,
      94.30, 23.90,  93.50, 23.90,  93.10, 24.30
    ]
  },
  Mizoram: {
    name: 'Mizoram',
    code: 'MZ',
    color: '#8B5A2B',
    capital: 'Aizawl',
    coords: [
      92.30, 23.70,  92.70, 24.40,  93.30, 24.20,  93.40, 23.00,
      92.80, 22.00,  92.30, 22.50,  92.30, 23.70
    ]
  },
  Tripura: {
    name: 'Tripura',
    code: 'TR',
    color: '#2E8B57',
    capital: 'Agartala',
    coords: [
      91.20, 23.80,  91.50, 24.50,  92.30, 24.30,  92.30, 23.50,
      91.80, 23.00,  91.20, 23.80
    ]
  }
};

// 3. MAJOR CITIES & HUBS (National & Northeast)
export const MAJOR_CITIES_DATA: CityHub[] = [
  // National Metros & Gateways
  { id: 'DEL', name: 'New Delhi', state: 'Delhi', lng: 77.2090, lat: 28.6139, isCapital: true, population: '32M', region: 'INDIA_MAJOR' },
  { id: 'KOL', name: 'Kolkata', state: 'West Bengal', lng: 88.3639, lat: 22.5726, isCapital: true, population: '15M', region: 'INDIA_MAJOR' },
  { id: 'MUM', name: 'Mumbai', state: 'Maharashtra', lng: 72.8777, lat: 19.0760, isCapital: true, population: '21M', region: 'INDIA_MAJOR' },
  { id: 'BLR', name: 'Bengaluru', state: 'Karnataka', lng: 77.5946, lat: 12.9716, isCapital: true, population: '13M', region: 'INDIA_MAJOR' },
  { id: 'PAT', name: 'Patna', state: 'Bihar', lng: 85.1376, lat: 25.5941, isCapital: true, population: '2.5M', region: 'INDIA_MAJOR' },
  { id: 'SLG', name: 'Siliguri (Chicken Neck)', state: 'West Bengal', lng: 88.4350, lat: 26.7271, isCapital: false, population: '700k', region: 'INDIA_MAJOR' },

  // Northeast Capitals & Strategic Hubs
  { id: 'GAU', name: 'Guwahati / Dispur', state: 'Assam', lng: 91.7362, lat: 26.1445, isCapital: true, population: '1.2M', region: 'NORTHEAST' },
  { id: 'GTK', name: 'Gangtok', state: 'Sikkim', lng: 88.6138, lat: 27.3314, isCapital: true, population: '102k', region: 'NORTHEAST' },
  { id: 'SHL', name: 'Shillong', state: 'Meghalaya', lng: 91.8933, lat: 25.5788, isCapital: true, population: '145k', region: 'NORTHEAST' },
  { id: 'ITA', name: 'Itanagar', state: 'Arunachal Pradesh', lng: 93.6053, lat: 27.0844, isCapital: true, population: '60k', region: 'NORTHEAST' },
  { id: 'AIZ', name: 'Aizawl', state: 'Mizoram', lng: 92.7176, lat: 23.7271, isCapital: true, population: '295k', region: 'NORTHEAST' },
  { id: 'KOH', name: 'Kohima', state: 'Nagaland', lng: 94.1086, lat: 25.6751, isCapital: true, population: '100k', region: 'NORTHEAST' },
  { id: 'IMP', name: 'Imphal', state: 'Manipur', lng: 93.9368, lat: 24.8170, isCapital: true, population: '270k', region: 'NORTHEAST' },
  { id: 'AGT', name: 'Agartala', state: 'Tripura', lng: 91.2868, lat: 23.8315, isCapital: true, population: '400k', region: 'NORTHEAST' },

  // Key Disaster-Monitored Sector Towns
  { id: 'SGT', name: 'Singtam', state: 'Sikkim', lng: 88.498, lat: 27.234, isCapital: false, population: '4,200', region: 'NORTHEAST' },
  { id: 'DKC', name: 'Dikchu (Mile 14)', state: 'Sikkim', lng: 88.535, lat: 27.398, isCapital: false, population: '1,420', region: 'NORTHEAST' },
  { id: 'MGN', name: 'Mangan', state: 'Sikkim', lng: 88.520, lat: 27.510, isCapital: false, population: '4,600', region: 'NORTHEAST' },
  { id: 'HFL', name: 'Haflong', state: 'Assam', lng: 93.0238, lat: 25.1764, isCapital: false, population: '44k', region: 'NORTHEAST' },
  { id: 'SHR', name: 'Sohra (Cherrapunji)', state: 'Meghalaya', lng: 91.7323, lat: 25.2702, isCapital: false, population: '12k', region: 'NORTHEAST' },
  { id: 'TWG', name: 'Tawang', state: 'Arunachal Pradesh', lng: 91.8660, lat: 27.5860, isCapital: false, population: '11k', region: 'NORTHEAST' },
  { id: 'DMP', name: 'Dimapur', state: 'Nagaland', lng: 93.7266, lat: 25.9068, isCapital: false, population: '122k', region: 'NORTHEAST' },
  { id: 'SIL', name: 'Silchar', state: 'Assam', lng: 92.7976, lat: 24.8333, isCapital: false, population: '175k', region: 'NORTHEAST' }
];

// 4. MAJOR RIVER SYSTEMS
export const MAJOR_RIVERS_DATA: RiverData[] = [
  {
    id: 'brahmaputra',
    name: 'Brahmaputra River',
    width: 6.0,
    flowSeverity: 'ELEVATED',
    coords: [
      95.50, 27.80,  94.80, 27.20,  93.80, 26.70,  92.80, 26.30,
      91.70, 26.15,  90.60, 26.10,  89.80, 25.90,  89.60, 25.20
    ]
  },
  {
    id: 'teesta',
    name: 'Teesta River Mainstem',
    width: 4.5,
    flowSeverity: 'DANGER_LEVEL',
    coords: [
      88.60, 27.80,  88.542, 27.425,  88.535, 27.398,  88.528, 27.345,
      88.512, 27.284,  88.498, 27.234,  88.518, 27.195,  88.532, 27.176,
      88.502, 27.142,  88.455, 27.092,  88.60, 26.50
    ]
  },
  {
    id: 'barak',
    name: 'Barak River',
    width: 3.8,
    flowSeverity: 'FLOOD_WARNING',
    coords: [
      94.10, 25.20,  93.50, 24.90,  92.80, 24.80,  92.50, 24.85,  92.20, 24.60
    ]
  },
  {
    id: 'ganga_national',
    name: 'Ganga River Basin',
    width: 5.0,
    flowSeverity: 'NORMAL',
    coords: [
      78.50, 30.10,  80.00, 28.00,  82.00, 25.50,  85.00, 25.50,
      87.50, 25.20,  88.20, 22.50
    ]
  }
];

// 5. HIGHWAY ARTERIAL CORRIDORS (Status Geographically Mapped)
export const HIGHWAYS_DATA: HighwayCorridor[] = [
  {
    id: 'NH-10',
    code: 'NH-10',
    name: 'NH-10 Himalayan Arterial Highway (Siliguri - Gangtok)',
    state: 'Sikkim',
    status: 'BLOCKED',
    blockagePoint: { lng: 88.535, lat: 27.398, reason: 'Colluvial Landslide & Debris Flow at KM 19' },
    coords: [
      88.435, 26.727,  88.455, 27.092,  88.472, 27.125,  88.508, 27.155,
      88.532, 27.176,  88.525, 27.202,  88.498, 27.234,  88.512, 27.284,
      88.545, 27.315,  88.585, 27.328,  88.613, 27.331,  88.562, 27.365,
      88.535, 27.398,  88.520, 27.480,  88.520, 27.510
    ]
  },
  {
    id: 'NH-717A',
    code: 'NH-717A',
    name: 'NH-717A Pakyong Alternative Bypass',
    state: 'Sikkim',
    status: 'OPEN',
    coords: [
      88.532, 27.176,  88.560, 27.205,  88.590, 27.250,  88.613, 27.331
    ]
  },
  {
    id: 'NH-27',
    code: 'NH-27',
    name: 'NH-27 East-West Arterial Corridor (Guwahati - Haflong - Silchar)',
    state: 'Assam',
    status: 'AT_RISK',
    blockagePoint: { lng: 93.024, lat: 25.176, reason: 'Subsidence Warning along Haflong Ghat' },
    coords: [
      91.736, 26.144,  92.500, 26.000,  92.900, 25.500,  93.024, 25.176,  92.798, 24.833
    ]
  },
  {
    id: 'NH-13',
    code: 'NH-13',
    name: 'NH-13 Trans-Arunachal Highway (Bhalukpong - Sela - Tawang)',
    state: 'Arunachal Pradesh',
    status: 'AT_RISK',
    blockagePoint: { lng: 92.103, lat: 27.505, reason: 'Scree slope failure near Sela Pass approach' },
    coords: [
      92.650, 26.980,  92.400, 27.150,  92.103, 27.505,  91.866, 27.586
    ]
  },
  {
    id: 'NH-6',
    code: 'NH-6',
    name: 'NH-6 Shillong - Jowai - Ratacherra Corridor',
    state: 'Meghalaya',
    status: 'WATCH',
    coords: [
      91.893, 25.578,  92.200, 25.450,  92.500, 25.200,  92.700, 24.900
    ]
  },
  {
    id: 'NH-29',
    code: 'NH-29',
    name: 'NH-29 Dimapur - Kohima Highway',
    state: 'Nagaland',
    status: 'WATCH',
    coords: [
      93.727, 25.907,  93.850, 25.800,  94.109, 25.675
    ]
  },
  {
    id: 'NH-54',
    code: 'NH-54',
    name: 'NH-54 Silchar - Aizawl Lifeline',
    state: 'Mizoram',
    status: 'AT_RISK',
    coords: [
      92.798, 24.833,  92.750, 24.200,  92.718, 23.727
    ]
  }
];

// 6. CRITICAL INFRASTRUCTURE POIs (Geographically Anchored)
export const CRITICAL_INFRA_DATA: CriticalInfraPOI[] = [
  // Sikkim
  { id: 'INF-SK-01', name: 'Teesta Stage-V Hydro Dam (510MW)', type: 'POWER', lng: 88.512, lat: 27.284, state: 'Sikkim', district: 'Gangtok', status: 'THREATENED' },
  { id: 'INF-SK-02', name: 'Dikchu Suspension Bailey Bridge', type: 'BRIDGE', lng: 88.533, lat: 27.396, state: 'Sikkim', district: 'Pakyong', status: 'ISOLATED' },
  { id: 'INF-SK-03', name: 'Singtam Indreni Suspension Bridge', type: 'BRIDGE', lng: 88.501, lat: 27.241, state: 'Sikkim', district: 'Gangtok', status: 'OPERATIONAL' },
  { id: 'INF-SK-04', name: 'Singtam Sub-Divisional Hospital', type: 'HOSPITAL', lng: 88.496, lat: 27.239, state: 'Sikkim', district: 'Gangtok', status: 'OPERATIONAL' },
  { id: 'INF-SK-05', name: 'Dikchu Primary Health Sub-Centre', type: 'HOSPITAL', lng: 88.537, lat: 27.399, state: 'Sikkim', district: 'Pakyong', status: 'THREATENED' },
  { id: 'INF-SK-06', name: 'Singtam Senior Secondary Emergency Shelter', type: 'SHELTER', lng: 88.495, lat: 27.230, state: 'Sikkim', district: 'Gangtok', status: 'STANDBY' },
  { id: 'INF-SK-07', name: 'BRO Mile 14 Staging Outpost', type: 'DEFENSE', lng: 88.536, lat: 27.404, state: 'Sikkim', district: 'Pakyong', status: 'STANDBY' },

  // Assam
  { id: 'INF-AS-01', name: 'Haflong Civil Hospital Access Route', type: 'HOSPITAL', lng: 93.025, lat: 25.180, state: 'Assam', district: 'Dima Hasao', status: 'THREATENED' },
  { id: 'INF-AS-02', name: 'NF Railway Lumding-Badarpur Traction Hub', type: 'POWER', lng: 93.030, lat: 25.165, state: 'Assam', district: 'Dima Hasao', status: 'STANDBY' },

  // Arunachal Pradesh
  { id: 'INF-AR-01', name: 'Sela Tunnel North Portal Gateway', type: 'TUNNEL', lng: 92.105, lat: 27.508, state: 'Arunachal Pradesh', district: 'Tawang', status: 'THREATENED' },
  { id: 'INF-AR-02', name: 'Baisakhi Forward Military Logistics Post', type: 'DEFENSE', lng: 92.110, lat: 27.490, state: 'Arunachal Pradesh', district: 'West Kameng', status: 'STANDBY' },

  // Meghalaya
  { id: 'INF-ML-01', name: 'Sohra Community Civil Defense Shelter', type: 'SHELTER', lng: 91.735, lat: 25.275, state: 'Meghalaya', district: 'East Khasi Hills', status: 'STANDBY' },
  { id: 'INF-ML-02', name: 'Nohkalikai Water Intake Pipeline Complex', type: 'POWER', lng: 91.728, lat: 25.265, state: 'Meghalaya', district: 'East Khasi Hills', status: 'THREATENED' }
];
