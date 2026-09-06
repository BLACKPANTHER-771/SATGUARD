/**
 * COMMAND CENTRE WEATHER & METEOROLOGICAL INTELLIGENCE DATASET
 * Dedicated to Command Centre Map and Weather Panel.
 * Label: SYNTHETIC DEMONSTRATION DATA
 */

export type WeatherWarningLevel = 'RED_ALERT' | 'ORANGE_WARNING' | 'YELLOW_WATCH' | 'GREEN_NORMAL';
export type RainfallIntensity = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

export interface RegionalWeatherReport {
  regionId: string;
  regionName: string;
  state: string;
  temperatureC: number;
  feelsLikeC: number;
  rainfall1hMm: number;
  rainfall24hMm: number;
  rainfall72hMm: number;
  rainfallIntensity: RainfallIntensity;
  humidityPct: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windDirectionCardinal: string;
  cloudCoveragePct: number;
  cloudCondition: string;
  pressureHpa: number;
  dewPointC: number;
  visibilityKm: number;
  uvIndex: number;
  warningLevel: WeatherWarningLevel;
  warningTitle: string;
  warningAdvisory: string;
  forecastWindow3h: {
    offsetMin: number;
    tempC: number;
    rainMmHr: number;
    riskPct: number;
    skyCondition: string;
  }[];
  provenance: 'LIVE WEATHER DATA (OpenWeather)' | 'LIVE WEATHER DATA (Open-Meteo)' | 'SYNTHETIC DEMONSTRATION DATA' | 'UNAVAILABLE';
  sourceCategory?: 'LIVE' | 'FALLBACK' | 'SYNTHETIC' | 'UNAVAILABLE';
}

export interface RainfallRadarCell {
  id: string;
  name: string;
  centerLng: number;
  centerLat: number;
  radiusKm: number;
  intensityMmHr: number;
  intensityTier: RainfallIntensity;
  // Concentric contours for smooth meteorological gradient
  rings: {
    radiusMultiplier: number;
    colorHex: string;
    alpha: number;
    label: string;
  }[];
}

