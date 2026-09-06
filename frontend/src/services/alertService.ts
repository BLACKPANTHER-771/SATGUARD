/**
 * EPOCH — MULTILINGUAL ALERT & DECISION SUPPORT SERVICE (PHASE 11)
 * 
 * Compliant with Phase-11 Architectural Constraints:
 * 1. Pure Consumer: Consumes existing risk, exposure, priority, IMD, SAR, and field status.
 * 2. Zero Recalculation: Never recalculates Phase-2 risk or Phase-3 priority.
 * 3. Decoupled Context: source is 'EPOCH' with contextSources: { imd, sentinel1, fieldVerification }.
 * 4. Controlled Translation Catalog: Validated phrases across English, Hindi, Assamese, and Bengali.
 *    Gracefully falls back to English for unsupported languages.
 * 5. Simulation-Only CAP: capStatus is strictly 'SIMULATION_DRAFT'.
 * 6. Human Approval Workflow: DRAFT -> APPROVED or REJECTED.
 */

import type {
  EpochAlert,
  AlertPriority,
  AlertStatus,
  AlertLanguage,
  AlertTranslationContent,
  MultilingualAlert,
  RiskZone
} from '../types/index.ts';
import { getAuthoritativeAOI } from '../data/command-centre/aoiRegistry.ts';

const LOCAL_ALERTS_KEY = 'epoch_phase11_alerts';

// ============================================================
// VALIDATED MULTILINGUAL TRANSLATION CATALOG
// ============================================================

