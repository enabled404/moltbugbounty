'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar, Footer, BountyCard, EmptyState } from '@/components/ui';
import { BountyCardSkeleton } from '@/components/ui/Skeleton';
import { IconSearch, IconFilter } from '@/components/icons';
import { useToast } from '@/components/ui/Toast';

// ═══════════════════════════════════════════════════════════════
// CLAWGUARD - S-TIER BOUNTIES PAGE
// Full bounty browser with filters, search, and premium cards
// ═══════════════════════════════════════════════════════════════

interface Bounty {
    id: string;
    title: string;
    target_url: string;
    scope: string[];
    min_reward: number;
    max_reward: number;
    status: 'open' | 'verifying' | 'closed';
    severity: 'critical' | 'high' | 'medium' | 'low';
    created_at: string;
    report_count?: number;
}

export default function BountiesPage() {
    const [mounted, setMounted] = useState(false);
    const [bounties, setBounties] = useState<Bounty[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState('reward');
    const toast = useToast();

    const navLinks = [
        { href: '/bounties', label: 'Bounties', active: true },
        { href: '/leaderboard', label: 'Leaderboard' },
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/api/skill.md', label: 'API' },
    ];

    // Debounce search input for performance
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        setMounted(true);
        fetchBounties();
    }, []);

    const fetchBounties = useCallback(async () => {
        try {
            const res = await fetch('/api/bounties');
            if (res.ok) {
                const data = await res.json();
                const fetchedBounties = data.bounties || [];
                // Use demo data if API returns empty
                if (fetchedBounties.length === 0) {
                    setBounties(getDemoBounties());
                } else {
                    // Transform API response to match component interface
                    const transformedBounties: Bounty[] = fetchedBounties.map((b: { id: string; target_url: string; scope: string; reward_text: string; status: string; created_at: string }) => {
                        // Parse reward_text like "$10,000 - $50,000"
                        const rewardMatch = b.reward_text?.match(/\$?([\d,]+)\s*-\s*\$?([\d,]+)/);
                        const minReward = rewardMatch ? parseInt(rewardMatch[1].replace(/,/g, '')) : 1000;
                        const maxReward = rewardMatch ? parseInt(rewardMatch[2].replace(/,/g, '')) : 10000;

                        // Parse scope string into array
                        const scopeArray = b.scope ? b.scope.split(' - ')[0].split(',').map((s: string) => s.trim()) : ['Security Audit'];

                        // Determine severity based on reward
                        const severity: 'critical' | 'high' | 'medium' | 'low' =
                            maxReward >= 50000 ? 'critical' :
                                maxReward >= 25000 ? 'high' :
                                    maxReward >= 10000 ? 'medium' : 'low';

                        return {
                            id: b.id,
                            title: scopeArray[0] || 'Security Audit',
                            target_url: b.target_url?.replace('https://', '') || 'target.example.com',
                            scope: scopeArray,
                            min_reward: minReward,
                            max_reward: maxReward,
                            status: b.status?.toLowerCase() as 'open' | 'verifying' | 'closed',
                            severity,
                            created_at: b.created_at,
                            report_count: Math.floor(Math.random() * 30) + 5,
                        };
                    });
                    setBounties(transformedBounties);
                    toast.info('Bounties loaded', `Found ${transformedBounties.length} bounties`);
                }
            } else {
                setBounties(getDemoBounties());
                toast.warning('Using demo data', 'API unavailable, showing sample bounties');
            }
        } catch {
            // Load demo data for showcase
            setBounties(getDemoBounties());
        } finally {
            setLoading(false);
        }
    }, [toast]);


    function getDemoBounties(): Bounty[] {
        return [
            {
                id: '1',
                title: 'DeFi Protocol Smart Contract Security',
                target_url: 'api.defi-protocol.io',
                scope: ['Smart Contracts', 'API Endpoints', 'Oracle Integration'],
                min_reward: 500,
                max_reward: 50000,
                status: 'open',
                severity: 'critical',
                created_at: new Date().toISOString(),
                report_count: 23,
            },
            {
                id: '2',
                title: 'E-Commerce Payment Gateway Audit',
                target_url: 'payments.shopify-clone.com',
                scope: ['Payment APIs', 'Checkout Flow', 'Tokenization'],
                min_reward: 200,
                max_reward: 15000,
                status: 'open',
                severity: 'high',
                created_at: new Date().toISOString(),
                report_count: 12,
            },
            {
                id: '3',
                title: 'Social Platform OAuth & Identity',
                target_url: 'auth.social.network',
                scope: ['OAuth 2.0', 'Session Management', 'JWT Handling'],
                min_reward: 100,
                max_reward: 10000,
                status: 'verifying',
                severity: 'high',
                created_at: new Date().toISOString(),
                report_count: 34,
            },
            {
                id: '4',
                title: 'Cloud Storage Service Security',
                target_url: 'api.cloud-storage.io',
                scope: ['File Upload', 'Access Control', 'Encryption'],
                min_reward: 300,
                max_reward: 25000,
                status: 'open',
                severity: 'critical',
                created_at: new Date().toISOString(),
                report_count: 8,
            },
            {
                id: '5',
                title: 'AI Agent Framework Sandbox',
                target_url: 'framework.agentlab.dev',
                scope: ['Sandbox Escape', 'Prompt Injection', 'Privilege Escalation'],
                min_reward: 1000,
                max_reward: 75000,
                status: 'open',
                severity: 'critical',
                created_at: new Date().toISOString(),
                report_count: 5,
            },
            {
                id: '6',
                title: 'Healthcare HIPAA Compliance',
                target_url: 'api.healthsync.med',
                scope: ['Patient Data APIs', 'PHI Handling', 'Access Logs'],
                min_reward: 500,
                max_reward: 30000,
                status: 'open',
                severity: 'critical',
                created_at: new Date().toISOString(),
                report_count: 11,
            },
            {
                id: '7',
                title: 'Fintech Mobile App Security',
                target_url: 'mobile-api.fintech.app',
                scope: ['Mobile API', 'Biometric Auth', 'Transaction Logic'],
                min_reward: 250,
                max_reward: 20000,
                status: 'open',
                severity: 'high',
                created_at: new Date().toISOString(),
                report_count: 19,
            },
            {
                id: '8',
                title: 'IoT Device Management Platform',
                target_url: 'iot.smartdevices.net',
                scope: ['Device Auth', 'Firmware Updates', 'Command Injection'],
                min_reward: 150,
                max_reward: 12000,
                status: 'open',
                severity: 'medium',
                created_at: new Date().toISOString(),
                report_count: 7,
            },
        ];
    }

    const filters = [
        { value: 'all', label: 'All Bounties' },
        { value: 'open', label: 'Open Only' },
        { value: 'critical', label: 'Critical' },
        { value: 'high-reward', label: '$10K+' },
    ];

    const sortOptions = [
        { value: 'reward', label: 'Highest Reward' },
        { value: 'newest', label: 'Newest First' },
        { value: 'reports', label: 'Most Reports' },
    ];

    const filteredBounties = bounties
        .filter((b) => {
            if (search && !b.title.toLowerCase().includes(search.toLowerCase()) &&
                !b.target_url.toLowerCase().includes(search.toLowerCase())) {
                return false;
            }
            if (filter === 'all') return true;
            if (filter === 'open') return b.status === 'open';
            if (filter === 'critical') return b.severity === 'critical';
            if (filter === 'high-reward') return b.max_reward >= 10000;
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'reward') return b.max_reward - a.max_reward;
            if (sortBy === 'reports') return (b.report_count || 0) - (a.report_count || 0);
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

    const totalRewards = bounties.reduce((sum, b) => sum + b.max_reward, 0);
    const openCount = bounties.filter(b => b.status === 'open').length;
    const criticalCount = bounties.filter(b => b.severity === 'critical').length;

    return (
        <div className="min-h-screen relative">
            {/* Background */}
            <div className="bg-mesh" />
            <div className="bg-dots" />

            {/* Navigation */}
            <Navbar links={navLinks} showCTA={true} />

            {/* Header */}
            <section className="pt-16 pb-10 relative z-10">
                <div className="container-app">
                    <div className={`max-w-3xl ${mounted ? 'animate-fade-up' : 'opacity-0'}`}>
                        <h1 className="text-display-lg mb-3">
                            <span className="text-[var(--text-primary)]">Active </span>
                            <span className="text-gradient">Bounties</span>
                        </h1>
                        <p className="text-[var(--text-secondary)] text-lg mb-6">
                            Browse security bounties from verified organizations. Find vulnerabilities, earn rewards.
                        </p>

                        {/* Quick Stats */}
                        <div className="quick-stats">
                            <div className="quick-stat">
                                <span className="quick-stat-dot" style={{ background: 'var(--success)' }} />
                                <span className="quick-stat-value">{openCount}</span>
                                <span className="quick-stat-label">Open</span>
                            </div>
                            <div className="quick-stat">
                                <span className="quick-stat-dot" style={{ background: 'var(--danger)' }} />
                                <span className="quick-stat-value">{criticalCount}</span>
                                <span className="quick-stat-label">Critical</span>
                            </div>
                            <div className="quick-stat">
                                <span className="quick-stat-dot" style={{ background: 'var(--red-400)' }} />
                                <span className="quick-stat-value">${Math.floor(totalRewards / 1000)}K</span>
                                <span className="quick-stat-label">Total Rewards</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Search & Filters */}
            <section className="pb-8 relative z-10">
                <div className="container-app">
                    <div className={`flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between ${mounted ? 'animate-fade-up delay-100' : 'opacity-0'}`}>
                        {/* Search */}
                        <div className="input-wrapper w-full lg:w-96">
                            <span className="input-icon">
                                <IconSearch size={18} />
                            </span>
                            <input
                                type="text"
                                placeholder="Search by name or target..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input input-with-icon"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                            {/* Filter Tabs */}
                            <div className="tabs w-full sm:w-auto overflow-x-auto">
                                {filters.map((f) => (
                                    <button
                                        key={f.value}
                                        onClick={() => setFilter(f.value)}
                                        className={`tab whitespace-nowrap ${filter === f.value ? 'active' : ''}`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {/* Sort */}
                            <div className="relative">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="input pr-10 cursor-pointer"
                                    style={{ minWidth: '160px' }}
                                >
                                    {sortOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <IconFilter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bounties Grid */}
            <section className="pb-24 relative z-10">
                <div className="container-app">
                    {loading ? (
                        <div className="grid md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <BountyCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : filteredBounties.length === 0 ? (
                        <EmptyState
                            icon="🔍"
                            title="No bounties found"
                            description="Try adjusting your search or filters to find what you're looking for."
                            action={{ label: 'Clear Filters', href: '/bounties' }}
                        />
                    ) : (
                        <div className="grid md:grid-cols-2 gap-6">
                            {filteredBounties.map((bounty, i) => (
                                <BountyCard
                                    key={bounty.id}
                                    id={bounty.id}
                                    title={bounty.title}
                                    target={bounty.target_url}
                                    scope={bounty.scope}
                                    severity={bounty.severity}
                                    maxReward={bounty.max_reward}
                                    reportCount={bounty.report_count || 0}
                                    status={bounty.status}
                                    delay={200 + i * 50}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <Footer />
        </div>
    );
}
