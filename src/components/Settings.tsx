
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Trash2, Beaker, Users, CheckCircle } from 'lucide-react';
import { getSettings, saveSettings, saveCustomersBulk, generateNextCustomerId, getCustomers, deleteCustomer, getAreas, getTransactions, deleteTransaction } from '../services/db';
import { AppSettings, Customer } from '../types';

export default function Settings() {
  const [formData, setFormData] = useState<AppSettings>({
    companyName: '',
    companyAddress: '',
    companyMobile: '',
    billFooterNote: '',
    autoBackupPath: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);

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

  const handleAddTestUsers = async () => {
    const areas = await getAreas();
    if (!areas || areas.length === 0) {
      alert("Please add at least one Area first!");
      return;
    }

    const testCustomers: Customer[] = [];
    const today = new Date().toISOString().split('T')[0];
    const landmarks = ["Near Temple", "Opposite Park", "Beside Market", "Main Gate", "Water Tank"];
    const hindiLandmarks = ["मंदिर के पास", "पार्क के सामने", "मार्केट के बगल में", "मेन गेट", "वाटर टैंक"];
    
    for (let i = 1; i <= 20; i++) {
      const area = areas[Math.floor(Math.random() * areas.length)].name;
      const id = await generateNextCustomerId(today);
      const names = ["Rajesh Kumar", "Amit Sharma", "Suresh Gupta", "Priya Singh", "Anjali Verma", "Vikram Rathore", "Sunil Yadav", "Deepak Maurya", "Meena Devi", "Kavita Jha"];
      const hindiNames = ["राजेश कुमार", "अमित शर्मा", "सुरेश गुप्ता", "प्रिया सिंह", "अंजलि वर्मा", "विक्रम राठौर", "सुनील यादव", "दीपक मौर्य", "मीना देवी", "कविता झा"];
      
      const nameIdx = Math.floor(Math.random() * names.length);
      const lIdx = Math.floor(Math.random() * landmarks.length);

      const newCust: Customer = {
        id: `${id.substring(0, 6)}${String(i).padStart(4, '0')}`, // Mocking sequence for bulk
        name: `${names[nameIdx]} ${i}`,
        nameHindi: `${hindiNames[nameIdx]} ${i}`,
        area: area,
        address: `${i * 101}, Main Street, Sector ${Math.floor(Math.random() * 50)}`,
        landmark: landmarks[lIdx],
        landmarkHindi: hindiLandmarks[lIdx],
        mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        rateJar: 20,
        rateThermos: 10,
        securityDeposit: 500,
        oldDues: Math.floor(Math.random() * 1000),
        startDate: today
      };
      testCustomers.push(newCust);
    }

    await saveCustomersBulk(testCustomers);
    alert("20 Test Customers added successfully!");
    window.location.reload();
  };

  const handleDeleteTestCustomers = async () => {
    if (!confirm("Are you sure you want to delete all 20 test customers? This action cannot be undone.")) {
      return;
    }

    try {
      const allCustomers = await getCustomers();
      const today = new Date().toISOString().split('T')[0];
      
      // Delete customers created today (test customers)
      let deletedCount = 0;
      for (const customer of allCustomers) {
        if (customer.startDate === today) {
          await deleteCustomer(customer.id);
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        alert(`${deletedCount} test customer(s) deleted successfully!`);
        window.location.reload();
      } else {
        alert("No test customers found from today to delete.");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert("Error deleting test customers: " + errorMsg);
    }
  };

  const handleCompleteCleanup = async () => {
    if (!confirm("This will DELETE all 20 test customers AND all their transaction data. This action cannot be undone. Continue?")) {
      return;
    }

    try {
      const allCustomers = await getCustomers();
      const allTransactions = await getTransactions();
      const today = new Date().toISOString().split('T')[0];
      
      // Find test customers created today
      const testCustomerIds = new Set<string>();
      for (const customer of allCustomers) {
        if (customer.startDate === today) {
          testCustomerIds.add(customer.id);
        }
      }

      if (testCustomerIds.size === 0) {
        alert("No test customers found from today to clean up.");
        return;
      }

      // Delete all transactions for test customers
      let deletedTransactions = 0;
      for (const transaction of allTransactions) {
        if (testCustomerIds.has(transaction.customerId)) {
          await deleteTransaction(transaction.id);
          deletedTransactions++;
        }
      }

      // Delete all test customers
      let deletedCustomers = 0;
      for (const customerId of testCustomerIds) {
        await deleteCustomer(customerId);
        deletedCustomers++;
      }

      alert(`Complete cleanup done!\nDeleted ${deletedCustomers} test customer(s) and ${deletedTransactions} transaction(s).`);
      window.location.reload();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert("Error during cleanup: " + errorMsg);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <SettingsIcon className="text-brand-600" /> Settings
        </h1>
        <p className="text-gray-500 mt-1">Configure company details and desktop storage.</p>
      </div>

      <div className="space-y-8">
        {/* General Settings */}
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
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
                    <input 
                    type="text" 
                    className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-3 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                    value={formData.companyMobile}
                    onChange={(e) => setFormData({...formData, companyMobile: e.target.value})}
                    />
                </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Office Address</label>
                  <input 
                  type="text" 
                  className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-3 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                  value={formData.companyAddress}
                  onChange={(e) => setFormData({...formData, companyAddress: e.target.value})}
                  />
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bill Footer Message</label>
                  <input 
                  type="text" 
                  className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-3 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                  value={formData.billFooterNote}
                  onChange={(e) => setFormData({...formData, billFooterNote: e.target.value})}
                  />
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-gray-50 mt-6">
                <p className="text-xs text-gray-400">These details appear on printed monthly bills.</p>
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
        <div className="bg-amber-50 border border-amber-200 p-8 rounded-xl">
           <h2 className="text-lg font-semibold text-amber-800 mb-2 flex items-center gap-2">
             <Beaker size={20} /> Developer Tools
           </h2>
           <p className="text-amber-700 text-sm mb-6">Use these tools for testing the application with sample data.</p>
           
           <div className="space-y-3">
             <button 
               onClick={handleAddTestUsers}
               className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
             >
               <Users size={18} /> Add 20 Test Customers
             </button>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               <button 
                 onClick={handleDeleteTestCustomers}
                 className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
               >
                 <Trash2 size={18} /> Delete Customers Only
               </button>
               
               <button 
                 onClick={handleCompleteCleanup}
                 className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
               >
                 <Trash2 size={18} /> Complete Cleanup
               </button>
             </div>
           </div>
           <p className="text-[10px] text-amber-600 mt-3 italic font-medium">💡 Tip: "Complete Cleanup" removes customers AND all their transactions for a fully clean slate.</p>
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
