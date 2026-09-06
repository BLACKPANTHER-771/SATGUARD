/**
 * EPOCH — AUTHORITATIVE GEOSPATIAL AOI REGISTRY
 * 
 * Single source of truth for:
 * 1. Geographic Identity (State, District, AOI ID, Name, Coordinates, Boundaries, Camera Presets)
 * 2. Associated Assets (Roads, Bridges, Hospitals, Schools, Critical Infrastructure, Settlements, Population)
 * 3. Geotechnical Input Features (Slope angle, Soil moisture baseline, Lithology, Soil type, Historical frequency)
 * 
 * CRITICAL ARCHITECTURE RULE:
 * This registry is authoritative ONLY for geographic identity, assets, and input features.
 * It DOES NOT store or hardcode calculated risk scores, exposure scores, or response priorities.
 * All calculation results are produced dynamically by the existing Phase 2, 3, 4, 5 engines.
 */

export interface AssociatedRoad {
  id: string;
  code: string;
  name: string;
  importance: string;
  status: 'OPEN' | 'WATCH' | 'AT_RISK' | 'BLOCKED' | 'SINGLE_LANE_OPEN';
  classification: 'CRITICAL' | 'HIGH' | 'MODERATE';
}

export interface AssociatedBridge {
  id: string;
  name: string;
  spanType?: string;
}

export interface AssociatedFacility {
  id: string;
  name: string;
  type: 'HOSPITAL' | 'SCHOOL' | 'POWER' | 'RAILWAY' | 'DEFENSE' | 'COMMUNITY_SHELTER';
}

export interface AssociatedSettlement {
  id: string;
  name: string;
  population: number;
}

export interface GeotechnicalInputFeatures {
  slope_deg: number;
  soil_moisture_pct: number;
  historical_events_5y: number;
  lithology: string;
  soil_type: string;
  aspect?: string;
  curvature?: number;
}

export interface AuthoritativeAOI {
  id: string;
  name: string;
  state: string;
  stateCode: 'SK' | 'AS' | string;
  district: string;
  lat: number;
  lng: number;
  elevation_m: number;
  polygonCoords: number[]; // [lng1, lat1, lng2, lat2, ...]
  cameraPreset: {
    lng: number;
    lat: number;
    height: number;
    headingDeg: number;
    pitchDeg: number;
  };
  associatedAssets: {
    roads: AssociatedRoad[];
    bridges: AssociatedBridge[];
    facilities: AssociatedFacility[];
    settlements: AssociatedSettlement[];
    totalPopulationExposed: number;
  };
  geotechnicalInputs: GeotechnicalInputFeatures;
  triggerMechanism: string;
  provenance: 'SYNTHETIC' | 'LIVE' | 'DERIVED' | 'FALLBACK';
}

export interface AuthoritativeState {
  code: string;
  name: string;
  capital: string;
  districts: string[];
  primaryAOIId: string;
  centerLng: number;
  centerLat: number;
  bounds: number[];
  cameraPreset: {
    lng: number;
    lat: number;
    height: number;
    headingDeg: number;
    pitchDeg: number;
  };
}

