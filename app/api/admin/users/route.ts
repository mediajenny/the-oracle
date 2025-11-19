import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import bcrypt from "bcryptjs"
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

    // Try to get role, fallback to null if column doesn't exist
    let result
    try {
      result = await sql`
        SELECT 
          u.id,
          u.email,
          u.name,
          COALESCE(u.role, 'member') as role,
          u.team_id,
          t.name as team_name,
          u.created_at,
          u.updated_at,
          (SELECT COUNT(*) FROM reports WHERE user_id = u.id) as report_count,
          (SELECT COUNT(*) FROM uploaded_files WHERE user_id = u.id) as file_count
        FROM users u
        LEFT JOIN teams t ON u.team_id = t.id
        ORDER BY u.created_at DESC
      `
    } catch (error: any) {
      // If role column doesn't exist, query without it
      if (error.message?.includes("role") || error.message?.includes("column")) {
        result = await sql`
          SELECT 
            u.id,
            u.email,
            u.name,
            'member' as role,
            u.team_id,
            t.name as team_name,
            u.created_at,
            u.updated_at,
            (SELECT COUNT(*) FROM reports WHERE user_id = u.id) as report_count,
            (SELECT COUNT(*) FROM uploaded_files WHERE user_id = u.id) as file_count
          FROM users u
          LEFT JOIN teams t ON u.team_id = t.id
          ORDER BY u.created_at DESC
        `
      } else {
        throw error
      }
    }

    return NextResponse.json({ users: result.rows })
  } catch (error: any) {
    console.error("Get users error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
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
    const { email, password, name, teamId, role } = body

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

    // Create user - try with role, fallback without if column doesn't exist
    let userResult
    try {
      userResult = await sql`
        INSERT INTO users (email, password_hash, name, team_id, role)
        VALUES (${email}, ${passwordHash}, ${name || null}, ${teamId || null}, ${role || "member"})
        RETURNING id, email, name, role, team_id, created_at
      `
    } catch (error: any) {
      // If role column doesn't exist, insert without it
      if (error.message?.includes("role") || error.message?.includes("column")) {
        userResult = await sql`
          INSERT INTO users (email, password_hash, name, team_id)
          VALUES (${email}, ${passwordHash}, ${name || null}, ${teamId || null})
          RETURNING id, email, name, team_id, created_at
        `
      } else {
        throw error
      }
    }

    // Get user with team name
    let newUser
    try {
      newUser = await sql`
        SELECT 
          u.id,
          u.email,
          u.name,
          COALESCE(u.role, 'member') as role,
          u.team_id,
          t.name as team_name,
          u.created_at,
          u.updated_at
        FROM users u
        LEFT JOIN teams t ON u.team_id = t.id
        WHERE u.id = ${userResult.rows[0].id}
      `
    } catch (error: any) {
      // If role column doesn't exist, query without it
      if (error.message?.includes("role") || error.message?.includes("column")) {
        newUser = await sql`
          SELECT 
            u.id,
            u.email,
            u.name,
            'member' as role,
            u.team_id,
            t.name as team_name,
            u.created_at,
            u.updated_at
          FROM users u
          LEFT JOIN teams t ON u.team_id = t.id
          WHERE u.id = ${userResult.rows[0].id}
        `
      } else {
        throw error
      }
    }

    return NextResponse.json({ user: newUser.rows[0] })
  } catch (error: any) {
    console.error("Create user error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    )
  }
}

