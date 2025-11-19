#!/bin/bash

# Database initialization script for The Oracle
# Usage: ./scripts/init-db.sh [database_name] [postgres_host] [postgres_port] [postgres_user]

set -e

DB_NAME=${1:-"the_oracle"}
PG_HOST=${2:-"localhost"}
PG_PORT=${3:-"5432"}
PG_USER=${4:-"postgres"}

echo "Creating database: $DB_NAME"
echo "Host: $PG_HOST:$PG_PORT"
echo "User: $PG_USER"

# Create database if it doesn't exist
PGPASSWORD=${PGPASSWORD:-postgres} psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
PGPASSWORD=${PGPASSWORD:-postgres} psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d postgres -c "CREATE DATABASE $DB_NAME"

echo "Database '$DB_NAME' created or already exists"

# Run schema
echo "Running schema..."
PGPASSWORD=${PGPASSWORD:-postgres} psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $DB_NAME -f lib/db/schema.sql

# Apply schema updates (idempotent - safe to run on existing databases)
echo "Applying schema updates..."
PGPASSWORD=${PGPASSWORD:-postgres} psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $DB_NAME -f lib/db/schema-updates.sql 2>&1 | grep -v "already exists" | grep -v "does not exist" || true

echo "Database initialized successfully!"

