import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { executeDynamicQuery } from "@/lib/db/helpers"
import bcrypt from "bcryptjs"
import { isAdmin } from "@/lib/permissions"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        WHERE u.id = ${params.id}
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
          WHERE u.id = ${params.id}
        `
      } else {
        throw error
      }
    }

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { name, email, teamId, password, role } = body

    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await sql`
        SELECT id FROM users WHERE email = ${email} AND id != ${params.id}
      `
      if (existingUser.rows.length > 0) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        )
      }
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1
    let hasRoleUpdate = false

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(name || null)
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`)
      values.push(email)
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`)
      values.push(role)
      hasRoleUpdate = true
    }
    if (teamId !== undefined) {
      updates.push(`team_id = $${paramIndex++}`)
      values.push(teamId === "" ? null : teamId)
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10)
      updates.push(`password_hash = $${paramIndex++}`)
      values.push(passwordHash)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(params.id)

    // Use dynamic query helper for variable updates
    // Try with role first, fallback without if column doesn't exist
    try {
      const returnFields = hasRoleUpdate ? "id, email, name, role, team_id, created_at, updated_at" : "id, email, name, team_id, created_at, updated_at"
      const query = `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING ${returnFields}`
      await executeDynamicQuery(query, values)
    } catch (error: any) {
      // If role column doesn't exist and we're trying to update it, remove role from update
      if ((error.message?.includes("role") || error.message?.includes("column")) && hasRoleUpdate) {
        const updatesWithoutRole = updates.filter(u => !u.includes("role ="))
        const valuesWithoutRole = values.slice(0, -1) // Remove the last value (params.id)
        // Rebuild values array without role
        const newValues: any[] = []
        let newParamIndex = 1
        if (name !== undefined) {
          newValues.push(name || null)
        }
        if (email !== undefined) {
          newValues.push(email)
        }
        if (teamId !== undefined) {
          newValues.push(teamId === "" ? null : teamId)
        }
        if (password) {
          const passwordHash = await bcrypt.hash(password, 10)
          newValues.push(passwordHash)
        }
        newValues.push(params.id)
        
        const returnFields = "id, email, name, team_id, created_at, updated_at"
        const query = `UPDATE users SET ${updatesWithoutRole.join(", ")} WHERE id = $${newParamIndex + updatesWithoutRole.length - 1} RETURNING ${returnFields}`
        await executeDynamicQuery(query, newValues)
      } else {
        throw error
      }
    }

    // Get updated user with team name
    let userResult
    try {
      userResult = await sql`
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
        WHERE u.id = ${params.id}
      `
    } catch (error: any) {
      // If role column doesn't exist, query without it
      if (error.message?.includes("role") || error.message?.includes("column")) {
        userResult = await sql`
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
          WHERE u.id = ${params.id}
        `
      } else {
        throw error
      }
    }

    return NextResponse.json({ user: userResult.rows[0] })
  } catch (error: any) {
    console.error("Update user error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await isAdmin(session.user.id)
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Prevent deleting yourself
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    await sql`DELETE FROM users WHERE id = ${params.id}`

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Delete user error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    )
  }
}
