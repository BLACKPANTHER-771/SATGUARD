// Synthetic Geospatial Risk & Simulation Engine for 3D Earth Dashboard
// Strictly self-contained within src/data/synthetic/

import landslideCauses from '../causes-pack/landslide-causes.json';
import floodCauses from '../causes-pack/flood-causes.json';
import sikkimData from '../northeast/sikkim.json';
import assamData from '../northeast/assam.json';
import arunachalData from '../northeast/arunachal_pradesh.json';
import meghalayaData from '../northeast/meghalaya.json';
import manipurData from '../northeast/manipur.json';
import mizoramData from '../northeast/mizoram.json';
import nagalandData from '../northeast/nagaland.json';
import tripuraData from '../northeast/tripura.json';

import roadsGeoJSON from '../environment/roads.json';
import buildingsGeoJSON from '../environment/buildings.json';
import riversGeoJSON from '../environment/rivers.json';
import bridgesGeoJSON from '../environment/bridges.json';
import infrastructureGeoJSON from '../environment/infrastructure.json';
import landslideZonesGeoJSON from '../hazards/landslide-zones.json';
import floodZonesGeoJSON from '../hazards/flood-zones.json';

import liveIncidentsData from '../events/live-incidents.json';
import fieldReportsData from '../events/field-reports.json';

import {
  NERegionCode,
  SyntheticStateData,
  SyntheticSimulationState,
  SyntheticHazardZone
} from '../types';

export class SyntheticRiskEngine {
  private static statesMap: Record<NERegionCode, SyntheticStateData> = {
    SIKKIM: sikkimData as any,
    ASSAM: assamData as any,
    ARUNACHAL_PRADESH: arunachalData as any,
    MEGHALAYA: meghalayaData as any,
    MANIPUR: manipurData as any,
    MIZORAM: mizoramData as any,
    NAGALAND: nagalandData as any,
    TRIPURA: tripuraData as any
  };

  public static getStateData(region: NERegionCode): SyntheticStateData {
    return this.statesMap[region] || (sikkimData as any);
  }

  public static getAllStates(): SyntheticStateData[] {
    return Object.values(this.statesMap);
  }

  public static getEnvironmentLayers() {
    return {
      roads: roadsGeoJSON,
      buildings: buildingsGeoJSON,
      rivers: riversGeoJSON,
      bridges: bridgesGeoJSON,
      infrastructure: infrastructureGeoJSON,
      landslideZones: landslideZonesGeoJSON,
      floodZones: floodZonesGeoJSON
    };
  }

  public static getCausesPack() {
    return {
      landslide: landslideCauses,
      flood: floodCauses
    };
  }

  public static getEvents() {
    return {
      liveIncidents: liveIncidentsData,
      fieldReports: fieldReportsData
    };
  }

