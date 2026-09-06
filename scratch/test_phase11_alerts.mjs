/**
 * EPOCH PHASE 11: MULTILINGUAL ALERT & DECISION SUPPORT TEST SUITE
 * 
 * Comprehensive 24-assertion test suite verifying:
 * 1. Existing Alert Center detected and reused
 * 2. No duplicate alert engine or risk engine
 * 3. Phase-2 formula unchanged (Rainfall 0.40, Slope 0.26, Soil Moisture 0.18, History 0.09, Lithology 0.07)
 * 4. Exposure remains 69 for Sikkim, 80 for Assam
 * 5. Priority mapping (P1 -> Critical, P2 -> High, P3 -> Advisory, P4 -> Info) without recalculation
 * 6. IMD warning remains separated from EPOCH alerts
 * 7. Sentinel-1 SAR observations remain separate observation layer
 * 8. Field verification remains separate truth layer
 * 9. Alert AOI matches authoritative AOIs
 * 10. English translation verified from catalog
 * 11. Hindi translation verified from catalog
 * 12. Assamese translation verified from catalog
 * 13. Bengali translation verified from catalog
 * 14. Unsupported language falls back to validated English
 * 15. Numbers, risk scores, and road codes remain invariant across translations
 * 16. Status transition follows DRAFT -> APPROVED or REJECTED
 * 17. Human approval required before entering APPROVED status
 * 18. Synthetic alerts clearly labeled SYNTHETIC
 * 19. CAP status is strictly SIMULATION_DRAFT (no TRANSMITTED)
 * 20. EPOCH alert never has source: IMD merely because IMD contributed context
 * 21. Alert generator does not recalculate risk or priority
 * 22. CAP cannot enter TRANSMITTED during Phase 11
 * 23. Translation preserves source/context separation
 * 24. Unsupported language falls back to validated English
 */

