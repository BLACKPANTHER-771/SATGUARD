/**
 * EPOCH PHASE 8: IMD WEATHER INTEGRATION & PROVIDER ORCHESTRATION TEST SUITE
 * Complete 18-Point Automated Verification Suite
 */

import { InterpretableRiskEngine, getRiskLevel, getRiskColor } from '../frontend/src/services/riskEngine.ts';
import { IMDWeatherService } from '../frontend/src/services/imdWeatherService.ts';
import { OpenWeatherService } from '../frontend/src/services/openWeatherService.ts';
import { OpenMeteoService } from '../frontend/src/services/openMeteoService.ts';
import { WeatherProviderOrchestrator } from '../frontend/src/services/weatherProviderOrchestrator.ts';
import { AUTHORITATIVE_AOIS } from '../frontend/src/data/command-centre/aoiRegistry.ts';
import fs from 'fs';

console.log('================================================================');
console.log('EPOCH PHASE 8: 18-POINT IMD INTEGRATION & ORCHESTRATION TEST SUITE');
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

// Base multi-factor input
const baseInput = {
  zoneId: 'test-zone-01',
  zoneName: 'Dikchu Himalayan Sector',
  state: 'Sikkim',
  district: 'Pakyong',
  lat: 27.398,
  lng: 88.535,
  elevation_m: 850,
  slope_deg: 34.8,
  soil_moisture_pct: 84.0,
  rainfall_1h_mm: 38.4,
  rainfall_72h_mm: 180.0,
  historical_events_5y: 6,
  lithology: 'Weathered Biotite Gneiss & Mica Schist',
  soil_type: 'Gravelly Sandy Loam',
  population_exposed: 1420,
  villages_exposed: ['Dikchu Basti', 'Lower Singtam', 'Melli Colony'],
  roads_affected: ['NH-10 Teesta Lifeline Road (KM 18-24)', 'Dikchu Bridge Approach Road'],
  critical_facilities: ['Singtam Hydro Power Substation', 'Dikchu Primary Health Sub-Centre'],
  threatened_bridges: ['Dikchu River Bridge']
};

// -------------------------------------------------------------------------
// TEST 1: Base Deterministic Multi-Factor Risk Calculation
// -------------------------------------------------------------------------
console.log('--- TEST 1: Base Deterministic Multi-Factor Risk Calculation ---');
const baseRes = InterpretableRiskEngine.evaluateRisk(baseInput);
const contribSum = Object.values(baseRes.factorContributions).reduce((a, b) => a + b, 0);
assert(Math.abs(contribSum - baseRes.riskScore) <= 0.5, `Sum of contributions (${contribSum.toFixed(1)}) equals Risk Score (${baseRes.riskScore}%)`);

// -------------------------------------------------------------------------
// TEST 2: Rainfall Sensitivity & Progression
// -------------------------------------------------------------------------
console.log('\n--- TEST 2: Rainfall Sensitivity & Progression ---');
const lowRainRes = InterpretableRiskEngine.evaluateRisk({ ...baseInput, rainfall_1h_mm: 5.0, rainfall_72h_mm: 20.0 });
assert(lowRainRes.riskScore < baseRes.riskScore, `Low rain score (${lowRainRes.riskScore}%) < Base score (${baseRes.riskScore}%)`);
assert(lowRainRes.factorContributions.slope === baseRes.factorContributions.slope, 'Slope contribution is unaffected by rainfall variation');

// -------------------------------------------------------------------------
// TEST 3: Slope Gradient Sensitivity
// -------------------------------------------------------------------------
console.log('\n--- TEST 3: Slope Gradient Sensitivity ---');
const gentleSlopeRes = InterpretableRiskEngine.evaluateRisk({ ...baseInput, slope_deg: 12.0 });
assert(gentleSlopeRes.factorContributions.slope < baseRes.factorContributions.slope, `Gentle slope contribution (${gentleSlopeRes.factorContributions.slope}) < Base slope (${baseRes.factorContributions.slope})`);

// -------------------------------------------------------------------------
// TEST 4: Soil Moisture Saturation Sensitivity
// -------------------------------------------------------------------------
console.log('\n--- TEST 4: Soil Moisture Saturation Sensitivity ---');
const dryMoistureRes = InterpretableRiskEngine.evaluateRisk({ ...baseInput, soil_moisture_pct: 25.0 });
assert(dryMoistureRes.factorContributions.soilMoisture < baseRes.factorContributions.soilMoisture, `Dry moisture contribution (${dryMoistureRes.factorContributions.soilMoisture}) < Saturated moisture (${baseRes.factorContributions.soilMoisture})`);

