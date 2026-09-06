// ============================================================
// EPOCH — Interpretable Multi-Factor Landslide Risk Engine
// Decision Support & Exposure Priority Service (SIH26001)
// ============================================================

import type {
  RiskZone,
  RiskLevel,
  ResponsePriorityLevel,
  ConfidenceStatus,
  EvidenceCompleteness,
  RiskFactorItem,
  ExposureRecord,
  ResponseRecommendation,
  RoadClass,
  AssetRiskRelationship,
  RoadConnectivityStatus,
  ConnectivityImpactLevel,
  ThreatRoadAsset,
  ThreatBridgeAsset,
  ThreatCriticalFacility,
  ConnectivityAssessment,
  NormalizedForecastTimestep,
  EvaluatedForecastTimestep
} from '../types/index.ts';


export interface MultiFactorRiskInputs {
  zoneId?: string;
  zoneName?: string;
  state?: 'Sikkim' | 'Assam' | string;
  district?: string;
  lat?: number;
  lng?: number;
  elevation_m?: number;
  slope_deg?: number;
  soil_moisture_pct?: number;
  rainfall_1h_mm?: number;
  rainfall_72h_mm?: number;
  historical_events_5y?: number;
  lithology?: string;
  soil_type?: string;
  population_exposed?: number | null;
  villages_exposed?: string[];
  roads_affected?: string[];
  critical_facilities?: string[];
  threatened_bridges?: string[];
  exposed_hospitals?: string[];
  exposed_schools?: string[];
  critical_infrastructure?: string[];
  satellite_los_displacement_mm?: number;
  coherence_drop_pct?: number;
  field_verified?: boolean;
  time_offset_min?: number;
  rainfall_source?: 'LIVE' | 'FALLBACK' | 'SYNTHETIC' | 'UNAVAILABLE';
}

export interface FactorScoreBreakdown {
  id: string;
  name: string;
  category: 'METEOROLOGICAL' | 'GEOTECHNICAL' | 'HYDROLOGICAL' | 'HISTORICAL';
  weight: number;
  normalizedScore: number | null;
  contributionPoints: number;
  percentageOfTotal: number;
  indicatorValue: string;
  isAvailable: boolean;
  color: string;
  triggerNarrative: string;
}

export interface RiskEngineOutput {
  riskScore: number;
  riskLevel: RiskLevel;
  riskTrend: 'RISING' | 'STABLE' | 'FALLING';
  confidenceStatus: ConfidenceStatus;
  evidenceCompleteness: EvidenceCompleteness;
  exposureScore: number;
  responsePriority: ResponsePriorityLevel;
  responsePriorityScore: number;
  priorityRationale: string;
  connectivityImpact: ConnectivityImpactLevel;
  connectivityAssessment: ConnectivityAssessment;
  factorScores: {
    rainfall: number | null;
    slope: number | null;
    soilMoisture: number | null;
    history: number | null;
    lithology: number | null;
  };
  factorContributions: {
    rainfall: number;
    slope: number;
    soilMoisture: number;
    history: number;
    lithology: number;
  };
  riskFactors: RiskFactorItem[];
  factorBreakdown: FactorScoreBreakdown[];
  exposureRecord: ExposureRecord;
  recommendations: ResponseRecommendation[];
  disclaimer: string;
  provenance: 'SYNTHETIC';
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  return 'LOW';
}

export function getRiskColor(levelOrScore: RiskLevel | number): string {
  const level = typeof levelOrScore === 'number' ? getRiskLevel(levelOrScore) : levelOrScore;
  switch (level) {
    case 'CRITICAL':
      return '#DC2626';
    case 'HIGH':
      return '#D97706';
    case 'MODERATE':
      return '#C58A24';
    case 'LOW':
    default:
      return '#167F78';
  }
}

export function getRiskBadgeClasses(levelOrScore: RiskLevel | number): string {
  const level = typeof levelOrScore === 'number' ? getRiskLevel(levelOrScore) : levelOrScore;
  switch (level) {
    case 'CRITICAL':
      return 'bg-[#DC2626]/15 text-[#DC2626] border-[#DC2626]/30';
    case 'HIGH':
      return 'bg-[#D97706]/15 text-[#D97706] border-[#D97706]/30';
    case 'MODERATE':
      return 'bg-[#C58A24]/15 text-[#C58A24] border-[#C58A24]/30';
    case 'LOW':
    default:
      return 'bg-[#167F78]/15 text-[#167F78] border-[#167F78]/30';
  }
}

export class InterpretableRiskEngine {
  public static readonly ENGINE_NAME = 'INTERPRETABLE MULTI-FACTOR RISK ENGINE';
  public static readonly SCIENTIFIC_DISCLAIMER =
    'Risk scores are calculated by a deterministic, interpretable multi-factor decision-support engine calibrated for Himalayan and North Eastern geomorphology. This is NOT a black-box trained ML model or an engineering Factor-of-Safety calculation.';

  // Canonical Weights (Sum = 1.00 / 100%)
  public static readonly WEIGHT_RAINFALL = 0.40;      // 40%
  public static readonly WEIGHT_SLOPE = 0.26;         // 26%
  public static readonly WEIGHT_SOIL_MOISTURE = 0.18; // 18%
  public static readonly WEIGHT_HISTORY = 0.09;       // 9%
  public static readonly WEIGHT_LITHOLOGY = 0.07;     // 7%

