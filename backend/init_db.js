import 'dotenv/config';
import mysqlService from './utils/mysqlClient.js';
import { seedCapexAndCollection } from './seed_data.js';

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
      business_groups JSON NULL,
      businesses JSON NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('[DB Init] Users table ready.');

  // 2. Seed default admin if table is empty
  const [adminCount] = await mysqlService.executeQuery("SELECT count(*) as c FROM users WHERE role = 'admin'");
  if (adminCount.c === 0) {
    const defaultAdminEmail = 'admin@finance360.local';
    await mysqlService.executeQuery(
      `INSERT INTO users (_id, email, name, role, business_groups, businesses)
       VALUES (?, ?, ?, 'admin', '[]', '[]')
       ON DUPLICATE KEY UPDATE role = 'admin'`,
      ['usr_admin_default', defaultAdminEmail, 'System Admin']
    );
    console.log(`[DB Init] Default admin user initialized: ${defaultAdminEmail}`);
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
