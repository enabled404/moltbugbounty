'use client';

import React, { useRef, useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════
// CLAWGUARD - ANIMATED LIST COMPONENT
// Staggered animation for list items with intersection observer
// ═══════════════════════════════════════════════════════════════

interface AnimatedListProps {
    children: React.ReactNode;
    className?: string;
    staggerDelay?: number;
    animationDuration?: number;
    threshold?: number;
    once?: boolean;
}

interface AnimatedListItemProps {
    children: React.ReactNode;
    index: number;
    staggerDelay: number;
    animationDuration: number;
    isVisible: boolean;
    className?: string;
}

function AnimatedListItem({
    children,
    index,
    staggerDelay,
    animationDuration,
    isVisible,
    className = '',
}: AnimatedListItemProps) {
    const delay = index * staggerDelay;

    return (
        <div
            className={`animated-list-item ${className}`}
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity ${animationDuration}ms ease, transform ${animationDuration}ms ease`,
                transitionDelay: `${delay}ms`,
            }}
        >
            {children}
        </div>
    );
}

export function AnimatedList({
    children,
    className = '',
    staggerDelay = 50,
    animationDuration = 400,
    threshold = 0.1,
    once = true,
}: AnimatedListProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const hasAnimated = useRef(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        if (once && hasAnimated.current) return;
                        setIsVisible(true);
                        hasAnimated.current = true;
                    } else if (!once) {
                        setIsVisible(false);
                    }
                });
            },
            { threshold }
        );

        observer.observe(container);

        return () => observer.disconnect();
    }, [threshold, once]);

    const childArray = React.Children.toArray(children);

    return (
        <div ref={containerRef} className={`animated-list ${className}`}>
            {childArray.map((child, index) => (
                <AnimatedListItem
                    key={index}
                    index={index}
                    staggerDelay={staggerDelay}
                    animationDuration={animationDuration}
                    isVisible={isVisible}
                >
                    {child}
                </AnimatedListItem>
            ))}
        </div>
    );
}

// Wrapper for grid layouts
interface AnimatedGridProps {
    children: React.ReactNode;
    className?: string;
    columns?: 1 | 2 | 3 | 4;
    staggerDelay?: number;
    gap?: number;
}

export function AnimatedGrid({
    children,
    className = '',
    columns = 3,
    staggerDelay = 75,
    gap = 24,
}: AnimatedGridProps) {
    const columnClasses = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <AnimatedList
            className={`grid ${columnClasses[columns]} ${className}`}
            staggerDelay={staggerDelay}
        >
            {React.Children.map(children, (child) => (
                <div style={{ padding: 0 }}>{child}</div>
            ))}
        </AnimatedList>
    );
}

// Fade in on scroll component
interface FadeInOnScrollProps {
    children: React.ReactNode;
    className?: string;
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
    delay?: number;
    duration?: number;
    threshold?: number;
    once?: boolean;
}

export function FadeInOnScroll({
    children,
    className = '',
    direction = 'up',
    delay = 0,
    duration = 500,
    threshold = 0.1,
    once = true,
}: FadeInOnScrollProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const hasAnimated = useRef(false);

    const transforms = {
        up: 'translateY(30px)',
        down: 'translateY(-30px)',
        left: 'translateX(30px)',
        right: 'translateX(-30px)',
        none: 'translateY(0)',
    };

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        if (once && hasAnimated.current) return;
                        setIsVisible(true);
                        hasAnimated.current = true;
                    } else if (!once) {
                        setIsVisible(false);
                    }
                });
            },
            { threshold }
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [threshold, once]);

    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translate(0)' : transforms[direction],
                transition: `opacity ${duration}ms ease, transform ${duration}ms ease`,
                transitionDelay: `${delay}ms`,
            }}
        >
            {children}
        </div>
    );
}

// Parallax scroll component
interface ParallaxProps {
    children: React.ReactNode;
    speed?: number;
    className?: string;
}

export function Parallax({ children, speed = 0.5, className = '' }: ParallaxProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (!ref.current) return;
            const rect = ref.current.getBoundingClientRect();
            const scrolled = window.innerHeight - rect.top;
            setOffset(scrolled * speed * 0.1);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [speed]);

    return (
        <div
            ref={ref}
            className={className}
            style={{
                transform: `translateY(${offset}px)`,
                willChange: 'transform',
            }}
        >
            {children}
        </div>
    );
}

export default AnimatedList;