  /**
   * Deterministic Multi-Factor Risk Calculation
   * Formula:
   *   Risk Score = (Rainfall_norm * 0.40) + (Slope_norm * 0.26) + (Moisture_norm * 0.18) + (History_norm * 0.09) + (Lithology_norm * 0.07)
   */
  public static evaluateRisk(inputs: MultiFactorRiskInputs): RiskEngineOutput {
    const timeOffset = inputs.time_offset_min || 0;
    const timeMultiplier =
      timeOffset === 30 ? 1.15 :
      timeOffset === 60 ? 1.32 :
      timeOffset === 120 ? 1.48 :
      timeOffset === 180 ? 1.08 : 1.0;

    // Apply temporal progression if time offset is active
    const effRainfall1h = inputs.rainfall_1h_mm !== undefined && inputs.rainfall_1h_mm !== null && !isNaN(inputs.rainfall_1h_mm)
      ? inputs.rainfall_1h_mm * timeMultiplier
      : undefined;

    const effRainfall72h = inputs.rainfall_72h_mm !== undefined && inputs.rainfall_72h_mm !== null && !isNaN(inputs.rainfall_72h_mm)
      ? inputs.rainfall_72h_mm * (1 + (timeMultiplier - 1) * 0.4)
      : undefined;

    const effMoisture = inputs.soil_moisture_pct !== undefined && inputs.soil_moisture_pct !== null && !isNaN(inputs.soil_moisture_pct)
      ? Math.min(inputs.soil_moisture_pct + (timeOffset / 60) * 2.2, 98.0)
      : undefined;

    // ============================================================
    // 1. FACTOR NORMALIZATION (0–100 scale per factor)
    // ============================================================

    // A. Rainfall (40% weight): Intensity threshold 30mm/hr (50 pts), 72h accumulation threshold 150mm (50 pts)
    let rainNorm: number | null = null;
    let rainAvailable = false;
    let rainIndicator = 'UNAVAILABLE';
    let rainNarrative = 'Rainfall telemetry is unavailable for this sector.';

    const has1h = effRainfall1h !== undefined && effRainfall1h !== null && !isNaN(effRainfall1h);
    const has72h = effRainfall72h !== undefined && effRainfall72h !== null && !isNaN(effRainfall72h);

    if (has1h || has72h) {
      rainAvailable = true;
      const r1h = has1h ? Math.max(0, effRainfall1h!) : null;
      const r72h = has72h ? Math.max(0, effRainfall72h!) : null;

      if (r1h !== null && r72h !== null) {
        // Dual component formula: min(100, (intensity / 30 * 50) + (accumulated / 150 * 50))
        rainNorm = Math.min(100.0, Math.max(0.0, (r1h / 30.0 * 50.0) + (r72h / 150.0 * 50.0)));
        rainIndicator = `${r1h.toFixed(1)} mm/hr (${r72h.toFixed(0)} mm 72h)`;
      } else if (r1h !== null) {
        rainNorm = Math.min(100.0, Math.max(0.0, (r1h / 30.0) * 100.0));
        rainIndicator = `${r1h.toFixed(1)} mm/hr (1h)`;
      } else if (r72h !== null) {
        rainNorm = Math.min(100.0, Math.max(0.0, (r72h / 150.0) * 100.0));
        rainIndicator = `${r72h.toFixed(0)} mm (72h)`;
      }

      const eval1h = r1h !== null ? r1h : 0;
      rainNarrative = eval1h >= 30.0
        ? `Severe cloudburst precipitation (${eval1h.toFixed(1)} mm/hr) exceeding safe slope drainage capacity.`
        : eval1h >= 15.0
        ? `Elevated monsoon rainfall (${eval1h.toFixed(1)} mm/hr) actively infiltrating hillside regolith.`
        : `Moderate or baseline rainfall (${eval1h.toFixed(1)} mm/hr) within standard seasonal tolerances.`;
    }

    // B. Slope Gradient (26% weight): Mountain critical angle 45° threshold
    let slopeNorm: number | null = null;
    let slopeAvailable = false;
    let slopeIndicator = 'UNAVAILABLE';
    let slopeNarrative = 'DEM slope geometry data is unavailable.';

    if (inputs.slope_deg !== undefined && inputs.slope_deg !== null && !isNaN(inputs.slope_deg)) {
      slopeAvailable = true;
      const slope = Math.max(0, inputs.slope_deg);
      slopeNorm = Math.min(100.0, Math.max(0.0, (slope / 45.0) * 100.0));
      slopeIndicator = `${slope.toFixed(1)}° Slope Gradient`;
      slopeNarrative = slope >= 35.0
        ? `Steep ${slope.toFixed(1)}° inclination exceeds stable repose angle under dynamic moisture loading.`
        : slope >= 25.0
        ? `Moderate ${slope.toFixed(1)}° hill slope prone to translational planar slip during saturation.`
        : `Gentle ${slope.toFixed(1)}° terrain with low gravitational shear stress.`;
    }

    // C. Volumetric Soil Moisture (18% weight): Direct percentage 0-100%
    let moistureNorm: number | null = null;
    let moistureAvailable = false;
    let moistureIndicator = 'UNAVAILABLE';
    let moistureNarrative = 'In-situ soil moisture sensor telemetry is unavailable.';

    if (effMoisture !== undefined && effMoisture !== null && !isNaN(effMoisture)) {
      moistureAvailable = true;
      const moist = Math.max(0, effMoisture);
      moistureNorm = Math.min(100.0, Math.max(0.0, moist));
      moistureIndicator = `${moist.toFixed(0)}% Saturation Index`;
      moistureNarrative = moist >= 80.0
        ? `Near-total saturation (${moist.toFixed(0)}%) generating acute hydrostatic pore water pressure along slip horizon.`
        : moist >= 50.0
        ? `Elevated sub-surface moisture (${moist.toFixed(0)}%) reducing effective cohesive shear strength.`
        : `Low soil moisture (${moist.toFixed(0)}%) with intact internal friction and suction.`;
    }

    // D. Historical Landslide Recurrence (9% weight): 8 events in 5y threshold
    let histNorm: number | null = null;
    let histAvailable = false;
    let histIndicator = 'UNAVAILABLE';
    let histNarrative = 'GSI historical landslide inventory records unavailable.';

    if (inputs.historical_events_5y !== undefined && inputs.historical_events_5y !== null && !isNaN(inputs.historical_events_5y)) {
      histAvailable = true;
      const hist = Math.max(0, inputs.historical_events_5y);
      histNorm = Math.min(100.0, Math.max(0.0, (hist / 8.0) * 100.0));
      histIndicator = `${hist} Prior Events (5Y)`;
      histNarrative = hist >= 5
        ? `High-frequency landslide corridor with ${hist} documented slope failures in past 5-year inventory.`
        : hist >= 2
        ? `Documented historical instability with ${hist} prior slope reactivation events.`
        : `Low historical reactivation frequency (${hist} prior events).`;
    }

    // E. Lithology & Structural Jointing (7% weight): Classified formation weakness (0–100)
    let lithoNorm: number | null = null;
    let lithoAvailable = false;
    let lithoIndicator = 'UNAVAILABLE';
    let lithoNarrative = 'Geotechnical lithology classification unavailable.';

    if (inputs.lithology && inputs.lithology.trim() !== '' && inputs.lithology.toUpperCase() !== 'UNAVAILABLE') {
      lithoAvailable = true;
      const lithoStr = inputs.lithology.toLowerCase();
      lithoIndicator = inputs.lithology.split('&')[0].trim();

      if (
        lithoStr.includes('shale') ||
        lithoStr.includes('phyllite') ||
        lithoStr.includes('schist') ||
        lithoStr.includes('weathered') ||
        lithoStr.includes('colluvium') ||
        lithoStr.includes('silt')
      ) {
        lithoNorm = 95.0;
        lithoNarrative = 'Foliated, heavily jointed and weathered strata with low cohesive strength.';
      } else if (
        lithoStr.includes('sandstone') ||
        lithoStr.includes('quartzite') ||
        lithoStr.includes('calcareous') ||
        lithoStr.includes('gneiss')
      ) {
        lithoNorm = 70.0;
        lithoNarrative = 'Moderately fractured sedimentary and metamorphic rock with bedding discontinuities.';
      } else if (lithoStr.includes('granite') || lithoStr.includes('massive') || lithoStr.includes('basalt')) {
        lithoNorm = 35.0;
        lithoNarrative = 'Competent crystalline basement rock with high unconfined compressive strength.';
      } else {
        lithoNorm = 65.0;
        lithoNarrative = 'Standard regional geological formation with moderate shear resistance.';
      }
    }

    // ============================================================
    // 2. MISSING DATA POLICY & RE-NORMALIZATION
    // ============================================================
    // Policy:
    // When a factor is unavailable, its weight is redistributed proportionally among
    // all available factors by scaling with (Weight / Total_Available_Weight).
    // Factor contribution for unavailable factors is 0 points.
    // Sum of available factor contributions strictly equals final calculated Risk Score.

    const factorDefinitions = [
      { id: 'F-RAIN', name: 'Precipitation Trigger', category: 'METEOROLOGICAL' as const, baseWeight: this.WEIGHT_RAINFALL, norm: rainNorm, isAvailable: rainAvailable, indicator: rainIndicator, color: '#397FA8', narrative: rainNarrative },
      { id: 'F-SLOPE', name: 'Slope Shear Geometry', category: 'GEOTECHNICAL' as const, baseWeight: this.WEIGHT_SLOPE, norm: slopeNorm, isAvailable: slopeAvailable, indicator: slopeIndicator, color: '#C95050', narrative: slopeNarrative },
      { id: 'F-SOIL', name: 'Antecedent Soil Saturation', category: 'HYDROLOGICAL' as const, baseWeight: this.WEIGHT_SOIL_MOISTURE, norm: moistureNorm, isAvailable: moistureAvailable, indicator: moistureIndicator, color: '#C58A24', narrative: moistureNarrative },
      { id: 'F-HIST', name: 'Historical Slope Vulnerability', category: 'HISTORICAL' as const, baseWeight: this.WEIGHT_HISTORY, norm: histNorm, isAvailable: histAvailable, indicator: histIndicator, color: '#587A68', narrative: histNarrative },
      { id: 'F-LITHO', name: 'Lithology & Discontinuities', category: 'GEOTECHNICAL' as const, baseWeight: this.WEIGHT_LITHOLOGY, norm: lithoNorm, isAvailable: lithoAvailable, indicator: lithoIndicator, color: '#667579', narrative: lithoNarrative }
    ];

    const availableWeightTotal = factorDefinitions
      .filter(f => f.isAvailable)
      .reduce((sum, f) => sum + f.baseWeight, 0.0);

    let rawScore = 0.0;
    const factorBreakdown: FactorScoreBreakdown[] = [];

    factorDefinitions.forEach(f => {
      let contribution = 0.0;
      let effectiveWeight = f.baseWeight;

      if (f.isAvailable && f.norm !== null) {
        if (availableWeightTotal > 0.0) {
          effectiveWeight = f.baseWeight / availableWeightTotal;
          contribution = f.norm * effectiveWeight;
          rawScore += contribution;
        }
      }

      factorBreakdown.push({
        id: f.id,
        name: f.name,
        category: f.category,
        weight: f.baseWeight,
        normalizedScore: f.isAvailable ? Math.round((f.norm ?? 0) * 10) / 10 : null,
        contributionPoints: Math.round(contribution * 10) / 10,
        percentageOfTotal: 0, // calculated below
        indicatorValue: f.indicator,
        isAvailable: f.isAvailable,
        color: f.color,
        triggerNarrative: f.narrative
      });
    });

    // Final Risk Score (0-100 integer)
    const riskScore = availableWeightTotal > 0.0 ? Math.min(100, Math.max(0, Math.round(rawScore))) : 0;

    // Calculate percentage share of total score for each factor
    factorBreakdown.forEach(f => {
      if (rawScore > 0.0 && f.isAvailable) {
        f.percentageOfTotal = Math.round((f.contributionPoints / rawScore) * 100);
      } else {
        f.percentageOfTotal = 0;
      }
    });

    const riskLevel = getRiskLevel(riskScore);

    // Trend Evaluation (Based on temporal rainfall projection)
    const riskTrend: 'RISING' | 'STABLE' | 'FALLING' =
      timeMultiplier > 1.05 || (effRainfall1h !== undefined && effRainfall1h >= 30.0)
        ? 'RISING'
        : timeMultiplier < 0.95
        ? 'FALLING'
        : 'STABLE';

    // ============================================================
    // 3. EVIDENCE COMPLETENESS & AUDIT CHECKLIST
    // ============================================================
    const hasSar = inputs.satellite_los_displacement_mm !== undefined && inputs.satellite_los_displacement_mm !== null && !isNaN(inputs.satellite_los_displacement_mm);
    const hasField = Boolean(inputs.field_verified);

    const evidenceItems = [
      {
        name: 'Rainfall Telemetry',
        present: rainAvailable,
        provenance: (inputs.rainfall_source || (rainAvailable ? 'SYNTHETIC' : 'UNAVAILABLE')) as any,
        label: rainAvailable ? `${rainIndicator} (${inputs.rainfall_source || 'IMD AWS'})` : 'UNAVAILABLE'
      },
      {
        name: 'DEM Slope Geometry',
        present: slopeAvailable,
        provenance: slopeAvailable ? ('DERIVED' as const) : ('UNAVAILABLE' as const),
        label: slopeAvailable ? `${slopeIndicator} (Cartosat-3)` : 'UNAVAILABLE'
      },
      {
        name: 'Soil Moisture Saturation',
        present: moistureAvailable,
        provenance: moistureAvailable ? ('SYNTHETIC' as const) : ('UNAVAILABLE' as const),
        label: moistureAvailable ? `${moistureIndicator} (In-situ TDR)` : 'UNAVAILABLE'
      },
      {
        name: 'GSI Landslide Inventory',
        present: histAvailable,
        provenance: histAvailable ? ('DERIVED' as const) : ('UNAVAILABLE' as const),
        label: histAvailable ? `${histIndicator} (GSI NLSM)` : 'UNAVAILABLE'
      },
      {
        name: 'Lithological Formation',
        present: lithoAvailable,
        provenance: lithoAvailable ? ('DERIVED' as const) : ('UNAVAILABLE' as const),
        label: lithoAvailable ? `${lithoIndicator} (GSI 1:50k)` : 'UNAVAILABLE'
      },
      {
        name: 'Satellite InSAR Evidence',
        present: hasSar,
        provenance: hasSar ? ('SYNTHETIC' as const) : ('UNAVAILABLE' as const),
        label: hasSar ? `+${inputs.satellite_los_displacement_mm}mm LOS Shift` : 'UNAVAILABLE'
      },
      {
        name: 'Field Ground Truth',
        present: hasField,
        provenance: hasField ? ('SYNTHETIC' as const) : ('UNAVAILABLE' as const),
        label: hasField ? 'Verified by Local Authority' : 'UNAVAILABLE (Pending Inspection)'
      }
    ];

    const presentCount = evidenceItems.filter(e => e.present).length;
    const evidenceCompleteness: EvidenceCompleteness = {
      score: presentCount,
      total: evidenceItems.length,
      ratio: `${presentCount}/${evidenceItems.length}`,
      items: evidenceItems
    };

    // Backward-compatible RiskFactorItem array
    const riskFactors: RiskFactorItem[] = factorBreakdown.map(f => ({
      id: f.id,
      name: f.name,
      category: f.category,
      percentage: f.percentageOfTotal,
      normalized_score: f.normalizedScore,
      contribution_points: f.contributionPoints,
      is_available: f.isAvailable,
      indicator_value: f.indicatorValue,
      weight: f.weight,
      color: f.color,
      trigger_narrative: f.triggerNarrative
    }));

    // ============================================================
    // 4. AUTHORITATIVE EXPOSURE & RESPONSE PRIORITY (PHASE 3)
    // ============================================================
    const { exposureScore, exposureRecord } = this.evaluateExposure(inputs);
    const { responsePriority, responsePriorityScore, priorityRationale } = this.calculateResponsePriority(
      riskScore,
      exposureScore,
      inputs
    );

    const connectivityAssessment = this.assessConnectivityAndInfrastructure(inputs, riskLevel);
    exposureRecord.connectivity_assessment = connectivityAssessment;

    const isAssam = (inputs.state || '').toLowerCase() === 'assam';
    const recommendations = this.generateRecommendations(inputs, riskLevel, responsePriority, isAssam);

    return {
      riskScore,
      riskLevel,
      riskTrend,
      confidenceStatus: 'DEMONSTRATION',
      evidenceCompleteness,
      exposureScore,
      responsePriority,
      responsePriorityScore,
      priorityRationale,
      connectivityImpact: connectivityAssessment.impact_level,
      connectivityAssessment,
      factorScores: {
        rainfall: rainNorm !== null ? Math.round(rainNorm * 10) / 10 : null,
        slope: slopeNorm !== null ? Math.round(slopeNorm * 10) / 10 : null,
        soilMoisture: moistureNorm !== null ? Math.round(moistureNorm * 10) / 10 : null,
        history: histNorm !== null ? Math.round(histNorm * 10) / 10 : null,
        lithology: lithoNorm !== null ? Math.round(lithoNorm * 10) / 10 : null
      },
      factorContributions: {
        rainfall: factorBreakdown.find(f => f.id === 'F-RAIN')?.contributionPoints || 0,
        slope: factorBreakdown.find(f => f.id === 'F-SLOPE')?.contributionPoints || 0,
        soilMoisture: factorBreakdown.find(f => f.id === 'F-SOIL')?.contributionPoints || 0,
        history: factorBreakdown.find(f => f.id === 'F-HIST')?.contributionPoints || 0,
        lithology: factorBreakdown.find(f => f.id === 'F-LITHO')?.contributionPoints || 0
      },
      riskFactors,
      factorBreakdown,
      exposureRecord,
      recommendations,
      disclaimer: this.SCIENTIFIC_DISCLAIMER,
      provenance: 'SYNTHETIC'
    };
  }

