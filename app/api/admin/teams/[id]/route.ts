import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { isAdmin, canManageTeam } from "@/lib/permissions"

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

    // Try query with role first, fallback without if column doesn't exist
    let result
    try {
      result = await sql`
        SELECT 
          t.id,
          t.name,
          t.created_at,
          t.updated_at,
          (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count,
          array_agg(
            json_build_object(
              'id', u.id,
              'email', u.email,
              'name', u.name,
              'role', COALESCE(u.role, 'member')
            )
          ) FILTER (WHERE u.id IS NOT NULL) as members
        FROM teams t
        LEFT JOIN users u ON u.team_id = t.id
        WHERE t.id = ${params.id}
        GROUP BY t.id, t.name, t.created_at, t.updated_at
      `
    } catch (error: any) {
      // If role column doesn't exist, query without it
      if (error.message?.includes("role") || error.message?.includes("column")) {
        result = await sql`
          SELECT 
            t.id,
            t.name,
            t.created_at,
            t.updated_at,
            (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count,
            array_agg(
              json_build_object(
                'id', u.id,
                'email', u.email,
                'name', u.name,
                'role', 'member'
              )
            ) FILTER (WHERE u.id IS NOT NULL) as members
          FROM teams t
          LEFT JOIN users u ON u.team_id = t.id
          WHERE t.id = ${params.id}
          GROUP BY t.id, t.name, t.created_at, t.updated_at
        `
      } else {
        throw error
      }
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    return NextResponse.json({ team: result.rows[0] })
  } catch (error: any) {
    console.error("Get team error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch team" },
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
    const canManage = await canManageTeam(session.user.id, params.id)
    
    if (!admin && !canManage) {
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
      UPDATE teams
      SET name = ${name}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${params.id}
      RETURNING id, name, created_at, updated_at
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    return NextResponse.json({ team: result.rows[0] })
  } catch (error: any) {
    console.error("Update team error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update team" },
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

    // Check if team has members
    const membersResult = await sql`
      SELECT COUNT(*) as count FROM users WHERE team_id = ${params.id}
    `

    if (parseInt(membersResult.rows[0].count) > 0) {
      return NextResponse.json(
        { error: "Cannot delete team with members. Remove all members first." },
        { status: 400 }
      )
    }

    await sql`DELETE FROM teams WHERE id = ${params.id}`

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Delete team error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete team" },
      { status: 500 }
    )
  }
}

