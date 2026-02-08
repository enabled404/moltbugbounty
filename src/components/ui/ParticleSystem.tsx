'use client';

import { useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════
// CLAWGUARD - IMMERSIVE PARTICLE SYSTEM
// Creates a stunning animated particle field with glowing orbs
// ═══════════════════════════════════════════════════════════════

interface Particle {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    opacity: number;
    color: string;
    pulse: number;
    pulseSpeed: number;
}

interface ParticleSystemProps {
    particleCount?: number;
    colors?: string[];
    maxSize?: number;
    speed?: number;
    className?: string;
}

export function ParticleSystem({
    particleCount = 80,
    colors = ['#ef4444', '#f97316', '#dc2626', '#fb923c', '#fbbf24'],
    maxSize = 4,
    speed = 0.3,
    className = '',
}: ParticleSystemProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animationRef = useRef<number | undefined>(undefined);
    const mouseRef = useRef({ x: 0, y: 0 });

    const createParticle = useCallback((width: number, height: number): Particle => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * maxSize + 1,
        speedX: (Math.random() - 0.5) * speed,
        speedY: (Math.random() - 0.5) * speed,
        opacity: Math.random() * 0.5 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
    }), [colors, maxSize, speed]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.scale(dpr, dpr);

            // Reinitialize particles on resize
            particlesRef.current = Array.from({ length: particleCount }, () =>
                createParticle(window.innerWidth, window.innerHeight)
            );
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', handleMouseMove);

        const animate = () => {
            if (!ctx || !canvas) return;

            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            particlesRef.current.forEach((particle) => {
                // Update position
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                particle.pulse += particle.pulseSpeed;

                // Mouse interaction - particles attracted to cursor
                const dx = mouseRef.current.x - particle.x;
                const dy = mouseRef.current.y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 150) {
                    particle.speedX += dx * 0.00005;
                    particle.speedY += dy * 0.00005;
                }

                // Boundary wrapping
                if (particle.x < 0) particle.x = window.innerWidth;
                if (particle.x > window.innerWidth) particle.x = 0;
                if (particle.y < 0) particle.y = window.innerHeight;
                if (particle.y > window.innerHeight) particle.y = 0;

                // Calculate pulsing opacity
                const pulsingOpacity = particle.opacity * (0.5 + 0.5 * Math.sin(particle.pulse));

                // Draw glowing orb
                const gradient = ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size * 3
                );
                gradient.addColorStop(0, particle.color);
                gradient.addColorStop(0.5, particle.color.replace(')', ', 0.3)').replace('rgb', 'rgba'));
                gradient.addColorStop(1, 'transparent');

                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.globalAlpha = pulsingOpacity;
                ctx.fill();

                // Draw core
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = particle.color;
                ctx.globalAlpha = pulsingOpacity * 1.5;
                ctx.fill();

                ctx.globalAlpha = 1;
            });

            // Draw connecting lines between nearby particles
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.08)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < particlesRef.current.length; i++) {
                for (let j = i + 1; j < particlesRef.current.length; j++) {
                    const p1 = particlesRef.current[i];
                    const p2 = particlesRef.current[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 120) {
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.globalAlpha = 1 - distance / 120;
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                }
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [particleCount, createParticle]);

    return (
        <canvas
            ref={canvasRef}
            className={`fixed inset-0 pointer-events-none z-0 ${className}`}
            style={{ opacity: 0.7 }}
        />
    );
}

// ═══════════════════════════════════════════════════════════════
// FLOATING ORB - Animated glowing sphere
// ═══════════════════════════════════════════════════════════════

interface FloatingOrbProps {
    size?: number;
    color?: string;
    delay?: number;
    duration?: number;
    className?: string;
}

export function FloatingOrb({
    size = 300,
    color = '#ef4444',
    delay = 0,
    duration = 20,
    className = '',
}: FloatingOrbProps) {
    return (
        <div
            className={`absolute rounded-full pointer-events-none ${className}`}
            style={{
                width: size,
                height: size,
                background: `radial-gradient(circle, ${color}40 0%, ${color}10 40%, transparent 70%)`,
                filter: 'blur(60px)',
                animation: `float ${duration}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
            }}
        />
    );
}

// ═══════════════════════════════════════════════════════════════
// AURORA BACKGROUND - Flowing gradient animation
// ═══════════════════════════════════════════════════════════════

export function AuroraBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Primary aurora */}
            <div
                className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%]"
                style={{
                    background: `
            radial-gradient(ellipse 80% 50% at 20% 40%, rgba(239, 68, 68, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 60%, rgba(251, 146, 60, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at 50% 80%, rgba(249, 115, 22, 0.08) 0%, transparent 50%)
          `,
                    animation: 'aurora 25s ease-in-out infinite alternate',
                }}
            />
            {/* Secondary aurora */}
            <div
                className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%]"
                style={{
                    background: `
            radial-gradient(ellipse 70% 40% at 70% 30%, rgba(220, 38, 38, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 50% 50% at 30% 70%, rgba(239, 68, 68, 0.08) 0%, transparent 50%)
          `,
                    animation: 'aurora 30s ease-in-out infinite alternate-reverse',
                }}
            />
        </div>
    );
}

export default ParticleSystem;
