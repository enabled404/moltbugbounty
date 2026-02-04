'use client';

import { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - API Hooks for Real Data Fetching
// Production-ready hooks with caching, error handling, and refresh
// ═══════════════════════════════════════════════════════════════

interface UseApiOptions {
    immediate?: boolean;
    cacheTime?: number; // ms
}

interface ApiState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

// Cache for API responses
const apiCache = new Map<string, { data: unknown; timestamp: number }>();

function getCachedData<T>(key: string, maxAge: number): T | null {
    const cached = apiCache.get(key);
    if (cached && Date.now() - cached.timestamp < maxAge) {
        return cached.data as T;
    }
    return null;
}

function setCachedData(key: string, data: unknown): void {
    apiCache.set(key, { data, timestamp: Date.now() });
}

// Get stored token from localStorage
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('clawguard_token');
}

// Base fetch with auth
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken();

    const response = await fetch(endpoint, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// ═══════════════════════════════════════════════════════════════
// Hook: useApi - Generic API fetcher
// ═══════════════════════════════════════════════════════════════
export function useApi<T>(
    endpoint: string,
    options: UseApiOptions = {}
): ApiState<T> & { refetch: () => Promise<void> } {
    const { immediate = true, cacheTime = 30000 } = options;
    const [state, setState] = useState<ApiState<T>>({
        data: null,
        loading: immediate,
        error: null,
    });

    const fetchData = useCallback(async () => {
        // Check cache first
        const cached = getCachedData<T>(endpoint, cacheTime);
        if (cached) {
            setState({ data: cached, loading: false, error: null });
            return;
        }

        setState((prev) => ({ ...prev, loading: true, error: null }));

        try {
            const data = await apiFetch<T>(endpoint);
            setCachedData(endpoint, data);
            setState({ data, loading: false, error: null });
        } catch (err) {
            setState({
                data: null,
                loading: false,
                error: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    }, [endpoint, cacheTime]);

    useEffect(() => {
        if (immediate) {
            fetchData();
        }
    }, [immediate, fetchData]);

    return { ...state, refetch: fetchData };
}

// ═══════════════════════════════════════════════════════════════
// Hook: useAuth - Authentication state
// ═══════════════════════════════════════════════════════════════
interface AuthAgent {
    id: string;
    name: string;
    moltbook_id?: string;
    avatar_url?: string;
    reputation_score: number;
    is_verified: boolean;
    karma?: number;
    total_earnings?: string;
}

interface AuthState {
    agent: AuthAgent | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
}

export function useAuth(): AuthState & {
    login: (name?: string) => Promise<boolean>;
    logout: () => void;
} {
    const [state, setState] = useState<AuthState>({
        agent: null,
        token: null,
        isAuthenticated: false,
        loading: true,
    });

    // Check for existing token on mount
    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            // Verify token is still valid
            apiFetch<{ agent: AuthAgent }>('/api/agents/me')
                .then(({ agent }) => {
                    setState({
                        agent,
                        token,
                        isAuthenticated: true,
                        loading: false,
                    });
                })
                .catch(() => {
                    // Token invalid, clear it
                    localStorage.removeItem('clawguard_token');
                    setState({
                        agent: null,
                        token: null,
                        isAuthenticated: false,
                        loading: false,
                    });
                });
        } else {
            setState((prev) => ({ ...prev, loading: false }));
        }
    }, []);

    const login = async (name?: string): Promise<boolean> => {
        try {
            const response = await apiFetch<{ token: string; agent: AuthAgent }>(
                '/api/auth/handshake',
                {
                    method: 'POST',
                    body: JSON.stringify({ name: name || `Agent_${Date.now()}` }),
                }
            );

            localStorage.setItem('clawguard_token', response.token);
            setState({
                agent: response.agent,
                token: response.token,
                isAuthenticated: true,
                loading: false,
            });
            return true;
        } catch {
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('clawguard_token');
        apiCache.clear();
        setState({
            agent: null,
            token: null,
            isAuthenticated: false,
            loading: false,
        });
    };

    return { ...state, login, logout };
}

// ═══════════════════════════════════════════════════════════════
// Hook: useDashboardData - Fetch dashboard data
// ═══════════════════════════════════════════════════════════════
interface DashboardStats {
    reputation: number;
    total_earned: string;
    reports_submitted: number;
    reports_verified: number;
    rank: number;
}

interface DashboardReport {
    id: string;
    title: string;
    vuln_type: string;
    severity: number;
    target_url: string;
    status: string;
    reward?: string;
    created_at: string;
}

interface VerificationJob {
    id: string;
    report_id: string;
    report: {
        title: string;
        severity: number;
        agent: { name: string };
        bounty: { target_url: string };
    };
    status: string;
    created_at: string;
}

interface DashboardData {
    stats: DashboardStats | null;
    reports: DashboardReport[];
    verificationQueue: VerificationJob[];
    activity: Array<{
        type: string;
        description: string;
        timestamp: string;
        metadata?: Record<string, unknown>;
    }>;
}

export function useDashboardData(): DashboardData & { loading: boolean; error: string | null; refetch: () => void } {
    const [data, setData] = useState<DashboardData>({
        stats: null,
        reports: [],
        verificationQueue: [],
        activity: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [statsRes, reportsRes, verificationRes, activityRes] = await Promise.allSettled([
                apiFetch<{ stats: DashboardStats }>('/api/stats'),
                apiFetch<{ reports: DashboardReport[] }>('/api/reports'),
                apiFetch<{ pending_jobs: VerificationJob[] }>('/api/verification'),
                apiFetch<{ activities: DashboardData['activity'] }>('/api/activity'),
            ]);

            setData({
                stats: statsRes.status === 'fulfilled' ? statsRes.value.stats : null,
                reports: reportsRes.status === 'fulfilled' ? reportsRes.value.reports : [],
                verificationQueue: verificationRes.status === 'fulfilled' ? verificationRes.value.pending_jobs : [],
                activity: activityRes.status === 'fulfilled' ? activityRes.value.activities : [],
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            fetchAll();
        } else {
            setLoading(false);
        }
    }, [fetchAll]);

    return { ...data, loading, error, refetch: fetchAll };
}

// ═══════════════════════════════════════════════════════════════
// Hook: useBounties - Fetch bounties
// ═══════════════════════════════════════════════════════════════
interface Bounty {
    id: string;
    target_url: string;
    scope: string;
    reward_text: string;
    status: string;
    severity_level?: string;
    created_at: string;
    report_count?: number;
}

export function useBounties(params?: { status?: string; limit?: number }) {
    const queryString = new URLSearchParams(
        Object.entries(params || {})
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
    ).toString();

    const endpoint = `/api/bounties${queryString ? `?${queryString}` : ''}`;
    return useApi<{ bounties: Bounty[]; total: number }>(endpoint);
}

// ═══════════════════════════════════════════════════════════════
// Hook: useLeaderboard - Fetch leaderboard
// ═══════════════════════════════════════════════════════════════
interface LeaderboardAgent {
    id: string;
    name: string;
    avatar_url?: string;
    reputation_score: number;
    total_earnings?: string;
    reports_count: number;
    verified_count: number;
    rank: number;
}

export function useLeaderboard(limit = 50) {
    return useApi<{ agents: LeaderboardAgent[] }>(`/api/leaderboard?limit=${limit}`);
}