export const TRANSLATION_CATALOG = {
  P1: {
    en: {
      title: 'CRITICAL LANDSLIDE RISK ALERT',
      what: 'Critical Landslide Risk Alert',
      why: 'Heavy monsoon precipitation on steep saturated hill slopes with critical lifeline infrastructure exposure.',
      recommendedAction: 'Inspect vulnerable road corridors, restrict heavy traffic, and prepare evacuation response SOP.'
    },
    hi: {
      title: 'अति-गंभीर भूस्खलन जोखिम चेतावनी',
      what: 'अति-गंभीर भूस्खलन जोखिम चेतावनी',
      why: 'अत्यधिक वर्षा एवं तीव्र ढलान पर मिट्टी के अत्यधिक संतृप्ति के कारण महत्वपूर्ण राजमार्ग पर उच्च जोखिम।',
      recommendedAction: 'संवेदनशील सड़क खंडों का तत्काल निरीक्षण करें, भारी वाहनों को रोकें एवं निकासी एसओपी तैयार रखें।'
    },
    as: {
      title: 'অত্যন্ত বিপদজনক ভূমিস্খলনৰ সতৰ্কবাৰ্তা',
      what: 'অত্যন্ত বিপদজনক ভূমিস্খলনৰ সতৰ্কবাৰ্তা',
      why: 'প্ৰৱল বৰষুণ আৰু ঢালযুক্ত পাহাৰীয়া অঞ্চলত গুৰুত্বপূৰ্ণ পথৰ ক্ষতি হোৱাৰ প্ৰবল সম্ভাৱনা।',
      recommendedAction: 'সংবেদনশীল পথসমূহ পৰিদৰ্শন কৰক, যাতায়ত সীমিত কৰক আৰু উদ্ধাৰকাৰী দল সষ্টম ৰাখক।'
    },
    bn: {
      title: 'অত্যন্ত বিপজ্জনক ভূমিধস সতর্কতা',
      what: 'অত্যন্ত বিপজ্জনক ভূমিধস সতর্কতা',
      why: 'ভারী বৃষ্টিপাত ও খাড়া পাহাড়ি ঢালে মাটির অতি-সম্পৃক্ততার কারণে প্রধান সড়কে উচ্চ ঝুঁকি।',
      recommendedAction: 'ঝুঁকিপূর্ণ সড়ক এলাকা পরিদর্শন করুন, যান চলাচল নিয়ন্ত্রণ করুন এবং উদ্ধার প্রস্তুতি নিশ্চিত করুন।'
    }
  },
  P2: {
    en: {
      title: 'HIGH-PRIORITY LANDSLIDE ADVISORY',
      what: 'High-Priority Landslide Advisory',
      why: 'Elevated antecedent rainfall and precursor slope tension cracks detected along transport corridors.',
      recommendedAction: 'Deploy spotter teams, monitor slope displacement sensors, and issue traveler caution.'
    },
    hi: {
      title: 'उच्च प्राथमिकता भूस्खलन परामर्श',
      what: 'उच्च प्राथमिकता भूस्खलन परामर्श',
      why: 'लगातार वर्षा एवं परिवहन मार्ग के साथ ढलानों में दरारें दर्ज की गई हैं।',
      recommendedAction: 'निगरानी दल तैनात करें, ढलान विस्थापन सेंसरों की जांच करें एवं यात्रियों को सतर्क करें।'
    },
    as: {
      title: 'উচ্চ প্ৰাথমিকতাৰ ভূমিস্খলন পৰামৰ্শ',
      what: 'উচ্চ প্ৰাথমিকতাৰ ভূমিস্খলন পৰামৰ্শ',
      why: 'ধাৰাবাহিক বৰষুণৰ ফলত পথৰ কাষৰ পাহাৰীয়া অংশত ফাঁট মেলা পৰিলক্ষিত হৈছে।',
      recommendedAction: 'তদাৰকী দল নিয়োগ কৰক, সংবেদনশীল স্থানসমূহ নিৰীক্ষণ কৰক আৰু সতৰ্কতা জাৰি কৰক।'
    },
    bn: {
      title: 'উচ্চ অগ্রাধিকার ভূমিধস পরামর্শ',
      what: 'উচ্চ অগ্রাধিকার ভূমিধস পরামর্শ',
      why: 'টানা বৃষ্টিপাতের ফলে পাহাড়ি ঢালে ফাটল ও গতিবিধি ধরা পড়েছে।',
      recommendedAction: 'তদারকি দল মোতায়েন করুন, সেন্সর ডেটা পর্যবেক্ষণ করুন এবং সতর্কতা বজায় রাখুন।'
    }
  },
  P3: {
    en: {
      title: 'MONITORING ADVISORY',
      what: 'Geotechnical Slope Monitoring Advisory',
      why: 'Moderate rainfall forecast; geological formation requires situational vigilance.',
      recommendedAction: 'Maintain routine drainage inspection and continuous weather tracking.'
    },
    hi: {
      title: 'ढलान निगरानी परामर्श',
      what: 'भू-तकनीकी ढलान निगरानी परामर्श',
      why: 'मध्यम वर्षा का पूर्वानुमान; भूगर्भीय स्थिति पर नियमित सतर्कता आवश्यक है।',
      recommendedAction: 'नालियों की नियमित जांच करें एवं मौसम पूर्वानुमान पर नजर बनाए रखें।'
    },
    as: {
      title: 'নিয়মীয়া নিৰীক্ষণ পৰামৰ্শ',
      what: 'ভূ-কাৰিকৰী নিৰীক্ষণ পৰামৰ্শ',
      why: 'মজলীয়া বৰষুণৰ সম্ভাৱনা; ভৌগোলিক অৱস্থাৰ ওপৰত নজৰ ৰখা প্ৰয়োজন।',
      recommendedAction: 'নলা-নৰ্দমা পৰিষ্কাৰ ৰাখক আৰু বতৰৰ তথ্য নিৰীক্ষণ কৰক।'
    },
    bn: {
      title: 'নিয়মিত পর্যবেক্ষণ পরামর্শ',
      what: 'ভূতাত্ত্বিক পর্যবেক্ষণ পরামর্শ',
      why: 'মাঝারি বৃষ্টিপাতের সম্ভাবনা; পরিস্থিতি পর্যবেক্ষণে রাখা প্রয়োজন।',
      recommendedAction: 'ড্রেনেজ ব্যবস্থা পরীক্ষা করুন এবং আবহাওয়ার খবরে নজর রাখুন।'
    }
  },
  P4: {
    en: {
      title: 'INFORMATIONAL BULLETIN',
      what: 'Baseline Geospatial Information Bulletin',
      why: 'Stable slope conditions under normal seasonal meteorological baseline.',
      recommendedAction: 'Standard operational preparedness; no immediate restrictive action needed.'
    },
    hi: {
      title: 'सूचनात्मक बुलेटिन',
      what: 'आधारभूत भू-स्थानिक सूचना बुलेटिन',
      why: 'सामान्य मौसमी परिस्थितियों में ढलान स्थिर हैं।',
      recommendedAction: 'सामान्य परिचालन तत्परता बनाए रखें; किसी आपात कार्रवाई की आवश्यकता नहीं है।'
    },
    as: {
      title: 'তথ্যমূলক বুলেটিন',
      what: 'সাধাৰণ ভূ-স্থানিক তথ্য বুলেটিন',
      why: 'সাধাৰণ বতৰত পাহাৰীয়া ঢালৰ অৱস্থা সুস্থিৰ।',
      recommendedAction: 'স্বাভাৱিক সতৰ্কতা অৱলম্বন কৰক; কোনো জৰুৰী পদক্ষেপৰ প্ৰয়োজন নাই।'
    },
    bn: {
      title: 'তথ্যমূলক বুলেটিন',
      what: 'সাধারণ ভূ-স্থানিক তথ্য বুলেটিন',
      why: 'স্বাভাবিক আবহাওয়ায় ঢালের অবস্থা স্থিতিশীল রয়েছে।',
      recommendedAction: 'স্বাভাবিক প্রস্তুতি বজায় রাখুন; কোনো জরুরি পদক্ষেপের প্রয়োজন নেই।'
    }
  }
};

