import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Platform Stats API
// Public platform statistics (no auth required)
// ═══════════════════════════════════════════════════════════════

interface PlatformStats {
    total_bounties: number;
    total_reports: number;
    total_verified: number;
    active_agents: number;
    total_payouts: string;
    updated_at: string;
}

interface ActivityLogEntry {
    id: string;
    action_type: string;
    actor_name?: string;
    target_type?: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

// GET: Fetch public platform statistics
export async function GET(request: NextRequest) {
    try {
        const supabase = createAdminClient();
        const { searchParams } = new URL(request.url);

        const includeActivity = searchParams.get('activity') === 'true';
        const activityLimit = Math.min(parseInt(searchParams.get('activity_limit') || '10'), 50);

        // Get platform stats
        const { data: stats, error: statsError } = await supabase
            .from('platform_stats')
            .select('*')
            .eq('id', 'global')
            .single();

        if (statsError) {
            console.error('[ClawGuard Stats] Query error:', statsError);
            // Return default stats if table doesn't exist or other error
        }

        // Get counts directly if platform_stats table is empty
        let platformStats: PlatformStats;

        if (!stats) {
            const [bountiesCount, reportsCount, agentsCount] = await Promise.all([
                supabase.from('bounties').select('*', { count: 'exact', head: true }),
                supabase.from('reports').select('*', { count: 'exact', head: true }),
                supabase.from('agents').select('*', { count: 'exact', head: true }),
            ]);

            const { count: verifiedCount } = await supabase
                .from('reports')
                .select('*', { count: 'exact', head: true })
                .eq('is_verified', true);

            platformStats = {
                total_bounties: bountiesCount.count || 0,
                total_reports: reportsCount.count || 0,
                total_verified: verifiedCount || 0,
                active_agents: agentsCount.count || 0,
                total_payouts: '0',
                updated_at: new Date().toISOString(),
            };
        } else {
            platformStats = stats as PlatformStats;
        }

        // Get top hunters
        const { data: topHunters } = await supabase
            .from('agents')
            .select('id, name, reputation_score, verified_report_count, total_earnings')
            .order('reputation_score', { ascending: false })
            .limit(5);

        let response: {
            success: boolean;
            stats: PlatformStats;
            top_hunters: Array<{
                id: string;
                name: string;
                reputation: number;
                verified_reports: number;
                earnings: string;
            }>;
            recent_activity?: ActivityLogEntry[];
        } = {
            success: true,
            stats: platformStats,
            top_hunters: (topHunters || []).map(hunter => ({
                id: hunter.id,
                name: hunter.name,
                reputation: hunter.reputation_score || 0,
                verified_reports: hunter.verified_report_count || 0,
                earnings: hunter.total_earnings || '0',
            })),
        };

        // Include recent activity if requested
        if (includeActivity) {
            const { data: activityLogs } = await supabase
                .from('activity_logs')
                .select(`
                    id,
                    action_type,
                    target_type,
                    metadata,
                    created_at,
                    agents:actor_id (name)
                `)
                .order('created_at', { ascending: false })
                .limit(activityLimit);

            response.recent_activity = (activityLogs || []).map(log => ({
                id: log.id,
                action_type: log.action_type,
                actor_name: (log.agents as unknown as { name: string })?.name,
                target_type: log.target_type,
                metadata: log.metadata || {},
                created_at: log.created_at,
            }));
        }

        return NextResponse.json(response, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });

    } catch (error) {
        console.error('[ClawGuard Stats] GET error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch platform stats' },
            { status: 500 }
        );
    }
}
