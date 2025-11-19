import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin, canManageTeam, getUserTeamPermissions, setUserTeamPermissions } from "@/lib/permissions"

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await isAdmin(session.user.id)
    const canManage = await canManageTeam(session.user.id, params.teamId)
    
    if (!admin && !canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const permissions = await getUserTeamPermissions(params.userId, params.teamId)
    
    return NextResponse.json({ 
      permissions: permissions || {
        can_view_reports: true,
        can_create_reports: true,
        can_edit_reports: false,
        can_delete_reports: false,
        can_upload_files: true,
        can_delete_files: false,
        can_share_files: true,
        can_manage_team: false,
      }
    })
  } catch (error: any) {
    console.error("Get permissions error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch permissions" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string; teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await isAdmin(session.user.id)
    const canManage = await canManageTeam(session.user.id, params.teamId)
    
    if (!admin && !canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const permissions = await setUserTeamPermissions(
      params.userId,
      params.teamId,
      body
    )

    return NextResponse.json({ permissions })
  } catch (error: any) {
    console.error("Update permissions error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update permissions" },
      { status: 500 }
    )
  }
}

