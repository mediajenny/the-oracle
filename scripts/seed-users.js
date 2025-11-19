#!/usr/bin/env node

/**
 * Seed users script
 * Creates test users with proper bcrypt password hashes
 * Usage: POSTGRES_URL=postgresql://... node scripts/seed-users.js
 */

const bcrypt = require('bcryptjs');
const { sql } = require('@vercel/postgres');

async function seedUsers() {
  try {
    if (!process.env.POSTGRES_URL) {
      console.error('Error: POSTGRES_URL environment variable is required');
      console.log('Usage: POSTGRES_URL=postgresql://user:pass@host:port/db node scripts/seed-users.js');
      process.exit(1);
    }

    console.log('Seeding users...');

    // Hash password 'password123'
    const passwordHash = await bcrypt.hash('password123', 10);

    // Create test team
    await sql`
      INSERT INTO teams (id, name) 
      VALUES ('00000000-0000-0000-0000-000000000001', 'Test Team')
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('✓ Created test team');

    // Create admin user
    await sql`
      INSERT INTO users (id, email, password_hash, name, team_id)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'admin@example.com',
        ${passwordHash},
        'Admin User',
        '00000000-0000-0000-0000-000000000001'
      )
      ON CONFLICT (email) DO NOTHING
    `;
    console.log('✓ Created admin@example.com (password: password123)');

    // Create regular user
    await sql`
      INSERT INTO users (id, email, password_hash, name, team_id)
      VALUES (
        '00000000-0000-0000-0000-000000000002',
        'user@example.com',
        ${passwordHash},
        'Test User',
        '00000000-0000-0000-0000-000000000001'
      )
      ON CONFLICT (email) DO NOTHING
    `;
    console.log('✓ Created user@example.com (password: password123)');

    console.log('\n✅ Users seeded successfully!');
    console.log('\nYou can now log in with:');
    console.log('  Email: admin@example.com');
    console.log('  Password: password123');
    console.log('\nOr:');
    console.log('  Email: user@example.com');
    console.log('  Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();

