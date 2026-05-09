import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Truck, DollarSign, CheckCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const SupplierPayments = () => {
  const [summary, setSummary] = useState([]);
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [formData, setFormData] = useState({ supplier_id: '', type: 'payment', amount: '', description: '' });
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, suppliersRes] = await Promise.all([
        axios.get('/api/supplier-payments/summary'),
        axios.get('/api/suppliers')
      ]);
      setSummary(summaryRes.data);
      setSuppliers(suppliersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleViewPayments = async (supplierId) => {
    try {
      const response = await axios.get(`/api/supplier-payments/supplier/${supplierId}`);
      setPayments(response.data);
      setSelectedSupplier(supplierId);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/supplier-payments', formData);
      toast.success('Payment record created successfully');
      setShowModal(false);
      setFormData({ supplier_id: '', type: 'payment', amount: '', description: '' });
      fetchData();
      if (selectedSupplier) {
        handleViewPayments(formData.supplier_id);
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error(error.response?.data?.error || 'Failed to create payment record');
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await axios.put(`/api/supplier-payments/${id}/status`, { status: 'paid' });
      toast.success('Payment marked as paid');
      if (selectedSupplier) {
        handleViewPayments(selectedSupplier);
      }
      fetchData();
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      toast.error('Failed to mark payment as paid');
    }
  };

  const totalBalance = summary.reduce((sum, s) => sum + s.current_balance, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Truck className="w-8 h-8 mr-3" />
          Supplier Payments
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
          <p className="text-sm text-gray-600">Total Outstanding Balance</p>
          <p className="text-2xl font-bold text-red-600">₦{totalBalance.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-600">Active Suppliers</p>
          <p className="text-2xl font-bold text-gray-900">{summary.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-600">Total Paid</p>
          <p className="text-2xl font-bold text-green-600">
            ₦{summary.reduce((sum, s) => sum + s.total_paid, 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Supplier Payment Summary */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <h2 className="text-xl font-bold p-6">Supplier Payment Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Refunded</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summary.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{supplier.name}</td>
                  <td className="px-6 py-4 text-gray-600">{supplier.phone || '-'}</td>
                  <td className="px-6 py-4 text-green-600">₦{supplier.total_paid.toFixed(2)}</td>
                  <td className="px-6 py-4 text-red-600">₦{supplier.total_refunded.toFixed(2)}</td>
                  <td className={`px-6 py-4 font-semibold ${supplier.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₦{supplier.current_balance.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewPayments(supplier.id)}
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
                    No payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Details */}
      {selectedSupplier && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">Payment Details</h2>
            <button
              onClick={() => setSelectedSupplier(null)}
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
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        payment.type === 'payment' ? 'bg-green-100 text-green-700' : 
                        payment.type === 'refund' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {payment.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 ${payment.type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                      ₦{payment.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{payment.description || '-'}</td>
                    <td className="px-6 py-4 text-gray-900 font-semibold">₦{payment.balance_after.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        payment.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(payment.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {payment.status !== 'paid' && payment.type === 'payment' && (
                        <button
                          onClick={() => handleMarkPaid(payment.id)}
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

      {/* Add Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Payment Record</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Supplier</label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
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
                  <option value="payment">Payment (Paid to supplier)</option>
                  <option value="refund">Refund (Refunded by supplier)</option>
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

export default SupplierPayments;
