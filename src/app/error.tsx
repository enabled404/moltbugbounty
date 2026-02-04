'use client';

import { useEffect, useState, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════
// CLAWGUARD - S-TIER ERROR PAGE
// Premium error boundary with recovery options
// ═══════════════════════════════════════════════════════════════

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
    const [mounted, setMounted] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    // Pre-compute positions for glitch lines
    const glitchLines = useMemo(() =>
        [...Array(5)].map((_, i) => ({
            top: `${20 + i * 15}%`,
            duration: 2 + i * 0.5,
            delay: i * 0.2,
        })), []
    );

    useEffect(() => {
        setMounted(true);
        // Log error to monitoring service
        console.error('[ClawGuard Error]', error);
    }, [error]);

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-6">
            {/* Background */}
            <div className="absolute inset-0 bg-[var(--bg-background)]" />
            <div className="absolute inset-0 bg-gradient-radial from-[var(--danger)]/5 via-transparent to-transparent" />

            {/* Glitch lines */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {glitchLines.map((line, i) => (
                    <div
                        key={i}
                        className="absolute h-px w-full bg-[var(--danger)]/20 animate-glitch-line"
                        style={{
                            top: line.top,
                            animationDuration: `${line.duration}s`,
                            animationDelay: `${line.delay}s`,
                        }}
                    />
                ))}
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-lg w-full">
                <div className={`card card-glass p-8 text-center ${mounted ? 'animate-scale-in' : 'opacity-0'}`}>
                    {/* Error Icon */}
                    <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--danger)]/10 border border-[var(--danger)]/20">
                        <svg
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-[var(--danger)]"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>

                    {/* Message */}
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2 font-display">
                        Something went wrong
                    </h1>
                    <p className="text-[var(--text-secondary)] mb-6">
                        An unexpected error occurred. Our security systems detected an anomaly.
                    </p>

                    {/* Error Details (collapsible) */}
                    {error.digest && (
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-4 flex items-center justify-center gap-2 mx-auto transition-colors"
                        >
                            <span>Error ID: {error.digest}</span>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className={`transition-transform ${showDetails ? 'rotate-180' : ''}`}
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                    )}

                    {showDetails && (
                        <div className="mb-6 p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-left overflow-x-auto">
                            <code className="text-xs text-[var(--danger)] font-mono break-all">
                                {error.message || 'Unknown error'}
                            </code>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button onClick={reset} className="btn btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                <path d="M21 3v5h-5" />
                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                <path d="M8 16H3v5" />
                            </svg>
                            Try Again
                        </button>
                        <a href="/" className="btn btn-secondary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            Go Home
                        </a>
                    </div>

                    {/* Support link */}
                    <p className="mt-6 text-sm text-[var(--text-muted)]">
                        If this keeps happening,{' '}
                        <a href="mailto:support@clawguard.dev" className="text-[var(--red-400)] hover:underline">
                            contact support
                        </a>
                    </p>
                </div>

                {/* Terminal log effect */}
                <div className={`mt-6 ${mounted ? 'animate-fade-up delay-300' : 'opacity-0'}`}>
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4 font-mono text-xs">
                        <div className="text-[var(--text-muted)] mb-1">
                            <span className="text-[var(--red-400)]">[ERROR]</span> {new Date().toISOString()}
                        </div>
                        <div className="text-[var(--danger)]">
                            Uncaught exception in security module
                        </div>
                        <div className="text-[var(--text-muted)] mt-2">
                            <span className="text-[var(--success)]">→</span> Attempting automatic recovery...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
