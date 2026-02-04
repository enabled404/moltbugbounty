import { NextRequest } from 'next/server';
import { createAdminClient } from './supabase';
import type { Agent } from '@/types/database';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Production Moltbook Authentication
// Full integration with https://moltbook.com/developers
// ═══════════════════════════════════════════════════════════════

const MOLTBOOK_VERIFY_URL = 'https://moltbook.com/api/v1/agents/verify-identity';
const MOLTBOOK_APP_KEY = process.env.MOLTBOOK_APP_KEY;

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
 * Step A (Official): Check X-Moltbook-Identity header
 * Step B (Fallback): Check Authorization: Bearer <LOCAL_TOKEN>
 */
export async function verifyAgent(request: NextRequest): Promise<AuthResult> {
    // Step A: Check Moltbook Identity Token
    const moltbookToken = request.headers.get('X-Moltbook-Identity');

    if (moltbookToken && MOLTBOOK_APP_KEY) {
        try {
            const moltbookResult = await verifyMoltbookToken(moltbookToken);
            if (moltbookResult.success) {
                return moltbookResult;
            }
            console.warn(`[ClawGuard] Moltbook verification failed: ${moltbookResult.error}`);
        } catch (error) {
            console.warn(`[ClawGuard] Moltbook API error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }

    // Step B: Check Local Token (Dev Mode)
    const authHeader = request.headers.get('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
        const localToken = authHeader.slice(7);
        return await verifyLocalToken(localToken);
    }

    return {
        success: false,
        agent: null,
        error: 'No authentication provided. Include X-Moltbook-Identity header or Authorization: Bearer <token>',
    };
}

/**
 * Verify Moltbook Identity Token
 * POST /api/v1/agents/verify-identity
 */
async function verifyMoltbookToken(token: string): Promise<AuthResult> {
    if (!MOLTBOOK_APP_KEY) {
        return { success: false, agent: null, error: 'MOLTBOOK_APP_KEY not configured' };
    }

    const response = await fetch(MOLTBOOK_VERIFY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Moltbook-App-Key': MOLTBOOK_APP_KEY,
        },
        body: JSON.stringify({ token }),
    });

    if (!response.ok) {
        return { success: false, agent: null, error: `Moltbook API returned ${response.status}` };
    }

    const data = await response.json();

    if (!data.success || !data.valid || !data.agent) {
        return { success: false, agent: null, error: 'Invalid or expired identity token' };
    }

    const moltbookProfile: MoltbookAgent = data.agent;
    const supabase = createAdminClient();

    // Check for existing agent
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
            })
            .eq('moltbook_id', moltbookProfile.id);

        return {
            success: true,
            agent: existingAgent as Agent,
            moltbookProfile,
            method: 'moltbook'
        };
    }

    // Create new agent with full Moltbook profile
    const { data: newAgent, error } = await supabase
        .from('agents')
        .insert({
            moltbook_id: moltbookProfile.id,
            local_token: generateLocalToken(),
            name: moltbookProfile.name,
            description: moltbookProfile.description,
            avatar_url: moltbookProfile.avatar_url,
            karma: moltbookProfile.karma,
            reputation_score: 0,
            follower_count: moltbookProfile.follower_count,
            is_claimed: moltbookProfile.is_claimed,
            is_verified: true,
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
}

/**
 * Verify Local Token (Dev Mode)
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

export function generateLocalToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function authError(message: string, status: number = 401) {
    return Response.json({ error: message, success: false }, { status });
}

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