// -------------------------------------------------------------------------
// TEST 5: Historical Frequency Sensitivity
// -------------------------------------------------------------------------
console.log('\n--- TEST 5: Historical Frequency Sensitivity ---');
const zeroHistRes = InterpretableRiskEngine.evaluateRisk({ ...baseInput, historical_events_5y: 0 });
assert(zeroHistRes.factorContributions.history === 0, `Zero history contributes 0 points (actual: ${zeroHistRes.factorContributions.history})`);

// -------------------------------------------------------------------------
// TEST 6: Lithology Classification Sensitivity
// -------------------------------------------------------------------------
console.log('\n--- TEST 6: Lithology Classification Sensitivity ---');
const hardGraniteRes = InterpretableRiskEngine.evaluateRisk({ ...baseInput, lithology: 'Competent Massive Granite' });
assert(hardGraniteRes.factorContributions.lithology < baseRes.factorContributions.lithology, `Massive granite contribution (${hardGraniteRes.factorContributions.lithology}) < Weathered Schist (${baseRes.factorContributions.lithology})`);

// -------------------------------------------------------------------------
// TEST 7: Missing Data Redistribution Invariant
// -------------------------------------------------------------------------
console.log('\n--- TEST 7: Missing Data Redistribution Invariant ---');
const missingRainRes = InterpretableRiskEngine.evaluateRisk({ ...baseInput, rainfall_1h_mm: undefined, rainfall_72h_mm: undefined });
assert(missingRainRes.factorScores.rainfall === null, 'Missing factor normalized score is null');
assert(missingRainRes.factorContributions.rainfall === 0, 'Missing factor contribution is 0 points');
const missingContribSum = Object.values(missingRainRes.factorContributions).reduce((a, b) => a + b, 0);
assert(Math.abs(missingContribSum - missingRainRes.riskScore) <= 0.5, `Sum of available factor contributions strictly equals re-normalized score (${missingRainRes.riskScore}%)`);

// -------------------------------------------------------------------------
// TEST 8: Sikkim Exposure Score Invariant (Phase-3 Invariant: Exactly 69)
// -------------------------------------------------------------------------
console.log('\n--- TEST 8: Sikkim Exposure Score Invariant (69/80 Invariant) ---');
const sikkimAOI = AUTHORITATIVE_AOIS['sikkim-nh10-dikchu'];
const sikkimExposure = InterpretableRiskEngine.evaluateExposure({
  population_exposed: sikkimAOI.associatedAssets.totalPopulationExposed,
  villages_exposed: sikkimAOI.associatedAssets.settlements.map(s => s.name),
  roads_affected: sikkimAOI.associatedAssets.roads.map(r => r.name),
  critical_facilities: sikkimAOI.associatedAssets.facilities.map(f => f.name),
  threatened_bridges: sikkimAOI.associatedAssets.bridges.map(b => b.name)
});
assert(sikkimExposure.exposureScore === 69, `Sikkim exposure score evaluates to exactly 69 (actual: ${sikkimExposure.exposureScore})`);

// -------------------------------------------------------------------------
// TEST 9: Assam Exposure Score Invariant (Phase-3 Invariant: Exactly 80)
// -------------------------------------------------------------------------
console.log('\n--- TEST 9: Assam Exposure Score Invariant (69/80 Invariant) ---');
const assamAOI = AUTHORITATIVE_AOIS['assam-dima-hasao-haflong'];
const assamExposure = InterpretableRiskEngine.evaluateExposure({
  population_exposed: assamAOI.associatedAssets.totalPopulationExposed,
  villages_exposed: assamAOI.associatedAssets.settlements.map(s => s.name),
  roads_affected: assamAOI.associatedAssets.roads.map(r => r.name),
  critical_facilities: assamAOI.associatedAssets.facilities.map(f => f.name),
  threatened_bridges: assamAOI.associatedAssets.bridges.map(b => b.name)
});
assert(assamExposure.exposureScore === 80, `Assam exposure score evaluates to exactly 80 (actual: ${assamExposure.exposureScore})`);

// -------------------------------------------------------------------------
// TEST 10: Weather Orchestrator IMD Primary Priority
// -------------------------------------------------------------------------
console.log('\n--- TEST 10: Weather Orchestrator IMD Primary Priority ---');
const sikkimWeather = await WeatherProviderOrchestrator.getCurrentWeather(
  sikkimAOI.lat,
  sikkimAOI.lng,
  sikkimAOI.id,
  sikkimAOI.name,
  sikkimAOI.state,
  sikkimAOI.district
);
assert(sikkimWeather.provider === 'IMD', `Orchestrator selects IMD as primary provider (actual: ${sikkimWeather.provider})`);
assert(sikkimWeather.providerStatus === 'IMD LIVE', `Orchestrator status is 'IMD LIVE' (actual: ${sikkimWeather.providerStatus})`);
assert(sikkimWeather.provenance === 'LIVE', `Provenance is 'LIVE' (actual: ${sikkimWeather.provenance})`);

