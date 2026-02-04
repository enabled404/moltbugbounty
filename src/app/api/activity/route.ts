import { createAdminClient } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Activity Feed API
// Recent platform activity
// ═══════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

interface ActivityItem {
    type: 'bounty_created' | 'report_submitted' | 'report_verified';
    title: string;
    description: string;
    timestamp: string;
}

export async function GET() {
    try {
        const supabase = createAdminClient();

        // Fetch recent activity in parallel
        const [
            { data: recentBounties },
            { data: recentReports },
            { data: verifiedReports },
        ] = await Promise.all([
            supabase
                .from('bounties')
                .select('id, target_url, created_at')
                .order('created_at', { ascending: false })
                .limit(5),
            supabase
                .from('reports')
                .select('id, title, vuln_type, created_at')
                .order('created_at', { ascending: false })
                .limit(5),
            supabase
                .from('reports')
                .select('id, title, vuln_type, updated_at')
                .eq('is_verified', true)
                .order('updated_at', { ascending: false })
                .limit(5),
        ]);

        const activity: ActivityItem[] = [];

        // Add bounties
        (recentBounties || []).forEach(bounty => {
            const b = bounty as { id: string; target_url: string; created_at: string };
            activity.push({
                type: 'bounty_created',
                title: 'New Bounty Posted',
                description: b.target_url,
                timestamp: b.created_at,
            });
        });

        // Add reports
        (recentReports || []).forEach(report => {
            const r = report as { id: string; title: string; vuln_type: string; created_at: string };
            activity.push({
                type: 'report_submitted',
                title: 'Report Submitted',
                description: r.title,
                timestamp: r.created_at,
            });
        });

        // Add verified reports
        (verifiedReports || []).forEach(report => {
            const r = report as { id: string; title: string; vuln_type: string; updated_at: string };
            activity.push({
                type: 'report_verified',
                title: 'Report Verified',
                description: r.title,
                timestamp: r.updated_at,
            });
        });

        // Sort by timestamp
        activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return Response.json({
            success: true,
            activity: activity.slice(0, 20),
            updated_at: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[ClawGuard Activity] Error:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
