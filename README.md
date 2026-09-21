# EPOCH

Earth Observation / Himalayan Disaster Command Center for bitemporal satellite imagery comparison, structural damage assessment, and operational disaster decision-support.

---

## Project Overview

**EPOCH** (Earth Observation / Himalayan Disaster Command Center) is an operational-style disaster assessment and decision-support platform designed for high-altitude and mountainous disaster zones. By comparing pre- and post-disaster Earth observation (EO) satellite imagery, EPOCH executes bitemporal change detection to identify critical shifts in built-up infrastructure and land surfaces. The platform assesses structural damage, assigns four-tier damage classifications, and incorporates operator-in-the-loop human verification through an operational Truth Loop. Alongside damage assessment, EPOCH maintains a decoupled risk intelligence matrix that fuses historical disaster records, terrain morphology, and environmental telemetry to deliver actionable situational awareness for emergency authorities.

---

## Problem Statement

During sudden-onset natural disasters in rugged mountainous terrains—such as landslides, flash floods, and debris flows—initial damage assessment is often severely delayed. Ground access is cut off by severed road corridors, and manual structural inspection across large geographical regions is slow, resource-intensive, and hazardous. Traditional satellite image evaluation relies on manual visual interpretation, creating critical bottlenecks in early disaster response. EPOCH addresses this challenge by providing automated, bitemporal satellite image comparison, rapid structural damage screening, operator validation workflows, and contextual risk intelligence to accelerate emergency relief prioritization.

---

## Objectives

| Objective | Description |
| :--- | :--- |
| **Bitemporal Analysis** | Ingest and align pre-disaster (baseline) and post-disaster (evidence) satellite imagery over targeted Areas of Interest (AOIs). |
| **Change Detection** | Identify meaningful spatial, spectral, and radar backscatter changes across built-up areas and terrain corridors. |
| **Building Assessment** | Detect and analyse affected structures, transportation networks, and critical community assets. |
| **Damage Classification** | Categorize affected structures into standard four-level damage grades: *Destroyed*, *Major Damage*, *Minor Damage*, and *No Damage*. |
| **Verification** | Provide operator-in-the-loop validation tools (Truth Loop) for disaster analysts to verify, refine, or override automated predictions. |
| **Risk Intelligence** | Compute contextual vulnerability, exposure, and isolation risk matrices using observed and historical evidence. |
| **History** | Maintain an audit-ready historical database of disaster events, past classifications, and ground-truth validations. |
| **Visualization** | Deliver synchronized operational dashboards, 2D/3D GIS views, satellite split-view comparisons, and explainable AI insights. |

---

## Core Workflow

```text
OBSERVE → COMPARE → DETECT → CLASSIFY → VERIFY → PRIORITIZE → REPORT → LEARN
```

| Stage | Operation | Input | Output / Action |
| :--- | :--- | :--- | :--- |
| **1. OBSERVE** | Ingest Earth observation data and telemetry | Optical/SAR imagery (Sentinel-1/2, CDSE), weather feeds | Calibrated pre- and post-event scene datasets |
| **2. COMPARE** | Align and coregister bitemporal datasets | Pre-event baseline + post-event acquisition | Coregistered bitemporal image pair |
| **3. DETECT** | Compute spatial & spectral change anomalies | Image pair difference, coherence drop, NDVI/NDWI shifts | Significant change masks and bounding clusters |
| **4. CLASSIFY** | Grade structural and infrastructural damage | Segmented footprints & damage feature extractors | Four-tier damage classes with confidence scores |
| **5. VERIFY** | Human review & field ground-truth validation | Automated classification + field inspection reports | Operator-approved / adjusted assessment record |
| **6. PRIORITIZE** | Calculate exposure and emergency impact priority | Verified damage + asset exposure + isolation forecast | Priority-ranked critical sectors and assets |
| **7. REPORT** | Generate command briefings and SOP alerts | Synthesized incident metrics and response directives | Multilingual alerts, SOP action plans, summary reports |
| **8. LEARN** | Update risk baselines and model performance | Ground-truth verification audits (Truth Loop) | Updated historical intelligence and calibrated weights |

---

## System Architecture

