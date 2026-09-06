import { AUTHORITATIVE_AOIS, AUTHORITATIVE_STATES, getAuthoritativeAOI, getPrimaryAOIForState, getAOIsForState } from '../frontend/src/data/command-centre/aoiRegistry.ts';
import { REGIONAL_CAMERA_PRESETS } from '../frontend/src/data/command-centre/regionHierarchy.ts';
import { InterpretableRiskEngine } from '../frontend/src/services/riskEngine.ts';

console.log('================================================================');
console.log('EPOCH PHASE 6: GEOSPATIAL TRUTH + CROSS-VIEW SYNCHRONIZATION TEST');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
  passedTests++;
  console.log(`✓ PASS: ${message}`);
}

// -------------------------------------------------------------------------
// TEST 1: Authoritative AOI Registry Schema & Scope (Metadata Only)
// -------------------------------------------------------------------------
console.log('--- TEST 1: Authoritative AOI Registry Schema & Scope ---');
const sikkimAOI = AUTHORITATIVE_AOIS['sikkim-nh10-dikchu'];
const assamAOI = AUTHORITATIVE_AOIS['assam-dima-hasao-haflong'];

assert(sikkimAOI !== undefined, 'Sikkim Dikchu-Singtam AOI registered');
assert(assamAOI !== undefined, 'Assam Haflong Ghat AOI registered');

// Verify NO calculated risk/exposure/priority values exist in registry
assert(sikkimAOI.riskScore === undefined, 'Sikkim registry contains no hardcoded riskScore');
assert(sikkimAOI.exposureScore === undefined, 'Sikkim registry contains no hardcoded exposureScore');
assert(sikkimAOI.responsePriority === undefined, 'Sikkim registry contains no hardcoded responsePriority');
assert(assamAOI.riskScore === undefined, 'Assam registry contains no hardcoded riskScore');
assert(assamAOI.exposureScore === undefined, 'Assam registry contains no hardcoded exposureScore');
assert(assamAOI.responsePriority === undefined, 'Assam registry contains no hardcoded responsePriority');

// -------------------------------------------------------------------------
// TEST 2: Authoritative Coordinates Verification
// -------------------------------------------------------------------------
console.log('\n--- TEST 2: Authoritative Coordinates Verification ---');
assert(sikkimAOI.lat === 27.398 && sikkimAOI.lng === 88.535, 'Sikkim Dikchu coordinates: 27.398° N, 88.535° E');
assert(sikkimAOI.elevation_m === 850, 'Sikkim Dikchu elevation: 850 m');
assert(assamAOI.lat === 25.1764 && assamAOI.lng === 93.0238, 'Assam Haflong coordinates: 25.1764° N, 93.0238° E');
assert(assamAOI.elevation_m === 680, 'Assam Haflong elevation: 680 m');

// -------------------------------------------------------------------------
// TEST 3: 3D Earth Camera Presets Verification (Haflong vs Guwahati)
// -------------------------------------------------------------------------
console.log('\n--- TEST 3: 3D Earth Camera Presets Verification ---');
const assamCameraPreset = assamAOI.cameraPreset;
assert(assamCameraPreset.lat === 25.1764 && assamCameraPreset.lng === 93.0238, 'Assam AOI camera preset is centered on Haflong Ghat (25.1764, 93.0238)');
assert(assamCameraPreset.lat !== 26.1445 && assamCameraPreset.lng !== 91.7362, 'Assam AOI camera preset is NOT centered on Guwahati (26.1445, 91.7362)');

const regionHierarchyAssam = REGIONAL_CAMERA_PRESETS['assam-dima-hasao-haflong'];
assert(regionHierarchyAssam.lat === 25.1764 && regionHierarchyAssam.lng === 93.0238, 'Regional camera hierarchy has Haflong Ghat at 25.1764, 93.0238');

const sikkimCameraPreset = sikkimAOI.cameraPreset;
assert(sikkimCameraPreset.lat === 27.398 && sikkimCameraPreset.lng === 88.535, 'Sikkim AOI camera preset is centered on Dikchu (27.398, 88.535)');

// -------------------------------------------------------------------------
// TEST 4: Associated Infrastructure & Assets Integrity
// -------------------------------------------------------------------------
console.log('\n--- TEST 4: Associated Infrastructure & Assets Integrity ---');
assert(sikkimAOI.associatedAssets.totalPopulationExposed === 1420, 'Sikkim exposed population equals 1,420');
assert(sikkimAOI.associatedAssets.roads.some(r => r.code === 'NH-10'), 'Sikkim associated road includes NH-10');
assert(sikkimAOI.associatedAssets.bridges.some(b => b.name === 'Dikchu River Bridge'), 'Sikkim associated bridge includes Dikchu River Bridge');
assert(sikkimAOI.associatedAssets.facilities.some(f => f.name.includes('Singtam Hydro')), 'Sikkim associated facility includes Singtam Hydro');

