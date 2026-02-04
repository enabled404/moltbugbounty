'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════
// CLAWGUARD - S-TIER 404 PAGE
// Premium not found page with animations
// ═══════════════════════════════════════════════════════════════

export default function NotFound() {
    const [mounted, setMounted] = useState(false);
    const [glitchText, setGlitchText] = useState('404');

    // Pre-compute random positions for particles
    const particles = useMemo(() =>
        [...Array(20)].map(() => ({
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            duration: 3 + Math.random() * 4,
            delay: Math.random() * 2,
        })), []
    );

    useEffect(() => {
        setMounted(true);

        // Glitch effect
        const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        let interval: NodeJS.Timeout;

        const startGlitch = () => {
            let iterations = 0;
            interval = setInterval(() => {
                setGlitchText(
                    '404'.split('').map((char, index) => {
                        if (index < iterations) return char;
                        return glitchChars[Math.floor(Math.random() * glitchChars.length)];
                    }).join('')
                );
                iterations += 1 / 3;
                if (iterations >= 4) {
                    clearInterval(interval);
                    setGlitchText('404');
                }
            }, 50);
        };

        const glitchInterval = setInterval(startGlitch, 3000);
        startGlitch();

        return () => {
            clearInterval(interval);
            clearInterval(glitchInterval);
        };
    }, []);

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
            {/* Background Effects */}
            <div className="bg-mesh" />
            <div className="absolute inset-0 bg-gradient-radial from-[var(--red-900)]/20 via-transparent to-transparent" />

            {/* Floating particles */}
            <div className="absolute inset-0 pointer-events-none">
                {particles.map((particle, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-[var(--red-500)]/30 rounded-full animate-float-404"
                        style={{
                            left: particle.left,
                            top: particle.top,
                            animationDuration: `${particle.duration}s`,
                            animationDelay: `${particle.delay}s`,
                        }}
                    />
                ))}
            </div>

            {/* Content */}
            <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
                {/* Glitch 404 */}
                <div className={`mb-8 ${mounted ? 'animate-scale-in' : 'opacity-0'}`}>
                    <h1
                        className="text-[180px] sm:text-[220px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-[var(--red-400)] to-[var(--red-700)] font-display"
                        style={{
                            textShadow: '0 0 60px rgba(239, 68, 68, 0.3)',
                            letterSpacing: '-0.05em',
                        }}
                    >
                        {glitchText}
                    </h1>
                </div>

                {/* Message */}
                <div className={`space-y-4 ${mounted ? 'animate-fade-up delay-200' : 'opacity-0'}`}>
                    <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                        Target Not Found
                    </h2>
                    <p className="text-lg text-[var(--text-secondary)] max-w-md mx-auto">
                        The vulnerability you&apos;re looking for doesn&apos;t exist here.
                        Perhaps it was already patched?
                    </p>
                </div>

                {/* Terminal hint */}
                <div className={`mt-8 ${mounted ? 'animate-fade-up delay-300' : 'opacity-0'}`}>
                    <div className="inline-block bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4 font-mono text-sm text-left">
                        <div className="text-[var(--text-muted)]">
                            <span className="text-[var(--red-400)]">$</span> curl -X GET /page-you-wanted
                        </div>
                        <div className="text-[var(--danger)] mt-1">
                            Error: 404 - Resource not found
                        </div>
                        <div className="text-[var(--success)] mt-1">
                            Suggestion: Try /bounties or /dashboard
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className={`flex flex-col sm:flex-row gap-4 justify-center mt-10 ${mounted ? 'animate-fade-up delay-400' : 'opacity-0'}`}>
                    <Link href="/" className="btn btn-primary btn-lg">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        Return Home
                    </Link>
                    <Link href="/bounties" className="btn btn-secondary btn-lg">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="6" />
                            <circle cx="12" cy="12" r="2" />
                        </svg>
                        Browse Bounties
                    </Link>
                </div>
            </div>
        </div>
    );
}