```text
       +---------------------------------------------+
       |   Pre-Disaster Imagery (Baseline Scene)     |
       |                      +                      |
       |   Post-Disaster Imagery (Evidence Scene)    |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |         Bitemporal Change Detection         |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |        Built-up / Building Analysis         |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |         Damage Feature Extraction           |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |            Damage Classification            |
       |    (Destroyed / Major / Minor / None)       |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |          Confidence Score Generation        |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |       Human Operator Verification Loop      |
       |            (Truth Loop Validation)          |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |      Damage Map + Statistics + Report       |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |    Risk Matrix + Historical Intelligence    |
       +---------------------------------------------+
```

> **Architectural Separation Note**:  
> The **Damage Assessment Engine** and the **Risk Matrix** are strictly decoupled architectural components:
> * **Damage Assessment**: Answers *"What physical changes and structural damage occurred during the event?"*
> * **Risk Matrix**: Answers *"What does the combined structural, terrain, environmental, and historical evidence indicate about current and forward-looking vulnerability/risk?"*
> 
> The Risk Matrix consumes the outputs of the damage assessment engine alongside historical records and terrain telemetry without altering the core damage classification logic.

---

## Damage Classes

| Class | Meaning | Visual Indicator | Operational Impact |
| :--- | :--- | :--- | :--- |
| **Destroyed** | Severe structural loss / structure largely absent, collapsed, or severely altered | <span style="color:#E53E3E;font-weight:bold;">🔴 Red</span> | Immediate search-and-rescue prioritization; complete rebuild required. |
| **Major Damage** | Significant structural failure or partial collapse; structure remains detectable | <span style="color:#DD6B20;font-weight:bold;">🟠 Orange</span> | Uninhabitable; structural shoring and emergency evacuation required. |
| **Minor Damage** | Limited or localized superficial/non-structural damage; core structure intact | <span style="color:#D69E2E;font-weight:bold;">🟡 Yellow</span> | Habitable with restrictions; secondary assessment scheduled. |
| **No Damage** | No significant spatial or structural change detected relative to baseline | <span style="color:#38A169;font-weight:bold;">🟢 Green</span> | Safe; operational asset available for relief staging or shelter. |

---

## Main Modules

| Module | Purpose | Status in Repository |
| :--- | :--- | :--- |
| **Control Room** | Main operational dashboard with real-time sector telemetry, weather integration, and alert triage | **CURRENT (Implemented)** |
| **Before/After Imagery** | Satellite-image inspection with split-view comparison and CDSE catalogue integration | **CURRENT / EVOLVING (Implemented prototype)** |
| **Change Detection** | Bitemporal optical and SAR anomaly detection algorithms | **IN DEVELOPMENT (Prototype simulated)** |
| **Assessment Engine** | Automated structural feature extraction and building damage scoring | **IN DEVELOPMENT (Modular interface ready)** |
| **Classification Engine** | Four-tier damage classification pipeline with confidence grading | **IN DEVELOPMENT (Target for M1 engine)** |
| **Human Verification** | Operator validation console (Truth Loop) for auditing predictions against field reports | **CURRENT (Implemented prototype)** |
| **Damage Map** | Spatial damage layer rendering, risk sector boundaries, and asset markers | **EXISTING (Frozen during dashboard dev)** |
| **Risk Matrix** | Decoupled susceptibility, exposure, and response priority calculation engine | **CURRENT (Implemented in FastAPI / TS)** |
| **History** | Event-based historical disaster catalog with spatial filtering and impact records | **CURRENT (Implemented prototype)** |
| **3D Earth View** | Terrain elevation, hillshade, and 3D GIS visualization via Three.js / Cesium integration | **CURRENT / EVOLVING (Implemented prototype)** |
| **Control Room Report** | Comprehensive on-screen assessment summaries, SOP generation, and exportable briefs | **CURRENT (Implemented prototype)** |

---

## Current EPOCH Scenario

| Field | Value |
| :--- | :--- |
| **Primary Region** | Sikkim, India (Eastern Himalayas) |
| **Demonstration Corridor** | National Highway 10 (NH-10) Arterial Lifeline |
| **Example Corridor** | Melli → Rangpo → Singtam → Ranipool → Gangtok → Dikchu → Mangan |
| **Primary Concept** | Post-disaster structural damage assessment & landslide isolation intelligence |
| **Demonstration Type** | High-fidelity synthetic & live prototype demonstration |
| **Map Status** | Existing map frozen during dashboard development (modifications strictly controlled) |

