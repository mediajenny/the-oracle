import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Middleware that allows all requests through (no authentication required)
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

// Empty matcher - middleware won't run on any routes
export const config = {
  matcher: [],
}
