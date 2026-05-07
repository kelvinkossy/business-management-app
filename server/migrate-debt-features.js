import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database', 'business.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Running migration for debt book features...');

// Add status column to customer_debts table
try {
  db.exec(`
    ALTER TABLE customer_debts ADD COLUMN status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'partial'));
  `);
  console.log('Added status column to customer_debts table');
} catch (error) {
  console.log('Status column may already exist in customer_debts:', error.message);
}

// Create supplier payments table
db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL,
    purchase_id INTEGER,
    type TEXT NOT NULL CHECK(type IN ('payment', 'refund', 'credit')),
    amount REAL NOT NULL,
    description TEXT,
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL,
    balance_after REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'partial')),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);
console.log('Created supplier_payments table');

// Create indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_customer_debts_customer ON customer_debts(customer_id);
  CREATE INDEX IF NOT EXISTS idx_customer_debts_status ON customer_debts(status);
  CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);
  CREATE INDEX IF NOT EXISTS idx_supplier_payments_status ON supplier_payments(status);
`);
console.log('Created indexes');

console.log('Migration completed successfully');

db.close();