// -------------------------------------------------------------------------
// 1. AUTHORITATIVE STATE DEFINITIONS
// -------------------------------------------------------------------------
export const AUTHORITATIVE_STATES: Record<string, AuthoritativeState> = {
  Sikkim: {
    code: 'SK',
    name: 'Sikkim',
    capital: 'Gangtok',
    districts: ['Pakyong', 'Gangtok', 'Mangan', 'Namchi', 'Gyalshing', 'Soreng'],
    primaryAOIId: 'sikkim-nh10-dikchu',
    centerLng: 88.528,
    centerLat: 27.420,
    bounds: [88.006, 27.080, 88.880, 28.120],
    cameraPreset: {
      lng: 88.528,
      lat: 27.420,
      height: 120000,
      headingDeg: 8,
      pitchDeg: -55.0
    }
  },
  Assam: {
    code: 'AS',
    name: 'Assam',
    capital: 'Dispur / Guwahati',
    districts: ['Dima Hasao', 'Kamrup Metropolitan', 'Cachar', 'Karbi Anglong', 'Sonitpur', 'Dibrugarh'],
    primaryAOIId: 'assam-dima-hasao-haflong',
    centerLng: 93.024,
    centerLat: 25.176,
    bounds: [89.850, 24.150, 96.000, 28.000],
    cameraPreset: {
      lng: 93.024,
      lat: 25.176,
      height: 180000,
      headingDeg: 0,
      pitchDeg: -65.0
    }
  },
  'Arunachal Pradesh': {
    code: 'AR',
    name: 'Arunachal Pradesh',
    capital: 'Itanagar',
    districts: ['Tawang', 'West Kameng', 'Papum Pare', 'East Siang', 'Upper Siang', 'Lower Subansiri'],
    primaryAOIId: 'arunachal-tawang-sela',
    centerLng: 94.500,
    centerLat: 28.000,
    bounds: [91.500, 26.500, 97.500, 29.500],
    cameraPreset: {
      lng: 93.600,
      lat: 27.800,
      height: 380000,
      headingDeg: 12,
      pitchDeg: -58.0
    }
  },
  Meghalaya: {
    code: 'ML',
    name: 'Meghalaya',
    capital: 'Shillong',
    districts: ['East Khasi Hills', 'West Garo Hills', 'East Jaintia Hills', 'Ri-Bhoi', 'West Khasi Hills'],
    primaryAOIId: 'meghalaya-east-khasi-sohra',
    centerLng: 91.360,
    centerLat: 25.500,
    bounds: [89.800, 25.000, 92.800, 26.100],
    cameraPreset: {
      lng: 91.800,
      lat: 25.480,
      height: 160000,
      headingDeg: 0,
      pitchDeg: -60.0
    }
  },
  Manipur: {
    code: 'MN',
    name: 'Manipur',
    capital: 'Imphal',
    districts: ['Noney', 'Tamenglong', 'Imphal West', 'Imphal East', 'Churachandpur', 'Senapati'],
    primaryAOIId: 'manipur-noney-tupul',
    centerLng: 93.900,
    centerLat: 24.800,
    bounds: [93.000, 23.800, 94.800, 25.700],
    cameraPreset: {
      lng: 93.900,
      lat: 24.800,
      height: 190000,
      headingDeg: 0,
      pitchDeg: -62.0
    }
  },
  Mizoram: {
    code: 'MZ',
    name: 'Mizoram',
    capital: 'Aizawl',
    districts: ['Aizawl', 'Lunglei', 'Champhai', 'Kolasib', 'Serchhip', 'Mamit'],
    primaryAOIId: 'mizoram-aizawl-laipuitlang',
    centerLng: 92.800,
    centerLat: 23.300,
    bounds: [92.200, 21.900, 93.500, 24.500],
    cameraPreset: {
      lng: 92.800,
      lat: 23.300,
      height: 180000,
      headingDeg: 0,
      pitchDeg: -60.0
    }
  },
  Nagaland: {
    code: 'NL',
    name: 'Nagaland',
    capital: 'Kohima',
    districts: ['Kohima', 'Dimapur', 'Chumoukedima', 'Mokokchung', 'Wokha', 'Phek', 'Tuensang'],
    primaryAOIId: 'nagaland-kohima-paglapahar',
    centerLng: 94.100,
    centerLat: 26.150,
    bounds: [93.300, 25.100, 95.300, 27.000],
    cameraPreset: {
      lng: 94.100,
      lat: 26.150,
      height: 175000,
      headingDeg: 0,
      pitchDeg: -60.0
    }
  },
  Tripura: {
    code: 'TR',
    name: 'Tripura',
    capital: 'Agartala',
    districts: ['West Tripura', 'Dhalai', 'North Tripura', 'South Tripura', 'Gomati', 'Khowai', 'Sepahijala', 'Unakoti'],
    primaryAOIId: 'tripura-jampui-hills',
    centerLng: 91.800,
    centerLat: 23.800,
    bounds: [91.100, 22.900, 92.400, 24.500],
    cameraPreset: {
      lng: 91.800,
      lat: 23.800,
      height: 160000,
      headingDeg: 0,
      pitchDeg: -65.0
    }
  }
};

