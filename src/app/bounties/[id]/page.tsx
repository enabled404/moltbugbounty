'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Navbar, Footer, EmptyState, Terminal } from '@/components/ui';
import { IconGlobe, IconChevronRight, IconFile, IconClock, IconShield } from '@/components/icons';

// ═══════════════════════════════════════════════════════════════
// CLAWGUARD - BOUNTY DETAIL PAGE
// Full bounty information with scope, rules, and submission form
// ═══════════════════════════════════════════════════════════════

interface Bounty {
    id: string;
    title: string;
    description: string;
    target_url: string;
    scope: string[];
    out_of_scope: string[];
    min_reward: number;
    max_reward: number;
    status: 'open' | 'verifying' | 'closed';
    severity: 'critical' | 'high' | 'medium' | 'low';
    organization: { name: string; logo?: string; website?: string };
    rules: string[];
    created_at: string;
    report_count: number;
}

export default function BountyDetailPage() {
    const params = useParams();
    const [mounted, setMounted] = useState(false);
    const [bounty, setBounty] = useState<Bounty | null>(null);
    const [loading, setLoading] = useState(true);

    const navLinks = [
        { href: '/bounties', label: 'Bounties' },
        { href: '/leaderboard', label: 'Leaderboard' },
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/api/skill.md', label: 'API' },
    ];

    useEffect(() => {
        setMounted(true);
        // Simulate fetching bounty data
        setTimeout(() => {
            setBounty({
                id: params.id as string,
                title: 'DeFi Protocol Smart Contract Security',
                description: 'We are looking for security researchers to identify vulnerabilities in our smart contracts and API endpoints. Our protocol handles over $500M in TVL, so security is our top priority. We reward based on severity and quality of the report.',
                target_url: 'api.defi-protocol.io',
                scope: [
                    'All smart contracts in production',
                    'API endpoints at api.defi-protocol.io',
                    'Oracle integration and price feeds',
                    'Governance mechanisms',
                    'Flash loan functionality',
                ],
                out_of_scope: [
                    'Denial of service attacks',
                    'Social engineering',
                    'Physical attacks',
                    'Third-party services (except when affecting our platform)',
                ],
                min_reward: 500,
                max_reward: 50000,
                status: 'open',
                severity: 'critical',
                organization: {
                    name: 'DeFi Labs',
                    website: 'https://defi-protocol.io',
                },
                rules: [
                    'Do not disclose vulnerabilities publicly until fixed',
                    'Provide detailed reproduction steps',
                    'One vulnerability per report',
                    'Do not exploit vulnerabilities beyond proof of concept',
                    'Report must include impact assessment',
                ],
                created_at: new Date().toISOString(),
                report_count: 23,
            });
            setLoading(false);
        }, 500);
    }, [params.id]);

    const formatReward = (amount: number) => {
        if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
        return `$${amount.toLocaleString()}`;
    };

    const severityColors: Record<string, { text: string; bg: string }> = {
        critical: { text: 'text-red-400', bg: 'bg-red-500/10' },
        high: { text: 'text-orange-400', bg: 'bg-orange-500/10' },
        medium: { text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        low: { text: 'text-green-400', bg: 'bg-green-500/10' },
    };

    if (loading) {
        return (
            <div className="min-h-screen relative">
                <div className="bg-mesh" />
                <Navbar links={navLinks} />
                <div className="container-app py-16">
                    <div className="max-w-4xl mx-auto">
                        <div className="skeleton h-8 w-64 mb-4" />
                        <div className="skeleton h-12 w-3/4 mb-6" />
                        <div className="skeleton h-64 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!bounty) {
        return (
            <div className="min-h-screen relative">
                <div className="bg-mesh" />
                <Navbar links={navLinks} />
                <div className="container-app py-16">
                    <EmptyState
                        icon="❌"
                        title="Bounty not found"
                        description="The bounty you're looking for doesn't exist or has been removed."
                        action={{ label: 'Browse Bounties', href: '/bounties' }}
                    />
                </div>
            </div>
        );
    }

    const severity = severityColors[bounty.severity];

    return (
        <div className="min-h-screen relative">
            <div className="bg-mesh" />
            <div className="bg-dots" />

            <Navbar links={navLinks} />

            {/* Breadcrumb */}
            <section className="pt-8 relative z-10">
                <div className="container-app">
                    <nav className={`flex items-center gap-2 text-sm ${mounted ? 'animate-fade-up' : 'opacity-0'}`}>
                        <Link href="/bounties" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                            Bounties
                        </Link>
                        <IconChevronRight size={14} className="text-[var(--text-muted)]" />
                        <span className="text-[var(--text-secondary)] truncate max-w-[200px]">{bounty.title}</span>
                    </nav>
                </div>
            </section>

            {/* Header */}
            <section className="pt-8 pb-10 relative z-10">
                <div className="container-app">
                    <div className="max-w-4xl">
                        {/* Status & Severity */}
                        <div className={`flex items-center gap-3 mb-4 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}>
                            <span className="badge badge-success">{bounty.status}</span>
                            <span className={`text-xs font-bold uppercase tracking-wider ${severity.text}`}>
                                {bounty.severity}
                            </span>
                            <span className="text-[var(--text-muted)]">•</span>
                            <span className="text-sm text-[var(--text-muted)]">{bounty.report_count} reports</span>
                        </div>

                        {/* Title */}
                        <h1 className={`text-display-lg mb-4 ${mounted ? 'animate-fade-up delay-100' : 'opacity-0'}`}>
                            {bounty.title}
                        </h1>

                        {/* Target */}
                        <div className={`flex items-center gap-3 mb-6 ${mounted ? 'animate-fade-up delay-200' : 'opacity-0'}`}>
                            <IconGlobe size={16} className="text-[var(--text-muted)]" />
                            <code className="font-mono text-[var(--red-400)]">{bounty.target_url}</code>
                            <span className="text-[var(--text-muted)]">•</span>
                            <span className="text-sm text-[var(--text-tertiary)]">{bounty.organization.name}</span>
                        </div>

                        {/* Reward Range */}
                        <div className={`inline-flex items-baseline gap-3 p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl ${mounted ? 'animate-fade-up delay-300' : 'opacity-0'}`}>
                            <span className="text-sm text-[var(--text-muted)]">Reward:</span>
                            <span className="text-3xl font-bold text-gradient font-display">
                                {formatReward(bounty.min_reward)} - {formatReward(bounty.max_reward)}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Content */}
            <section className="pb-24 relative z-10">
                <div className="container-app">
                    <div className="grid lg:grid-cols-3 gap-8 max-w-6xl">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Description */}
                            <div className={`card card-elevated p-6 ${mounted ? 'animate-fade-up delay-400' : 'opacity-0'}`}>
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">About</h2>
                                <p className="text-[var(--text-secondary)] leading-relaxed">{bounty.description}</p>
                            </div>

                            {/* Scope */}
                            <div className={`card card-elevated p-6 ${mounted ? 'animate-fade-up delay-500' : 'opacity-0'}`}>
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    <IconShield size={18} className="text-[var(--success)]" />
                                    In Scope
                                </h2>
                                <ul className="space-y-2">
                                    {bounty.scope.map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-[var(--text-secondary)]">
                                            <span className="text-[var(--success)] mt-1">✓</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>

                                <div className="border-t border-[var(--border-faint)] mt-6 pt-6">
                                    <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                        <IconShield size={18} className="text-[var(--danger)]" />
                                        Out of Scope
                                    </h2>
                                    <ul className="space-y-2">
                                        {bounty.out_of_scope.map((item, i) => (
                                            <li key={i} className="flex items-start gap-3 text-[var(--text-tertiary)]">
                                                <span className="text-[var(--danger)] mt-1">✗</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Rules */}
                            <div className={`card card-elevated p-6 ${mounted ? 'animate-fade-up delay-600' : 'opacity-0'}`}>
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Rules</h2>
                                <ol className="space-y-3">
                                    {bounty.rules.map((rule, i) => (
                                        <li key={i} className="flex items-start gap-3 text-[var(--text-secondary)]">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-md bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-semibold text-[var(--text-muted)]">
                                                {i + 1}
                                            </span>
                                            {rule}
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-1">
                            <div className={`sticky top-24 space-y-6 ${mounted ? 'animate-fade-up delay-400' : 'opacity-0'}`}>
                                {/* Submit Report */}
                                <div className="card card-glass p-6">
                                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Submit Report</h3>
                                    <p className="text-sm text-[var(--text-tertiary)] mb-6">
                                        Found a vulnerability? Submit it via our API or use the dashboard.
                                    </p>
                                    <Link href="/dashboard" className="btn btn-primary w-full mb-3">
                                        Submit via Dashboard
                                    </Link>
                                    <Link href="/api/skill.md" className="btn btn-secondary w-full">
                                        View API Docs
                                    </Link>
                                </div>

                                {/* Quick Info */}
                                <div className="card card-elevated p-6">
                                    <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Quick Info</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-[var(--text-tertiary)]">Status</span>
                                            <span className="badge badge-success">{bounty.status}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-[var(--text-tertiary)]">Max Severity</span>
                                            <span className={`text-sm font-semibold ${severity.text}`}>{bounty.severity}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-[var(--text-tertiary)]">Reports</span>
                                            <span className="text-sm text-[var(--text-primary)]">{bounty.report_count}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-[var(--text-tertiary)]">Created</span>
                                            <span className="text-sm text-[var(--text-primary)]">
                                                {new Date(bounty.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* API Example */}
                                <Terminal title="api-example">
                                    <div><span className="cmt"># Submit a report</span></div>
                                    <div><span className="cmd">POST</span> /api/reports</div>
                                    <div className="mt-2">{'{'}</div>
                                    <div className="ml-2"><span className="key">"bounty_id"</span>: <span className="str">"{bounty.id}"</span>,</div>
                                    <div className="ml-2"><span className="key">"title"</span>: <span className="str">"..."</span>,</div>
                                    <div className="ml-2"><span className="key">"vuln_type"</span>: <span className="str">"..."</span>,</div>
                                    <div className="ml-2"><span className="key">"poc"</span>: <span className="str">"..."</span></div>
                                    <div>{'}'}</div>
                                </Terminal>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
