import { sql as vercelSql } from "@vercel/postgres"
import { Pool } from "pg"

// Use standard pg for local development, @vercel/postgres for production
let sql: any
let pool: Pool | null = null

if (process.env.POSTGRES_URL && !process.env.POSTGRES_URL.includes("neon.tech") && !process.env.POSTGRES_URL.includes("vercel-storage.com")) {
  // Local Postgres - use pg
  pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
  })
  
  // Create sql template tag that works like @vercel/postgres
  // @vercel/postgres returns a promise that resolves to { rows: [...] }
  sql = async (strings: TemplateStringsArray, ...values: any[]) => {
    const query = strings.reduce((acc, str, i) => {
      return acc + str + (i < values.length ? `$${i + 1}` : "")
    }, "")
    
    const result = await pool!.query(query, values)
    return { rows: result.rows }
  }
} else {
  // Vercel/Neon Postgres - use @vercel/postgres
  sql = vercelSql
}

export { sql }

// Database initialization should be done manually via SQL client or Vercel dashboard
// The schema.sql file contains the SQL statements needed
export async function initDatabase() {
  // This should be run manually using psql or Vercel dashboard SQL editor
  // Run: psql $POSTGRES_URL -f lib/db/schema.sql
  console.warn("Database initialization should be done manually. See README.md for instructions.")
}
