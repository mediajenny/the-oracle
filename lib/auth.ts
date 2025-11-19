import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { sql } from "@/lib/db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Try query with role first, fallback without if column doesn't exist
          let result
          try {
            result = await sql`
              SELECT u.id, u.email, u.password_hash, u.name, u.team_id, COALESCE(u.role, 'member') as role, t.name as team_name
              FROM users u
              LEFT JOIN teams t ON u.team_id = t.id
              WHERE u.email = ${credentials.email}
            `
          } catch (error: any) {
            // If role column doesn't exist, query without it
            if (error.message?.includes("role") || error.message?.includes("column")) {
              result = await sql`
                SELECT u.id, u.email, u.password_hash, u.name, u.team_id, 'member' as role, t.name as team_name
                FROM users u
                LEFT JOIN teams t ON u.team_id = t.id
                WHERE u.email = ${credentials.email}
              `
            } else {
              throw error
            }
          }

          if (result.rows.length === 0) {
            console.error("Auth: User not found:", credentials.email)
            return null
          }

          const user = result.rows[0]
          const isValid = await bcrypt.compare(
            credentials.password,
            user.password_hash
          )

          if (!isValid) {
            console.error("Auth: Invalid password for:", credentials.email)
            return null
          }

          console.log("Auth: Login successful for:", credentials.email)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            teamId: user.team_id,
            teamName: user.team_name,
            role: user.role || "member",
          }
        } catch (error) {
          console.error("Auth error:", error)
          if (error instanceof Error) {
            console.error("Auth error details:", error.message, error.stack)
          }
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.teamId = (user as any).teamId
        token.teamName = (user as any).teamName
        token.role = (user as any).role || "member"
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.teamId = token.teamId as string
        session.user.teamName = token.teamName as string
        session.user.role = (token.role as string) || "member"
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  debug: process.env.NODE_ENV === "development",
}

