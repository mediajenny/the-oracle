#!/bin/bash

# Complete database initialization for local development
# This script creates the database, runs the schema, and seeds test users
#
# Usage:
#   PGPASSWORD=yourpassword ./scripts/init-local-db.sh [db_name] [host] [port] [user]
#   Or: ./scripts/init-local-db.sh the_oracle localhost 5432 postgres
#       (will prompt for password if PGPASSWORD not set)

set -e

DB_NAME=${1:-"the_oracle"}
PG_HOST=${2:-"localhost"}
PG_PORT=${3:-"5432"}
PG_USER=${4:-"postgres"}

# Check if password is set, if not prompt
if [ -z "$PGPASSWORD" ]; then
  echo -n "Enter PostgreSQL password for user '$PG_USER': "
  read -s PGPASSWORD
  echo ""
  export PGPASSWORD
fi

echo "=========================================="
echo "Initializing The Oracle Database"
echo "=========================================="
echo "Database: $DB_NAME"
echo "Host: $PG_HOST:$PG_PORT"
echo "User: $PG_USER"
echo ""

# Export password for psql (use PGPASSWORD that was set or prompted)
export PGPASSWORD

# Step 1: Create database
echo "Step 1: Creating database..."
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d postgres -c "CREATE DATABASE $DB_NAME"
echo "✓ Database '$DB_NAME' ready"
echo ""

# Step 2: Run schema
echo "Step 2: Running schema..."
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $DB_NAME -f lib/db/schema.sql
echo "✓ Schema applied"
echo ""

# Step 2.5: Apply any schema updates (idempotent - safe to run on existing databases)
echo "Step 2.5: Applying schema updates..."
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $DB_NAME -f lib/db/schema-updates.sql 2>&1 | grep -v "already exists" | grep -v "does not exist" || true
echo "✓ Schema updates applied"
echo ""

# Step 3: Seed users (using psql script for local Postgres)
echo "Step 3: Seeding test users..."
if command -v node &> /dev/null && command -v psql &> /dev/null; then
  ./scripts/seed-users-psql.sh $DB_NAME $PG_HOST $PG_PORT $PG_USER
else
  echo "⚠ Node.js or psql not found. Skipping user seeding."
  echo "  You can create users via the /api/users endpoint or run:"
  echo "  PGPASSWORD=$PGPASSWORD ./scripts/seed-users-psql.sh $DB_NAME $PG_HOST $PG_PORT $PG_USER"
fi

echo ""
echo "=========================================="
echo "✅ Database initialization complete!"
echo "=========================================="
echo ""
echo "Connection string for .env:"
echo "POSTGRES_URL=postgresql://$PG_USER:$PGPASSWORD@$PG_HOST:$PG_PORT/$DB_NAME"
echo ""

