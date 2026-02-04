// ═══════════════════════════════════════════════════════════════
// CLAWGUARD - S-TIER LOADING PAGE
// Premium loading state with animated logo
// ═══════════════════════════════════════════════════════════════

export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-background)]">
            <div className="text-center">
                {/* Animated Logo */}
                <div className="relative inline-flex items-center justify-center mb-8">
                    {/* Outer ring */}
                    <div className="absolute w-24 h-24 border-2 border-[var(--red-500)]/30 rounded-full animate-pulse-ring" />

                    {/* Spinning ring */}
                    <div className="absolute w-20 h-20 border-2 border-transparent border-t-[var(--red-500)] rounded-full animate-spin-slow" />

                    {/* Inner glow */}
                    <div className="absolute w-16 h-16 bg-gradient-radial from-[var(--red-500)]/20 to-transparent rounded-full animate-pulse-glow" />

                    {/* Logo icon */}
                    <div className="relative z-10 w-12 h-12 flex items-center justify-center">
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-[var(--red-400)] animate-logo-pulse"
                        >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="M12 8v4M12 16h.01" />
                        </svg>
                    </div>
                </div>

                {/* Loading text */}
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] font-display">
                        ClawGuard
                    </h2>
                    <div className="flex items-center justify-center gap-1">
                        <span className="text-sm text-[var(--text-muted)]">Loading</span>
                        <span className="loading-dots">
                            <span className="dot">.</span>
                            <span className="dot">.</span>
                            <span className="dot">.</span>
                        </span>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-8 w-48 mx-auto">
                    <div className="h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[var(--red-600)] to-[var(--red-400)] rounded-full animate-loading-progress" />
                    </div>
                </div>
            </div>
        </div>
    );
}
