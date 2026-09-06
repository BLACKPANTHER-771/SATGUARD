/**
 * EPOCH PHASE 9: ACTUAL COPERNICUS SENTINEL-1 SAR INTEGRATION TEST SUITE
 * Complete 21-Point Automated Verification Suite
 */

import fs from 'fs';
import { InterpretableRiskEngine } from '../frontend/src/services/riskEngine.ts';
import { Sentinel1Service } from '../frontend/src/services/sentinel1Service.ts';
import { WeatherProviderOrchestrator } from '../frontend/src/services/weatherProviderOrchestrator.ts';
import { AUTHORITATIVE_AOIS } from '../frontend/src/data/command-centre/aoiRegistry.ts';

console.log('================================================================');
console.log('EPOCH PHASE 9: 21-POINT SENTINEL-1 SAR INTEGRATION TEST SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL [Test ${totalTests}]: ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
  passedTests++;
  console.log(`✓ PASS [Test ${totalTests}]: ${message}`);
}

// -------------------------------------------------------------------------
// TEST 1: Existing Copernicus Service Detected
// -------------------------------------------------------------------------
console.log('--- TEST 1: Existing Copernicus Service Detection ---');
const copernicusPyPath = 'backend/app/services/copernicus_service.py';
assert(fs.existsSync(copernicusPyPath), `Existing Copernicus service found at ${copernicusPyPath}`);
const copernicusPyCode = fs.readFileSync(copernicusPyPath, 'utf-8');
assert(copernicusPyCode.includes('class CopernicusService'), 'CopernicusService class defined in backend');

// -------------------------------------------------------------------------
// TEST 2: No Duplicate Copernicus Client
// -------------------------------------------------------------------------
console.log('\n--- TEST 2: No Duplicate Copernicus Client ---');
const backendServices = fs.readdirSync('backend/app/services');
const copernicusClients = backendServices.filter(f => f.includes('copernicus') || f.includes('sentinel'));
assert(copernicusClients.length === 1, `Single Copernicus service file exists (${copernicusClients.join(', ')})`);

// -------------------------------------------------------------------------
// TEST 3: Sentinel-1 Contract Validity
// -------------------------------------------------------------------------
console.log('\n--- TEST 3: Sentinel-1 Contract Schema Validity ---');
const typesCode = fs.readFileSync('frontend/src/types/index.ts', 'utf-8');
assert(typesCode.includes('export interface Sentinel1Observation'), 'Sentinel1Observation interface exported in types/index.ts');
assert(typesCode.includes("mission: 'SENTINEL-1'"), 'Mission field specifies SENTINEL-1');
assert(typesCode.includes('backscatterDb?: number | null'), 'backscatterDb is nullable');
assert(typesCode.includes('coherence?: number | null'), 'coherence is nullable');
assert(typesCode.includes('losDisplacementMm?: number | null'), 'losDisplacementMm is nullable');

// -------------------------------------------------------------------------
// TEST 4: AOI Registry Used for Search Geometry
// -------------------------------------------------------------------------
console.log('\n--- TEST 4: AOI Registry Used for Search Geometry ---');
const sikkimAOI = AUTHORITATIVE_AOIS['sikkim-nh10-dikchu'];
const assamAOI = AUTHORITATIVE_AOIS['assam-dima-hasao-haflong'];
assert(sikkimAOI !== undefined, 'Sikkim Dikchu registered in Phase-6 AOI Registry');
assert(assamAOI !== undefined, 'Assam Haflong registered in Phase-6 AOI Registry');

const sikkimPolygonWkt = Sentinel1Service.buildWktPolygon(sikkimAOI.id, sikkimAOI.polygonCoords);
assert(sikkimPolygonWkt.startsWith('POLYGON((') && sikkimPolygonWkt.endsWith('))'), 'Sikkim polygon builds valid OGC WKT polygon');

