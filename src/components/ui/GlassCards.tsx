'use client';

import { ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════
// CLAWGUARD - PREMIUM GLASSMORPHIC CARDS
// Stunning glass-effect cards with shimmer, glow, and animations
// ═══════════════════════════════════════════════════════════════

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    glowColor?: string;
    hoverScale?: boolean;
    shimmer?: boolean;
}

export function GlassCard({
    children,
    className = '',
    glowColor = 'rgba(239, 68, 68, 0.3)',
    hoverScale = true,
    shimmer = true,
}: GlassCardProps) {
    return (
        <div
            className={`
        relative group
        bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent
        backdrop-blur-xl
        border border-white/[0.1]
        rounded-2xl
        overflow-hidden
        transition-all duration-500 ease-out
        ${hoverScale ? 'hover:scale-[1.02] hover:-translate-y-1' : ''}
        ${className}
      `}
        >
            {/* Shimmer effect */}
            {shimmer && (
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                        background: `linear-gradient(
              105deg,
              transparent 40%,
              rgba(255, 255, 255, 0.03) 45%,
              rgba(255, 255, 255, 0.05) 50%,
              rgba(255, 255, 255, 0.03) 55%,
              transparent 60%
            )`,
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 2s infinite',
                    }}
                />
            )}

            {/* Glow effect on hover */}
            <div
                className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                style={{ background: glowColor }}
            />

            {/* Border gradient */}
            <div
                className="absolute inset-0 rounded-2xl p-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                    background: `linear-gradient(135deg, ${glowColor}, transparent 50%, ${glowColor})`,
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'exclude',
                    WebkitMaskComposite: 'xor',
                }}
            />

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// PREMIUM STAT CARD - Animated numbers with glass effect
// ═══════════════════════════════════════════════════════════════

interface PremiumStatCardProps {
    icon: ReactNode;
    value: string | number;
    label: string;
    trend?: { value: number; positive: boolean };
    delay?: number;
}

export function PremiumStatCard({ icon, value, label, trend, delay = 0 }: PremiumStatCardProps) {
    return (
        <GlassCard className="p-6" glowColor="rgba(239, 68, 68, 0.2)">
            <div
                className="animate-fade-up"
                style={{ animationDelay: `${delay}ms` }}
            >
                {/* Icon with glow */}
                <div className="relative mb-4">
                    <div className="absolute inset-0 bg-red-500/20 rounded-xl blur-xl" />
                    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/30 to-red-600/20 flex items-center justify-center text-red-400">
                        {icon}
                    </div>
                </div>

                {/* Value */}
                <div className="text-3xl font-bold text-white mb-1 tracking-tight">
                    {value}
                    {trend && (
                        <span
                            className={`ml-2 text-sm font-medium ${trend.positive ? 'text-green-400' : 'text-red-400'
                                }`}
                        >
                            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
                        </span>
                    )}
                </div>

                {/* Label */}
                <div className="text-gray-400 text-sm font-medium">{label}</div>
            </div>
        </GlassCard>
    );
}

// ═══════════════════════════════════════════════════════════════
// PREMIUM FEATURE CARD - Icon-led with hover effects
// ═══════════════════════════════════════════════════════════════

interface PremiumFeatureCardProps {
    icon: ReactNode;
    title: string;
    description: string;
    delay?: number;
}

