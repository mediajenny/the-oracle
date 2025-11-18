import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: ["/reports/:path*", "/api/upload/:path*", "/api/share/:path*"],
}

