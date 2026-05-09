import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BookOpen, DollarSign, CheckCircle, XCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const DebtBook = () => {
  const [summary, setSummary] = useState([]);
  const [debts, setDebts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({ customer_id: '', type: 'debt', amount: '', description: '' });
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, customersRes] = await Promise.all([
        axios.get('/api/debts/summary'),
        axios.get('/api/customers')
      ]);
      setSummary(summaryRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleViewDebts = async (customerId) => {
    try {
      const response = await axios.get(`/api/debts/customer/${customerId}`);
      setDebts(response.data);
      setSelectedCustomer(customerId);
    } catch (error) {
      console.error('Error fetching debts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/debts', formData);
      toast.success('Debt record created successfully');
      setShowModal(false);
      setFormData({ customer_id: '', type: 'debt', amount: '', description: '' });
      fetchData();
      if (selectedCustomer) {
        handleViewDebts(formData.customer_id);
      }
    } catch (error) {
      console.error('Error creating debt:', error);
      toast.error(error.response?.data?.error || 'Failed to create debt record');
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await axios.put(`/api/debts/${id}/status`, { status: 'paid' });
      toast.success('Debt marked as paid');
      if (selectedCustomer) {
        handleViewDebts(selectedCustomer);
      }
      fetchData();
    } catch (error) {
      console.error('Error marking debt as paid:', error);
      toast.error('Failed to mark debt as paid');
    }
  };

  const totalDebt = summary.reduce((sum, s) => sum + s.current_balance, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <BookOpen className="w-8 h-8 mr-3" />
          Debt Book
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Record
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-600">Total Outstanding Debt</p>
          <p className="text-2xl font-bold text-red-600">₦{totalDebt.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-600">Customers with Debt</p>
          <p className="text-2xl font-bold text-gray-900">{summary.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-600">Total Collected</p>
          <p className="text-2xl font-bold text-green-600">
            ₦{summary.reduce((sum, s) => sum + s.total_paid, 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Customer Debt Summary */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <h2 className="text-xl font-bold p-6">Customer Debt Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Debt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summary.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{customer.name}</td>
                  <td className="px-6 py-4 text-gray-600">{customer.phone || '-'}</td>
                  <td className="px-6 py-4 text-red-600">₦{customer.total_debt.toFixed(2)}</td>
                  <td className="px-6 py-4 text-green-600">₦{customer.total_paid.toFixed(2)}</td>
                  <td className={`px-6 py-4 font-semibold ${customer.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₦{customer.current_balance.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewDebts(customer.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {summary.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No debt records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Debt Details */}
      {selectedCustomer && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">Debt Details</h2>
            <button
              onClick={() => setSelectedCustomer(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance After</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {debts.map((debt) => (
                  <tr key={debt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        debt.type === 'debt' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {debt.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 ${debt.type === 'debt' ? 'text-red-600' : 'text-green-600'}`}>
                      ₦{debt.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{debt.description || '-'}</td>
                    <td className="px-6 py-4 text-gray-900 font-semibold">₦{debt.balance_after.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        debt.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {debt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(debt.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {debt.status !== 'paid' && debt.type === 'debt' && (
                        <button
                          onClick={() => handleMarkPaid(debt.id)}
                          className="flex items-center px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Debt Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Debt Record</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Customer</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="debt">Debt (Customer owes)</option>
                  <option value="payment">Payment (Customer paid)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₦)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtBook;
