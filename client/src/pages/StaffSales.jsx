import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, TrendingUp, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import ReceiptPrinter from '../components/ReceiptPrinter';

const StaffSales = () => {
  const [allocations, setAllocations] = useState([]);
  const [sales, setSales] = useState([]);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [formData, setFormData] = useState({ quantity: '', unit_price: '', notes: '' });
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';

  useEffect(() => {
    if (isStaff) {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    try {
      const [allocRes, salesRes] = await Promise.all([
        axios.get('/api/staff/allocations'),
        axios.get('/api/staff/sales')
      ]);
      setAllocations(allocRes.data);
      setSales(salesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSaleClick = (allocation) => {
    if (allocation.remaining_quantity <= 0) {
      toast.error('No remaining stock for this item');
      return;
    }
    setSelectedAllocation(allocation);
    setFormData({
      quantity: '',
      unit_price: allocation.unit_price.toString(),
      notes: ''
    });
    setShowSaleModal(true);
  };

  const handleSubmitSale = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/staff/sales', {
        allocation_id: selectedAllocation.id,
        quantity: parseInt(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        notes: formData.notes
      });
      toast.success('Sale recorded successfully');
      setShowSaleModal(false);
      setSelectedAllocation(null);
      setFormData({ quantity: '', unit_price: '', notes: '' });
      fetchData();
    } catch (error) {
      console.error('Error recording sale:', error);
      toast.error(error.response?.data?.error || 'Failed to record sale');
    }
  };

  const printReceipt = (sale) => {
    setSelectedSale(sale);
    setShowReceipt(true);
  };

  if (!isStaff) return <div className="text-red-600">Access denied. Staff only.</div>;

  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity_sold, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">My Sales</h1>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-600">Total Sales</p>
          <p className="text-2xl font-bold text-gray-900">{sales.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">₦{totalSales.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-600">Items Sold</p>
          <p className="text-2xl font-bold text-blue-600">{totalQuantity}</p>
        </div>
      </div>

      {/* Allocated Stock */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <Package className="w-5 h-5 mr-2" />
          My Allocated Stock
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allocations.map((allocation) => (
            <div key={allocation.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-900">{allocation.product_name}</h3>
              <p className="text-sm text-gray-500 mb-2">{allocation.sku}</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Allocated:</span>
                  <span className="font-medium">{allocation.quantity_allocated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sold:</span>
                  <span className="font-medium text-green-600">{allocation.quantity_sold}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining:</span>
                  <span className={`font-bold ${allocation.remaining_quantity > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {allocation.remaining_quantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit Price:</span>
                  <span className="font-medium">₦{allocation.unit_price.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={() => handleSaleClick(allocation)}
                disabled={allocation.remaining_quantity <= 0}
                className={`mt-3 w-full py-2 rounded-lg font-medium transition-colors ${
                  allocation.remaining_quantity > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {allocation.remaining_quantity > 0 ? 'Record Sale' : 'Out of Stock'}
              </button>
            </div>
          ))}
          {allocations.length === 0 && (
            <div className="col-span-3 text-center py-8 text-gray-500">
              No stock allocated to you yet. Contact admin for allocations.
            </div>
          )}
        </div>
      </div>

      {/* Sales History */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <h2 className="text-xl font-bold p-6 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Sales History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{sale.product_name}</td>
                  <td className="px-6 py-4 text-gray-600">{sale.quantity_sold}</td>
                  <td className="px-6 py-4 text-gray-600">₦{sale.unit_price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-green-600 font-semibold">₦{sale.total.toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(sale.sale_date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => printReceipt(sale)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Print Receipt"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No sales recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showSaleModal && selectedAllocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Record Sale</h2>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-semibold">{selectedAllocation.product_name}</p>
              <p className="text-sm text-gray-500">Available: {selectedAllocation.remaining_quantity}</p>
            </div>
            <form onSubmit={handleSubmitSale} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={selectedAllocation.remaining_quantity}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit Price (₦)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
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
              {formData.quantity && formData.unit_price && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total: ₦{(formData.quantity * formData.unit_price).toFixed(2)}</p>
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSaleModal(false);
                    setSelectedAllocation(null);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Record Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Printer Modal */}
      {showReceipt && selectedSale && (
        <ReceiptPrinter sale={selectedSale} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
};

export default StaffSales;
