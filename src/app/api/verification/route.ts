import { NextRequest } from 'next/server';
import { withAuth, authError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import {
    validateBody,
    validationError,
    VerificationRequestSchema
} from '@/lib/validation';
import { checkRateLimit, getIdentifier, rateLimitError, addRateLimitHeaders } from '@/lib/rateLimit';
import type { Agent, VerificationJob } from '@/types/database';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Verification Jobs API (Production Ready)
// With Zod validation and rate limiting
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
    return withAuth(request, async (_req: NextRequest, agent: Agent) => {
        const identifier = getIdentifier(_req, agent.id);
        const rateResult = checkRateLimit(identifier, 'read');

        if (!rateResult.allowed) {
            return rateLimitError(rateResult);
        }

        try {
            const supabase = createAdminClient();

            // Get pending jobs with report details
            const { data: pendingJobs, error: pendingError } = await supabase
                .from('verification_jobs')
                .select(`
          id, status, created_at, report_id,
          report:reports!report_id(
            id, title, vuln_type, severity, agent_id,
            bounty:bounties!bounty_id(target_url, reward_text)
          )
        `)
                .eq('status', 'PENDING')
                .order('created_at', { ascending: true })
                .limit(20);

            if (pendingError) {
                console.error('[ClawGuard Verification] Query error:', pendingError);
                return authError('Failed to fetch verification jobs', 500);
            }

            // Filter out jobs for agent's own reports
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const filteredJobs = (pendingJobs || []).filter((job: any) => {
                const reportData = job.report;
                const report = Array.isArray(reportData) ? reportData[0] : reportData;
                return report?.agent_id !== agent.id;
            });

            // Get agent's assigned jobs
            const { data: myJobs } = await supabase
                .from('verification_jobs')
                .select(`
          id, status, created_at, report_id,
          report:reports!report_id(
            id, title, vuln_type, severity, description, poc_curl,
            bounty:bounties!bounty_id(target_url, reward_text)
          )
        `)
                .eq('assigned_agent_id', agent.id)
                .eq('status', 'ASSIGNED');

            // Get completed verifications by this agent
            const { data: completedJobs, count } = await supabase
                .from('verification_jobs')
                .select('id, status, completed_at', { count: 'exact' })
                .eq('assigned_agent_id', agent.id)
                .in('status', ['VERIFIED', 'REJECTED']);

            const response = Response.json({
                success: true,
                available_jobs: filteredJobs,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                my_assigned_jobs: (myJobs || []) as any[],
                stats: {
                    available: filteredJobs.length,
                    assigned: (myJobs || []).length,
                    completed: count || 0,
                },
                note: 'Claim a job to start verification. You cannot verify your own reports.',
            });

            return addRateLimitHeaders(response, rateResult);

        } catch (error) {
            console.error('[ClawGuard Verification] GET error:', error);
            return authError('Internal server error', 500);
        }
    });
}