export class AlertService {
  /**
   * Normalizes response priority to AlertPriority (P1, P2, P3, P4)
   */
  static normalizePriority(priorityStr: string): AlertPriority {
    if (!priorityStr) return 'P2';
    const upper = priorityStr.toUpperCase();
    if (upper.includes('PRIORITY_1') || upper === 'P1' || upper === 'CRITICAL') return 'P1';
    if (upper.includes('PRIORITY_2') || upper === 'P2' || upper === 'HIGH') return 'P2';
    if (upper.includes('PRIORITY_3') || upper === 'P3' || upper === 'MEDIUM' || upper === 'MODERATE') return 'P3';
    return 'P4';
  }

  /**
   * Generates a canonical EpochAlert from existing risk and context outputs (Zero recalculation).
   */
  static generateAlertFromZone(params: {
    aoiId: string;
    riskScore: number;
    riskLevel: string;
    priority: string;
    locationName: string;
    state?: string;
    district?: string;
    rainfall1hMm?: number;
    roadsAffected?: string[];
    villagesExposed?: string[];
    imdWarning?: any;
    sarAnomaly?: boolean;
    fieldVerified?: boolean;
    source?: 'EPOCH' | 'IMD' | 'SYNTHETIC';
    synthetic?: boolean;
    timestamp?: string;
  }): EpochAlert {
    const pKey = this.normalizePriority(params.priority);
    const alertId = `ALT-EPOCH-${Date.now()}`;
    const aoi = getAuthoritativeAOI(params.aoiId);

    const locationName = params.locationName || aoi?.name || 'Himalayan Corridor Sector';
    const district = params.district || aoi?.district || 'District HQ';
    const state = params.state || aoi?.state || 'Sikkim';
    const roads = params.roadsAffected || aoi?.associatedAssets.roads.map(r => r.code) || ['NH-10'];
    const villages = params.villagesExposed || aoi?.associatedAssets.settlements.map(s => s.name) || ['Settlement Zone'];

    const catalogP = TRANSLATION_CATALOG[pKey] || TRANSLATION_CATALOG.P2;
    const roadStr = roads.join(', ');
    const villageStr = villages.join(', ');

    const whereEn = `${locationName} (${roadStr}), ${district}, ${state}`;
    const whereHi = `${locationName} (${roadStr}), ${district}, ${state}`;
    const whereAs = `${locationName} (${roadStr}), ${district}, ${state}`;
    const whereBn = `${locationName} (${roadStr}), ${district}, ${state}`;

    const severityStr = `${params.riskScore}/100 — ${params.riskLevel}`;

    const translations: Record<AlertLanguage, AlertTranslationContent> = {
      en: {
        title: catalogP.en.title,
        message: `${catalogP.en.what}: ${severityStr}. Location: ${whereEn}. ${catalogP.en.why} Action: ${catalogP.en.recommendedAction}`,
        what: catalogP.en.what,
        where: whereEn,
        why: catalogP.en.why,
        severity: severityStr,
        recommendedAction: catalogP.en.recommendedAction
      },
      hi: {
        title: catalogP.hi.title,
        message: `${catalogP.hi.what}: ${severityStr}। स्थान: ${whereHi}। ${catalogP.hi.why} संस्तुत कार्रवाई: ${catalogP.hi.recommendedAction}`,
        what: catalogP.hi.what,
        where: whereHi,
        why: catalogP.hi.why,
        severity: severityStr,
        recommendedAction: catalogP.hi.recommendedAction
      },
      as: {
        title: catalogP.as.title,
        message: `${catalogP.as.what}: ${severityStr}। স্থান: ${whereAs}। ${catalogP.as.why} পৰামৰ্শ: ${catalogP.as.recommendedAction}`,
        what: catalogP.as.what,
        where: whereAs,
        why: catalogP.as.why,
        severity: severityStr,
        recommendedAction: catalogP.as.recommendedAction
      },
      bn: {
        title: catalogP.bn.title,
        message: `${catalogP.bn.what}: ${severityStr}। স্থান: ${whereBn}। ${catalogP.bn.why} পদক্ষেপ: ${catalogP.bn.recommendedAction}`,
        what: catalogP.bn.what,
        where: whereBn,
        why: catalogP.bn.why,
        severity: severityStr,
        recommendedAction: catalogP.bn.recommendedAction
      }
    };

    const hasImd = Boolean(params.imdWarning);
    const hasSar = Boolean(params.sarAnomaly);
    const hasField = Boolean(params.fieldVerified);

    return {
      alertId,
      aoiId: params.aoiId,
      generatedAt: params.timestamp || new Date().toLocaleTimeString('en-IN') + ' IST',
      validUntil: 'NEXT 3 HOURS',
      riskScore: params.riskScore,
      riskLevel: params.riskLevel,
      priority: pKey,
      title: translations.en.title,
      message: translations.en.message,
      language: 'en',
      source: params.source || 'EPOCH',
      status: 'DRAFT',
      synthetic: params.synthetic !== undefined ? Boolean(params.synthetic) : false,
      what: translations.en.what,
      where: whereEn,
      why: translations.en.why,
      severity: severityStr,
      recommendedAction: translations.en.recommendedAction,
      affectedInfrastructure: [...roads, ...villages],
      contextSources: {
        imd: hasImd,
        sentinel1: hasSar,
        fieldVerification: hasField
      },
      capStatus: 'SIMULATION_DRAFT',
      approvedBy: null,
      approvedAt: null,
      translations
    };
  }

