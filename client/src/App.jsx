import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import StaffManagement from './pages/StaffManagement';
import StockAllocation from './pages/StockAllocation';
import StaffSales from './pages/StaffSales';
import Settings from './pages/Settings';
import DebtBook from './pages/DebtBook';
import SupplierPayments from './pages/SupplierPayments';
import ExpenseReports from './pages/ExpenseReports';
import Savings from './pages/Savings';

// Temporary: Bypass authentication
const ProtectedRoute = ({ children }) => {
  return children; // Allow access without authentication
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Temporarily redirect login to dashboard */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="sales" element={<Sales />} />
            <Route path="customers" element={<Customers />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<Reports />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="stock-allocation" element={<StockAllocation />} />
            <Route path="my-sales" element={<StaffSales />} />
            <Route path="staff-sales" element={<StaffSales />} />
            <Route path="settings" element={<Settings />} />
            <Route path="debt-book" element={<DebtBook />} />
            <Route path="supplier-payments" element={<SupplierPayments />} />
            <Route path="expense-reports" element={<ExpenseReports />} />
            <Route path="savings" element={<Savings />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
