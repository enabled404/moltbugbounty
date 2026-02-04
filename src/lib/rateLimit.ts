import { NextRequest } from 'next/server';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Rate Limiting Middleware
// In-memory rate limiting with per-agent quotas
// ═══════════════════════════════════════════════════════════════

interface RateLimitRecord {
    count: number;
    resetAt: number;
}

// In-memory store (use Redis in production for multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Rate limit configurations by endpoint type
export const RATE_LIMITS = {
    // Auth endpoints - more lenient
    auth: { windowMs: 60_000, maxRequests: 10 },

    // Read endpoints - moderate
    read: { windowMs: 60_000, maxRequests: 100 },

    // Write endpoints - stricter
    write: { windowMs: 60_000, maxRequests: 20 },

    // Sensitive operations - very strict
    sensitive: { windowMs: 60_000, maxRequests: 5 },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    limit: number;
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(
    identifier: string,
    tier: RateLimitTier = 'read'
): RateLimitResult {
    const config = RATE_LIMITS[tier];
    const now = Date.now();
    const key = `${tier}:${identifier}`;

    // Get or create record
    let record = rateLimitStore.get(key);

    if (!record || now >= record.resetAt) {
        // Create new window
        record = {
            count: 0,
            resetAt: now + config.windowMs,
        };
    }

    record.count++;
    rateLimitStore.set(key, record);

    const allowed = record.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - record.count);

    return {
        allowed,
        remaining,
        resetAt: record.resetAt,
        limit: config.maxRequests,
    };
}

/**
 * Extract identifier from request (IP or agent ID)
 */
export function getIdentifier(request: NextRequest, agentId?: string): string {
    // Prefer agent ID if authenticated
    if (agentId) {
        return `agent:${agentId}`;
    }

    // Fall back to IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';

    return `ip:${ip}`;
}

/**
 * Create rate limit error response
 */
export function rateLimitError(result: RateLimitResult) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

    return new Response(
        JSON.stringify({
            success: false,
            error: 'Rate limit exceeded. Please slow down.',
            limit: result.limit,
            remaining: 0,
            retry_after_seconds: retryAfter,
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': String(result.limit),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
                'Retry-After': String(retryAfter),
            },
        }
    );
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
    response: Response,
    result: RateLimitResult
): Response {
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Limit', String(result.limit));
    headers.set('X-RateLimit-Remaining', String(result.remaining));
    headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(
    tier: RateLimitTier,
    handler: (request: NextRequest) => Promise<Response>
) {
    return async (request: NextRequest): Promise<Response> => {
        const identifier = getIdentifier(request);
        const result = checkRateLimit(identifier, tier);

        if (!result.allowed) {
            return rateLimitError(result);
        }

        const response = await handler(request);
        return addRateLimitHeaders(response, result);
    };
}

/**
 * Clean up expired rate limit records (call periodically)
 */
export function cleanupRateLimits(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, record] of rateLimitStore.entries()) {
        if (now >= record.resetAt) {
            rateLimitStore.delete(key);
            cleaned++;
        }
    }

    return cleaned;
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
