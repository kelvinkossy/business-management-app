import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, X, DollarSign, Percent } from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../components/LoadingSpinner';

const Savings = () => {
  const [savings, setSavings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSavings, setEditingSavings] = useState(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: 0,
    percentage: 0,
    deduct_from: 'total'
  });

  useEffect(() => {
    fetchSavings();
  }, []);

  const fetchSavings = async () => {
    try {
      const response = await axios.get('/api/savings');
      setSavings(response.data);
    } catch (error) {
      console.error('Error fetching savings:', error);
      toast.error('Failed to fetch savings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSavings) {
        await axios.put(`/api/savings/${editingSavings.id}`, formData);
        toast.success('Savings updated successfully');
      } else {
        await axios.post('/api/savings', formData);
        toast.success('Savings created successfully');
      }
      setFormData({
        name: '',
        description: '',
        amount: 0,
        percentage: 0,
        deduct_from: 'total'
      });
      setEditingSavings(null);
      setShowModal(false);
      fetchSavings();
    } catch (error) {
      console.error('Error saving savings:', error);
      toast.error(error.response?.data?.error || 'Failed to save savings');
    }
  };

  const handleEdit = (saving) => {
    setEditingSavings(saving);
    setFormData(saving);
    setShowModal(true);
  };

  const handleEnd = async (id) => {
    if (window.confirm('Are you sure you want to end this savings plan?')) {
      try {
        await axios.put(`/api/savings/${id}/end`);
        toast.success('Savings plan ended');
        fetchSavings();
      } catch (error) {
        console.error('Error ending savings:', error);
        toast.error('Failed to end savings');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this savings plan?')) {
      try {
        await axios.delete(`/api/savings/${id}`);
        toast.success('Savings deleted successfully');
        fetchSavings();
      } catch (error) {
        console.error('Error deleting savings:', error);
        toast.error('Failed to delete savings');
      }
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Savings Management</h1>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingSavings(null);
              setFormData({
                name: '',
                description: '',
                amount: 0,
                percentage: 0,
                deduct_from: 'total'
              });
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Savings
          </button>
        )}
      </div>

      {/* Savings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-medium text-gray-600">Total Active Savings</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {savings.filter(s => s.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-medium text-gray-600">Total Ended Savings</p>
          <p className="text-3xl font-bold text-gray-500 mt-2">
            {savings.filter(s => !s.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-medium text-gray-600">Total Fixed Amount</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            ₦{savings.filter(s => s.is_active && s.amount > 0).reduce((sum, s) => sum + s.amount, 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Savings List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount/Percentage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deduct From</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {savings.map((saving) => (
              <tr key={saving.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{saving.name}</div>
                    {saving.description && (
                      <div className="text-sm text-gray-500">{saving.description}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    {saving.percentage > 0 ? 'Percentage' : 'Fixed Amount'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {saving.percentage > 0 ? (
                    <span className="flex items-center">
                      <Percent className="w-4 h-4 mr-1" />
                      {saving.percentage}%
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      ₦{saving.amount.toFixed(2)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                  {saving.deduct_from}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    saving.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {saving.is_active ? 'Active' : 'Ended'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(saving.created_at).toLocaleDateString()}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(saving)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {saving.is_active && (
                        <button
                          onClick={() => handleEnd(saving.id)}
                          className="text-amber-600 hover:text-amber-900"
                          title="End Savings"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(saving.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {savings.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                  No savings plans created yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Savings Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingSavings ? 'Edit Savings' : 'Add Savings'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Savings Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  placeholder="e.g., Daily Savings"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Emergency fund"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deduction Type</label>
                <select
                  value={formData.percentage > 0 ? 'percentage' : 'fixed'}
                  onChange={(e) => {
                    if (e.target.value === 'percentage') {
                      setFormData({ ...formData, percentage: 10, amount: 0 });
                    } else {
                      setFormData({ ...formData, percentage: 0, amount: 1000 });
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
              {formData.percentage > 0 ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Percentage (%)</label>
                  <input
                    type="number"
                    value={formData.percentage}
                    onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                    max="100"
                    required
                    placeholder="e.g., 10"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Fixed Amount (₦)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                    step="0.01"
                    required
                    placeholder="e.g., 1000"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Deduct From</label>
                <select
                  value={formData.deduct_from}
                  onChange={(e) => setFormData({ ...formData, deduct_from: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="total">Total (including tax)</option>
                  <option value="subtotal">Subtotal (excluding tax)</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSavings(null);
                    setFormData({
                      name: '',
                      description: '',
                      amount: 0,
                      percentage: 0,
                      deduct_from: 'total'
                    });
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingSavings ? 'Update' : 'Add'} Savings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Savings;
