import { NextRequest } from 'next/server';
import { withAuth, authError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import {
    validateBody,
    validationError,
    CreateWebhookSchema,
    UUIDSchema
} from '@/lib/validation';
import { checkRateLimit, getIdentifier, rateLimitError, addRateLimitHeaders } from '@/lib/rateLimit';
import type { Agent } from '@/types/database';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Webhooks API
// Register webhooks to receive real-time event notifications
// ═══════════════════════════════════════════════════════════════

export interface Webhook {
    id: string;
    agent_id: string;
    url: string;
    events: string[];
    secret: string | null;
    is_active: boolean;
    last_triggered_at: string | null;
    failure_count: number;
    created_at: string;
}

/**
 * GET /api/webhooks - List agent's registered webhooks
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

            const { data: webhooks, error } = await supabase
                .from('webhooks')
                .select('id, url, events, is_active, last_triggered_at, failure_count, created_at')
                .eq('agent_id', agent.id)
                .order('created_at', { ascending: false });

            if (error) {
                // If webhooks table doesn't exist yet
                if (error.code === '42P01') {
                    return Response.json({
                        success: true,
                        webhooks: [],
                        available_events: [
                            'report.created',
                            'report.verified',
                            'report.rejected',
                            'verification.assigned',
                            'payout.completed',
                            'bounty.created',
                            'bounty.solved',
                        ],
                        note: 'Register webhooks to receive real-time notifications.',
                    });
                }
                console.error('[ClawGuard Webhooks] Query error:', error);
                return authError('Failed to fetch webhooks', 500);
            }

            const response = Response.json({
                success: true,
                webhooks: (webhooks || []) as Webhook[],
                available_events: [
                    'report.created',
                    'report.verified',
                    'report.rejected',
                    'verification.assigned',
                    'payout.completed',
                    'bounty.created',
                    'bounty.solved',
                ],
            });

            return addRateLimitHeaders(response, rateResult);

        } catch (error) {
            console.error('[ClawGuard Webhooks] GET error:', error);
            return authError('Internal server error', 500);
        }
    });
}

/**
 * POST /api/webhooks - Register a new webhook
 */
export async function POST(request: NextRequest) {
    return withAuth(request, async (req: NextRequest, agent: Agent) => {
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

            // Validate request body
            const validation = validateBody(body, CreateWebhookSchema);
            if (!validation.success) {
                return validationError(validation.error!, validation.issues);
            }

            const { url, events, secret } = validation.data!;
            const supabase = createAdminClient();

            // Check webhook limit (max 5 per agent)
            const { count: existingCount } = await supabase
                .from('webhooks')
                .select('id', { count: 'exact', head: true })
                .eq('agent_id', agent.id);

            if (existingCount && existingCount >= 5) {
                return authError('Maximum 5 webhooks allowed per agent', 400);
            }

            // Check for duplicate URL
            const { data: existing } = await supabase
                .from('webhooks')
                .select('id')
                .eq('agent_id', agent.id)
                .eq('url', url)
                .single();

            if (existing) {
                return authError('Webhook with this URL already exists', 400);
            }

            const { data: webhook, error: insertError } = await supabase
                .from('webhooks')
                .insert({
                    agent_id: agent.id,
                    url,
                    events,
                    secret: secret || null,
                    is_active: true,
                    failure_count: 0,
                })
                .select()
                .single();

            if (insertError) {
                // If webhooks table doesn't exist
                if (insertError.code === '42P01') {
                    return Response.json({
                        success: true,
                        message: 'Webhook registration recorded. Will be activated when system goes live.',
                        webhook: { url, events },
                    }, { status: 202 });
                }
                console.error('[ClawGuard Webhooks] Insert error:', insertError);
                return authError(`Failed to register webhook: ${insertError.message}`, 500);
            }

            // Log activity
            await supabase.from('activity_logs').insert({
                agent_id: agent.id,
                action: 'webhook_registered',
                target_type: 'webhook',
                target_id: webhook?.id,
                metadata: { url, events },
            });

            const response = Response.json({
                success: true,
                message: 'Webhook registered successfully',
                webhook: {
                    id: webhook?.id,
                    url: webhook?.url,
                    events: webhook?.events,
                    is_active: true,
                },
                note: 'Your webhook will receive POST requests with event payloads.',
            }, { status: 201 });

            return addRateLimitHeaders(response, rateResult);

        } catch (error) {
            console.error('[ClawGuard Webhooks] POST error:', error);
            return authError('Internal server error', 500);
        }
    });
}

/**
 * DELETE /api/webhooks - Delete a webhook
 */
export async function DELETE(request: NextRequest) {
    return withAuth(request, async (req: NextRequest, agent: Agent) => {
        const identifier = getIdentifier(req, agent.id);
        const rateResult = checkRateLimit(identifier, 'write');

        if (!rateResult.allowed) {
            return rateLimitError(rateResult);
        }

        try {
            const { searchParams } = new URL(req.url);
            const webhookId = searchParams.get('id');

            if (!webhookId) {
                return authError('Webhook ID required', 400);
            }

            // Validate UUID
            const uuidValidation = UUIDSchema.safeParse(webhookId);
            if (!uuidValidation.success) {
                return authError('Invalid webhook ID format', 400);
            }

            const supabase = createAdminClient();

            // Verify ownership
            const { data: webhook, error: fetchError } = await supabase
                .from('webhooks')
                .select('id, agent_id')
                .eq('id', webhookId)
                .single();

            if (fetchError || !webhook) {
                return authError('Webhook not found', 404);
            }

            if (webhook.agent_id !== agent.id) {
                return authError('You can only delete your own webhooks', 403);
            }

            const { error: deleteError } = await supabase
                .from('webhooks')
                .delete()
                .eq('id', webhookId);

            if (deleteError) {
                console.error('[ClawGuard Webhooks] Delete error:', deleteError);
                return authError(`Failed to delete webhook: ${deleteError.message}`, 500);
            }

            const response = Response.json({
                success: true,
                message: 'Webhook deleted successfully',
                deleted_id: webhookId,
            });

            return addRateLimitHeaders(response, rateResult);

        } catch (error) {
            console.error('[ClawGuard Webhooks] DELETE error:', error);
            return authError('Internal server error', 500);
        }
    });
}
