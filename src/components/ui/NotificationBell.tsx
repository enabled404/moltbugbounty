'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './Toast';

// ═══════════════════════════════════════════════════════════════
// CLAWGUARD - NOTIFICATION BELL COMPONENT
// Real-time notification center with live updates
// ═══════════════════════════════════════════════════════════════

interface Notification {
    id: string;
    type: string;
    title: string;
    message?: string;
    is_read: boolean;
    metadata: Record<string, unknown>;
    created_at: string;
}

interface NotificationBellProps {
    className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const toast = useToast();

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch('/api/notifications?limit=10');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unread_count || 0);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Mark notifications as read
    const markAsRead = async (notificationIds: string[]) => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notification_ids: notificationIds }),
            });

            setNotifications(prev =>
                prev.map(n =>
                    notificationIds.includes(n.id)
                        ? { ...n, is_read: true }
                        : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mark_all_read: true }),
            });

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            toast.success('All notifications marked as read');
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // When dropdown opens, mark visible unread as read after a delay
    useEffect(() => {
        if (isOpen && unreadCount > 0) {
            const unreadIds = notifications
                .filter(n => !n.is_read)
                .slice(0, 5)
                .map(n => n.id);

            if (unreadIds.length > 0) {
                const timer = setTimeout(() => markAsRead(unreadIds), 2000);
                return () => clearTimeout(timer);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const getTypeIcon = (type: string) => {
        const icons: Record<string, string> = {
            report_verified: '✅',
            report_rejected: '❌',
            payout_received: '💰',
            payout_initiated: '💸',
            new_bounty: '🎯',
            bounty_update: '📋',
            verification_assigned: '🔍',
            verification_completed: '✓',
            reputation_milestone: '🏆',
            system: '⚙️',
        };
        return icons[type] || '🔔';
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div ref={dropdownRef} className={`notification-bell ${className}`}>
            <button
                className="notification-bell-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="notification-mark-all"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notification-dropdown-content">
                        {loading ? (
                            <div className="notification-loading">
                                <div className="skeleton h-12 w-full mb-2" />
                                <div className="skeleton h-12 w-full mb-2" />
                                <div className="skeleton h-12 w-full" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="notification-empty">
                                <span className="text-2xl mb-2">🔔</span>
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                                    onClick={() => {
                                        if (!notification.is_read) {
                                            markAsRead([notification.id]);
                                        }
                                    }}
                                >
                                    <span className="notification-item-icon">
                                        {getTypeIcon(notification.type)}
                                    </span>
                                    <div className="notification-item-content">
                                        <span className="notification-item-title">
                                            {notification.title}
                                        </span>
                                        {notification.message && (
                                            <span className="notification-item-message">
                                                {notification.message}
                                            </span>
                                        )}
                                        <span className="notification-item-time">
                                            {formatTime(notification.created_at)}
                                        </span>
                                    </div>
                                    {!notification.is_read && (
                                        <span className="notification-item-dot" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="notification-dropdown-footer">
                        <a href="/dashboard" className="notification-view-all">
                            View all notifications
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
