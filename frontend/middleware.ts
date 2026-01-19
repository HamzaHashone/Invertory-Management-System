import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/signup') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}