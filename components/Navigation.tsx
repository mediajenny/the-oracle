"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navigation() {
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
        </div>
      </div>
    </nav>
  )
}