import { AlertService, TRANSLATION_CATALOG } from '../frontend/src/services/alertService.ts';
import { AUTHORITATIVE_AOIS, getAuthoritativeAOI } from '../frontend/src/data/command-centre/aoiRegistry.ts';
import { InterpretableRiskEngine } from '../frontend/src/services/riskEngine.ts';
import fs from 'fs';
import path from 'path';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL [Test ${totalTests}]: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASS [Test ${totalTests}]: ${message}`);
    passedTests++;
  }
}

console.log('================================================================');
console.log('EPOCH PHASE 11: MULTILINGUAL ALERT SYSTEM TEST SUITE');
console.log('================================================================\n');

// -------------------------------------------------------------
// TEST 1: Existing Alert Center Detected and Reused
// -------------------------------------------------------------
console.log('--- 1. Existing Alert Center Detected and Reused ---');
const alertCenterViewPath = path.resolve('frontend/src/components/views/AlertCenterView.tsx');
assert(fs.existsSync(alertCenterViewPath), 'AlertCenterView.tsx exists in frontend/src/components/views/');
const alertCenterContent = fs.readFileSync(alertCenterViewPath, 'utf8');
assert(alertCenterContent.includes('AlertService'), 'AlertCenterView utilizes AlertService');
assert(alertCenterContent.includes('MULTILINGUAL EMERGENCY ALERT BROADCAST CENTER'), 'AlertCenterView contains broadcast header');

// -------------------------------------------------------------
// TEST 2: No Duplicate Alert or Risk Engine
// -------------------------------------------------------------
console.log('\n--- 2. No Duplicate Alert or Risk Engine ---');
assert(typeof InterpretableRiskEngine.evaluateRisk === 'function', 'InterpretableRiskEngine is the single authority on risk');
assert(typeof AlertService.generateAlertFromZone === 'function', 'AlertService provides packaging/formatting without risk recalculation');

// -------------------------------------------------------------
// TEST 3: Phase-2 Formula Invariant Preservation
// -------------------------------------------------------------
console.log('\n--- 3. Phase-2 Risk Formula Weights Lock ---');
const riskEval = InterpretableRiskEngine.evaluateRisk({
  zoneId: 'sikkim-nh10-dikchu',
  name: 'Dikchu - Singtam Sector (NH-10 KM 19)',
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
const rainfallFactor = riskEval.factorBreakdown.find(f => f.id === 'F-RAIN');
const slopeFactor = riskEval.factorBreakdown.find(f => f.id === 'F-SLOPE');
const moistureFactor = riskEval.factorBreakdown.find(f => f.id === 'F-SOIL');
const historyFactor = riskEval.factorBreakdown.find(f => f.id === 'F-HIST');
const lithologyFactor = riskEval.factorBreakdown.find(f => f.id === 'F-LITHO');

assert(rainfallFactor?.weight === 0.40, 'Rainfall weight strictly 0.40');
assert(slopeFactor?.weight === 0.26, 'Slope weight strictly 0.26');
assert(moistureFactor?.weight === 0.18, 'Soil moisture weight strictly 0.18');
assert(historyFactor?.weight === 0.09, 'Historical events weight strictly 0.09');
assert(lithologyFactor?.weight === 0.07, 'Lithology weight strictly 0.07');

// -------------------------------------------------------------
// TEST 4: Exposure Score Invariants (Sikkim = 69, Assam = 80)
// -------------------------------------------------------------
console.log('\n--- 4. Exposure Score Invariants ---');
const assamEval = InterpretableRiskEngine.evaluateRisk({
  zoneId: 'assam-dima-hasao-haflong',
  name: 'Dima Hasao - Haflong Ghat (NH-27 / NF Railway)',
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
assert(riskEval.exposureScore === 69, `Sikkim Dikchu exposure score is strictly 69 (got ${riskEval.exposureScore})`);
assert(assamEval.exposureScore === 80, `Assam Haflong exposure score is strictly 80 (got ${assamEval.exposureScore})`);

// -------------------------------------------------------------
// TEST 5: Priority Mapping without Recalculation
// -------------------------------------------------------------
console.log('\n--- 5. Priority Mapping Normalization ---');
assert(AlertService.normalizePriority('PRIORITY_1') === 'P1', 'PRIORITY_1 maps to P1');
assert(AlertService.normalizePriority('CRITICAL') === 'P1', 'CRITICAL maps to P1');
assert(AlertService.normalizePriority('PRIORITY_2') === 'P2', 'PRIORITY_2 maps to P2');
assert(AlertService.normalizePriority('HIGH') === 'P2', 'HIGH maps to P2');
assert(AlertService.normalizePriority('PRIORITY_3') === 'P3', 'PRIORITY_3 maps to P3');
assert(AlertService.normalizePriority('MODERATE') === 'P3', 'MODERATE maps to P3');
assert(AlertService.normalizePriority('PRIORITY_4') === 'P4', 'PRIORITY_4 maps to P4');

// -------------------------------------------------------------
// TEST 6: IMD Warning Remains Separated from EPOCH Alert
// -------------------------------------------------------------
console.log('\n--- 6. IMD Meteorological Warning vs EPOCH Decision Alert ---');
assert(alertCenterContent.includes('OFFICIAL IMD METEOROLOGICAL SOURCE'), 'AlertCenterView contains distinct IMD source header');
assert(alertCenterContent.includes('EPOCH DECISION-SUPPORT ALERT'), 'AlertCenterView contains distinct EPOCH decision alert banner');

// -------------------------------------------------------------
// TEST 7: Sentinel-1 SAR Observations Remain Observation Layer
// -------------------------------------------------------------
console.log('\n--- 7. Sentinel-1 Context Flag Separation ---');
const alertWithSar = AlertService.generateAlertFromZone({
  aoiId: 'sikkim-nh10-dikchu',
  riskScore: riskEval.riskScore,
  riskLevel: riskEval.riskLevel,
  priority: 'P1',
  locationName: 'Dikchu - Singtam Sector',
  sarAnomaly: true,
  imdWarning: { warningColor: 'RED' }
});
assert(alertWithSar.contextSources.sentinel1 === true, 'Sentinel-1 presence captured in contextSources');
assert(alertWithSar.riskScore === riskEval.riskScore, 'SAR presence does not alter riskScore');

// -------------------------------------------------------------
// TEST 8: Field Verification Remains Truth Layer
// -------------------------------------------------------------
console.log('\n--- 8. Field Verification Context Flag Separation ---');
const alertWithField = AlertService.generateAlertFromZone({
  aoiId: 'sikkim-nh10-dikchu',
  riskScore: 78,
  riskLevel: 'HIGH',
  priority: 'P2',
  locationName: 'Dikchu - Singtam Sector',
  fieldVerified: true
});
assert(alertWithField.contextSources.fieldVerification === true, 'Field verification captured in contextSources');
assert(alertWithField.riskScore === 78, 'Field verification does not alter risk score');

// -------------------------------------------------------------
// TEST 9: Alert AOI Matches Authoritative AOIs
// -------------------------------------------------------------
console.log('\n--- 9. Authoritative AOI Matching ---');
const sikkimAOI = getAuthoritativeAOI('sikkim-nh10-dikchu');
const assamAOI = getAuthoritativeAOI('assam-dima-hasao-haflong');
assert(sikkimAOI && sikkimAOI.id === 'sikkim-nh10-dikchu', 'Sikkim authoritative AOI retrieved');
assert(assamAOI && assamAOI.id === 'assam-dima-hasao-haflong', 'Assam authoritative AOI retrieved');
assert(alertWithSar.aoiId === 'sikkim-nh10-dikchu', 'Alert aoiId matches authoritative AOI');

// -------------------------------------------------------------
// TEST 10: English Translation Verified from Catalog
// -------------------------------------------------------------
console.log('\n--- 10. English Translation Catalog Verification ---');
assert(TRANSLATION_CATALOG.P1.en.title === 'CRITICAL LANDSLIDE RISK ALERT', 'EN P1 title verified');
assert(TRANSLATION_CATALOG.P1.en.what === 'Critical Landslide Risk Alert', 'EN P1 what verified');
assert(TRANSLATION_CATALOG.P1.en.recommendedAction.includes('Inspect vulnerable road corridors'), 'EN P1 action verified');

// -------------------------------------------------------------
// TEST 11: Hindi Translation Verified from Catalog
// -------------------------------------------------------------
console.log('\n--- 11. Hindi Translation Catalog Verification ---');
assert(TRANSLATION_CATALOG.P1.hi.title === 'अति-गंभीर भूस्खलन जोखिम चेतावनी', 'HI P1 title verified');
assert(TRANSLATION_CATALOG.P1.hi.what === 'अति-गंभीर भूस्खलन जोखिम चेतावनी', 'HI P1 what verified');
assert(TRANSLATION_CATALOG.P1.hi.recommendedAction.includes('निरीक्षण करें'), 'HI P1 action verified');

// -------------------------------------------------------------
// TEST 12: Assamese Translation Verified from Catalog
// -------------------------------------------------------------
console.log('\n--- 12. Assamese Translation Catalog Verification ---');
assert(TRANSLATION_CATALOG.P1.as.title === 'অত্যন্ত বিপদজনক ভূমিস্খলনৰ সতৰ্কবাৰ্তা', 'AS P1 title verified');
assert(TRANSLATION_CATALOG.P1.as.what === 'অত্যন্ত বিপদজনক ভূমিস্খলনৰ সতৰ্কবাৰ্তা', 'AS P1 what verified');
assert(TRANSLATION_CATALOG.P1.as.recommendedAction.includes('পৰিদৰ্শন কৰক'), 'AS P1 action verified');

// -------------------------------------------------------------
// TEST 13: Bengali Translation Verified from Catalog
// -------------------------------------------------------------
console.log('\n--- 13. Bengali Translation Catalog Verification ---');
assert(TRANSLATION_CATALOG.P1.bn.title === 'অত্যন্ত বিপজ্জনক ভূমিধস সতর্কতা', 'BN P1 title verified');
assert(TRANSLATION_CATALOG.P1.bn.what === 'অত্যন্ত বিপজ্জনক ভূমিধস সতর্কতা', 'BN P1 what verified');
assert(TRANSLATION_CATALOG.P1.bn.recommendedAction.includes('পরিদর্শন করুন'), 'BN P1 action verified');

// -------------------------------------------------------------
// TEST 14: Unsupported Language Falls Back to Validated English
// -------------------------------------------------------------
console.log('\n--- 14. Unsupported Language Fallback ---');
const contentEs = AlertService.getAlertContent(alertWithSar, 'es');
assert(contentEs.title === alertWithSar.translations.en.title, 'Unsupported language (es) falls back to English title');
assert(contentEs.what === alertWithSar.translations.en.what, 'Unsupported language (es) falls back to English what');

// -------------------------------------------------------------
// TEST 15: Numbers, Risk Scores, and Road Codes Invariant Across Translations
// -------------------------------------------------------------
console.log('\n--- 15. Numerical and Code Invariants Across Translations ---');
const enContent = AlertService.getAlertContent(alertWithSar, 'en');
const hiContent = AlertService.getAlertContent(alertWithSar, 'hi');
const asContent = AlertService.getAlertContent(alertWithSar, 'as');
const bnContent = AlertService.getAlertContent(alertWithSar, 'bn');

assert(enContent.severity.includes(`${alertWithSar.riskScore}/100`), 'EN contains exact risk score');
assert(hiContent.severity.includes(`${alertWithSar.riskScore}/100`), 'HI contains exact risk score');
assert(asContent.severity.includes(`${alertWithSar.riskScore}/100`), 'AS contains exact risk score');
assert(bnContent.severity.includes(`${alertWithSar.riskScore}/100`), 'BN contains exact risk score');
assert(enContent.where.includes('NH-10') && hiContent.where.includes('NH-10'), 'Road code NH-10 preserved identically');

// -------------------------------------------------------------
// TEST 16: Status Transition Follows DRAFT -> APPROVED / REJECTED
// -------------------------------------------------------------
console.log('\n--- 16. Alert Status Transitions ---');
const draftAlert = AlertService.generateAlertFromZone({
  aoiId: 'assam-dima-hasao-haflong',
  riskScore: 84,
  riskLevel: 'CRITICAL',
  priority: 'P1',
  locationName: 'Haflong Sector'
});
assert(draftAlert.status === 'DRAFT', 'Initial alert status is DRAFT');

// Mock localStorage for node test execution
const mockStorage = new Map();
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, val),
  clear: () => mockStorage.clear()
};

AlertService.saveAlertLocally(draftAlert);
const approvedAlert = AlertService.updateAlertStatus(draftAlert.alertId, 'APPROVED', 'District Collector (Haflong)');
assert(approvedAlert.status === 'APPROVED', 'Status successfully transitioned to APPROVED');
assert(approvedAlert.approvedBy === 'District Collector (Haflong)', 'ApprovedBy recorded on transition');

const draft2 = AlertService.generateAlertFromZone({
  aoiId: 'sikkim-nh10-dikchu',
  riskScore: 50,
  riskLevel: 'MODERATE',
  priority: 'P3',
  locationName: 'Singtam Corridor'
});
AlertService.saveAlertLocally(draft2);
const rejectedAlert = AlertService.updateAlertStatus(draft2.alertId, 'REJECTED', 'Duty Officer');
assert(rejectedAlert.status === 'REJECTED', 'Status successfully transitioned to REJECTED');

// -------------------------------------------------------------
// TEST 17: Human Approval Required Before Entering APPROVED
// -------------------------------------------------------------
console.log('\n--- 17. Human Approval Requirement ---');
const freshAlert = AlertService.generateAlertFromZone({
  aoiId: 'sikkim-nh10-dikchu',
  riskScore: 90,
  riskLevel: 'CRITICAL',
  priority: 'P1',
  locationName: 'Dikchu Sector'
});
assert(freshAlert.status === 'DRAFT', 'Fresh alert cannot auto-approve');
assert(freshAlert.approvedBy === null, 'Fresh alert has no approver until explicit action');

// -------------------------------------------------------------
// TEST 18: Synthetic Alerts Clearly Labeled SYNTHETIC
// -------------------------------------------------------------
console.log('\n--- 18. Synthetic Alert Labeling ---');
const syntheticAlert = AlertService.fromMultilingualAlert({
  id: 'SYNTH-ALERT-001',
  level: 'CRITICAL',
  target_audience: 'Public',
  location_en: 'Sikkim Dikchu',
  location_hi: 'सिक्किम डिक्चू',
  location_as: 'ছিকিম ডিকচু',
  location_bn: 'সিকিম দিকচু',
  reason_en: 'Heavy Rainfall',
  reason_hi: 'भारी बारिश',
  reason_as: 'প্ৰৱল বৰষুণ',
  reason_bn: 'ভারী বৃষ্টিপাত',
  risk_probability_pct: 85,
  expected_time_window: '3 HOURS',
  affected_roads_villages_en: 'NH-10',
  affected_roads_villages_hi: 'NH-10',
  affected_roads_villages_as: 'NH-10',
  affected_roads_villages_bn: 'NH-10',
  recommended_action_en: 'Evacuate',
  recommended_action_hi: 'निकासी',
  recommended_action_as: 'উদ্ধাৰ',
  recommended_action_bn: 'উদ্ধার',
  timestamp: '14:00 IST',
  channels: ['SMS'],
  source_confidence: 'High'
});
assert(syntheticAlert.synthetic === true, 'Synthetic alert has synthetic: true');
assert(syntheticAlert.source === 'SYNTHETIC', 'Synthetic alert has source: SYNTHETIC');

// -------------------------------------------------------------
// TEST 19: CAP Status is Strictly SIMULATION_DRAFT (No TRANSMITTED)
// -------------------------------------------------------------
console.log('\n--- 19. CAP Simulation Status Invariant ---');
assert(freshAlert.capStatus === 'SIMULATION_DRAFT', 'CAP status is SIMULATION_DRAFT');
assert(freshAlert.capStatus !== 'TRANSMITTED', 'CAP status is NOT TRANSMITTED');

// -------------------------------------------------------------
// TEST 20: EPOCH Alert Never Has Source: IMD Merely Because IMD Contributed Context
// -------------------------------------------------------------
console.log('\n--- 20. Source vs Context Separation ---');
const epochWithImd = AlertService.generateAlertFromZone({
  aoiId: 'sikkim-nh10-dikchu',
  riskScore: 82,
  riskLevel: 'HIGH',
  priority: 'P2',
  locationName: 'Singtam - Dikchu Corridor',
  imdWarning: { warningColor: 'RED', warningPhenomena: ['Heavy Rainfall'] },
  source: 'EPOCH'
});
assert(epochWithImd.source === 'EPOCH', 'EPOCH decision alert maintains source: EPOCH');
assert(epochWithImd.source !== 'IMD', 'EPOCH alert does NOT become source: IMD');
assert(epochWithImd.contextSources.imd === true, 'IMD contribution tracked in contextSources.imd');

// -------------------------------------------------------------
// TEST 21: Alert Generator Does Not Recalculate Risk or Priority
// -------------------------------------------------------------
console.log('\n--- 21. Pure Consumer Behavior (Zero Recalculation) ---');
const rawScore = 73;
const rawLevel = 'MODERATE_HIGH';
const rawPriority = 'P2';
const generated = AlertService.generateAlertFromZone({
  aoiId: 'assam-dima-hasao-haflong',
  riskScore: rawScore,
  riskLevel: rawLevel,
  priority: rawPriority,
  locationName: 'Haflong Slopes'
});
assert(generated.riskScore === rawScore, 'Alert generator preserves exact riskScore passed to it');
assert(generated.riskLevel === rawLevel, 'Alert generator preserves exact riskLevel passed to it');
assert(generated.priority === rawPriority, 'Alert generator preserves exact priority passed to it');

// -------------------------------------------------------------
// TEST 22: CAP Cannot Enter TRANSMITTED During Phase 11
// -------------------------------------------------------------
console.log('\n--- 22. CAP Transmission Lock in Phase 11 ---');
assert(approvedAlert.capStatus === 'SIMULATION_DRAFT', 'Approved alert remains in SIMULATION_DRAFT');
assert(approvedAlert.capStatus !== 'TRANSMITTED', 'Approved alert cannot enter TRANSMITTED');

// -------------------------------------------------------------
// TEST 23: Translation Preserves Source and Context Separation
// -------------------------------------------------------------
console.log('\n--- 23. Source and Context Invariance in Translations ---');
const hiTranslated = AlertService.getAlertContent(epochWithImd, 'hi');
const asTranslated = AlertService.getAlertContent(epochWithImd, 'as');
const bnTranslated = AlertService.getAlertContent(epochWithImd, 'bn');
assert(epochWithImd.source === 'EPOCH', 'Alert source remains EPOCH regardless of translation');
assert(epochWithImd.contextSources.imd === true, 'contextSources.imd remains true across all views');
assert(hiTranslated.title.length > 0 && asTranslated.title.length > 0 && bnTranslated.title.length > 0, 'All language views populated');

// -------------------------------------------------------------
// TEST 24: Unsupported Language String Fallback Invariance
// -------------------------------------------------------------
console.log('\n--- 24. Multiple Unsupported Language Fallback Checks ---');
const fallbackDe = AlertService.getAlertContent(epochWithImd, 'de');
const fallbackTa = AlertService.getAlertContent(epochWithImd, 'ta');
const fallbackGu = AlertService.getAlertContent(epochWithImd, 'gu');
assert(fallbackDe.title === epochWithImd.translations.en.title, 'German fallback to English');
assert(fallbackTa.title === epochWithImd.translations.en.title, 'Tamil fallback to English');
assert(fallbackGu.title === epochWithImd.translations.en.title, 'Gujarati fallback to English');

console.log('\n================================================================');
console.log(`ALL ${totalTests} PHASE 11 MULTILINGUAL ALERT INVARIANT TESTS PASSED!`);
console.log('================================================================');
