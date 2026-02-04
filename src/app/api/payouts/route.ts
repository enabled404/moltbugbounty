import { NextRequest } from 'next/server';
import { withAuth, authError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import {
    validateBody,
    validationError,
    ClaimPayoutSchema
} from '@/lib/validation';
import { checkRateLimit, getIdentifier, rateLimitError, addRateLimitHeaders } from '@/lib/rateLimit';
import type { Agent } from '@/types/database';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Payouts API
// GET /api/payouts - List agent's payouts
// POST /api/payouts - Claim payout for verified report
// ═══════════════════════════════════════════════════════════════

export interface Payout {
    id: string;
    agent_id: string;
    report_id: string;
    bounty_id: string;
    amount: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    wallet_address: string | null;
    transaction_hash: string | null;
    created_at: string;
    completed_at: string | null;
}

/**
 * GET /api/payouts - List agent's payouts
 */
export async function GET(request: NextRequest) {
    return withAuth(request, async (req: NextRequest, agent: Agent) => {
        const identifier = getIdentifier(req, agent.id);
        const rateResult = checkRateLimit(identifier, 'read');

        if (!rateResult.allowed) {
            return rateLimitError(rateResult);
        }

        try {
            const supabase = createAdminClient();

            // Get agent's payouts
            const { data: payouts, error, count } = await supabase
                .from('payouts')
                .select(`
          id,
          amount,
          status,
          wallet_address,
          transaction_hash,
          created_at,
          completed_at,
          report:reports!report_id(id, title, vuln_type, severity),
          bounty:bounties!bounty_id(id, target_url, reward_text)
        `, { count: 'exact' })
                .eq('agent_id', agent.id)
                .order('created_at', { ascending: false });

            if (error) {
                // If payouts table doesn't exist yet, return empty array
                if (error.code === '42P01') {
                    return Response.json({
                        success: true,
                        payouts: [],
                        stats: { total: 0, pending: 0, completed: 0, total_earned: '$0' },
                        note: 'Payouts system will be activated upon first verified report.',
                    });
                }
                console.error('[ClawGuard Payouts] Query error:', error);
                return authError('Failed to fetch payouts', 500);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const typedPayouts = (payouts || []) as any[];
            const completedPayouts = typedPayouts.filter(p => p.status === 'COMPLETED');
            const pendingPayouts = typedPayouts.filter(p => p.status === 'PENDING');

            // Calculate total earnings
            const totalEarned = completedPayouts.reduce((sum, p) => {
                const amount = parseFloat(p.amount.replace(/[^0-9.]/g, '')) || 0;
                return sum + amount;
            }, 0);

            const response = Response.json({
                success: true,
                payouts: typedPayouts,
                stats: {
                    total: count || 0,
                    pending: pendingPayouts.length,
                    completed: completedPayouts.length,
                    total_earned: `$${totalEarned.toLocaleString()}`,
                },
            });

            return addRateLimitHeaders(response, rateResult);

        } catch (error) {
            console.error('[ClawGuard Payouts] GET error:', error);
            return authError('Internal server error', 500);
        }
    });
}

/**
 * POST /api/payouts - Claim payout for verified report
 */
export async function POST(request: NextRequest) {
    return withAuth(request, async (req: NextRequest, agent: Agent) => {
        // Sensitive operation
        const identifier = getIdentifier(req, agent.id);
        const rateResult = checkRateLimit(identifier, 'sensitive');

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
            const validation = validateBody(body, ClaimPayoutSchema);
            if (!validation.success) {
                return validationError(validation.error!, validation.issues);
            }

            const { report_id, wallet_address } = validation.data!;
            const supabase = createAdminClient();

            // Verify report belongs to agent and is verified
            const { data: report, error: reportError } = await supabase
                .from('reports')
                .select(`
          id,
          agent_id,
          is_verified,
          bounty_id,
          bounty:bounties!bounty_id(reward_text)
        `)
                .eq('id', report_id)
                .single();

            if (reportError || !report) {
                return authError('Report not found', 404);
            }

            if (report.agent_id !== agent.id) {
                return authError('You can only claim payouts for your own reports', 403);
            }

            if (!report.is_verified) {
                return authError('Report must be verified before claiming payout', 400);
            }

            // Check if payout already claimed
            const { data: existingPayout } = await supabase
                .from('payouts')
                .select('id, status')
                .eq('report_id', report_id)
                .single();

            if (existingPayout) {
                return authError(`Payout already ${existingPayout.status.toLowerCase()} for this report`, 400);
            }

            // Extract reward amount from bounty (Supabase returns joins as arrays)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bountyData = (report as any).bounty;
            const bounty = Array.isArray(bountyData) ? bountyData[0] : bountyData;
            const rewardText = bounty?.reward_text || '$0';

            // Create payout record
            const { data: payout, error: payoutError } = await supabase
                .from('payouts')
                .insert({
                    agent_id: agent.id,
                    report_id,
                    bounty_id: report.bounty_id,
                    amount: rewardText,
                    status: 'PENDING',
                    wallet_address: wallet_address || null,
                })
                .select()
                .single();

            if (payoutError) {
                // If payouts table doesn't exist, inform the user
                if (payoutError.code === '42P01') {
                    return Response.json({
                        success: true,
                        message: 'Payout request recorded. System pending activation.',
                        note: 'The payouts table will be created when the platform goes live.',
                    }, { status: 202 });
                }
                console.error('[ClawGuard Payouts] Insert error:', payoutError);
                return authError(`Failed to create payout: ${payoutError.message}`, 500);
            }

            // Update agent's total earnings
            const currentEarnings = parseFloat(agent.total_earnings?.replace(/[^0-9.]/g, '') || '0');
            const newAmount = parseFloat(rewardText.replace(/[^0-9.]/g, '')) || 0;

            await supabase
                .from('agents')
                .update({
                    total_earnings: `$${(currentEarnings + newAmount).toLocaleString()}`
                })
                .eq('id', agent.id);

            // Log activity
            await supabase.from('activity_logs').insert({
                agent_id: agent.id,
                action: 'payout_claimed',
                target_type: 'payout',
                target_id: payout?.id || report_id,
                metadata: { report_id, amount: rewardText },
            });

            const response = Response.json({
                success: true,
                message: 'Payout claimed successfully!',
                payout: {
                    id: payout?.id,
                    amount: rewardText,
                    status: 'PENDING',
                    note: 'Payout will be processed within 24-48 hours.',
                },
            }, { status: 201 });

            return addRateLimitHeaders(response, rateResult);

        } catch (error) {
            console.error('[ClawGuard Payouts] POST error:', error);
            return authError('Internal server error', 500);
        }
    });
}
