      soil_type: selectedZone?.soil_type || authAOI?.geotechnicalInputs.soil_type,
      population_exposed: selectedZone?.population_exposed || authAOI?.associatedAssets.totalPopulationExposed || (isSikkim ? 1420 : 2100),
      villages_exposed: selectedZone?.villages_exposed || authAOI?.associatedAssets.settlements.map(s => s.name) || (isSikkim ? ['Dikchu Basti', 'Lower Singtam', 'Melli Colony'] : ['Jatinga Valley Settlement', 'Lower Haflong Railway Colony']),
      roads_affected: selectedZone?.roads_affected || authAOI?.associatedAssets.roads.map(r => r.name) || (isSikkim ? ['NH-10 Teesta Lifeline Road (KM 18-24)', 'Dikchu Bridge Approach'] : ['NH-27 East-West Corridor', 'Lumding-Badarpur Railway Line']),
      critical_facilities: selectedZone?.critical_facilities_affected || authAOI?.associatedAssets.facilities.map(f => f.name) || (isSikkim ? ['Singtam Hydro Power Substation', 'Dikchu Primary Health Sub-Centre'] : ['Haflong Civil Hospital Access', 'Railway Traction Substation']),
      threatened_bridges: authAOI?.associatedAssets.bridges.map(b => b.name) || (isSikkim ? ['Dikchu River Bridge'] : ['Diyung River Railway Span', 'Haflong Valley Viaduct']),
      time_offset_min: timeOffset
    });
  }, [selectedZone, selectedState, weather, timeOffset, isSikkim]);

  const riskScore = activeZoneAnalysis.riskScore;
  const currentRiskLevel = activeZoneAnalysis.riskLevel;

  // Landslide Risk Forecast Timeline Series (Calculated dynamically with rainfall scaling)
  const riskForecastSteps = React.useMemo(() => {
    const baseRain1h = weather?.rainfall1hMm || (isSikkim ? 34.2 : 28.5);
    const baseRain72h = weather?.rainfall72hMm || (isSikkim ? 185.0 : 142.0);

    const stepsConfig = [
      { label: 'Current', mult1h: 1.0, mult72h: 1.0, offsetMin: 0, summary: isSikkim ? 'Pore pressure elevated' : 'Disang shale saturated' },
      { label: '+3h', mult1h: 1.2, mult72h: 1.1, offsetMin: 30, summary: isSikkim ? 'Continued saturation' : 'Pore pressure surge' },
      { label: '+6h', mult1h: 1.4, mult72h: 1.2, offsetMin: 60, summary: isSikkim ? 'Debris flow probable' : 'Shoulder slip risk' },
      { label: '+12h', mult1h: 1.1, mult72h: 1.15, offsetMin: 120, summary: isSikkim ? 'Slow drainage' : 'Moderate runoff' },
      { label: '+24h', mult1h: 0.7, mult72h: 0.9, offsetMin: 180, summary: isSikkim ? 'Gradual stabilization' : 'Stabilizing trend' }
    ];

    return stepsConfig.map(s => {
      const stepRain1h = Math.round(baseRain1h * s.mult1h * 10) / 10;
      const stepRain72h = Math.round(baseRain72h * s.mult72h * 10) / 10;

      const stepOut = InterpretableRiskEngine.evaluateRisk({
        zoneId: selectedZone?.id || (isSikkim ? 'sikkim-nh10-dikchu' : 'assam-dima-hasao-haflong'),
        state: selectedState,
        slope_deg: selectedZone?.slope_deg ?? (isSikkim ? 34.8 : 36.2),
        soil_moisture_pct: selectedZone?.soil_moisture_pct ?? (isSikkim ? 84.0 : 88.0),
        rainfall_1h_mm: stepRain1h,
        rainfall_72h_mm: stepRain72h,
        historical_events_5y: selectedZone?.historical_events_5y ?? (isSikkim ? 5 : 4),
        lithology: selectedZone?.lithology || (isSikkim ? 'Weathered Biotite Gneiss & Quartz-Mica Schist' : 'Fractured Disang Shale & Fine Sandstone'),
        time_offset_min: s.offsetMin
      });

      return {
        label: s.label,
        rain: stepRain1h,
        riskScore: stepOut.riskScore,
        level: stepOut.riskLevel,
        summary: s.summary
      };
    });
  }, [weather, selectedZone, selectedState, isSikkim]);

  // Dynamic Response Priorities
  const responsePriorities = isSikkim ? [
    {
      id: 'RP-SK-01',
      rank: 1,
      target: 'NH-10 (KM 19 Dikchu-Singtam)',
      threatLevel: 'CRITICAL',
      recommendedAction: 'Field inspection required; prepare traffic diversion via NH-717A Pakyong.',
      leadAgency: 'BRO / Sikkim Police',
      status: 'Action Required'
    },
    {
      id: 'RP-SK-02',
      rank: 2,
      target: 'Dikchu (Mile 14 Settlement)',
      threatLevel: 'HIGH',
      recommendedAction: 'Verify slope condition; check tension cracks on upper hillside.',
      leadAgency: 'SDRF Pakyong',
      status: 'Field Inspection'
    },
    {
      id: 'RP-SK-03',
      rank: 3,
      target: 'Singtam (Indreni Bridge Abutment)',
      threatLevel: 'HIGH',
      recommendedAction: 'Continue monitoring river head and culvert discharge.',
      leadAgency: 'NHPC / Irrigation Dept',
      status: 'Monitoring'
    },
    {
      id: 'RP-SK-04',
      rank: 4,
      target: 'Rangpo & Pakyong Bypass (NH-717A)',
      threatLevel: 'MODERATE',
      recommendedAction: 'Maintain bypass readiness; inspect road drainage channels.',
      leadAgency: 'Sikkim PWD',
      status: 'Standby'
    }
  ] : [
    {
      id: 'RP-AS-01',
      rank: 1,
      target: 'NH-27 (Haflong Ghat Hill Corridor)',
      threatLevel: 'CRITICAL',
      recommendedAction: 'Field inspection required on rotational slump zone; regulate single-lane convoy.',
      leadAgency: 'Assam PWD / NHAI',
      status: 'Action Required'
    },
    {
      id: 'RP-AS-02',
      rank: 2,
      target: 'NF Railway Lumding-Badarpur Cut-Slope',
      threatLevel: 'HIGH',
      recommendedAction: 'Inspect track ballast drainage and rockfall safety nets.',
      leadAgency: 'NFR Engineering Wing',
      status: 'Field Inspection'
    },
    {
      id: 'RP-AS-03',
      rank: 3,
      target: 'Haflong Civil Hospital Access Road',
      threatLevel: 'HIGH',
      recommendedAction: 'Clear culvert sediment runoff to preserve emergency ambulance access.',
      leadAgency: 'Dima Hasao Civil Defense',
      status: 'Monitoring'
    }
  ];

  // Field Reports List
  const fieldReportsList = isSikkim ? [
    {
      id: 'INC-2026-0917',
      location: 'NH-10 / KM 19 (Dikchu Sector)',
      reportType: 'Road obstruction & tension crack',
      timestamp: '13:16 IST',
      verificationStatus: 'Pending',
      source: 'BRO Sector Ranger',
      detail: '8cm tension crack detected along outer road shoulder following 34mm rainfall.'
    },
    {
      id: 'INC-2026-0914',
      location: 'Singtam Indreni Suspension Bridge',
      reportType: 'Debris seepage from culvert',
      timestamp: '12:44 IST',
      verificationStatus: 'Verified',
      source: 'Ward Field Observer',
      detail: 'Heavy silt runoff exiting drainage outlet; bridge footing clear.'
    },
    {
      id: 'INC-2026-0911',
      location: 'Upper Martam Ridge Valley Sector',
      reportType: 'Roadside ditch seepage',
      timestamp: '11:15 IST',
      verificationStatus: 'Verified',
      source: 'Gram Panchayat Monitor',
      detail: 'Minor colluvial seepage entering roadside culvert; road clear and open.'
    }
  ] : [
    {
      id: 'INC-2026-0882',
      location: 'NH-27 / Haflong Ghat Corridor',
      reportType: 'Rotational shoulder slump',
      timestamp: '11:20 IST',
      verificationStatus: 'Verified',
      source: 'Assam Highway Patrol',
      detail: 'Single-lane traffic operating under convoy supervision; clearing crew deployed.'
    },
    {
      id: 'INC-2026-0879',
      location: 'Jatinga Valley Approach Road',
      reportType: 'Minor rockfall debris on shoulder',
      timestamp: '09:40 IST',
      verificationStatus: 'Resolved',
      source: 'PWD Patrol Unit',
      detail: 'Loose sandstone boulders cleared into shoulder ditch.'
    },
    {
      id: 'INC-2026-0875',
      location: 'NF Railway Lumding-Badarpur KM 44',
      reportType: 'Trackside drainage overflow',
      timestamp: '08:30 IST',
      verificationStatus: 'Pending',
      source: 'NFR Track Patrol',
      detail: 'Ballast silt accumulation observed during inspection patrol; maintenance alert issued.'
    }
  ];

  // Sensor Stats
  const sensorStats = isSikkim ? {
    totalNodes: 24,
    onlineNodes: 22,
    warningNodes: 3,
    criticalNodes: [
      { id: 'SN-DKC-04', type: 'Vibrating Wire Piezometer', location: 'Dikchu Toe Slope', val: '142 kPa', status: 'Elevated', normal: '< 85 kPa', lastPing: '13:18 IST' },
      { id: 'SN-SGT-02', type: 'Biaxial MEMS Tiltmeter', location: 'Singtam Indreni Abutment', val: '4.8°/hr', status: 'Warning', normal: '< 1.5°', lastPing: '13:19 IST' },
      { id: 'SN-NH10-09', type: 'TDR Soil Moisture Probe', location: 'NH-10 KM 19 Cut', val: '86% Saturation', status: 'High', normal: '< 65%', lastPing: '13:15 IST' },
      { id: 'SN-AWS-IMD', type: 'Optical Pluviometer', location: 'Singtam AWS Station', val: '38.4 mm/hr', status: 'Active', normal: '< 15 mm/hr', lastPing: '13:20 IST' }
    ]
  } : {
    totalNodes: 18,
    onlineNodes: 17,
    warningNodes: 2,
    criticalNodes: [
      { id: 'SN-HFL-01', type: 'Piezometer Probe', location: 'Haflong Ghat Slump', val: '128 kPa', status: 'Elevated', normal: '< 80 kPa', lastPing: '13:14 IST' },
      { id: 'SN-NFR-03', type: 'Tiltmeter Node', location: 'Railway Cut KM 42', val: '3.9°/hr', status: 'Warning', normal: '< 1.5°', lastPing: '13:16 IST' },
      { id: 'SN-TDR-AS02', type: 'TDR Soil Moisture Sensor', location: 'Haflong Valley Ridge', val: '88% Saturation', status: 'High', normal: '< 65%', lastPing: '13:17 IST' },
      { id: 'SN-AWS-HFL', type: 'IMD Rain Gauge', location: 'Haflong Town Station', val: '42.0 mm/hr', status: 'Active', normal: '< 15 mm/hr', lastPing: '13:20 IST' }
    ]
