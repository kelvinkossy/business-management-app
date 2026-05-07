import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database', 'business.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Admin credentials
const adminEmail = 'kelvinkossy@gmail.com';
const adminPassword = 'Kechi0302';
const adminName = 'Admin User';

// Check if admin already exists
const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);

if (existingAdmin) {
  console.log('Admin user already exists. Updating password...');
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  // Update the password
  db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hashedPassword, adminEmail);
  console.log('Admin password updated successfully');
} else {
  console.log('Creating new admin user...');
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  // Insert the admin user
  const result = db.prepare(
    'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)'
  ).run(adminEmail, hashedPassword, adminName, 'admin');
  
  console.log('Admin user created successfully');
  console.log(`User ID: ${result.lastInsertRowid}`);
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
}

db.close();