  /**
   * Authoritative Deterministic Exposure Evaluation Engine (Phase 3)
   * 
   * Calculates normalized exposure (0–100) across 7 objective categories:
   * 1. Population (25%) -> min(100, (population / 5000) * 100)
   * 2. Settlements / Villages (15%) -> min(100, count * 33.33)
   * 3. Roads / Highways (25%) -> Arterial importance hierarchy (NH = 100, SH = 75, MDR = 50, Local = 30)
   * 4. Threatened Bridges (10%) -> River/railway bridge vulnerability
   * 5. Hospitals / PHCs (10%) -> Healthcare access criticality
   * 6. Schools / Shelters (5%) -> Educational & designated evacuation centers
   * 7. Critical Infrastructure (10%) -> Hydro, power substations, railway, pipelines, tunnels
   * 
   * Total Weight = 100% (1.00)
   * 
   * Missing Data Policy:
   * If any factor is missing/undefined/null in the zone record, it is flagged UNAVAILABLE
   * and the available factors are proportionally re-weighted to maintain exact 0–100 calibration.
   */
  public static evaluateExposure(inputs: MultiFactorRiskInputs): {
    exposureScore: number;
    exposureRecord: ExposureRecord;
  } {
    // Parse settlements
    const villages = inputs.villages_exposed ?? [];
    const isVillagesAvail = inputs.villages_exposed !== undefined;

    // Parse population
    const pop = inputs.population_exposed !== undefined && inputs.population_exposed !== null
      ? inputs.population_exposed
      : null;
    const isPopAvail = pop !== null;

    // Parse roads
    const roads = inputs.roads_affected ?? [];
    const isRoadsAvail = inputs.roads_affected !== undefined;

    // Parse bridges
    const rawFacilities = inputs.critical_facilities ?? [];
    let bridges = inputs.threatened_bridges ?? [];
    if (bridges.length === 0 && rawFacilities.length > 0) {
      bridges = rawFacilities.filter(f => /bridge|span|viaduct|culvert/i.test(f));
    }
    const isBridgesAvail = inputs.threatened_bridges !== undefined || rawFacilities.length > 0;

    // Parse hospitals / PHCs
    let hospitals = inputs.exposed_hospitals ?? [];
    if (hospitals.length === 0 && rawFacilities.length > 0) {
      hospitals = rawFacilities.filter(f => /hospital|health|phc|chc|clinic|sub-centre/i.test(f));
    }
    const isHospitalsAvail = inputs.exposed_hospitals !== undefined || rawFacilities.length > 0;

    // Parse schools / shelters
    let schools = inputs.exposed_schools ?? [];
    if (schools.length === 0 && rawFacilities.length > 0) {
      schools = rawFacilities.filter(f => /school|college|shelter|community center/i.test(f));
    }
    const isSchoolsAvail = inputs.exposed_schools !== undefined || rawFacilities.length > 0;

    // Parse critical infrastructure (excluding pure healthcare / schools)
    let infra = inputs.critical_infrastructure ?? [];
    if (infra.length === 0 && rawFacilities.length > 0) {
      infra = rawFacilities.filter(f => !/hospital|health|phc|chc|clinic|school|college/i.test(f));
    }
    const isInfraAvail = inputs.critical_infrastructure !== undefined || rawFacilities.length > 0;

    // Factor 1: Population Normalization (Weight 0.25)
    let popNorm: number | null = null;
    if (isPopAvail) {
      popNorm = Math.min(100, Math.max(0, (pop! / 5000) * 100));
    }

    // Factor 2: Settlements / Villages Normalization (Weight 0.15)
    let villNorm: number | null = null;
    if (isVillagesAvail) {
      villNorm = Math.min(100, villages.length * 33.33);
    }

    // Factor 3: Roads / Highways Normalization (Weight 0.25)
    let roadNorm: number | null = null;
    if (isRoadsAvail) {
      if (roads.some(r => /NH-|National/i.test(r))) roadNorm = 100;
      else if (roads.some(r => /SH-|State Highway|Highway|Corridor|Lifeline/i.test(r))) roadNorm = 75;
      else if (roads.some(r => /MDR|Arterial|Link/i.test(r))) roadNorm = 50;
      else if (roads.length > 0) roadNorm = 30;
      else roadNorm = 0;
    }

    // Factor 4: Bridges Normalization (Weight 0.10)
    let bridgeNorm: number | null = null;
    if (isBridgesAvail) {
      if (bridges.length >= 2 || bridges.some(b => /Major|Railway Span|Interstate/i.test(b))) bridgeNorm = 100;
      else if (bridges.length === 1) bridgeNorm = 60;
      else bridgeNorm = 0;
    }

    // Factor 5: Hospitals Normalization (Weight 0.10)
    let hospitalNorm: number | null = null;
    if (isHospitalsAvail) {
      if (hospitals.some((h: string) => /District Hospital|Civil Hospital|Major/i.test(h))) hospitalNorm = 100;
      else if (hospitals.length > 0) hospitalNorm = 60;
      else hospitalNorm = 0;
    }

    // Factor 6: Schools Normalization (Weight 0.05)
    let schoolNorm: number | null = null;
    if (isSchoolsAvail) {
      if (schools.some((s: string) => /Secondary|College|Shelter/i.test(s))) schoolNorm = 100;
      else if (schools.length > 0) schoolNorm = 60;
      else schoolNorm = 0;
    }

    // Factor 7: Critical Infrastructure Normalization (Weight 0.10)
    let infraNorm: number | null = null;
    if (isInfraAvail) {
      if (infra.some((i: string) => /Hydro|Power|Dam|Substation|Railway|Tunnel|Pipeline|Tower|Border Post/i.test(i))) infraNorm = 100;
      else if (infra.length > 0) infraNorm = 50;
      else infraNorm = 0;
    }

    // Weights
    const weights = [
      { id: 'pop', norm: popNorm, w: 0.25 },
      { id: 'vill', norm: villNorm, w: 0.15 },
      { id: 'road', norm: roadNorm, w: 0.25 },
      { id: 'bridge', norm: bridgeNorm, w: 0.10 },
      { id: 'hospital', norm: hospitalNorm, w: 0.10 },
      { id: 'school', norm: schoolNorm, w: 0.05 },
      { id: 'infra', norm: infraNorm, w: 0.10 },
    ];

    const availableWeights = weights.filter(x => x.norm !== null);
    const totalAvailWeight = availableWeights.reduce((sum, x) => sum + x.w, 0);

    let rawExposureScore = 0;
    if (totalAvailWeight > 0) {
      rawExposureScore = availableWeights.reduce((sum, x) => sum + (x.norm! * (x.w / totalAvailWeight)), 0);
    }

    const exposureScore = Math.min(100, Math.max(0, Math.round(rawExposureScore)));

    const hasNH = roads.some(r => /NH-|National/i.test(r));
    const isolationPotential = (hasNH && pop && pop > 1000) || (villages.length >= 2 && roads.length <= 1) ? 'HIGH' : villages.length > 0 ? 'MODERATE' : 'LOW';
    const lifelineImportance = hasNH || bridges.length > 0 ? 'CRITICAL' : roads.length > 0 ? 'HIGH' : 'MODERATE';

    const exposureRecord: ExposureRecord = {
      exposed_population: pop,
      exposed_villages: villages,
      vulnerable_road_segments: roads,
      threatened_bridges: bridges,
      exposed_hospitals: hospitals,
      exposed_schools: schools,
      critical_infrastructure: infra,
      critical_facilities: rawFacilities,
      isolation_potential: isolationPotential,
      lifeline_importance: lifelineImportance,
      exposure_score: exposureScore,
      exposure_breakdown: {
        population_score: popNorm !== null ? Math.round(popNorm * 10) / 10 : null,
        settlements_score: villNorm !== null ? Math.round(villNorm * 10) / 10 : null,
        roads_score: roadNorm !== null ? Math.round(roadNorm * 10) / 10 : null,
        bridges_score: bridgeNorm !== null ? Math.round(bridgeNorm * 10) / 10 : null,
        hospitals_score: hospitalNorm !== null ? Math.round(hospitalNorm * 10) / 10 : null,
        schools_score: schoolNorm !== null ? Math.round(schoolNorm * 10) / 10 : null,
        critical_infra_score: infraNorm !== null ? Math.round(infraNorm * 10) / 10 : null
      },
      provenance: 'SYNTHETIC / DEMONSTRATION DATA'
    };

    return { exposureScore, exposureRecord };
  }