// -------------------------------------------------------------------------
// 2. AUTHORITATIVE AOI DEFINITIONS (Geographic Identity + Assets + Inputs)
// -------------------------------------------------------------------------
export const AUTHORITATIVE_AOIS: Record<string, AuthoritativeAOI> = {
  // SIKKIM: Dikchu – Singtam NH-10 Sector (FROZEN)
  'sikkim-nh10-dikchu': {
    id: 'sikkim-nh10-dikchu',
    name: 'Dikchu – Singtam Sector (NH-10 KM 19)',
    state: 'Sikkim',
    stateCode: 'SK',
    district: 'Pakyong',
    lat: 27.398,
    lng: 88.535,
    elevation_m: 850,
    polygonCoords: [
      88.522, 27.388,  88.528, 27.410,  88.544, 27.412,  88.549, 27.395,  88.538, 27.385
    ],
    cameraPreset: {
      lng: 88.535,
      lat: 27.398,
      height: 9500,
      headingDeg: 15,
      pitchDeg: -36.0
    },
    associatedAssets: {
      roads: [
        {
          id: 'RD-SK-01',
          code: 'NH-10',
          name: 'NH-10 Teesta Lifeline Road (KM 18-24)',
          importance: 'CRITICAL (Single Lifeline for Sikkim)',
          status: 'AT_RISK',
          classification: 'CRITICAL'
        },
        {
          id: 'RD-SK-02',
          code: 'SH-DKC',
          name: 'Dikchu Bridge Approach Road',
          importance: 'HIGH',
          status: 'WATCH',
          classification: 'HIGH'
        }
      ],
      bridges: [
        { id: 'BR-SK-01', name: 'Dikchu River Bridge', spanType: 'Bailey Suspension' }
      ],
      facilities: [
        { id: 'FAC-SK-01', name: 'Singtam Hydro Power Substation', type: 'POWER' },
        { id: 'FAC-SK-02', name: 'Dikchu Primary Health Sub-Centre', type: 'HOSPITAL' }
      ],
      settlements: [
        { id: 'VIL-SK-01', name: 'Dikchu Basti', population: 640 },
        { id: 'VIL-SK-02', name: 'Lower Singtam', population: 520 },
        { id: 'VIL-SK-03', name: 'Melli Colony', population: 260 }
      ],
      totalPopulationExposed: 1420
    },
    geotechnicalInputs: {
      slope_deg: 34.8,
      soil_moisture_pct: 81.0,
      historical_events_5y: 6,
      lithology: 'Weathered Biotite Gneiss & Mica Schist',
      soil_type: 'Gravelly Sandy Loam (High Infiltration)',
      aspect: 'South-West (220°)',
      curvature: -0.142
    },
    triggerMechanism: 'Pore pressure failure in saturated biotite gneiss colluvium (34.8° slope)',
    provenance: 'SYNTHETIC'
  },

  // ASSAM: Dima Hasao – Haflong Ghat (NH-27 / NF Railway) (FROZEN)
  'assam-dima-hasao-haflong': {
    id: 'assam-dima-hasao-haflong',
    name: 'Dima Hasao – Haflong Ghat (NH-27 / NF Railway)',
    state: 'Assam',
    stateCode: 'AS',
    district: 'Dima Hasao',
    lat: 25.1764,
    lng: 93.0238,
    elevation_m: 680,
    polygonCoords: [
      93.010, 25.165,  93.015, 25.190,  93.038, 25.195,  93.042, 25.172,  93.028, 25.160
    ],
    cameraPreset: {
      lng: 93.0238,
      lat: 25.1764,
      height: 12000,
      headingDeg: 20,
      pitchDeg: -40.0
    },
    associatedAssets: {
      roads: [
        {
          id: 'RD-AS-01',
          code: 'NH-27',
          name: 'NH-27 East-West Corridor (Haflong Ghat KM 84)',
          importance: 'CRITICAL (Barak Valley Lifeline Connection)',
          status: 'SINGLE_LANE_OPEN',
          classification: 'CRITICAL'
        },
        {
          id: 'RD-AS-02',
          code: 'NFR-LINE',
          name: 'Lumding-Badarpur Railway Line',
          importance: 'CRITICAL (Hill Section Rail Lifeline)',
          status: 'WATCH',
          classification: 'CRITICAL'
        }
      ],
      bridges: [
        { id: 'BR-AS-01', name: 'Diyung River Railway Span', spanType: 'Steel Truss Railway Bridge' },
        { id: 'BR-AS-02', name: 'Haflong Valley Viaduct', spanType: 'Concrete Highway Viaduct' }
      ],
      facilities: [
        { id: 'FAC-AS-01', name: 'Haflong Civil Hospital Access', type: 'HOSPITAL' },
        { id: 'FAC-AS-02', name: 'Railway Traction Substation', type: 'POWER' },
        { id: 'FAC-AS-03', name: 'Haflong Government College / Shelter', type: 'COMMUNITY_SHELTER' }
      ],
      settlements: [
        { id: 'VIL-AS-01', name: 'Jatinga Valley Settlement', population: 1250 },
        { id: 'VIL-AS-02', name: 'Lower Haflong Railway Colony', population: 850 }
      ],
      totalPopulationExposed: 2100
    },
    geotechnicalInputs: {
      slope_deg: 36.2,
      soil_moisture_pct: 88.0,
      historical_events_5y: 9,
      lithology: 'Disang Shale & Sandstone Alternation',
      soil_type: 'Clayey Silt Colluvium',
      aspect: 'South-East (145°)',
      curvature: -0.188
    },
    triggerMechanism: 'Rotational slump in fractured Disang shale along railway & highway cut (36.2° slope)',
    provenance: 'SYNTHETIC'
  },

  // ARUNACHAL PRADESH: Tawang – Sela Pass Corridor (NH-13)
  'arunachal-tawang-sela': {
    id: 'arunachal-tawang-sela',
    name: 'Tawang – Sela Pass Corridor (NH-13)',
    state: 'Arunachal Pradesh',
    stateCode: 'AR',
    district: 'Tawang',
    lat: 27.5020,
    lng: 92.1050,
    elevation_m: 4170,
    polygonCoords: [
      92.080, 27.485,  92.088, 27.518,  92.122, 27.520,  92.125, 27.495,  92.105, 27.480
    ],
    cameraPreset: {
      lng: 92.1050,
      lat: 27.5020,
      height: 14000,
      headingDeg: 340,
      pitchDeg: -32.0
    },
    associatedAssets: {
      roads: [
        {
          id: 'RD-AR-01',
          code: 'NH-13',
          name: 'NH-13 Trans-Arunachal Highway (Bhalukpong-Tawang)',
          importance: 'CRITICAL (Strategic Northern Border Route)',
          status: 'AT_RISK',
          classification: 'CRITICAL'
        }
      ],
      bridges: [
        { id: 'BR-AR-01', name: 'Tawang River Bailey Bridge', spanType: 'Steel Truss Bailey' }
      ],
      facilities: [
        { id: 'FAC-AR-01', name: 'Sela Tunnel Northern Portal Hub', type: 'DEFENSE' },
        { id: 'FAC-AR-02', name: 'Jaswantgarh Border Post Hospital', type: 'HOSPITAL' }
      ],
      settlements: [
        { id: 'VIL-AR-01', name: 'Jaswantgarh Settlement', population: 350 },
        { id: 'VIL-AR-02', name: 'Sela Pass Hamlet', population: 280 }
      ],
      totalPopulationExposed: 630
    },
    geotechnicalInputs: {
      slope_deg: 38.5,
      soil_moisture_pct: 76.0,
      historical_events_5y: 5,
      lithology: 'High-Grade Quartzite & Pelitic Gneiss',
      soil_type: 'Glacial Till & Colluvial Scree',
      aspect: 'North-East (45°)',
      curvature: -0.165
    },
    triggerMechanism: 'Freeze-thaw wedge splitting and pore-water pressure along NH-13 high-altitude scree slopes',
    provenance: 'SYNTHETIC'
  },

  // MEGHALAYA: East Khasi Hills – Sohra Rim (Cherrapunji)
  'meghalaya-east-khasi-sohra': {
    id: 'meghalaya-east-khasi-sohra',
    name: 'East Khasi Hills – Sohra Rim (Cherrapunji)',
    state: 'Meghalaya',
    stateCode: 'ML',
    district: 'East Khasi Hills',
    lat: 25.2700,
    lng: 91.7300,
    elevation_m: 1430,
    polygonCoords: [
      91.710, 25.255,  91.718, 25.285,  91.745, 25.290,  91.750, 25.265,  91.732, 25.250
    ],
    cameraPreset: {
      lng: 91.7300,
      lat: 25.2700,
      height: 11000,
      headingDeg: 180,
      pitchDeg: -35.0
    },
    associatedAssets: {
      roads: [
        {
          id: 'RD-ML-01',
          code: 'SH-5',
          name: 'Shillong - Sohra Escarpment Highway',
          importance: 'CRITICAL (Plateau Lifeline)',
          status: 'AT_RISK',
          classification: 'CRITICAL'
        },
        {
          id: 'RD-ML-02',
          code: 'NH-6',
          name: 'NH-6 Sonapur Tunnel Mudflow Corridor',
          importance: 'CRITICAL (Inter-state Lifeline to Tripura & Mizoram)',
          status: 'WATCH',
          classification: 'CRITICAL'
        }
      ],
      bridges: [
        { id: 'BR-ML-01', name: 'Wahkaba Stream Viaduct', spanType: 'Reinforced Concrete' }
      ],
      facilities: [
        { id: 'FAC-ML-01', name: 'Sohra Civil Hospital', type: 'HOSPITAL' },
        { id: 'FAC-ML-02', name: 'Cherrapunji Water Treatment Substation', type: 'POWER' }
      ],
      settlements: [
        { id: 'VIL-ML-01', name: 'Sohra Rim Hamlet', population: 950 },
        { id: 'VIL-ML-02', name: 'Nongriat Trail Settlement', population: 680 }
      ],
      totalPopulationExposed: 1630
    },
    geotechnicalInputs: {
      slope_deg: 42.0,
      soil_moisture_pct: 92.0,
      historical_events_5y: 8,
      lithology: 'Mahadek Sandstone & Calcareous Gneiss',
      soil_type: 'Lateritic Sandy Clay',
      aspect: 'South (180°)',
      curvature: -0.220
    },
    triggerMechanism: 'Extreme orographic rainfall inundation and cliff overhang collapse along Sohra escarpment',
    provenance: 'SYNTHETIC'
  },

  // MANIPUR: Noney – Tupul Railway Corridor
  'manipur-noney-tupul': {
    id: 'manipur-noney-tupul',
    name: 'Noney – Tupul Railway Corridor (Ijai Basin)',
    state: 'Manipur',
    stateCode: 'MN',
    district: 'Noney',
    lat: 24.7800,
    lng: 93.6300,
    elevation_m: 620,
    polygonCoords: [
      93.615, 24.765,  93.622, 24.795,  93.648, 24.800,  93.652, 24.775,  93.635, 24.760
    ],
    cameraPreset: {
      lng: 93.6300,
      lat: 24.7800,
      height: 10500,
      headingDeg: 45,
      pitchDeg: -38.0
    },
    associatedAssets: {
      roads: [
        {
          id: 'RD-MN-01',
          code: 'NH-37',
          name: 'NH-37 Imphal-Jiribam Highway (Makru-Ijai Axis)',
          importance: 'CRITICAL (Imphal Valley Lifeline Corridor)',
          status: 'AT_RISK',
          classification: 'CRITICAL'
        },
        {
          id: 'RD-MN-02',
          code: 'NFR-JIR',
          name: 'Jiribam-Tupul-Imphal Railway Line Works',
          importance: 'CRITICAL',
          status: 'WATCH',
          classification: 'CRITICAL'
        }
      ],
      bridges: [
        { id: 'BR-MN-01', name: 'Ijai River Railway Pier 122', spanType: 'Deep-Found Tall Pier Rail Bridge' }
      ],
      facilities: [
        { id: 'FAC-MN-01', name: 'Tupul Railway Yard Substation', type: 'RAILWAY' },
        { id: 'FAC-MN-02', name: 'Noney Community Health Center', type: 'HOSPITAL' }
      ],
      settlements: [
        { id: 'VIL-MN-01', name: 'Tupul Station Colony', population: 820 },
        { id: 'VIL-MN-02', name: 'Marangching Hamlet', population: 460 }
      ],
      totalPopulationExposed: 1280
    },
    geotechnicalInputs: {
      slope_deg: 37.0,
      soil_moisture_pct: 86.0,
      historical_events_5y: 7,
      lithology: 'Disang Siltstone & Friable Shale',
      soil_type: 'Clayey Silt Saturated Colluvium',
      aspect: 'South-West (210°)',
      curvature: -0.175
    },
    triggerMechanism: 'Massive debris flow triggered by saturated Disang shale collapse into Ijai river channel',
    provenance: 'SYNTHETIC'
  },

  // MIZORAM: Aizawl – Laipuitlang Slope Sector
  'mizoram-aizawl-laipuitlang': {
    id: 'mizoram-aizawl-laipuitlang',
    name: 'Aizawl – Laipuitlang Slope Sector',
    state: 'Mizoram',
    stateCode: 'MZ',
    district: 'Aizawl',
    lat: 23.7450,
    lng: 92.7250,
    elevation_m: 1180,
    polygonCoords: [
      92.710, 23.730,  92.718, 23.760,  92.742, 23.765,  92.746, 23.740,  92.728, 23.725
    ],
    cameraPreset: {
      lng: 92.7250,
      lat: 23.7450,
      height: 10000,
      headingDeg: 15,
      pitchDeg: -35.0
    },
    associatedAssets: {
      roads: [
        {
          id: 'RD-MZ-01',
          code: 'NH-306',
          name: 'NH-306 Silchar-Aizawl Lifeline Highway',
          importance: 'CRITICAL (Sole National Highway into Mizoram)',
          status: 'AT_RISK',
          classification: 'CRITICAL'
        },
        {
          id: 'RD-MZ-02',
          code: 'AZL-RIDGE',
          name: 'Laipuitlang - Bawngkawn Ridge Arterial Road',
          importance: 'HIGH',
          status: 'WATCH',
          classification: 'HIGH'
        }
      ],
      bridges: [
        { id: 'BR-MZ-01', name: 'Tuirial River Crossing Bridge', spanType: 'Steel Girder' }
      ],
      facilities: [
        { id: 'FAC-MZ-01', name: 'Civil Hospital Aizawl Access', type: 'HOSPITAL' },
        { id: 'FAC-MZ-02', name: 'Zuangtui Power Distribution Grid', type: 'POWER' }
      ],
      settlements: [
        { id: 'VIL-MZ-01', name: 'Laipuitlang Ridge Settlement', population: 1450 },
        { id: 'VIL-MZ-02', name: 'Ramhlun North Ward', population: 1850 }
      ],
      totalPopulationExposed: 3300
    },
    geotechnicalInputs: {
      slope_deg: 35.5,
      soil_moisture_pct: 82.0,
      historical_events_5y: 6,
      lithology: 'Surma Group Bedded Sandstone & Siltstone',
      soil_type: 'Loose Clayey Sand Colluvium',
      aspect: 'West (270°)',
      curvature: -0.155
    },
    triggerMechanism: 'Daylighting of sandstone bedding dip slope with heavy pore-water surcharge during monsoon',
    provenance: 'SYNTHETIC'
  },

  // NAGALAND: Kohima – Paglapahar Gorge (NH-29)
  'nagaland-kohima-paglapahar': {
    id: 'nagaland-kohima-paglapahar',
    name: 'Kohima – Paglapahar Gorge (NH-29)',
    state: 'Nagaland',
    stateCode: 'NL',
    district: 'Kohima',
    lat: 25.8100,
    lng: 93.8800,
    elevation_m: 450,
    polygonCoords: [
      93.865, 25.795,  93.872, 25.825,  93.898, 25.830,  93.902, 25.805,  93.885, 25.790
    ],
    cameraPreset: {
      lng: 93.8800,
      lat: 25.8100,
      height: 11000,
      headingDeg: 35,
      pitchDeg: -36.0
    },
    associatedAssets: {
      roads: [
        {
          id: 'RD-NL-01',
          code: 'NH-29',
          name: 'NH-29 Dimapur - Chumoukedima - Kohima Highway',
          importance: 'CRITICAL (Single Lifeline connecting Nagaland & Manipur)',
          status: 'AT_RISK',
          classification: 'CRITICAL'
        }
      ],
      bridges: [
        { id: 'BR-NL-01', name: 'Chathe River Highway Bridge', spanType: 'Prestressed Concrete' }
      ],
      facilities: [
        { id: 'FAC-NL-01', name: 'Chumoukedima District Hospital', type: 'HOSPITAL' },
        { id: 'FAC-NL-02', name: 'Paglapahar Emergency Relief Post', type: 'COMMUNITY_SHELTER' }
      ],
      settlements: [
        { id: 'VIL-NL-01', name: 'Paglapahar Gorge Cluster', population: 620 },
        { id: 'VIL-NL-02', name: 'New Chumoukedima Village', population: 890 }
      ],
      totalPopulationExposed: 1510
    },
    geotechnicalInputs: {
      slope_deg: 39.0,
      soil_moisture_pct: 85.0,
      historical_events_5y: 8,
      lithology: 'Fractured Barail Sandstone & Claystone',
      soil_type: 'Coarse Bouldery Colluvium',
      aspect: 'South-East (135°)',
      curvature: -0.195
    },
    triggerMechanism: 'Severe rockfall and debris avalanche in deeply sheared Barail sandstone gorge',
    provenance: 'SYNTHETIC'
  },

  // TRIPURA: Jampui Hills Ridge Corridor
  'tripura-jampui-hills': {
    id: 'tripura-jampui-hills',
    name: 'Jampui Hills Ridge Corridor',
    state: 'Tripura',
    stateCode: 'TR',
    district: 'North Tripura',
    lat: 23.9600,
    lng: 92.2800,
    elevation_m: 850,
    polygonCoords: [
      92.260, 23.945,  92.268, 23.975,  92.295, 23.980,  92.300, 23.955,  92.282, 23.940
    ],
    cameraPreset: {
      lng: 92.2800,
      lat: 23.9600,
      height: 10500,
      headingDeg: 0,
      pitchDeg: -35.0
    },
    associatedAssets: {
      roads: [
        {
          id: 'RD-TR-01',
          code: 'NH-8',
          name: 'NH-8 (Old NH-44) Assam-Agartala Highway Axis',
          importance: 'CRITICAL (Tripura Interstate Lifeline)',
          status: 'WATCH',
          classification: 'CRITICAL'
        },
        {
          id: 'RD-TR-02',
          code: 'JMP-RD',
          name: 'Vanghmun - Jampui Ridge Road',
          importance: 'HIGH',
          status: 'WATCH',
          classification: 'HIGH'
        }
      ],
      bridges: [
        { id: 'BR-TR-01', name: 'Deo River Culvert Bridge', spanType: 'Box Culvert Concrete' }
      ],
      facilities: [
        { id: 'FAC-TR-01', name: 'Vanghmun Primary Health Center', type: 'HOSPITAL' },
        { id: 'FAC-TR-02', name: 'Jampui Disaster Relief Shelter', type: 'COMMUNITY_SHELTER' }
      ],
      settlements: [
        { id: 'VIL-TR-01', name: 'Vanghmun Ridge Village', population: 1100 },
        { id: 'VIL-TR-02', name: 'Phuldungsei Border Hamlet', population: 750 }
      ],
      totalPopulationExposed: 1850
    },
    geotechnicalInputs: {
      slope_deg: 26.5,
      soil_moisture_pct: 74.0,
      historical_events_5y: 3,
      lithology: 'Tipam Sandstone & Siltstone Clay',
      soil_type: 'Ferruginous Red Loam',
      aspect: 'North-West (315°)',
      curvature: -0.115
    },
    triggerMechanism: 'Superficial soil erosion and road shoulder slumping in friable Tipam sandstone ridges',
    provenance: 'SYNTHETIC'
  }
};

