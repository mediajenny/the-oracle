import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import bcrypt from "bcryptjs"

// Helper endpoint to create users (for initial setup)
// In production, you'd want a proper user registration flow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, teamName } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create team if teamName provided
    let teamId = null
    if (teamName) {
      const teamResult = await sql`
        INSERT INTO teams (name)
        VALUES (${teamName})
        RETURNING id
      `
      teamId = teamResult.rows[0].id
    }

    // Create user
    const userResult = await sql`
      INSERT INTO users (email, password_hash, name, team_id)
      VALUES (${email}, ${passwordHash}, ${name || null}, ${teamId})
      RETURNING id, email, name
    `

    return NextResponse.json({
      success: true,
      user: userResult.rows[0],
    })
  } catch (error: any) {
    console.error("Create user error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    )
  }
}