  /**
   * Authoritative Deterministic Response Priority Calculation (Phase 3)
   * Formula: Response Priority Score = (Risk Score × 0.55) + (Exposure Score × 0.45)
   */
  public static calculateResponsePriority(
    riskScore: number,
    exposureScore: number,
    inputs: MultiFactorRiskInputs
  ): {
    responsePriority: ResponsePriorityLevel;
    responsePriorityScore: number;
    priorityRationale: string;
  } {
    const priorityScore = Math.min(100, Math.max(0, Math.round((riskScore * 0.55) + (exposureScore * 0.45))));

    let responsePriority: ResponsePriorityLevel = 'PRIORITY_4';
    let priorityRationale = '';

    const roads = inputs.roads_affected || [];
    const pop = inputs.population_exposed || 0;
    const primaryAsset = roads[0] || 'lifeline transport corridor';

    if (priorityScore >= 70 || (riskScore >= 75 && exposureScore >= 50)) {
      responsePriority = 'PRIORITY_1';
      priorityRationale = `Critical landslide risk (${riskScore}%) intersecting high exposure assets (Exposure: ${exposureScore}/100, Priority Score: ${priorityScore}). Urgent multi-agency emergency intervention, SDRF staging, and corridor evacuation required for ${primaryAsset}${pop > 0 ? ` (${pop.toLocaleString()} residents)` : ''}.`;
    } else if (priorityScore >= 50 || (riskScore >= 60 && exposureScore >= 35)) {
      responsePriority = 'PRIORITY_2';
      priorityRationale = `Elevated landslide risk (${riskScore}%) with active exposure (Exposure: ${exposureScore}/100, Priority Score: ${priorityScore}). Pre-positioning heavy earthmoving clearance units, hospital alert, and continuous UAV reconnaissance advised.`;
    } else if (priorityScore >= 30 || riskScore >= 40) {
      responsePriority = 'PRIORITY_3';
      priorityRationale = `Moderate risk (${riskScore}%) with monitored sector assets (Exposure: ${exposureScore}/100, Priority Score: ${priorityScore}). Enhanced road patrols, culvert and drainage clearing, and periodic telemetry verification recommended.`;
    } else {
      responsePriority = 'PRIORITY_4';
      priorityRationale = `Baseline risk (${riskScore}%) with low exposure impact (Exposure: ${exposureScore}/100, Priority Score: ${priorityScore}). Standard automated sensor heartbeat monitoring and situational logging active.`;
    }

    return {
      responsePriority,
      responsePriorityScore: priorityScore,
      priorityRationale
    };
  }

