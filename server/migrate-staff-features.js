import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database', 'business.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Running migration for staff management features...');

// Update users table to include 'staff' role
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user', 'staff')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    INSERT INTO users_new SELECT * FROM users;
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
  `);
  console.log('Updated users table to include staff role');
} catch (error) {
  console.log('Users table may already have staff role:', error.message);
}

// Create staff allocations table
db.exec(`
  CREATE TABLE IF NOT EXISTS staff_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity_allocated INTEGER NOT NULL,
    quantity_sold INTEGER DEFAULT 0,
    allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    allocated_by INTEGER NOT NULL,
    notes TEXT,
    FOREIGN KEY (staff_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (allocated_by) REFERENCES users(id)
  );
`);
console.log('Created staff_allocations table');

// Create staff sales table
db.exec(`
  CREATE TABLE IF NOT EXISTS staff_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    allocation_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity_sold INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total REAL NOT NULL,
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (staff_id) REFERENCES users(id),
    FOREIGN KEY (allocation_id) REFERENCES staff_allocations(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);
console.log('Created staff_sales table');

// Create indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_staff_allocations_staff ON staff_allocations(staff_id);
  CREATE INDEX IF NOT EXISTS idx_staff_allocations_product ON staff_allocations(product_id);
  CREATE INDEX IF NOT EXISTS idx_staff_sales_staff ON staff_sales(staff_id);
  CREATE INDEX IF NOT EXISTS idx_staff_sales_allocation ON staff_sales(allocation_id);
`);
console.log('Created indexes');

console.log('Migration completed successfully');

db.close();
