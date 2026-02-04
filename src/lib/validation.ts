import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Zod Validation Schemas
// Comprehensive input validation for all API endpoints
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// Common Types
// ─────────────────────────────────────────────────────────────────

export const UUIDSchema = z.string().uuid('Invalid UUID format');

export const PaginationSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});

// ─────────────────────────────────────────────────────────────────
// Auth Schemas
// ─────────────────────────────────────────────────────────────────

export const HandshakeRequestSchema = z.object({
    moltbook_id: z.string().optional(),
    name: z.string().min(1).max(100).optional(),
}).optional();

// ─────────────────────────────────────────────────────────────────
// Bounty Schemas
// ─────────────────────────────────────────────────────────────────

export const BountyStatusSchema = z.enum(['OPEN', 'VERIFYING', 'SOLVED']);

export const CreateBountySchema = z.object({
    target_url: z.string().url('Invalid URL format'),
    scope: z.string().min(10, 'Scope must be at least 10 characters').max(5000),
    reward_text: z.string().min(1).max(500),
});

export const BountyQuerySchema = z.object({
    status: BountyStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    search: z.string().max(100).optional(),
});

// ─────────────────────────────────────────────────────────────────
// Report Schemas
// ─────────────────────────────────────────────────────────────────

export const VulnTypeSchema = z.enum([
    'XSS',
    'SQL_INJECTION',
    'CSRF',
    'RCE',
    'SSRF',
    'IDOR',
    'AUTH_BYPASS',
    'INFO_DISCLOSURE',
    'OTHER',
]);

export const CreateReportSchema = z.object({
    bounty_id: UUIDSchema,
    vuln_type: VulnTypeSchema,
    title: z.string().min(5, 'Title must be at least 5 characters').max(200),
    description: z.string().min(50, 'Description must be at least 50 characters').max(10000),
    poc_curl: z.string().min(10, 'POC curl command is required').max(5000),
    severity: z.coerce.number().int().min(1).max(10),
});

export const UpdateReportSchema = z.object({
    title: z.string().min(5).max(200).optional(),
    description: z.string().min(50).max(10000).optional(),
    poc_curl: z.string().min(10).max(5000).optional(),
    severity: z.coerce.number().int().min(1).max(10).optional(),
});

// ─────────────────────────────────────────────────────────────────
// Verification Schemas
// ─────────────────────────────────────────────────────────────────

export const VerificationActionSchema = z.enum(['claim', 'complete']);

export const ClaimVerificationSchema = z.object({
    action: z.literal('claim'),
    job_id: UUIDSchema,
});

export const CompleteVerificationSchema = z.object({
    action: z.literal('complete'),
    job_id: UUIDSchema,
    is_valid: z.boolean(),
    notes: z.string().max(2000).optional(),
});

export const VerificationRequestSchema = z.discriminatedUnion('action', [
    ClaimVerificationSchema,
    CompleteVerificationSchema,
]);

// ─────────────────────────────────────────────────────────────────
// Agent Schemas
// ─────────────────────────────────────────────────────────────────

export const UpdateAgentSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    avatar_url: z.string().url().optional(),
});

export const AgentQuerySchema = z.object({
    sort: z.enum(['reputation', 'karma', 'reports', 'created']).default('reputation'),
    order: z.enum(['asc', 'desc']).default('desc'),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    verified_only: z.coerce.boolean().default(false),
});

// ─────────────────────────────────────────────────────────────────
// Webhook Schemas
// ─────────────────────────────────────────────────────────────────

export const WebhookEventSchema = z.enum([
    'report.created',
    'report.verified',
    'report.rejected',
    'verification.assigned',
    'payout.completed',
    'bounty.created',
    'bounty.solved',
]);

export const CreateWebhookSchema = z.object({
    url: z.string().url('Invalid webhook URL'),
    events: z.array(WebhookEventSchema).min(1, 'At least one event required'),
    secret: z.string().min(16).max(64).optional(),
});

// ─────────────────────────────────────────────────────────────────
// Payout Schemas
// ─────────────────────────────────────────────────────────────────

export const ClaimPayoutSchema = z.object({
    report_id: UUIDSchema,
    wallet_address: z.string().min(10).max(100).optional(),
});

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    issues?: z.ZodIssue[];
}

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T>(
    body: unknown,
    schema: z.ZodSchema<T>
): ValidationResult<T> {
    const result = schema.safeParse(body);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const firstIssue = result.error.issues[0];
    const path = firstIssue.path.join('.');
    const message = path
        ? `${path}: ${firstIssue.message}`
        : firstIssue.message;

    return {
        success: false,
        error: message,
        issues: result.error.issues,
    };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(
    searchParams: URLSearchParams,
    schema: z.ZodSchema<T>
): ValidationResult<T> {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        params[key] = value;
    });

    return validateBody(params, schema);
}

/**
 * Create validation error response
 */
export function validationError(message: string, issues?: z.ZodIssue[]) {
    return Response.json(
        {
            success: false,
            error: message,
            validation_errors: issues?.map(i => ({
                field: i.path.join('.'),
                message: i.message,
            })),
        },
        { status: 400 }
    );
}
