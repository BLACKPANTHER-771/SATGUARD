-- ====================================================================
-- EPOCH DATABASE SCHEMA (PostgreSQL 15+ with PostGIS 3.3+)
-- Mission-Critical Landslide Early Warning & Decision Support System
-- North Eastern Region (NER), India - SIH PS SIH26001
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ADMINISTRATIVE & GEOSPATIAL BOUNDARIES
CREATE TABLE IF NOT EXISTS admin_regions (
    id VARCHAR(64) PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    district_name VARCHAR(100) NOT NULL,
    subdivision VARCHAR(100),
    geom GEOMETRY(MultiPolygon, 4326),
    population INTEGER DEFAULT 0,
    vulnerability_index NUMERIC(4, 2) DEFAULT 0.50, -- 0.00 to 1.00
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_regions_geom ON admin_regions USING GIST(geom);

-- 2. HIGH-RESOLUTION LANDSLIDE SUSCEPTIBILITY ZONES
CREATE TABLE IF NOT EXISTS risk_zones (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    elevation_m NUMERIC(7, 2) NOT NULL,
    slope_deg NUMERIC(5, 2) NOT NULL,
    aspect_deg NUMERIC(5, 2),
    curvature NUMERIC(6, 3),
    lithology VARCHAR(150),
    soil_type VARCHAR(150),
    soil_moisture_pct NUMERIC(5, 2) NOT NULL,
    rainfall_1h_mm NUMERIC(6, 2) NOT NULL,
    rainfall_24h_mm NUMERIC(6, 2) NOT NULL,
    rainfall_72h_mm NUMERIC(6, 2) NOT NULL,
    historical_event_count INTEGER DEFAULT 0,
    landslide_probability NUMERIC(4, 3) NOT NULL, -- 0.000 to 1.000
    confidence_score NUMERIC(4, 3) NOT NULL,
    risk_level VARCHAR(20) NOT NULL, -- 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'
    exposure_score NUMERIC(4, 2) NOT NULL,
    vulnerability_score NUMERIC(4, 2) NOT NULL,
    impact_priority NUMERIC(5, 2) NOT NULL, -- Probability * Exposure * Vulnerability * 100
    geom GEOMETRY(Polygon, 4326),
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_zones_geom ON risk_zones USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_risk_zones_risk_level ON risk_zones(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_zones_impact_priority ON risk_zones(impact_priority DESC);

-- 3. ROAD CORRIDORS & TRANSPORTATION INFRASTRUCTURE
CREATE TABLE IF NOT EXISTS road_corridors (
    id VARCHAR(64) PRIMARY KEY,
    highway_code VARCHAR(50) NOT NULL, -- e.g., 'NH-10', 'NH-27', 'NH-717A'
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    start_chainage_km NUMERIC(7, 2),
    end_chainage_km NUMERIC(7, 2),
    blockage_probability NUMERIC(4, 3) NOT NULL,
    status VARCHAR(30) DEFAULT 'OPEN', -- 'OPEN', 'RESTRICTED', 'BLOCKED', 'CLOSED'
    estimated_detour_km NUMERIC(6, 1),
    traffic_volume_daily INTEGER,
    geom GEOMETRY(LineString, 4326),
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_road_corridors_geom ON road_corridors USING GIST(geom);

-- 4. CRITICAL ASSETS & SETTLEMENTS
CREATE TABLE IF NOT EXISTS critical_assets (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL, -- 'VILLAGE', 'HOSPITAL', 'BRIDGE', 'SCHOOL', 'DAM', 'RELIEF_CAMP'
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    population_capacity INTEGER DEFAULT 0,
    threat_level VARCHAR(20) DEFAULT 'LOW',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_critical_assets_geom ON critical_assets USING GIST(geom);

-- 5. FIELD INCIDENT REPORTS & GROUND TRUTH
CREATE TABLE IF NOT EXISTS field_incidents (
    id VARCHAR(64) PRIMARY KEY,
    reported_at TIMESTAMPTZ NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    incident_type VARCHAR(50) NOT NULL, -- 'DEBRIS_FLOW', 'ROCKFALL', 'SLUMP', 'MUDSLIDE', 'SUBSIDENCE'
    severity VARCHAR(20) NOT NULL, -- 'LOW', 'MODERATE', 'SEVERE', 'CATASTROPHIC'
    road_blocked BOOLEAN DEFAULT FALSE,
    casualties INTEGER DEFAULT 0,
    infrastructure_damage_notes TEXT,
    photo_url VARCHAR(500),
    reporter_name VARCHAR(150),
    reporter_role VARCHAR(100), -- 'CITIZEN', 'DISTRICT_OFFICER', 'SDRF_COMMANDER', 'PWD_ENGINEER'
    verification_status VARCHAR(30) DEFAULT 'UNDER_INSPECTION', -- 'UNDER_INSPECTION', 'CONFIRMED', 'DISPROVED'
    ai_evidence_score NUMERIC(4, 3) DEFAULT 0.850,
    verified_by VARCHAR(150),
    verified_at TIMESTAMPTZ,
    geom GEOMETRY(Point, 4326)
);

CREATE INDEX IF NOT EXISTS idx_field_incidents_geom ON field_incidents USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_field_incidents_status ON field_incidents(verification_status);

-- 6. PREDICTION VS REALITY VERIFICATION AUDIT LOG (EPOCH TRUTH LOOP)
CREATE TABLE IF NOT EXISTS truth_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_date DATE NOT NULL,
    predicted_zone_id VARCHAR(64) REFERENCES risk_zones(id),
    predicted_probability NUMERIC(4, 3) NOT NULL,
    forecast_lead_hours INTEGER NOT NULL, -- 0, 1, 2, 3, 24, 72
    field_incident_id VARCHAR(64) REFERENCES field_incidents(id),
    outcome VARCHAR(30) NOT NULL, -- 'TRUE_POSITIVE', 'FALSE_POSITIVE', 'FALSE_NEGATIVE', 'TRUE_NEGATIVE', 'UNVERIFIED'
    brier_score NUMERIC(6, 4),
    sar_coherence_drop NUMERIC(5, 3), -- Satellite InSAR coherence metric
    reviewed_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. EARLY WARNING BROADCASTS & SOP DISPATCH
CREATE TABLE IF NOT EXISTS early_warnings (
    id VARCHAR(64) PRIMARY KEY,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    alert_level VARCHAR(20) NOT NULL, -- 'YELLOW_WATCH', 'ORANGE_ALERT', 'RED_EMERGENCY'
    headline VARCHAR(255) NOT NULL,
    target_districts TEXT[] NOT NULL,
    affected_roads TEXT[] NOT NULL,
    recommended_sops TEXT[] NOT NULL,
    cap_xml TEXT, -- Common Alerting Protocol payload
    ndrf_teams_notified INTEGER DEFAULT 0,
    broadcast_status VARCHAR(30) DEFAULT 'ACTIVE'
);

-- 8. SMS EMERGENCY DISPATCH RECIPIENTS & AUDIT LOG
CREATE TABLE IF NOT EXISTS sms_recipients (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone_e164 VARCHAR(30) NOT NULL,
    role VARCHAR(150) NOT NULL,
    aoi_id VARCHAR(64) REFERENCES risk_zones(id),
    preferred_language VARCHAR(10) DEFAULT 'en', -- 'en', 'hi', 'as', 'bn'
    enabled BOOLEAN DEFAULT TRUE,
    synthetic BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_notifications (
    id VARCHAR(64) PRIMARY KEY,
    alert_id VARCHAR(64) NOT NULL,
    aoi_id VARCHAR(64) REFERENCES risk_zones(id),
    recipient_id VARCHAR(64) REFERENCES sms_recipients(id),
    masked_phone VARCHAR(30) NOT NULL,
    language VARCHAR(10) NOT NULL,
    message_body TEXT NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'dry-run', 'generic-http', 'twilio', 'msg91'
    provider_status VARCHAR(50) NOT NULL,
    provider_message_id VARCHAR(100),
    status VARCHAR(30) NOT NULL, -- 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED', 'UNAVAILABLE'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failure_reason TEXT,
    dry_run BOOLEAN DEFAULT TRUE,
    attempt_number INTEGER DEFAULT 1,
    idempotency_key VARCHAR(150) UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sms_notifications_alert_id ON sms_notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_idempotency ON sms_notifications(idempotency_key);

-- 9. OFFLINE QUEUE SYNCHRONIZATION & IDEMPOTENCY REGISTRY
CREATE TABLE IF NOT EXISTS sync_operations (
    client_operation_id VARCHAR(100) PRIMARY KEY,
    queue_id VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'FIELD_INCIDENT'
    entity_id VARCHAR(64),
    operation VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE'
    status VARCHAR(30) NOT NULL, -- 'SYNCED', 'FAILED', 'CONFLICT'
    server_version INTEGER DEFAULT 1,
    payload_json JSONB NOT NULL,
    response_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_operations_entity ON sync_operations(entity_id);