  /**
   * Deterministic Road Connectivity & Critical Infrastructure Assessment (Phase 4)
   * 
   * Maps active risk zone spatial inputs to affected road corridors, bridges, and facilities.
   * Calculates deterministic Connectivity Impact:
   * - CRITICAL: National Highway (NH) / strategic railway / arterial bridge inside or directly threatened
   * - HIGH: State Highway (SH) / major regional lifeline corridor / bridge inside or near
   * - MODERATE: Major District Road (MDR) / local service road / community facility inside or near
   * - LOW: Baseline local roads with low risk (<40%) or no threatened transport assets
   * - UNAVAILABLE: No transport or infrastructure data provided
   */
  public static assessConnectivityAndInfrastructure(
    inputs: MultiFactorRiskInputs,
    riskLevel: RiskLevel
  ): ConnectivityAssessment {
    const rawRoads = inputs.roads_affected;
    const rawBridges = inputs.threatened_bridges;
    const rawFacilities = inputs.critical_facilities;
    const rawHospitals = inputs.exposed_hospitals;
    const rawSchools = inputs.exposed_schools;
    const rawInfra = inputs.critical_infrastructure;

    // Check if data is completely absent
    const isRoadsProvided = rawRoads !== undefined;
    const isFacilitiesProvided = rawFacilities !== undefined || rawHospitals !== undefined || rawSchools !== undefined || rawInfra !== undefined;

    if (!isRoadsProvided && !isFacilitiesProvided && !rawBridges) {
      return {
        impact_level: 'UNAVAILABLE',
        impact_summary: 'Transportation and infrastructure asset telemetry UNAVAILABLE for this sector.',
        affected_roads: [],
        threatened_bridges: [],
        critical_facilities: [],
        isolation_risk: 'UNAVAILABLE'
      };
    }

    const roadsList = rawRoads || [];
    const affectedRoads: ThreatRoadAsset[] = roadsList.map((roadName, idx) => {
      let roadClass: RoadClass = 'LOCAL';
      if (/Railway|Rail Line|Track|Train|NF Rail/i.test(roadName)) roadClass = 'RAILWAY';
      else if (/NH-|National/i.test(roadName)) roadClass = 'NH';
      else if (/SH-|State Highway|Highway|Corridor|Lifeline/i.test(roadName)) roadClass = 'SH';
      else if (/MDR|Arterial|Link/i.test(roadName)) roadClass = 'MDR';

      const riskRel: AssetRiskRelationship = idx === 0 ? 'INSIDE' : 'NEAR';
      
      let status: RoadConnectivityStatus = 'OPEN_MONITORING';
      let statusLabel = 'Open / Routine Monitoring';

      if (riskLevel === 'CRITICAL') {
        status = 'POTENTIAL_DISRUPTION';
        statusLabel = 'Potential Connectivity Disruption — Priority Corridor Watch';
      } else if (riskLevel === 'HIGH') {
        status = 'AT_RISK';
        statusLabel = 'At Risk — Preventive Patrol Active';
      } else if (riskLevel === 'MODERATE') {
        status = 'OPEN_MONITORING';
        statusLabel = 'Open — Monitored Catchment Sector';
      }

      return {
        id: `ROAD-${idx + 1}`,
        name: roadName,
        road_class: roadClass,
        risk_relationship: riskRel,
        connectivity_status: status,
        status_label: statusLabel
      };
    });

    // Bridges
    let bridgeNames: string[] = rawBridges || [];
    if (bridgeNames.length === 0 && rawFacilities && rawFacilities.length > 0) {
      bridgeNames = rawFacilities.filter(f => /bridge|span|viaduct|culvert/i.test(f));
    }
    const threatenedBridges: ThreatBridgeAsset[] = bridgeNames.map((bName, idx) => {
      const parentRoad = roadsList[0] || 'Lifeline Road Sector';
      return {
        id: `BRG-${idx + 1}`,
        name: bName,
        carrying_road: parentRoad,
        risk_relationship: idx === 0 ? 'INSIDE' : 'NEAR',
        status: riskLevel === 'CRITICAL' || riskLevel === 'HIGH' 
          ? 'At Risk — Verification Required' 
          : 'Operational / Monitoring',
        provenance: 'SYNTHETIC / DEMONSTRATION DATA'
      };
    });

    // Critical Facilities
    const facilitiesList: ThreatCriticalFacility[] = [];
    const allFacilityStrings = [
      ...(rawFacilities || []),
      ...(rawHospitals || []),
      ...(rawSchools || []),
      ...(rawInfra || [])
    ];
    // Unique facility names
    const uniqueFacilities = Array.from(new Set(allFacilityStrings));

    uniqueFacilities.forEach((fName, idx) => {
      let category: ThreatCriticalFacility['category'] = 'OTHER';
      if (/hospital|health|phc|chc|clinic|sub-centre/i.test(fName)) category = 'HOSPITAL';
      else if (/school|college|shelter|community center/i.test(fName)) category = 'SCHOOL';
      else if (/hydro|dam|powerhouse/i.test(fName)) category = 'HYDRO';
      else if (/substation|power|electric/i.test(fName)) category = 'POWER';
      else if (/railway|station|track|traction/i.test(fName)) category = 'RAILWAY';
      else if (/water|pipeline|intake/i.test(fName)) category = 'WATER';
      else if (/defense|border post|bro/i.test(fName)) category = 'DEFENSE';

      facilitiesList.push({
        id: `FAC-${idx + 1}`,
        name: fName,
        category,
        risk_relationship: idx === 0 ? 'INSIDE' : 'NEAR',
        status: riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
          ? 'AT RISK — FIELD VERIFICATION REQUIRED'
          : 'OPERATIONAL / STANDARD LOGGING',
        provenance: 'SYNTHETIC / DEMONSTRATION DATA'
      });
    });

    // Deterministic Connectivity Impact Level Rule
    let impactLevel: ConnectivityImpactLevel = 'LOW';
    let impactSummary = '';

    const hasNHInside = affectedRoads.some(r => r.road_class === 'NH' && (r.risk_relationship === 'INSIDE' || r.risk_relationship === 'NEAR'));
    const hasSHInside = affectedRoads.some(r => r.road_class === 'SH');
    const hasMajorBridge = threatenedBridges.length > 0;
    const hasRail = affectedRoads.some(r => r.road_class === 'RAILWAY') || facilitiesList.some(f => f.category === 'RAILWAY');

    if ((hasNHInside || (hasSHInside && hasMajorBridge) || hasRail) && (riskLevel === 'CRITICAL' || riskLevel === 'HIGH')) {
      impactLevel = 'CRITICAL';
      impactSummary = `Critical arterial connectivity impact: National Highway (${affectedRoads[0]?.name || 'Lifeline'}) or rail link intersects high hazard zone. Potential isolation of regional transport corridor.`;
    } else if ((hasSHInside || hasMajorBridge || affectedRoads.length >= 2) && riskLevel !== 'LOW') {
      impactLevel = 'HIGH';
      impactSummary = `High connectivity impact: State Highway or strategic bridge threatened. Pre-positioning of clearance units and alternative route inspection recommended.`;
    } else if (affectedRoads.length > 0 && riskLevel !== 'LOW') {
      impactLevel = 'MODERATE';
      impactSummary = `Moderate connectivity impact: Local district connecting roads monitored for localized cut-slope blockages.`;
    } else if (affectedRoads.length === 0 && facilitiesList.length === 0) {
      impactLevel = 'LOW';
      impactSummary = `Low connectivity impact: No major transportation lifelines in direct hazard zone envelope.`;
    } else {
      impactLevel = 'LOW';
      impactSummary = `Baseline risk across monitored infrastructure assets.`;
    }

    const pop = inputs.population_exposed || 0;
    const isolationRisk = (impactLevel === 'CRITICAL' && pop > 1000) ? 'CRITICAL' : impactLevel === 'CRITICAL' || impactLevel === 'HIGH' ? 'HIGH' : impactLevel === 'MODERATE' ? 'MODERATE' : 'LOW';

    return {
      impact_level: impactLevel,
      impact_summary: impactSummary,
      affected_roads: affectedRoads,
      threatened_bridges: threatenedBridges,
      critical_facilities: facilitiesList,
      isolation_risk: isolationRisk
    };
  }

