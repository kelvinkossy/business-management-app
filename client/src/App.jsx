import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Expenses from './pages/Expenses';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import ExpenseReports from './pages/ExpenseReports';
import Settings from './pages/Settings';
import StaffManagement from './pages/StaffManagement';
import StockAllocation from './pages/StockAllocation';
import StaffSales from './pages/StaffSales';
import DebtBook from './pages/DebtBook';
import SupplierPayments from './pages/SupplierPayments';
import Savings from './pages/Savings';
import AIAssistant from './pages/AIAssistant';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
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
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/expense-reports" element={<ProtectedRoute><ExpenseReports /></ProtectedRoute>} />
                    <Route path="/savings" element={<ProtectedRoute><Savings /></ProtectedRoute>} />
                    <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
                    <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/staff" element={<AdminRoute><StaffManagement /></AdminRoute>} />
                    <Route path="/allocations" element={<AdminRoute><StockAllocation /></AdminRoute>} />
                    <Route path="/my-sales" element={<ProtectedRoute><StaffSales /></ProtectedRoute>} />
                    <Route path="/debt-book" element={<ProtectedRoute><DebtBook /></ProtectedRoute>} />
                    <Route path="/supplier-payments" element={<ProtectedRoute><SupplierPayments /></ProtectedRoute>} />
                    <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