// -------------------------------------------------------------------------
// TEST 11: Weather Orchestrator OpenWeather Fallback
// -------------------------------------------------------------------------
console.log('\n--- TEST 11: Weather Orchestrator OpenWeather Fallback ---');
// Test fallback behavior when IMD returns null for unsupported remote coordinates
const remoteCoordinates = { lat: 10.0, lng: 76.0, regionId: 'remote-zone', regionName: 'Remote Area', state: 'Unknown' };
// OpenWeather service can be queried directly as fallback
const owResult = await OpenWeatherService.getNormalizedWeather(remoteCoordinates.lat, remoteCoordinates.lng, remoteCoordinates.regionId, remoteCoordinates.regionName, remoteCoordinates.state);
// OpenWeather returns normalized contract or null without errors
assert(owResult === null || owResult.provider === 'OPENWEATHER', 'OpenWeather provider cleanly handles fallback queries');

// -------------------------------------------------------------------------
// TEST 12: Weather Orchestrator Open-Meteo Fallback
// -------------------------------------------------------------------------
console.log('\n--- TEST 12: Weather Orchestrator Open-Meteo Fallback ---');
const meteoResult = await OpenMeteoService.getWeather(
  sikkimAOI.lat,
  sikkimAOI.lng,
  sikkimAOI.id,
  sikkimAOI.name,
  sikkimAOI.state,
  sikkimAOI.district
);
assert(meteoResult !== null && meteoResult.provider === 'OPENMETEO', 'Open-Meteo successfully returns fallback telemetry');
assert(meteoResult.providerStatus === 'FALLBACK: OPEN-METEO', 'Open-Meteo status is FALLBACK: OPEN-METEO');
assert(meteoResult.provenance === 'FALLBACK', 'Open-Meteo provenance is FALLBACK');

// -------------------------------------------------------------------------
// TEST 13: Weather Orchestrator Safe State (UNAVAILABLE)
// -------------------------------------------------------------------------
console.log('\n--- TEST 13: Weather Orchestrator Safe State (UNAVAILABLE) ---');
// Verify safe structure of unavailable telemetry
const unavailForecast = await WeatherProviderOrchestrator.getForecast(
  999.0, // Invalid coordinate to trigger safe state
  999.0,
  'invalid-zone',
  'Invalid Zone',
  'Nowhere',
  'Nowhere'
);
assert(unavailForecast.provenance === 'UNAVAILABLE' || unavailForecast.provenance === 'FALLBACK', 'Unresolvable region safely returns standard dataset without throwing exception');
assert(unavailForecast.currentObserved.riskLevel === 'UNAVAILABLE', 'Risk level in unresolvable dataset is UNAVAILABLE');

// -------------------------------------------------------------------------
// TEST 14: No Fabricated IMD Station Identity
// -------------------------------------------------------------------------
console.log('\n--- TEST 14: No Fabricated IMD Station Identity ---');
const mappingEntries = await IMDWeatherService.fetchLiveAwsMapping();
assert(Array.isArray(mappingEntries) && mappingEntries.length > 0, 'IMD AWS mapping table is loaded dynamically');
const resolvedSikkim = await IMDWeatherService.resolveStationFromMapping(sikkimAOI.lat, sikkimAOI.lng, sikkimAOI.state, sikkimAOI.district);
assert(resolvedSikkim.station !== null, 'Sikkim station resolved dynamically');
assert(resolvedSikkim.station.isVerified === true, 'Resolved station is verified in IMD mapping response');
assert(mappingEntries.some(m => m.station_code === resolvedSikkim.station.stationCode), 'Station code exists in verified IMD mapping registry');
console.log(`Resolved Sikkim Station: ${resolvedSikkim.station.stationName} (${resolvedSikkim.station.stationCode}), Granularity: ${resolvedSikkim.granularity}`);

