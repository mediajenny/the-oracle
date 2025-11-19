-- Seed users for The Oracle
-- Run this after initializing the database
-- Usage: psql -h localhost -U postgres -d the_oracle -f scripts/seed-users.sql

-- Create a test team
INSERT INTO teams (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Team')
ON CONFLICT (id) DO NOTHING;

-- Create test users (password is 'password123' hashed with bcrypt)
-- You can change these passwords or create new users via the /api/users endpoint

-- User 1: admin@example.com / password123
INSERT INTO users (id, email, password_hash, name, team_id)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@example.com',
  '$2a$10$rOzJqZqZqZqZqZqZqZqZqOZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZ', -- This is a placeholder, will be updated below
  'Admin User',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (email) DO NOTHING;

-- User 2: user@example.com / password123
INSERT INTO users (id, email, password_hash, name, team_id)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'user@example.com',
  '$2a$10$rOzJqZqZqZqZqZqZqZqZqOZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZ', -- This is a placeholder, will be updated below
  'Test User',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (email) DO NOTHING;

-- Note: The password hashes above are placeholders. 
-- You should use the /api/users endpoint to create users with proper bcrypt hashes,
-- or use a tool like bcrypt-cli to generate proper hashes for 'password123'