  /**
   * Retrieves content for a given language. Gracefully falls back to English for unsupported languages.
   */
  static getAlertContent(alert: EpochAlert, lang: string): AlertTranslationContent {
    const targetLang = (lang || 'en').toLowerCase();
    if (targetLang === 'hi' && alert.translations?.hi) return alert.translations.hi;
    if (targetLang === 'as' && alert.translations?.as) return alert.translations.as;
    if (targetLang === 'bn' && alert.translations?.bn) return alert.translations.bn;
    return alert.translations?.en || {
      title: alert.title,
      message: alert.message,
      what: alert.what,
      where: alert.where,
      why: alert.why,
      severity: alert.severity,
      recommendedAction: alert.recommendedAction
    };
  }

  /**
   * Adapts a MultilingualAlert (from synthetic JSON) into typed EpochAlert
   */
  static fromMultilingualAlert(m: MultilingualAlert): EpochAlert {
    const priority = m.level === 'CRITICAL' ? 'P1' : m.level === 'WARNING' ? 'P2' : 'P3';
    const aoiId = m.location_en.toLowerCase().includes('sikkim') || m.location_en.toLowerCase().includes('dikchu')
      ? 'sikkim-nh10-dikchu'
      : 'assam-dima-hasao-haflong';

    const translations: Record<AlertLanguage, AlertTranslationContent> = {
      en: {
        title: `${m.level} LANDSLIDE RISK ALERT`,
        message: `${m.reason_en} Action: ${m.recommended_action_en}`,
        what: `${m.level} Landslide Warning`,
        where: m.location_en,
        why: m.reason_en,
        severity: `${m.risk_probability_pct}% — ${m.level}`,
        recommendedAction: m.recommended_action_en
      },
      hi: {
        title: `${m.level === 'CRITICAL' ? 'अति-गंभीर' : 'चेतावनी'} भूस्खलन परामर्श`,
        message: `${m.reason_hi} संस्तुत कार्रवाई: ${m.recommended_action_hi}`,
        what: `${m.level} भूस्खलन चेतावनी`,
        where: m.location_hi,
        why: m.reason_hi,
        severity: `${m.risk_probability_pct}% — ${m.level}`,
        recommendedAction: m.recommended_action_hi
      },
      as: {
        title: `${m.level === 'CRITICAL' ? 'বিপদজনক' : 'সতৰ্কবাৰ্তা'} ভূমিস্খলন পৰামৰ্শ`,
        message: `${m.reason_as} পৰামৰ্শ: ${m.recommended_action_as}`,
        what: `${m.level} ভূমিস্খলন সতৰ্কবাৰ্তা`,
        where: m.location_as,
        why: m.reason_as,
        severity: `${m.risk_probability_pct}% — ${m.level}`,
        recommendedAction: m.recommended_action_as
      },
      bn: {
        title: `${m.level === 'CRITICAL' ? 'বিপজ্জনক' : 'সতর্কবার্তা'} ভূমিধস পরামর্শ`,
        message: `${m.reason_bn} পদক্ষেপ: ${m.recommended_action_bn}`,
        what: `${m.level} ভূমিধস সতর্কতা`,
        where: m.location_bn,
        why: m.reason_bn,
        severity: `${m.risk_probability_pct}% — ${m.level}`,
        recommendedAction: m.recommended_action_bn
      }
    };

    return {
      alertId: m.id,
      aoiId,
      generatedAt: m.timestamp,
      validUntil: m.expected_time_window,
      riskScore: m.risk_probability_pct,
      riskLevel: m.level,
      priority,
      title: translations.en.title,
      message: translations.en.message,
      language: 'en',
      source: 'SYNTHETIC',
      status: 'APPROVED',
      synthetic: true,
      what: translations.en.what,
      where: m.location_en,
      why: m.reason_en,
      severity: `${m.risk_probability_pct}% — ${m.level}`,
      recommendedAction: m.recommended_action_en,
      affectedInfrastructure: [m.affected_roads_villages_en],
      contextSources: {
        imd: true,
        sentinel1: true,
        fieldVerification: true
      },
      capStatus: 'SIMULATION_DRAFT',
      approvedBy: 'SEOC Duty Officer (Simulation)',
      approvedAt: m.timestamp,
      translations
    };
  }