assert(assamAOI.associatedAssets.totalPopulationExposed === 2100, 'Assam exposed population equals 2,100');
assert(assamAOI.associatedAssets.roads.some(r => r.code === 'NH-27'), 'Assam associated road includes NH-27');
assert(assamAOI.associatedAssets.bridges.some(b => b.name.includes('Diyung River')), 'Assam associated bridge includes Diyung River Railway Span');
assert(assamAOI.associatedAssets.facilities.some(f => f.name.includes('Haflong Civil Hospital')), 'Assam associated facility includes Haflong Civil Hospital');

// -------------------------------------------------------------------------
// TEST 5: Dynamic Risk, Exposure & Priority Derivation (Phase 2, 3, 5 Engines)
// -------------------------------------------------------------------------
console.log('\n--- TEST 5: Dynamic Risk & Exposure Engine Execution ---');

// Evaluate Sikkim via InterpretableRiskEngine
const sikkimEval = InterpretableRiskEngine.evaluateRisk({
  zoneId: sikkimAOI.id,
  zoneName: sikkimAOI.name,
  state: sikkimAOI.state,
  district: sikkimAOI.district,
  lat: sikkimAOI.lat,
  lng: sikkimAOI.lng,
  elevation_m: sikkimAOI.elevation_m,
  slope_deg: sikkimAOI.geotechnicalInputs.slope_deg,
  soil_moisture_pct: sikkimAOI.geotechnicalInputs.soil_moisture_pct,
  historical_events_5y: sikkimAOI.geotechnicalInputs.historical_events_5y,
  lithology: sikkimAOI.geotechnicalInputs.lithology,
  soil_type: sikkimAOI.geotechnicalInputs.soil_type,
  population_exposed: sikkimAOI.associatedAssets.totalPopulationExposed,
  villages_exposed: sikkimAOI.associatedAssets.settlements.map(s => s.name),
  roads_affected: sikkimAOI.associatedAssets.roads.map(r => r.name),
  critical_facilities: sikkimAOI.associatedAssets.facilities.map(f => f.name),
  threatened_bridges: sikkimAOI.associatedAssets.bridges.map(b => b.name),
  rainfall_1h_mm: 38.4,
  rainfall_72h_mm: 265.0,
  rainfall_source: 'LIVE'
});

console.log(`Sikkim Evaluated: Risk = ${sikkimEval.riskScore}%, Exposure = ${sikkimEval.exposureScore}, Priority = ${sikkimEval.responsePriority}`);
assert(sikkimEval.exposureScore === 69, 'Sikkim exposure score is dynamically evaluated to exactly 69');
assert(sikkimEval.responsePriority === 'PRIORITY_1', 'Sikkim response priority is dynamically evaluated to PRIORITY_1');

// Evaluate Assam via InterpretableRiskEngine with Telemetry Rain
const assamEvalLive = InterpretableRiskEngine.evaluateRisk({
  zoneId: assamAOI.id,
  zoneName: assamAOI.name,
  state: assamAOI.state,
  district: assamAOI.district,
  lat: assamAOI.lat,
  lng: assamAOI.lng,
  elevation_m: assamAOI.elevation_m,
  slope_deg: assamAOI.geotechnicalInputs.slope_deg,
  soil_moisture_pct: assamAOI.geotechnicalInputs.soil_moisture_pct,
  historical_events_5y: assamAOI.geotechnicalInputs.historical_events_5y,
  lithology: assamAOI.geotechnicalInputs.lithology,
  soil_type: assamAOI.geotechnicalInputs.soil_type,
  population_exposed: assamAOI.associatedAssets.totalPopulationExposed,
  villages_exposed: assamAOI.associatedAssets.settlements.map(s => s.name),
  roads_affected: assamAOI.associatedAssets.roads.map(r => r.name),
  critical_facilities: assamAOI.associatedAssets.facilities.map(f => f.name),
  threatened_bridges: assamAOI.associatedAssets.bridges.map(b => b.name),
  rainfall_1h_mm: 24.7,
  rainfall_72h_mm: 142.0,
  rainfall_source: 'LIVE'
});

console.log(`Assam Live Evaluated: Risk = ${assamEvalLive.riskScore}%, Exposure = ${assamEvalLive.exposureScore}, Priority = ${assamEvalLive.responsePriority}`);
assert(assamEvalLive.exposureScore === 80, 'Assam exposure score is dynamically evaluated to exactly 80');
assert(assamEvalLive.riskScore === 88, 'Assam telemetry risk score is dynamically evaluated to 88%');
assert(assamEvalLive.responsePriority === 'PRIORITY_1', 'Assam live response priority is dynamically evaluated to PRIORITY_1');

