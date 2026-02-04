import { NextRequest } from 'next/server';
import { withAuth, authError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import type { Agent } from '@/types/database';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Notifications API
// S-Tier notification management for agents
// ═══════════════════════════════════════════════════════════════

interface Notification {
    id: string;
    agent_id: string;
    type: string;
    title: string;
    message?: string;
    is_read: boolean;
    metadata: Record<string, unknown>;
    created_at: string;
}

// GET: Fetch notifications for authenticated agent
export async function GET(request: NextRequest) {
    return withAuth(request, async (_req: NextRequest, agent: Agent) => {
        try {
            const supabase = createAdminClient();
            const { searchParams } = new URL(request.url);

            const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
            const unreadOnly = searchParams.get('unread') === 'true';

            let query = supabase
                .from('notifications')
                .select('*')
                .eq('agent_id', agent.id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (unreadOnly) {
                query = query.eq('is_read', false);
            }

            const { data: notifications, error } = await query;

            if (error) {
                console.error('[ClawGuard Notifications] Query error:', error);
                return authError('Failed to fetch notifications', 500);
            }

            // Get unread count
            const { count: unreadCount } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('agent_id', agent.id)
                .eq('is_read', false);

            return Response.json({
                success: true,
                notifications: (notifications || []) as Notification[],
                unread_count: unreadCount || 0,
            });

        } catch (error) {
            console.error('[ClawGuard Notifications] GET error:', error);
            return authError('Internal server error', 500);
        }
    });
}

// PATCH: Mark notifications as read
export async function PATCH(request: NextRequest) {
    return withAuth(request, async (req: NextRequest, agent: Agent) => {
        try {
            const body = await req.json();
            const { notification_ids, mark_all_read } = body;

            const supabase = createAdminClient();

            if (mark_all_read) {
                // Mark all notifications as read
                const { error } = await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('agent_id', agent.id)
                    .eq('is_read', false);

                if (error) {
                    console.error('[ClawGuard Notifications] Mark all read error:', error);
                    return authError('Failed to update notifications', 500);
                }

                return Response.json({
                    success: true,
                    message: 'All notifications marked as read',
                });
            }

            if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
                return authError('notification_ids array is required', 400);
            }

            // Mark specific notifications as read
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('agent_id', agent.id)
                .in('id', notification_ids);

            if (error) {
                console.error('[ClawGuard Notifications] Update error:', error);
                return authError('Failed to update notifications', 500);
            }

            return Response.json({
                success: true,
                message: `${notification_ids.length} notification(s) marked as read`,
            });

        } catch (error) {
            console.error('[ClawGuard Notifications] PATCH error:', error);
            return authError('Invalid request body', 400);
        }
    });
}

// DELETE: Delete notifications
export async function DELETE(request: NextRequest) {
    return withAuth(request, async (req: NextRequest, agent: Agent) => {
        try {
            const body = await req.json();
            const { notification_ids, delete_all_read } = body;

            const supabase = createAdminClient();

            if (delete_all_read) {
                // Delete all read notifications
                const { error } = await supabase
                    .from('notifications')
                    .delete()
                    .eq('agent_id', agent.id)
                    .eq('is_read', true);

                if (error) {
                    console.error('[ClawGuard Notifications] Delete all read error:', error);
                    return authError('Failed to delete notifications', 500);
                }

                return Response.json({
                    success: true,
                    message: 'All read notifications deleted',
                });
            }

            if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
                return authError('notification_ids array is required', 400);
            }

            // Delete specific notifications
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('agent_id', agent.id)
                .in('id', notification_ids);

            if (error) {
                console.error('[ClawGuard Notifications] Delete error:', error);
                return authError('Failed to delete notifications', 500);
            }

            return Response.json({
                success: true,
                message: `${notification_ids.length} notification(s) deleted`,
            });

        } catch (error) {
            console.error('[ClawGuard Notifications] DELETE error:', error);
            return authError('Invalid request body', 400);
        }
    });
}
