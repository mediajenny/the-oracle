import { sql } from "@vercel/postgres"

// Database initialization should be done manually via SQL client or Vercel dashboard
// The schema.sql file contains the SQL statements needed
// This function is kept for reference but should be run server-side only
export async function initDatabase() {
  // This should be run manually using psql or Vercel dashboard SQL editor
  // Run: psql $POSTGRES_URL -f lib/db/schema.sql
  console.warn("Database initialization should be done manually. See README.md for instructions.")
}

export { sql } from "@vercel/postgres"

