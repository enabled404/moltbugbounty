'use client';

import { useEffect, useState, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Animated Number Counter
// S-Tier count-up animation for stats
// ═══════════════════════════════════════════════════════════════

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    className?: string;
    formatOptions?: Intl.NumberFormatOptions;
}

function easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function AnimatedNumber({
    value,
    duration = 2000,
    prefix = '',
    suffix = '',
    decimals = 0,
    className = '',
    formatOptions,
}: AnimatedNumberProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const startValueRef = useRef(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        startValueRef.current = displayValue;
        startTimeRef.current = null;

        const animate = (timestamp: number) => {
            if (startTimeRef.current === null) {
                startTimeRef.current = timestamp;
            }

            const elapsed = timestamp - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutExpo(progress);
            const current = startValueRef.current + (value - startValueRef.current) * easedProgress;

            setDisplayValue(current);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [value, duration]);

    const formattedValue = formatOptions
        ? new Intl.NumberFormat('en-US', formatOptions).format(displayValue)
        : displayValue.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return (
        <span className={className}>
            {prefix}{formattedValue}{suffix}
        </span>
    );
}

// Convenience components for common formats
export function AnimatedCurrency({ value, className }: { value: number; className?: string }) {
    return (
        <AnimatedNumber
            value={value}
            prefix="$"
            className={className}
            formatOptions={{ minimumFractionDigits: 0, maximumFractionDigits: 0 }}
        />
    );
}

export function AnimatedPercentage({ value, className }: { value: number; className?: string }) {
    return (
        <AnimatedNumber
            value={value}
            suffix="%"
            decimals={1}
            className={className}
        />
    );
}

// For compact numbers like 2.4M, 1.3K
export function AnimatedCompact({ value, className }: { value: number; className?: string }) {
    const [displayValue, setDisplayValue] = useState('0');

    useEffect(() => {
        const duration = 2000;
        const startTime = Date.now();
        const startValue = 0;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutExpo(progress);
            const current = startValue + (value - startValue) * easedProgress;

            // Format to compact notation
            if (current >= 1_000_000) {
                setDisplayValue(`${(current / 1_000_000).toFixed(1)}M`);
            } else if (current >= 1_000) {
                setDisplayValue(`${(current / 1_000).toFixed(1)}K`);
            } else {
                setDisplayValue(Math.floor(current).toString());
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    return <span className={className}>{displayValue}</span>;
}
