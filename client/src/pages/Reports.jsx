import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Reports = () => {
  const [profitLossData, setProfitLossData] = useState(null);
  const [inventoryData, setInventoryData] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    fetchReports();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReports();
    }
  }, [startDate, endDate]);

  const fetchReports = async () => {
    try {
      const [profitLossRes, inventoryRes, categoryRes] = await Promise.all([
        axios.get(`/api/reports/profit-loss?start_date=${startDate}&end_date=${endDate}`),
        axios.get('/api/reports/inventory'),
        axios.get('/api/reports/sales-by-category')
      ]);
      setProfitLossData(profitLossRes.data);
      setInventoryData(inventoryRes.data);
      setSalesByCategory(categoryRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => 
      typeof val === 'number' ? val : `"${val}"`
    ).join(',')).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${filename} successfully`);
  };

  if (loading) return <div>Loading...</div>;

  const combinedProfitLoss = profitLossData?.revenue?.map((rev) => {
    const expense = profitLossData?.expenses?.find((exp) => exp.date === rev.date);
    return {
      date: rev.date,
      revenue: rev.revenue || 0,
      expenses: expense?.expenses || 0,
      profit: (rev.revenue || 0) - (expense?.expenses || 0)
    };
  }) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Reports</h1>

      {/* Date Filter */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="flex-1 grid grid-cols-2 gap-4">
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
          </div>
        </div>
      </div>

      {/* Profit/Loss Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Profit & Loss Overview</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={combinedProfitLoss}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
            <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
            <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Category */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Sales by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={salesByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="total_sales"
                nameKey="category"
              >
                {salesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Inventory Report */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Inventory Status</h2>
            <button
              onClick={() => exportToCSV(inventoryData, 'inventory-report')}
              className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
          <div className="overflow-y-auto max-h-80">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sold</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inventoryData.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{product.name}</td>
                    <td className="px-4 py-2 text-sm">{product.quantity}</td>
                    <td className="px-4 py-2 text-sm">{product.total_sold || 0}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        product.quantity < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {product.quantity < 10 ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Category Sales Table */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Sales by Category Details</h2>
          <button
            onClick={() => exportToCSV(salesByCategory, 'sales-by-category')}
            className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Sales (₦)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity Sold</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {salesByCategory.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {item.category || 'Uncategorized'}
                  </div>
                </td>
                <td className="px-6 py-4 font-semibold">₦{item.total_sales?.toFixed(2) || 0}</td>
                <td className="px-6 py-4">{item.total_quantity || 0}</td>
                <td className="px-6 py-4 text-gray-600">
                  ₦{item.total_quantity > 0 ? (item.total_sales / item.total_quantity).toFixed(2) : 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
