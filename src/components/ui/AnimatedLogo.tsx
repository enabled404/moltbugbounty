'use client';

import { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════
// CLAWGUARD - PREMIUM ANIMATED LOGO
// S-Tier glassmorphic logo with pulse and glow effects
// ═══════════════════════════════════════════════════════════════

interface AnimatedLogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showText?: boolean;
    className?: string;
}

export function AnimatedLogo({ size = 'md', showText = true, className = '' }: AnimatedLogoProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const sizeMap = {
        sm: { icon: 24, text: 'text-lg' },
        md: { icon: 32, text: 'text-xl' },
        lg: { icon: 48, text: 'text-2xl' },
        xl: { icon: 64, text: 'text-4xl' },
    };

    const { icon, text } = sizeMap[size];

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Animated Claw Icon */}
            <div className={`relative ${mounted ? 'animate-scale-in' : 'opacity-0'}`}>
                {/* Outer Glow Ring */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--red-500)] to-[var(--red-700)] opacity-30 blur-xl animate-pulse-glow" />

                {/* Main Icon Container */}
                <div
                    className="relative rounded-xl bg-gradient-to-br from-[var(--red-600)] to-[var(--red-800)] p-2 shadow-lg shadow-[var(--red-900)]/50"
                    style={{ width: icon + 16, height: icon + 16 }}
                >
                    {/* Inner Glassmorphic Overlay */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />

                    {/* SVG Claw */}
                    <svg
                        width={icon}
                        height={icon}
                        viewBox="0 0 64 64"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="relative z-10"
                    >
                        {/* Claw Shape */}
                        <path
                            d="M32 8C32 8 24 12 20 20C16 28 18 38 18 38L32 52L46 38C46 38 48 28 44 20C40 12 32 8 32 8Z"
                            fill="url(#clawGradient)"
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="1.5"
                        />
                        {/* Left Claw */}
                        <path
                            d="M18 38C18 38 10 32 8 24C6 16 10 8 10 8"
                            stroke="url(#clawGradient)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            className="animate-claw-left"
                        />
                        {/* Right Claw */}
                        <path
                            d="M46 38C46 38 54 32 56 24C58 16 54 8 54 8"
                            stroke="url(#clawGradient)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            className="animate-claw-right"
                        />
                        {/* Center Detail */}
                        <circle cx="32" cy="30" r="6" fill="rgba(255,255,255,0.15)" />
                        <circle cx="32" cy="30" r="3" fill="rgba(255,255,255,0.3)" />

                        {/* Gradients */}
                        <defs>
                            <linearGradient id="clawGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                                <stop offset="50%" stopColor="#fca5a5" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.7" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            </div>

            {/* Text */}
            {showText && (
                <div className={`flex flex-col ${mounted ? 'animate-fade-up delay-100' : 'opacity-0'}`}>
                    <span className={`${text} font-bold font-display tracking-tight text-[var(--text-primary)]`}>
                        Claw<span className="text-gradient">Guard</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium">
                        Bug Bounty Protocol
                    </span>
                </div>
            )}
        </div>
    );
}

// Additional CSS animations to add to globals.css
export const logoAnimationStyles = `
@keyframes pulse-glow {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.1); }
}

@keyframes claw-left {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-5deg); }
}

@keyframes claw-right {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(5deg); }
}

.animate-pulse-glow {
  animation: pulse-glow 3s ease-in-out infinite;
}

.animate-claw-left {
  transform-origin: 18px 38px;
  animation: claw-left 2s ease-in-out infinite;
}

.animate-claw-right {
  transform-origin: 46px 38px;
  animation: claw-right 2s ease-in-out infinite;
}
`;

export default AnimatedLogo;
