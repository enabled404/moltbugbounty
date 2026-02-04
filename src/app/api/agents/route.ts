import { NextRequest } from 'next/server';
import { verifyAgent, withAuth, authError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import {
    validateQuery,
    validateBody,
    validationError,
    AgentQuerySchema,
    UpdateAgentSchema
} from '@/lib/validation';
import { checkRateLimit, getIdentifier, rateLimitError, addRateLimitHeaders } from '@/lib/rateLimit';
import type { Agent } from '@/types/database';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Agents API
// List agents, get profiles, update own profile
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/agents - List agents (public leaderboard data)
 */
export async function GET(request: NextRequest) {
    const identifier = getIdentifier(request);
    const rateResult = checkRateLimit(identifier, 'read');

    if (!rateResult.allowed) {
        return rateLimitError(rateResult);
    }

    try {
        const { searchParams } = new URL(request.url);

        // Validate query parameters
        const validation = validateQuery(searchParams, AgentQuerySchema);
        if (!validation.success) {
            return validationError(validation.error!, validation.issues);
        }

        const { sort, order, limit, offset, verified_only } = validation.data!;
        const supabase = createAdminClient();

        // Build query - only return public fields
        let query = supabase
            .from('agents')
            .select(`
        id,
        name,
        avatar_url,
        karma,
        reputation_score,
        follower_count,
        is_verified,
        is_claimed,
        created_at
      `, { count: 'exact' })
            .order(sort === 'reputation' ? 'reputation_score' :
                sort === 'karma' ? 'karma' :
                    sort === 'created' ? 'created_at' : 'reputation_score',
                { ascending: order === 'asc' })
            .range(offset, offset + limit - 1);

        if (verified_only) {
            query = query.eq('is_verified', true);
        }

        const { data: agents, error, count } = await query;

        if (error) {
            console.error('[ClawGuard Agents] Query error:', error);
            return Response.json({ error: 'Failed to fetch agents', success: false }, { status: 500 });
        }

        const response = Response.json({
            success: true,
            agents: agents || [],
            pagination: {
                limit,
                offset,
                total: count || 0,
                has_more: (count || 0) > offset + limit,
            },
        });

        return addRateLimitHeaders(response, rateResult);

    } catch (error) {
        console.error('[ClawGuard Agents] Error:', error);
        return Response.json({ error: 'Internal server error', success: false }, { status: 500 });
    }
}

/**
 * PATCH /api/agents - Update own profile (requires auth)
 */
export async function PATCH(request: NextRequest) {
    return withAuth(request, async (req: NextRequest, agent: Agent) => {
        const identifier = getIdentifier(req, agent.id);
        const rateResult = checkRateLimit(identifier, 'write');

        if (!rateResult.allowed) {
            return rateLimitError(rateResult);
        }

        try {
            let body;
            try {
                body = await req.json();
            } catch {
                return validationError('Invalid JSON body');
            }

            // Validate request body
            const validation = validateBody(body, UpdateAgentSchema);
            if (!validation.success) {
                return validationError(validation.error!, validation.issues);
            }

            const updates = validation.data!;

            // Nothing to update
            if (Object.keys(updates).filter(k => updates[k as keyof typeof updates] !== undefined).length === 0) {
                return authError('No valid fields to update', 400);
            }

            const supabase = createAdminClient();

            const { data: updatedAgent, error } = await supabase
                .from('agents')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', agent.id)
                .select()
                .single();

            if (error || !updatedAgent) {
                console.error('[ClawGuard Agents] Update error:', error);
                return authError(`Failed to update profile: ${error?.message}`, 500);
            }

            // Log activity
            await supabase.from('activity_logs').insert({
                agent_id: agent.id,
                action: 'profile_updated',
                target_type: 'agent',
                target_id: agent.id,
                metadata: { fields_updated: Object.keys(updates) },
            });

            const response = Response.json({
                success: true,
                message: 'Profile updated successfully',
                agent: {
                    id: updatedAgent.id,
                    name: updatedAgent.name,
                    description: updatedAgent.description,
                    avatar_url: updatedAgent.avatar_url,
                    reputation_score: updatedAgent.reputation_score,
                    karma: updatedAgent.karma,
                    is_verified: updatedAgent.is_verified,
                },
            });

            return addRateLimitHeaders(response, rateResult);

        } catch (error) {
            console.error('[ClawGuard Agents] PATCH error:', error);
            return authError('Internal server error', 500);
        }
    });
}
