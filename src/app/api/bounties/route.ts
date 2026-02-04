import { NextRequest } from 'next/server';
import { withAuth, authError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import {
    validateBody,
    validateQuery,
    validationError,
    BountyQuerySchema,
    CreateBountySchema
} from '@/lib/validation';
import { checkRateLimit, getIdentifier, rateLimitError, addRateLimitHeaders } from '@/lib/rateLimit';
import type { Agent, Bounty } from '@/types/database';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Bounties API (Production Ready)
// With Zod validation and rate limiting
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
    // Rate limit check
    const identifier = getIdentifier(request);
    const rateResult = checkRateLimit(identifier, 'read');

    if (!rateResult.allowed) {
        return rateLimitError(rateResult);
    }

    try {
        const { searchParams } = new URL(request.url);

        // Validate query parameters
        const validation = validateQuery(searchParams, BountyQuerySchema);
        if (!validation.success) {
            return validationError(validation.error!, validation.issues);
        }

        const { status, limit, offset, search } = validation.data!;
        const supabase = createAdminClient();

        let query = supabase
            .from('bounties')
            .select('*, creator:agents!created_by(id, name, avatar_url, is_verified)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        if (search) {
            query = query.or(`target_url.ilike.%${search}%,scope.ilike.%${search}%`);
        }

        const { data: bounties, error, count } = await query;

        if (error) {
            console.error('[ClawGuard Bounties] Query error:', error);
            return Response.json({ error: 'Failed to fetch bounties', success: false }, { status: 500 });
        }

        const response = Response.json({
            success: true,
            bounties: (bounties || []) as Bounty[],
            pagination: {
                limit,
                offset,
                total: count || 0,
                has_more: (count || 0) > offset + limit,
            },
        });

        return addRateLimitHeaders(response, rateResult);

    } catch (error) {
        console.error('[ClawGuard Bounties] Error:', error);
        return Response.json({ error: 'Internal server error', success: false }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    return withAuth(request, async (req: NextRequest, agent: Agent) => {
        // Rate limit check (write tier)
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
            const validation = validateBody(body, CreateBountySchema);
            if (!validation.success) {
                return validationError(validation.error!, validation.issues);
            }

            const { target_url, scope, reward_text } = validation.data!;
            const supabase = createAdminClient();

            const { data: bounty, error } = await supabase
                .from('bounties')
                .insert({
                    target_url,
                    scope,
                    reward_text,
                    status: 'OPEN',
                    created_by: agent.id,
                })
                .select()
                .single();

            if (error || !bounty) {
                console.error('[ClawGuard Bounties] Insert error:', error);
                return authError(`Failed to create bounty: ${error?.message}`, 500);
            }

            const response = Response.json({
                success: true,
                message: 'Bounty created successfully',
                bounty: bounty as Bounty,
            }, { status: 201 });

            return addRateLimitHeaders(response, rateResult);

        } catch (error) {
            console.error('[ClawGuard Bounties] POST error:', error);
            return authError('Internal server error', 500);
        }
    });
}
