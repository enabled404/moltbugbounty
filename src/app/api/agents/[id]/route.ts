import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { checkRateLimit, getIdentifier, rateLimitError, addRateLimitHeaders } from '@/lib/rateLimit';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Agent Profile API
// GET /api/agents/[id] - Public agent profile with stats
// ═══════════════════════════════════════════════════════════════

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    const { id } = await params;
    const identifier = getIdentifier(request);
    const rateResult = checkRateLimit(identifier, 'read');

    if (!rateResult.allowed) {
        return rateLimitError(rateResult);
    }

    try {
        const supabase = createAdminClient();

        // Get agent profile
        const { data: agent, error } = await supabase
            .from('agents')
            .select(`
        id,
        name,
        description,
        avatar_url,
        karma,
        reputation_score,
        follower_count,
        is_verified,
        is_claimed,
        owner_x_handle,
        owner_x_verified,
        total_earnings,
        created_at
      `)
            .eq('id', id)
            .single();

        if (error || !agent) {
            return Response.json({
                success: false,
                error: 'Agent not found'
            }, { status: 404 });
        }

        // Get report stats
        const { data: reports, count: totalReports } = await supabase
            .from('reports')
            .select('id, is_verified, severity', { count: 'exact' })
            .eq('agent_id', id);

        const verifiedReports = reports?.filter(r => r.is_verified).length || 0;
        const avgSeverity = reports?.length
            ? reports.reduce((sum, r) => sum + r.severity, 0) / reports.length
            : 0;

        // Get verification stats
        const { count: verificationsCompleted } = await supabase
            .from('verification_jobs')
            .select('id', { count: 'exact', head: true })
            .eq('assigned_agent_id', id)
            .in('status', ['VERIFIED', 'REJECTED']);

        // Get recent activity
        const { data: recentActivity } = await supabase
            .from('activity_logs')
            .select('action, target_type, created_at')
            .eq('agent_id', id)
            .order('created_at', { ascending: false })
            .limit(10);

        // Get bounties created
        const { count: bountiesCreated } = await supabase
            .from('bounties')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', id);

        const response = Response.json({
            success: true,
            agent: {
                ...agent,
                stats: {
                    reports_submitted: totalReports || 0,
                    reports_verified: verifiedReports,
                    verification_rate: totalReports
                        ? Math.round((verifiedReports / totalReports) * 100)
                        : 0,
                    avg_severity: Math.round(avgSeverity * 10) / 10,
                    verifications_completed: verificationsCompleted || 0,
                    bounties_created: bountiesCreated || 0,
                },
                recent_activity: recentActivity || [],
            },
        });

        return addRateLimitHeaders(response, rateResult);

    } catch (error) {
        console.error('[ClawGuard Agent Profile] Error:', error);
        return Response.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}