---

## Risk Matrix

The **Risk Matrix** is deliberately decoupled from post-event damage classification:

* **Damage Assessment**: *"What changed after the event?"* (Direct physical observation of before-and-after imagery).
* **Risk Matrix**: *"What does current + historical evidence indicate about vulnerability and risk context?"* (Multi-criteria decision support for emergency managers).

```text
Risk Context = Susceptibility(Terrain, Rainfall, Soil Moisture) × Exposure(Population, Assets, Roads) × Vulnerability(Historical Frequency)
```

### Potential Inputs to the Risk Matrix

* **Image-derived features**: Detected change polygons, coherence drop sectors, and footprint disruption indices.
* **Built-up change**: Relative change percentage across settlement clusters and industrial facilities.
* **Structural change**: Aggregated damage severity across essential lifelines.
* **Observed damage**: Field reports and verified ground-truth incidents.
* **Historical damage**: Past landslide and flash flood frequency from geological inventories.
* **Terrain / Environmental context**: Slope angles, digital elevation models (DEM), lithology, and rainfall accumulation.
* **Event history**: Severity and recurrence intervals of antecedent events.

---

## Historical Intelligence

EPOCH stores disaster event histories to contextualize current assessments and train predictive susceptibility engines over time.

| Stored Information | Purpose |
| :--- | :--- |
| **Place** | Geographic location, administrative district, and highway chainage identifier |
| **Date** | Exact timestamp and chronological event timeline |
| **Disaster Type** | Hazard classification (Landslide, Flash Flood, Debris Flow, Rockfall, Mudslide) |
| **Before Image** | Pre-event baseline optical/SAR reference scene |
| **After Image** | Post-event evidence scene capturing impact footprint |
| **Damage Results** | Historical structural damage classifications and affected asset counts |
| **Risk Summary** | Pre-event susceptibility score and post-event impact index |
| **Verification** | Operator validation status (Confirmed, Disproved, Under Inspection) |

---

## Technology Stack

The following technologies are actively implemented and configured in the repository:

| Layer | Technology | Repository Reference |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 (`react` 19.2.8, `react-dom` 19.2.8) | `frontend/package.json` |
| **Language (Web)** | TypeScript (`~6.0.2`), JavaScript (ES Modules) | `frontend/tsconfig.json` |
| **Language (Core/API)** | Python 3.10+ | `backend/requirements.txt` |
| **Build & Bundler** | Vite 8 (`vite` 8.2.2, `@vitejs/plugin-react`) | `frontend/vite.config.ts` |
| **Styling** | Tailwind CSS 3.4 (`tailwindcss` 3.4.19, `postcss`, `autoprefixer`) | `frontend/tailwind.config.js` |
| **2D Mapping** | OpenStreetMap / Leaflet / Custom Canvas Viewports | `frontend/src/components/commandcenter/` |
| **3D Earth Visualization** | Three.js (`three` 0.185.1), Cesium (`cesium` 1.145.0, `vite-plugin-cesium`) | `frontend/src/components/map3d/` |
| **Charts & Analytics** | Recharts (`recharts` 3.10.1), Lucide Icons (`lucide-react` 1.40.0) | `frontend/src/components/` |
| **Backend Framework** | FastAPI (`fastapi` >= 0.100.0), Pydantic (`pydantic` >= 2.0.0) | `backend/app/main.py` |
| **ASGI Server** | Uvicorn (`uvicorn` >= 0.22.0) | `backend/app/main.py` |
| **Database & GIS Schema** | PostgreSQL 15+ with PostGIS 3.3+ (SQL schema ready) / In-memory & JSON file fallback | `database/schema.sql`, `backend/app/` |
| **EO & External APIs** | Copernicus CDSE OData API (Sentinel-1/2), Open-Meteo, IMD (Simulated) | `backend/app/services/copernicus_service.py` |
| **Deployment Configuration** | Vercel (Frontend & Serverless Backend configuration), Bash launcher (`run_epoch.sh`) | `vercel.json`, `run_epoch.sh` |