// -------------------------------------------------------------------------
// 3. REGISTRY HELPER FUNCTIONS
// -------------------------------------------------------------------------
export function getAuthoritativeAOI(aoiId: string): AuthoritativeAOI | undefined {
  if (!aoiId) return undefined;
  if (AUTHORITATIVE_AOIS[aoiId]) return AUTHORITATIVE_AOIS[aoiId];
  
  // Normalized lookup (handling aliases and state names)
  const normalized = aoiId.toLowerCase();
  if (normalized.includes('sikkim') || normalized.includes('dikchu') || normalized === 'haz-sk-01') {
    return AUTHORITATIVE_AOIS['sikkim-nh10-dikchu'];
  }
  if (normalized.includes('assam') || normalized.includes('haflong') || normalized.includes('dima') || normalized === 'haz-as-01') {
    return AUTHORITATIVE_AOIS['assam-dima-hasao-haflong'];
  }
  if (normalized.includes('arunachal') || normalized.includes('tawang') || normalized.includes('sela') || normalized === 'haz-ar-01') {
    return AUTHORITATIVE_AOIS['arunachal-tawang-sela'];
  }
  if (normalized.includes('meghalaya') || normalized.includes('sohra') || normalized.includes('cherrapunji') || normalized === 'haz-ml-01') {
    return AUTHORITATIVE_AOIS['meghalaya-east-khasi-sohra'];
  }
  if (normalized.includes('manipur') || normalized.includes('tupul') || normalized.includes('noney') || normalized === 'haz-mn-01') {
    return AUTHORITATIVE_AOIS['manipur-noney-tupul'];
  }
  if (normalized.includes('mizoram') || normalized.includes('aizawl') || normalized.includes('hunthar') || normalized.includes('laipuitlang') || normalized === 'haz-mz-01') {
    return AUTHORITATIVE_AOIS['mizoram-aizawl-laipuitlang'];
  }
  if (normalized.includes('nagaland') || normalized.includes('kohima') || normalized.includes('paglapahar') || normalized === 'haz-nl-01') {
    return AUTHORITATIVE_AOIS['nagaland-kohima-paglapahar'];
  }
  if (normalized.includes('tripura') || normalized.includes('jampui') || normalized.includes('baramura') || normalized === 'haz-tr-01') {
    return AUTHORITATIVE_AOIS['tripura-jampui-hills'];
  }
  return undefined;
}

