import { NextRequest } from 'next/server';
import { createAdminClient } from './supabase';
import type { Agent } from '@/types/database';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Moltbook Open API Authentication
// Integration with https://moltbook.com/api/v1 (Open Source)
// NO DEVELOPER ACCESS REQUIRED - uses open registration API
// ═══════════════════════════════════════════════════════════════

const MOLTBOOK_API_BASE = 'https://www.moltbook.com/api/v1';

export interface MoltbookAgent {
    id: string;
    name: string;
    description: string;
    karma: number;
    avatar_url: string;
    is_claimed: boolean;
    created_at: string;
    follower_count: number;
    stats: { posts: number; comments: number };
    owner?: {
        x_handle: string;
        x_name: string;
        x_verified: boolean;
        x_follower_count: number;
    };
}

export interface AuthResult {
    success: boolean;
    agent: Agent | null;
    moltbookProfile?: MoltbookAgent;
    error?: string;
    method?: 'moltbook' | 'local_token';
}

/**
 * Universal Authentication Function
 * 
 * Priority 1: Check for Moltbook API key (moltbook_ prefix)
 * Priority 2: Check for ClawGuard local token (Bearer <token>)
 */
export async function verifyAgent(request: NextRequest): Promise<AuthResult> {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return {
            success: false,
            agent: null,
            error: 'No authentication provided. Include Authorization: Bearer <moltbook_xxx or local_token>',
        };
    }

    const token = authHeader.slice(7);

    // Check if it's a Moltbook API key (moltbook_ prefix)
    if (token.startsWith('moltbook_')) {
        return await verifyMoltbookApiKey(token);
    }

    // Otherwise treat as local token
    return await verifyLocalToken(token);
}

/**
 * Verify Moltbook API Key
 * Uses GET /agents/me endpoint with the agent's API key
 * No app-level developer access required!
 */
async function verifyMoltbookApiKey(apiKey: string): Promise<AuthResult> {
    try {
        // Call Moltbook API to get agent profile
        const response = await fetch(`${MOLTBOOK_API_BASE}/agents/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                return { success: false, agent: null, error: 'Invalid Moltbook API key' };
            }
            return { success: false, agent: null, error: `Moltbook API error: ${response.status}` };
        }

        const data = await response.json();

        if (!data.agent) {
            return { success: false, agent: null, error: 'Moltbook returned invalid response' };
        }

        const moltbookProfile: MoltbookAgent = data.agent;
        const supabase = createAdminClient();

        // Look up or create ClawGuard agent based on Moltbook ID
        const { data: existingAgent } = await supabase
            .from('agents')
            .select('*')
            .eq('moltbook_id', moltbookProfile.id)
            .single();

        if (existingAgent) {
            // Update profile with latest Moltbook data
            await supabase
                .from('agents')
                .update({
                    name: moltbookProfile.name,
                    description: moltbookProfile.description,
                    avatar_url: moltbookProfile.avatar_url,
                    karma: moltbookProfile.karma,
                    follower_count: moltbookProfile.follower_count,
                    is_claimed: moltbookProfile.is_claimed,
                    owner_x_handle: moltbookProfile.owner?.x_handle,
                    owner_x_verified: moltbookProfile.owner?.x_verified,
                    updated_at: new Date().toISOString(),
                })
                .eq('moltbook_id', moltbookProfile.id);

            return {
                success: true,
                agent: existingAgent as Agent,
                moltbookProfile,
                method: 'moltbook'
            };
        }

        // Create new ClawGuard agent linked to Moltbook account
        const { data: newAgent, error } = await supabase
            .from('agents')
            .insert({
                moltbook_id: moltbookProfile.id,
                local_token: generateLocalToken(),  // Also generate local token for flexibility
                name: moltbookProfile.name,
                description: moltbookProfile.description,
                avatar_url: moltbookProfile.avatar_url,
                karma: moltbookProfile.karma,
                reputation_score: 0,
                follower_count: moltbookProfile.follower_count,
                is_claimed: moltbookProfile.is_claimed,
                is_verified: moltbookProfile.is_claimed,  // Auto-verify if claimed on Moltbook
                owner_x_handle: moltbookProfile.owner?.x_handle,
                owner_x_verified: moltbookProfile.owner?.x_verified,
            })
            .select()
            .single();

        if (error || !newAgent) {
            return { success: false, agent: null, error: `Failed to create agent: ${error?.message}` };
        }

        return {
            success: true,
            agent: newAgent as Agent,
            moltbookProfile,
            method: 'moltbook'
        };
    } catch (error) {
        console.error('[ClawGuard] Moltbook API error:', error);
        return {
            success: false,
            agent: null,
            error: `Moltbook API connection failed: ${error instanceof Error ? error.message : 'Unknown'}`
        };
    }
}

/**
 * Verify Local Token (ClawGuard-native auth)
 * Used for development or agents not using Moltbook
 */
async function verifyLocalToken(token: string): Promise<AuthResult> {
    if (!token || token.length < 32) {
        return { success: false, agent: null, error: 'Invalid token format' };
    }

    const supabase = createAdminClient();

    const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('local_token', token)
        .single();

    if (error || !agent) {
        return { success: false, agent: null, error: 'Token not found or invalid' };
    }

    return { success: true, agent: agent as Agent, method: 'local_token' };
}

/**
 * Generate secure local token (64 hex chars)
 */
export function generateLocalToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Helper to return auth error response
 */
export function authError(message: string, status: number = 401) {
    return Response.json({ error: message, success: false }, { status });
}

/**
 * Wrapper for authenticated route handlers
 */
export async function withAuth(
    request: NextRequest,
    handler: (request: NextRequest, agent: Agent) => Promise<Response>
): Promise<Response> {
    const authResult = await verifyAgent(request);

    if (!authResult.success || !authResult.agent) {
        return authError(authResult.error || 'Authentication failed');
    }

    return handler(request, authResult.agent);
}

// ═══════════════════════════════════════════════════════════════
// Moltbook Registration Helper
// Agents can register with Moltbook via POST /agents/register
// ═══════════════════════════════════════════════════════════════

export interface MoltbookRegistrationResult {
    success: boolean;
    api_key?: string;
    claim_url?: string;
    verification_code?: string;
    error?: string;
}

/**
 * Register a new agent with Moltbook (open API)
 * Returns api_key, claim_url, and verification_code
 */
export async function registerWithMoltbook(
    name: string,
    description?: string
): Promise<MoltbookRegistrationResult> {
    try {
        const response = await fetch(`${MOLTBOOK_API_BASE}/agents/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, description }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            return {
                success: false,
                error: error.error || `Registration failed: ${response.status}`
            };
        }

        const data = await response.json();

        return {
            success: true,
            api_key: data.agent?.api_key,
            claim_url: data.agent?.claim_url,
            verification_code: data.agent?.verification_code,
        };
    } catch (error) {
        return {
            success: false,
            error: `Moltbook API error: ${error instanceof Error ? error.message : 'Unknown'}`
        };
    }
}

/**
 * Check agent claim status on Moltbook
 */
export async function checkMoltbookClaimStatus(apiKey: string): Promise<{ claimed: boolean; error?: string }> {
    try {
        const response = await fetch(`${MOLTBOOK_API_BASE}/agents/status`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            return { claimed: false, error: `Status check failed: ${response.status}` };
        }

        const data = await response.json();
        return { claimed: data.is_claimed ?? false };
    } catch (error) {
        return { claimed: false, error: `API error: ${error instanceof Error ? error.message : 'Unknown'}` };
    }
}
