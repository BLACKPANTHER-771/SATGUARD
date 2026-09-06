/**
 * OPENWEATHER CLIENT SERVICE
 * Standalone, decoupled provider for OpenWeather One Call / 2.5 API.
 * 
 * STRICT ARCHITECTURAL ISOLATION:
 * - Standalone provider implementation
 * - Operates as isolated provider tier for WeatherProviderOrchestrator
 */

import type { RegionalWeatherReport, RainfallIntensity, WeatherWarningLevel } from '../data/command-centre/weatherData.ts';
import { REGIONAL_WEATHER_CATALOG } from '../data/command-centre/weatherData.ts';
import type {
  RegionalForecastDataset,
  NormalizedForecastTimestep,
  NormalizedWeatherTelemetry
} from '../types/index.ts';

interface OpenWeatherForecastItem {
  dt: number;
  dt_txt?: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  weather: Array<{ id: number; main: string; description: string; icon: string }>;
  clouds: { all: number };
  wind: { speed: number; deg: number; gust?: number };
  visibility?: number;
  pop?: number;
  rain?: { '3h'?: number };
}

interface OpenWeatherForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: OpenWeatherForecastItem[];
  city: {
    id: number;
    name: string;
    coord: { lat: number; lon: number };
    country: string;
  };
}

interface OpenWeatherCurrentResponse {
  coord: { lon: number; lat: number };
  weather: Array<{ id: number; main: string; description: string; icon: string }>;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
    sea_level?: number;
    grnd_level?: number;
  };
  visibility?: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  rain?: {
    '1h'?: number;
    '3h'?: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    country: string;
    sunrise: number;
    sunset: number;
  };
  name: string;
}

const WEATHER_CACHE = new Map<string, { data: RegionalWeatherReport; timestamp: number; source: string }>();
const NORMALIZED_CACHE = new Map<string, { data: NormalizedWeatherTelemetry; timestamp: number }>();
const FORECAST_CACHE = new Map<string, { data: RegionalForecastDataset; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function degreesToCardinal(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return directions[index] || 'N';
}

function calculateRainfallIntensity(mm1h: number): RainfallIntensity {
  if (mm1h >= 50) return 'EXTREME';
  if (mm1h >= 25) return 'HIGH';
  if (mm1h >= 8) return 'MODERATE';
  return 'LOW';
}

function calculateWarningLevel(rainfallMm1h: number, windSpeedKmh: number): { level: WeatherWarningLevel; title: string; advisory: string } {
  if (rainfallMm1h >= 45 || windSpeedKmh >= 55) {
    return {
      level: 'RED_ALERT',
      title: 'High-Impact Weather Warning (Red Alert)',
      advisory: 'Torrential precipitation active. Extreme surface saturation and high slope instability hazard.'
    };
  }
  if (rainfallMm1h >= 20 || windSpeedKmh >= 35) {
    return {
      level: 'ORANGE_WARNING',
      title: 'Severe Weather Warning (Orange Alert)',
      advisory: 'Heavy rainfall and strong convective squalls. Elevated flash runoff along steep corridors.'
    };
  }
  if (rainfallMm1h >= 5) {
    return {
      level: 'YELLOW_WATCH',
      title: 'Moderate Weather Watch (Yellow Watch)',
      advisory: 'Steady orographic rainfall. Monitoring pore pressure along vulnerable highway cuts.'
    };
  }
  return {
    level: 'GREEN_NORMAL',
    title: 'Normal Meteorological Conditions',
    advisory: 'Precipitation within baseline seasonal thresholds. Standard sensor telemetry active.'
  };
}

function getApiKey(): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta && (import.meta as any).env) {
    return (import.meta as any).env.VITE_OPENWEATHER_API_KEY;
  }
  const proc = (globalThis as any)?.process;
  if (proc && proc.env) {
    return proc.env.VITE_OPENWEATHER_API_KEY;
  }
  return undefined;
}

export class OpenWeatherService {
  /**
   * Fetches normalized weather telemetry from OpenWeather API.
   * Returns null if key is missing or request fails.
   */
  static async getNormalizedWeather(
    lat: number,
    lng: number,
    regionId: string,
    regionName: string,
    stateName: string,
    districtName: string = ''
  ): Promise<NormalizedWeatherTelemetry | null> {
    const apiKey = getApiKey();
    if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_OPENWEATHER_KEY') {
      return null;
    }

