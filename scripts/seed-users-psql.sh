#!/bin/bash

# Seed users script using psql (works with local Postgres)
# Creates test users with bcrypt password hashes
# Usage: PGPASSWORD=password ./scripts/seed-users-psql.sh [db_name] [host] [port] [user]

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
# Using Node.js to generate the hash properly
HASH=$(node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('password123', 10).then(h => console.log(h))")

echo "Seeding users..."

# Create test team
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $DB_NAME <<EOF
INSERT INTO teams (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Team')
ON CONFLICT (id) DO NOTHING;
EOF

# Create admin user
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $DB_NAME <<EOF
INSERT INTO users (id, email, password_hash, name, team_id)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@example.com',
  '$HASH',
  'Admin User',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (email) DO NOTHING;
EOF

# Create regular user
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $DB_NAME <<EOF
INSERT INTO users (id, email, password_hash, name, team_id)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'user@example.com',
  '$HASH',
  'Test User',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (email) DO NOTHING;
EOF

echo "✅ Users seeded successfully!"
echo ""
echo "You can now log in with:"
echo "  Email: admin@example.com"
echo "  Password: password123"
echo ""
echo "Or:"
echo "  Email: user@example.com"
echo "  Password: password123"

