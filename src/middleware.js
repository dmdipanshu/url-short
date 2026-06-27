import { NextResponse } from 'next/server';
import { verifySessionToken } from './lib/auth';

// Routes that should NOT be treated as short codes
const EXCLUDED_PATHS = [
  '/',
  '/login',
  '/dashboard',
  '/expired',
  '/p',
  '/api',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

// Routes that require authentication
const AUTH_PATHS = ['/', '/dashboard'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('snip_session');
  const isLoggedIn = verifySessionToken(session?.value);

  // ===== AUTH CHECK: Protect home + dashboard =====
  if (AUTH_PATHS.includes(pathname)) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // ===== LOGIN PAGE: Redirect if already authenticated =====
  if (pathname === '/login') {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // ===== Skip excluded paths =====
  if (EXCLUDED_PATHS.some(path => pathname.startsWith(path + '/') || pathname === path)) {
    return NextResponse.next();
  }

  // Skip paths with file extensions (static files)
  if (pathname.includes('.')) {
    return NextResponse.next();
  }

  // ===== SHORT URL REDIRECT =====
  const code = pathname.slice(1);

  // Validate: only alphanumeric, hyphens, underscores (1-50 chars)
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(code)) {
    return NextResponse.next();
  }

  try {
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/redirect/${code}`, {
      headers: { 'x-middleware-secret': process.env.MIDDLEWARE_SECRET || 'internal' },
    });

    const data = await response.json();

    // Password protected link → redirect to password gate
    if (response.status === 403 && data.passwordRequired) {
      return NextResponse.redirect(new URL(`/p/${code}`, request.url));
    }

    // Expired link → redirect to expired page
    if (response.status === 410 && data.expired) {
      return NextResponse.redirect(new URL('/expired', request.url));
    }

    // Found → redirect to destination
    if (response.ok && data.url) {
      return NextResponse.redirect(data.url, 301);
    }
  } catch (error) {
    console.error('Middleware redirect error:', error);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
