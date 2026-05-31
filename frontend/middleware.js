import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('nexus_token')?.value;
  const { pathname } = request.nextUrl;

  const publicPaths = ['/login', '/register', '/verify-otp', '/forgot-password', '/reset-password'];
  const isPublicPath = publicPaths.includes(pathname);
  const isRootPath = pathname === '/';

  if (isRootPath) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isPublicPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};