import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database', 'business.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

console.log('Running migration for manager role...');

// Update existing 'user' roles to 'manager'
db.run(`UPDATE users SET role = 'manager' WHERE role = 'user'`, (err) => {
  if (err) {
    console.error('Error updating user roles:', err);
  } else {
    console.log('Updated existing user roles to manager');
  }
});

// Check if the constraint needs to be updated
db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'", [], (err, rows) => {
  if (err) {
    console.error('Error checking table schema:', err);
    process.exit(1);
  }

  if (rows.length > 0) {
    const currentSchema = rows[0].sql;
    console.log('Current users table schema:', currentSchema);
    
    // The schema has been updated in schema.sql, but SQLite doesn't support ALTER CONSTRAINT
    // We'll rely on the application to validate roles
    console.log('Note: Role validation will be handled in the application layer');
  }
});

console.log('Migration completed successfully');
db.close();
