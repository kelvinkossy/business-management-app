const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv/config');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

// Helper function to log activities
const logActivity = (userId, action, entityType, entityId, details, ipAddress) => {
  try {
    db.prepare(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(userId, action, entityType, entityId, JSON.stringify(details), ipAddress);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// Ensure database directory exists
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('Database directory created');
}

// Initialize database
const dbPath = path.join(dbDir, 'business.db');
const db = new Database(dbPath);
console.log('Database initialized successfully at:', dbPath);

// Initialize database schema
const schemaPath = path.join(__dirname, 'database', 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  console.log('Database schema initialized');
} else {
  console.log('Schema file not found at:', schemaPath);
}

// Auto-register admin users if not exists
const ensureAdminUser = () => {
  const adminUsers = [
    {
      email: 'kelvinkossy@gmail.com',
      password: 'Kechi0302',
      name: 'Admin User'
    },
    {
      email: 'villagekitchen@gmail.com',
      password: 'villagekitchenandbarcalabar',
      name: 'Village Kitchen Admin'
    }
  ];

  adminUsers.forEach(admin => {
    const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(admin.email);
    if (!existingAdmin) {
      const hashedPassword = bcrypt.hashSync(admin.password, 10);
      db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(
        admin.email, hashedPassword, admin.name, 'admin'
      );
      console.log(`Admin user auto-registered: ${admin.email}`);
    }
  });
};

// Run after schema initialization
ensureAdminUser();

// Serve static files from React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role = 'user' } = req.body;
    
    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = db.prepare(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)'
    ).run(email, hashedPassword, name, role);

    res.status(201).json({ message: 'User created successfully', userId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rate limiting for login attempts
const loginAttempts = new Map(); // Store login attempts: { email: { count: number, lastAttempt: timestamp } }

const checkRateLimit = (email) => {
  const now = Date.now();
  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
  
  // Reset if 15 minutes have passed since last attempt
  if (now - attempts.lastAttempt > 15 * 60 * 1000) {
    attempts.count = 0;
  }
  
  attempts.lastAttempt = now;
  
  // Allow max 5 attempts per 15 minutes
  if (attempts.count >= 5) {
    return false;
  }
  
  attempts.count++;
  loginAttempts.set(email, attempts);
  return true;
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for email:', email);
    
    // Check rate limit
    if (!checkRateLimit(email)) {
      console.log('Rate limit exceeded for:', email);
      return res.status(429).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
    }
    
    // Validate email format
    if (!email || !email.includes('@')) {
      console.log('Invalid email format:', email);
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    
    // Validate password
    if (!password || password.length < 1) {
      console.log('Missing password');
      return res.status(400).json({ error: 'Please enter your password' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      console.log('User not found for email:', email);
      // List all users for debugging
      const allUsers = db.prepare('SELECT email, name, role FROM users').all();
      console.log('All users in database:', allUsers);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('User found:', user.email, user.name, user.role);

    // For development, allow default admin with simple check
    // In production, always use bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Clear login attempts on successful login
    loginAttempts.delete(email);

    console.log('Login successful for:', email);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again later.' });
  }
});

// Manual admin user creation endpoint (no authentication required for initial setup)
app.post('/api/setup-admin', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    
    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create admin user
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)'
    ).run(email, hashedPassword, name, 'admin');
    
    console.log('Admin user created manually:', email);
    res.json({ message: 'Admin user created successfully', userId: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// Get all users (admin only)
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, email, name, role, created_at FROM users').all();
  res.json(users);
});

// Products Routes
app.get('/api/products', authenticateToken, (req, res) => {
  const products = db.prepare(`
    SELECT p.*, s.name as supplier_name 
    FROM products p 
    LEFT JOIN suppliers s ON p.supplier_id = s.id
  `).all();
  res.json(products);
});

app.get('/api/products/:id', authenticateToken, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

app.post('/api/products', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, sku, description, category, quantity, unit_price, cost_price, supplier_id } = req.body;
    
    // Disable foreign key checks temporarily to allow NULL supplier_id
    db.prepare('PRAGMA foreign_keys = OFF').run();
    
    const result = db.prepare(
      `INSERT INTO products (name, sku, description, category, quantity, unit_price, cost_price, supplier_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(name, sku, description, category, quantity, unit_price, cost_price, supplier_id || null);
    
    // Re-enable foreign key checks
    db.prepare('PRAGMA foreign_keys = ON').run();
    
    logActivity(req.user.id, 'create', 'product', result.lastInsertRowid, { name, sku, quantity, unit_price }, req.ip);
    
    res.status(201).json({ message: 'Product created', id: result.lastInsertRowid });
  } catch (error) {
    // Ensure foreign key checks are re-enabled even if there's an error
    db.prepare('PRAGMA foreign_keys = ON').run();
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, sku, description, category, quantity, unit_price, cost_price, supplier_id } = req.body;
    db.prepare(
      `UPDATE products 
       SET name = ?, sku = ?, description = ?, category = ?, quantity = ?, 
           unit_price = ?, cost_price = ?, supplier_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(name, sku, description, category, quantity, unit_price, cost_price, supplier_id, req.params.id);
    res.json({ message: 'Product updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ message: 'Product deleted' });
});

// Suppliers Routes
app.get('/api/suppliers', authenticateToken, (req, res) => {
  const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name').all();
  res.json(suppliers);
});

app.post('/api/suppliers', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const result = db.prepare(
      'INSERT INTO suppliers (name, email, phone, address) VALUES (?, ?, ?, ?)'
    ).run(name, email, phone, address);
    res.status(201).json({ message: 'Supplier created', id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/suppliers/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    db.prepare(
      'UPDATE suppliers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?'
    ).run(name, email, phone, address, req.params.id);
    res.json({ message: 'Supplier updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/suppliers/:id', authenticateToken, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Supplier deleted' });
});

// Customers Routes
app.get('/api/customers', authenticateToken, (req, res) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY name').all();
  res.json(customers);
});

app.post('/api/customers', authenticateToken, (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const result = db.prepare(
      'INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)'
    ).run(name, email, phone, address);
    res.status(201).json({ message: 'Customer created', id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/customers/:id', authenticateToken, (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    db.prepare(
      'UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?'
    ).run(name, email, phone, address, req.params.id);
    res.json({ message: 'Customer updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/customers/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Customer deleted' });
});

// Sales Routes
app.get('/api/sales', authenticateToken, (req, res) => {
  const sales = db.prepare(`
    SELECT s.*, c.name as customer_name, u.name as user_name 
    FROM sales s 
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY s.sale_date DESC
  `).all();
  res.json(sales);
});

app.get('/api/sales/:id', authenticateToken, (req, res) => {
  const sale = db.prepare(`
    SELECT s.*, c.name as customer_name, u.name as user_name 
    FROM sales s 
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `).get(req.params.id);
  
  if (!sale) {
    return res.status(404).json({ error: 'Sale not found' });
  }

  const items = db.prepare(`
    SELECT * FROM sale_items WHERE sale_id = ?
  `).all(req.params.id);

  const manualItems = db.prepare(`
    SELECT * FROM manual_sale_items WHERE sale_id = ?
  `).all(req.params.id);

  res.json({ ...sale, items, manualItems });
});

app.post('/api/sales', authenticateToken, (req, res) => {
  try {
    const { customer_id, items, manualItems, subtotal, tax, discount, total, payment_method, notes, is_manual } = req.body;

    const result = db.prepare(
      `INSERT INTO sales (customer_id, user_id, subtotal, tax, discount, total, payment_method, notes, is_manual)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(customer_id, req.user.id, subtotal, tax, discount, total, payment_method, notes, is_manual ? 1 : 0);

    const saleId = result.lastInsertRowid;

    // Insert regular sale items
    if (items && items.length > 0) {
      const insertItem = db.prepare(
        'INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)'
      );

      items.forEach(item => {
        insertItem.run(saleId, item.product_id, item.product_name, item.quantity, item.unit_price, item.total);

        // Update product quantity
        db.prepare(
          'UPDATE products SET quantity = quantity - ? WHERE id = ?'
        ).run(item.quantity, item.product_id);
      });
    }

    // Insert manual sale items (for admin)
    if (manualItems && manualItems.length > 0 && req.user.role === 'admin') {
      const insertManualItem = db.prepare(
        'INSERT INTO manual_sale_items (sale_id, item_name, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)'
      );

      manualItems.forEach(item => {
        insertManualItem.run(saleId, item.item_name, item.quantity, item.unit_price, item.total);
      });
    }

    // Auto-deduct savings from sales (only per_sale savings)
    const perSaleSavings = db.prepare("SELECT * FROM savings WHERE is_active = 1 AND deduction_frequency = 'per_sale'").all();
    const deductFromTotal = total;
    const deductFromSubtotal = subtotal;

    perSaleSavings.forEach(saving => {
      let deductionAmount = 0;

      if (saving.percentage > 0) {
        // Percentage-based deduction
        const baseAmount = saving.deduct_from === 'subtotal' ? deductFromSubtotal : deductFromTotal;
        deductionAmount = baseAmount * (saving.percentage / 100);
      } else {
        // Fixed amount deduction
        deductionAmount = saving.amount;
      }

      // Only deduct if the amount is positive and less than the sale total
      if (deductionAmount > 0 && deductionAmount <= deductFromTotal) {
        db.prepare(
          'INSERT INTO savings_transactions (savings_id, sale_id, amount, transaction_type) VALUES (?, ?, ?, ?)'
        ).run(saving.id, saleId, deductionAmount, 'sale');
      }
    });

    res.status(201).json({ message: 'Sale created', id: saleId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sales/:id', authenticateToken, (req, res) => {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) {
    return res.status(404).json({ error: 'Sale not found' });
  }

  const items = db.prepare(`
    SELECT * FROM sale_items WHERE sale_id = ?
  `).all(req.params.id);

  const manualItems = db.prepare(`
    SELECT * FROM manual_sale_items WHERE sale_id = ?
  `).all(req.params.id);

  res.json({ ...sale, items, manualItems });
});

app.get('/api/expenses', authenticateToken, (req, res) => {
  const expenses = db.prepare(`
    SELECT e.*, u.name as user_name 
    FROM expenses e 
    LEFT JOIN users u ON e.user_id = u.id
    ORDER BY e.expense_date DESC
  `).all();
  res.json(expenses);
});

app.post('/api/expenses', authenticateToken, (req, res) => {
  try {
    const { description, category, amount, expense_date, notes } = req.body;
    const result = db.prepare(
      `INSERT INTO expenses (description, category, amount, expense_date, user_id, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(description, category, amount, expense_date || new Date().toISOString(), req.user.id, notes);
    res.status(201).json({ message: 'Expense created', id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', authenticateToken, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ message: 'Expense deleted' });
});

// Expense Categories Routes
app.get('/api/expense-categories', authenticateToken, (req, res) => {
  const categories = db.prepare('SELECT * FROM expense_categories ORDER BY name').all();
  res.json(categories);
});

app.post('/api/expense-categories', authenticateToken, (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const result = db.prepare('INSERT INTO expense_categories (name) VALUES (?)').run(name);
    res.status(201).json({ message: 'Category created', id: result.lastInsertRowid });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Category already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.delete('/api/expense-categories/:id', authenticateToken, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM expense_categories WHERE id = ?').run(req.params.id);
  res.json({ message: 'Category deleted' });
});

// Savings Routes
app.get('/api/savings', authenticateToken, (req, res) => {
  const savings = db.prepare('SELECT * FROM savings ORDER BY created_at DESC').all();
  res.json(savings);
});

app.post('/api/savings', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, description, amount, percentage, deduct_from, deduction_frequency } = req.body;
    const result = db.prepare(
      'INSERT INTO savings (name, description, amount, percentage, deduct_from, deduction_frequency) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, description, amount, percentage || 0, deduct_from || 'total', deduction_frequency || 'daily');
    res.status(201).json({ message: 'Savings created', id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/savings/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, description, amount, percentage, deduct_from, deduction_frequency } = req.body;
    db.prepare(
      'UPDATE savings SET name = ?, description = ?, amount = ?, percentage = ?, deduct_from = ?, deduction_frequency = ? WHERE id = ?'
    ).run(name, description, amount, percentage || 0, deduct_from || 'total', deduction_frequency || 'daily', req.params.id);
    res.json({ message: 'Savings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/savings/:id/end', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('UPDATE savings SET is_active = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    res.json({ message: 'Savings ended' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/savings/:id', authenticateToken, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM savings WHERE id = ?').run(req.params.id);
  res.json({ message: 'Savings deleted' });
});

// Trigger daily savings deductions (admin only)
app.post('/api/savings/process-daily', authenticateToken, requireAdmin, (req, res) => {
  try {
    const dailySavings = db.prepare("SELECT * FROM savings WHERE is_active = 1 AND deduction_frequency = 'daily'").all();
    const today = new Date().toISOString().split('T')[0];
    
    let totalDeducted = 0;
    
    dailySavings.forEach(saving => {
      // Check if already deducted today
      const existingDeduction = db.prepare(
        `SELECT * FROM savings_transactions 
         WHERE savings_id = ? AND DATE(transaction_date) = ? AND transaction_type = 'daily'`
      ).get(saving.id, today);
      
      if (!existingDeduction) {
        db.prepare(
          'INSERT INTO savings_transactions (savings_id, sale_id, amount, transaction_type) VALUES (?, NULL, ?, ?)'
        ).run(saving.id, saving.amount, 'daily');
        totalDeducted += saving.amount;
      }
    });
    
    res.json({ message: `Processed daily deductions for ${dailySavings.length} savings plans`, totalDeducted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Automatic daily savings deduction (runs every day at midnight)
const processDailySavings = () => {
  try {
    const dailySavings = db.prepare("SELECT * FROM savings WHERE is_active = 1 AND deduction_frequency = 'daily'").all();
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`Processing daily savings for ${dailySavings.length} plans on ${today}`);
    
    dailySavings.forEach(saving => {
      // Check if already deducted today
      const existingDeduction = db.prepare(
        `SELECT * FROM savings_transactions 
         WHERE savings_id = ? AND DATE(transaction_date) = ? AND transaction_type = 'daily'`
      ).get(saving.id, today);
      
      if (!existingDeduction) {
        db.prepare(
          'INSERT INTO savings_transactions (savings_id, sale_id, amount, transaction_type) VALUES (?, NULL, ?, ?)'
        ).run(saving.id, saving.amount, 'daily');
        console.log(`Deducted ₦${saving.amount} for savings plan: ${saving.name}`);
      }
    });
    
    console.log('Daily savings processing completed');
  } catch (error) {
    console.error('Error processing daily savings:', error);
  }
};

// Schedule daily savings deduction to run at midnight every day
cron.schedule('0 0 * * *', processDailySavings);
console.log('Daily savings deduction scheduled for midnight every day');

// Dashboard Routes
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const totalRevenue = db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM sales').get().total;
  const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get().total;
  const totalSales = db.prepare('SELECT COUNT(*) as count FROM sales').get().count;
  const lowStockProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE quantity < 10').get().count;

  // Savings statistics
  const totalSavingsDeducted = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM savings_transactions').get().total;
  const activeSavings = db.prepare('SELECT COUNT(*) as count FROM savings WHERE is_active = 1').get().count;

  const profit = totalRevenue - totalExpenses - totalSavingsDeducted;

  res.json({
    totalRevenue,
    totalExpenses,
    totalSavingsDeducted,
    totalSales,
    lowStockProducts,
    activeSavings,
    profit
  });
});

app.get('/api/dashboard/recent-sales', authenticateToken, (req, res) => {
  const sales = db.prepare(`
    SELECT s.*, c.name as customer_name 
    FROM sales s 
    LEFT JOIN customers c ON s.customer_id = c.id
    ORDER BY s.sale_date DESC
    LIMIT 10
  `).all();
  res.json(sales);
});

app.get('/api/dashboard/recent-expenses', authenticateToken, (req, res) => {
  const expenses = db.prepare(`
    SELECT e.*, u.name as user_name 
    FROM expenses e 
    LEFT JOIN users u ON e.user_id = u.id
    ORDER BY e.expense_date DESC
    LIMIT 10
  `).all();
  res.json(expenses);
});

// Reports Routes
app.get('/api/reports/profit-loss', authenticateToken, (req, res) => {
  const { start_date, end_date } = req.query;
  
  let query = `
    SELECT 
      DATE(sale_date) as date,
      SUM(total) as revenue
    FROM sales
  `;
  let params = [];
  
  if (start_date && end_date) {
    query += ' WHERE sale_date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  
  query += ' GROUP BY DATE(sale_date) ORDER BY date';
  
  const revenue = db.prepare(query).all(...params);
  
  let expenseQuery = `
    SELECT 
      DATE(expense_date) as date,
      SUM(amount) as expenses
    FROM expenses
  `;
  let expenseParams = [];
  
  if (start_date && end_date) {
    expenseQuery += ' WHERE expense_date BETWEEN ? AND ?';
    expenseParams.push(start_date, end_date);
  }
  
  expenseQuery += ' GROUP BY DATE(expense_date) ORDER BY date';
  
  const expenses = db.prepare(expenseQuery).all(...expenseParams);
  
  res.json({ revenue, expenses });
});

// Customer Debt Routes
app.get('/api/customer-debts', authenticateToken, (req, res) => {
  const debts = db.prepare(`
    SELECT cd.*, c.name as customer_name, u.name as user_name 
    FROM customer_debts cd
    LEFT JOIN customers c ON cd.customer_id = c.id
    LEFT JOIN users u ON cd.user_id = u.id
    ORDER BY cd.transaction_date DESC
  `).all();
  res.json(debts);
});

app.get('/api/customer-debts/:customerId', authenticateToken, (req, res) => {
  const debts = db.prepare(`
    SELECT cd.*, c.name as customer_name, u.name as user_name 
    FROM customer_debts cd
    LEFT JOIN customers c ON cd.customer_id = c.id
    LEFT JOIN users u ON cd.user_id = u.id
    WHERE cd.customer_id = ?
    ORDER BY cd.transaction_date DESC
  `).all(req.params.customerId);
  res.json(debts);
});

app.get('/api/customers/:id/balance', authenticateToken, (req, res) => {
  const balance = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'debt' THEN amount ELSE -amount END), 0) as balance
    FROM customer_debts
    WHERE customer_id = ?
  `).get(req.params.id);
  res.json({ balance: balance.balance || 0 });
});

app.post('/api/customer-debts', authenticateToken, (req, res) => {
  try {
    const { customer_id, sale_id, type, amount, description } = req.body;
    
    // Get current balance
    const currentBalance = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN type = 'debt' THEN amount ELSE -amount END), 0) as balance
      FROM customer_debts
      WHERE customer_id = ?
    `).get(customer_id).balance || 0;
    
    const balanceAfter = type === 'debt' ? currentBalance + amount : currentBalance - amount;
    
    const result = db.prepare(
      `INSERT INTO customer_debts (customer_id, sale_id, type, amount, description, user_id, balance_after)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(customer_id, sale_id, type, amount, description, req.user.id, balanceAfter);
    
    res.status(201).json({ message: 'Transaction recorded', id: result.lastInsertRowid, balanceAfter });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customer-debts/payment', authenticateToken, (req, res) => {
  try {
    const { customer_id, amount, description } = req.body;
    
    // Get current balance
    const currentBalance = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN type = 'debt' THEN amount ELSE -amount END), 0) as balance
      FROM customer_debts
      WHERE customer_id = ?
    `).get(customer_id).balance || 0;
    
    if (amount > currentBalance) {
      return res.status(400).json({ error: 'Payment amount exceeds current debt' });
    }
    
    const balanceAfter = currentBalance - amount;
    
    const result = db.prepare(
      `INSERT INTO customer_debts (customer_id, type, amount, description, user_id, balance_after)
       VALUES (?, 'payment', ?, ?, ?, ?)`
    ).run(customer_id, amount, description || 'Payment', req.user.id, balanceAfter);
    
    res.status(201).json({ message: 'Payment recorded', id: result.lastInsertRowid, balanceAfter });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Business Settings Routes
app.get('/api/business-settings', authenticateToken, (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM business_settings WHERE id = 1').get();
    res.json(settings || {
      business_name: 'My Business',
      logo_url: '',
      address: '',
      phone: '',
      email: '',
      tax_rate: 0,
      currency_symbol: '₦',
      invoice_prefix: 'INV',
      receipt_prefix: 'REC'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/business-settings', authenticateToken, (req, res) => {
  try {
    const { business_name, logo_url, address, phone, email, tax_rate, currency_symbol, invoice_prefix, receipt_prefix } = req.body;
    
    const existing = db.prepare('SELECT * FROM business_settings WHERE id = 1').get();
    
    if (existing) {
      db.prepare(
        `UPDATE business_settings 
         SET business_name = ?, logo_url = ?, address = ?, phone = ?, email = ?, 
             tax_rate = ?, currency_symbol = ?, invoice_prefix = ?, receipt_prefix = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`
      ).run(business_name, logo_url, address, phone, email, tax_rate, currency_symbol, invoice_prefix, receipt_prefix);
    } else {
      db.prepare(
        `INSERT INTO business_settings (business_name, logo_url, address, phone, email, tax_rate, currency_symbol, invoice_prefix, receipt_prefix)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(business_name, logo_url, address, phone, email, tax_rate, currency_symbol, invoice_prefix, receipt_prefix);
    }
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/inventory', authenticateToken, (req, res) => {
  const products = db.prepare(`
    SELECT p.*, 
           COALESCE(SUM(si.quantity), 0) as total_sold
    FROM products p
    LEFT JOIN sale_items si ON p.id = si.product_id
    GROUP BY p.id
    ORDER BY p.name
  `).all();
  res.json(products);
});

app.get('/api/reports/sales-by-category', authenticateToken, (req, res) => {
  const sales = db.prepare(`
    SELECT p.category, SUM(si.total) as total_sales, SUM(si.quantity) as total_quantity
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    GROUP BY p.category
    ORDER BY total_sales DESC
  `).all();
  res.json(sales);
});

// Sales grouped by day
app.get('/api/reports/sales-by-day', authenticateToken, (req, res) => {
  const { start_date, end_date } = req.query;
  
  let query = `
    SELECT 
      DATE(sale_date) as date,
      COUNT(*) as total_transactions,
      SUM(total) as total_sales,
      SUM(quantity) as total_quantity,
      AVG(total) as avg_transaction_value
    FROM sales
  `;
  let params = [];
  
  if (start_date && end_date) {
    query += ' WHERE sale_date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  
  query += ' GROUP BY DATE(sale_date) ORDER BY date DESC';
  
  const sales = db.prepare(query).all(...params);
  res.json(sales);
});

// Comprehensive business metrics
app.get('/api/reports/metrics', authenticateToken, (req, res) => {
  const { start_date, end_date } = req.query;
  
  let dateFilter = '';
  let params = [];
  
  if (start_date && end_date) {
    dateFilter = ' WHERE sale_date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  
  // Total revenue
  const totalRevenue = db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM sales${dateFilter}`).get(...params).total;
  
  // Total expenses
  const totalExpenses = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses${dateFilter ? ' WHERE expense_date BETWEEN ? AND ?' : ''}`).get(...(dateFilter ? params : [])).total;
  
  // Total sales count
  const totalSalesCount = db.prepare(`SELECT COUNT(*) as total FROM sales${dateFilter}`).get(...params).total;
  
  // Average order value
  const avgOrderValue = db.prepare(`SELECT COALESCE(AVG(total), 0) as avg FROM sales${dateFilter}`).get(...params).avg;
  
  // Best selling product
  const bestProduct = db.prepare(`
    SELECT p.name, SUM(si.quantity) as total_sold, SUM(si.total) as total_revenue
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    ${dateFilter ? 'WHERE s.sale_date BETWEEN ? AND ?' : ''}
    GROUP BY p.id, p.name
    ORDER BY total_sold DESC
    LIMIT 1
  `).get(...(dateFilter ? params : [])) || { name: 'N/A', total_sold: 0, total_revenue: 0 };
  
  // Low stock products
  const lowStockCount = db.prepare(`SELECT COUNT(*) as total FROM products WHERE quantity < 10`).get().total;
  
  // Total products
  const totalProducts = db.prepare(`SELECT COUNT(*) as total FROM products`).get().total;
  
  // Total customers
  const totalCustomers = db.prepare(`SELECT COUNT(*) as total FROM customers`).get().total;
  
  // Total suppliers
  const totalSuppliers = db.prepare(`SELECT COUNT(*) as total FROM suppliers`).get().total;
  
  // Profit
  const profit = totalRevenue - totalExpenses;
  
  res.json({
    totalRevenue,
    totalExpenses,
    profit,
    totalSalesCount,
    avgOrderValue,
    bestProduct,
    lowStockCount,
    totalProducts,
    totalCustomers,
    totalSuppliers
  });
});

// Initialize admin user with proper password hash
app.post('/api/auth/init-admin', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    db.prepare(
      'UPDATE users SET password = ? WHERE email = ?'
    ).run(hashedPassword, 'admin@business.com');
    res.json({ message: 'Admin password initialized' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Staff Management Routes
// Get all staff members (admin only)
app.get('/api/staff', authenticateToken, requireAdmin, (req, res) => {
  const staff = db.prepare("SELECT id, email, name, role, created_at FROM users WHERE role = 'staff'").all();
  res.json(staff);
});

// Add staff member (admin only)
app.post('/api/staff', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert staff
    const result = db.prepare(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)'
    ).run(email, hashedPassword, name, 'staff');

    res.status(201).json({ message: 'Staff member created successfully', userId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete staff member (admin only)
app.delete('/api/staff/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ? AND role = ?').run(req.params.id, 'staff');
    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stock Allocation Routes
// Get all allocations (admin only)
app.get('/api/allocations', authenticateToken, requireAdmin, (req, res) => {
  const allocations = db.prepare(`
    SELECT sa.*, u.name as staff_name, p.name as product_name, p.sku, p.quantity as available_stock
    FROM staff_allocations sa
    JOIN users u ON sa.staff_id = u.id
    JOIN products p ON sa.product_id = p.id
    ORDER BY sa.allocated_at DESC
  `).all();
  res.json(allocations);
});

// Get allocations for current staff member
app.get('/api/staff/allocations', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ error: 'Staff access required' });
  }
  
  const allocations = db.prepare(`
    SELECT sa.*, p.name as product_name, p.sku, p.unit_price,
           (sa.quantity_allocated - sa.quantity_sold) as remaining_quantity
    FROM staff_allocations sa
    JOIN products p ON sa.product_id = p.id
    WHERE sa.staff_id = ?
    ORDER BY sa.allocated_at DESC
  `).all(req.user.id);
  res.json(allocations);
});

// Allocate stock to staff (admin only)
app.post('/api/allocations', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { staff_id, product_id, quantity, notes } = req.body;
    
    // Check if staff exists
    const staff = db.prepare("SELECT id, name FROM users WHERE id = ? AND role = 'staff'").get(staff_id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    
    // Check if product exists and has enough stock
    const product = db.prepare('SELECT id, name, quantity FROM products WHERE id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (product.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock available' });
    }
    
    // Deduct from main inventory
    db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?').run(quantity, product_id);
    
    // Create allocation
    const result = db.prepare(
      `INSERT INTO staff_allocations (staff_id, product_id, quantity_allocated, allocated_by, notes)
       VALUES (?, ?, ?, ?, ?)`
    ).run(staff_id, product_id, quantity, req.user.id, notes);
    
    res.status(201).json({ message: 'Stock allocated successfully', allocationId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete allocation (admin only)
app.delete('/api/allocations/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const allocation = db.prepare('SELECT * FROM staff_allocations WHERE id = ?').get(req.params.id);
    if (!allocation) {
      return res.status(404).json({ error: 'Allocation not found' });
    }
    
    // Return remaining stock to inventory
    const remaining = allocation.quantity_allocated - allocation.quantity_sold;
    if (remaining > 0) {
      db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?').run(remaining, allocation.product_id);
    }
    
    // Delete allocation
    db.prepare('DELETE FROM staff_allocations WHERE id = ?').run(req.params.id);
    
    res.json({ message: 'Allocation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Staff Sales Routes
// Record a sale from allocated stock (staff only)
app.post('/api/staff/sales', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Staff access required' });
    }
    
    const { allocation_id, quantity, unit_price, notes } = req.body;
    
    // Get allocation
    const allocation = db.prepare('SELECT * FROM staff_allocations WHERE id = ? AND staff_id = ?')
      .get(allocation_id, req.user.id);
    if (!allocation) {
      return res.status(404).json({ error: 'Allocation not found' });
    }
    
    // Check if enough stock is allocated
    const remaining = allocation.quantity_allocated - allocation.quantity_sold;
    if (remaining < quantity) {
      return res.status(400).json({ error: 'Insufficient allocated stock' });
    }
    
    const total = quantity * unit_price;
    
    // Record the sale
    const result = db.prepare(
      `INSERT INTO staff_sales (staff_id, allocation_id, product_id, quantity_sold, unit_price, total, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, allocation_id, allocation.product_id, quantity, unit_price, total, notes);
    
    // Update allocation
    db.prepare('UPDATE staff_allocations SET quantity_sold = quantity_sold + ? WHERE id = ?')
      .run(quantity, allocation_id);
    
    res.status(201).json({ message: 'Sale recorded successfully', saleId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get staff sales history (staff can see their own, admin can see all)
app.get('/api/staff/sales', authenticateToken, (req, res) => {
  let query = `
    SELECT ss.*, u.name as staff_name, p.name as product_name
    FROM staff_sales ss
    JOIN users u ON ss.staff_id = u.id
    JOIN products p ON ss.product_id = p.id
  `;
  const params = [];
  
  if (req.user.role === 'staff') {
    query += ' WHERE ss.staff_id = ?';
    params.push(req.user.id);
  }
  
  query += ' ORDER BY ss.sale_date DESC';
  
  const sales = db.prepare(query).all(...params);
  res.json(sales);
});

// Get staff sales report (admin only)
app.get('/api/reports/staff-sales', authenticateToken, requireAdmin, (req, res) => {
  const report = db.prepare(`
    SELECT u.name as staff_name, 
           COUNT(ss.id) as total_sales,
           SUM(ss.quantity_sold) as total_quantity,
           SUM(ss.total) as total_revenue
    FROM staff_sales ss
    JOIN users u ON ss.staff_id = u.id
    GROUP BY u.id, u.name
    ORDER BY total_revenue DESC
  `).all();
  res.json(report);
});

// Debt Book Routes (Customer Debts)
// Get all customer debts with customer info
app.get('/api/debts', authenticateToken, (req, res) => {
  const debts = db.prepare(`
    SELECT cd.*, c.name as customer_name, c.phone as customer_phone
    FROM customer_debts cd
    JOIN customers c ON cd.customer_id = c.id
    ORDER BY cd.transaction_date DESC
  `).all();
  res.json(debts);
});

// Get debts for a specific customer
app.get('/api/debts/customer/:customerId', authenticateToken, (req, res) => {
  const debts = db.prepare(`
    SELECT cd.*, c.name as customer_name
    FROM customer_debts cd
    JOIN customers c ON cd.customer_id = c.id
    WHERE cd.customer_id = ?
    ORDER BY cd.transaction_date DESC
  `).all(req.params.customerId);
  res.json(debts);
});

// Get customer balance summary
app.get('/api/debts/summary', authenticateToken, (req, res) => {
  const summary = db.prepare(`
    SELECT c.id, c.name, c.phone,
           COALESCE(SUM(CASE WHEN cd.type = 'debt' THEN cd.amount ELSE 0 END), 0) as total_debt,
           COALESCE(SUM(CASE WHEN cd.type = 'payment' THEN cd.amount ELSE 0 END), 0) as total_paid,
           COALESCE(MAX(cd.balance_after), 0) as current_balance
    FROM customers c
    LEFT JOIN customer_debts cd ON c.id = cd.customer_id
    GROUP BY c.id, c.name, c.phone
    HAVING current_balance > 0 OR total_debt > 0
    ORDER BY current_balance DESC
  `).all();
  res.json(summary);
});

// Create a debt record
app.post('/api/debts', authenticateToken, (req, res) => {
  try {
    const { customer_id, sale_id, type, amount, description } = req.body;
    
    // Get current balance
    const currentBalance = db.prepare(`
      SELECT COALESCE(balance_after, 0) as balance
      FROM customer_debts
      WHERE customer_id = ?
      ORDER BY transaction_date DESC
      LIMIT 1
    `).get(customer_id) || { balance: 0 };
    
    let newBalance = currentBalance.balance;
    if (type === 'debt') {
      newBalance += amount;
    } else if (type === 'payment') {
      newBalance -= amount;
    }
    
    const status = newBalance <= 0 ? 'paid' : 'pending';
    
    const result = db.prepare(
      `INSERT INTO customer_debts (customer_id, sale_id, type, amount, description, user_id, balance_after, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(customer_id, sale_id, type, amount, description, req.user.id, newBalance, status);
    
    res.status(201).json({ message: 'Debt record created', id: result.lastInsertRowid, balance: newBalance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark debt as paid
app.put('/api/debts/:id/status', authenticateToken, (req, res) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE customer_debts SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: 'Debt status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supplier Payments Routes
// Get all supplier payments
app.get('/api/supplier-payments', authenticateToken, (req, res) => {
  const payments = db.prepare(`
    SELECT sp.*, s.name as supplier_name, s.phone as supplier_phone
    FROM supplier_payments sp
    JOIN suppliers s ON sp.supplier_id = s.id
    ORDER BY sp.transaction_date DESC
  `).all();
  res.json(payments);
});

// Get payments for a specific supplier
app.get('/api/supplier-payments/supplier/:supplierId', authenticateToken, (req, res) => {
  const payments = db.prepare(`
    SELECT sp.*, s.name as supplier_name
    FROM supplier_payments sp
    JOIN suppliers s ON sp.supplier_id = s.id
    WHERE sp.supplier_id = ?
    ORDER BY sp.transaction_date DESC
  `).all(req.params.supplierId);
  res.json(payments);
});

// Get supplier balance summary
app.get('/api/supplier-payments/summary', authenticateToken, (req, res) => {
  const summary = db.prepare(`
    SELECT s.id, s.name, s.phone,
           COALESCE(SUM(CASE WHEN sp.type = 'payment' THEN sp.amount ELSE 0 END), 0) as total_paid,
           COALESCE(SUM(CASE WHEN sp.type = 'refund' THEN sp.amount ELSE 0 END), 0) as total_refunded,
           COALESCE(MAX(sp.balance_after), 0) as current_balance
    FROM suppliers s
    LEFT JOIN supplier_payments sp ON s.id = sp.supplier_id
    GROUP BY s.id, s.name, s.phone
    HAVING current_balance > 0 OR total_paid > 0
    ORDER BY current_balance DESC
  `).all();
  res.json(summary);
});

// Create a supplier payment record
app.post('/api/supplier-payments', authenticateToken, (req, res) => {
  try {
    const { supplier_id, type, amount, description } = req.body;
    
    // Get current balance
    const currentBalance = db.prepare(`
      SELECT COALESCE(balance_after, 0) as balance
      FROM supplier_payments
      WHERE supplier_id = ?
      ORDER BY transaction_date DESC
      LIMIT 1
    `).get(supplier_id) || { balance: 0 };
    
    let newBalance = currentBalance.balance;
    let status = 'paid';
    
    if (type === 'payment') {
      newBalance -= amount;
    } else if (type === 'refund') {
      newBalance += amount;
    }
    
    const result = db.prepare(
      `INSERT INTO supplier_payments (supplier_id, type, amount, description, user_id, balance_after, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(supplier_id, type, amount, description, req.user.id, newBalance, status);
    
    // Also create an expense record for supplier payments
    const supplier = db.prepare('SELECT name FROM suppliers WHERE id = ?').get(supplier_id);
    if (type === 'payment' && supplier) {
      try {
        db.prepare(
          `INSERT INTO expenses (description, category, amount, expense_date, user_id, notes)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          `Payment to ${supplier.name}`,
          'Supplier Payment',
          amount,
          new Date().toISOString(),
          req.user.id,
          description || `Supplier payment for ${supplier.name}`
        );
        console.log(`Expense record created for payment to ${supplier.name}`);
      } catch (expenseError) {
        console.error('Error creating expense record:', expenseError);
      }
    }
    
    res.status(201).json({ message: 'Payment record created', id: result.lastInsertRowid, balance: newBalance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark supplier payment as paid
app.put('/api/supplier-payments/:id/status', authenticateToken, (req, res) => {
  try {
    const { status } = req.body;
    console.log(`Marking payment ${req.params.id} as ${status}`);
    
    // Get the payment details before updating
    const payment = db.prepare('SELECT * FROM supplier_payments WHERE id = ?').get(req.params.id);
    
    if (!payment) {
      console.log(`Payment ${req.params.id} not found`);
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    console.log(`Current payment status: ${payment.status}, type: ${payment.type}`);
    
    // Only create expense if status is being changed to 'paid' and type is 'payment'
    if (status === 'paid' && payment.status !== status && payment.type === 'payment') {
      console.log(`Creating expense record for payment ${payment.id}`);
      const supplier = db.prepare('SELECT name FROM suppliers WHERE id = ?').get(payment.supplier_id);
      if (supplier) {
        try {
          db.prepare(
            `INSERT INTO expenses (description, category, amount, expense_date, user_id, notes)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            `Payment to ${supplier.name}`,
            'Supplier Payment',
            payment.amount,
            new Date().toISOString(),
            req.user.id,
            payment.description || `Supplier payment for ${supplier.name}`
          );
          console.log(`Expense record created for payment to ${supplier.name}, amount: ${payment.amount}`);
        } catch (expenseError) {
          console.error('Error creating expense record:', expenseError);
        }
      } else {
        console.log(`Supplier ${payment.supplier_id} not found`);
      }
    } else {
      console.log(`Skipping expense creation - status: ${status}, current: ${payment.status}, type: ${payment.type}`);
    }
    
    db.prepare('UPDATE supplier_payments SET status = ? WHERE id = ?').run(status, req.params.id);
    console.log(`Payment ${req.params.id} status updated to ${status}`);
    res.json({ message: 'Payment status updated' });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Catch-all route to serve React app for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// AI Query endpoint - Local AI that learns from system data
app.post('/api/ai/query', authenticateToken, async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Fetch all system data to build knowledge base
    const totalRevenue = db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM sales').get().total;
    const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get().total;
    const totalSales = db.prepare('SELECT COUNT(*) as count FROM sales').get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const lowStockProducts = db.prepare('SELECT name, quantity FROM products WHERE quantity < 10').all();
    const allProducts = db.prepare('SELECT name, sku, quantity, unit_price, cost_price FROM products').all();
    const recentSales = db.prepare('SELECT * FROM sales ORDER BY sale_date DESC LIMIT 10').all();
    const recentExpenses = db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC LIMIT 10').all();
    const totalSavings = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM savings_transactions').get().total;
    const suppliers = db.prepare('SELECT name, phone, email FROM suppliers').all();
    const customers = db.prepare('SELECT name, phone, email FROM customers').all();
    const activityLogs = db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 20').all();
    const savingsPlans = db.prepare('SELECT * FROM savings WHERE is_active = 1').all();

    // Build knowledge base from system data
    const knowledgeBase = {
      business: {
        totalRevenue,
        totalExpenses,
        profit: totalRevenue - totalExpenses - totalSavings,
        totalSales,
        totalProducts,
        totalSavings,
        totalSuppliers: suppliers.length,
        totalCustomers: customers.length
      },
      products: allProducts,
      lowStock: lowStockProducts,
      sales: recentSales,
      expenses: recentExpenses,
      suppliers,
      customers,
      activities: activityLogs,
      savings: savingsPlans
    };

    // Process query using pattern matching and knowledge base
    const answer = processQuery(query, knowledgeBase);

    // Log the AI query
    logActivity(req.user.id, 'ai_query', 'ai_assistant', null, { query, answer }, req.ip);

    res.json({ answer });
  } catch (error) {
    console.error('AI Query Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Local AI query processing function
function processQuery(query, knowledgeBase) {
  const lowerQuery = query.toLowerCase();
  
  // Revenue queries
  if (lowerQuery.includes('revenue') || lowerQuery.includes('total sales') || lowerQuery.includes('income')) {
    return `Your total revenue is ₦${knowledgeBase.business.totalRevenue.toFixed(2)} from ${knowledgeBase.business.totalSales} sales.`;
  }
  
  // Expense queries
  if (lowerQuery.includes('expense') || lowerQuery.includes('spent') || lowerQuery.includes('cost')) {
    return `Your total expenses are ₦${knowledgeBase.business.totalExpenses.toFixed(2)}. Recent expenses include: ${knowledgeBase.expenses.slice(0, 3).map(e => `${e.description} (₦${e.amount.toFixed(2)})`).join(', ')}.`;
  }
  
  // Profit queries
  if (lowerQuery.includes('profit') || lowerQuery.includes('net') || lowerQuery.includes('earnings')) {
    const profit = knowledgeBase.business.profit;
    return `Your net profit is ₦${profit.toFixed(2)} (Revenue: ₦${knowledgeBase.business.totalRevenue.toFixed(2)} - Expenses: ₦${knowledgeBase.business.totalExpenses.toFixed(2)} - Savings: ₦${knowledgeBase.business.totalSavings.toFixed(2)}).`;
  }
  
  // Low stock queries
  if (lowerQuery.includes('low stock') || lowerQuery.includes('running low') || lowerQuery.includes('out of stock')) {
    if (knowledgeBase.lowStock.length === 0) {
      return `All products are well-stocked. No products are running low on stock.`;
    }
    return `Products running low on stock: ${knowledgeBase.lowStock.map(p => `${p.name} (${p.quantity} units)`).join(', ')}. You should restock these items soon.`;
  }
  
  // Product queries
  if (lowerQuery.includes('product') || lowerQuery.includes('inventory') || lowerQuery.includes('stock')) {
    return `You have ${knowledgeBase.business.totalProducts} products in your inventory. Your products include: ${knowledgeBase.products.slice(0, 5).map(p => p.name).join(', ')}${knowledgeBase.products.length > 5 ? ', and more...' : '.'}`;
  }
  
  // Supplier queries
  if (lowerQuery.includes('supplier') || lowerQuery.includes('vendor')) {
    return `You have ${knowledgeBase.business.totalSuppliers} suppliers: ${knowledgeBase.suppliers.map(s => s.name).join(', ')}.`;
  }
  
  // Customer queries
  if (lowerQuery.includes('customer') || lowerQuery.includes('client')) {
    return `You have ${knowledgeBase.business.totalCustomers} customers: ${knowledgeBase.customers.map(c => c.name).join(', ')}.`;
  }
  
  // Savings queries
  if (lowerQuery.includes('saving') || lowerQuery.includes('save')) {
    return `You have ${knowledgeBase.savings.length} active savings plans with total savings of ₦${knowledgeBase.business.totalSavings.toFixed(2)}. Savings plans: ${knowledgeBase.savings.map(s => `${s.name} (₦${s.amount})`).join(', ')}.`;
  }
  
  // Recent activity queries
  if (lowerQuery.includes('activity') || lowerQuery.includes('recent') || lowerQuery.includes('what happened')) {
    const recentActivities = knowledgeBase.activities.slice(0, 5);
    return `Recent activities: ${recentActivities.map(a => `${a.action} ${a.entity_type} ${a.entity_id || ''}`).join(', ')}.`;
  }
  
  // Sales queries
  if (lowerQuery.includes('sale') || lowerQuery.includes('sold')) {
    const recentSales = knowledgeBase.sales.slice(0, 3);
    return `You've made ${knowledgeBase.business.totalSales} sales totaling ₦${knowledgeBase.business.totalRevenue.toFixed(2)}. Recent sales: ${recentSales.map(s => `Sale #${s.id} - ₦${s.total.toFixed(2)}`).join(', ')}.`;
  }
  
  // Default response
  return `I understand you're asking about "${query}". Based on your system data, I can tell you:
- Total Revenue: ₦${knowledgeBase.business.totalRevenue.toFixed(2)}
- Total Expenses: ₦${knowledgeBase.business.totalExpenses.toFixed(2)}
- Net Profit: ₦${knowledgeBase.business.profit.toFixed(2)}
- Total Products: ${knowledgeBase.business.totalProducts}
- Total Sales: ${knowledgeBase.business.totalSales}
- Suppliers: ${knowledgeBase.business.totalSuppliers}
- Customers: ${knowledgeBase.business.totalCustomers}

You can ask me specifically about sales, expenses, products, suppliers, customers, savings, or recent activities.`;
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
