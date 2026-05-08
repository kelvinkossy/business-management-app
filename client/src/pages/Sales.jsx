import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, ShoppingCart, Trash2, Printer, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import ReceiptPrinter from '../components/ReceiptPrinter';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerBalances, setCustomerBalances] = useState({});
  const [businessSettings, setBusinessSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Calculate sales stats
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const creditSales = sales.filter(s => s.payment_method === 'credit').length;

  const [saleItems, setSaleItems] = useState([]);
  const [manualItems, setManualItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [isManualSale, setIsManualSale] = useState(false);
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [isQuickSale, setIsQuickSale] = useState(false);

  const [manualItem, setManualItem] = useState({ item_name: '', quantity: 1, unit_price: 0 });
  const [quickSaleAmount, setQuickSaleAmount] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salesRes, productsRes, customersRes, settingsRes] = await Promise.all([
        axios.get('/api/sales'),
        axios.get('/api/products'),
        axios.get('/api/customers'),
        axios.get('/api/business-settings')
      ]);
      setSales(salesRes.data);
      setProducts(productsRes.data);
      setCustomers(customersRes.data);
      setBusinessSettings(settingsRes.data);
      
      // Fetch customer balances
      const balancePromises = customersRes.data.map(customer => 
        axios.get(`/api/customers/${customer.id}/balance`)
      );
      const balanceResponses = await Promise.all(balancePromises);
      const balanceMap = {};
      customersRes.data.forEach((customer, index) => {
        balanceMap[customer.id] = balanceResponses[index].data.balance;
      });
      setCustomerBalances(balanceMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToSale = (product) => {
    if (product.quantity <= 0) {
      alert('Product out of stock');
      return;
    }
    const existing = saleItems.find(item => item.product_id === product.id);
    if (existing) {
      setSaleItems(saleItems.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unit_price }
          : item
      ));
    } else {
      setSaleItems([...saleItems, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.unit_price,
        total: product.unit_price
      }]);
    }
  };

  const removeFromSale = (index) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const addManualItem = () => {
    if (!manualItem.item_name || manualItem.unit_price <= 0) {
      alert('Please fill in item details');
      return;
    }
    setManualItems([...manualItems, {
      ...manualItem,
      total: manualItem.quantity * manualItem.unit_price
    }]);
    setManualItem({ item_name: '', quantity: 1, unit_price: 0 });
  };

  const removeManualItem = (index) => {
    setManualItems(manualItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const itemsTotal = saleItems.reduce((sum, item) => sum + item.total, 0);
    const manualTotal = manualItems.reduce((sum, item) => sum + item.total, 0);
    const subtotal = itemsTotal + manualTotal;
    const tax = subtotal * 0.1;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { subtotal, tax, total } = calculateTotals();

    // For quick sales (admin only), bypass item requirements
    if (isAdmin && isQuickSale) {
      if (quickSaleAmount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      try {
        const saleResponse = await axios.post('/api/sales', {
          customer_id: selectedCustomer || null,
          items: [],
          manualItems: [{ item_name: 'Quick Sale', quantity: 1, unit_price: quickSaleAmount, total: quickSaleAmount }],
          subtotal: quickSaleAmount,
          tax: 0,
          total: quickSaleAmount,
          payment_method: paymentMethod,
          notes: notes || 'Quick Sale',
          is_manual: true
        });
        toast.success('Quick sale recorded successfully');
        resetForm();
        setShowModal(false);
        fetchData();
      } catch (error) {
        console.error('Error creating quick sale:', error);
        toast.error(error.response?.data?.error || 'Failed to create quick sale');
      }
      return;
    }

    if (saleItems.length === 0 && manualItems.length === 0) {
      toast.error('Please add items to the sale');
      return;
    }

    if (isCreditSale && !selectedCustomer) {
      toast.error('Customer must be selected for credit sales');
      return;
    }

    try {
      const saleResponse = await axios.post('/api/sales', {
        customer_id: selectedCustomer || null,
        items: saleItems,
        manualItems: manualItems,
        subtotal,
        tax,
        discount: 0,
        total,
        payment_method: isCreditSale ? 'credit' : paymentMethod,
        notes,
        is_manual: isManualSale
      });

      // If it's a credit sale, create a debt entry
      if (isCreditSale && selectedCustomer) {
        await axios.post('/api/customer-debts', {
          customer_id: selectedCustomer,
          sale_id: saleResponse.data.id,
          type: 'debt',
          amount: total,
          description: `Sale #${saleResponse.data.id}`
        });
      }

      toast.success(isCreditSale ? 'Credit sale recorded successfully' : 'Sale completed successfully');
      setShowModal(false);
      setSaleItems([]);
      setManualItems([]);
      setSelectedCustomer('');
      setNotes('');
      setIsCreditSale(false);
      setIsQuickSale(false);
      setQuickSaleAmount(0);
      fetchData();
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error(error.response?.data?.error || 'Error creating sale');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    if (paymentData.amount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    try {
      await axios.post('/api/customer-debts/payment', {
        customer_id: selectedCustomer.id,
        amount: paymentData.amount,
        description: paymentData.description || 'Payment'
      });
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentData({ amount: 0, description: '' });
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.error || 'Failed to record payment');
    }
  };

  const printReceipt = (sale) => {
    setSelectedSale(sale);
    setShowReceipt(true);
  };

  const printInvoice = (sale) => {
    setSelectedSale(sale);
    setShowReceipt(true);
  };

  if (loading) return <LoadingSpinner />;

  const { subtotal, tax, total } = calculateTotals();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Sales</h1>
        <button
          onClick={() => {
            setSaleItems([]);
            setManualItems([]);
            setSelectedCustomer('');
            setNotes('');
            setIsCreditSale(false);
            setIsManualSale(false);
            setIsQuickSale(false);
            setQuickSaleAmount(0);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Sale
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 animate-slide-in hover:-translate-y-1">
          <p className="text-sm font-medium text-gray-600">Total Sales</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalSales}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 animate-slide-in hover:-translate-y-1" style={{ animationDelay: '100ms' }}>
          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">₦{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 animate-slide-in hover:-translate-y-1" style={{ animationDelay: '200ms' }}>
          <p className="text-sm font-medium text-gray-600">Credit Sales</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">{creditSales}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden animate-slide-in" style={{ animationDelay: '300ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gradient-to-r from-gray-50 to-blue-50 transition-colors">
                  <td className="px-6 py-4 text-gray-600 font-medium">#{sale.id}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{sale.customer_name || 'Walk-in'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">₦{sale.total.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-700 rounded-full text-xs font-semibold capitalize">
                      {sale.payment_method || 'Cash'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {sale.is_manual ? (
                      <span className="px-3 py-1 bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 rounded-full text-xs font-semibold">Manual</span>
                    ) : (
                      <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 rounded-full text-xs font-semibold">System</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => printInvoice(sale)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title="Print Invoice"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => printReceipt(sale)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                        title="Print Receipt"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">New Sale</h2>
            {isAdmin && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isQuickSale}
                    onChange={(e) => setIsQuickSale(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium">Quick Sale (Enter amount directly)</span>
                </label>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isAdmin && isQuickSale ? (
                <div>
                  <label className="block text-sm font-medium mb-2">Sale Amount (₦)</label>
                  <input
                    type="number"
                    value={quickSaleAmount}
                    onChange={(e) => setQuickSaleAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                    step="0.01"
                    required
                    placeholder="Enter amount"
                  />
                </div>
              ) : (
                <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Customer</label>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Walk-in</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} (₦{(customerBalances[customer.id] || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                  {selectedCustomer && (
                    <p className="text-xs mt-1 text-gray-600">
                      Balance: <span className={customerBalances[selectedCustomer] > 0 ? 'text-red-600' : 'text-green-600'}>
                        ₦{(customerBalances[selectedCustomer] || 0).toFixed(2)}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <select
                    value={isCreditSale ? 'credit' : paymentMethod}
                    onChange={(e) => {
                      if (e.target.value === 'credit') {
                        setIsCreditSale(true);
                      } else {
                        setIsCreditSale(false);
                        setPaymentMethod(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="transfer">Bank Transfer</option>
                    <option value="credit">Credit (Debt)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>

              {isAdmin && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="manualSale"
                    checked={isManualSale}
                    onChange={(e) => setIsManualSale(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="manualSale" className="text-sm font-medium">
                    Manual Sale (Admin Only - not linked to inventory)
                  </label>
                </div>
              )}

              {!isManualSale && (
                <div>
                  <label className="block text-sm font-medium mb-2">Add Products</label>
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {products.filter(p => p.quantity > 0).map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addToSale(product)}
                        className="p-2 border rounded-lg hover:bg-blue-50 text-left text-sm"
                      >
                        <div className="font-medium">{product.name}</div>
                        <div className="text-gray-500">₦{product.unit_price.toFixed(2)} | Stock: {product.quantity}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isAdmin && isManualSale && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Manual Items (Admin)</h3>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Item name"
                      value={manualItem.item_name}
                      onChange={(e) => setManualItem({ ...manualItem, item_name: e.target.value })}
                      className="px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={manualItem.quantity}
                      onChange={(e) => setManualItem({ ...manualItem, quantity: parseInt(e.target.value) })}
                      className="px-3 py-2 border rounded-lg"
                      min="1"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={manualItem.unit_price}
                      onChange={(e) => setManualItem({ ...manualItem, unit_price: parseFloat(e.target.value) })}
                      className="px-3 py-2 border rounded-lg"
                      step="0.01"
                    />
                    <button
                      type="button"
                      onClick={addManualItem}
                      className="bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-1">
                    {manualItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                        <span>{item.item_name} x{item.quantity}</span>
                        <div className="flex items-center space-x-2">
                          <span>₦{item.total.toFixed(2)}</span>
                          <button type="button" onClick={() => removeManualItem(index)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Cart Items</h3>
                {saleItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded mb-1">
                    <span>{item.product_name} x{item.quantity}</span>
                    <div className="flex items-center space-x-2">
                      <span>₦{item.total.toFixed(2)}</span>
                      <button type="button" onClick={() => removeFromSale(index)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₦{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (10%):</span>
                  <span>₦{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>₦{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSaleItems([]);
                    setManualItems([]);
                    setSelectedCustomer('');
                    setNotes('');
                    setIsCreditSale(false);
                    setIsManualSale(false);
                    setIsQuickSale(false);
                    setQuickSaleAmount(0);
                    setShowModal(false);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Complete Sale
                </button>
              </div>
              </>
              )}
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

export default Sales;
