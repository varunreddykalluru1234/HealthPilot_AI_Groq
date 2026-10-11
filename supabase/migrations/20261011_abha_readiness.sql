-- Migration: ABDM / ABHA Readiness & FHIR Resources Schema
-- Description: Stores simulated or live ABHA linkage metadata and FHIR resource mappings
-- for HealthPilot AI users.

-- 1. ABHA Connections Table
CREATE TABLE IF NOT EXISTS user_abha_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    abha_id VARCHAR(32) NOT NULL,
    abha_address VARCHAR(128) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    gender VARCHAR(20),
    date_of_birth DATE,
    mobile VARCHAR(32),
    hip_id VARCHAR(64),
    hip_name VARCHAR(255),
    consent_granted BOOLEAN DEFAULT true,
    consent_timestamp TIMESTAMPTZ DEFAULT now(),
    is_demo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS for ABHA Connections
ALTER TABLE user_abha_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ABHA connection"
    ON user_abha_connections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ABHA connection"
    ON user_abha_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ABHA connection"
    ON user_abha_connections FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ABHA connection"
    ON user_abha_connections FOR DELETE
    USING (auth.uid() = user_id);

-- 2. ABHA Health Records & FHIR Bundles Cache Table
CREATE TABLE IF NOT EXISTS abha_fhir_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    external_record_id VARCHAR(128),
    facility_name VARCHAR(255),
    record_type VARCHAR(64), -- 'DiagnosticReport', 'MedicationRequest', 'DocumentReference'
    fhir_resource_type VARCHAR(64) NOT NULL,
    fhir_payload JSONB NOT NULL,
    is_demo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for FHIR Records
ALTER TABLE abha_fhir_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own FHIR records"
    ON abha_fhir_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own FHIR records"
    ON abha_fhir_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own FHIR records"
    ON abha_fhir_records FOR DELETE
    USING (auth.uid() = user_id);
