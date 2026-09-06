import { InterpretableRiskEngine } from '../frontend/src/services/riskEngine.ts';

console.log('================================================================');
console.log('EPOCH PHASE 3: TYPESCRIPT RISK x EXPOSURE ENGINE TEST SUITE');
console.log('================================================================');

// 1. Sikkim Critical Zone (Dikchu KM 19)
console.log('\n--- 1. SIKKIM CRITICAL ZONE (Dikchu) ---');
const sikkimOut = InterpretableRiskEngine.evaluateRisk({
  zoneId: 'sikkim-nh10-dikchu',
  zoneName: 'Dikchu - Singtam Sector (NH-10 KM 19)',
  state: 'Sikkim',
  district: 'Pakyong',
  rainfall_1h_mm: 38.4,
  rainfall_72h_mm: 265.0,
  slope_deg: 34.8,
  soil_moisture_pct: 84.0,
  historical_events_5y: 6,
  lithology: 'Weathered Biotite Gneiss & Mica Schist',
  population_exposed: 1420,
  villages_exposed: ['Dikchu Basti', 'Lower Singtam', 'Melli Colony'],
  roads_affected: ['NH-10 Teesta Lifeline Road (KM 18-24)', 'Dikchu Bridge Approach'],
  threatened_bridges: ['Dikchu River Bridge'],
  critical_facilities: ['Singtam Hydro Power Substation', 'Dikchu Primary Health Sub-Centre']
});

console.log(`Risk Score: ${sikkimOut.riskScore}% (${sikkimOut.riskLevel})`);
console.log(`Exposure Score: ${sikkimOut.exposureScore}/100`);
console.log(`Response Priority: ${sikkimOut.responsePriority} (Score: ${sikkimOut.responsePriorityScore})`);
console.log(`Priority Rationale: ${sikkimOut.priorityRationale}`);
console.log(`Exposed Villages:`, sikkimOut.exposureRecord.exposed_villages);
console.log(`Exposed Hospitals:`, sikkimOut.exposureRecord.exposed_hospitals);
console.log(`Exposed Schools:`, sikkimOut.exposureRecord.exposed_schools);
console.log(`Critical Infra:`, sikkimOut.exposureRecord.critical_infrastructure);

if (sikkimOut.riskLevel !== 'CRITICAL' || sikkimOut.responsePriority !== 'PRIORITY_1') {
  throw new Error('Sikkim critical zone priority mismatch');
}

// 2. Assam Critical Zone (Haflong Ghat)
console.log('\n--- 2. ASSAM CRITICAL ZONE (Haflong Ghat) ---');
const assamOut = InterpretableRiskEngine.evaluateRisk({
  zoneId: 'assam-dima-hasao-haflong',
  zoneName: 'Dima Hasao - Haflong Ghat (NH-27 / NF Railway)',
  state: 'Assam',
  district: 'Dima Hasao',
  rainfall_1h_mm: 42.0,
  rainfall_72h_mm: 310.0,
  slope_deg: 36.2,
  soil_moisture_pct: 88.0,
  historical_events_5y: 9,
  lithology: 'Disang Shale & Sandstone Alternation',
  population_exposed: 2100,
  villages_exposed: ['Jatinga Valley Settlement', 'Lower Haflong Railway Colony'],
  roads_affected: ['NH-27 East-West Corridor', 'Lumding-Badarpur Railway Line'],
  threatened_bridges: ['Diyung River Railway Span', 'Haflong Valley Viaduct'],
  critical_facilities: ['Haflong Civil Hospital Access', 'Railway Traction Substation', 'Haflong Government College / Shelter']
});

console.log(`Risk Score: ${assamOut.riskScore}% (${assamOut.riskLevel})`);
console.log(`Exposure Score: ${assamOut.exposureScore}/100`);
console.log(`Response Priority: ${assamOut.responsePriority} (Score: ${assamOut.responsePriorityScore})`);
console.log(`Priority Rationale: ${assamOut.priorityRationale}`);

if (assamOut.riskLevel !== 'CRITICAL' || assamOut.responsePriority !== 'PRIORITY_1') {
  throw new Error('Assam critical zone priority mismatch');
}

// 3. HIGH Zone (Mangan)
console.log('\n--- 3. HIGH RISK ZONE (Mangan) ---');
const manganOut = InterpretableRiskEngine.evaluateRisk({
  zoneId: 'sikkim-mangan-chungthang',
  name: 'Mangan - Chungthang North Axis',
  state: 'Sikkim',
  district: 'Mangan',
  rainfall_1h_mm: 26.0,
  rainfall_72h_mm: 160.0,
  slope_deg: 38.0,
  soil_moisture_pct: 72.0,
  historical_events_5y: 4,
  lithology: 'Foliated Daling Phyllite & Schist',
  population_exposed: 3800,
  villages_exposed: ['Mangan Bazaar', 'Chungthang Hub'],
  roads_affected: ['North Sikkim Highway (Mangan-Chungthang Axis)'],
  threatened_bridges: ['Chungthang Confluence Bridge'],
  critical_facilities: ['Mangan District Hospital', 'Teesta III Hydro Facility', 'BRO Border Post']
});

console.log(`Risk Score: ${manganOut.riskScore}% (${manganOut.riskLevel})`);
console.log(`Exposure Score: ${manganOut.exposureScore}/100`);
console.log(`Response Priority: ${manganOut.responsePriority} (Score: ${manganOut.responsePriorityScore})`);

// 4. MODERATE Zone (Martam)
console.log('\n--- 4. MODERATE RISK ZONE (Martam) ---');
const martamOut = InterpretableRiskEngine.evaluateRisk({
  zoneId: 'sikkim-martam-ridge',
  name: 'Upper Martam Ridge Valley Sector',
  state: 'Sikkim',
  district: 'Gangtok',
  rainfall_1h_mm: 14.0,
  rainfall_72h_mm: 85.0,
  slope_deg: 24.0,
  soil_moisture_pct: 58.0,
  historical_events_5y: 2,
  lithology: 'Quartzite & Phyllite Alternation',
  population_exposed: 850,
  villages_exposed: ['Martam Ridge Hamlet', 'Upper Valley Farmsteads'],
  roads_affected: ['Singtam - Martam Ridge Service Road'],
  critical_facilities: ['Martam Secondary School', 'Local Health Clinic']
});

console.log(`Risk Score: ${martamOut.riskScore}% (${martamOut.riskLevel})`);
console.log(`Exposure Score: ${martamOut.exposureScore}/100`);
console.log(`Response Priority: ${martamOut.responsePriority} (Score: ${martamOut.responsePriorityScore})`);

// 5. Missing / Unavailable Exposure Data
console.log('\n--- 5. UNAVAILABLE EXPOSURE DATA ---');
const unavailExp = InterpretableRiskEngine.evaluateExposure({
  roads_affected: ['SH-5 State Highway']
});
console.log('Unavail Exposure output:', unavailExp);
if (unavailExp.exposureRecord.exposed_population !== null) {
  throw new Error('Population should be null when unavailable');
}
if (unavailExp.exposureScore !== 75) {
  throw new Error(`Expected exposure score 75, got ${unavailExp.exposureScore}`);
}

console.log('\nALL TYPESCRIPT ENGINE TESTS PASSED!');