// -------------------------------------------------------------------------
// TEST 6: Tracing Assam Discrepancy (51–59 vs 88 vs 92)
// -------------------------------------------------------------------------
console.log('\n--- TEST 6: Tracing Assam Rainfall-Linked Discrepancy ---');
const assamEvalLowRain = InterpretableRiskEngine.evaluateRisk({
  zoneId: assamAOI.id,
  zoneName: assamAOI.name,
  state: assamAOI.state,
  district: assamAOI.district,
  lat: assamAOI.lat,
  lng: assamAOI.lng,
  slope_deg: assamAOI.geotechnicalInputs.slope_deg,
  soil_moisture_pct: assamAOI.geotechnicalInputs.soil_moisture_pct,
  historical_events_5y: assamAOI.geotechnicalInputs.historical_events_5y,
  lithology: assamAOI.geotechnicalInputs.lithology,
  population_exposed: assamAOI.associatedAssets.totalPopulationExposed,
  villages_exposed: assamAOI.associatedAssets.settlements.map(s => s.name),
  roads_affected: assamAOI.associatedAssets.roads.map(r => r.name),
  critical_facilities: assamAOI.associatedAssets.facilities.map(f => f.name),
  threatened_bridges: assamAOI.associatedAssets.bridges.map(b => b.name),
  rainfall_1h_mm: 5.0,
  rainfall_72h_mm: 25.0,
  rainfall_source: 'LIVE'
});
console.log(`Assam Low Rain (5 mm/hr, 25 mm 72h): Risk = ${assamEvalLowRain.riskScore}% (${assamEvalLowRain.riskLevel}), Priority = ${assamEvalLowRain.responsePriority}`);
assert(assamEvalLowRain.riskScore <= 60, 'Low rain properly reduces risk to MODERATE tier');
assert(assamEvalLowRain.exposureScore === 80, 'Assam exposure remains unchanged at 80 under low rain');

const assamEvalDeluge = InterpretableRiskEngine.evaluateRisk({
  zoneId: assamAOI.id,
  zoneName: assamAOI.name,
  state: assamAOI.state,
  district: assamAOI.district,
  lat: assamAOI.lat,
  lng: assamAOI.lng,
  slope_deg: assamAOI.geotechnicalInputs.slope_deg,
  soil_moisture_pct: assamAOI.geotechnicalInputs.soil_moisture_pct,
  historical_events_5y: assamAOI.geotechnicalInputs.historical_events_5y,
  lithology: assamAOI.geotechnicalInputs.lithology,
  population_exposed: assamAOI.associatedAssets.totalPopulationExposed,
  villages_exposed: assamAOI.associatedAssets.settlements.map(s => s.name),
  roads_affected: assamAOI.associatedAssets.roads.map(r => r.name),
  critical_facilities: assamAOI.associatedAssets.facilities.map(f => f.name),
  threatened_bridges: assamAOI.associatedAssets.bridges.map(b => b.name),
  rainfall_1h_mm: 42.0,
  rainfall_72h_mm: 310.0,
  rainfall_source: 'LIVE'
});
console.log(`Assam Monsoon Deluge (42 mm/hr, 310 mm 72h): Risk = ${assamEvalDeluge.riskScore}% (${assamEvalDeluge.riskLevel}), Priority = ${assamEvalDeluge.responsePriority}`);
assert(assamEvalDeluge.riskScore >= 88, 'Monsoon deluge properly escalates risk to CRITICAL tier (88–92%)');
assert(assamEvalDeluge.exposureScore === 80, 'Assam exposure remains unchanged at 80 under deluge');

// -------------------------------------------------------------------------
// TEST 7: Cross-View Synchronized State Contract
// -------------------------------------------------------------------------
console.log('\n--- TEST 7: Cross-View Synchronized State Contract ---');
const primaryAssam = getPrimaryAOIForState('Assam');
assert(primaryAssam.id === 'assam-dima-hasao-haflong', 'getPrimaryAOIForState("Assam") returns assam-dima-hasao-haflong');

const primarySikkim = getPrimaryAOIForState('Sikkim');
assert(primarySikkim.id === 'sikkim-nh10-dikchu', 'getPrimaryAOIForState("Sikkim") returns sikkim-nh10-dikchu');

const aoisForAssam = getAOIsForState('Assam');
assert(aoisForAssam.length >= 1 && aoisForAssam[0].state === 'Assam', 'getAOIsForState("Assam") returns authoritative Assam AOIs');

const aoisForSikkim = getAOIsForState('Sikkim');
assert(aoisForSikkim.length >= 1 && aoisForSikkim[0].state === 'Sikkim', 'getAOIsForState("Sikkim") returns authoritative Sikkim AOIs');

console.log('\n================================================================');
console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS`);
console.log('================================================================');
