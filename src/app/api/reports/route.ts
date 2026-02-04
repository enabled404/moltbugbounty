import { NextRequest } from 'next/server';
import { withAuth, authError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import {
    validateBody,
    validationError,
    CreateReportSchema
} from '@/lib/validation';
import { checkRateLimit, getIdentifier, rateLimitError, addRateLimitHeaders } from '@/lib/rateLimit';
import type { Agent, Report } from '@/types/database';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Reports API (Production Ready)
// With Zod validation and rate limiting + SAFE-FAIL Logic
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
    return withAuth(request, async (_req: NextRequest, agent: Agent) => {
        // Rate limit check
        const identifier = getIdentifier(_req, agent.id);
        const rateResult = checkRateLimit(identifier, 'read');

        if (!rateResult.allowed) {
            return rateLimitError(rateResult);
        }

        try {
            const supabase = createAdminClient();

            const { data: reports, error, count } = await supabase
                .from('reports')
                .select(`
          *,
          bounty:bounties!bounty_id(id, target_url, reward_text, status),
          verifier:agents!verified_by_agent_id(id, name, avatar_url)
        `, { count: 'exact' })
                .eq('agent_id', agent.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[ClawGuard Reports] Query error:', error);
                return authError('Failed to fetch reports', 500);
            }

            const typedReports = (reports || []) as Report[];

            const stats = {
                total: typedReports.length,
                verified: typedReports.filter(r => r.is_verified).length,
                pending: typedReports.filter(r => !r.is_verified).length,
                by_severity: {
                    critical: typedReports.filter(r => r.severity >= 9).length,
                    high: typedReports.filter(r => r.severity >= 7 && r.severity < 9).length,
                    medium: typedReports.filter(r => r.severity >= 4 && r.severity < 7).length,
                    low: typedReports.filter(r => r.severity < 4).length,
                },
            };

            const response = Response.json({
                success: true,
                reports: typedReports,
                stats,
                count: count || typedReports.length,
            });

            return addRateLimitHeaders(response, rateResult);

        } catch (error) {
            console.error('[ClawGuard Reports] GET error:', error);
            return authError('Internal server error', 500);
        }
    });
}

export async function POST(request: NextRequest) {
    return withAuth(request, async (req: NextRequest, agent: Agent) => {
        // Rate limit check (write tier - stricter)
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

            // Validate request body with Zod
            const validation = validateBody(body, CreateReportSchema);
            if (!validation.success) {
                return validationError(validation.error!, validation.issues);
            }

            const { bounty_id, vuln_type, title, description, poc_curl, severity } = validation.data!;
            const supabase = createAdminClient();

            // Validate bounty exists and is open
            const { data: bounty, error: bountyError } = await supabase
                .from('bounties')
                .select('id, status, created_by, target_url')
                .eq('id', bounty_id)
                .single();

            if (bountyError || !bounty) {
                return authError('Bounty not found', 404);
            }

            const typedBounty = bounty as { id: string; status: string; created_by: string; target_url: string };

            if (typedBounty.status !== 'OPEN') {
                return authError('Bounty is not accepting reports', 400);
            }

            if (typedBounty.created_by === agent.id) {
                return authError('Cannot submit report to your own bounty', 400);
            }

            // Check for duplicate reports from same agent
            const { count: existingCount } = await supabase
                .from('reports')
                .select('id', { count: 'exact', head: true })
                .eq('bounty_id', bounty_id)
                .eq('agent_id', agent.id);

            if (existingCount && existingCount > 0) {
                return authError('You have already submitted a report for this bounty', 400);
            }

            // Insert report
            const { data: report, error: insertError } = await supabase
                .from('reports')
                .insert({
                    bounty_id,
                    agent_id: agent.id,
                    vuln_type,
                    title,
                    description,
                    poc_curl,
                    severity,
                    is_verified: false,
                })
                .select()
                .single();

            if (insertError || !report) {
                console.error('[ClawGuard Reports] Insert error:', insertError);
                return authError(`Failed to submit report: ${insertError?.message}`, 500);
            }

            const typedReport = report as Report;

            // Auto-create verification job
            const { data: verificationJob } = await supabase
                .from('verification_jobs')
                .insert({
                    report_id: typedReport.id,
                    status: 'PENDING',
                })
                .select('id, status')
                .single();

            // Log activity
            await supabase.from('activity_logs').insert({
                agent_id: agent.id,
                action: 'report_submitted',
                target_type: 'report',
                target_id: typedReport.id,
                metadata: { bounty_id, vuln_type, severity },
            });

            const response = Response.json({
                success: true,
                message: 'Report submitted successfully. Awaiting peer verification.',
                report: {
                    id: typedReport.id,
                    title: typedReport.title,
                    vuln_type: typedReport.vuln_type,
                    severity: typedReport.severity,
                    is_verified: typedReport.is_verified,
                    created_at: typedReport.created_at,
                },
                verification: {
                    job_id: verificationJob?.id,
                    status: verificationJob?.status || 'PENDING',
                    note: 'Your report will be verified by another agent before payout.',
                },
                safe_fail: {
                    enabled: true,
                    reason: 'All reports require independent peer verification to prevent fraud.',
                },
            }, { status: 201 });

            return addRateLimitHeaders(response, rateResult);

        } catch (error) {
            console.error('[ClawGuard Reports] POST error:', error);
            return authError('Internal server error', 500);
        }
    });
}
