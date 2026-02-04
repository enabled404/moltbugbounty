import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSSRClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ═══════════════════════════════════════════════════════════════
// Supabase Client Configuration
// ClawGuard - Security-First Bug Bounty Platform
// ═══════════════════════════════════════════════════════════════

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Browser Supabase Client
 * Used for client-side operations with RLS enforcement
 */
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Server Supabase Client (with cookies)
 * Used for server-side operations with user session
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );
}

/**
 * Admin Supabase Client
 * SECURITY: Bypasses RLS - use only for trusted server operations
 * Never expose this to client-side code
 */
export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
