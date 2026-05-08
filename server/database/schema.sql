-- Database Schema for Business Management App

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'user', 'staff')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products table (Inventory)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  unit_price REAL NOT NULL,
  cost_price REAL NOT NULL,
  supplier_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  user_id INTEGER NOT NULL,
  sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  subtotal REAL NOT NULL,
  tax REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT,
  notes TEXT,
  is_manual INTEGER DEFAULT 0,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sale items table
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total REAL NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Manual sale items (for sales not tied to inventory)
CREATE TABLE IF NOT EXISTS manual_sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total REAL NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  expense_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER NOT NULL,
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Expense Categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default expense categories
INSERT OR IGNORE INTO expense_categories (name) VALUES
('Rent'), ('Utilities'), ('Salaries'), ('Supplies'), ('Marketing'), ('Travel'), ('Fuel'), ('Other');

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  due_date DATETIME,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue')),
  FOREIGN KEY (sale_id) REFERENCES sales(id)
);

-- Customer debts/payments table
CREATE TABLE IF NOT EXISTS customer_debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  sale_id INTEGER,
  type TEXT NOT NULL CHECK(type IN ('debt', 'payment', 'credit')),
  amount REAL NOT NULL,
  description TEXT,
  transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER NOT NULL,
  balance_after REAL NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'partial')),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Supplier payments table
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

-- Business Settings Table
CREATE TABLE IF NOT EXISTS business_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name TEXT NOT NULL DEFAULT 'My Business',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  tax_rate REAL DEFAULT 0,
  currency_symbol TEXT DEFAULT '₦',
  invoice_prefix TEXT DEFAULT 'INV',
  receipt_prefix TEXT DEFAULT 'REC',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Staff Allocations table (for allocating inventory to staff)
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

-- Staff Sales table (for sales made by staff from allocated stock)
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

-- Savings table (for daily savings auto-deduction)
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

-- Savings transactions table (to track savings deductions)
CREATE TABLE IF NOT EXISTS savings_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  savings_id INTEGER NOT NULL,
  sale_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (savings_id) REFERENCES savings(id),
  FOREIGN KEY (sale_id) REFERENCES sales(id)
);

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (email, password, name, role)
VALUES ('admin@business.com', '$2a$10$XQwZzWzZzZzZzZzZzZzO', 'Admin User', 'admin');

-- Insert default business settings
INSERT INTO business_settings (business_name, currency_symbol) 
SELECT 'My Business', '₦'
WHERE NOT EXISTS (SELECT 1 FROM business_settings);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (email, password, name, role)
VALUES ('admin@business.com', '$2a$10$XQwZzWzZzZzZzZzZzZzZzO', 'Admin User', 'admin');
