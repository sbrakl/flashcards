// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server'; // 1. Import the type
import { supabaseServer } from './supabase-server';

export async function middleware(request: NextRequest) { // 2. Use the type for the request parameter
  const { pathname } = request.nextUrl;

  console.log('middleware hit', pathname);

  // Allow login page and static assets
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static')
  ) {
    return NextResponse.next();
  }

  // Get session from Supabase (server-side)
  const { data: { session } } = await supabaseServer.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// 🟢 Add this to register specific routing rules with Next.js
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - login (your login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static (your custom static assets folder)
     */
    '/((?!login|_next/static|_next/image|favicon.ico|static).*)',
  ],
};