import 'dotenv/config';
import mysqlService from './utils/mysqlClient.js';
import { seedCapexAndCollection } from './seed_data.js';

import bcrypt from 'bcryptjs';

export async function initDatabase() {
  console.log('[DB Init] Initializing MySQL finance_data database...');

  // 1. Create users table
  await mysqlService.executeQuery(`
    CREATE TABLE IF NOT EXISTS users (
      _id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(255) NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) DEFAULT '',
      role ENUM('admin', 'user') DEFAULT 'user',
      status ENUM('active', 'pending_setup', 'disabled') DEFAULT 'active',
      must_change_password TINYINT(1) DEFAULT 0,
      business_groups JSON NULL,
      businesses JSON NULL,
      password_hash VARCHAR(255) NULL,
      temp_password_expires_at DATETIME NULL,
      reset_token_hash VARCHAR(255) NULL,
      reset_token_expires_at DATETIME NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Ensure columns exist on pre-existing users table
  try {
    const cols = await mysqlService.executeQuery(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    `);
    const existingCols = new Set((cols || []).map((c) => (c.COLUMN_NAME || c.column_name || '').toLowerCase()));
    if (!existingCols.has('status')) {
      await mysqlService.executeQuery("ALTER TABLE users ADD COLUMN status ENUM('active', 'pending_setup', 'disabled') DEFAULT 'active' AFTER role");
    }
    if (!existingCols.has('must_change_password')) {
      await mysqlService.executeQuery("ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) DEFAULT 0 AFTER status");
    }
    if (!existingCols.has('temp_password_expires_at')) {
      await mysqlService.executeQuery("ALTER TABLE users ADD COLUMN temp_password_expires_at DATETIME NULL AFTER password_hash");
    }
    if (!existingCols.has('password_hash')) {
      await mysqlService.executeQuery('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER businesses');
    }
    if (!existingCols.has('reset_token_hash')) {
      await mysqlService.executeQuery('ALTER TABLE users ADD COLUMN reset_token_hash VARCHAR(255) NULL AFTER password_hash');
    }
    if (!existingCols.has('reset_token_expires_at')) {
      await mysqlService.executeQuery('ALTER TABLE users ADD COLUMN reset_token_expires_at DATETIME NULL AFTER reset_token_hash');
    }

    // Default admin is always active and doesn't require password change
    await mysqlService.executeQuery("UPDATE users SET status = 'active', must_change_password = 0 WHERE email = 'admin@finance360.local'");
  } catch (colErr) {
    console.warn('[DB Init] Column check notice:', colErr.message);
  }
  console.log('[DB Init] Users table ready.');

  // 2. Seed default admin if table is empty or missing password
  const defaultAdminEmail = 'admin@finance360.local';
  const defaultAdminPass = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@Finance360';
  const hashedAdminPass = await bcrypt.hash(defaultAdminPass, 10);

  const existingAdmins = await mysqlService.executeQuery(
    "SELECT _id, email, password_hash FROM users WHERE email = ? LIMIT 1",
    [defaultAdminEmail]
  );

  if (!existingAdmins || existingAdmins.length === 0) {
    await mysqlService.executeQuery(
      `INSERT INTO users (_id, email, name, role, business_groups, businesses, password_hash)
       VALUES (?, ?, ?, 'admin', '[]', '[]', ?)
       ON DUPLICATE KEY UPDATE role = 'admin', password_hash = VALUES(password_hash)`,
      ['usr_admin_default', defaultAdminEmail, 'System Admin', hashedAdminPass]
    );
    console.log(`[DB Init] Default admin user initialized: ${defaultAdminEmail}`);
  } else if (!existingAdmins[0].password_hash) {
    await mysqlService.executeQuery(
      'UPDATE users SET password_hash = ? WHERE _id = ?',
      [hashedAdminPass, existingAdmins[0]._id]
    );
    console.log(`[DB Init] Seeded password hash for default admin: ${defaultAdminEmail}`);
  }

  // Also verify any other admin accounts have a password
  const adminsWithoutPass = await mysqlService.executeQuery(
    "SELECT _id FROM users WHERE role = 'admin' AND (password_hash IS NULL OR password_hash = '')"
  );
  for (const adm of adminsWithoutPass || []) {
    await mysqlService.executeQuery(
      'UPDATE users SET password_hash = ? WHERE _id = ?',
      [hashedAdminPass, adm._id]
    );
    console.log(`[DB Init] Seeded password hash for admin user ID: ${adm._id}`);
  }

  // 3. Ensure capex and collection tables are populated
  await seedCapexAndCollection();

  console.log('[DB Init] Database initialization complete.');
}

if (process.argv[1] && process.argv[1].endsWith('init_db.js')) {
  initDatabase()
    .then(async () => {
      await mysqlService.close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[DB Init Error]', err);
      await mysqlService.close();
      process.exit(1);
    });
}
