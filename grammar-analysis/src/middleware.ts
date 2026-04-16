import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Define protected routes
  const isAdminRoute = path.startsWith('/admin') || path.startsWith('/api/admin');
  const isDashboardRoute = path.startsWith('/dashboard');

  if (isAdminRoute || isDashboardRoute) {
    // Extract token directly from cookies
    const sessionCookie = request.cookies.get('session')?.value;
    
    // Helper to send json/redirect
    const unauthorized = (status = 401) => {
      if (path.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    };

    const forbidden = () => {
      if (path.startsWith('/api')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.rewrite(new URL('/403', request.url));
    };

    // Not logged in?
    if (!sessionCookie) return unauthorized();

    try {
      const payload = await verifyToken(sessionCookie);
      if (!payload) return unauthorized();

      const role = payload.role as string;

      // Role check for /admin specific paths
      if (isAdminRoute && role !== 'ADMIN') return forbidden();

      // Role check for /dashboard specific paths
      if (isDashboardRoute && role !== 'ADMIN' && role !== 'TEACHER') return forbidden();
      
    } catch (err) {
      return unauthorized();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/dashboard/:path*'],
};