export function PremiumFeatureCard({ icon, title, description, delay = 0 }: PremiumFeatureCardProps) {
    return (
        <GlassCard className="p-8 h-full" glowColor="rgba(239, 68, 68, 0.15)">
            <div
                className="animate-fade-up"
                style={{ animationDelay: `${delay}ms` }}
            >
                {/* Icon with animated ring */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                    <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-lg shadow-red-500/30 group-hover:shadow-red-500/50 transition-shadow">
                        {icon}
                    </div>
                    {/* Animated ring */}
                    <div className="absolute inset-0 w-14 h-14 rounded-xl border border-red-500/50 scale-100 opacity-0 group-hover:scale-150 group-hover:opacity-100 transition-all duration-700" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-red-400 transition-colors">
                    {title}
                </h3>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                    {description}
                </p>
            </div>
        </GlassCard>
    );
}

// ═══════════════════════════════════════════════════════════════
// BOUNTY CARD - Premium display for bounty items
// ═══════════════════════════════════════════════════════════════

interface PremiumBountyCardProps {
    title: string;
    company: string;
    reward: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    tags: string[];
    status: 'OPEN' | 'IN_PROGRESS' | 'SOLVED';
    onClick?: () => void;
}

export function PremiumBountyCard({
    title,
    company,
    reward,
    severity,
    tags,
    status,
    onClick,
}: PremiumBountyCardProps) {
    const severityColors = {
        LOW: 'from-green-500 to-green-600',
        MEDIUM: 'from-yellow-500 to-yellow-600',
        HIGH: 'from-orange-500 to-orange-600',
        CRITICAL: 'from-red-500 to-red-600',
    };

    const statusColors = {
        OPEN: 'bg-green-500/20 text-green-400 border-green-500/30',
        IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        SOLVED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };

    return (
        <GlassCard
            className="p-6 cursor-pointer"
            glowColor={
                severity === 'CRITICAL'
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(239, 68, 68, 0.15)'
            }
        >
            <div onClick={onClick}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-white font-bold text-lg mb-1 group-hover:text-red-400 transition-colors">
                            {title}
                        </div>
                        <div className="text-gray-500 text-sm">{company}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[status]}`}>
                        {status.replace('_', ' ')}
                    </span>
                </div>

                {/* Severity & Reward */}
                <div className="flex items-center gap-4 mb-4">
                    <div
                        className={`px-3 py-1.5 rounded-lg bg-gradient-to-r ${severityColors[severity]} text-white text-xs font-bold shadow-lg`}
                    >
                        {severity}
                    </div>
                    <div className="text-2xl font-bold text-green-400">{reward}</div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag, i) => (
                        <span
                            key={i}
                            className="px-2 py-1 rounded-md bg-white/5 text-gray-400 text-xs border border-white/10"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </GlassCard>
    );
}

// ═══════════════════════════════════════════════════════════════
// LEADERBOARD ROW - Premium hunter display
// ═══════════════════════════════════════════════════════════════

interface PremiumLeaderboardRowProps {
    rank: number;
    name: string;
    avatar?: string;
    verified: boolean;
    reputation: number;
    earnings: string;
    reports: number;
}

export function PremiumLeaderboardRow({
    rank,
    name,
    avatar,
    verified,
    reputation,
    earnings,
    reports,
}: PremiumLeaderboardRowProps) {
    const rankColors: Record<number, string> = {
        1: 'from-yellow-400 to-yellow-600 text-black',
        2: 'from-gray-300 to-gray-400 text-black',
        3: 'from-orange-400 to-orange-600 text-black',
    };

    return (
        <GlassCard className="p-4" glowColor={rank <= 3 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.05)'}>
            <div className="flex items-center gap-4">
                {/* Rank */}
                <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg
            ${rank <= 3
                            ? `bg-gradient-to-br ${rankColors[rank]}`
                            : 'bg-white/10 text-gray-400'
                        }`}
                >
                    {rank}
                </div>

                {/* Avatar */}
                <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-xl">
                        {avatar ? (
                            <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            '🤖'
                        )}
                    </div>
                    {verified && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{name}</span>
                        {verified && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">VERIFIED</span>
                        )}
                    </div>
                    <div className="text-gray-500 text-sm">{reports} reports • {reputation.toLocaleString()} karma</div>
                </div>

                {/* Earnings */}
                <div className="text-right">
                    <div className="text-green-400 font-bold text-lg">{earnings}</div>
                    <div className="text-gray-500 text-xs">Total Earned</div>
                </div>
            </div>
        </GlassCard>
    );
}

export default GlassCard;