  private static generateRecommendations(
    inputs: MultiFactorRiskInputs,
    level: RiskLevel,
    priority: ResponsePriorityLevel,
    isAssam: boolean
  ): ResponseRecommendation[] {
    const recs: ResponseRecommendation[] = [];

    if (priority === 'PRIORITY_1' || level === 'CRITICAL') {
      recs.push({
        id: 'REC-01',
        action: 'Immediate Field Verification & Drone Reconnaissance',
        rationale: 'Confirm ground crack extension and colluvial toe displacement before executing escalation SOP.',
        urgency: 'IMMEDIATE',
        target_authority: 'DDMA'
      });

      recs.push({
        id: 'REC-02',
        action: 'Candidate Alternate Route Assessment',
        rationale: isAssam
          ? 'Candidate alternate bypass identified: Haflong → Jatinga Ridge → Lumding Link Corridor.'
          : 'Candidate alternate bypass identified: Singtam → Martam Ridge → Pakyong / NH-717A Corridor.',
        urgency: 'IMMEDIATE',
        target_authority: 'BRO_PWD',
        is_candidate_route: true,
        candidate_route_name: isAssam ? 'Jatinga - Lumding Bypass (NH-27 Alternate)' : 'NH-717A Pakyong - Lava Bypass',
        candidate_route_details: isAssam
          ? 'Route Distance: 34.2 km. Clearance Unit: SDRF Haflong Base. Shelter: Jatinga Community Center.'
          : 'Route Distance: 28.4 km. Clearance Unit: BRO Mile 14 Post. Shelter: Singtam Senior Secondary School.'
      });

      recs.push({
        id: 'REC-03',
        action: 'Pre-position Heavy Earthmoving Clearance Machinery',
        rationale: 'Stage bulldozers and excavators at primary corridor checkpoints to rapidly restore connectivity upon rockfall.',
        urgency: 'HIGH',
        target_authority: 'BRO_PWD'
      });

      recs.push({
        id: 'REC-04',
        action: 'Pre-Evacuation Advisory Coordination for Exposed Hamlets',
        rationale: `Coordinate with village heads in ${(inputs.villages_exposed || []).slice(0, 2).join(' & ') || 'exposed sectors'} to prepare designated community shelters.`,
        urgency: 'HIGH',
        target_authority: 'SDMA'
      });
    } else if (priority === 'PRIORITY_2' || level === 'HIGH') {
      recs.push({
        id: 'REC-01',
        action: 'Road Inspection & Culvert Drainage Clearing',
        rationale: 'Inspect toe culverts along highway slopes to prevent hydrostatic pore pressure buildup.',
        urgency: 'HIGH',
        target_authority: 'BRO_PWD'
      });
      recs.push({
        id: 'REC-02',
        action: 'Continuous Doppler Radar & In-Situ Moisture Tracking',
        rationale: 'Monitor 15-minute precipitation hyetographs for threshold crossing (>30 mm/hr).',
        urgency: 'PREPAREDNESS',
        target_authority: 'DDMA'
      });
    } else {
      recs.push({
        id: 'REC-01',
        action: 'Standard Sensor Telemetry & Telecommunication Log',
        rationale: 'Maintain baseline monitoring of slope pore pressure and telemetry heartbeat.',
        urgency: 'ROUTINE',
        target_authority: 'LOCAL_ADMIN'
      });
    }

    return recs;
  }