  /**
   * Retrieves locally stored custom alerts
   */
  static getStoredAlerts(): EpochAlert[] {
    try {
      const raw = localStorage.getItem(LOCAL_ALERTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // Fallback
    }
    return [];
  }

  /**
   * Saves a newly generated alert locally
   */
  static saveAlertLocally(alert: EpochAlert): EpochAlert {
    const existing = this.getStoredAlerts();
    const updated = [alert, ...existing.filter(a => a.alertId !== alert.alertId)];
    try {
      localStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(updated));
    } catch {
      // LocalStorage error handling
    }
    return alert;
  }

  /**
   * Updates alert status via explicit human action: DRAFT -> APPROVED or REJECTED
   */
  static updateAlertStatus(
    alertId: string,
    newStatus: AlertStatus,
    approvedBy: string = 'District Disaster Officer (SEOC)'
  ): EpochAlert | null {
    const existing = this.getStoredAlerts();
    const idx = existing.findIndex(a => a.alertId === alertId);
    if (idx >= 0) {
      const alert = existing[idx];
      alert.status = newStatus;
      if (newStatus === 'APPROVED') {
        alert.approvedBy = approvedBy;
        alert.approvedAt = new Date().toLocaleTimeString('en-IN') + ' IST';
      }
      existing[idx] = alert;
      localStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(existing));
      return alert;
    }
    return null;
  }
}
