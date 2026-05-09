import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  Truck,
  FileText,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  UserCog,
  ArrowRightLeft,
  TrendingUp,
  BookOpen,
  CreditCard,
  PiggyBank,
  Bot
} from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [businessName, setBusinessName] = useState('Business Manager');
  const [businessLogo, setBusinessLogo] = useState(null);

  useEffect(() => {
    fetchBusinessSettings();
  }, []);

  const fetchBusinessSettings = async () => {
    try {
      const response = await axios.get('/api/business-settings');
      if (response.data) {
        setBusinessName(response.data.business_name || 'Business Manager');
        setBusinessLogo(response.data.logo_url);
      }
    } catch (error) {
      console.error('Error fetching business settings:', error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Sales', href: '/sales', icon: ShoppingCart },
    { name: 'Expenses', href: '/expenses', icon: DollarSign },
    { name: 'Expense Reports', href: '/expense-reports', icon: BarChart3 },
    { name: 'Savings', href: '/savings', icon: PiggyBank },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Suppliers', href: '/suppliers', icon: Truck },
    { name: 'Business Reports', href: '/reports', icon: FileText },
    { name: 'Debt Book', href: '/debt-book', icon: BookOpen },
    { name: 'Supplier Payments', href: '/supplier-payments', icon: CreditCard },
    { name: 'AI Assistant', href: '/ai-assistant', icon: Bot },
    ...(user?.role === 'admin' ? [
      { name: 'Staff Management', href: '/staff', icon: UserCog },
      { name: 'Stock Allocation', href: '/allocations', icon: ArrowRightLeft },
    ] : []),
    ...(user?.role === 'staff' ? [
      { name: 'My Sales', href: '/my-sales', icon: TrendingUp },
    ] : []),
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-gradient-to-b from-white to-gray-50 shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-20 px-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-purple-600">
            <h1 className="text-xl font-bold text-white flex items-center">
              {businessLogo ? (
                <img src={businessLogo} alt="Logo" className="w-8 h-8 mr-2 object-contain rounded-full bg-white" />
              ) : (
                <LayoutDashboard className="w-6 h-6 mr-2" />
              )}
              {businessName}
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:shadow-md'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-4 py-6 border-t border-gray-100 bg-gradient-to-t from-white to-gray-50">
            <div className="flex items-center mb-4 p-3 bg-white rounded-xl shadow-soft">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-white hover:shadow-md rounded-xl transition-all duration-200"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        <header className="bg-gradient-to-r from-white via-blue-50 to-purple-50 backdrop-blur-md shadow-soft sticky top-0 z-10 border-b border-gray-200">
          <div className="flex items-center justify-between h-20 px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center space-x-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              </div>
          </div>
        </header>

        <main className="p-8">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
