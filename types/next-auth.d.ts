import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      teamId?: string | null
      teamName?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    teamId?: string | null
    teamName?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    teamId?: string | null
    teamName?: string | null
  }
}

