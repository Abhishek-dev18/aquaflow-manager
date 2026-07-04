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
import { showAlert } from '../lib/alert';

// ===== CUSTOMERS =====

export const getCustomers = async (): Promise<Customer[]> => {
  try {
    const { data, error } = await supabase.from('customers').select('*').order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    showAlert('Failed to fetch customers: ' + err);
    return [];
  }
};

export const saveCustomer = async (customer: Omit<Customer, 'id'> | Customer): Promise<Customer | null> => {
  try {
    const isUpdate = typeof (customer as any).id !== 'undefined' && (customer as any).id !== null && (customer as any).id !== '';
    
    if (isUpdate) {
      // For updates, preserve the UUID and customerid
      const id = (customer as Customer).id as string;
      const { data, error } = await supabase
        .from('customers')
        .update(customer)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) {
        showAlert(`Customer with ID ${id} not found`);
        return null;
      }
      return data[0];
    } else {
      // For inserts, generate UUID for id field
      const customerWithId = {
        ...customer,
        id: (customer as any).id || crypto.randomUUID() // Generate UUID if not provided
      };

      // If customerid is empty or not provided, remove it so DB trigger can generate it
      const insertPayload: any = { ...customerWithId };
      if (!insertPayload.customerid) delete insertPayload.customerid;

      const { data, error } = await supabase
        .from('customers')
        .insert([insertPayload])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  } catch (err) {
    showAlert('Failed to save customer: ' + err);
    return null;
  }
};

export const deleteCustomer = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    showAlert('Failed to delete customer: ' + err);
    return false;
  }
};

export const getCustomerCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('customers').select('id', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    showAlert('Failed to count customers: ' + err);
    return 0;
  }
};

export const getCustomersByArea = async (area: string): Promise<Customer[]> => {
  try {
    const { data, error } = await supabase
      .from('customers').select('*').eq('area', area).order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    showAlert('Failed to fetch customers by area: ' + err);
    return [];
  }
};