---

## Data / EO Context

| Data Source | Status in Project | Implementation Details |
| :--- | :--- | :--- |
| **Sentinel-1 (C-SAR)** | **Implemented** | Live query client for Copernicus Data Space Ecosystem (CDSE) OData catalogue searching GRD/SLC scenes, temporal baseline calculation, and synthetic coherence drop fallback. |
| **Sentinel-2 (MSI Optical)** | **Implemented** | Bounding box querying via CDSE API; optical demonstration imagery and cloud cover filtering. |
| **ISRO / NRSC / Bhuvan** | **Referenced** | Cartosat high-resolution DEM references, Bhuvan WMS endpoint interfaces, and mock ingestion adapters. |
| **GSI (Geological Survey of India)** | **Referenced** | National Landslide Susceptibility Mapping (NLSM) inventory schemas and historical incident mock data. |
| **IMD (India Meteorological Department)** | **Referenced / Synthetic** | Automatic Weather Station (AWS) telemetry schemas and Doppler radar rainfall intensity simulation. |
| **DEM / Elevation Models** | **Implemented / Derived** | Slope angles, curvature, and elevation matrices integrated into the susceptibility calculator and 3D terrain viewer. |

---

## Repository Structure

```text
EPOCH-R2/
├── backend/
│   ├── app/
│   │   ├── api/endpoints.py       # FastAPI routing for telemetry, risk, Copernicus, alerts, sync
│   │   ├── geospatial/            # Spatial data loaders and GeoJSON serializers
│   │   ├── models/schemas.py      # Pydantic request/response validation schemas
│   │   ├── prediction/            # Temporal nowcasting (0–3h forward simulation)
│   │   ├── risk_engine/           # Landslide susceptibility & response priority calculator
│   │   ├── services/              # Copernicus CDSE, SMS gateway orchestrator, offline sync service
│   │   └── main.py                # FastAPI entrypoint and CORS middleware configuration
│   ├── requirements.txt           # Python backend dependencies
│   └── .env.example               # Backend environment variable template
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── commandcenter/     # Mission control, OpenWeather dashboard, OSM map viewer
│   │   │   ├── field/             # PWA Field Reporting workflow for emergency responders
│   │   │   ├── map3d/             # 3D Earth terrain visualizer (Three.js & Cesium)
│   │   │   ├── truthloop/         # Human verification console and prediction auditing
│   │   │   ├── infrastructure/    # Road connectivity and isolation intelligence
│   │   │   ├── response/          # SOP generation and NDRF/SDRF mobilization guides
│   │   │   ├── views/             # Satellite, Alert Center, Historical, Risk Intelligence views
│   │   │   └── layout/            # Sticky header, navigation ribbon, pipeline status bar
│   │   ├── data/                  # Synthetic hazard datasets, AOI registry, causes pack
│   │   ├── services/              # Client-side API adapters, offline queue, weather services
│   │   ├── App.tsx                # Main view router and global state orchestrator
│   │   └── index.css              # Custom design tokens, typography, and styling
│   ├── package.json               # Node.js dependencies and build scripts
│   └── vite.config.ts             # Vite build and Cesium plugin configuration
├── database/
│   └── schema.sql                 # PostGIS spatial database schema (9 relational tables)
├── data/                          # Backend synthetic and raw reference datasets
├── run_epoch.sh                   # Single-command startup script (FastAPI + Vite)
├── vercel.json                    # Full-stack serverless deployment configuration
└── README.md                      # Comprehensive project documentation
```

---

## Features

### Implemented (Working Now)

* **Mission Control Dashboard**: Real-time sector telemetry, weather alert bands, and situational summaries.
* **8 North Eastern States Coverage**: Full regional coverage with deep-dive focus on Sikkim's NH-10 corridor.
* **Risk & Susceptibility Engine**: Physics-inspired multi-factor susceptibility scoring (rainfall, slope, soil moisture, lithology, history).
* **Copernicus CDSE Integration**: Live Sentinel-1 SAR and Sentinel-2 optical metadata search with baseline estimation.
* **Operator Truth Loop**: Human-in-the-loop verification interface for auditing model predictions against field evidence.
* **Field PWA Mobile Mode**: Offline incident capture with GPS coordinates, photos/videos, and conflict-resolution sync.
* **Multilingual Alert Generation**: Dynamic hazard broadcasts in English, Hindi, Assamese, and Bengali.
* **Road Connectivity Intelligence**: 0–3 hour road blockage and community isolation forecasting.
* **3D Earth Terrain Viewer**: Interactive 3D terrain rendering of Himalayan corridors.
* **Historical Landslide Catalog**: Queryable historical incident database with damage records.

