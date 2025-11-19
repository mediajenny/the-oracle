/**
 * Fix admin user password
 * This script ensures admin@example.com exists with the correct password hash
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file
config({ path: resolve(process.cwd(), '.env') });

import bcrypt from 'bcryptjs';
import { sql } from '../lib/db';

async function fixAdminPassword() {
  try {
    console.log('Checking admin user...');

    // Check if user exists
    const checkResult = await sql`
      SELECT id, email, password_hash FROM users WHERE email = 'admin@example.com'
    `;

    if (checkResult.rows.length === 0) {
      console.log('Admin user does not exist. Creating...');
      
      // Generate password hash
      const passwordHash = await bcrypt.hash('password123', 10);
      
      // Create admin user
      await sql`
        INSERT INTO users (email, password_hash, name)
        VALUES (${'admin@example.com'}, ${passwordHash}, ${'Admin User'})
      `;
      
      console.log('✅ Admin user created!');
    } else {
      console.log('Admin user exists. Updating password...');
      
      // Generate new password hash
      const passwordHash = await bcrypt.hash('password123', 10);
      
      // Update password
      await sql`
        UPDATE users SET password_hash = ${passwordHash} WHERE email = ${'admin@example.com'}
      `;
      
      console.log('✅ Admin password updated!');
    }

    // Verify the password works
    const verifyResult = await sql`
      SELECT password_hash FROM users WHERE email = ${'admin@example.com'}
    `;
    
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

  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixAdminPassword();