  /**
   * Transparent Rule-Based Landslide & Flood Simulation Engine
   * Evaluates environmental thresholds from causes-pack to compute risk, impact & alternate routing.
   */
  public static calculateSimulationState(timeOffsetMinutes: number, region: NERegionCode = 'SIKKIM'): SyntheticSimulationState {
    const mults: Record<number, number> = { 0: 1.0, 30: 1.15, 60: 1.32, 120: 1.48, 180: 1.08 };
    const mult = mults[timeOffsetMinutes] || 1.0;

    const isAssam = region === 'ASSAM';
    const baseRainfall = isAssam ? 24.7 : 38.4;
    const baseSoilMoisture = isAssam ? 89.0 : 81.0;
    const baseRiverLevel = isAssam ? 54.2 : 353.4;

    const currentRainfall = Math.round(baseRainfall * mult * 10) / 10;
    const currentSoilMoisture = Math.min(Math.round(baseSoilMoisture + timeOffsetMinutes * 0.08), 96);
    const currentRiverLevel = Math.round((baseRiverLevel + (timeOffsetMinutes / 60) * 0.45) * 10) / 10;

    // Rule-based Landslide Probability calculation
    const rainfallFactor = Math.min(currentRainfall / landslideCauses.thresholds.rainfall_1h_mm_critical, 1.4) * landslideCauses.weights.rainfall;
    const slopeFactor = ((isAssam ? 36.2 : 44.5) / 45.0) * landslideCauses.weights.slope;
    const moistureFactor = (currentSoilMoisture / 100.0) * landslideCauses.weights.soil_moisture;
    const geoFactor = landslideCauses.weights.lithology_jointing + landslideCauses.weights.historical_freq;

    const calculatedRiskPct = Math.min(Math.round((rainfallFactor + slopeFactor + moistureFactor + geoFactor) * 100), 98);
    const isCritical = calculatedRiskPct >= 75;

    // Road blockage evaluation
    const isBlocked = isCritical;
    const blockedSectionName = isBlocked
      ? (isAssam ? 'NH-27 East-West Corridor (Haflong Ghat KM 84) — Active Slope Failure' : 'NH-10 Milestone 14 (KM 19.4) — Active Colluvial Slump')
      : '';

    const matchingZones = (landslideZonesGeoJSON.features as any[]).filter(f => {
      if (isAssam) return f.properties.id.includes('ASM');
      return !f.properties.id.includes('ASM');
    });

    const activeZones: SyntheticHazardZone[] = (matchingZones.length > 0 ? matchingZones : landslideZonesGeoJSON.features as any[]).map(f => ({
      id: f.properties.id,
      name: f.properties.name,
      hazard_type: f.properties.hazard_type,
      risk_level: calculatedRiskPct >= 75 ? 'CRITICAL' : 'WARNING',
      risk_probability: calculatedRiskPct / 100,
      polygon: f.geometry.coordinates[0],
      center: isAssam ? [93.020, 25.170] : [88.535, 27.398],
      trigger_symptoms: isAssam
        ? ['Monsoon Orographic Downpour (24.7 mm/hr)', 'Volumetric Soil Saturation (89%)', 'InSAR LOS Shift (+14.2 mm)']
        : ['Intense Convective Rain (38.4 mm/hr)', 'Volumetric Soil Saturation (81%)', 'InSAR Deformation (+18.4 mm)'],
      primary_causes: isAssam
        ? ['Disang Shale Saturation', 'Steep Haflong Escarpment (36.2°)', 'Toe Cutting at NH-27']
        : ['Steep Escarpment (>44°)', 'Weak Daling Phyllites', 'Toe Excavation at NH-10'],
      impact_summary: {
        exposed_population: f.properties.exposed_population || (isAssam ? 6200 : 1420),
        affected_buildings: f.properties.affected_buildings || [],
        affected_roads: f.properties.affected_roads || [],
        threatened_bridges: f.properties.threatened_bridges || []
      }
    }));

    return {
      time_offset_min: timeOffsetMinutes,
      rainfall_intensity_mm_hr: currentRainfall,
      soil_moisture_pct: currentSoilMoisture,
      teesta_river_level_m: currentRiverLevel,
      overall_landslide_risk_pct: calculatedRiskPct,
      is_nh10_blocked: isBlocked,
      blocked_section_name: blockedSectionName,
      alternate_route_active: isBlocked,
      isolated_settlements: isBlocked
        ? (isAssam ? ['Haflong Lower Ghat', 'Jatinga Track Settlement'] : ['Dikchu Lower (Milestone 14 Hamlet)', 'Upper Dikchu Shophouses'])
        : [],
      active_hazard_zones: activeZones,
      contributing_factors: isAssam
        ? [
            { factor: 'Disang Shale Pore Pressure', percentage: 36, color: '#C95050' },
            { factor: 'Rainfall Saturation (24.7 mm/hr)', percentage: 32, color: '#397FA8' },
            { factor: 'Soil Moisture Antecedent (89%)', percentage: 18, color: '#C58A24' },
            { factor: 'Haflong Escarpment Gradient (36.2°)', percentage: 9, color: '#587A68' },
            { factor: 'Historical Seismic Lineament', percentage: 5, color: '#667579' }
          ]
        : [
            { factor: 'Rainfall Saturation Trigger', percentage: 38, color: '#397FA8' },
            { factor: 'Steep Escarpment Topography (44.8°)', percentage: 29, color: '#C95050' },
            { factor: 'Soil Moisture Antecedent State (81%)', percentage: 18, color: '#C58A24' },
            { factor: 'Historical Slope Vulnerability', percentage: 9, color: '#587A68' },
            { factor: 'Phyllite Lithology & Jointing', percentage: 6, color: '#667579' }
          ]
    };
  }
}
