import React, { useState, useEffect } from 'react';
import { Sparkles, Loader, TrendingUp, Users, AlertCircle, Droplets, Package, Calendar, IndianRupee, Wallet } from 'lucide-react';
import { getCustomers, getTransactions, getTransactionsByDate, getAllCustomerStats } from '../services/db';
import { Customer, Transaction, CustomerStats } from '../types';

const Dashboard: React.FC = () => {
  const [insight, setInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  
  // Stats State
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalDue: 0,
    jarsToday: 0,
    thermosToday: 0,
    paymentToday: 0,
    jarsMonth: 0,
    thermosMonth: 0,
    paymentMonth: 0,
    activeCustomers: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      const customers = await getCustomers();
      const allTransactions = await getTransactions();
      
      // Calculate Total Due
      let totalDue = 0;
      for (const customer of customers) {
        const customerTxs = allTransactions.filter(t => t.customerId === customer.id);
        const paid = customerTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
        totalDue += Math.max(0, (customer.balance || 0) - paid);
      }
      
      // Today's Activity
      const todayStr = new Date().toISOString().split('T')[0];
      const todaysTx = allTransactions.filter(t => t.date?.startsWith(todayStr));
      
      const jarsToday = todaysTx.reduce((acc, t) => acc + (t.jarsDelivered || 0), 0);
      const thermosToday = todaysTx.reduce((acc, t) => acc + (t.thermos_delivered || 0), 0);
      const paymentToday = todaysTx.reduce((acc, t) => acc + (t.amount || 0), 0);
      
      // Monthly Activity
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthTx = allTransactions.filter(t => {
        const d = new Date(t.date || '');
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const jarsMonth = monthTx.reduce((acc, t) => acc + (t.jarsDelivered || 0), 0);
      const thermosMonth = monthTx.reduce((acc, t) => acc + (t.thermos_delivered || 0), 0);
      const paymentMonth = monthTx.reduce((acc, t) => acc + (t.amount || 0), 0);

      setStats({
        totalCustomers: customers.length,
        totalDue,
        jarsToday,
        thermosToday,
        paymentToday,
        jarsMonth,
        thermosMonth,
        paymentMonth,
        activeCustomers: customers.length
      });
    };
    
    loadStats();
  }, []);

  const handleGenerateInsight = async () => {
    setLoadingAi(true);
    const customers = getCustomers();
    const transactions = getTransactions();
    
    // Safety check for API key
    if (!process.env.API_KEY) {
       setInsight("API Key configuration required for AI analysis.");
       setLoadingAi(false);
       return;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <TrendingUp className="text-brand-600" /> Dashboard & Analytics
      </h1>

      {/* Financial Snapshot */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Financial Snapshot</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Due */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Total Outstanding</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">₹{stats.totalDue.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-500">
              <AlertCircle size={20} />
            </div>
          </div>
        </div>

        {/* Daily Collection */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Collected Today</p>
              <h3 className="text-2xl font-bold text-green-600 mt-1">₹{stats.paymentToday.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-500">
              <IndianRupee size={20} />
            </div>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Revenue (Month)</p>
              <h3 className="text-2xl font-bold text-brand-600 mt-1">₹{stats.paymentMonth.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-brand-50 rounded-lg text-brand-500">
              <Wallet size={20} />
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Total Customers</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalCustomers}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
              <Users size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Supply Overview */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Supply Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Today's Supply */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
           <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
             <Calendar size={16} className="text-brand-500"/> Today's Delivery
           </h3>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-brand-50/50 p-4 rounded-lg flex items-center gap-4">
                 <div className="bg-brand-100 text-brand-600 p-2 rounded-full">
                    <Droplets size={20}/>
                 </div>
                 <div>
                    <p className="text-xs text-gray-500 font-medium">Jars</p>
                    <p className="text-xl font-bold text-gray-800">{stats.jarsToday}</p>
                 </div>
              </div>
              <div className="bg-orange-50/50 p-4 rounded-lg flex items-center gap-4">
                 <div className="bg-orange-100 text-orange-600 p-2 rounded-full">
                    <Package size={20}/>
                 </div>
                 <div>
                    <p className="text-xs text-gray-500 font-medium">Thermos</p>
                    <p className="text-xl font-bold text-gray-800">{stats.thermosToday}</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Monthly Supply */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
           <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
             <TrendingUp size={16} className="text-brand-500"/> Monthly Performance
           </h3>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4">
                 <div className="text-brand-600">
                    <Droplets size={24}/>
                 </div>
                 <div>
                    <p className="text-xs text-gray-500 font-medium">Total Jars</p>
                    <p className="text-xl font-bold text-gray-800">{stats.jarsMonth}</p>
                 </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4">
                 <div className="text-orange-500">
                    <Package size={24}/>
                 </div>
                 <div>
                    <p className="text-xs text-gray-500 font-medium">Total Thermos</p>
                    <p className="text-xl font-bold text-gray-800">{stats.thermosMonth}</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;