import { NextRequest } from 'next/server';
import { withAuth, authError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import type { Agent, Bounty, BountyStatus } from '@/types/database';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Individual Bounty API
// ═══════════════════════════════════════════════════════════════

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const supabase = createAdminClient();

        const { data: bounty, error } = await supabase
            .from('bounties')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !bounty) {
            return Response.json({ error: 'Bounty not found' }, { status: 404 });
        }

        return Response.json({ success: true, bounty: bounty as Bounty });

    } catch (error) {
        console.error('[ClawGuard Bounty] GET error:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: RouteParams
) {
    return withAuth(request, async (req: NextRequest, agent: Agent) => {
        try {
            const { id } = await params;
            const body = await req.json();
            const supabase = createAdminClient();

            const { data: existingBounty } = await supabase
                .from('bounties')
                .select('created_by')
                .eq('id', id)
                .single();

            if (!existingBounty) {
                return authError('Bounty not found', 404);
            }

            const typedBounty = existingBounty as { created_by: string };

            if (typedBounty.created_by !== agent.id) {
                return authError('Not authorized to update this bounty', 403);
            }

            const allowedFields = ['target_url', 'scope', 'reward_text', 'status'];
            const updates: Record<string, string> = {};

            for (const field of allowedFields) {
                if (body[field] !== undefined) {
                    if (field === 'status') {
                        const validStatuses: BountyStatus[] = ['OPEN', 'VERIFYING', 'SOLVED'];
                        if (!validStatuses.includes(body[field])) {
                            return authError('Invalid status value', 400);
                        }
                    }
                    updates[field] = body[field];
                }
            }

            if (Object.keys(updates).length === 0) {
                return authError('No valid fields to update', 400);
            }

            const { data: bounty, error } = await supabase
                .from('bounties')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error || !bounty) {
                return authError(`Failed to update bounty: ${error?.message}`, 500);
            }

            return Response.json({
                success: true,
                message: 'Bounty updated successfully',
                bounty: bounty as Bounty,
            });

        } catch (error) {
            console.error('[ClawGuard Bounty] PATCH error:', error);
            return authError('Invalid request body', 400);
        }
    });
}

export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    return withAuth(request, async (_req: NextRequest, agent: Agent) => {
        try {
            const { id } = await params;
            const supabase = createAdminClient();

            const { data: existingBounty } = await supabase
                .from('bounties')
                .select('created_by')
                .eq('id', id)
                .single();

            if (!existingBounty) {
                return authError('Bounty not found', 404);
            }

            const typedBounty = existingBounty as { created_by: string };

            if (typedBounty.created_by !== agent.id) {
                return authError('Not authorized to delete this bounty', 403);
            }

            const { error } = await supabase
                .from('bounties')
                .delete()
                .eq('id', id);

            if (error) {
                return authError(`Failed to delete bounty: ${error.message}`, 500);
            }

            return Response.json({ success: true, message: 'Bounty deleted successfully' });

        } catch (error) {
            console.error('[ClawGuard Bounty] DELETE error:', error);
            return authError('Internal server error', 500);
        }
    });
}
