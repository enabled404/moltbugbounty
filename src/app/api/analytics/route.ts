import { NextRequest } from 'next/server';
import { withAuth, authError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import type { Agent } from '@/types/database';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Analytics API
// S-Tier dashboard analytics for agents
// ═══════════════════════════════════════════════════════════════

interface ReportStats {
    total: number;
    verified: number;
    pending: number;
    rejected: number;
    by_severity: Record<string, number>;
    by_type: Record<string, number>;
}

interface EarningsData {
    total: string;
    this_month: string;
    last_month: string;
    trend_percentage: number;
}

interface ActivityData {
    date: string;
    reports: number;
    verifications: number;
}

// GET: Fetch analytics for authenticated agent
export async function GET(request: NextRequest) {
    return withAuth(request, async (_req: NextRequest, agent: Agent) => {
        try {
            const supabase = createAdminClient();
            const { searchParams } = new URL(request.url);

            const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, all

            // Get date range
            const now = new Date();
            let startDate: Date;

            switch (period) {
                case '7d':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '90d':
                    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                case 'all':
                    startDate = new Date('2020-01-01');
                    break;
                default:
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }

            // Fetch all agent's reports
            const { data: reports, error: reportsError } = await supabase
                .from('reports')
                .select('id, vuln_type, severity, is_verified, created_at')
                .eq('agent_id', agent.id)
                .gte('created_at', startDate.toISOString());

            if (reportsError) {
                console.error('[ClawGuard Analytics] Reports query error:', reportsError);
                return authError('Failed to fetch analytics', 500);
            }

            // Calculate report stats
            const reportStats: ReportStats = {
                total: reports?.length || 0,
                verified: reports?.filter(r => r.is_verified).length || 0,
                pending: reports?.filter(r => !r.is_verified).length || 0,
                rejected: 0, // Would need rejection status in schema
                by_severity: {},
                by_type: {},
            };

            // Group by severity and type
            (reports || []).forEach(report => {
                const severity = report.severity?.toString() || 'unknown';
                const vulnType = report.vuln_type || 'unknown';

                reportStats.by_severity[severity] = (reportStats.by_severity[severity] || 0) + 1;
                reportStats.by_type[vulnType] = (reportStats.by_type[vulnType] || 0) + 1;
            });

            // Fetch verification jobs assigned to agent
            const { data: verifications } = await supabase
                .from('verification_jobs')
                .select('id, status, created_at, completed_at')
                .eq('assigned_agent_id', agent.id)
                .gte('created_at', startDate.toISOString());

            const verificationStats = {
                total: verifications?.length || 0,
                completed: verifications?.filter(v => v.status === 'VERIFIED' || v.status === 'REJECTED').length || 0,
                pending: verifications?.filter(v => v.status === 'PENDING' || v.status === 'ASSIGNED').length || 0,
            };

            // Calculate earnings (mock data for now - would come from payout records)
            const earnings: EarningsData = {
                total: agent.total_earnings || '0',
                this_month: '0',
                last_month: '0',
                trend_percentage: 0,
            };

            // Generate activity timeline (last 7 days)
            const activityData: ActivityData[] = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                const dateStr = date.toISOString().split('T')[0];

                const dayReports = (reports || []).filter(r =>
                    r.created_at.startsWith(dateStr)
                ).length;

                const dayVerifications = (verifications || []).filter(v =>
                    v.completed_at?.startsWith(dateStr)
                ).length;

                activityData.push({
                    date: dateStr,
                    reports: dayReports,
                    verifications: dayVerifications,
                });
            }

            // Get agent rank
            const { data: allAgents } = await supabase
                .from('agents')
                .select('id, reputation_score')
                .order('reputation_score', { ascending: false });

            const agentRank = (allAgents || []).findIndex(a => a.id === agent.id) + 1;

            // Get platform stats
            const { data: platformStats } = await supabase
                .from('platform_stats')
                .select('*')
                .eq('id', 'global')
                .single();

            return Response.json({
                success: true,
                analytics: {
                    period,
                    agent: {
                        id: agent.id,
                        name: agent.name,
                        reputation: agent.reputation_score,
                        rank: agentRank || 0,
                        total_rank: allAgents?.length || 0,
                    },
                    reports: reportStats,
                    verifications: verificationStats,
                    earnings,
                    activity: activityData,
                    platform: platformStats || {
                        total_bounties: 0,
                        total_reports: 0,
                        total_verified: 0,
                        active_agents: 0,
                    },
                },
            });

        } catch (error) {
            console.error('[ClawGuard Analytics] GET error:', error);
            return authError('Internal server error', 500);
        }
    });
}
