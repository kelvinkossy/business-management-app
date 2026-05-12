import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../components/LoadingSpinner';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Calculate inventory stats
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.quantity < 10).length;
  const totalStockValue = products.reduce((sum, p) => sum + (p.quantity * (p.unit_price || 0)), 0);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    quantity: 0,
    unit_price: 0,
    cost_price: 0,
    supplier_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, suppliersRes] = await Promise.all([
        axios.get('/api/products'),
        axios.get('/api/suppliers')
      ]);
      setProducts(productsRes.data);
      setSuppliers(suppliersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) {
      toast.error('Name and SKU are required');
      return;
    }

    try {
      if (editingProduct) {
        await axios.put(`/api/products/${editingProduct.id}`, formData);
        toast.success('Product updated successfully');
      } else {
        await axios.post('/api/products', formData);
        toast.success('Product added successfully');
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({ name: '', sku: '', description: '', category: '', quantity: 0, unit_price: '', cost_price: '', supplier_id: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(error.response?.data?.error || 'Failed to save product');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData(product);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!isAdmin) return;
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`/api/products/${id}`);
        toast.success('Product deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (!isAdmin) return;
    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) {
      try {
        await Promise.all(selectedProducts.map(id => axios.delete(`/api/products/${id}`)));
        toast.success(`${selectedProducts.length} products deleted successfully`);
        setSelectedProducts([]);
        fetchData();
      } catch (error) {
        console.error('Error deleting products:', error);
        toast.error('Failed to delete products');
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
        <div className="flex space-x-2">
          {isAdmin && selectedProducts.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Delete Selected ({selectedProducts.length})
            </button>
          )}
          <button
            onClick={() => {
              setEditingProduct(null);
              setFormData({ name: '', sku: '', description: '', category: '', quantity: 0, unit_price: 0, cost_price: 0, supplier_id: '' });
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 animate-slide-in hover:-translate-y-1">
          <p className="text-sm font-medium text-gray-600">Total Products</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalProducts}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 animate-slide-in hover:-translate-y-1" style={{ animationDelay: '100ms' }}>
          <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">{lowStockCount}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 animate-slide-in hover:-translate-y-1" style={{ animationDelay: '200ms' }}>
          <p className="text-sm font-medium text-gray-600">Total Stock Value</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">₦{totalStockValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="relative animate-slide-in" style={{ animationDelay: '300ms' }}>
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowSearchSuggestions(e.target.value.length > 0);
          }}
          onFocus={() => setShowSearchSuggestions(searchTerm.length > 0)}
          onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-soft"
        />
        {showSearchSuggestions && searchTerm.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-10 max-h-60 overflow-y-auto animate-scale-in">
            {filteredProducts.slice(0, 5).map((product) => (
              <div
                key={product.id}
                onClick={() => {
                  setSearchTerm(product.name);
                  setShowSearchSuggestions(false);
                }}
                className="px-4 py-3 hover:bg-gradient-to-r from-gray-50 to-gray-100 cursor-pointer transition-colors border-b border-gray-100 last:border-0"
              >
                <div className="font-medium text-gray-900">{product.name}</div>
                <div className="text-sm text-gray-500">{product.sku} - {product.unit_price ? `₦${product.unit_price.toFixed(2)}` : 'No price'}</div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="px-4 py-3 text-gray-500">No products found</div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden animate-slide-in" style={{ animationDelay: '400ms' }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-gray-50">
            <tr>
              {isAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
              {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                {isAdmin && (
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts([...selectedProducts, product.id]);
                        } else {
                          setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                        }
                      }}
                      className="rounded"
                    />
                  </td>
                )}
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{product.name}</div>
                  <div className="text-sm text-gray-500">{product.description}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">{product.sku}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    {product.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-semibold ${product.quantity < 10 ? 'text-red-600' : 'text-green-600'}`}>
                    {product.quantity}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-900">{product.unit_price ? `₦${product.unit_price.toFixed(2)}` : '-'}</td>
                <td className="px-6 py-4 text-gray-600">{product.supplier_name || '-'}</td>
                {isAdmin && (
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Supplier</label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
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
                  {editingProduct ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
