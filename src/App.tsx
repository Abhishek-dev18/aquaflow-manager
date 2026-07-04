/**
 * OMPure Water - Main Application
 * SECURITY: All access requires authentication.
 * Route protection is enforced via AuthProvider.
 * Row Level Security (RLS) on Supabase handles data access control.
 */

import React, { useState, useEffect } from 'react';
import { Users, ClipboardList, Receipt, LayoutDashboard, Menu, MapPin, Settings as SettingsIcon, FileSpreadsheet, BarChart3, LogOut, Wallet, Droplets } from 'lucide-react';
import CustomerManager from './components/CustomerManager';
import SupplySheet from './components/SupplySheet';
import Billing from './components/Billing';
import Dashboard from './components/Dashboard';
import AreaManager from './components/AreaManager';
import Settings from './components/Settings';
import SupplyChart from './components/SupplyChart';
import Analytics from './components/Analytics';
import Login from './components/Login';
import PaymentCollection from './components/PaymentCollection';
import Alert, { AlertType, setAlertCallback } from './components/Alert';
import ConfirmModal, { ConfirmConfig } from './components/ConfirmModal';
import JarLoader from './components/JarLoader';
import { setConfirmCallback, showConfirm } from './lib/confirm';
import { useAuth } from './lib/auth';
import { logoutUser } from './lib/supabase';

// Simple Router setup
type Page = 'dashboard' | 'analytics' | 'supply' | 'billing' | 'payments' | 'customers' | 'areas' | 'settings' | 'chart';

const App: React.FC = () => {
  const { isAuthenticated, isLoading, session } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [supplySheetDirty, setSupplySheetDirty] = useState(false);
  const [showEmailPopover, setShowEmailPopover] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ message: string; type: AlertType; onClose: () => void } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);

  const handleNavigate = async (page: Page) => {
    if (currentPage === 'supply' && supplySheetDirty && page !== 'supply') {
      const confirmed = await showConfirm(
        'You have unsaved changes on the Supply Sheet. They will be lost if you leave now.',
        { title: 'Unsaved Changes', confirmLabel: 'Leave Anyway', cancelLabel: 'Stay', danger: true }
      );
      if (!confirmed) return;
    }
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  useEffect(() => {
    setAlertCallback((config) => setAlertConfig(config));
    setConfirmCallback((config) => setConfirmConfig(config));
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
      // Auth state will update automatically via AuthProvider
      setCurrentPage('dashboard');
    } catch (err) {
      console.error('Logout failed:', err);
      // Still allow logout even if it fails
      setCurrentPage('dashboard');
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <JarLoader message="Starting AquaFlow…" />
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => {}} />;
  }

  const NavItem = ({ page, icon: Icon, label }: { page: Page, icon: any, label: string }) => (
    <button
      onClick={() => handleNavigate(page)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        currentPage === page ? 'bg-brand-600 text-white shadow-md' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-600'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* Alert Modal */}
      {alertConfig && (
        <Alert
          message={alertConfig.message}
          type={alertConfig.type}
          onClose={alertConfig.onClose}
        />
      )}

      {/* Confirm Modal */}
      {confirmConfig && (
        <ConfirmModal
          {...confirmConfig}
          onConfirm={() => { confirmConfig.onConfirm(); setConfirmConfig(null); }}
          onCancel={() => { confirmConfig.onCancel(); setConfirmConfig(null); }}
        />
      )}

      {/* Sidebar - Mobile Responsive */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out shadow-lg md:shadow-none
        md:translate-x-0 md:static print:hidden
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-gray-100 bg-white">
          <span className="text-xl font-bold text-brand-600 flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
              <Droplets size={18} />
            </div>
            AquaFlow
          </span>
        </div>
        <div className="p-4 space-y-1 flex flex-col h-[calc(100%-4rem)] overflow-y-auto">
          <NavItem page="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem page="analytics" icon={BarChart3} label="Analytics" />
          <NavItem page="supply" icon={ClipboardList} label="Daily Supply" />
          <NavItem page="chart" icon={FileSpreadsheet} label="Supply Chart" />
          <NavItem page="billing" icon={Receipt} label="Billing" />
          <NavItem page="payments" icon={Wallet} label="Payments" />
          
          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Management</div>
          <NavItem page="customers" icon={Users} label="Customers" />
          <NavItem page="areas" icon={MapPin} label="Areas" />
          
          <div className="mt-auto pt-4 border-t border-gray-100 space-y-2">
             <NavItem page="settings" icon={SettingsIcon} label="Settings" />
             <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-red-500 hover:bg-red-50"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden print:h-auto print:overflow-visible">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 print:hidden">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex-1"></div>
          {/* Email avatar */}
          <div className="relative">
            <button
              onClick={() => setShowEmailPopover(v => !v)}
              className="w-9 h-9 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm flex items-center justify-center transition-colors shadow-sm"
              title={session?.user?.email ?? 'Admin'}
            >
              {(session?.user?.email?.[0] ?? 'A').toUpperCase()}
            </button>
            {showEmailPopover && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowEmailPopover(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-4 w-64 z-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Signed in as</p>
                  <p className="text-sm text-gray-700 font-medium break-all">{session?.user?.email ?? '—'}</p>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-slate-50 print:overflow-visible print:h-auto">
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'analytics' && <Analytics />}
          {currentPage === 'customers' && <CustomerManager />}
          {currentPage === 'areas' && <AreaManager />}
          {currentPage === 'supply' && <SupplySheet onDirtyChange={setSupplySheetDirty} />}
          {currentPage === 'chart' && <SupplyChart />}
          {currentPage === 'billing' && <Billing />}
          {currentPage === 'payments' && <PaymentCollection />}
          {currentPage === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
};

export default App;
