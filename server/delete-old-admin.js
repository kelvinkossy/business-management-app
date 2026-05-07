import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database', 'business.db'));

// Delete the old admin account
const result = db.prepare('DELETE FROM users WHERE email = ?').run('admin@business.com');

console.log(`Deleted ${result.changes} user(s) with email admin@business.com`);

db.close();
