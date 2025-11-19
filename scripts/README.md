# Database Setup Scripts

Scripts for initializing and seeding the The Oracle database.

## Quick Start

### Option 1: Using the all-in-one script

```bash
# Set your Postgres password
export PGPASSWORD=yourpassword

# Run initialization (creates DB, applies schema, seeds users)
./scripts/init-local-db.sh the_oracle localhost 5432 postgres
```

Or if your password is already in the environment:
```bash
PGPASSWORD=yourpassword ./scripts/init-local-db.sh
```

### Option 2: Step by step

1. **Create database and apply schema:**
```bash
PGPASSWORD=yourpassword psql -h localhost -U postgres -d postgres -c "CREATE DATABASE the_oracle"
PGPASSWORD=yourpassword psql -h localhost -U postgres -d the_oracle -f lib/db/schema.sql
```

2. **Seed users:**
```bash
export POSTGRES_URL="postgresql://postgres:yourpassword@localhost:5432/the_oracle"
npm run db:seed
```

## Default Test Users

After seeding, you can log in with:

- **Email:** `admin@example.com`
- **Password:** `password123`

- **Email:** `user@example.com`
- **Password:** `password123`

Both users are part of the "Test Team".

## Environment Variables

After initialization, add to your `.env` file:

```env
POSTGRES_URL=postgresql://postgres:yourpassword@localhost:5432/the_oracle
POSTGRES_PRISMA_URL=postgresql://postgres:yourpassword@localhost:5432/the_oracle
POSTGRES_URL_NON_POOLING=postgresql://postgres:yourpassword@localhost:5432/the_oracle
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
BLOB_READ_WRITE_TOKEN=your-blob-token-here
```

## Docker Postgres Example

If using Docker:

```bash
# Start Postgres container
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres

# Initialize database
PGPASSWORD=postgres ./scripts/init-local-db.sh the_oracle localhost 5432 postgres
```