export function getAuthoritativeState(stateName: string): AuthoritativeState | undefined {
  if (!stateName) return undefined;
  const matchKey = Object.keys(AUTHORITATIVE_STATES).find(
    k => k.toLowerCase() === stateName.toLowerCase() ||
         AUTHORITATIVE_STATES[k].code.toLowerCase() === stateName.toLowerCase()
  );
  return matchKey ? AUTHORITATIVE_STATES[matchKey] : undefined;
}

export function getAOIsForState(stateName: string): AuthoritativeAOI[] {
  if (!stateName || stateName === 'ALL') {
    return Object.values(AUTHORITATIVE_AOIS);
  }
  return Object.values(AUTHORITATIVE_AOIS).filter(
    aoi => aoi.state.toLowerCase() === stateName.toLowerCase()
  );
}

export function getPrimaryAOIForState(stateName: string): AuthoritativeAOI {
  const state = getAuthoritativeState(stateName);
  if (state && AUTHORITATIVE_AOIS[state.primaryAOIId]) {
    return AUTHORITATIVE_AOIS[state.primaryAOIId];
  }
  if (stateName) {
    const norm = stateName.toLowerCase();
    if (norm.includes('assam')) return AUTHORITATIVE_AOIS['assam-dima-hasao-haflong'];
    if (norm.includes('arunachal')) return AUTHORITATIVE_AOIS['arunachal-tawang-sela'];
    if (norm.includes('meghalaya')) return AUTHORITATIVE_AOIS['meghalaya-east-khasi-sohra'];
    if (norm.includes('manipur')) return AUTHORITATIVE_AOIS['manipur-noney-tupul'];
    if (norm.includes('mizoram')) return AUTHORITATIVE_AOIS['mizoram-aizawl-laipuitlang'];
    if (norm.includes('nagaland')) return AUTHORITATIVE_AOIS['nagaland-kohima-paglapahar'];
    if (norm.includes('tripura')) return AUTHORITATIVE_AOIS['tripura-jampui-hills'];
  }
  return AUTHORITATIVE_AOIS['sikkim-nh10-dikchu'];
}

