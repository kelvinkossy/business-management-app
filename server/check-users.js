import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database', 'business.db'));

const users = db.prepare('SELECT * FROM users').all();
console.log(`Total users: ${users.length}`);
console.log('Users:', users);

db.close();
