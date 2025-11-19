#!/bin/bash

# Apply schema updates for permissions system
# Usage: PGPASSWORD=password ./scripts/apply-schema-updates.sh [db_name] [host] [port] [user]

set -e

DB_NAME=${1:-"the_oracle"}
PG_HOST=${2:-"localhost"}
PG_PORT=${3:-"5432"}
PG_USER=${4:-"geist"}

if [ -z "$PGPASSWORD" ]; then
  echo -n "Enter PostgreSQL password for user '$PG_USER': "
  read -s PGPASSWORD
  echo ""
  export PGPASSWORD
fi

echo "Applying schema updates..."

psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $DB_NAME -f lib/db/schema-updates.sql

echo "✅ Schema updates applied successfully!"
echo ""
echo "Note: Existing users will have role='member' by default."
echo "Update admin users manually:"
echo "  UPDATE users SET role='admin' WHERE email LIKE '%admin%';"