export interface AOIMatchResult {
  aoiId: string;
  aoiName: string;
  aoiStatus: 'INSIDE_AOI' | 'OUTSIDE ACTIVE AOI';
  isInside: boolean;
  distanceKm: number;
  matchedAOI?: AuthoritativeAOI;
}

/**
 * Calculates Great-Circle distance between two points in km (Haversine formula).
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Point-in-polygon ray-casting test.
 * polygonCoords is [lng1, lat1, lng2, lat2, ...]
 */
export function isPointInPolygon(lat: number, lng: number, polygonCoords: number[]): boolean {
  let inside = false;
  const numPoints = polygonCoords.length / 2;
  for (let i = 0, j = numPoints - 1; i < numPoints; j = i++) {
    const xi = polygonCoords[i * 2];
    const yi = polygonCoords[i * 2 + 1];
    const xj = polygonCoords[j * 2];
    const yj = polygonCoords[j * 2 + 1];

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Matches a latitude/longitude to the correct Authoritative AOI without force-matching.
 * Max match threshold is 12 km from AOI centroid or within polygon.
 */
export function matchLocationToAOI(lat: number, lng: number, maxDistanceKm: number = 12): AOIMatchResult {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return {
      aoiId: 'OUTSIDE_AOI',
      aoiName: 'OUTSIDE ACTIVE AOI',
      aoiStatus: 'OUTSIDE ACTIVE AOI',
      isInside: false,
      distanceKm: Infinity
    };
  }

  let closestAOI: AuthoritativeAOI | null = null;
  let minDistance = Infinity;

  for (const aoi of Object.values(AUTHORITATIVE_AOIS)) {
    // 1. Check exact polygon containment
    if (aoi.polygonCoords && isPointInPolygon(lat, lng, aoi.polygonCoords)) {
      const dist = calculateDistanceKm(lat, lng, aoi.lat, aoi.lng);
      return {
        aoiId: aoi.id,
        aoiName: aoi.name,
        aoiStatus: 'INSIDE_AOI',
        isInside: true,
        distanceKm: Math.round(dist * 10) / 10,
        matchedAOI: aoi
      };
    }

    // 2. Check distance to AOI centroid
    const dist = calculateDistanceKm(lat, lng, aoi.lat, aoi.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestAOI = aoi;
    }
  }

  // If within radius threshold of the closest AOI
  if (closestAOI && minDistance <= maxDistanceKm) {
    return {
      aoiId: closestAOI.id,
      aoiName: closestAOI.name,
      aoiStatus: 'INSIDE_AOI',
      isInside: true,
      distanceKm: Math.round(minDistance * 10) / 10,
      matchedAOI: closestAOI
    };
  }

  // Outside all active AOIs
  return {
    aoiId: 'OUTSIDE_AOI',
    aoiName: 'OUTSIDE ACTIVE AOI',
    aoiStatus: 'OUTSIDE ACTIVE AOI',
    isInside: false,
    distanceKm: Math.round(minDistance * 10) / 10
  };
}

