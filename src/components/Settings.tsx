
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Trash2, Beaker, Users, CheckCircle, Lock, Unlock, AlertTriangle, Loader } from 'lucide-react';
import { getSettings, saveSettings, saveCustomersBulk, getAreas, deleteTestCustomers, deleteAllData } from '../services/db';
import { AppSettings, Customer } from '../types';
import { showAlert } from '../lib/alert';
import { showConfirm } from '../lib/confirm';

const DEV_PASSWORD = 'fortest1234';

export default function Settings() {
  const [formData, setFormData] = useState<AppSettings>({
    companyName: '',
    companyAddress: '',
    companyMobile: '',
    billFooterNote: '',
  });
  const [showSuccess, setShowSuccess] = useState(false);

  // Developer tools state
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [devPasswordInput, setDevPasswordInput] = useState('');
  const [devPasswordError, setDevPasswordError] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null); // which action is running

  useEffect(() => {
    const loadData = async () => {
      const settings = await getSettings();
      setFormData(settings);
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings(formData);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // --- Dev password ---
  const handleDevUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (devPasswordInput === DEV_PASSWORD) {
      setDevUnlocked(true);
      setDevPasswordInput('');
      setDevPasswordError(false);
    } else {
      setDevPasswordError(true);
      setDevPasswordInput('');
      setTimeout(() => setDevPasswordError(false), 2000);
    }
  };

  // --- Add 150 test customers across up to 3 areas ---
  const handleAddTestCustomers = async () => {
    setProcessing('add');
    try {
      const areas = await getAreas();
      if (!areas || areas.length === 0) {
        await showAlert('Please add at least one Area first before adding test customers.');
        return;
      }

      const testAreas = areas.slice(0, 3);
      const total = 150;
      const perArea = Math.floor(total / testAreas.length);
      const remainder = total % testAreas.length;

      const landmarks = ['Near Temple', 'Opposite Park', 'Beside Market', 'Main Gate', 'Water Tank'];
      const hindiLandmarks = ['मंदिर के पास', 'पार्क के सामने', 'मार्केट के बगल में', 'मेन गेट', 'वाटर टैंक'];
      const today = new Date().toISOString().split('T')[0];

      const testCustomers: Customer[] = [];
      let count = 0;

      for (let aIdx = 0; aIdx < testAreas.length; aIdx++) {
        const areaName = testAreas[aIdx].name;
        // Distribute remainder to first areas
        const areaCount = aIdx < remainder ? perArea + 1 : perArea;

        for (let i = 0; i < areaCount; i++) {
          count++;
          const lIdx = count % landmarks.length;
          testCustomers.push({
            id: crypto.randomUUID(),
            customerid: '',          // DB trigger will generate
            name: `Test Customer ${String(count).padStart(3, '0')}`,
            nameHindi: `टेस्ट कस्टमर ${String(count).padStart(3, '0')}`,
            area: areaName,
            address: `${count * 10}, Test Street, Block ${aIdx + 1}`,
            landmark: landmarks[lIdx],
            landmarkHindi: hindiLandmarks[lIdx],
            mobile: `9000${String(count).padStart(6, '0')}`,
            rateJar: 20,
            rateThermos: 10,
            securityDeposit: 0,
            oldDues: 0,
            startDate: today,
          });
        }
      }

      // Strip customerid so the DB trigger generates it
      const payload = testCustomers.map(({ customerid: _cid, ...rest }) => rest);
      await saveCustomersBulk(payload as Customer[]);

      await showAlert(
        `${total} test customers added across ${testAreas.length} area${testAreas.length > 1 ? 's' : ''}: ${testAreas.map(a => a.name).join(', ')}.`,
        'success'
      );
      window.location.reload();
    } finally {
      setProcessing(null);
    }
  };

  // --- Delete ONLY test customers (identified by name prefix) ---
  const handleDeleteTestCustomers = async () => {
    const ok = await showConfirm(
      'This will remove all customers named "Test Customer 001–150" and their transactions. Real customers are never affected.',
      { title: 'Delete Test Customers?', confirmLabel: 'Delete', danger: true }
    );
    if (!ok) return;
    setProcessing('deleteTest');
    try {
      const deleted = await deleteTestCustomers();
      if (deleted === 0) {
        await showAlert('No test customers found. They may have already been deleted.');
      } else {
        await showAlert(`${deleted} test customer${deleted !== 1 ? 's' : ''} deleted successfully.`, 'success');
        window.location.reload();
      }
    } finally {
      setProcessing(null);
    }
  };

  // --- Wipe everything: all customers + areas + transactions ---
  const handleCompleteCleanup = async () => {
    const first = await showConfirm(
      'This will permanently delete ALL customers, ALL transactions, and ALL areas. Your company settings will be preserved. This cannot be undone.',
      { title: 'Wipe All Data?', confirmLabel: 'Yes, Continue', cancelLabel: 'Cancel', danger: true }
    );
    if (!first) return;

    const second = await showConfirm(
      'Last chance. Are you absolutely sure you want to delete everything?',
      { title: 'Final Confirmation', confirmLabel: 'Delete Everything', cancelLabel: 'Cancel', danger: true }
    );
    if (!second) return;

    setProcessing('wipe');
    try {
      const ok = await deleteAllData();
      if (ok) {
        await showAlert('All data wiped. Customers, transactions, and areas have been deleted. Settings preserved.', 'success');
        window.location.reload();
      }
    } finally {
      setProcessing(null);
    }
  };

  const isProcessing = processing !== null;

  return (
    <div className="p-6 max-w-3xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <SettingsIcon className="text-brand-600" /> Settings
        </h1>
        <p className="text-gray-500 mt-1">Configure company details shown on printed bills.</p>
      </div>

      <div className="space-y-8">
        {/* Company Profile */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-brand-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-6 pb-2 border-b border-gray-100">Company Profile</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
                <input
                  type="text" required
                  className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-3 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
                <input
                  type="text"
                  className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-3 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                  value={formData.companyMobile}
                  onChange={(e) => setFormData({ ...formData, companyMobile: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Office Address</label>
              <input
                type="text"
                className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-3 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                value={formData.companyAddress}
                onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bill Footer Message</label>
              <input
                type="text"
                className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-3 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                value={formData.billFooterNote}
                onChange={(e) => setFormData({ ...formData, billFooterNote: e.target.value })}
              />
            </div>
            <div className="pt-4 flex items-center justify-between border-t border-gray-50 mt-6">
              <p className="text-xs text-gray-400">These details appear on all printed monthly bills.</p>
              <button
                type="submit"
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-brand-100 active:scale-95"
              >
                <Save size={18} /> Save Profile
              </button>
            </div>
          </form>
        </div>

        {/* Developer Tools */}
        <div className="border border-amber-200 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="bg-amber-50 px-6 py-4 flex items-center justify-between border-b border-amber-200">
            <div className="flex items-center gap-2">
              <Beaker size={20} className="text-amber-700" />
              <h2 className="text-base font-semibold text-amber-800">Developer Tools</h2>
            </div>
            {devUnlocked && (
              <button
                onClick={() => setDevUnlocked(false)}
                className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 font-medium px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <Lock size={14} /> Lock
              </button>
            )}
          </div>

          {/* Locked state — password gate */}
          {!devUnlocked ? (
            <div className="bg-white px-6 py-8 flex flex-col items-center gap-5">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
                <Lock size={28} className="text-amber-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-700">Developer tools are password protected</p>
                <p className="text-sm text-gray-400 mt-1">These tools modify or delete data. Enter the password to proceed.</p>
              </div>
              <form onSubmit={handleDevUnlock} className="w-full max-w-xs flex flex-col gap-3">
                <input
                  type="password"
                  placeholder="Enter developer password"
                  autoComplete="off"
                  className={`w-full rounded-lg border p-3 text-sm focus:ring-2 focus:outline-none transition-all ${
                    devPasswordError
                      ? 'border-red-400 focus:ring-red-200 bg-red-50 placeholder-red-400'
                      : 'border-gray-300 focus:ring-brand-500/20 focus:border-brand-500'
                  }`}
                  value={devPasswordInput}
                  onChange={(e) => setDevPasswordInput(e.target.value)}
                />
                {devPasswordError && (
                  <p className="text-xs text-red-500 text-center font-medium">Incorrect password. Try again.</p>
                )}
                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <Unlock size={16} /> Unlock
                </button>
              </form>
            </div>
          ) : (
            /* Unlocked state — show tools */
            <div className="bg-white px-6 py-6 space-y-4">
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                Use these tools for testing only. Actions below directly modify the database.
              </p>

              {/* Add 150 test customers */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Add 150 Test Customers</p>
                    <p className="text-xs text-gray-500 mt-0.5">Adds 150 customers named "Test Customer 001–150" distributed evenly across up to 3 areas.</p>
                  </div>
                  <button
                    onClick={handleAddTestCustomers}
                    disabled={isProcessing}
                    className="shrink-0 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 text-sm"
                  >
                    {processing === 'add' ? <Loader size={16} className="animate-spin" /> : <Users size={16} />}
                    {processing === 'add' ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </div>

              {/* Delete test customers */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Delete Test Customers</p>
                    <p className="text-xs text-gray-500 mt-0.5">Removes only customers named "Test Customer *". Real customers are never touched.</p>
                  </div>
                  <button
                    onClick={handleDeleteTestCustomers}
                    disabled={isProcessing}
                    className="shrink-0 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 text-sm"
                  >
                    {processing === 'deleteTest' ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    {processing === 'deleteTest' ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>

              {/* Complete wipe */}
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-red-800 text-sm flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Complete Data Wipe
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">Deletes ALL customers, ALL transactions, and ALL areas. Your company settings are preserved. Requires two confirmations.</p>
                  </div>
                  <button
                    onClick={handleCompleteCleanup}
                    disabled={isProcessing}
                    className="shrink-0 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 text-sm"
                  >
                    {processing === 'wipe' ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    {processing === 'wipe' ? 'Wiping…' : 'Wipe All'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSuccess && (
        <div className="fixed bottom-8 right-8 bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-300 z-50">
          <CheckCircle size={20} />
          <span className="font-bold">Settings Updated Successfully!</span>
        </div>
      )}
    </div>
  );
}
