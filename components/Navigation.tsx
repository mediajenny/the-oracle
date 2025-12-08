"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"

export function Navigation() {
  const { data: session, status } = useSession()

  return (
    <nav className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          The Oracle
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/past-reports">
            <Button variant="ghost">Reports</Button>
          </Link>
          {status === "loading" ? (
            <div className="h-9 w-20 bg-muted animate-pulse rounded" />
          ) : session ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="h-4 w-4" />
                {session.user?.name || session.user?.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