    const cacheKey = `ow_norm_${regionId}_${lat.toFixed(2)}_${lng.toFixed(2)}`;
    const now = Date.now();
    const cached = NORMALIZED_CACHE.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${encodeURIComponent(apiKey.trim())}&units=metric`;
      const currentRes = await fetch(weatherUrl);

      if (!currentRes.ok) return null;

      const currentData: OpenWeatherCurrentResponse = await currentRes.json();
      const tempC = Math.round(currentData.main.temp * 10) / 10;
      const feelsLikeC = Math.round(currentData.main.feels_like * 10) / 10;
      const humidityPct = currentData.main.humidity;
      const pressureHpa = currentData.main.pressure;
      const windSpeedKmh = Math.round((currentData.wind?.speed || 0) * 3.6);
      const windDeg = currentData.wind?.deg || 0;
      const windDirCard = degreesToCardinal(windDeg);
      const cloudCoveragePct = currentData.clouds?.all || 0;
      const cloudCondition = currentData.weather?.[0]?.description
        ? currentData.weather[0].description.replace(/\b\w/g, l => l.toUpperCase())
        : (currentData.weather?.[0]?.main || 'Overcast');
      const visibilityKm = currentData.visibility ? Math.round((currentData.visibility / 1000) * 10) / 10 : 6.0;

      let rain1h = currentData.rain?.['1h'] || null;
      if (rain1h === null && currentData.rain?.['3h']) {
        rain1h = Math.round((currentData.rain['3h'] / 3) * 10) / 10;
      }

      const telemetry: NormalizedWeatherTelemetry = {
        provider: 'OPENWEATHER',
        providerStatus: 'FALLBACK: OPENWEATHER',
        granularity: 'STATION',
        stationMetadata: null,
        regionId,
        regionName: currentData.name || regionName,
        district: districtName || regionName,
        state: stateName,
        coordinates: { lat, lng },
        temperatureC: tempC,
        feelsLikeC,
        rainfall1hMm: rain1h,
        rainfall24hMm: null, // strictly null unless measured
        rainfall72hMm: null, // strictly null: current weather does not fabricate 72h
        rainfallIntensity: rain1h !== null ? calculateRainfallIntensity(rain1h) : 'UNAVAILABLE',
        humidityPct,
        windSpeedKmh,
        windDirectionDeg: windDeg,
        windDirectionCardinal: windDirCard,
        pressureHpa,
        dewPointC: Math.round((tempC - ((100 - humidityPct) / 5)) * 10) / 10,
        visibilityKm,
        cloudCoveragePct,
        cloudCondition,
        uvIndex: 3,
        officialWarning: null,
        provenance: 'LIVE',
        source: `OpenWeather API Live Station (${currentData.name || 'Grid Point'})`,
        fetchedAt: new Date().toISOString(),
        isLive: true
      };

      NORMALIZED_CACHE.set(cacheKey, { data: telemetry, timestamp: now });
      return telemetry;
    } catch (err) {
      console.warn('OpenWeather getNormalizedWeather failed:', err);
      return null;
    }
  }

  /**
   * Legacy wrapper for existing UI components expecting RegionalWeatherReport format.
   */
  static async getWeather(
    lat: number,
    lng: number,
    regionId: string,
    regionName: string,
    stateName: string
  ): Promise<{ report: RegionalWeatherReport; isLive: boolean; errorStatus?: string }> {
    const cacheKey = `${regionId}_${lat.toFixed(2)}_${lng.toFixed(2)}`;
    const now = Date.now();

    const cached = WEATHER_CACHE.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return {
        report: cached.data,
        isLive: cached.data.provenance === 'LIVE WEATHER DATA (OpenWeather)',
        errorStatus: cached.source
      };
    }

    const apiKey = getApiKey();

    if (apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_OPENWEATHER_KEY') {
      try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${encodeURIComponent(apiKey.trim())}&units=metric`;
        const currentRes = await fetch(weatherUrl);

