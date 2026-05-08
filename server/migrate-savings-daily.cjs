const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database', 'business.db'));

console.log('Running migration for daily savings deduction...');

// Add deduction_frequency column to savings table
try {
  db.prepare("ALTER TABLE savings ADD COLUMN deduction_frequency TEXT DEFAULT 'per_sale' CHECK(deduction_frequency IN ('per_sale', 'daily'))").run();
  console.log('Added deduction_frequency column to savings table');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('deduction_frequency column already exists');
  } else {
    console.error('Error adding deduction_frequency column:', error);
  }
}

// Update savings_transactions table to allow NULL sale_id and add transaction_type
try {
  // First, add transaction_type column
  db.prepare("ALTER TABLE savings_transactions ADD COLUMN transaction_type TEXT DEFAULT 'sale' CHECK(transaction_type IN ('sale', 'daily'))").run();
  console.log('Added transaction_type column to savings_transactions table');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('transaction_type column already exists');
  } else {
    console.error('Error adding transaction_type column:', error);
  }
}

// SQLite doesn't support ALTER COLUMN to make sale_id nullable, so we need to recreate the table
try {
  const tableInfo = db.prepare("PRAGMA table_info(savings_transactions)").all();
  const hasSaleId = tableInfo.some(col => col.name === 'sale_id');
  
  if (hasSaleId) {
    // Check if sale_id is already nullable
    const saleIdColumn = tableInfo.find(col => col.name === 'sale_id');
    if (saleIdColumn.notnull === 1) {
      console.log('Making sale_id nullable in savings_transactions table...');
      
      // Create new table with nullable sale_id
      db.exec(`
        CREATE TABLE IF NOT EXISTS savings_transactions_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          savings_id INTEGER NOT NULL,
          sale_id INTEGER,
          amount REAL NOT NULL,
          transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          transaction_type TEXT DEFAULT 'sale' CHECK(transaction_type IN ('sale', 'daily')),
          FOREIGN KEY (savings_id) REFERENCES savings(id),
          FOREIGN KEY (sale_id) REFERENCES sales(id)
        )
      `);
      
      // Copy data from old table to new table
      db.exec(`
        INSERT INTO savings_transactions_new (id, savings_id, sale_id, amount, transaction_date)
        SELECT id, savings_id, sale_id, amount, transaction_date FROM savings_transactions
      `);
      
      // Drop old table
      db.exec('DROP TABLE savings_transactions');
      
      // Rename new table to old table name
      db.exec('ALTER TABLE savings_transactions_new RENAME TO savings_transactions');
      
      console.log('Successfully made sale_id nullable in savings_transactions table');
    } else {
      console.log('sale_id is already nullable');
    }
  }
} catch (error) {
  console.error('Error updating savings_transactions table:', error);
}

console.log('Migration completed successfully');
db.close();
