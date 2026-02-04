'use client';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Premium Skeleton Loading Components
// S-Tier shimmer animations for loading states
// ═══════════════════════════════════════════════════════════════

interface SkeletonProps {
    className?: string;
    style?: React.CSSProperties;
}

// Base Skeleton with shimmer
export function Skeleton({ className = '', style }: SkeletonProps) {
    return (
        <div
            className={`skeleton ${className}`}
            style={style}
            aria-hidden="true"
        />
    );
}

// Text line skeleton
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
    return (
        <div className={`skeleton-text ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className="skeleton-line"
                    style={{
                        width: i === lines - 1 ? '60%' : '100%',
                        animationDelay: `${i * 100}ms`,
                    }}
                />
            ))}
        </div>
    );
}

// Avatar skeleton
export function SkeletonAvatar({ size = 48 }: { size?: number }) {
    return (
        <Skeleton
            className="skeleton-avatar"
            style={{ width: size, height: size }}
        />
    );
}

// Card skeleton
export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
        <div className={`skeleton-card ${className}`}>
            <div className="skeleton-card-header">
                <div className="skeleton-card-badges">
                    <Skeleton className="skeleton-badge" />
                    <Skeleton className="skeleton-badge" />
                </div>
                <Skeleton className="skeleton-value" />
            </div>
            <Skeleton className="skeleton-title" />
            <Skeleton className="skeleton-subtitle" />
            <div className="skeleton-tags">
                <Skeleton className="skeleton-tag" />
                <Skeleton className="skeleton-tag" />
                <Skeleton className="skeleton-tag" />
            </div>
            <div className="skeleton-footer">
                <Skeleton className="skeleton-meta" />
                <Skeleton className="skeleton-action" />
            </div>
        </div>
    );
}

// Bounty card skeleton
export function BountyCardSkeleton() {
    return (
        <div className="bounty-card animate-pulse-subtle">
            <div className="bounty-header">
                <div className="bounty-badges">
                    <Skeleton style={{ width: 60, height: 24, borderRadius: 12 }} />
                    <Skeleton style={{ width: 70, height: 24, borderRadius: 12 }} />
                </div>
                <div className="bounty-reward">
                    <Skeleton style={{ width: 80, height: 28 }} />
                    <Skeleton style={{ width: 50, height: 12, marginTop: 4 }} />
                </div>
            </div>
            <Skeleton style={{ width: '80%', height: 22, marginBottom: 8 }} />
            <Skeleton style={{ width: '50%', height: 16, marginBottom: 16 }} />
            <div className="bounty-scope">
                <Skeleton style={{ width: 80, height: 24, borderRadius: 12 }} />
                <Skeleton style={{ width: 90, height: 24, borderRadius: 12 }} />
                <Skeleton style={{ width: 70, height: 24, borderRadius: 12 }} />
            </div>
            <div className="bounty-footer">
                <Skeleton style={{ width: 100, height: 14 }} />
                <Skeleton style={{ width: 80, height: 32, borderRadius: 6 }} />
            </div>
        </div>
    );
}

// Leaderboard row skeleton
export function LeaderboardRowSkeleton() {
    return (
        <div className="leaderboard-row animate-pulse-subtle">
            <Skeleton style={{ width: 48, height: 48, borderRadius: 8 }} />
            <div className="leaderboard-agent">
                <Skeleton style={{ width: 44, height: 44, borderRadius: 8 }} />
                <div className="leaderboard-info">
                    <Skeleton style={{ width: 120, height: 18 }} />
                    <Skeleton style={{ width: 90, height: 14, marginTop: 4 }} />
                </div>
            </div>
            <div className="leaderboard-metrics">
                <div className="leaderboard-metric">
                    <Skeleton style={{ width: 50, height: 18 }} />
                    <Skeleton style={{ width: 30, height: 12, marginTop: 4 }} />
                </div>
                <div className="leaderboard-metric">
                    <Skeleton style={{ width: 60, height: 18 }} />
                    <Skeleton style={{ width: 40, height: 12, marginTop: 4 }} />
                </div>
            </div>
        </div>
    );
}

// Stat card skeleton
export function StatCardSkeleton() {
    return (
        <div className="stat-card animate-pulse-subtle">
            <Skeleton style={{ width: 40, height: 40, borderRadius: 8, marginBottom: 12 }} />
            <Skeleton style={{ width: '60%', height: 28, marginBottom: 8 }} />
            <Skeleton style={{ width: '40%', height: 14 }} />
        </div>
    );
}

// Dashboard agent card skeleton
export function AgentCardSkeleton() {
    return (
        <div className="agent-card animate-pulse-subtle">
            <Skeleton className="skeleton-avatar" style={{ width: 96, height: 96, borderRadius: 16 }} />
            <Skeleton style={{ width: 140, height: 28, marginTop: 20 }} />
            <Skeleton style={{ width: 100, height: 16, marginTop: 8 }} />
            <Skeleton style={{ width: '80%', height: 40, marginTop: 16, borderRadius: 8 }} />
            <div className="agent-stats" style={{ marginTop: 24 }}>
                <Skeleton style={{ height: 80, borderRadius: 8 }} />
                <Skeleton style={{ height: 80, borderRadius: 8 }} />
                <Skeleton style={{ height: 80, borderRadius: 8 }} />
                <Skeleton style={{ height: 80, borderRadius: 8 }} />
            </div>
        </div>
    );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
    return (
        <div className="table-row-skeleton">
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton
                    key={i}
                    style={{
                        width: i === 0 ? '30%' : `${Math.random() * 20 + 10}%`,
                        height: 16,
                    }}
                />
            ))}
        </div>
    );
}
