import { sql } from "./index"
import { Pool } from "pg"

/**
 * Execute a dynamic SQL query (for updates with variable fields)
 * Works with both local pg and @vercel/postgres
 */
export async function executeDynamicQuery(
  query: string,
  values: any[]
): Promise<{ rows: any[] }> {
  // Check if we're using local Postgres
  if (
    process.env.POSTGRES_URL &&
    !process.env.POSTGRES_URL.includes("neon.tech") &&
    !process.env.POSTGRES_URL.includes("vercel-storage.com")
  ) {
    // Local Postgres - use pg Pool
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
    })

    try {
      const result = await pool.query(query, values)
      return { rows: result.rows }
    } finally {
      await pool.end()
    }
  } else {
    // Vercel/Neon Postgres - use @vercel/postgres with unsafe
    const { sql: vercelSql } = await import("@vercel/postgres")
    // For dynamic queries, we need to use unsafe
    // Note: This is less safe but necessary for dynamic updates
    const result = await (vercelSql as any).unsafe(query, values)
    return { rows: result.rows || result }
  }
}