export const generateNextCustomerId = async (dateStr: string): Promise<string> => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}${month}`;
    // Single targeted query — no need to load all customers
    const { data, error } = await supabase
      .from('customers').select('customerid')
      .like('customerid', `${prefix}%`)
      .order('customerid', { ascending: false })
      .limit(1);
    if (error) throw error;
    const maxSeq = data?.[0]?.customerid
      ? parseInt(data[0].customerid.substring(6), 10)
      : 0;
    return `${prefix}${String((isNaN(maxSeq) ? 0 : maxSeq) + 1).padStart(4, '0')}`;
  } catch (err) {
    showAlert('Failed to generate customer ID: ' + err);
    return '';
  }
};

export const getCustomerStats = async (customerId: string): Promise<CustomerStats> => {
  try {
    // Fetch customer and their transactions in parallel — 2 queries, not N
    const [{ data: customerData }, transactions] = await Promise.all([
      supabase.from('customers').select('*').eq('id', customerId).single(),
      getTransactionsByCustomerId(customerId),
    ]);
    const customer = customerData as Customer | null;
    if (!customer) return { currentJarBalance: 0, currentThermosBalance: 0, totalDue: 0 };

    let jarBal = 0, thermosBal = 0, due = Number(customer.oldDues || 0);
    transactions.forEach(t => {
      jarBal += (t.jarsDelivered - t.jarsReturned);
      thermosBal += (t.thermosDelivered - t.thermosReturned);
      due += calculateDailyCost(t, customer) - (t.paymentAmount || 0);
    });
    return { currentJarBalance: jarBal, currentThermosBalance: thermosBal, totalDue: due };
  } catch (err) {
    showAlert('Failed to get customer stats: ' + err);
    return { currentJarBalance: 0, currentThermosBalance: 0, totalDue: 0 };
  }
};

export const getAllCustomerStats = async (): Promise<Record<string, CustomerStats>> => {
  try {
    // 2 queries total — fetch everything, compute in-memory
    const [customers, allTransactions] = await Promise.all([
      getCustomers(),
      getTransactions(),
    ]);

    const txByCustomer: Record<string, Transaction[]> = {};
    allTransactions.forEach(t => {
      if (!txByCustomer[t.customerId]) txByCustomer[t.customerId] = [];
      txByCustomer[t.customerId].push(t);
    });

    const stats: Record<string, CustomerStats> = {};
    customers.forEach(customer => {
      const txs = txByCustomer[customer.id] || [];
      let jarBal = 0, thermosBal = 0, due = Number(customer.oldDues || 0);
      txs.forEach(t => {
        jarBal += (t.jarsDelivered - t.jarsReturned);
        thermosBal += (t.thermosDelivered - t.thermosReturned);
        due += calculateDailyCost(t, customer) - (t.paymentAmount || 0);
      });
      stats[customer.id] = { currentJarBalance: jarBal, currentThermosBalance: thermosBal, totalDue: due };
    });
    return stats;
  } catch (err) {
    showAlert('Failed to get all customer stats: ' + err);
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
    showAlert('Failed to fetch transactions: ' + err);
    return [];
  }
};

export const getTransactionsByCustomerId = async (customerId: string): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase.from('transactions').select('*').eq('customerId', customerId);
    if (error) throw error;
    return data || [];
  } catch (err) {
    showAlert('Failed to fetch transactions by customer: ' + err);
    return [];
  }
};

export const getTransactionsByDate = async (date: string): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase.from('transactions').select('*').eq('date', date);
    if (error) throw error;
    return data || [];
  } catch (err) {
    showAlert('Failed to fetch transactions by date: ' + err);
    return [];
  }
};

export const getTransactionsByDateRange = async (startDate: string, endDate: string): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase
      .from('transactions').select('*')
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    showAlert('Failed to fetch transactions by date range: ' + err);
    return [];
  }
};

export const getRecentPayments = async (limit: number): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase
      .from('transactions').select('*')
      .gt('paymentAmount', 0)
      .order('date', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (err) {
    showAlert('Failed to fetch recent payments: ' + err);
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
    showAlert('Failed to fetch transactions by customer and month: ' + err);
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
    
    if (isUpdate) {
      // For updates, use a safer approach that doesn't require .single()
      const { data: result, error } = await supabase
        .from('transactions')
        .update(data)
        .eq('id', transaction.id)
        .select();
      
      if (error) throw error;
      if (!result || result.length === 0) {
        showAlert(`Transaction with ID ${transaction.id} not found`);
        return null;
      }
      return result[0];
    } else {
      // Strip empty id so DB generates the UUID
      const { id: _id, ...insertData } = data;
      const { data: result, error } = await supabase
        .from('transactions')
        .insert([insertData])
        .select()
        .single();
      
      if (error) throw error;
      return result;
    }
  } catch (err) {
    showAlert('Failed to save transaction: ' + err);
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
    showAlert('Failed to fetch areas: ' + err);
    return [];
  }
};

export const saveArea = async (area: Partial<Area>): Promise<Area | null> => {
  try {
    const isUpdate = 'id' in area && area.id;
    
    if (isUpdate) {
      // For updates, use a safer approach that doesn't require .single()
      const { data, error } = await supabase
        .from('areas')
        .update(area)
        .eq('id', area.id)
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) {
        showAlert(`Area with ID ${area.id} not found`);
        return null;
      }
      return data[0];
    } else {
      // For inserts, database auto-generates UUID
      const { data, error } = await supabase
        .from('areas')
        .insert([area])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  } catch (err) {
    showAlert('Failed to save area: ' + err);
    return null;
  }
};

export const deleteArea = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('areas').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    showAlert('Failed to delete area: ' + err);
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
    showAlert('Failed to fetch settings: ' + err);
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
    const settingsWithId = { id: 'default', ...settings };
    const { error } = await supabase.from('app_settings').upsert(settingsWithId, { onConflict: 'id' }).select();
    if (error) throw error;
    return true;
  } catch (err) {
    showAlert('Failed to save settings: ' + err);
    return false;
  }
};

export const deleteTestCustomers = async (): Promise<number> => {
  try {
    const { data, error: countErr } = await supabase
      .from('customers').select('id').like('name', 'Test Customer %');
    if (countErr) throw countErr;
    if (!data || data.length === 0) return 0;
    const { error } = await supabase
      .from('customers').delete().like('name', 'Test Customer %');
    if (error) throw error;
    return data.length;
  } catch (err) {
    showAlert('Failed to delete test customers: ' + err);
    return 0;
  }
};

export const deleteAllData = async (): Promise<boolean> => {
  try {
    // Transactions first (cascade from customers also handles this, but be explicit)
    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // Delete all customers (cascades to transactions)
    await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // Delete all areas
    await supabase.from('areas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    return true;
  } catch (err) {
    showAlert('Failed to delete all data: ' + err);
    return false;
  }
};

export const saveCustomersBulk = async (newCustomers: Customer[]): Promise<void> => {
  try {
    const { error } = await supabase.from('customers').insert(newCustomers);
    if (error) throw error;
  } catch (err) {
    showAlert('Failed to save customers in bulk: ' + err);
  }
};

export const deleteTransaction = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    showAlert('Failed to delete transaction: ' + err);
    return false;
  }
};

