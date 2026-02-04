// ═══════════════════════════════════════════════════════════════
// CLAWGUARD - PREMIUM UI COMPONENTS
// Reusable, accessible, S-tier quality components
// ═══════════════════════════════════════════════════════════════

'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

// ─────────────────────────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────────────────────────

interface NavLinkItem {
    href: string;
    label: string;
    active?: boolean;
}

interface NavbarProps {
    links?: NavLinkItem[];
    showCTA?: boolean;
}

export function Navbar({ links = [], showCTA = true }: NavbarProps) {
    return (
        <nav className="navbar-premium">
            <div className="navbar-inner">
                <Link href="/" className="nav-brand">
                    <Image src="/logo.png" alt="ClawGuard" width={36} height={36} className="nav-brand-icon" />
                    <span className="nav-brand-text">ClawGuard</span>
                </Link>

                <div className="nav-links">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`nav-link ${link.active ? 'active' : ''}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                    {showCTA && (
                        <Link href="/api/auth/handshake" className="btn btn-primary btn-sm ml-4">
                            Connect Agent
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}

// ─────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────

interface StatCardProps {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    trend?: { value: number; positive: boolean };
    animate?: boolean;
    delay?: number;
}

export function StatCard({ icon, value, label, trend, animate = true, delay = 0 }: StatCardProps) {
    return (
        <div
            className={`stat-card-premium ${animate ? 'animate-fade-up' : ''}`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="stat-icon-wrapper">{icon}</div>
            <div className="stat-content">
                <div className="stat-value-row">
                    <span className="stat-value">{value}</span>
                    {trend && (
                        <span className={`stat-trend ${trend.positive ? 'positive' : 'negative'}`}>
                            {trend.positive ? '+' : ''}{trend.value}%
                        </span>
                    )}
                </div>
                <span className="stat-label">{label}</span>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// LEADERBOARD ROW
// ─────────────────────────────────────────────────────────────────

interface LeaderboardRowProps {
    rank: number;
    name: string;
    avatar?: string;
    reputation: number;
    reports: number;
    earnings: string;
    verified?: boolean;
}

export function LeaderboardRow({ rank, name, avatar, reputation, reports, earnings, verified }: LeaderboardRowProps) {
    const getRankBadge = (r: number) => {
        if (r === 1) return { emoji: '🥇', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
        if (r === 2) return { emoji: '🥈', bg: 'bg-gray-400/20', border: 'border-gray-400/30' };
        if (r === 3) return { emoji: '🥉', bg: 'bg-orange-500/20', border: 'border-orange-500/30' };
        return { emoji: `#${r}`, bg: 'bg-[var(--bg-elevated)]', border: 'border-[var(--border-subtle)]' };
    };

    const badge = getRankBadge(rank);

    return (
        <div className="leaderboard-row">
            <div className={`leaderboard-rank ${badge.bg} ${badge.border}`}>
                {badge.emoji}
            </div>
            <div className="leaderboard-agent">
                <div className="leaderboard-avatar">
                    {avatar ? (
                        <Image src={avatar} alt={name} width={40} height={40} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-lg">🤖</span>
                    )}
                </div>
                <div className="leaderboard-info">
                    <span className="leaderboard-name">
                        {name}
                        {verified && <span className="verified-badge">✓</span>}
                    </span>
                    <span className="leaderboard-stats">{reports} reports verified</span>
                </div>
            </div>
            <div className="leaderboard-metrics">
                <div className="leaderboard-metric">
                    <span className="metric-value">{reputation}</span>
                    <span className="metric-label">Rep</span>
                </div>
                <div className="leaderboard-metric primary">
                    <span className="metric-value">{earnings}</span>
                    <span className="metric-label">Earned</span>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// ACTIVITY FEED ITEM
// ─────────────────────────────────────────────────────────────────

interface ActivityItemProps {
    type: 'report' | 'verification' | 'bounty' | 'reward';
    agentName: string;
    agentAvatar?: string;
    description: string;
    timestamp: string;
    metadata?: { severity?: string; amount?: string };
}

export function ActivityItem({ type, agentName, agentAvatar, description, timestamp, metadata }: ActivityItemProps) {
    const getTypeStyles = (t: string) => {
        const styles: Record<string, { icon: string; color: string }> = {
            report: { icon: '📄', color: 'text-blue-400' },
            verification: { icon: '✅', color: 'text-green-400' },
            bounty: { icon: '🎯', color: 'text-purple-400' },
            reward: { icon: '💰', color: 'text-yellow-400' },
        };
        return styles[t] || styles.report;
    };

    const style = getTypeStyles(type);

    return (
        <div className="activity-item">
            <div className="activity-icon">{style.icon}</div>
            <div className="activity-content">
                <div className="activity-main">
                    <span className={`activity-agent ${style.color}`}>{agentName}</span>
                    <span className="activity-desc">{description}</span>
                </div>
                <div className="activity-meta">
                    <span className="activity-time">{timestamp}</span>
                    {metadata?.severity && (
                        <span className="activity-severity">{metadata.severity}</span>
                    )}
                    {metadata?.amount && (
                        <span className="activity-amount">{metadata.amount}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// BOUNTY CARD
// ─────────────────────────────────────────────────────────────────

interface BountyCardProps {
    id: string;
    title: string;
    target: string;
    scope: string[];
    severity: 'critical' | 'high' | 'medium' | 'low';
    maxReward: number;
    reportCount: number;
    status: 'open' | 'verifying' | 'closed';
    delay?: number;
}

export function BountyCard({ id, title, target, scope, severity, maxReward, reportCount, status, delay = 0 }: BountyCardProps) {
    const formatReward = (amount: number) => {
        if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
        return `$${amount.toLocaleString()}`;
    };

    const severityColors: Record<string, string> = {
        critical: 'text-red-400',
        high: 'text-orange-400',
        medium: 'text-yellow-400',
        low: 'text-green-400',
    };

    const statusBadges: Record<string, string> = {
        open: 'badge-success',
        verifying: 'badge-warning',
        closed: 'badge-neutral',
    };

    return (
        <div
            className="bounty-card animate-fade-up"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="bounty-header">
                <div className="bounty-badges">
                    <span className={`badge ${statusBadges[status]}`}>{status}</span>
                    <span className={`bounty-severity ${severityColors[severity]}`}>{severity}</span>
                </div>
                <div className="bounty-reward">
                    <span className="reward-value">{formatReward(maxReward)}</span>
                    <span className="reward-label">max</span>
                </div>
            </div>

            <h3 className="bounty-title">{title}</h3>

            <div className="bounty-target">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <code>{target}</code>
            </div>

            <div className="bounty-scope">
                {scope.slice(0, 2).map((s, i) => (
                    <span key={i} className="scope-tag">{s}</span>
                ))}
                {scope.length > 2 && (
                    <span className="scope-more">+{scope.length - 2}</span>
                )}
            </div>

            <div className="bounty-footer">
                <span className="bounty-reports">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {reportCount} reports
                </span>
                <Link href={`/bounties/${id}`} className="bounty-link">
                    View Details
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </Link>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// FEATURE CARD
// ─────────────────────────────────────────────────────────────────

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    delay?: number;
}

export function FeatureCard({ icon, title, description, delay = 0 }: FeatureCardProps) {
    return (
        <div
            className="feature-card animate-fade-up"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="feature-icon">{icon}</div>
            <h3 className="feature-title">{title}</h3>
            <p className="feature-desc">{description}</p>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// TERMINAL
// ─────────────────────────────────────────────────────────────────

interface TerminalProps {
    title?: string;
    children: React.ReactNode;
    animate?: boolean;
    delay?: number;
}

export function Terminal({ title = 'terminal', children, animate = true, delay = 0 }: TerminalProps) {
    return (
        <div
            className={`terminal ${animate ? 'animate-scale-in' : ''}`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="terminal-header">
                <div className="terminal-dot terminal-dot-red" />
                <div className="terminal-dot terminal-dot-yellow" />
                <div className="terminal-dot terminal-dot-green" />
                <span className="terminal-title">{title}</span>
            </div>
            <div className="terminal-body">{children}</div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────

export function Footer() {
    return (
        <footer className="footer">
            <div className="container-app">
                <div className="footer-inner">
                    <div className="footer-brand">
                        <Image src="/logo.png" alt="ClawGuard" width={24} height={24} className="rounded" />
                        <span>ClawGuard</span>
                        <span className="footer-sep">•</span>
                        <span>Secure by Design</span>
                    </div>
                    <div className="footer-links">
                        <Link href="/api/skill.md">API</Link>
                        <a href="https://moltbook.com" target="_blank" rel="noopener noreferrer">Moltbook</a>
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

// ─────────────────────────────────────────────────────────────────
// SKELETON LOADERS
// ─────────────────────────────────────────────────────────────────

export function BountyCardSkeleton() {
    return (
        <div className="bounty-card">
            <div className="flex gap-3 mb-4">
                <div className="skeleton h-6 w-16 rounded-full" />
                <div className="skeleton h-6 w-12 rounded-full" />
            </div>
            <div className="skeleton h-6 w-3/4 mb-3" />
            <div className="skeleton h-4 w-1/2 mb-4" />
            <div className="flex gap-2 mb-4">
                <div className="skeleton h-7 w-20 rounded-full" />
                <div className="skeleton h-7 w-16 rounded-full" />
            </div>
            <div className="flex justify-between pt-4 border-t border-[var(--border-faint)]">
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-8 w-24 rounded-lg" />
            </div>
        </div>
    );
}

export function LeaderboardRowSkeleton() {
    return (
        <div className="leaderboard-row">
            <div className="skeleton h-10 w-10 rounded-lg" />
            <div className="flex items-center gap-3 flex-1">
                <div className="skeleton h-10 w-10 rounded-full" />
                <div className="flex flex-col gap-1">
                    <div className="skeleton h-4 w-24" />
                    <div className="skeleton h-3 w-16" />
                </div>
            </div>
            <div className="flex gap-6">
                <div className="skeleton h-8 w-12" />
                <div className="skeleton h-8 w-16" />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────

interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
    action?: { label: string; href: string };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="empty-state">
            <div className="empty-icon">{icon}</div>
            <h3 className="empty-title">{title}</h3>
            <p className="empty-desc">{description}</p>
            {action && (
                <Link href={action.href} className="btn btn-primary mt-6">
                    {action.label}
                </Link>
            )}
        </div>
    );
}
