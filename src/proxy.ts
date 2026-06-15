import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerSupabaseClient } from './lib/supabaseServer';

export async function proxy(request: NextRequest) {

  // 1. Create an initial response object
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. Initialize a special Supabase Client configured for Middleware
  const supabase = await createServerSupabaseClient();

  // 3. Ask Supabase to securely decrypt the cookie and return the current user
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Case A: User has no session cookie and attempts to access secure dashboard
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Case B: Authenticated user hits the landing page—automatically forward to dashboard
  if (user && pathname === '/') {
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