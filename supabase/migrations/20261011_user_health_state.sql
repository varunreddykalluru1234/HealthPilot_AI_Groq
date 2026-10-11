-- Migration: User Health State Persistence
-- Description: Stores complete user health records, profile, medications, vitals, 
-- and timeline synced to Supabase Cloud Database with Row-Level Security (RLS).

CREATE TABLE IF NOT EXISTS public.user_health_state (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_onboarded BOOLEAN DEFAULT false,
    profile JSONB,
    measurements JSONB DEFAULT '[]'::jsonb,
    records JSONB DEFAULT '[]'::jsonb,
    reports JSONB DEFAULT '[]'::jsonb,
    medications JSONB DEFAULT '[]'::jsonb,
    reminders JSONB DEFAULT '[]'::jsonb,
    goals JSONB DEFAULT '[]'::jsonb,
    timeline JSONB DEFAULT '[]'::jsonb,
    conversations JSONB DEFAULT '[]'::jsonb,
    abha_connection JSONB DEFAULT '{"isConnected": false, "consentGiven": false}'::jsonb,
    imported_abha_record_ids JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_health_state ENABLE ROW LEVEL SECURITY;

-- Policy: Select own health state
DROP POLICY IF EXISTS "Users can view own health state" ON public.user_health_state;
CREATE POLICY "Users can view own health state"
    ON public.user_health_state FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Insert own health state
DROP POLICY IF EXISTS "Users can insert own health state" ON public.user_health_state;
CREATE POLICY "Users can insert own health state"
    ON public.user_health_state FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Update own health state
DROP POLICY IF EXISTS "Users can update own health state" ON public.user_health_state;
CREATE POLICY "Users can update own health state"
    ON public.user_health_state FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Delete own health state
DROP POLICY IF EXISTS "Users can delete own health state" ON public.user_health_state;
CREATE POLICY "Users can delete own health state"
    ON public.user_health_state FOR DELETE
    USING (auth.uid() = user_id);
