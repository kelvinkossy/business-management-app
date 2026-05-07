# Business Management App

A comprehensive web-based business management application for inventory, sales, expenses, invoicing, and reporting.

## Features

- **Multi-user Authentication** - Admin and user roles with JWT authentication
- **Inventory Management** - CRUD operations for products with stock tracking
- **Sales Tracking** - Record sales from inventory or manual sales (admin only)
- **Expense Tracking** - Categorize and track business expenses
- **Customer Management** - Manage customer information
- **Supplier Management** - Track suppliers and purchases
- **Invoicing/Billing** - Generate and manage invoices
- **Dashboard** - Real-time overview of revenue, expenses, and profit
- **Reports** - Profit/loss, inventory, and sales reports with CSV export
- **Currency** - All monetary values displayed in Nigerian Naira (₦)

## Tech Stack

- **Frontend**: React (Vite), TailwindCSS, shadcn/ui, Recharts
- **Backend**: Node.js, Express
- **Database**: SQLite
- **Authentication**: JWT with bcrypt
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development servers:
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

3. Open your browser to `http://localhost:5173`

### Default Admin Account

- Email: admin@business.com
- Password: admin123

## Project Structure

```
business-management-app/
├── client/          # React frontend
├── server/          # Express backend
└── README.md
```
