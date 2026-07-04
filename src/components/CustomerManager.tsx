
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, MapPin, Phone, Package, AlertCircle, Hash, Languages, CheckCircle } from 'lucide-react';
import JarLoader from './JarLoader';
import { Customer, Area } from '../types';
import { getCustomers, saveCustomer, deleteCustomer, getAllCustomerStats, getAreas } from '../services/db';
import { showAlert } from '../lib/alert';

const CustomerManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Toast Notification State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Transliteration Timer Refs
  const nameTimeoutRef = useRef<any>(null);
  const landmarkTimeoutRef = useRef<any>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Customer>>({
    id: '', // UUID - will be generated on save for new customers
    customerid: '',
    name: '', nameHindi: '', area: '', landmark: '', landmarkHindi: '', address: '', mobile: '', 
    rateJar: 20, rateThermos: 20, securityDeposit: 0, oldDues: 0, startDate: new Date().toISOString().split('T')[0]
  });

  const [stats, setStats] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterArea, setFilterArea] = useState<string>('All');

  const loadData = async () => {
    const data = await getCustomers();
    const areasData = await getAreas();
    setCustomers(data);
    setAreas(areasData || []);

    try {
      const newStats = await getAllCustomerStats();
      setStats(newStats);
    } catch (err) {
      setStats({});
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto dismiss notification after 2 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  // No client-side generation of customerid; DB will assign on insert

  const transliterate = async (text: string, callback: (hindi: string) => void) => {
    if (!text.trim()) {
      callback('');
      return;
    }
    try {
      const response = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=hi-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`);
      const data = await response.json();
      if (data && data[0] === 'SUCCESS' && data[1]?.[0]?.[1]?.[0]) {
         callback(data[1][0][1][0]);
      }
    } catch (err) {
      showAlert('Transliteration failed: ' + err);
    }
  };

  // Handle Name Change with Transliteration
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, name: val }));
    if (nameTimeoutRef.current) clearTimeout(nameTimeoutRef.current);
    nameTimeoutRef.current = setTimeout(() => {
      transliterate(val, (hindi) => setFormData(prev => ({ ...prev, nameHindi: hindi })));
    }, 300);
  };

  // Handle Landmark Change with Transliteration
  const handleLandmarkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, landmark: val }));
    if (landmarkTimeoutRef.current) clearTimeout(landmarkTimeoutRef.current);
    landmarkTimeoutRef.current = setTimeout(() => {
      transliterate(val, (hindi) => setFormData(prev => ({ ...prev, landmarkHindi: hindi })));
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a clean payload with only valid Customer properties
    const cleanPayload: Partial<Customer> = {
      id: editingId || formData.id || '',
      customerid: formData.customerid || '',
      name: formData.name || '',
      nameHindi: formData.nameHindi || '',
      area: formData.area || '',
      landmark: formData.landmark || '',
      landmarkHindi: formData.landmarkHindi || '',
      address: formData.address || '',
      mobile: formData.mobile || '',
      rateJar: formData.rateJar ?? 20,
      rateThermos: formData.rateThermos ?? 10,
      securityDeposit: formData.securityDeposit ?? 0,
      oldDues: formData.oldDues ?? 0,
      startDate: formData.startDate || new Date().toISOString().split('T')[0]
    };
    
    // Safety check for empty area
    if (!cleanPayload.area) {
      showNotification("Please select an Area.", "error");
      return;
    }

    try {
      await saveCustomer(cleanPayload as Customer);
      // Determine if it's a new customer or update
      const isNewCustomer = !editingId;
      const notificationMessage = isNewCustomer
        ? `${cleanPayload.name} Added`
        : `${cleanPayload.name} Updated`;
      
      showNotification(notificationMessage, 'success');
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ 
        id: '', customerid: '', name: '', nameHindi: '', area: '', landmark: '', landmarkHindi: '', address: '', mobile: '', 
        rateJar: 20, rateThermos: 20, securityDeposit: 0, oldDues: 0, startDate: new Date().toISOString().split('T')[0] 
      });
      loadData();
    } catch (err) {
      showNotification('Failed to save customer', 'error');
    }
  };

  const handleEdit = (c: Customer) => {
    setFormData(c);
    setEditingId(c.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      try {
        const name = customers.find(c => c.id === deleteConfirmId)?.name || 'Customer';
        await deleteCustomer(deleteConfirmId);
        showNotification(`${name} Deleted`, 'success');
        setDeleteConfirmId(null);
        await loadData();
      } catch (err) {
        showNotification('Failed to delete customer', 'error');
      }
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const openNewModal = async () => {
    setEditingId(null);
    const today = new Date().toISOString().split('T')[0];
    
    setFormData(prev => ({ 
      ...prev, 
      id: '', // Will be generated by DB on save
      customerid: '',
      name: '', nameHindi: '', landmark: '', landmarkHindi: '', address: '', mobile: '', 
      // Reset area or default to first
      area: areas.length > 0 ? areas[0].name : '',
      rateJar: 20, rateThermos: 20, securityDeposit: 0, oldDues: 0,
      startDate: today
    }));
    setIsModalOpen(true);
  }

  // Filter customers by search term and area, then group by area
  const filteredCustomers = customers.filter(c => {
    const areaMatch = filterArea === 'All' || (c.area || '') === filterArea;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return areaMatch;
    const hay = (
      (c.name || '') + ' ' + (c.nameHindi || '') + ' ' + (c.customerid || '') + ' ' + (c.mobile || '') + ' ' + (c.landmark || '') + ' ' + (c.address || '')
    ).toLowerCase();
    return areaMatch && hay.includes(q);
  });

  const groupedCustomers = filteredCustomers.reduce((acc, curr) => {
    const area = curr.area || 'Unassigned';
    if (!acc[area]) acc[area] = [];
    acc[area].push(curr);
    return acc;
  }, {} as Record<string, Customer[]>);

  if (loading) return <JarLoader />;

  return (
    <div className="p-6">
      {/* Toast Notification */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
            notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}
          style={{
            animation: 'slideInUp 0.3s ease-out forwards'
          }}
        >
          {notification.type === 'success' ? (
            <CheckCircle size={20} className="flex-shrink-0" />
          ) : (
            <AlertCircle size={20} className="flex-shrink-0" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Customer Management</h1>
        <button 
          onClick={openNewModal}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={20} /> Add Customer
        </button>
      </div>
      
      {/* Search and Area Filter */}
      <div className="flex gap-3 items-center mb-6">
        <div className="flex-1">
          <input
            type="search"
            placeholder="Search by name, ID, mobile, address..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-2.5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
          />
        </div>
        <div className="w-56">
          <select
            value={filterArea}
            onChange={e => setFilterArea(e.target.value)}
            className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-2.5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
          >
            <option value="All">All Areas</option>
            {areas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
          </select>
        </div>
      </div>
      
      {customers.length === 0 && (
         <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 mb-6">
            <div className="mx-auto w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center text-brand-500 mb-3">
              <Package size={24} />
            </div>
            <p className="text-gray-500">No customers found.</p>
            {areas.length === 0 && (
              <p className="text-sm text-red-500 mt-2 font-medium">Please add Areas in the "Areas" section first.</p>
            )}
         </div>
      )}

      {Object.entries(groupedCustomers).map(([area, areaCustomers]: [string, Customer[]]) => (
        <div key={area} className="mb-8">
          <h2 className="text-lg font-bold text-brand-700 mb-3 border-b border-brand-100 pb-2 flex items-center gap-2">
            <MapPin size={18} className="text-brand-500" /> {area}
            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{areaCustomers.length}</span>
          </h2>
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-brand-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-brand-800 uppercase tracking-wider">ID / Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-brand-800 uppercase tracking-wider">Address / Landmark</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-brand-800 uppercase tracking-wider">Rates</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-brand-800 uppercase tracking-wider">Deposit</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-brand-800 uppercase tracking-wider">Balances</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-brand-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {areaCustomers.map(customer => {
                  const s = stats[customer.id] || { currentJarBalance: 0, currentThermosBalance: 0, totalDue: 0 };
                  return (
                    <tr key={customer.id} className="hover:bg-brand-50/30 transition-colors">
                      <td className="px-4 py-2">
                        <div className="text-[10px] text-brand-500 font-mono mb-1">{customer.customerid}</div>
                        <div className="font-semibold text-gray-800">{customer.name}</div>
                        {customer.nameHindi && <div className="text-sm text-gray-600 font-hindi">{customer.nameHindi}</div>}
                        <div className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Phone size={12}/> {customer.mobile}</div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 max-w-xs">
                         <div className="font-medium text-gray-700">{customer.landmark}</div>
                         {customer.landmarkHindi && <div className="text-xs text-gray-400 font-hindi mt-0.5">{customer.landmarkHindi}</div>}
                         {customer.address && <div className="text-xs text-gray-400 mt-0.5 truncate" title={customer.address}>{customer.address}</div>}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <div className="flex gap-2"><span className="text-gray-400 text-xs w-12">Jar:</span> ₹{customer.rateJar}</div>
                        <div className="flex gap-2"><span className="text-gray-400 text-xs w-12">Thermos:</span> ₹{customer.rateThermos}</div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">₹{customer.securityDeposit}</td>
                      <td className="px-4 py-2 text-sm">
                         <div className="flex flex-col gap-1">
                           <span className={s.currentJarBalance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                             Jar: {s.currentJarBalance}
                           </span>
                           <span className={s.currentThermosBalance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                             Thermos: {s.currentThermosBalance}
                           </span>
                           <span className={s.totalDue > 0 ? 'text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded w-fit' : 'text-gray-600'}>
                             Due: ₹{s.totalDue}
                           </span>
                         </div>
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium">
                        <button onClick={() => handleEdit(customer)} className="text-brand-600 hover:text-brand-800 mr-3 p-1 hover:bg-brand-50 rounded"><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(customer.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl border-t-8 border-brand-500 animate-in fade-in zoom-in duration-200 overflow-visible">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              {editingId ? <Edit2 size={24} className="text-brand-500"/> : <Plus size={24} className="text-brand-500"/>}
              {editingId ? 'Edit Customer' : 'Add New Customer'}
              {editingId && (
                <span className="ml-4 inline-flex items-center font-mono text-sm text-brand-700 bg-brand-50 px-3 py-1 rounded-lg border border-brand-100">
                  <Hash size={14} className="mr-2" /> {formData.customerid}
                </span>
              )}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name (English)</label>
                  <input required type="text" 
                    className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-2.5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder-gray-300" 
                    placeholder="Full name"
                    value={formData.name} 
                    onChange={handleNameChange}
                  />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1"><Languages size={14}/> Name (Hindi)</label>
                  <input type="text" 
                    className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-2.5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder-gray-300 font-hindi" 
                    placeholder="नाम हिंदी में"
                    value={formData.nameHindi || ''} onChange={e => setFormData({...formData, nameHindi: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile</label>
                  <input required type="tel" inputMode="numeric" maxLength={10} pattern="[0-9]{10}"
                    className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-2.5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder-gray-300"
                    placeholder="10 digit number"
                    value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g, '')})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Area</label>
                  {areas.length > 0 ? (
                    <select
                      required
                      className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-2.5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                      value={formData.area}
                      onChange={e => setFormData({...formData, area: e.target.value})}
                    >
                      <option value="" disabled>Select Area</option>
                      {areas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                    </select>
                  ) : (
                    <div className="text-sm text-red-500 border border-red-200 bg-red-50 p-2.5 rounded-lg flex items-center gap-2">
                      <AlertCircle size={16}/> No Areas found.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1.5">Landmark (English)</label>
                   <input type="text"
                    className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-2.5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder-gray-300"
                    placeholder="Nearby..."
                    value={formData.landmark} onChange={handleLandmarkChange} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1"><Languages size={14}/> Landmark (Hindi)</label>
                   <input type="text"
                    className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-2.5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder-gray-300 font-hindi"
                    placeholder="लैंडमार्क हिंदी में"
                    value={formData.landmarkHindi || ''} onChange={e => setFormData({...formData, landmarkHindi: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Address</label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-2.5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder-gray-300"
                  placeholder="House No, Street, details..."
                  value={formData.address || ''}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>

              {/* Pricing & Security - all 4 in one row */}
              <div className="bg-white p-4 rounded-xl border border-brand-100 shadow-sm relative">
                <div className="absolute -top-3 left-3 bg-white px-2 text-xs font-bold text-brand-600 uppercase tracking-wider">Pricing & Security</div>
                <div className="grid grid-cols-4 gap-4 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Jar Rate</label>
                    <div className="relative group">
                      <span className="absolute left-3 top-2.5 text-gray-400 text-xs">₹</span>
                      <input type="number" min="0"
                        className="pl-6 w-full rounded-lg border-gray-200 bg-white border p-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-gray-700"
                        value={formData.rateJar || 20} onChange={e => setFormData({...formData, rateJar: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Thermos Rate</label>
                    <div className="relative group">
                      <span className="absolute left-3 top-2.5 text-gray-400 text-xs">₹</span>
                      <input type="number" min="0"
                        className="pl-6 w-full rounded-lg border-gray-200 bg-white border p-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-gray-700"
                        value={formData.rateThermos || 20} onChange={e => setFormData({...formData, rateThermos: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Security</label>
                    <div className="relative group">
                      <span className="absolute left-3 top-2.5 text-gray-400 text-xs">₹</span>
                      <input type="number" min="0"
                        className="pl-6 w-full rounded-lg border-gray-200 bg-white border p-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-gray-700"
                        value={formData.securityDeposit || 0} onChange={e => setFormData({...formData, securityDeposit: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Old Dues</label>
                    <input type="number" min="0"
                      className="w-full rounded-lg border-gray-200 bg-white border p-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-gray-700"
                      value={formData.oldDues || 0} onChange={e => setFormData({...formData, oldDues: Number(e.target.value)})} />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 items-start gap-4 mt-6 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                  <input type="date"
                    className="w-48 rounded-lg border-gray-300 bg-white shadow-sm border p-2.5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-gray-600"
                    value={formData.startDate || new Date().toISOString().split('T')[0]}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
                <div className="flex justify-end">
                  <div className="bg-white border border-gray-100 rounded-lg px-3 py-2 shadow-sm flex items-center gap-3 mt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors font-medium">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 shadow transition-all transform active:scale-95 font-medium">Save</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-3 rounded-t-3xl">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Delete Customer</h2>
            </div>

            {/* Content */}
            <div className="px-4 py-4">
              <p className="text-gray-700 leading-relaxed">
                This will remove the customer from all records. This action cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-3 rounded-b-3xl">
              <button
                onClick={cancelDelete}
                className="px-4 py-2.5 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
