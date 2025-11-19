import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await sql`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.team_id,
        t.name as team_name,
        u.created_at
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.id = ${session.user.id}
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: result.rows[0] })
  } catch (error: any) {
    console.error("Get user error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch user" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email } = body

    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await sql`
        SELECT id FROM users WHERE email = ${email} AND id != ${session.user.id}
      `
      if (existingUser.rows.length > 0) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        )
      }
    }

    // Update user
    const result = await sql`
      UPDATE users
      SET 
        name = COALESCE(${name || null}, name),
        email = COALESCE(${email || null}, email),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${session.user.id}
      RETURNING id, email, name, team_id, created_at
    `

    // Get team name
    const userResult = await sql`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.team_id,
        t.name as team_name,
        u.created_at
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.id = ${session.user.id}
    `

    return NextResponse.json({ user: userResult.rows[0] })
  } catch (error: any) {
    console.error("Update user error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    )
  }
}

