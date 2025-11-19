import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({
        error: "Unauthorized",
        session: null
      }, { status: 401 })
    }

    // Get user details from database
    let userResult
    try {
      userResult = await sql`
        SELECT id, email, role FROM users WHERE id = ${session.user.id}
      `
    } catch (error: any) {
      return NextResponse.json({
        error: "Database query failed",
        details: error.message,
        session: {
          userId: session.user.id,
          email: session.user.email
        }
      }, { status: 500 })
    }

    if (userResult.rows.length === 0) {
      return NextResponse.json({
        error: "User not found in database",
        session: {
          userId: session.user.id,
          email: session.user.email
        }
      }, { status: 404 })
    }

    const user = userResult.rows[0]
    const adminCheck = await isAdmin(session.user.id)

    return NextResponse.json({
      isAdmin: adminCheck,
      session: {
        userId: session.user.id,
        email: session.user.email
      },
      database: {
        userId: user.id,
        email: user.email,
        role: user.role || null
      },
      emailCheck: {
        emailLower: (user.email || "").toLowerCase(),
        includesAdmin: (user.email || "").toLowerCase().includes("admin"),
        equalsAdminExample: user.email === "admin@example.com" || (user.email || "").toLowerCase() === "admin@example.com"
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: "Debug check failed",
      details: error.message
    }, { status: 500 })
  }
}
