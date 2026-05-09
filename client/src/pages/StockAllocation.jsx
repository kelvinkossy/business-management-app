import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Package, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const StockAllocation = () => {
  const [allocations, setAllocations] = useState([]);
  const [staff, setStaff] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ staff_id: '', product_id: '', quantity: '', notes: '' });
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [allocRes, staffRes, prodRes] = await Promise.all([
        axios.get('/api/allocations'),
        axios.get('/api/staff'),
        axios.get('/api/products')
      ]);
      setAllocations(allocRes.data);
      setStaff(staffRes.data);
      setProducts(prodRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/allocations', formData);
      toast.success('Stock allocated successfully');
      setShowModal(false);
      setFormData({ staff_id: '', product_id: '', quantity: '', notes: '' });
      fetchData();
    } catch (error) {
      console.error('Error allocating stock:', error);
      toast.error(error.response?.data?.error || 'Failed to allocate stock');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this allocation? Remaining stock will be returned to inventory.')) {
      try {
        await axios.delete(`/api/allocations/${id}`);
        toast.success('Allocation deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting allocation:', error);
        toast.error('Failed to delete allocation');
      }
    }
  };

  if (!isAdmin) return <div className="text-red-600">Access denied. Admin only.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Stock Allocation</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Allocate Stock
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-600">Total Allocations</p>
          <p className="text-2xl font-bold text-gray-900">{allocations.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-600">Total Items Allocated</p>
          <p className="text-2xl font-bold text-blue-600">
            {allocations.reduce((sum, a) => sum + a.quantity_allocated, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-600">Total Items Sold</p>
          <p className="text-2xl font-bold text-green-600">
            {allocations.reduce((sum, a) => sum + a.quantity_sold, 0)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allocated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sold</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {allocations.map((allocation) => {
              const remaining = allocation.quantity_allocated - allocation.quantity_sold;
              return (
                <tr key={allocation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{allocation.staff_name}</td>
                  <td className="px-6 py-4 text-gray-600">{allocation.product_name}</td>
                  <td className="px-6 py-4 text-gray-600">{allocation.sku}</td>
                  <td className="px-6 py-4 text-gray-900">{allocation.quantity_allocated}</td>
                  <td className="px-6 py-4 text-green-600">{allocation.quantity_sold}</td>
                  <td className="px-6 py-4 text-blue-600 font-semibold">{remaining}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(allocation.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {allocations.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  No allocations found. Allocate stock to staff members.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Allocate Stock to Staff</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Staff Member</label>
                <select
                  value={formData.staff_id}
                  onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Staff</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Product</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Product</option>
                  {products.filter(p => p.quantity > 0).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (Available: {p.quantity})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  Allocate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAllocation;
