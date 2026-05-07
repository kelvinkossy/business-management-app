import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#9333ea', '#ec4899'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, salesRes, expensesRes] = await Promise.all([
        axios.get('/api/dashboard/stats'),
        axios.get('/api/dashboard/recent-sales'),
        axios.get('/api/dashboard/recent-expenses')
      ]);
      setStats(statsRes.data);
      setRecentSales(salesRes.data);
      setRecentExpenses(expensesRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!stats) {
    return <div className="flex items-center justify-center h-64">Error loading dashboard data</div>;
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `₦${stats.totalRevenue?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      trend: '+12%'
    },
    {
      title: 'Total Expenses',
      value: `₦${stats.totalExpenses?.toFixed(2) || '0.00'}`,
      icon: TrendingUp,
      gradient: 'from-rose-500 to-pink-600',
      bgLight: 'bg-rose-50',
      textColor: 'text-rose-600',
      trend: '-5%'
    },
    {
      title: 'Net Profit',
      value: `₦${stats.profit?.toFixed(2) || '0.00'}`,
      icon: ArrowUpRight,
      gradient: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      trend: '+8%'
    },
    {
      title: 'Total Sales',
      value: stats.totalSales || 0,
      icon: ShoppingCart,
      gradient: 'from-purple-500 to-purple-600',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-600',
      trend: '+15%'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 animate-slide-in hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className={`text-sm ${stat.textColor} mt-2 flex items-center`}>
                    {stat.trend}
                  </p>
                </div>
                <div className={`bg-gradient-to-br ${stat.gradient} p-4 rounded-xl shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockProducts > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center shadow-soft animate-slide-in">
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-2 rounded-lg mr-3">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <p className="text-amber-900 font-medium">
            {stats.lowStockProducts} products are running low on stock
          </p>
        </div>
      )}

      {/* Recent Sales */}
      <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 animate-slide-in" style={{ animationDelay: '400ms' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Sales</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-600 text-sm">
                <th className="pb-3">Customer</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Payment</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale) => (
                <tr key={sale.id} className="border-t">
                  <td className="py-3">{sale.customer_name || 'Walk-in'}</td>
                  <td className="py-3 text-gray-600">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 font-semibold">₦{sale.total.toFixed(2)}</td>
                  <td className="py-3">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                      {sale.payment_method || 'Cash'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 animate-slide-in" style={{ animationDelay: '500ms' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Expenses</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-600 text-sm">
                <th className="pb-3">Description</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.map((expense) => (
                <tr key={expense.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="py-3">{expense.description}</td>
                  <td className="py-3">
                    <span className="px-2 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-full text-xs font-medium">
                      {expense.category}
                    </span>
                  </td>
                  <td className="py-3 text-gray-600">
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 font-semibold text-rose-600">
                    -₦{expense.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 animate-slide-in" style={{ animationDelay: '600ms' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Expenses</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { name: 'Revenue', value: stats?.totalRevenue || 0 },
              { name: 'Expenses', value: stats?.totalExpenses || 0 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0ea5e9" name="Amount" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 animate-slide-in" style={{ animationDelay: '700ms' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Categories</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={recentExpenses.reduce((acc, exp) => {
                  const existing = acc.find(item => item.name === exp.category);
                  if (existing) {
                    existing.value += exp.amount;
                  } else {
                    acc.push({ name: exp.category, value: exp.amount });
                  }
                  return acc;
                }, [])}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {recentExpenses.reduce((acc, exp) => {
                  const existing = acc.find(item => item.name === exp.category);
                  if (existing) {
                    existing.value += exp.amount;
                  } else {
                    acc.push({ name: exp.category, value: exp.amount });
                  }
                  return acc;
                }, []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
