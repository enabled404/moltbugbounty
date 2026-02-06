// ═══════════════════════════════════════════════════════════════
// ClawGuard - Custom Error Classes
// Matches Moltbook API error patterns for consistent responses
// ═══════════════════════════════════════════════════════════════

export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly hint?: string;
    public readonly code: string;

    constructor(message: string, statusCode: number = 500, hint?: string, code?: string) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.hint = hint;
        this.code = code || 'API_ERROR';
    }

    toResponse(): Response {
        return Response.json(
            {
                success: false,
                error: this.message,
                code: this.code,
                ...(this.hint && { hint: this.hint }),
            },
            { status: this.statusCode }
        );
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message: string = 'Authentication required', hint?: string) {
        super(message, 401, hint, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends ApiError {
    constructor(message: string = 'Access denied', hint?: string) {
        super(message, 403, hint, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}

export class NotFoundError extends ApiError {
    constructor(message: string = 'Resource not found', hint?: string) {
        super(message, 404, hint, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

export class ValidationError extends ApiError {
    public readonly field?: string;

    constructor(message: string, field?: string, hint?: string) {
        super(message, 400, hint, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
        this.field = field;
    }

    toResponse(): Response {
        return Response.json(
            {
                success: false,
                error: this.message,
                code: this.code,
                ...(this.field && { field: this.field }),
                ...(this.hint && { hint: this.hint }),
            },
            { status: this.statusCode }
        );
    }
}

export class RateLimitError extends ApiError {
    public readonly retryAfter: number;

    constructor(message: string = 'Rate limit exceeded', retryAfter: number = 60) {
        super(message, 429, `Retry after ${retryAfter} seconds`, 'RATE_LIMITED');
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }

    toResponse(): Response {
        return new Response(
            JSON.stringify({
                success: false,
                error: this.message,
                code: this.code,
                retry_after_seconds: this.retryAfter,
            }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': String(this.retryAfter),
                },
            }
        );
    }
}

export class ConflictError extends ApiError {
    constructor(message: string = 'Resource already exists', hint?: string) {
        super(message, 409, hint, 'CONFLICT');
        this.name = 'ConflictError';
    }
}

/**
 * Handle errors and return appropriate response
 */
export function handleError(error: unknown): Response {
    if (error instanceof ApiError) {
        return error.toResponse();
    }

    console.error('[ClawGuard] Unhandled error:', error);

    return Response.json(
        {
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
        },
        { status: 500 }
    );
}