// 1. REGIONAL WEATHER SNAPSHOTS (Synced with Target Selection)
export const REGIONAL_WEATHER_CATALOG: Record<string, RegionalWeatherReport> = {
  // National India Overview
  'ALL_INDIA': {
    regionId: 'ALL_INDIA',
    regionName: 'National Monsoonal Synoptic System',
    state: 'India (National)',
    temperatureC: 28.4,
    feelsLikeC: 32.1,
    rainfall1hMm: 18.5,
    rainfall24hMm: 68.0,
    rainfall72hMm: 142.0,
    rainfallIntensity: 'MODERATE',
    humidityPct: 82,
    windSpeedKmh: 24,
    windDirectionDeg: 215,
    windDirectionCardinal: 'SW',
    cloudCoveragePct: 84,
    cloudCondition: 'Monsoon Depressional Trough',
    pressureHpa: 1002,
    dewPointC: 24.8,
    visibilityKm: 6.5,
    uvIndex: 4,
    warningLevel: 'ORANGE_WARNING',
    warningTitle: 'Active Southwest Monsoon Trough',
    warningAdvisory: 'Orographic enhancement active across Himalayan foothills and Northeast corridor.',
    forecastWindow3h: [
      { offsetMin: 0, tempC: 28.4, rainMmHr: 18.5, riskPct: 52, skyCondition: 'Heavy Overcast' },
      { offsetMin: 60, tempC: 27.8, rainMmHr: 22.0, riskPct: 58, skyCondition: 'Squally Rain' },
      { offsetMin: 120, tempC: 27.2, rainMmHr: 26.5, riskPct: 65, skyCondition: 'Intense Rain Bands' },
      { offsetMin: 180, tempC: 26.8, rainMmHr: 19.0, riskPct: 60, skyCondition: 'Scattered Showers' }
    ],
    provenance: 'SYNTHETIC DEMONSTRATION DATA'
  },

  // Northeast Regional Overview
  'NORTHEAST': {
    regionId: 'NORTHEAST',
    regionName: 'Northeast Monsoonal Convergence',
    state: 'NER (All 8 States)',
    temperatureC: 22.6,
    feelsLikeC: 25.2,
    rainfall1hMm: 38.0,
    rainfall24hMm: 148.0,
    rainfall72hMm: 295.0,
    rainfallIntensity: 'HIGH',
    humidityPct: 91,
    windSpeedKmh: 34,
    windDirectionDeg: 195,
    windDirectionCardinal: 'SSW',
    cloudCoveragePct: 96,
    cloudCondition: 'Orographic Cloudburst Cells',
    pressureHpa: 998,
    dewPointC: 21.2,
    visibilityKm: 3.8,
    uvIndex: 2,
    warningLevel: 'RED_ALERT',
    warningTitle: 'High-Impact Cloudburst Envelope',
    warningAdvisory: 'Extremely heavy rainfall concentrated in Teesta Valley, Dima Hasao, and Sohra Escarpment.',
    forecastWindow3h: [
      { offsetMin: 0, tempC: 22.6, rainMmHr: 38.0, riskPct: 78, skyCondition: 'Orographic Deluge' },
      { offsetMin: 60, tempC: 21.9, rainMmHr: 52.0, riskPct: 88, skyCondition: 'Peak Torrential Cells' },
      { offsetMin: 120, tempC: 21.4, rainMmHr: 61.5, riskPct: 94, skyCondition: 'Extreme Flash Envelope' },
      { offsetMin: 180, tempC: 22.0, rainMmHr: 41.0, riskPct: 84, skyCondition: 'Slowly Moderating' }
    ],
    provenance: 'SYNTHETIC DEMONSTRATION DATA'
  },

  // Sikkim / Dikchu - Singtam
  'sikkim-nh10-dikchu': {
    regionId: 'sikkim-nh10-dikchu',
    regionName: 'Dikchu – Singtam NH-10 Corridor',
    state: 'Sikkim',
    temperatureC: 19.8,
    feelsLikeC: 21.5,
    rainfall1hMm: 44.5,
    rainfall24hMm: 168.0,
    rainfall72hMm: 310.0,
    rainfallIntensity: 'EXTREME',
    humidityPct: 96,
    windSpeedKmh: 38,
    windDirectionDeg: 210,
    windDirectionCardinal: 'SSW',
    cloudCoveragePct: 98,
    cloudCondition: 'Deep Cumulonimbus Wall',
    pressureHpa: 992,
    dewPointC: 19.1,
    visibilityKm: 2.1,
    uvIndex: 1,
    warningLevel: 'RED_ALERT',
    warningTitle: 'Flash Flood & Debris Torrent Red Alert',
    warningAdvisory: 'Pore pressure exceeding 140 kPa along KM 19 cut-slope. Evacuation and traffic diversion active.',
    forecastWindow3h: [
      { offsetMin: 0, tempC: 19.8, rainMmHr: 44.5, riskPct: 82, skyCondition: 'Cloudburst Active' },
      { offsetMin: 60, tempC: 19.0, rainMmHr: 58.0, riskPct: 91, skyCondition: 'Peak Hydrostatic Stress' },
      { offsetMin: 120, tempC: 18.6, rainMmHr: 65.0, riskPct: 96, skyCondition: 'Critical Slump Window' },
      { offsetMin: 180, tempC: 19.2, rainMmHr: 42.0, riskPct: 85, skyCondition: 'Residual Colluvial Runoff' }
    ],
    provenance: 'SYNTHETIC DEMONSTRATION DATA'
  },

  // Assam / Dima Hasao Haflong
  'assam-dima-hasao-haflong': {
    regionId: 'assam-dima-hasao-haflong',
    regionName: 'Dima Hasao – Haflong Ghats',
    state: 'Assam',
    temperatureC: 24.2,
    feelsLikeC: 27.8,
    rainfall1hMm: 42.0,
    rainfall24hMm: 162.0,
    rainfall72hMm: 310.0,
    rainfallIntensity: 'HIGH',
    humidityPct: 93,
    windSpeedKmh: 28,
    windDirectionDeg: 175,
    windDirectionCardinal: 'S',
    cloudCoveragePct: 92,
    cloudCondition: 'Stationary Convective Band',
    pressureHpa: 999,
    dewPointC: 22.8,
    visibilityKm: 3.5,
    uvIndex: 2,
    warningLevel: 'RED_ALERT',
    warningTitle: 'Hill Railway & Highway Subsidence Warning',
    warningAdvisory: 'Disang shale bedding planes supersaturated. NF Railway track sensors reporting active creep.',
    forecastWindow3h: [
      { offsetMin: 0, tempC: 24.2, rainMmHr: 42.0, riskPct: 78, skyCondition: 'Heavy Downpour' },
      { offsetMin: 60, tempC: 23.6, rainMmHr: 48.0, riskPct: 84, skyCondition: 'Intensifying Squalls' },
      { offsetMin: 120, tempC: 23.1, rainMmHr: 54.0, riskPct: 89, skyCondition: 'High Track Subsidence' },
      { offsetMin: 180, tempC: 23.8, rainMmHr: 39.0, riskPct: 80, skyCondition: 'Moderate Showers' }
    ],
    provenance: 'SYNTHETIC DEMONSTRATION DATA'
  },

  // Meghalaya / Sohra Rim
  'meghalaya-east-khasi-sohra': {
    regionId: 'meghalaya-east-khasi-sohra',
    regionName: 'East Khasi Hills – Sohra Escarpment',
    state: 'Meghalaya',
    temperatureC: 18.5,
    feelsLikeC: 19.8,
    rainfall1hMm: 68.0,
    rainfall24hMm: 220.0,
    rainfall72hMm: 480.0,
    rainfallIntensity: 'EXTREME',
    humidityPct: 99,
    windSpeedKmh: 46,
    windDirectionDeg: 190,
    windDirectionCardinal: 'S',
    cloudCoveragePct: 100,
    cloudCondition: 'Funnelled Orographic Torrent',
    pressureHpa: 990,
    dewPointC: 18.3,
    visibilityKm: 1.2,
    uvIndex: 1,
    warningLevel: 'RED_ALERT',
    warningTitle: 'Extreme Orographic Deluge Alert',
    warningAdvisory: 'Record moisture advection over southern rim. Waterfalls and ravine channels overflowing.',
    forecastWindow3h: [
      { offsetMin: 0, tempC: 18.5, rainMmHr: 68.0, riskPct: 72, skyCondition: 'Violent Rainfall' },
      { offsetMin: 60, tempC: 18.0, rainMmHr: 74.0, riskPct: 81, skyCondition: 'Continuous Deluge' },
      { offsetMin: 120, tempC: 17.8, rainMmHr: 62.0, riskPct: 86, skyCondition: 'High Runoff Velocity' },
      { offsetMin: 180, tempC: 18.2, rainMmHr: 50.0, riskPct: 76, skyCondition: 'Heavy Continuous Rain' }
    ],
    provenance: 'SYNTHETIC DEMONSTRATION DATA'
  },

  // Arunachal Pradesh / Tawang Sela
  'arunachal-tawang-sela': {
    regionId: 'arunachal-tawang-sela',
    regionName: 'Tawang – Sela Pass High Altitude Corridor',
    state: 'Arunachal Pradesh',
    temperatureC: 8.2,
    feelsLikeC: 4.5,
    rainfall1hMm: 35.0,
    rainfall24hMm: 118.0,
    rainfall72hMm: 195.0,
    rainfallIntensity: 'HIGH',
    humidityPct: 89,
    windSpeedKmh: 52,
    windDirectionDeg: 280,
    windDirectionCardinal: 'W',
    cloudCoveragePct: 95,
    cloudCondition: 'High Alpine Front & Freezing Rain',
    pressureHpa: 710,
    dewPointC: 6.4,
    visibilityKm: 2.8,
    uvIndex: 3,
    warningLevel: 'ORANGE_WARNING',
    warningTitle: 'Alpine Scree Slip & Snow-Rain Mix',
    warningAdvisory: 'Freeze-thaw expansion coupled with heavy precipitation threatening NH-13 Sela northern portal.',
    forecastWindow3h: [
      { offsetMin: 0, tempC: 8.2, rainMmHr: 35.0, riskPct: 74, skyCondition: 'Freezing Deluge' },
      { offsetMin: 60, tempC: 7.5, rainMmHr: 41.0, riskPct: 80, skyCondition: 'Alpine Scree Hazard' },
      { offsetMin: 120, tempC: 6.8, rainMmHr: 46.0, riskPct: 87, skyCondition: 'Peak Frost Shock' },
      { offsetMin: 180, tempC: 7.2, rainMmHr: 32.0, riskPct: 77, skyCondition: 'Sleet & Rain' }
    ],
    provenance: 'SYNTHETIC DEMONSTRATION DATA'
  }
};

