import { useEffect, useRef, useState } from 'react';
import { Printer, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ReceiptPrinter = ({ sale, onClose }) => {
  const receiptRef = useRef(null);
  const { user } = useAuth();
  const [businessSettings, setBusinessSettings] = useState(null);

  useEffect(() => {
    fetchBusinessSettings();
  }, []);

  const fetchBusinessSettings = async () => {
    try {
      const response = await axios.get('/api/business-settings');
      setBusinessSettings(response.data);
    } catch (error) {
      console.error('Error fetching business settings:', error);
    }
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              padding: 20px;
              margin: 0;
              width: 280px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
            }
            .logo {
              max-width: 80px;
              max-height: 80px;
              margin-bottom: 10px;
            }
            .business-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .business-details {
              font-size: 10px;
              margin-bottom: 5px;
            }
            .receipt-title {
              text-align: center;
              font-weight: bold;
              margin: 10px 0;
            }
            .sale-info {
              margin-bottom: 15px;
              font-size: 10px;
            }
            .items {
              margin-bottom: 15px;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
              font-size: 11px;
            }
            .item-name {
              flex: 1;
            }
            .item-qty {
              width: 30px;
              text-align: center;
            }
            .item-total {
              width: 60px;
              text-align: right;
            }
            .totals {
              border-top: 2px dashed #000;
              padding-top: 10px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .grand-total {
              font-weight: bold;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              border-top: 2px dashed #000;
              padding-top: 10px;
              font-size: 10px;
            }
            .thank-you {
              font-weight: bold;
              margin-bottom: 5px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    onClose();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Receipt</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={receiptRef} className="p-6 bg-white">
          {/* Receipt Header */}
          <div className="text-center mb-6">
            {businessSettings?.logo_url && (
              <img
                src={businessSettings.logo_url}
                alt="Logo"
                className="w-20 h-20 object-contain mx-auto mb-3"
              />
            )}
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {businessSettings?.business_name || 'Business Name'}
            </h3>
            {businessSettings?.address && (
              <p className="text-xs text-gray-600 mb-1">{businessSettings.address}</p>
            )}
            {businessSettings?.phone && (
              <p className="text-xs text-gray-600 mb-1">{businessSettings.phone}</p>
            )}
            {businessSettings?.email && (
              <p className="text-xs text-gray-600">{businessSettings.email}</p>
            )}
          </div>

          <div className="text-center border-t-2 border-dashed border-gray-300 pt-4 mb-4">
            <p className="font-bold text-sm">RECEIPT</p>
            <p className="text-xs text-gray-600">#{sale.invoice_number || sale.id}</p>
          </div>

          {/* Sale Info */}
          <div className="text-xs text-gray-600 mb-4 space-y-1">
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDate(sale.sale_date || sale.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Served by:</span>
              <span>{user?.name || 'Staff'}</span>
            </div>
            {sale.customer_name && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{sale.customer_name}</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="border-t-2 border-dashed border-gray-300 pt-4 mb-4">
            <div className="flex justify-between text-xs font-bold text-gray-700 mb-2">
              <span className="flex-1">Item</span>
              <span className="w-12 text-center">Qty</span>
              <span className="w-20 text-right">Total</span>
            </div>
            {(sale.items || sale.sale_items || []).map((item, index) => (
              <div key={index} className="flex justify-between text-xs mb-2">
                <span className="flex-1 font-medium">{item.product_name || item.name}</span>
                <span className="w-12 text-center">{item.quantity}</span>
                <span className="w-20 text-right">
                  {businessSettings?.currency_symbol || '₦'}{(item.total || item.quantity * item.unit_price).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t-2 border-dashed border-gray-300 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{businessSettings?.currency_symbol || '₦'}{(sale.subtotal || sale.total).toFixed(2)}</span>
            </div>
            {sale.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>{businessSettings?.currency_symbol || '₦'}{sale.tax.toFixed(2)}</span>
              </div>
            )}
            {sale.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount:</span>
                <span>-{businessSettings?.currency_symbol || '₦'}{sale.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total:</span>
              <span>{businessSettings?.currency_symbol || '₦'}{sale.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Info */}
          {sale.payment_method && (
            <div className="mt-4 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-medium">{sale.payment_method}</span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-300 text-center">
            <p className="font-bold text-sm mb-2">Thank you for your business!</p>
            <p className="text-xs text-gray-600">Please come again</p>
            {businessSettings?.phone && (
              <p className="text-xs text-gray-600 mt-2">Contact: {businessSettings.phone}</p>
            )}
          </div>
        </div>

        {/* Print Button */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl hover:from-primary-700 hover:to-secondary-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Printer className="w-5 h-5 mr-2" />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPrinter;
