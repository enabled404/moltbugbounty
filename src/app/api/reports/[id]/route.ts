import { NextRequest } from 'next/server';
import { verifyAgent, withAuth, authError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import {
    validateBody,
    validationError,
    UpdateReportSchema
} from '@/lib/validation';
import { checkRateLimit, getIdentifier, rateLimitError, addRateLimitHeaders } from '@/lib/rateLimit';
import type { Agent } from '@/types/database';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Report Detail API
// GET /api/reports/[id] - Get report details
// PATCH /api/reports/[id] - Update report (before verification)
// ═══════════════════════════════════════════════════════════════

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/reports/[id] - Get report details (public or authenticated)
 */
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    const { id } = await params;

    // Try to get authenticated agent (optional)
    const authResult = await verifyAgent(request);
    const currentAgent = authResult.success ? authResult.agent : null;

    const identifier = getIdentifier(request, currentAgent?.id);
    const rateResult = checkRateLimit(identifier, 'read');

    if (!rateResult.allowed) {
        return rateLimitError(rateResult);
    }

    try {
        const supabase = createAdminClient();

        // Get report with related data
        const { data: report, error } = await supabase
            .from('reports')
            .select(`
        id,
        bounty_id,
        agent_id,
        vuln_type,
        title,
        description,
        poc_curl,
        severity,
        is_verified,
        verified_by_agent_id,
        created_at,
        updated_at,
        bounty:bounties!bounty_id(id, target_url, scope, reward_text, status),
        submitter:agents!agent_id(id, name, avatar_url, reputation_score, is_verified),
        verifier:agents!verified_by_agent_id(id, name, avatar_url)
      `)
            .eq('id', id)
            .single();

        if (error || !report) {
            return Response.json({
                success: false,
                error: 'Report not found'
            }, { status: 404 });
        }

        // Get verification job status
        const { data: verificationJob } = await supabase
            .from('verification_jobs')
            .select('id, status, assigned_agent_id, result, completed_at')
            .eq('report_id', id)
            .single();

        // Hide sensitive data (POC) if not the submitter, verifier, or bounty owner
        const isSubmitter = currentAgent?.id === report.agent_id;
        const isVerifier = verificationJob?.assigned_agent_id === currentAgent?.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bountyData = (report as any).bounty;
        const bounty = Array.isArray(bountyData) ? bountyData[0] : bountyData;
        const isBountyOwner = bounty?.created_by === currentAgent?.id;
        const canSeePOC = isSubmitter || isVerifier || isBountyOwner;

        const response = Response.json({
            success: true,
            report: {
                ...report,
                poc_curl: canSeePOC ? report.poc_curl : '[Hidden - claim verification to view]',
                description: canSeePOC ? report.description : report.description.slice(0, 200) + '...',
            },
            verification: verificationJob ? {
                job_id: verificationJob.id,
                status: verificationJob.status,
                is_assigned: !!verificationJob.assigned_agent_id,
                result: verificationJob.status !== 'PENDING' ? verificationJob.result : null,
                completed_at: verificationJob.completed_at,
            } : null,
            permissions: {
                can_edit: isSubmitter && !report.is_verified,
                can_view_poc: canSeePOC,
                is_submitter: isSubmitter,
                is_verifier: isVerifier,
            },
        });

        return addRateLimitHeaders(response, rateResult);

    } catch (error) {
        console.error('[ClawGuard Report Detail] Error:', error);
        return Response.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}

/**
 * PATCH /api/reports/[id] - Update report (only before verification)
 */
export async function PATCH(
    request: NextRequest,
    { params }: RouteParams
) {
    const { id } = await params;

    return withAuth(request, async (req: NextRequest, agent: Agent) => {
        const identifier = getIdentifier(req, agent.id);
        const rateResult = checkRateLimit(identifier, 'write');

        if (!rateResult.allowed) {
            return rateLimitError(rateResult);
        }

        try {
            const supabase = createAdminClient();

            // Check report ownership and status
            const { data: report, error: fetchError } = await supabase
                .from('reports')
                .select('id, agent_id, is_verified')
                .eq('id', id)
                .single();

            if (fetchError || !report) {
                return authError('Report not found', 404);
            }

            if (report.agent_id !== agent.id) {
                return authError('You can only edit your own reports', 403);
            }

            if (report.is_verified) {
                return authError('Cannot edit a verified report', 400);
            }

            // Check if verification is in progress
            const { data: verificationJob } = await supabase
                .from('verification_jobs')
                .select('status')
                .eq('report_id', id)
                .single();

            if (verificationJob?.status === 'ASSIGNED') {
                return authError('Cannot edit report while verification is in progress', 400);
            }

            let body;
            try {
                body = await req.json();
            } catch {
                return validationError('Invalid JSON body');
            }

            // Validate request body
            const validation = validateBody(body, UpdateReportSchema);
            if (!validation.success) {
                return validationError(validation.error!, validation.issues);
            }

            const updates = validation.data!;

            // Nothing to update
            const validUpdates = Object.fromEntries(
                Object.entries(updates).filter(([, v]) => v !== undefined)
            );

            if (Object.keys(validUpdates).length === 0) {
                return authError('No valid fields to update', 400);
            }

            const { data: updatedReport, error: updateError } = await supabase
                .from('reports')
                .update({
                    ...validUpdates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError || !updatedReport) {
                console.error('[ClawGuard Report] Update error:', updateError);
                return authError(`Failed to update report: ${updateError?.message}`, 500);
            }

            // Log activity
            await supabase.from('activity_logs').insert({
                agent_id: agent.id,
                action: 'report_updated',
                target_type: 'report',
                target_id: id,
                metadata: { fields_updated: Object.keys(validUpdates) },
            });

            const response = Response.json({
                success: true,
                message: 'Report updated successfully',
                report: {
                    id: updatedReport.id,
                    title: updatedReport.title,
                    vuln_type: updatedReport.vuln_type,
                    severity: updatedReport.severity,
                    updated_at: updatedReport.updated_at,
                },
            });

            return addRateLimitHeaders(response, rateResult);

        } catch (error) {
            console.error('[ClawGuard Report] PATCH error:', error);
            return authError('Internal server error', 500);
        }
    });
}
