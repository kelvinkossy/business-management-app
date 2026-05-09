import { useEffect, useState } from 'react';
import axios from 'axios';
import { Calendar, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const ExpenseReports = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState('daily'); // daily, monthly, yearly

  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    fetchExpenses();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchExpenses();
    }
  }, [startDate, endDate]);

  const fetchExpenses = async () => {
    try {
      const response = await axios.get('/api/expenses');
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  // Filter expenses by date range
  const filteredExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.expense_date);
    const start = startDate ? new Date(startDate) : new Date('1900-01-01');
    const end = endDate ? new Date(endDate) : new Date();
    return expenseDate >= start && expenseDate <= end;
  });

  // Group expenses by date/category based on view mode
  const getGroupedData = () => {
    const grouped = {};
    
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.expense_date);
      let key;
      
      if (viewMode === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (viewMode === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = String(date.getFullYear());
      }
      
      if (!grouped[key]) {
        grouped[key] = { date: key, total: 0, byCategory: {} };
      }
      grouped[key].total += expense.amount;
      
      if (!grouped[key].byCategory[expense.category]) {
        grouped[key].byCategory[expense.category] = 0;
      }
      grouped[key].byCategory[expense.category] += expense.amount;
    });
    
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Get category totals for pie chart
  const getCategoryData = () => {
    const categoryTotals = {};
    filteredExpenses.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });
    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  };

  if (loading) return <LoadingSpinner />;

  const groupedData = getGroupedData();
  const categoryData = getCategoryData();

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900">Expense Reports</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">View Mode</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Expenses</h3>
          <p className="text-2xl font-bold text-red-600">
            ₦{filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Number of Expenses</h3>
          <p className="text-2xl font-bold text-gray-900">
            {filteredExpenses.length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Average per Expense</h3>
          <p className="text-2xl font-bold text-gray-900">
            ₦{filteredExpenses.length > 0 ? (filteredExpenses.reduce((sum, e) => sum + e.amount, 0) / filteredExpenses.length).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      {/* Expense Trend Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Expense Trend ({viewMode})</h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={groupedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `₦${value.toFixed(2)}`} />
            <Legend />
            <Bar dataKey="total" fill="#ef4444" name="Total Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Expense by Category</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₦${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown Table */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Category Breakdown</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {categoryData
              .sort((a, b) => b.value - a.value)
              .map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-red-600">₦{item.value.toFixed(2)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Detailed Breakdown Table */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Expense Breakdown by {viewMode}</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categories</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {groupedData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{item.date}</td>
                  <td className="px-6 py-4 font-semibold text-red-600">₦{item.total.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(item.byCategory).map(([cat, amount]) => (
                        <span key={cat} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {cat}: ₦{amount.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpenseReports;