### In Development (Actively Being Built)

* **Automated Bitemporal Change Detection**: Machine-learning pipeline for automatic optical and SAR pixel differencing.
* **Structural Damage Assessment Engine**: Automated polygon segmentation and structural alteration extraction.
* **Four-Tier Classification Pipeline**: Automated mapping of change features to Destroyed / Major / Minor / No Damage.
* **Automated Post-Disaster Briefing Cards**: PDF and Common Alerting Protocol (CAP-CP) XML report auto-generation.

### Planned (Future Capabilities)

* **Advanced M1 Engine Integration**: Full integration of specialized deep-learning vision models for high-resolution satellite imagery.
* **Live InSAR Coherence Phase Unwrapping**: Near-real-time interferometric processing pipeline for millimeter-scale ground displacement.
* **Drone / UAV Image Ingestion**: Edge ingestion of high-resolution aerial imagery for rapid damage validation.
* **Authoritative API Connectors**: Direct enterprise connectors for live IMD AWS and GSI Bhukosh portals.

---

## Demo Flow

| Step | Action | Description |
| :---: | :--- | :--- |
| **1** | **Select disaster event** | Choose an active disaster scenario (e.g., Sikkim NH-10 Dikchu corridor) from the region selector. |
| **2** | **Load before/after imagery** | Ingest pre-event baseline and post-event satellite observations via the Satellite Intelligence module. |
| **3** | **Run assessment** | Trigger the bitemporal structural change evaluation and feature extraction pipeline. |
| **4** | **Detect changes** | Review automated spatial difference masks and SAR coherence loss anomalies. |
| **5** | **Analyse structures** | Inspect affected building footprints, bridges, and critical transportation links. |
| **6** | **Classify damage** | Evaluate four-tier classifications (*Destroyed*, *Major*, *Minor*, *No Damage*) with confidence scores. |
| **7** | **Verify results** | Open the Truth Loop console to confirm, adjust, or disprove automated damage tags. |
| **8** | **Calculate risk context** | Compute connected risk matrices combining structural damage, slope, rainfall, and isolation forecasts. |
| **9** | **View report** | Inspect the synthesized Control Room report and review recommended SOP response directives. |
| **10** | **Save event to history** | Commit verified assessment records and ground truth to the persistent historical database. |

---

## Damage Assessment Output

The structural damage assessment engine produces standardized assessment records structured as follows:

| Field | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| **Structure ID** | `string` | Unique identifier for the individual structure or asset | `"BLD-SKM-DKC-0482"` |
| **Geometry** | `GeoJSON` | Point or Polygon boundary geometry in EPSG:4326 | `{"type": "Polygon", "coordinates": [...]}` |
| **Change Score** | `float` | Normalized degree of detected spatial/spectral change (0.00 – 1.00) | `0.874` |
| **Damage Class** | `enum` | Four-level classification (`DESTROYED`, `MAJOR`, `MINOR`, `NO_DAMAGE`) | `"DESTROYED"` |
| **Confidence** | `float` | Statistical confidence of the classification model (0.00 – 1.00) | `0.932` |
| **Evidence** | `object` | Extracted features supporting classification | `{"coherence_drop": 0.42, "footprint_loss_pct": 82}` |
| **Verification** | `enum` | Operator validation status (`PENDING`, `VERIFIED`, `REJECTED`) | `"VERIFIED"` |

---

## Deployment

### Prerequisites

* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher
* **Python**: v3.10 or higher
* **pip**: v22.0 or higher

### Environment Setup

1. Clone the repository and navigate to the project root:
   ```bash
   git clone <YOUR_REPOSITORY_URL>
   cd EPOCH-R2
   ```