  /**
   * PHASE 7: Evaluates dynamic risk and derived priority across normalized forecast timesteps.
   * STRICT COMPLIANCE:
   * - Single calculation path: Uses existing Phase-2/5 InterpretableRiskEngine.evaluateRisk
   * - Invariant Exposure: Preserves Phase-3 Exposure Score (Sikkim = 69, Assam = 80)
   * - Invariant Priority: Derives Phase-3 Response Priority dynamically from forecast risk and exposure
   * - Supports nullable / 'UNAVAILABLE' fields without fabricating default scores
   */
  public static evaluateForecastTimesteps(
    timesteps: NormalizedForecastTimestep[],
    aoiInputs: MultiFactorRiskInputs
  ): EvaluatedForecastTimestep[] {
    return timesteps.map(step => {
      // If unavailable or rainfall is missing and other inputs cannot run
      if (
        step.availability === 'UNAVAILABLE' ||
        (step.rainfallIntensityMmHr === null && step.rolling72hAccumulationMm === null && aoiInputs.slope_deg === undefined)
      ) {
        return {
          ...step,
          forecastRainfallScore: null,
          forecastRiskScore: null,
          forecastRiskLevel: 'UNAVAILABLE' as const,
          forecastExposureScore: null,
          forecastPriority: 'UNAVAILABLE' as const
        };
      }

      // Dynamic risk calculation using existing Phase-2/5 engine
      const evalInputs: MultiFactorRiskInputs = {
        ...aoiInputs,
        rainfall_1h_mm: step.rainfallIntensityMmHr ?? undefined,
        rainfall_72h_mm: step.rolling72hAccumulationMm ?? undefined,
        time_offset_min: 0 // No synthetic multiplier, using real forecast rainfall
      };

      const out = this.evaluateRisk(evalInputs);

      return {
        ...step,
        forecastRainfallScore: out.factorScores.rainfall,
        forecastRiskScore: out.riskScore,
        forecastRiskLevel: out.riskLevel,
        forecastExposureScore: out.exposureScore,
        forecastPriority: out.responsePriority,
        factorContributions: out.factorContributions
      };
    });
  }
}


function villagesSummary(villages: string[] = []): string {
  if (villages.length === 0) return 'settlements in impact radius';
  if (villages.length === 1) return villages[0];
  return `${villages[0]} and ${villages.length - 1} other settlement${villages.length > 2 ? 's' : ''}`;
}
