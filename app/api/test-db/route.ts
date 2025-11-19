import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const result = await sql`SELECT email, name FROM users LIMIT 5`
    return NextResponse.json({
      success: true,
      users: result.rows,
      message: "Database connection successful",
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
        details: error,
      },
      { status: 500 }
    )
  }
}