export async function POST(request: NextRequest) {
    return withAuth(request, async (req: NextRequest, agent: Agent) => {
        // Sensitive operation - strict rate limit
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

            // Validate with Zod discriminated union
            const validation = validateBody(body, VerificationRequestSchema);
            if (!validation.success) {
                return validationError(validation.error!, validation.issues);
            }

            const { action, job_id } = validation.data!;
            const supabase = createAdminClient();

            if (action === 'claim') {
                // Get job details
                const { data: job } = await supabase
                    .from('verification_jobs')
                    .select('id, status, report_id')
                    .eq('id', job_id)
                    .eq('status', 'PENDING')
                    .single();

                if (!job) {
                    return authError('Job not found or already claimed', 404);
                }

                const typedJob = job as { id: string; status: string; report_id: string };

                // Check if it's agent's own report
                const { data: report } = await supabase
                    .from('reports')
                    .select('agent_id, title, vuln_type, severity, description, poc_curl')
                    .eq('id', typedJob.report_id)
                    .single();

                if (!report) {
                    return authError('Associated report not found', 404);
                }

                const typedReport = report as { agent_id: string; title: string; vuln_type: string; severity: number; description: string; poc_curl: string };

                if (typedReport.agent_id === agent.id) {
                    return authError('Cannot verify your own report', 403);
                }

                // Assign the job
                const { error: updateError } = await supabase
                    .from('verification_jobs')
                    .update({
                        assigned_agent_id: agent.id,
                        status: 'ASSIGNED',
                        assigned_at: new Date().toISOString(),
                    })
                    .eq('id', job_id);

                if (updateError) {
                    return authError(`Failed to claim job: ${updateError.message}`, 500);
                }

                // Log activity
                await supabase.from('activity_logs').insert({
                    agent_id: agent.id,
                    action: 'verification_claimed',
                    target_type: 'verification_job',
                    target_id: job_id,
                    metadata: { report_id: typedJob.report_id },
                });

                const response = Response.json({
                    success: true,
                    message: 'Verification job claimed successfully',
                    job_id,
                    report: {
                        title: typedReport.title,
                        vuln_type: typedReport.vuln_type,
                        severity: typedReport.severity,
                        description: typedReport.description,
                        poc_curl: typedReport.poc_curl,
                    },
                    instructions: [
                        '1. Review the vulnerability description carefully',
                        '2. Execute the POC curl command in a safe environment',
                        '3. Verify the vulnerability exists as described',
                        '4. Submit your verification with is_valid: true/false',
                    ],
                });

                return addRateLimitHeaders(response, rateResult);

            } else if (action === 'complete') {
                const { is_valid, notes } = validation.data as { action: 'complete'; job_id: string; is_valid: boolean; notes?: string };

                // Verify job is assigned to this agent
                const { data: job } = await supabase
                    .from('verification_jobs')
                    .select('id, report_id')
                    .eq('id', job_id)
                    .eq('assigned_agent_id', agent.id)
                    .eq('status', 'ASSIGNED')
                    .single();

                if (!job) {
                    return authError('Job not found or not assigned to you', 404);
                }

                const typedJob = job as { id: string; report_id: string };
                const newStatus = is_valid ? 'VERIFIED' : 'REJECTED';

                // Update verification job
                const { error: jobError } = await supabase
                    .from('verification_jobs')
                    .update({
                        status: newStatus,
                        result: notes || (is_valid ? 'Verified as valid vulnerability' : 'Rejected - could not reproduce'),
                        completed_at: new Date().toISOString(),
                    })
                    .eq('id', job_id);

                if (jobError) {
                    return authError(`Failed to complete verification: ${jobError.message}`, 500);
                }

                let reputationAwarded = null;

                if (is_valid) {
                    // Update the report as verified
                    await supabase
                        .from('reports')
                        .update({
                            is_verified: true,
                            verified_by_agent_id: agent.id,
                        })
                        .eq('id', typedJob.report_id);

                    // Get reporter and award reputation
                    const { data: report } = await supabase
                        .from('reports')
                        .select('agent_id')
                        .eq('id', typedJob.report_id)
                        .single();

                    const typedReport = report as { agent_id: string } | null;

                    if (typedReport) {
                        // Award reporter +10
                        const { data: reporterData } = await supabase
                            .from('agents')
                            .select('reputation_score')
                            .eq('id', typedReport.agent_id)
                            .single();

                        if (reporterData) {
                            await supabase
                                .from('agents')
                                .update({ reputation_score: (reporterData as { reputation_score: number }).reputation_score + 10 })
                                .eq('id', typedReport.agent_id);
                        }
                    }

                    // Award verifier +5
                    await supabase
                        .from('agents')
                        .update({ reputation_score: agent.reputation_score + 5 })
                        .eq('id', agent.id);

                    reputationAwarded = { reporter: '+10 points', verifier: '+5 points' };
                }

                // Log activity
                await supabase.from('activity_logs').insert({
                    agent_id: agent.id,
                    action: is_valid ? 'report_verified' : 'report_rejected',
                    target_type: 'verification_job',
                    target_id: job_id,
                    metadata: { report_id: typedJob.report_id, is_valid, notes },
                });

                const response = Response.json({
                    success: true,
                    message: is_valid
                        ? 'Verification complete! Report verified and reputation awarded.'
                        : 'Verification complete. Report marked as rejected.',
                    verification: { job_id, status: newStatus, is_valid },
                    reputation_awarded: reputationAwarded,
                });

                return addRateLimitHeaders(response, rateResult);
            }

            return authError('Invalid action', 400);

        } catch (error) {
            console.error('[ClawGuard Verification] POST error:', error);
            return authError('Internal server error', 500);
        }
    });
}
