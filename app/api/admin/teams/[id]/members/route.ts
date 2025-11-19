import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { isAdmin, canManageTeam } from "@/lib/permissions"

// Add member to team
export async function POST(
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
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Update user's team_id
    await sql`
      UPDATE users
      SET team_id = ${params.id}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Add team member error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to add team member" },
      { status: 500 }
    )
  }
}

// Remove member from team
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
    const canManage = await canManageTeam(session.user.id, params.id)
    
    if (!admin && !canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Remove user from team
    await sql`
      UPDATE users
      SET team_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId} AND team_id = ${params.id}
    `

    // Also remove team-specific permissions
    await sql`
      DELETE FROM user_team_permissions
      WHERE user_id = ${userId} AND team_id = ${params.id}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Remove team member error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to remove team member" },
      { status: 500 }
    )
  }
}

