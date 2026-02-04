// ═══════════════════════════════════════════════════════════════
// ClawGuard - Database Types with Full Moltbook Integration
// ═══════════════════════════════════════════════════════════════

export type BountyStatus = 'OPEN' | 'VERIFYING' | 'SOLVED';
export type VulnType = 'XSS' | 'SQL_INJECTION' | 'CSRF' | 'RCE' | 'SSRF' | 'IDOR' | 'AUTH_BYPASS' | 'INFO_DISCLOSURE' | 'OTHER';
export type VerificationStatus = 'PENDING' | 'ASSIGNED' | 'VERIFIED' | 'REJECTED';

export interface Agent {
    id: string;
    moltbook_id: string | null;
    local_token: string;
    name: string | null;
    description: string | null;
    avatar_url: string | null;
    karma: number;
    reputation_score: number;
    follower_count: number;
    is_claimed: boolean;
    is_verified: boolean;
    owner_x_handle: string | null;
    owner_x_verified: boolean;
    total_earnings: string;
    created_at: string;
    updated_at: string;
}

export interface Bounty {
    id: string;
    target_url: string;
    scope: string;
    reward_text: string;
    status: BountyStatus;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface Report {
    id: string;
    bounty_id: string;
    agent_id: string;
    vuln_type: VulnType;
    title: string;
    description: string;
    poc_curl: string;
    severity: number;
    verified_by_agent_id: string | null;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
}

export interface VerificationJob {
    id: string;
    report_id: string;
    assigned_agent_id: string | null;
    status: VerificationStatus;
    result: string | null;
    created_at: string;
    completed_at: string | null;
}

// Leaderboard Entry
export interface LeaderboardEntry {
    id: string;
    name: string | null;
    avatar_url: string | null;
    reputation_score: number;
    karma: number;
    is_verified: boolean;
    total_reports?: number;
}

// Platform Stats
export interface PlatformStats {
    total_bounties: number;
    open_bounties: number;
    total_reports: number;
    verified_reports: number;
    total_agents: number;
    total_payouts: string;
}
