/**
 * Database Service - Supabase Integration
 * 
 * MIGRATION: Replace all localStorage calls with Supabase async functions.
 * See DEPLOYMENT.md for complete setup instructions.
 * 
 * Security: All functions use auth-protected Supabase queries with RLS.
 */

import { supabase } from '../lib/supabase';
import { Customer, Transaction, Area, AppSettings, CustomerStats, calculateDailyCost } from '../types';

// ===== CUSTOMERS =====

export const getCustomers = async (): Promise<Customer[]> => {
  try {
    const { data, error } = await supabase.from('customers').select('*').order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch customers:', err);
    return [];
  }
};

export const saveCustomer = async (customer: Omit<Customer, 'id'> | Customer): Promise<Customer | null> => {
  try {
    const isUpdate = 'id' in customer && customer.id;
    const query = isUpdate
      ? supabase.from('customers').update(customer).eq('id', customer.id)
      : supabase.from('customers').insert([customer]);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to save customer:', err);
    return null;
  }
};

export const deleteCustomer = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to delete customer:', err);
    return false;
  }
};

export const generateNextCustomerId = async (dateStr: string): Promise<string> => {
  try {
    const customers = await getCustomers();
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}${month}`;
    let maxSeq = 0;
    customers.forEach(c => {
      if (c.id.startsWith(prefix) && c.id.length === 10) {
        const seq = parseInt(c.id.substring(6), 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    });
    return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
  } catch (err) {
    console.error('Failed to generate customer ID:', err);
    return '';
  }
};

export const getCustomerStats = async (customerId: string): Promise<CustomerStats> => {
  try {
    const transactions = await getTransactionsByCustomerId(customerId);
    const customers = await getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return { currentJarBalance: 0, currentThermosBalance: 0, totalDue: 0 };
    
    let jarBal = 0, thermosBal = 0, due = Number(customer.oldDues || 0);
    transactions.forEach(t => {
      jarBal += (t.jarsDelivered - t.jarsReturned);
      thermosBal += (t.thermosDelivered - t.thermosReturned);
      const cost = calculateDailyCost(t, customer);
      due += (cost - t.paymentAmount);
    });
    return { currentJarBalance: jarBal, currentThermosBalance: thermosBal, totalDue: due };
  } catch (err) {
    console.error('Failed to get customer stats:', err);
    return { currentJarBalance: 0, currentThermosBalance: 0, totalDue: 0 };
  }
};

export const getAllCustomerStats = async (): Promise<Record<string, CustomerStats>> => {
  try {
    const customers = await getCustomers();
    const stats: Record<string, CustomerStats> = {};
    for (const c of customers) {
      stats[c.id] = await getCustomerStats(c.id);
    }
    return stats;
  } catch (err) {
    console.error('Failed to get all customer stats:', err);
    return {};
  }
};

// ===== TRANSACTIONS =====

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch transactions:', err);
    return [];
  }
};

export const getTransactionsByCustomerId = async (customerId: string): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase.from('transactions').select('*').eq('customerId', customerId);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch transactions by customer:', err);
    return [];
  }
};

export const getTransactionsByDate = async (date: string): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase.from('transactions').select('*').eq('date', date);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch transactions by date:', err);
    return [];
  }
};

export const getTransactionsByCustomerAndMonth = async (
  customerId: string,
  year: number,
  month: number
): Promise<Transaction[]> => {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('customerId', customerId)
      .gte('date', startDate)
      .lt('date', endDate);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch transactions by customer and month:', err);
    return [];
  }
};

export const saveTransaction = async (
  transaction: Partial<Transaction> & { customerId: string; date: string }
): Promise<Transaction | null> => {
  try {
    const defaults = {
      jarsDelivered: 0,
      jarsReturned: 0,
      thermosDelivered: 0,
      thermosReturned: 0,
      paymentAmount: 0,
    };
    const data = { ...defaults, ...transaction };
    const isUpdate = transaction.id;
    const query = isUpdate
      ? supabase.from('transactions').update(data).eq('id', transaction.id)
      : supabase.from('transactions').insert([data]);
    const { data: result, error } = await query.select().single();
    if (error) throw error;
    return result;
  } catch (err) {
    console.error('Failed to save transaction:', err);
    return null;
  }
};

// ===== AREAS =====

export const getAreas = async (): Promise<Area[]> => {
  try {
    const { data, error } = await supabase.from('areas').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch areas:', err);
    return [];
  }
};

export const saveArea = async (area: Partial<Area>): Promise<Area | null> => {
  try {
    const isUpdate = area.id;
    const query = isUpdate
      ? supabase.from('areas').update(area).eq('id', area.id)
      : supabase.from('areas').insert([area]);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to save area:', err);
    return null;
  }
};

export const deleteArea = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('areas').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to delete area:', err);
    return false;
  }
};

// ===== SETTINGS =====

export const getSettings = async (): Promise<AppSettings> => {
  try {
    const { data, error } = await supabase.from('app_settings').select('*').single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || {
      companyName: 'OMPure Water',
      companyAddress: '',
      companyMobile: '',
      billFooterNote: 'Thank you for your business!',
    };
  } catch (err) {
    console.error('Failed to fetch settings:', err);
    return {
      companyName: 'OMPure Water',
      companyAddress: '',
      companyMobile: '',
      billFooterNote: 'Thank you for your business!',
    };
  }
};

export const saveSettings = async (settings: AppSettings): Promise<boolean> => {
  try {
    const { error } = await supabase.from('app_settings').upsert(settings, { onConflict: 'id' }).select();
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to save settings:', err);
    return false;
  }
};

// ===== STUB FUNCTIONS FOR BACKWARD COMPATIBILITY =====
// These are deprecated - use Supabase directly in components

export const exportDatabase = (): string => {
  console.warn('exportDatabase is deprecated - use Supabase exports instead');
  return JSON.stringify({ message: 'Use Supabase dashboard for data exports' });
};

export const importDatabase = (jsonString: string): { success: boolean; message: string } => {
  console.warn('importDatabase is deprecated - use Supabase imports instead');
  return { success: false, message: 'Import not supported - use Supabase restore feature' };
};

export const createAutomaticBackup = async (backupFolderPath?: string): Promise<{ success: boolean; message: string; filePath?: string }> => {
  console.warn('createAutomaticBackup is deprecated - Supabase handles backups automatically');
  return { success: true, message: 'Supabase provides automatic backups' };
};

export const getBackupInfo = (): { totalBackups: number; oldestBackup?: string; newestBackup?: string } => {
  console.warn('getBackupInfo is deprecated - check Supabase dashboard for backup info');
  return { totalBackups: 0 };
};

export const saveCustomersBulk = async (newCustomers: Customer[]): Promise<void> => {
  try {
    const { error } = await supabase.from('customers').insert(newCustomers);
    if (error) throw error;
  } catch (err) {
    console.error('Failed to save customers in bulk:', err);
  }
};

export const deleteTransaction = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to delete transaction:', err);
    return false;
  }
};

