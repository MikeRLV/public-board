import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const lastCity = request.cookies.get('last-city')?.value

  // If user is at the home page "/" and has a saved city, redirect them
  if (pathname === '/' && lastCity) {
    return NextResponse.redirect(new URL(`/${lastCity}`, request.url))
  }

  return NextResponse.next()
}

// This ensures it only runs when someone hits the home page
export const config = {
  matcher: '/',
}