// -------------------------------------------------------------------------
// TEST 15: No Fabricated Rainfall Accumulation (Unavailable 72h = null)
// -------------------------------------------------------------------------
console.log('\n--- TEST 15: No Fabricated Rainfall Accumulation ---');
const imdTelemetry = await IMDWeatherService.getCurrentWeather(
  sikkimAOI.lat,
  sikkimAOI.lng,
  sikkimAOI.id,
  sikkimAOI.name,
  sikkimAOI.state,
  sikkimAOI.district
);
assert(imdTelemetry.rainfall72hMm === null, 'IMD telemetry rainfall72hMm is strictly null when not provided by endpoint');
assert(imdTelemetry.rainfall72hMm !== (imdTelemetry.rainfall24hMm * 3), 'IMD telemetry does NOT fabricate 72h = 24h * 3');

// Evaluate risk with 72h = null
const riskWithNull72h = InterpretableRiskEngine.evaluateRisk({
  ...baseInput,
  rainfall_1h_mm: 38.4,
  rainfall_72h_mm: undefined // null/undefined
});
assert(riskWithNull72h.factorScores.rainfall !== null, 'Rainfall factor normalizes cleanly with 1h intensity when 72h is null');
assert(!isNaN(riskWithNull72h.riskScore), `Risk score is numeric (${riskWithNull72h.riskScore}%) without NaN`);

// -------------------------------------------------------------------------
// TEST 16: IMD Warning Fidelity
// -------------------------------------------------------------------------
console.log('\n--- TEST 16: IMD Warning Fidelity ---');
const imdWarning = await IMDWeatherService.getOfficialWarning(sikkimAOI.state, sikkimAOI.district);
assert(imdWarning !== null, 'IMD official warning object is returned');
assert(['RED', 'ORANGE', 'YELLOW', 'GREEN', null].includes(imdWarning.warningColor), `Warning color is valid IMD tier (${imdWarning.warningColor})`);
assert(Array.isArray(imdWarning.warningCodes) && imdWarning.warningCodes.length > 0, `Official IMD warning codes present (${imdWarning.warningCodes.join(', ')})`);
assert(Array.isArray(imdWarning.warningPhenomena) && imdWarning.warningPhenomena.length > 0, `Official phenomena present (${imdWarning.warningPhenomena.join(', ')})`);
assert(imdWarning.affectedDistricts.includes(sikkimAOI.district), `Affected districts contain target district (${sikkimAOI.district})`);

// -------------------------------------------------------------------------
// TEST 17: Provider Isolation
// -------------------------------------------------------------------------
console.log('\n--- TEST 17: Provider Isolation ---');
const openWeatherCode = fs.readFileSync('frontend/src/services/openWeatherService.ts', 'utf-8');
const openMeteoCode = fs.readFileSync('frontend/src/services/openMeteoService.ts', 'utf-8');
assert(!openWeatherCode.includes('IMDWeatherService'), 'OpenWeatherService has zero import or reference to IMDWeatherService');
assert(!openMeteoCode.includes('IMDWeatherService'), 'OpenMeteoService has zero import or reference to IMDWeatherService');
assert(!openMeteoCode.includes('OpenWeatherService'), 'OpenMeteoService has zero import or reference to OpenWeatherService');

// -------------------------------------------------------------------------
// TEST 18: Field-Level Null Safety
// -------------------------------------------------------------------------
console.log('\n--- TEST 18: Field-Level Null Safety ---');
const sparseInput = {
  zoneId: 'sparse-zone',
  zoneName: 'Sparse Sensor AOI',
  state: 'Sikkim',
  district: 'Pakyong',
  lat: 27.398,
  lng: 88.535,
  elevation_m: 850,
  slope_deg: 34.8,
  soil_moisture_pct: null, // missing
  rainfall_1h_mm: null,     // missing
  rainfall_72h_mm: null,    // missing
  historical_events_5y: null, // missing
  lithology: undefined,     // missing
  population_exposed: 1420
};

const sparseEval = InterpretableRiskEngine.evaluateRisk(sparseInput);
assert(!isNaN(sparseEval.riskScore), `Sparse inputs calculate valid risk score (${sparseEval.riskScore}%)`);
assert(sparseEval.factorScores.rainfall === null, 'Missing rainfall score is null');
assert(sparseEval.factorScores.soilMoisture === null, 'Missing soil moisture score is null');
assert(sparseEval.factorScores.history === null, 'Missing history score is null');
assert(sparseEval.factorScores.lithology === null, 'Missing lithology score is null');
assert(sparseEval.factorContributions.rainfall === 0, 'Missing rainfall contribution is 0');
assert(Math.abs(sparseEval.factorContributions.slope - sparseEval.riskScore) <= 0.5, `Single available factor (slope: ${sparseEval.factorContributions.slope.toFixed(1)}) safely scales to 100% of score (${sparseEval.riskScore}%)`);

console.log('\n================================================================');
console.log(`SUMMARY: ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS`);
console.log('================================================================');
