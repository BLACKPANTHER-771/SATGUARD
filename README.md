# EPOCH: AI-Powered Landslide Early-Warning & Disaster Decision-Support System
**Smart India Hackathon (SIH 2026) Prototype | Problem Statement SIH26001**  
*AI-Based Early Warning and Landslide Risk Monitoring System in the North Eastern Region*

---

## 🛰️ 1. Product Positioning

**EPOCH** is an AI-powered landslide early-warning and disaster decision-support system that converts environmental signals and field evidence into actionable risk intelligence.

```
Government Data (IMD, GSI, CWC, Survey of India, ISRO)
      ↓
EPOCH Intelligence (Physics Susceptibility, 0-3h Nowcast, XAI, InSAR Coherence)
      ↓
Decision Support (DDMA / SEOC / Field Officers / Community Early Warning)
```

Core loop: **OBSERVE → PREDICT → VERIFY → PRIORITIZE → WARN → RESPOND → LEARN**

---

## 🚀 2. Signature Feature: "RISK → IMPACT → ACTION"

1. **STEP 1 — RISK**: Why is this zone dangerous? (Simulated factor contributions: Rainfall 38%, Slope 29%, Soil Moisture 18%, Historical 9%, Lithology 6%).
2. **STEP 2 — IMPACT**: Who and what is exposed? (`Landslide Risk × Exposure × Vulnerability = Impact Priority`).
3. **STEP 3 — ACTION**: What should the authority do now? (Recommended actions: Traffic diversion, evacuation preparation, SDRF pre-positioning, CAP emergency broadcast).

---

## 🗺️ 3. Full Coverage of All 8 North Eastern States

- **Sikkim** (★ Primary Showcase Scenario: Dikchu / Singtam NH-10 Corridor, Mangan, Chungthang, Gangtok)
- **Assam** (Dima Hasao Haflong Ghats, Lumding railway, Guwahati Nilachal, Cachar Kalain)
- **Meghalaya** (East Khasi Hills Sohra Rim, Shillong Bypass NH-6, Dawki Ghat)
- **Arunachal Pradesh** (Tawang Sela Pass NH-13, Bhalukpong West Kameng)
- **Mizoram** (Aizawl Hunthar Veng Highway, Lunglei Escarpment)
- **Nagaland** (Kohima - Dimapur NH-29, Mokokchung Hill Sector)
- **Manipur** (Imphal - Jiribam NH-37, Noney Tupul Railway Sector)
- **Tripura** (Baramura Hill Range NH-8, Jampui Ridge)

---

## 📋 4. Five Required PS Input Data Categories (Dedicated Module)

- **Rainfall**: IMD Automatic Weather Station Network & Doppler Radar `[SYNTHETIC]` (Ready for IMD API).
- **Soil Moisture**: In-situ TDR Probe Network & SMAP/ISRO Inversion Model `[SYNTHETIC]` (Ready for CWC / Sensor telemetry).
- **Satellite Observation**: Sentinel-1 InSAR & RISAT-2B SAR Coherence Loss `[DERIVED]` (Ready for ISRO Bhuvan / Sentinel API).
- **Terrain / Slope**: Cartosat-3 High Resolution DEM Mesh `[DERIVED]` (Ready for Survey of India DEM).
- **Historical Landslide Records**: Geological Survey of India (GSI) NLSM Inventory `[GOVERNMENT DATA - MOCKED]` (Ready for GSI Bhukosh).

---

## 🛣️ 5. Road Connectivity Intelligence & 0–3h Isolation Forecast

- Real-time road status: `OPEN`, `WATCH`, `AT_RISK`, `BLOCKED`.
- 0–3h predicted timeline: `NOW` → `+1 HOUR` → `+2 HOURS` → `+3 HOURS`.
- Detour route calculation, affected villages, and Connectivity Risk Index.

---

## 🌐 6. Multilingual Alert Center & Offline Low-Network PWA Mode

- **Multilingual Support**: Dynamic alert rendering in **English**, **Hindi (हिंदी)**, **Assamese (অসমীয়া)**, and **Bengali (বাংলা)**.
- **Offline / Low-Network Mode**: Local PWA storage queues reports, GPS coordinates, photos, and videos when offline with sync status indicators (`ONLINE`, `OFFLINE`, `SYNCING`, `SYNCED`).
- **Field Reporting**: Full support for GPS autofill, Photo upload, **VIDEO upload**, and PS incident types (`Crack`, `Slope Movement`, `Rockfall`, `Debris Flow`, `Mudslide`, `Landslide`, `Road Blockage`, `Other`) with Simulated Vision Analysis.

---

## 🚀 7. Quickstart & Single Execution Command

```bash
chmod +x run_epoch.sh
./run_epoch.sh
```

- **Frontend Dashboard**: [http://localhost:5173/](http://localhost:5173/)
- **FastAPI Backend Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
