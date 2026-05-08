const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database', 'business.db'));

console.log('Running migration for expense categories...');

// Create expense_categories table
db.exec(`
  CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Insert default categories
const defaultCategories = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Travel', 'Fuel', 'Other'];

const insertCategory = db.prepare('INSERT OR IGNORE INTO expense_categories (name) VALUES (?)');

defaultCategories.forEach(category => {
  insertCategory.run(category);
});

console.log('Expense categories table created and default categories inserted');
db.close();