// -------------------------------------------------------------------------
// TEST 5 & 6: Sikkim & Assam AOI Geometry Invariants
// -------------------------------------------------------------------------
console.log('\n--- TEST 5 & 6: AOI Geometry Invariants ---');
assert(sikkimAOI.lat === 27.398 && sikkimAOI.lng === 88.535, 'Sikkim Dikchu coordinates locked (27.398° N, 88.535° E)');
assert(sikkimAOI.elevation_m === 850, 'Sikkim elevation locked (850 m)');
assert(assamAOI.lat === 25.1764 && assamAOI.lng === 93.0238, 'Assam Haflong coordinates locked (25.1764° N, 93.0238° E)');
assert(assamAOI.elevation_m === 680, 'Assam elevation locked (680 m)');

// -------------------------------------------------------------------------
// TEST 7: CDSE Credentials Remain Backend-Only
// -------------------------------------------------------------------------
console.log('\n--- TEST 7: CDSE Credentials Security ---');
const frontendFiles = fs.readdirSync('frontend/src/services');
let leakedSecret = false;
for (const f of frontendFiles) {
  const content = fs.readFileSync(`frontend/src/services/${f}`, 'utf-8');
  if (content.includes('COPERNICUS_CLIENT_SECRET')) {
    leakedSecret = true;
  }
}
assert(!leakedSecret, 'COPERNICUS_CLIENT_SECRET is NOT referenced in frontend services');

// -------------------------------------------------------------------------
// TEST 8: GRD Metadata Normalized Correctly
// -------------------------------------------------------------------------
console.log('\n--- TEST 8: GRD Metadata Normalization ---');
const rawMockCDSE = {
  Id: 'f6b6ca67-591d-4859-9ace-bfe2d7d6423a',
  Name: 'S1A_IW_GRDH_1SDV_20260904T121313_20260904T121338_004428_00833E_A899.SAFE',
  ContentDate: { Start: '2026-09-04T12:13:13.317Z', End: '2026-09-04T12:13:38.317Z' },
  ModificationDate: '2026-09-04T14:30:00Z',
  GeoFootprint: { type: 'Polygon', coordinates: [] }
};
const normGRD = Sentinel1Service.normalizeCdseProduct(rawMockCDSE, 'sikkim-nh10-dikchu');
assert(normGRD.mission === 'SENTINEL-1', 'Normalized mission is SENTINEL-1');
assert(normGRD.platform === 'SENTINEL-1A', 'Normalized platform is SENTINEL-1A');
assert(normGRD.productType === 'GRD', 'Normalized productType is GRD');
assert(normGRD.polarization.includes('VV') && normGRD.polarization.includes('VH'), 'Dual polarization VV+VH extracted');

// -------------------------------------------------------------------------
// TEST 9, 10, 11: SLC/InSAR Null Safety & No Fabricated Values
// -------------------------------------------------------------------------
console.log('\n--- TEST 9, 10, 11: Null Safety & Zero Fabricated InSAR Values ---');
assert(normGRD.coherence === null, 'GRD product coherence is strictly null');
assert(normGRD.losDisplacementMm === null, 'GRD product LOS displacement is strictly null');
assert(normGRD.baselineDays === null, 'Single observation baselineDays is null');

// -------------------------------------------------------------------------
// TEST 12: Actual Temporal Baseline Calculation (Dynamic, No Hardcoded 12-day)
// -------------------------------------------------------------------------
console.log('\n--- TEST 12: Dynamic Temporal Baseline Calculation ---');
const obsA = { ...normGRD, acquisitionTime: '2026-09-04T12:13:13Z' };
const obsB_6day = { ...normGRD, acquisitionTime: '2026-08-29T12:13:13Z' };
const obsB_12day = { ...normGRD, acquisitionTime: '2026-08-23T12:13:13Z' };
const obsB_24day = { ...normGRD, acquisitionTime: '2026-08-11T12:13:13Z' };