// 2. GEOGRAPHIC RAINFALL RADAR CELLS (Smooth Meteorological Rings)
export const RAINFALL_RADAR_CELLS: RainfallRadarCell[] = [
  // Primary Cell 1: Sikkim Teesta Valley Cloudburst
  {
    id: 'RADAR-SK-01',
    name: 'Teesta Valley Orographic Cell',
    centerLng: 88.535,
    centerLat: 27.350,
    radiusKm: 24,
    intensityMmHr: 58.5,
    intensityTier: 'EXTREME',
    rings: [
      { radiusMultiplier: 0.35, colorHex: '#991B1B', alpha: 0.70, label: 'EXTREME CORE (>60 mm/hr)' },
      { radiusMultiplier: 0.65, colorHex: '#EF4444', alpha: 0.50, label: 'HIGH INTENSITY (40-60 mm/hr)' },
      { radiusMultiplier: 0.90, colorHex: '#F59E0B', alpha: 0.35, label: 'MODERATE BAND (20-40 mm/hr)' },
      { radiusMultiplier: 1.25, colorHex: '#10B981', alpha: 0.20, label: 'LIGHT OUTER CONVERGENCE' }
    ]
  },

  // Primary Cell 2: Meghalaya Sohra Escarpment Deluge
  {
    id: 'RADAR-ML-01',
    name: 'Khasi Hills Monsoon Funnel',
    centerLng: 91.732,
    centerLat: 25.270,
    radiusKm: 32,
    intensityMmHr: 72.0,
    intensityTier: 'EXTREME',
    rings: [
      { radiusMultiplier: 0.40, colorHex: '#7F1D1D', alpha: 0.75, label: 'EXTREME CORE (>70 mm/hr)' },
      { radiusMultiplier: 0.70, colorHex: '#DC2626', alpha: 0.55, label: 'HIGH INTENSITY (50-70 mm/hr)' },
      { radiusMultiplier: 1.00, colorHex: '#F59E0B', alpha: 0.38, label: 'MODERATE BAND (25-50 mm/hr)' },
      { radiusMultiplier: 1.40, colorHex: '#10B981', alpha: 0.22, label: 'LIGHT CONVERGENCE' }
    ]
  },

  // Cell 3: Assam Dima Hasao Convective Cluster
  {
    id: 'RADAR-AS-01',
    name: 'Barail Range Storm Envelope',
    centerLng: 93.024,
    centerLat: 25.176,
    radiusKm: 28,
    intensityMmHr: 46.0,
    intensityTier: 'HIGH',
    rings: [
      { radiusMultiplier: 0.35, colorHex: '#EA580C', alpha: 0.65, label: 'HEAVY CELL (45-60 mm/hr)' },
      { radiusMultiplier: 0.70, colorHex: '#F59E0B', alpha: 0.45, label: 'MODERATE BAND (25-45 mm/hr)' },
      { radiusMultiplier: 1.15, colorHex: '#10B981', alpha: 0.25, label: 'OUTER SHOWERS' }
    ]
  },

  // Cell 4: Arunachal Tawang Alpine Cell
  {
    id: 'RADAR-AR-01',
    name: 'Sela Ridge Frontal Cell',
    centerLng: 92.103,
    centerLat: 27.505,
    radiusKm: 26,
    intensityMmHr: 38.0,
    intensityTier: 'HIGH',
    rings: [
      { radiusMultiplier: 0.35, colorHex: '#D97706', alpha: 0.60, label: 'HIGH INTENSITY (35-45 mm/hr)' },
      { radiusMultiplier: 0.75, colorHex: '#FBBF24', alpha: 0.40, label: 'MODERATE BAND (15-35 mm/hr)' },
      { radiusMultiplier: 1.20, colorHex: '#10B981', alpha: 0.20, label: 'LIGHT SLEET/RAIN' }
    ]
  },

  // Cell 5: National Synoptic Cell (Ganga Delta & West Bengal Corridor)
  {
    id: 'RADAR-NAT-01',
    name: 'Bay of Bengal Monsoonal Inflow Band',
    centerLng: 88.364,
    centerLat: 23.500,
    radiusKm: 65,
    intensityMmHr: 26.0,
    intensityTier: 'MODERATE',
    rings: [
      { radiusMultiplier: 0.45, colorHex: '#F59E0B', alpha: 0.45, label: 'MODERATE CONVECTIVE CORE' },
      { radiusMultiplier: 0.90, colorHex: '#10B981', alpha: 0.30, label: 'MONSOON DRIFT' },
      { radiusMultiplier: 1.35, colorHex: '#0D9488', alpha: 0.15, label: 'SYNOPTIC CIRRUS PERIPHERY' }
    ]
  }
];

// Helper to get weather data for any given zone / state
export function getWeatherDataForZone(zoneId?: string, stateName?: string): RegionalWeatherReport {
  if (zoneId && REGIONAL_WEATHER_CATALOG[zoneId]) {
    return REGIONAL_WEATHER_CATALOG[zoneId];
  }
  if (stateName) {
    const match = Object.values(REGIONAL_WEATHER_CATALOG).find(
      r => r.state.toLowerCase().includes(stateName.toLowerCase())
    );
    if (match) return match;
  }
  return REGIONAL_WEATHER_CATALOG['NORTHEAST'];
}
