import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and internal next paths always bypass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get('turia_access_token')?.value ||
    request.cookies.get('token')?.value;

  const isAuthRoute = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
  const isPublicForm = pathname.startsWith('/gst-form');

  // Authenticated users trying to access login/signup go straight to dashboard
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Unauthenticated visitors trying to access protected business routes go to login
  if (!token && !isAuthRoute && !isPublicForm) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
