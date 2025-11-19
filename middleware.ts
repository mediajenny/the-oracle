import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  async function middleware(req) {
    // Check if accessing admin routes
    if (req.nextUrl.pathname.startsWith("/admin")) {
      // Check email-based admin (for backward compatibility)
      // The admin page itself will do a more thorough check via API
      const email = req.token?.email || ""
      const role = (req.token as any)?.role || ""
      
      // Check if admin by email or role
      const isAdmin = 
        email.toLowerCase().includes("admin") || 
        email === "admin@example.com" ||
        role === "admin"
      
      if (!isAdmin) {
        return NextResponse.redirect(new URL("/reports", req.url))
      }
    }
    
    return NextResponse.next()
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access if token exists (user is authenticated)
        // Admin check is done above
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    "/reports/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/api/upload/:path*",
    "/api/share/:path*",
    "/api/users/:path*",
    "/api/admin/:path*",
  ],
}

