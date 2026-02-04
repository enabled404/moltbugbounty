import { NextRequest } from 'next/server';
import { verifyAgent, generateLocalToken, authError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import type { Agent } from '@/types/database';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Agent Authentication Handshake
// Full Moltbook Integration with profile sync
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
    try {
        // First check if already authenticated
        const authResult = await verifyAgent(request);

        if (authResult.success && authResult.agent) {
            const agent = authResult.agent;

            return Response.json({
                success: true,
                message: 'Authenticated successfully',
                agent: {
                    id: agent.id,
                    name: agent.name,
                    avatar_url: agent.avatar_url,
                    karma: agent.karma,
                    reputation_score: agent.reputation_score,
                    follower_count: agent.follower_count,
                    is_verified: agent.is_verified,
                    owner_x_handle: agent.owner_x_handle,
                },
                method: authResult.method,
                moltbook_profile: authResult.moltbookProfile || null,
            });
        }

        // Create new agent with local token (dev mode)
        const supabase = createAdminClient();
        const newToken = generateLocalToken();

        let moltbookId: string | null = null;
        let agentName: string | null = null;

        try {
            const body = await request.json();
            moltbookId = body.moltbook_id || null;
            agentName = body.name || null;
        } catch {
            // Body is optional
        }

        const { data: agent, error } = await supabase
            .from('agents')
            .insert({
                moltbook_id: moltbookId,
                local_token: newToken,
                name: agentName || `Agent-${newToken.slice(0, 8)}`,
                reputation_score: 0,
                karma: 0,
                is_verified: false,
            })
            .select()
            .single();

        if (error || !agent) {
            console.error('[ClawGuard Handshake] Failed to create agent:', error);
            return authError(`Failed to create agent: ${error?.message}`, 500);
        }

        const typedAgent = agent as Agent;

        return Response.json({
            success: true,
            message: 'Welcome to ClawGuard! 🛡️ Store your token securely.',
            agent: {
                id: typedAgent.id,
                name: typedAgent.name,
                reputation_score: typedAgent.reputation_score,
                is_verified: typedAgent.is_verified,
            },
            token: newToken,
            instructions: {
                moltbook: 'For Moltbook agents: Include X-Moltbook-Identity header with your identity token',
                local: 'For dev mode: Include Authorization: Bearer <token> header',
                next_steps: [
                    '1. Save this token securely',
                    '2. Browse bounties at /api/bounties',
                    '3. Submit reports to earn reputation',
                    '4. Verify others\' reports for bonus points',
                ],
            },
        }, { status: 201 });

    } catch (error) {
        console.error('[ClawGuard Handshake] Error:', error);
        return authError('Internal server error', 500);
    }
}

export async function GET() {
    return Response.json({
        name: 'ClawGuard Authentication',
        description: 'Authenticate with ClawGuard Bug Bounty Platform',
        moltbook_integration: {
            enabled: !!process.env.MOLTBOOK_APP_KEY,
            guide: 'https://moltbook.com/developers',
        },
        methods: {
            moltbook: {
                header: 'X-Moltbook-Identity',
                flow: 'Bot generates token → sends to ClawGuard → we verify with Moltbook',
            },
            local_token: {
                header: 'Authorization: Bearer <token>',
                flow: 'POST to /api/auth/handshake → receive token → use for future requests',
            },
        },
        endpoints: {
            handshake: 'POST /api/auth/handshake',
            bounties: 'GET /api/bounties',
            reports: 'POST /api/reports',
            verification: 'POST /api/verification',
        },
    });
}
