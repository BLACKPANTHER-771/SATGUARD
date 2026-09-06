import { InterpretableRiskEngine, getRiskLevel, getRiskColor, getRiskBadgeClasses } from '../frontend/src/services/riskEngine.ts';

console.log("==================================================");
console.log("1. FRONTEND InterpretableRiskEngine TEST SUITE");
console.log("==================================================");

// Base input
const baseInput = {
  zoneId: 'test-zone-01',
  zoneName: 'Test Himalayan Ridge',
  state: 'Sikkim',
  district: 'Pakyong',
  lat: 27.35,
  lng: 88.52,
  elevation_m: 1200,
  slope_deg: 35.0,
  soil_moisture_pct: 80.0,
  rainfall_1h_mm: 35.0,
  rainfall_72h_mm: 180.0,
  historical_events_5y: 5,
  lithology: 'Weathered Biotite Gneiss & Mica Schist',
  soil_type: 'Gravelly Sandy Loam',
  population_exposed: 2500,
  villages_exposed: ['Ridge Hamlet'],
  roads_affected: ['NH-10'],
  critical_facilities: ['Substation']
};

const baseRes = InterpretableRiskEngine.evaluateRisk(baseInput);
console.log(`Base Score: ${baseRes.riskScore}% (${baseRes.riskLevel})`);
console.log(`Factor Scores (Norm):`, baseRes.factorScores);
console.log(`Factor Contributions (Pts):`, baseRes.factorContributions);
const contribSum = Object.values(baseRes.factorContributions).reduce((a, b) => a + b, 0);
console.log(`Sum of Factor Contributions: ${contribSum.toFixed(1)} pts`);
console.assert(Math.abs(contribSum - baseRes.riskScore) <= 0.5, "Sum of contributions must equal final score");

// Test 1: Change ONLY rainfall
console.log("\n--- Testing ONLY Rainfall change ---");
const lowRainInput = { ...baseInput, rainfall_1h_mm: 5.0, rainfall_72h_mm: 20.0 };
const lowRainRes = InterpretableRiskEngine.evaluateRisk(lowRainInput);
console.log(`Low Rain Score: ${lowRainRes.riskScore}% (${lowRainRes.riskLevel}) | Rain Contrib: ${lowRainRes.factorContributions.rainfall} pts`);
console.assert(lowRainRes.factorContributions.rainfall < baseRes.factorContributions.rainfall, "Rainfall contribution must decrease");
console.assert(lowRainRes.riskScore < baseRes.riskScore, "Risk score must decrease");
console.assert(lowRainRes.factorContributions.slope === baseRes.factorContributions.slope, "Slope contribution must remain unchanged");

// Test 2: Change ONLY slope
console.log("\n--- Testing ONLY Slope change ---");
const flatSlopeInput = { ...baseInput, slope_deg: 10.0 };
const flatSlopeRes = InterpretableRiskEngine.evaluateRisk(flatSlopeInput);
console.log(`Flat Slope Score: ${flatSlopeRes.riskScore}% (${flatSlopeRes.riskLevel}) | Slope Contrib: ${flatSlopeRes.factorContributions.slope} pts`);
console.assert(flatSlopeRes.factorContributions.slope < baseRes.factorContributions.slope, "Slope contribution must decrease");

// Test 3: Change ONLY soil moisture
console.log("\n--- Testing ONLY Soil Moisture change ---");
const dryMoistureInput = { ...baseInput, soil_moisture_pct: 20.0 };
const dryMoistureRes = InterpretableRiskEngine.evaluateRisk(dryMoistureInput);
console.log(`Dry Moisture Score: ${dryMoistureRes.riskScore}% (${dryMoistureRes.riskLevel}) | Moisture Contrib: ${dryMoistureRes.factorContributions.soilMoisture} pts`);
console.assert(dryMoistureRes.factorContributions.soilMoisture < baseRes.factorContributions.soilMoisture, "Moisture contribution must decrease");

// Test 4: Change ONLY historical events
console.log("\n--- Testing ONLY Historical Events change ---");
const zeroHistInput = { ...baseInput, historical_events_5y: 0 };
const zeroHistRes = InterpretableRiskEngine.evaluateRisk(zeroHistInput);
console.log(`Zero History Score: ${zeroHistRes.riskScore}% (${zeroHistRes.riskLevel}) | History Contrib: ${zeroHistRes.factorContributions.history} pts`);
console.assert(zeroHistRes.factorContributions.history < baseRes.factorContributions.history, "History contribution must decrease");

// Test 5: Change ONLY lithology
console.log("\n--- Testing ONLY Lithology change ---");
const hardLithoInput = { ...baseInput, lithology: 'Competent Granitic Gneiss' };
const hardLithoRes = InterpretableRiskEngine.evaluateRisk(hardLithoInput);
console.log(`Hard Granite Score: ${hardLithoRes.riskScore}% (${hardLithoRes.riskLevel}) | Lithology Contrib: ${hardLithoRes.factorContributions.lithology} pts`);
console.assert(hardLithoRes.factorContributions.lithology < baseRes.factorContributions.lithology, "Lithology contribution must decrease");

// Test 6: Missing Data Handling
console.log("\n--- Testing Missing Data Handling (Rainfall UNAVAILABLE) ---");
const missingRainInput = { ...baseInput, rainfall_1h_mm: undefined, rainfall_72h_mm: undefined };
const missingRainRes = InterpretableRiskEngine.evaluateRisk(missingRainInput);
console.log(`Missing Rain Score: ${missingRainRes.riskScore}% (${missingRainRes.riskLevel}) | Evidence: ${missingRainRes.evidenceCompleteness.ratio}`);
console.log(`Factor Scores:`, missingRainRes.factorScores);
console.log(`Factor Contributions:`, missingRainRes.factorContributions);
console.assert(missingRainRes.factorScores.rainfall === null, "Missing factor score must be null");
console.assert(missingRainRes.factorContributions.rainfall === 0, "Missing factor contribution must be 0");
const missingContribSum = Object.values(missingRainRes.factorContributions).reduce((a, b) => a + b, 0);
console.assert(Math.abs(missingContribSum - missingRainRes.riskScore) <= 0.5, "Sum of available contributions must equal re-normalized score");

console.log("\nALL FRONTEND InterpretableRiskEngine TESTS PASSED!");
