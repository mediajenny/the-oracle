import { sql } from "@/lib/db"

export type UserRole = "admin" | "team_admin" | "member"

export interface UserTeamPermissions {
  id: string
  user_id: string
  team_id: string
  can_view_reports: boolean
  can_create_reports: boolean
  can_edit_reports: boolean
  can_delete_reports: boolean
  can_upload_files: boolean
  can_delete_files: boolean
  can_share_files: boolean
  can_manage_team: boolean
}

export interface PermissionCheck {
  userId: string
  teamId?: string | null
  permission: keyof Omit<UserTeamPermissions, "id" | "user_id" | "team_id" | "created_at" | "updated_at">
}

/**
 * Check if a user has a specific permission
 */
export async function hasPermission({
  userId,
  teamId,
  permission,
}: PermissionCheck): Promise<boolean> {
  try {
    // Get user role - try with role column, fallback without if it doesn't exist
    let userResult
    let userRole: UserRole = "member"
    
    try {
      userResult = await sql`
        SELECT COALESCE(role, 'member') as role FROM users WHERE id = ${userId}
      `
      if (userResult.rows.length === 0) {
        return false
      }
      userRole = (userResult.rows[0].role as UserRole) || "member"
    } catch (error: any) {
      // If role column doesn't exist, query without it and default to member
      if (error.message?.includes("role") || error.message?.includes("column")) {
        userResult = await sql`
          SELECT email FROM users WHERE id = ${userId}
        `
        if (userResult.rows.length === 0) {
          return false
        }
        // Check email for admin fallback
        const email = userResult.rows[0].email || ""
        if (email.toLowerCase().includes("admin") || email === "admin@example.com") {
          userRole = "admin"
        } else {
          userRole = "member"
        }
      } else {
        throw error
      }
    }

    // Admins have all permissions
    if (userRole === "admin") {
      return true
    }

    // If no team specified, check global role permissions
    if (!teamId) {
      // Team admins have most permissions except admin-only ones
      if (userRole === "team_admin") {
        return true
      }
      return false
    }

    // Check team-specific permissions
    const permResult = await sql`
      SELECT ${sql(permission)} as has_permission
      FROM user_team_permissions
      WHERE user_id = ${userId} AND team_id = ${teamId}
    `

    if (permResult.rows.length === 0) {
      // No explicit permissions set, use defaults based on role
      if (userRole === "team_admin") {
        return true
      }
      // Default member permissions
      return permission === "can_view_reports" || 
             permission === "can_create_reports" || 
             permission === "can_upload_files" || 
             permission === "can_share_files"
    }

    return permResult.rows[0].has_permission === true
  } catch (error) {
    console.error("Permission check error:", error)
    return false
  }
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    // First try to get role from users table
    const result = await sql`
      SELECT role, email FROM users WHERE id = ${userId}
    `
    
    if (result.rows.length === 0) {
      return false
    }
    
    const user = result.rows[0]
    
    // If role column exists and is 'admin', return true
    if (user.role === "admin") {
      return true
    }
    
    // Fallback: check email for admin (for backward compatibility before schema update)
    const email = user.email || ""
    return email.toLowerCase().includes("admin") || email === "admin@example.com"
  } catch (error) {
    // If role column doesn't exist yet, fall back to email check
    try {
      const result = await sql`
        SELECT email FROM users WHERE id = ${userId}
      `
      if (result.rows.length > 0) {
        const email = result.rows[0].email || ""
        return email.toLowerCase().includes("admin") || email === "admin@example.com"
      }
    } catch (e) {
      // Ignore
    }
    return false
  }
}

/**
 * Check if user can manage a team
 */
export async function canManageTeam(userId: string, teamId: string): Promise<boolean> {
  const admin = await isAdmin(userId)
  if (admin) return true

  const hasPerm = await hasPermission({
    userId,
    teamId,
    permission: "can_manage_team",
  })
  
  if (hasPerm) return true

  // Check if user is team_admin role - try with role column, fallback without
  try {
    const userResult = await sql`
      SELECT COALESCE(role, 'member') as role FROM users WHERE id = ${userId}
    `
    return userResult.rows.length > 0 && userResult.rows[0].role === "team_admin"
  } catch (error: any) {
    // If role column doesn't exist, default to false (can't be team_admin without role column)
    if (error.message?.includes("role") || error.message?.includes("column")) {
      return false
    }
    throw error
  }
}

/**
 * Get user permissions for a team
 */
export async function getUserTeamPermissions(
  userId: string,
  teamId: string
): Promise<UserTeamPermissions | null> {
  try {
    const result = await sql`
      SELECT * FROM user_team_permissions
      WHERE user_id = ${userId} AND team_id = ${teamId}
    `
    return result.rows.length > 0 ? (result.rows[0] as UserTeamPermissions) : null
  } catch (error) {
    console.error("Get user team permissions error:", error)
    return null
  }
}

/**
 * Set user permissions for a team
 */
export async function setUserTeamPermissions(
  userId: string,
  teamId: string,
  permissions: Partial<Omit<UserTeamPermissions, "id" | "user_id" | "team_id" | "created_at" | "updated_at">>
): Promise<UserTeamPermissions> {
  const existing = await getUserTeamPermissions(userId, teamId)

  if (existing) {
    // Update existing permissions
    const result = await sql`
      UPDATE user_team_permissions
      SET
        can_view_reports = COALESCE(${permissions.can_view_reports ?? null}, can_view_reports),
        can_create_reports = COALESCE(${permissions.can_create_reports ?? null}, can_create_reports),
        can_edit_reports = COALESCE(${permissions.can_edit_reports ?? null}, can_edit_reports),
        can_delete_reports = COALESCE(${permissions.can_delete_reports ?? null}, can_delete_reports),
        can_upload_files = COALESCE(${permissions.can_upload_files ?? null}, can_upload_files),
        can_delete_files = COALESCE(${permissions.can_delete_files ?? null}, can_delete_files),
        can_share_files = COALESCE(${permissions.can_share_files ?? null}, can_share_files),
        can_manage_team = COALESCE(${permissions.can_manage_team ?? null}, can_manage_team),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId} AND team_id = ${teamId}
      RETURNING *
    `
    return result.rows[0] as UserTeamPermissions
  } else {
    // Create new permissions
    const result = await sql`
      INSERT INTO user_team_permissions (
        user_id,
        team_id,
        can_view_reports,
        can_create_reports,
        can_edit_reports,
        can_delete_reports,
        can_upload_files,
        can_delete_files,
        can_share_files,
        can_manage_team
      )
      VALUES (
        ${userId},
        ${teamId},
        ${permissions.can_view_reports ?? true},
        ${permissions.can_create_reports ?? true},
        ${permissions.can_edit_reports ?? false},
        ${permissions.can_delete_reports ?? false},
        ${permissions.can_upload_files ?? true},
        ${permissions.can_delete_files ?? false},
        ${permissions.can_share_files ?? true},
        ${permissions.can_manage_team ?? false}
      )
      RETURNING *
    `
    return result.rows[0] as UserTeamPermissions
  }
}