2. Configure backend environment variables:
   ```bash
   cp backend/.env.example backend/.env
   ```

3. Configure frontend environment variables (if required):
   ```bash
   cp frontend/.env.example frontend/.env
   ```

> [!CAUTION]
> **Environment Safety Warning**:  
> Never commit `.env` files or hardcode API keys, tokens, or credentials into the repository. All credential variables are optional; EPOCH automatically falls back to safe demonstration simulation mode if credentials are omitted.

### Local Development (Single Command)

Run the automated startup script from the project root:

```bash
chmod +x run_epoch.sh
./run_epoch.sh
```

* **Frontend Application**: [http://localhost:5173](http://localhost:5173)
* **FastAPI Backend Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Backend Health Check**: [http://localhost:8000/](http://localhost:8000/)

### Manual Service Execution

If running services in separate terminals:

```bash
# Terminal 1: Backend
cd backend
python3 -m pip install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

### Production Build

To validate and build the production bundle:

```bash
cd frontend
npm run build
```

The production assets will be output to `frontend/dist/`.

---

## Git Workflow

Recommended Git setup and initial commit workflow:

```bash
# 1. Initialize Git repository (if not already initialized)
git init

# 2. Stage all project files
git add .

# 3. Create initial commit
git commit -m "Initial EPOCH prototype"

# 4. Set default branch to main
git branch -M main

# 5. Link to your remote GitHub repository
git remote add origin <YOUR_REPOSITORY_URL>

# 6. Push to remote repository
git push -u origin main
```

*(Replace `<YOUR_REPOSITORY_URL>` with your actual Git/GitHub repository URL).*

---

## Team Development Rules

| Rule | Requirement |
| :--- | :--- |
| **Existing Map** | **Do not modify** existing maps, map data, logic, or map styling until explicitly approved. |
| **EPOCH Logo** | **Keep intact**; preserve original branding, wordmarks, and visual identity. |
| **UI Design System** | **Preserve established visual identity**; adhere to existing color tokens, typography, and layout. |
| **Engine Modularity** | **Keep engine interfaces modular** so external models (e.g., M1 engine) can integrate cleanly. |
| **Damage vs Risk** | **Keep strictly separate**; do not mix physical damage observation with contextual risk scores. |
| **Demo Data** | **Clearly identify synthetic/demo data** in UI badges, captions, and API response tags. |
| **Secrets & Keys** | **Never commit credentials**, OAuth tokens, API secrets, or private environment files. |
| **Code Stability** | **Avoid unnecessary refactoring** of existing, functional application modules. |

---

## Roadmap

1. **Dashboard Foundation** — Deliver real-time operational mission control with multi-state telemetry and risk indicators.
2. **Internal Damage Assessment Engine** — Establish baseline bitemporal image alignment and change detection interfaces.
3. **Damage Classification** — Implement four-level damage grading (*Destroyed*, *Major*, *Minor*, *No Damage*) with confidence scoring.
4. **Human Verification** — Expand the Truth Loop console for operator validation, dispute resolution, and audit tracking.
5. **Risk Matrix** — Refine multi-criteria susceptibility and impact priority algorithms.
6. **Historical Intelligence** — Build a persistent, queryable historical archive of disaster events and past validations.
7. **3D Earth Observation** — Enhance Three.js and Cesium 3D terrain visualization for steep mountainous topography.
8. **Advanced M1 Engine Integration** — Plug in deep-learning vision models for automated high-resolution satellite inference.
9. **Final Map Enhancement** — Integrate approved high-fidelity spatial overlays and vector damage layers.
10. **Competition-Ready Validation** — Conduct end-to-end operational stress-testing and demonstration validation.

---

## Important Disclaimer

> [!IMPORTANT]
> **Operational Use Disclaimer**:  
> All automated outputs, damage classifications, and susceptibility indices generated within this prototype are intended for demonstration and decision-support exploration. Demonstration datasets contain synthetic and derived scenarios. All automated damage assessments must undergo authoritative human verification and ground-truth validation prior to operational disaster-response dispatch.

---

## Contributors

* **EPOCH Engineering Team** — *System architecture, frontend dashboard, backend API, and geospatial pipelines.*

---

## License

License: To be determined.
