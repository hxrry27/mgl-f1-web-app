import { NextResponse } from 'next/server';

export function middleware(req) {
  const token = req.cookies.get('token')?.value;
  if (token) {
    const headers = new Headers(req.headers);
    headers.set('x-token', token);
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/dashboard/:path*', '/api/:path*'],
};