"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogOut, User, Shield } from "lucide-react"

export function Navigation() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.email?.toLowerCase().includes("admin") || session?.user?.email === "admin@example.com"

  return (
    <nav className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          The Oracle
        </Link>
        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link href="/reports">
                <Button variant="ghost">Reports</Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/admin">
                  <Button variant="ghost">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{session.user?.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
