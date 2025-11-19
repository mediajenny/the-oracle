#!/usr/bin/env node

/**
 * Fix admin user password
 * This script ensures admin@example.com exists with the correct password hash
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function fixAdminPassword() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
  });

  try {
    console.log('Checking admin user...');

    // Check if user exists
    const checkResult = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      ['admin@example.com']
    );

    if (checkResult.rows.length === 0) {
      console.log('Admin user does not exist. Creating...');
      
      // Generate password hash
      const passwordHash = await bcrypt.hash('password123', 10);
      
      // Create admin user
      await pool.query(`
        INSERT INTO users (email, password_hash, name)
        VALUES ($1, $2, $3)
      `, ['admin@example.com', passwordHash, 'Admin User']);
      
      console.log('✅ Admin user created!');
    } else {
      console.log('Admin user exists. Updating password...');
      
      // Generate new password hash
      const passwordHash = await bcrypt.hash('password123', 10);
      
      // Update password
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [passwordHash, 'admin@example.com']
      );
      
      console.log('✅ Admin password updated!');
    }

    // Verify the password works
    const verifyResult = await pool.query(
      'SELECT password_hash FROM users WHERE email = $1',
      ['admin@example.com']
    );
    
    if (verifyResult.rows.length > 0) {
      const isValid = await bcrypt.compare('password123', verifyResult.rows[0].password_hash);
      if (isValid) {
        console.log('✅ Password verification successful!');
        console.log('\nYou can now login with:');
        console.log('  Email: admin@example.com');
        console.log('  Password: password123');
      } else {
        console.log('❌ Password verification failed!');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAdminPassword();

