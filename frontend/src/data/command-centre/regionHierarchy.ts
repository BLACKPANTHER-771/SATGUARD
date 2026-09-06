/**
 * COMMAND CENTRE REGIONAL ZOOM & NAVIGATION HIERARCHY
 * Defines the hierarchical camera navigation targets:
 * INDIA -> NORTHEAST INDIA -> STATE -> TARGET AOI
 */

export interface CameraTarget {
  id: string;
  name: string;
  level: 'NATIONAL' | 'REGIONAL' | 'STATE' | 'DISTRICT' | 'LOCAL_AOI';
  lng: number;
  lat: number;
  height: number;
  headingDeg: number;
  pitchDeg: number;
  description: string;
}

export const REGIONAL_CAMERA_PRESETS: Record<string, CameraTarget> = {
  // 1. NATIONAL SCALE: Full India View (Default View)
  'INDIA': {
    id: 'INDIA',
    name: 'India (National Command)',
    level: 'NATIONAL',
    lng: 82.50,
    lat: 22.80,
    height: 3800000,
    headingDeg: 0,
    pitchDeg: -89.9,
    description: 'National overview: Boundaries, major rivers, major cities, active hazard corridors'
  },

  // 2. REGIONAL SCALE: Northeast India (All 8 States)
  'NORTHEAST': {
    id: 'NORTHEAST',
    name: 'Northeast India (8 States)',
    level: 'REGIONAL',
    lng: 92.80,
    lat: 26.20,
    height: 850000,
    headingDeg: 0,
    pitchDeg: -80.0,
    description: 'Northeast Regional Command: Inter-state arterial corridors, Brahmaputra basin, state borders'
  },

  // 3. STATE SCALE: Sikkim
  'SIKKIM': {
    id: 'SIKKIM',
    name: 'Sikkim State',
    level: 'STATE',
    lng: 88.528,
    lat: 27.420,
    height: 120000,
    headingDeg: 8,
    pitchDeg: -55.0,
    description: 'Sikkim Himalaya: Teesta corridor, Gangtok, Mangan, Chungthang, Pakyong'
  },

  // STATE SCALE: Assam
  'ASSAM': {
    id: 'ASSAM',
    name: 'Assam State',
    level: 'STATE',
    lng: 92.80,
    lat: 26.20,
    height: 320000,
    headingDeg: 0,
    pitchDeg: -68.0,
    description: 'Assam Valley & Hill Districts: Guwahati, Dima Hasao, Barak Valley, Lumding'
  },

  // STATE SCALE: Meghalaya
  'MEGHALAYA': {
    id: 'MEGHALAYA',
    name: 'Meghalaya State',
    level: 'STATE',
    lng: 91.80,
    lat: 25.48,
    height: 160000,
    headingDeg: 0,
    pitchDeg: -60.0,
    description: 'Khasi & Jaintia Hills: Shillong, Sohra Escarpment, NH-6'
  },

  // STATE SCALE: Arunachal Pradesh
  'ARUNACHAL': {
    id: 'ARUNACHAL',
    name: 'Arunachal Pradesh',
    level: 'STATE',
    lng: 93.60,
    lat: 27.80,
    height: 380000,
    headingDeg: 12,
    pitchDeg: -58.0,
    description: 'Eastern Himalaya: Tawang, Sela Pass axis, Itanagar, Bhalukpong'
  },

  // STATE SCALE: Manipur
  'MANIPUR': {
    id: 'MANIPUR',
    name: 'Manipur State',
    level: 'STATE',
    lng: 93.90,
    lat: 24.80,
    height: 190000,
    headingDeg: 0,
    pitchDeg: -62.0,
    description: 'Manipur Hills & Valley: Noney, Imphal, Tupul railway corridor, NH-37'
  },

  // STATE SCALE: Mizoram
  'MIZORAM': {
    id: 'MIZORAM',
    name: 'Mizoram State',
    level: 'STATE',
    lng: 92.80,
    lat: 23.30,
    height: 180000,
    headingDeg: 0,
    pitchDeg: -60.0,
    description: 'Mizoram Ridges: Aizawl, Laipuitlang slope, Lunglei, NH-306'
  },

  // STATE SCALE: Nagaland
  'NAGALAND': {
    id: 'NAGALAND',
    name: 'Nagaland State',
    level: 'STATE',
    lng: 94.10,
    lat: 26.15,
    height: 175000,
    headingDeg: 0,
    pitchDeg: -60.0,
    description: 'Naga Hills: Kohima, Dimapur, Paglapahar gorge corridor, NH-29'
  },

  // STATE SCALE: Tripura
  'TRIPURA': {
    id: 'TRIPURA',
    name: 'Tripura State',
    level: 'STATE',
    lng: 91.80,
    lat: 23.80,
    height: 160000,
    headingDeg: 0,
    pitchDeg: -65.0,
    description: 'Tripura Hills & Plains: Agartala, Jampui hills ridge, NH-8'
  },

  // 4. LOCAL AOI: Sikkim Dikchu - Singtam NH-10 (Primary Showcase Target)
  'sikkim-nh10-dikchu': {
    id: 'sikkim-nh10-dikchu',
    name: 'Dikchu – Singtam NH-10 Sector',
    level: 'LOCAL_AOI',
    lng: 88.535,
    lat: 27.398,
    height: 9500,
    headingDeg: 15,
    pitchDeg: -36.0,
    description: 'Detailed Target AOI: Mile 14 slump, Teesta Stage-V Dam, Indreni bridge, blocked NH-10'
  },

  // LOCAL AOI: Assam Dima Hasao Haflong Ghat
  'assam-dima-hasao-haflong': {
    id: 'assam-dima-hasao-haflong',
    name: 'Dima Hasao – Haflong Ghat',
    level: 'LOCAL_AOI',
    lng: 93.0238,
    lat: 25.1764,
    height: 12000,
    headingDeg: 20,
    pitchDeg: -40.0,
    description: 'Detailed Target AOI: NF Railway track subsidence, NH-27 cut-slope'
  },

  // LOCAL AOI: Meghalaya Sohra Rim
  'meghalaya-east-khasi-sohra': {
    id: 'meghalaya-east-khasi-sohra',
    name: 'East Khasi Hills – Sohra Rim',
    level: 'LOCAL_AOI',
    lng: 91.732,
    lat: 25.270,
    height: 11000,
    headingDeg: 180,
    pitchDeg: -35.0,
    description: 'Detailed Target AOI: Deep escarpment, torrential drainage channels, Tyrna trail'
  },

  // LOCAL AOI: Arunachal Tawang Sela
  'arunachal-tawang-sela': {
    id: 'arunachal-tawang-sela',
    name: 'Tawang – Sela Pass Corridor',
    level: 'LOCAL_AOI',
    lng: 92.103,
    lat: 27.505,
    height: 14000,
    headingDeg: 340,
    pitchDeg: -32.0,
    description: 'Detailed Target AOI: Sela tunnel portal, scree slope failure, BRO logistics post'
  },

  // LOCAL AOI: Manipur Noney Tupul
  'manipur-noney-tupul': {
    id: 'manipur-noney-tupul',
    name: 'Noney – Tupul Railway Corridor',
    level: 'LOCAL_AOI',
    lng: 93.6300,
    lat: 24.7800,
    height: 10500,
    headingDeg: 45,
    pitchDeg: -38.0,
    description: 'Detailed Target AOI: Ijai river railway pier, Tupul yard, NH-37 axis'
  },

  // LOCAL AOI: Mizoram Aizawl Laipuitlang
  'mizoram-aizawl-laipuitlang': {
    id: 'mizoram-aizawl-laipuitlang',
    name: 'Aizawl – Laipuitlang Slope Sector',
    level: 'LOCAL_AOI',
    lng: 92.7250,
    lat: 23.7450,
    height: 10000,
    headingDeg: 15,
    pitchDeg: -35.0,
    description: 'Detailed Target AOI: Dip slope bedding plane, Ramhlun ridge, NH-306'
  },

  // LOCAL AOI: Nagaland Kohima Paglapahar
  'nagaland-kohima-paglapahar': {
    id: 'nagaland-kohima-paglapahar',
    name: 'Kohima – Paglapahar Gorge',
    level: 'LOCAL_AOI',
    lng: 93.8800,
    lat: 25.8100,
    height: 11000,
    headingDeg: 35,
    pitchDeg: -36.0,
    description: 'Detailed Target AOI: Sheared Barail sandstone gorge, Chathe river, NH-29'
  },

  // LOCAL AOI: Tripura Jampui Hills
  'tripura-jampui-hills': {
    id: 'tripura-jampui-hills',
    name: 'Jampui Hills Ridge Corridor',
    level: 'LOCAL_AOI',
    lng: 92.2800,
    lat: 23.9600,
    height: 10500,
    headingDeg: 0,
    pitchDeg: -35.0,
    description: 'Detailed Target AOI: Friable Tipam sandstone ridge, Vanghmun, NH-8 access'
  }
};
