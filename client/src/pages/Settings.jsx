import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Save, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const [settings, setSettings] = useState({
    business_name: '',
    logo_url: '',
    address: '',
    phone: '',
    email: '',
    tax_rate: 0,
    currency_symbol: '₦',
    invoice_prefix: 'INV',
    receipt_prefix: 'REC'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/business-settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    setSaving(true);
    try {
      await axios.put('/api/business-settings', settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logo_url: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Business Settings</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Business Logo</label>
            <div className="flex items-center space-x-4">
              {settings.logo_url && (
                <img src={settings.logo_url} alt="Logo" className="w-20 h-20 object-contain border rounded-lg" />
              )}
              <div className="flex-1">
                <label className="flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="w-5 h-5 mr-2" />
                  <span>Upload Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">Upload your business logo (PNG, JPG)</p>
              </div>
            </div>
          </div>

          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Business Name</label>
            <input
              type="text"
              value={settings.business_name}
              onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
            <textarea
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
            />
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Currency & Tax */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Currency Symbol</label>
              <input
                type="text"
                value={settings.currency_symbol}
                onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.tax_rate}
                onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Prefixes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Invoice Prefix</label>
              <input
                type="text"
                value={settings.invoice_prefix}
                onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Receipt Prefix</label>
              <input
                type="text"
                value={settings.receipt_prefix}
                onChange={(e) => setSettings({ ...settings, receipt_prefix: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Settings;