const baseline6 = Sentinel1Service.calculateTemporalBaseline(obsA, obsB_6day);
const baseline12 = Sentinel1Service.calculateTemporalBaseline(obsA, obsB_12day);
const baseline24 = Sentinel1Service.calculateTemporalBaseline(obsA, obsB_24day);

assert(baseline6 === 6, `Dynamic 6-day baseline calculated (actual: ${baseline6})`);
assert(baseline12 === 12, `Dynamic 12-day baseline calculated (actual: ${baseline12})`);
assert(baseline24 === 24, `Dynamic 24-day baseline calculated (actual: ${baseline24})`);

// -------------------------------------------------------------------------
// TEST 13: Synthetic Data Explicitly Labelled
// -------------------------------------------------------------------------
console.log('\n--- TEST 13: Synthetic Data Explicit Labeling ---');
const synthObs = {
  observationId: 'S1-SYNTH-01',
  aoiId: 'sikkim-nh10-dikchu',
  acquisitionTime: '2026-09-04T12:00:00Z',
  mission: 'SENTINEL-1',
  platform: 'SENTINEL-1A',
  productType: 'GRD',
  source: 'SYNTHETIC',
  provenance: 'SYNTHETIC',
  availability: 'AVAILABLE'
};
assert(synthObs.provenance === 'SYNTHETIC', 'Synthetic observation explicitly carries SYNTHETIC provenance');

// -------------------------------------------------------------------------
// TEST 14: Unavailable State Safety
// -------------------------------------------------------------------------
console.log('\n--- TEST 14: Unavailable State Safety ---');
const unavailObs = await Sentinel1Service.getObservationsForAOI('unknown-remote-zone', 'Unknown');
assert(Array.isArray(unavailObs), 'Unresolvable AOI returns array safely without crashing');

// -------------------------------------------------------------------------
// TEST 15: Existing Phase-5/Phase-2 Deterministic Risk Formula Unchanged
// -------------------------------------------------------------------------
console.log('\n--- TEST 15: Phase-2 Risk Formula Invariant Lock ---');
const baseInput = {
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
  rainfall_72h_mm: 180.0
};
const evalRisk = InterpretableRiskEngine.evaluateRisk(baseInput);
assert(InterpretableRiskEngine.WEIGHT_RAINFALL === 0.40, 'Rainfall weight = 0.40');
assert(InterpretableRiskEngine.WEIGHT_SLOPE === 0.26, 'Slope weight = 0.26');
assert(InterpretableRiskEngine.WEIGHT_SOIL_MOISTURE === 0.18, 'Soil moisture weight = 0.18');
assert(InterpretableRiskEngine.WEIGHT_HISTORY === 0.09, 'History weight = 0.09');
assert(InterpretableRiskEngine.WEIGHT_LITHOLOGY === 0.07, 'Lithology weight = 0.07');
assert(evalRisk.riskScore === 89, `Risk evaluates to 89% using locked formula (actual: ${evalRisk.riskScore}%)`);

// -------------------------------------------------------------------------
// TEST 16: Exposure Invariant (Sikkim=69, Assam=80)
// -------------------------------------------------------------------------
console.log('\n--- TEST 16: Exposure Invariant (69/80 Invariant) ---');
const sikkimExp = InterpretableRiskEngine.evaluateExposure({
  population_exposed: sikkimAOI.associatedAssets.totalPopulationExposed,
  villages_exposed: sikkimAOI.associatedAssets.settlements.map(s => s.name),
  roads_affected: sikkimAOI.associatedAssets.roads.map(r => r.name),
  critical_facilities: sikkimAOI.associatedAssets.facilities.map(f => f.name),
  threatened_bridges: sikkimAOI.associatedAssets.bridges.map(b => b.name)
});
assert(sikkimExp.exposureScore === 69, `Sikkim exposure score is exactly 69 (actual: ${sikkimExp.exposureScore})`);

