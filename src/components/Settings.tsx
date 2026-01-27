
import React, { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Save, Database, Trash2, Upload, RefreshCw, FolderDown, FolderOpen, HardDrive, ShieldCheck, Beaker, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { getSettings, saveSettings, saveCustomersBulk, generateNextCustomerId, getCustomers, deleteCustomer, saveArea, getAreas, exportDatabase, importDatabase, createAutomaticBackup, getBackupInfo, getTransactions, deleteTransaction } from '../services/db';
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
  const [backupInfo, setBackupInfo] = useState({ totalBackups: 0 });
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePickDirectory = async (type: 'backup') => {
    try {
      if ('showDirectoryPicker' in window) {
        const handle = await (window as any).showDirectoryPicker();
        const pathLabel = handle.name || "Selected Folder";
        setFormData(prev => ({
          ...prev,
          autoBackupPath: pathLabel
        }));
      } else {
        throw new Error("Not supported");
      }
    } catch (err: any) {
      console.warn("Directory picker restricted or unsupported:", err);
      alert("Browser security restricted the automatic folder picker. Please type the folder path manually in the input box.");
    }
  };

  const handleDownloadBackup = async () => {
    const jsonString = exportDatabase();
    const date = new Date().toISOString().split('T')[0];
    const fileName = `om_pure_backup_${date}.json`;

    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("WARNING: This will OVERWRITE all current data. Are you sure?")) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const response = importDatabase(result);
      if (response.success) {
        alert("Data restored successfully! Reloading...");
        window.location.reload();
      } else {
        alert("Error: " + response.message);
      }
    };
    reader.readAsText(file);
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
      console.error("Error deleting test customers:", err);
      alert("Error deleting test customers. Please try again.");
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
        if (testCustomerIds.has(transaction.customer_id)) {
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
      console.error("Error during complete cleanup:", err);
      alert("Error during cleanup. Please try again.");
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

        {/* Desktop & Storage Configuration */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-brand-100 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <HardDrive size={120} />
           </div>
           
           <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
             <HardDrive className="text-brand-600" size={20} /> Backup Settings
           </h2>
           <p className="text-sm text-gray-500 mb-6 max-w-md">
             Configure the automatic backup folder for SQLite database backups. Use "Browse" or type the path manually.
           </p>

           <div className="space-y-6">
              {/* Backup Path */}
              <div className="space-y-2">
                 <label className="block text-sm font-bold text-gray-700">Automatic Backup Folder</label>
                 <div className="flex gap-2">
                    <div className="flex-1 relative">
                       <input 
                         type="text"
                         placeholder="D:\Backups\OM Pure"
                         className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-sm text-gray-600 font-mono outline-none focus:ring-2 focus:ring-brand-500/20"
                         value={formData.autoBackupPath || ''}
                         onChange={(e) => setFormData({...formData, autoBackupPath: e.target.value})}
                       />
                       <ShieldCheck size={14} className="absolute left-3 top-4 text-brand-500 shrink-0" />
                    </div>
                    <button 
                       onClick={() => handlePickDirectory('backup')}
                       className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 rounded-lg flex items-center gap-2 font-medium transition-colors border border-gray-200"
                    >
                      Browse
                    </button>
                 </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-700 leading-relaxed">
                  <strong>Note:</strong> SQLite database files are managed automatically by the application. Use this folder to store automatic backups. Browser security might block the "Browse" button, so you can <strong>type or paste</strong> the absolute path directly.
                </p>
              </div>

              {/* Backup Status Info */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-green-800 mb-1">Automatic Backup Status</p>
                    <p className="text-xs text-green-700">
                      {backupInfo.totalBackups > 0 
                        ? `${backupInfo.totalBackups} backup(s) stored. Latest: ${backupInfo.newestBackup}`
                        : 'No backups yet. Backups will be created automatically when you close or exit the application.'}
                    </p>
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      💡 Tip: Only the last 7 backups are kept to save storage space.
                    </p>
                  </div>
                </div>
              </div>

              {/* Manual Backup Test Button */}
              <button
                onClick={async () => {
                  setIsCreatingBackup(true);
                  const result = await createAutomaticBackup();
                  setBackupMessage(result.message);
                  setBackupInfo(getBackupInfo());
                  setIsCreatingBackup(false);
                  setTimeout(() => setBackupMessage(''), 5000);
                }}
                disabled={isCreatingBackup || !formData.autoBackupPath}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-100 active:scale-95"
              >
                <RefreshCw size={18} className={isCreatingBackup ? 'animate-spin' : ''} />
                {isCreatingBackup ? 'Creating Backup...' : 'Create Backup Now'}
              </button>

              {backupMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  backupMessage.includes('created') 
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}>
                  {backupMessage}
                </div>
              )}
           </div>
        </div>

        {/* Database Actions */}
        <div className="bg-slate-800 text-white p-8 rounded-xl shadow-xl">
           <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
             <Database size={20} className="text-brand-400" /> Maintenance & Tools
           </h2>
           <p className="text-slate-400 text-sm mb-8">Export current session data or restore from a file.</p>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={handleDownloadBackup}
                className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 border border-white/10 px-6 py-4 rounded-xl font-bold transition-all group"
              >
                <FolderDown size={22} className="text-brand-400 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <div className="text-sm">Manual Backup</div>
                  <div className="text-[10px] text-slate-500 font-normal uppercase tracking-wider">Download .JSON</div>
                </div>
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 border border-white/10 px-6 py-4 rounded-xl font-bold transition-all group"
              >
                <Upload size={22} className="text-brand-400 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <div className="text-sm">Restore Data</div>
                  <div className="text-[10px] text-slate-500 font-normal uppercase tracking-wider">Import .JSON File</div>
                </div>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleRestoreBackup} accept=".json" className="hidden" />
           </div>
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
          <ShieldCheck size={20} />
          <span className="font-bold">Settings Updated Successfully!</span>
        </div>
      )}
    </div>
  );
}
