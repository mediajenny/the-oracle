#!/bin/bash

# Update admin user password
# Usage: PGPASSWORD=password ./scripts/update-admin-password.sh [db_name] [host] [port] [user]

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

# Generate bcrypt hash for 'password123'
echo "Generating password hash..."
HASH=$(node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('password123', 10).then(h => console.log(h))")

echo "Updating admin user password..."

# Update admin user password
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $DB_NAME <<EOF
UPDATE users 
SET password_hash = '$HASH'
WHERE email = 'admin@example.com';
EOF

echo "✅ Admin password updated!"
echo ""
echo "You can now log in with:"
echo "  Email: admin@example.com"
echo "  Password: password123"