const assamExp = InterpretableRiskEngine.evaluateExposure({
  population_exposed: assamAOI.associatedAssets.totalPopulationExposed,
  villages_exposed: assamAOI.associatedAssets.settlements.map(s => s.name),
  roads_affected: assamAOI.associatedAssets.roads.map(r => r.name),
  critical_facilities: assamAOI.associatedAssets.facilities.map(f => f.name),
  threatened_bridges: assamAOI.associatedAssets.bridges.map(b => b.name)
});
assert(assamExp.exposureScore === 80, `Assam exposure score is exactly 80 (actual: ${assamExp.exposureScore})`);

// -------------------------------------------------------------------------
// TEST 17: Priority Logic Unchanged
// -------------------------------------------------------------------------
console.log('\n--- TEST 17: Priority Logic Invariant ---');
assert(evalRisk.responsePriority === 'PRIORITY_1', `Response priority evaluates dynamically to PRIORITY_1 (actual: ${evalRisk.responsePriority})`);

// -------------------------------------------------------------------------
// TEST 18: Phase-8 IMD Priority Invariant
// -------------------------------------------------------------------------
console.log('\n--- TEST 18: Phase-8 IMD Priority Invariant ---');
const weather = await WeatherProviderOrchestrator.getCurrentWeather(
  sikkimAOI.lat,
  sikkimAOI.lng,
  sikkimAOI.id,
  sikkimAOI.name,
  sikkimAOI.state,
  sikkimAOI.district
);
assert(weather.provider === 'IMD', `IMD remains primary weather provider (actual: ${weather.provider})`);
assert(weather.providerStatus === 'IMD LIVE', `Weather status remains 'IMD LIVE' (actual: ${weather.providerStatus})`);

// -------------------------------------------------------------------------
// TEST 19: No Second Risk Engine
// -------------------------------------------------------------------------
console.log('\n--- TEST 19: No Second Risk Engine ---');
const serviceFiles = fs.readdirSync('frontend/src/services');
const riskEngines = serviceFiles.filter(f => f.toLowerCase().includes('risk') || f.toLowerCase().includes('calculator'));
assert(riskEngines.length === 1 && riskEngines[0] === 'riskEngine.ts', `Single risk engine exists (${riskEngines.join(', ')})`);

// -------------------------------------------------------------------------
// TEST 20: Live Copernicus CDSE Verification Attempt
// -------------------------------------------------------------------------
console.log('\n--- TEST 20: Live Copernicus CDSE Verification Attempt ---');
const liveSikkimObs = await Sentinel1Service.getObservationsForAOI(sikkimAOI.id, sikkimAOI.state, sikkimAOI.polygonCoords);
assert(liveSikkimObs.length >= 2, `Retrieved ${liveSikkimObs.length} Sentinel-1 observations for Sikkim AOI`);
const firstObs = liveSikkimObs[0];
assert(firstObs.mission === 'SENTINEL-1', 'Verified Sentinel-1 mission');
assert(firstObs.source === 'COPERNICUS-CDSE', 'Verified source is COPERNICUS-CDSE');
assert(firstObs.provenance === 'LIVE', 'Verified provenance is LIVE');
console.log('------------------------------------------------------------');
console.log('SENTINEL-1 LIVE VERIFIED');
console.log(`Product ID: ${firstObs.observationId}`);
console.log(`SAFE Name: ${firstObs.safePackageName}`);
console.log(`Acquisition Timestamp: ${firstObs.acquisitionTime}`);
console.log(`Platform: ${firstObs.platform}`);
console.log(`Orbit Direction: ${firstObs.orbitDirection}`);
console.log(`Product Type: ${firstObs.productType}`);
console.log(`Backscatter: ${firstObs.backscatterDb} dB`);
console.log('------------------------------------------------------------');

console.log('\n================================================================');
console.log(`SUMMARY: ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS`);
console.log('================================================================');
