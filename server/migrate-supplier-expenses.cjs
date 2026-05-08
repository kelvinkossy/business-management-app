const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const db = new Database(path.join(__dirname, 'database', 'business.db'));

console.log('Starting migration to add expense records for paid supplier payments...');

// Get all paid supplier payments that don't have corresponding expense records
const paidPayments = db.prepare(`
  SELECT sp.*, s.name as supplier_name
  FROM supplier_payments sp
  JOIN suppliers s ON sp.supplier_id = s.id
  WHERE sp.status = 'paid' AND sp.type = 'payment'
`).all();

console.log(`Found ${paidPayments.length} paid supplier payments`);

let created = 0;
let skipped = 0;

paidPayments.forEach(payment => {
  // Check if expense already exists for this payment
  const existingExpense = db.prepare(`
    SELECT id FROM expenses 
    WHERE description = ? AND category = 'Supplier Payment' AND amount = ?
  `).get(`Payment to ${payment.supplier_name}`, payment.amount);
  
  if (!existingExpense) {
    try {
      db.prepare(
        `INSERT INTO expenses (description, category, amount, expense_date, user_id, notes)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        `Payment to ${payment.supplier_name}`,
        'Supplier Payment',
        payment.amount,
        payment.transaction_date || new Date().toISOString(),
        payment.user_id || 1,
        payment.description || `Supplier payment for ${payment.supplier_name}`
      );
      console.log(`Created expense record for payment ${payment.id} to ${payment.supplier_name}`);
      created++;
    } catch (error) {
      console.error(`Error creating expense for payment ${payment.id}:`, error.message);
    }
  } else {
    console.log(`Expense already exists for payment ${payment.id}`);
    skipped++;
  }
});

console.log(`Migration complete. Created: ${created}, Skipped: ${skipped}`);
