// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseServer } from './supabase-server';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('proxy hit', pathname);

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

export const config = {
  matcher: [
    '/((?!login|_next/static|_next/image|favicon.ico|static).*)',
  ],
};