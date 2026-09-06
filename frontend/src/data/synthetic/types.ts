// TypeScript Type Definitions for 3D Earth Synthetic Geospatial Data System

export type NERegionCode =
  | 'SIKKIM'
  | 'ASSAM'
  | 'ARUNACHAL_PRADESH'
  | 'MEGHALAYA'
  | 'MANIPUR'
  | 'MIZORAM'
  | 'NAGALAND'
  | 'TRIPURA';

export type RoadClassification = 'NATIONAL_HIGHWAY' | 'STATE_HIGHWAY' | 'MAJOR_ROAD' | 'LOCAL_ROAD';

export type BuildingType =
  | 'RESIDENTIAL'
  | 'COMMERCIAL'
  | 'HOSPITAL'
  | 'SCHOOL'
  | 'GOVERNMENT'
  | 'EMERGENCY_FACILITY';

export type HazardRiskLevel = 'CRITICAL' | 'WARNING' | 'BASELINE';

export interface SyntheticGeoPoint {
  lng: number;
  lat: number;
  elev?: number;
}

export interface SyntheticDistrict {
  id: string;
  name: string;
  headquarters: string;
  lat: number;
  lng: number;
  elevation_m: number;
  population: number;
  vulnerability_score: number;
}

export interface SyntheticTown {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  elevation_m: number;
  population: number;
  risk_level: HazardRiskLevel;
}

export interface SyntheticStateData {
  region_code: NERegionCode;
  state_name: string;
  capital: string;
  bounds: number[]; // [minLng, minLat, maxLng, maxLat]
  center: [number, number]; // [lng, lat]
  elevation_range_m: [number, number];
  primary_river_system: string;
  districts: SyntheticDistrict[];
  towns: SyntheticTown[];
  critical_corridors: string[];
}

export interface SyntheticRoadFeature {
  id: string;
  name: string;
  road_class: RoadClassification;
  coordinates: number[][]; // [[lng, lat, elev], ...]
  length_km: number;
  is_blocked: boolean;
  blockage_reason?: string;
  alternate_route_id?: string;
}

export interface SyntheticBuildingFeature {
  id: string;
  name: string;
  type: BuildingType;
  footprint: number[][]; // [[lng, lat], ...]
  center: [number, number];
  height_m: number;
  floors: number;
  roof_material: 'slate' | 'terracotta' | 'corrugated_sheet' | 'reinforced_concrete' | 'pine_green';
  wall_color: string;
  population_estimate: number;
  is_in_hazard_zone: boolean;
  hazard_exposure_level: HazardRiskLevel;
}

export interface SyntheticRiverFeature {
  id: string;
  name: string;
  type: 'MAIN_STEM' | 'TRIBUTARY' | 'STREAM';
  width_m: number;
  flow_speed_m_s: number;
  coordinates: number[][];
  danger_level_m: number;
  current_level_m: number;
}

export interface SyntheticBridgeFeature {
  id: string;
  name: string;
  bridge_type: 'SUSPENSION' | 'BAILEY' | 'CONCRETE_BEAM' | 'HYDRO_DAM_CROSSING';
  location: [number, number];
  spanned_river: string;
  carrying_road: string;
  structural_health_pct: number;
  is_operational: boolean;
}

export interface SyntheticInfrastructureFeature {
  id: string;
  name: string;
  category: 'HOSPITAL' | 'SHELTER' | 'POWER_PLANT' | 'DEFENSE_BASE' | 'TELECOM_TOWER' | 'HELIPAD';
  location: [number, number];
  elevation_m: number;
  capacity?: number;
  status: 'OPERATIONAL' | 'STANDBY' | 'EXPOSED' | 'ISOLATED';
  description: string;
}

export interface SyntheticCausesPack {
  hazard_type: 'LANDSLIDE' | 'FLOOD' | 'EARTHQUAKE';
  symptoms: Array<{
    id: string;
    label: string;
    description: string;
    severity_weight: number;
  }>;
  causes: Array<{
    id: string;
    label: string;
    description: string;
    category: 'GEOLOGY' | 'METEOROLOGY' | 'HYDROLOGY' | 'ANTHROPOGENIC';
    weight: number;
  }>;
  thresholds: {
    rainfall_1h_mm_critical: number;
    rainfall_24h_mm_critical: number;
    soil_moisture_pct_critical: number;
    slope_angle_deg_critical: number;
    insar_displacement_mm_critical: number;
    river_stage_rise_m_critical: number;
  };
}

export interface SyntheticHazardZone {
  id: string;
  name: string;
  hazard_type: 'LANDSLIDE' | 'FLOOD' | 'DEBRIS_FLOW';
  risk_level: HazardRiskLevel;
  risk_probability: number;
  polygon: number[][]; // [[lng, lat], ...]
  center: [number, number];
  trigger_symptoms: string[];
  primary_causes: string[];
  impact_summary: {
    exposed_population: number;
    affected_buildings: string[];
    affected_roads: string[];
    threatened_bridges: string[];
  };
}

export interface SyntheticFieldReport {
  id: string;
  location: string;
  gps: [number, number];
  timestamp: string;
  hazard_type: string;
  severity: 'CRITICAL' | 'WARNING' | 'ADVISORY';
  verification_status: 'PREDICTED' | 'FIELD REPORTED' | 'FIELD VERIFIED';
  observer: string;
  evidence_type: 'PHOTO' | 'DRONE_VIDEO' | 'GROUND_SENSOR';
  notes: string;
}

export interface SyntheticSimulationState {
  time_offset_min: number; // 0, 30, 60, 120, 180
  rainfall_intensity_mm_hr: number;
  soil_moisture_pct: number;
  teesta_river_level_m: number;
  overall_landslide_risk_pct: number;
  is_nh10_blocked: boolean;
  blocked_section_name: string;
  alternate_route_active: boolean;
  isolated_settlements: string[];
  active_hazard_zones: SyntheticHazardZone[];
  contributing_factors: Array<{ factor: string; percentage: number; color: string }>;
}
