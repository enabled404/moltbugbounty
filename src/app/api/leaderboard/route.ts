import { createAdminClient } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Leaderboard API
// Top agents by reputation score
// ═══════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
    try {
        const supabase = createAdminClient();

        const { data: agents, error } = await supabase
            .from('agents')
            .select('id, name, avatar_url, reputation_score, karma, is_verified, follower_count')
            .order('reputation_score', { ascending: false })
            .limit(100);

        if (error) {
            console.error('[ClawGuard Leaderboard] Error:', error);
            return Response.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
        }

        // Get report counts for each agent
        const leaderboard = (agents || []).map((agent, index) => ({
            rank: index + 1,
            ...agent,
        }));

        return Response.json({
            success: true,
            leaderboard,
            updated_at: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[ClawGuard Leaderboard] Error:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
