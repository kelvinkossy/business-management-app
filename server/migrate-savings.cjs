const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database', 'business.db'));

console.log('Running migration for savings tables...');

// Create savings table
db.exec(`
  CREATE TABLE IF NOT EXISTS savings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    percentage REAL DEFAULT 0,
    deduct_from TEXT DEFAULT 'total' CHECK(deduct_from IN ('total', 'subtotal')),
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME
  );
`);

// Create savings transactions table
db.exec(`
  CREATE TABLE IF NOT EXISTS savings_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    savings_id INTEGER NOT NULL,
    sale_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (savings_id) REFERENCES savings(id),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
  );
`);

console.log('Savings tables created successfully');
db.close();
