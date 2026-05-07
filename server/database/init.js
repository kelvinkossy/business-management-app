import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'business.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Read and execute schema
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

console.log('Database initialized successfully');

export default db;
