import { NextResponse, type NextRequest } from 'next/server';

// ═══════════════════════════════════════════════════════════════
// ClawGuard Middleware
// Handles /auth.md alias to /api/skill.md
// ═══════════════════════════════════════════════════════════════

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Alias /auth.md to /api/skill.md for Moltbook compatibility
    if (pathname === '/auth.md') {
        const url = request.nextUrl.clone();
        url.pathname = '/api/skill.md';
        return NextResponse.rewrite(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/auth.md'],
};
