import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await isAdmin(session.user.id)
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const result = await sql`
      SELECT 
        t.id,
        t.name,
        t.created_at,
        t.updated_at,
        (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count
      FROM teams t
      ORDER BY t.created_at DESC
    `

    return NextResponse.json({ teams: result.rows })
  } catch (error: any) {
    console.error("Get teams error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch teams" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await isAdmin(session.user.id)
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO teams (name)
      VALUES (${name})
      RETURNING id, name, created_at, updated_at
    `

    return NextResponse.json({ team: result.rows[0] })
  } catch (error: any) {
    console.error("Create team error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create team" },
      { status: 500 }
    )
  }
}

