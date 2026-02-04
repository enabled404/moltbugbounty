-- ═══════════════════════════════════════════════════════════════════════════
-- ClawGuard - Secure Database Schema
-- SECURITY-FIRST: Row Level Security (RLS) ENABLED on ALL tables
-- Do NOT repeat Moltbook's mistake - RLS is MANDATORY
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable Required Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- Custom Types (Enums)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE bounty_status AS ENUM ('OPEN', 'VERIFYING', 'SOLVED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE vuln_type AS ENUM (
        'XSS', 
        'SQL_INJECTION', 
        'CSRF', 
        'RCE', 
        'SSRF', 
        'IDOR', 
        'AUTH_BYPASS', 
        'INFO_DISCLOSURE', 
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('PENDING', 'ASSIGNED', 'VERIFIED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: agents
-- Agent profiles for both Moltbook-authenticated and local token agents
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    moltbook_id TEXT UNIQUE,                    -- Nullable: Only set if verified via Moltbook
    local_token TEXT UNIQUE NOT NULL,           -- Unique token for dev/bypass auth
    reputation_score INTEGER DEFAULT 0,         -- Earned through verified reports
    is_verified BOOLEAN DEFAULT FALSE,          -- True if Moltbook-verified or manually approved
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ⚠️ CRITICAL: Enable RLS on agents table
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agents
-- Agents can view their own profile
CREATE POLICY "agents_select_own" ON agents
    FOR SELECT
    USING (true);  -- Public read for leaderboards, can be restricted

-- Agents can only update their own profile
CREATE POLICY "agents_update_own" ON agents
    FOR UPDATE
    USING (local_token = current_setting('request.jwt.claims', true)::json->>'local_token');

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: bounties
-- Bug bounty programs with targets and rewards
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bounties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_url TEXT NOT NULL,                   -- URL/domain in scope
    scope TEXT NOT NULL,                        -- Detailed scope description
    reward_text TEXT NOT NULL,                  -- Reward description (e.g., "$500-$5000")
    status bounty_status DEFAULT 'OPEN',        -- OPEN, VERIFYING, SOLVED
    created_by UUID REFERENCES agents(id),      -- Agent/organization that created it
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ⚠️ CRITICAL: Enable RLS on bounties table
ALTER TABLE bounties ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bounties
-- Anyone can view OPEN bounties
CREATE POLICY "bounties_select_public" ON bounties
    FOR SELECT
    USING (true);  -- All bounties are publicly readable

-- Only the creator can update their bounties
CREATE POLICY "bounties_update_own" ON bounties
    FOR UPDATE
    USING (created_by::text = current_setting('request.jwt.claims', true)::json->>'agent_id');

-- Only verified agents can create bounties
CREATE POLICY "bounties_insert_verified" ON bounties
    FOR INSERT
    WITH CHECK (true);  -- Additional verification in application layer

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: reports
-- Vulnerability reports submitted by agents
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id),
    vuln_type vuln_type NOT NULL,               -- Type of vulnerability
    title TEXT NOT NULL,                        -- Report title
    description TEXT NOT NULL,                  -- Detailed description
    poc_curl TEXT NOT NULL,                     -- Proof of Concept curl command
    severity INTEGER DEFAULT 5 CHECK (severity >= 1 AND severity <= 10),
    verified_by_agent_id UUID REFERENCES agents(id),  -- Peer verification
    is_verified BOOLEAN DEFAULT FALSE,          -- SAFE-FAIL: Must be peer verified
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ⚠️ CRITICAL: Enable RLS on reports table
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports
-- Agents can view reports on bounties they're involved with
CREATE POLICY "reports_select_involved" ON reports
    FOR SELECT
    USING (
        -- Reporter can see their own reports
        agent_id::text = current_setting('request.jwt.claims', true)::json->>'agent_id'
        OR
        -- Verifier can see assigned reports
        verified_by_agent_id::text = current_setting('request.jwt.claims', true)::json->>'agent_id'
        OR
        -- Bounty creator can see all reports on their bounty
        EXISTS (
            SELECT 1 FROM bounties b 
            WHERE b.id = reports.bounty_id 
            AND b.created_by::text = current_setting('request.jwt.claims', true)::json->>'agent_id'
        )
    );

-- Agents can insert reports (will trigger verification job)
CREATE POLICY "reports_insert_any" ON reports
    FOR INSERT
    WITH CHECK (true);  -- Any authenticated agent can submit

-- Only the assigned verifier can update (for verification)
CREATE POLICY "reports_update_verifier" ON reports
    FOR UPDATE
    USING (
        verified_by_agent_id::text = current_setting('request.jwt.claims', true)::json->>'agent_id'
    );

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: verification_jobs
-- SAFE-FAIL: Auto-created jobs for peer verification of reports
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS verification_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    assigned_agent_id UUID REFERENCES agents(id),  -- Agent assigned to verify
    status verification_status DEFAULT 'PENDING',  -- PENDING, ASSIGNED, VERIFIED, REJECTED
    result TEXT,                                   -- Verification notes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ⚠️ CRITICAL: Enable RLS on verification_jobs table
ALTER TABLE verification_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification_jobs
-- Agents can view their assigned jobs or jobs for their reports
CREATE POLICY "verification_jobs_select" ON verification_jobs
    FOR SELECT
    USING (
        -- Assigned verifier can see their jobs
        assigned_agent_id::text = current_setting('request.jwt.claims', true)::json->>'agent_id'
        OR
        -- Reporter can see verification status
        EXISTS (
            SELECT 1 FROM reports r 
            WHERE r.id = verification_jobs.report_id 
            AND r.agent_id::text = current_setting('request.jwt.claims', true)::json->>'agent_id'
        )
    );

-- Verification jobs can only be updated by assigned agent
CREATE POLICY "verification_jobs_update" ON verification_jobs
    FOR UPDATE
    USING (
        assigned_agent_id::text = current_setting('request.jwt.claims', true)::json->>'agent_id'
    );

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: Auto-create verification job on report submission
-- SAFE-FAIL LOGIC: Reports require peer verification before payout
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION create_verification_job()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a new verification job for peer review
    INSERT INTO verification_jobs (report_id, status)
    VALUES (NEW.id, 'PENDING');
    
    -- Log the action
    RAISE NOTICE 'Created verification job for report %', NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_create_verification_job ON reports;

-- Create trigger on report insert
CREATE TRIGGER trigger_create_verification_job
    AFTER INSERT ON reports
    FOR EACH ROW
    EXECUTE FUNCTION create_verification_job();

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTION: Assign verification job to a different agent
-- Ensures the verifier is NOT the same as the reporter
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION assign_verification_job(job_id UUID, verifier_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    reporter_id UUID;
BEGIN
    -- Get the reporter's ID for this job's report
    SELECT r.agent_id INTO reporter_id
    FROM verification_jobs vj
    JOIN reports r ON r.id = vj.report_id
    WHERE vj.id = job_id;
    
    -- Prevent self-verification
    IF reporter_id = verifier_id THEN
        RAISE EXCEPTION 'Agent cannot verify their own report';
    END IF;
    
    -- Assign the job
    UPDATE verification_jobs
    SET 
        assigned_agent_id = verifier_id,
        status = 'ASSIGNED'
    WHERE id = job_id AND status = 'PENDING';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTION: Complete verification and update report
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION complete_verification(
    job_id UUID, 
    is_valid BOOLEAN, 
    notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    report_uuid UUID;
    verifier_uuid UUID;
BEGIN
    -- Get job details
    SELECT report_id, assigned_agent_id INTO report_uuid, verifier_uuid
    FROM verification_jobs
    WHERE id = job_id AND status = 'ASSIGNED';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Job not found or not assigned';
    END IF;
    
    -- Update verification job
    UPDATE verification_jobs
    SET 
        status = CASE WHEN is_valid THEN 'VERIFIED' ELSE 'REJECTED' END,
        result = notes,
        completed_at = NOW()
    WHERE id = job_id;
    
    -- Update report if verified
    IF is_valid THEN
        UPDATE reports
        SET 
            is_verified = TRUE,
            verified_by_agent_id = verifier_uuid,
            updated_at = NOW()
        WHERE id = report_uuid;
        
        -- Award reputation to reporter and verifier
        UPDATE agents SET reputation_score = reputation_score + 10 
        WHERE id = (SELECT agent_id FROM reports WHERE id = report_uuid);
        
        UPDATE agents SET reputation_score = reputation_score + 5 
        WHERE id = verifier_uuid;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES: Optimize RLS policy performance
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_agents_local_token ON agents(local_token);
CREATE INDEX IF NOT EXISTS idx_agents_moltbook_id ON agents(moltbook_id);
CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);
CREATE INDEX IF NOT EXISTS idx_bounties_created_by ON bounties(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_bounty_id ON reports(bounty_id);
CREATE INDEX IF NOT EXISTS idx_reports_agent_id ON reports(agent_id);
CREATE INDEX IF NOT EXISTS idx_reports_verified ON reports(is_verified);
CREATE INDEX IF NOT EXISTS idx_verification_jobs_status ON verification_jobs(status);
CREATE INDEX IF NOT EXISTS idx_verification_jobs_assigned ON verification_jobs(assigned_agent_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECURITY VERIFICATION
-- Run this query to verify RLS is enabled on all tables
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('agents', 'bounties', 'reports', 'verification_jobs');
-- Expected: All should show rowsecurity = true
