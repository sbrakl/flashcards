import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerSupabaseClient } from './lib/supabaseServer';

export async function proxy(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  // Cryptographically verify the JWT signature via WebCrypto (no Auth server call)
  const { data: claimsResult } = await supabase.auth.getClaims();
  const isAuthenticated = claimsResult?.claims != null;
  const { pathname } = request.nextUrl;

  // Case A: User has no session cookie and attempts to access secure dashboard
  if (!isAuthenticated && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Case B: Authenticated user hits the landing page—automatically forward to dashboard
  if (isAuthenticated && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * - public assets (png, svg, jpg, etc.)
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};