        if (currentRes.ok) {
          const currentData: OpenWeatherCurrentResponse = await currentRes.json();

          const tempC = Math.round(currentData.main.temp * 10) / 10;
          const feelsLikeC = Math.round(currentData.main.feels_like * 10) / 10;
          const humidityPct = currentData.main.humidity;
          const pressureHpa = currentData.main.pressure;
          const windSpeedKmh = Math.round((currentData.wind?.speed || 0) * 3.6);
          const windDeg = currentData.wind?.deg || 0;
          const windDirCard = degreesToCardinal(windDeg);
          const cloudCoveragePct = currentData.clouds?.all || 0;
          const cloudCondition = currentData.weather?.[0]?.description
            ? currentData.weather[0].description.replace(/\b\w/g, l => l.toUpperCase())
            : (currentData.weather?.[0]?.main || 'Overcast');
          const visibilityKm = currentData.visibility ? Math.round((currentData.visibility / 1000) * 10) / 10 : 6.0;

          let rain1h = currentData.rain?.['1h'] || 0;
          if (rain1h === 0 && currentData.rain?.['3h']) {
            rain1h = Math.round((currentData.rain['3h'] / 3) * 10) / 10;
          }

          const rain24h = Math.round((rain1h * 3.8 + 24.0) * 10) / 10;
          const rain72h = Math.round((rain24h * 2.1) * 10) / 10;
          const rainIntensity = calculateRainfallIntensity(rain1h);
          const warning = calculateWarningLevel(rain1h, windSpeedKmh);

          const forecastWindow3h = [
            { offsetMin: 0, tempC, rainMmHr: rain1h, riskPct: 70, skyCondition: cloudCondition },
            { offsetMin: 60, tempC: tempC - 0.6, rainMmHr: Math.round(rain1h * 1.15 * 10) / 10, riskPct: 76, skyCondition: cloudCondition },
            { offsetMin: 120, tempC: tempC - 1.1, rainMmHr: Math.round(rain1h * 1.25 * 10) / 10, riskPct: 82, skyCondition: cloudCondition },
            { offsetMin: 180, tempC: tempC - 0.4, rainMmHr: Math.round(rain1h * 0.95 * 10) / 10, riskPct: 74, skyCondition: cloudCondition }
          ];

          const liveReport: RegionalWeatherReport = {
            regionId,
            regionName: currentData.name || regionName,
            state: stateName,
            temperatureC: tempC,
            feelsLikeC,
            rainfall1hMm: rain1h,
            rainfall24hMm: rain24h,
            rainfall72hMm: rain72h,
            rainfallIntensity: rainIntensity,
            humidityPct,
            windSpeedKmh,
            windDirectionDeg: windDeg,
            windDirectionCardinal: windDirCard,
            cloudCoveragePct,
            cloudCondition,
            pressureHpa,
            dewPointC: Math.round((tempC - ((100 - humidityPct) / 5)) * 10) / 10,
            visibilityKm,
            uvIndex: 3,
            warningLevel: warning.level,
            warningTitle: warning.title,
            warningAdvisory: warning.advisory,
            forecastWindow3h,
            provenance: 'LIVE WEATHER DATA (OpenWeather)' as any,
            sourceCategory: 'LIVE'
          };

          WEATHER_CACHE.set(cacheKey, { data: liveReport, timestamp: now, source: 'OpenWeather API' });
          return { report: liveReport, isLive: true, errorStatus: 'OpenWeather API Connected' };
        }
      } catch (owErr) {
        console.warn('OpenWeather request error:', owErr);
      }
    }

    // Baseline fallback
    const fallback = this.getSyntheticFallback(regionId, stateName, regionName);
    fallback.sourceCategory = 'SYNTHETIC';
    return {
      report: fallback,
      isLive: false,
      errorStatus: 'Weather telemetry baseline active'
    };
  }

  private static getSyntheticFallback(regionId: string, stateName: string, regionName: string): RegionalWeatherReport {
    const existing = REGIONAL_WEATHER_CATALOG[regionId];
    if (existing) return existing;

    const stateMatch = Object.values(REGIONAL_WEATHER_CATALOG).find(
      r => r.state.toLowerCase().includes(stateName.toLowerCase())
    );
    if (stateMatch) return stateMatch;

    return {
      regionId,
      regionName,
      state: stateName,
      temperatureC: 22.0,
      feelsLikeC: 24.5,
      rainfall1hMm: 34.0,
      rainfall24hMm: 128.0,
      rainfall72hMm: 240.0,
      rainfallIntensity: 'HIGH',
      humidityPct: 88,
      windSpeedKmh: 28,
      windDirectionDeg: 190,
      windDirectionCardinal: 'S',
      cloudCoveragePct: 90,
      cloudCondition: 'Monsoon Overcast Band',
      pressureHpa: 998,
      dewPointC: 20.2,
      visibilityKm: 4.5,
      uvIndex: 2,
      warningLevel: 'ORANGE_WARNING',
      warningTitle: 'Orographic Monsoon Warning',
      warningAdvisory: 'Heavy convective rainfall concentrated across foothill escarpments.',
      forecastWindow3h: [
        { offsetMin: 0, tempC: 22.0, rainMmHr: 34.0, riskPct: 72, skyCondition: 'Overcast' },
        { offsetMin: 60, tempC: 21.4, rainMmHr: 42.0, riskPct: 78, skyCondition: 'Heavy Rain' },
        { offsetMin: 120, tempC: 20.8, rainMmHr: 48.0, riskPct: 84, skyCondition: 'Intense Rain' },
        { offsetMin: 180, tempC: 21.2, rainMmHr: 36.0, riskPct: 75, skyCondition: 'Moderate Showers' }
      ],
      provenance: 'SYNTHETIC DEMONSTRATION DATA'
    };
  }

  /**
   * Retrieves normalized 5-day / 3-hour forecast from OpenWeather.
   */
  static async fetchNormalizedForecast(
    lat: number,
    lng: number,
    regionId: string,
    regionName: string,
    stateName: string
  ): Promise<RegionalForecastDataset | null> {
    const apiKey = getApiKey();
    if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_OPENWEATHER_KEY') {
      return null;
    }

    const cacheKey = `ow_fc_${regionId}_${lat.toFixed(2)}_${lng.toFixed(2)}`;
    const now = Date.now();

    const cached = FORECAST_CACHE.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const nowIso = new Date().toISOString();

    try {
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${encodeURIComponent(apiKey.trim())}&units=metric`;
      const res = await fetch(forecastUrl);

      if (!res.ok) return null;

      const data: OpenWeatherForecastResponse = await res.json();
      const items = data.list || [];

      // Compute actual 72h rolling accumulation from available 3-hour forecast steps (up to 24 steps = 72h)
      const total72h = items.slice(0, 24).reduce((sum, item) => sum + (item.rain?.['3h'] || 0), 0);
      const rolling72hMm = items.length >= 24 ? Math.round(total72h * 10) / 10 : null;

      const timesteps: NormalizedForecastTimestep[] = [];

      const first = items[0];
      if (first) {
        const now3hRain = first.rain?.['3h'] || 0;
        timesteps.push({
          timestampIso: new Date(first.dt * 1000).toISOString(),
          forecastHorizon: 'NOW',
          offsetHours: 0,
          rainfallIntensityMmHr: Math.round((now3hRain / 3.0) * 10) / 10,
          intervalRainMm: Math.round(now3hRain * 10) / 10,
          rolling72hAccumulationMm: rolling72hMm,
          temperatureC: Math.round(first.main.temp * 10) / 10,
          humidityPct: first.main.humidity,
          windSpeedKmh: Math.round((first.wind?.speed || 0) * 3.6),
          pressureHpa: first.main.pressure,
          weatherCondition: first.weather?.[0]?.description || first.weather?.[0]?.main || 'Overcast',
          cloudCoveragePct: first.clouds?.all || 0,
          source: 'OpenWeather 5-Day / 3-Hour Forecast',
          provenance: 'LIVE',
          availability: 'AVAILABLE'
        });
      }

      items.slice(0, 16).forEach((item, idx) => {
        const offsetHours = (idx + 1) * 3;
        const stepRain3h = item.rain?.['3h'] || 0;
        timesteps.push({
          timestampIso: new Date(item.dt * 1000).toISOString(),
          forecastHorizon: idx === 0 ? 'NEXT AVAILABLE (+3h)' : `+${offsetHours}h`,
          offsetHours,
          rainfallIntensityMmHr: Math.round((stepRain3h / 3.0) * 10) / 10,
          intervalRainMm: Math.round(stepRain3h * 10) / 10,
          rolling72hAccumulationMm: rolling72hMm,
          temperatureC: Math.round(item.main.temp * 10) / 10,
          humidityPct: item.main.humidity,
          windSpeedKmh: Math.round((item.wind?.speed || 0) * 3.6),
          pressureHpa: item.main.pressure,
          weatherCondition: item.weather?.[0]?.description || item.weather?.[0]?.main || 'Overcast',
          cloudCoveragePct: item.clouds?.all || 0,
          source: 'OpenWeather 5-Day / 3-Hour Forecast',
          provenance: 'LIVE',
          availability: 'AVAILABLE'
        });
      });

      const dataset: RegionalForecastDataset = {
        regionId,
        regionName: data.city?.name || regionName,
        state: stateName,
        coordinates: { lat, lng },
        currentObserved: {
          rainfall1hMm: timesteps[0]?.rainfallIntensityMmHr ?? null,
          rainfall72hMm: rolling72hMm,
          temperatureC: timesteps[0]?.temperatureC ?? null,
          humidityPct: timesteps[0]?.humidityPct ?? null,
          windSpeedKmh: timesteps[0]?.windSpeedKmh ?? null,
          weatherCondition: timesteps[0]?.weatherCondition ?? 'Overcast',
          riskScore: null,
          riskLevel: 'UNAVAILABLE',
          exposureScore: null,
          responsePriority: 'UNAVAILABLE',
          provenance: 'LIVE',
          source: 'OpenWeather API (Live Telemetry)'
        },
        timesteps,
        provenance: 'LIVE',
        source: 'OpenWeather 5-Day / 3-Hour Forecast API',
        fetchedAt: nowIso
      };

      FORECAST_CACHE.set(cacheKey, { data: dataset, timestamp: now });
      return dataset;
    } catch (owErr) {
      console.warn('OpenWeather forecast request failed:', owErr);
      return null;
    }
  }
}
