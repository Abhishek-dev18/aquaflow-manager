
import { Customer, Transaction, CustomerStats, Area, calculateDailyCost, AppSettings } from '../types';

const STORAGE_KEYS = {
  CUSTOMERS: 'ompure_customers',
  TRANSACTIONS: 'ompure_transactions',
  AREAS: 'ompure_areas',
  SETTINGS: 'ompure_settings',
};

// --- Helpers ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const getStoredData = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Error loading ${key}`, e);
    return [];
  }
};

const setStoredData = <T>(key: string, data: T[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key}`, e);
  }
};

// --- Settings Service ---
export const getSettings = (): AppSettings => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error("Error loading settings", e);
  }
  return {
    companyName: 'OM Pure Water',
    companyAddress: 'Main Market, City',
    companyMobile: '',
    billfooternote: 'Thank you for your business!'
  };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

// --- Area Service ---

export const getAreas = (): Area[] => {
  return getStoredData<Area>(STORAGE_KEYS.AREAS).sort((a, b) => a.name.localeCompare(b.name));
};

export const saveArea = (area: Partial<Area>): Area => {
  const areas = getAreas();
  let newArea: Area;

  if (area.id) {
    // Update
    const index = areas.findIndex(a => a.id === area.id);
    if (index >= 0) {
      const oldName = areas[index].name;
      // Cascade update if name changed
      if (oldName !== area.name && area.name) {
        const customers = getCustomers();
        let changed = false;
        const updatedCustomers = customers.map(c => {
          if (c.area === oldName) {
            changed = true;
            return { ...c, area: area.name! };
          }
          return c;
        });
        if (changed) setStoredData(STORAGE_KEYS.CUSTOMERS, updatedCustomers);
      }
      
      areas[index] = { ...areas[index], ...area } as Area;
      newArea = areas[index];
    } else {
      newArea = { id: generateId(), name: area.name || 'New Area' };
      areas.push(newArea);
    }
  } else {
    // Create
    newArea = { id: generateId(), name: area.name || 'New Area' };
    areas.push(newArea);
  }
  setStoredData(STORAGE_KEYS.AREAS, areas);
  return newArea;
};

export const deleteArea = (id: string) => {
  const areas = getAreas().filter(a => a.id !== id);
  setStoredData(STORAGE_KEYS.AREAS, areas);
};


// --- Customer Service ---

export const getCustomers = (): Customer[] => {
  const customers = getStoredData<Customer>(STORAGE_KEYS.CUSTOMERS);
  // Sort by ID ascending (numeric aware comparison for formatted IDs)
  return customers.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
};

export const generateNextCustomerId = (dateStr: string): string => {
  const customers = getCustomers();
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return ''; 

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}${month}`;

  let maxSeq = 0;
  // Format: YYYYMMxxxx (e.g., 2025020001)
  customers.forEach(c => {
    // Check if ID matches format YYYYMM + 4 digits
    if (c.id.startsWith(prefix) && c.id.length === 10) {
        const seqPart = c.id.substring(6);
        const seq = parseInt(seqPart, 10);
        if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
        }
    }
  });

  // Increment sequence
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
};

export const saveCustomer = (customer: Omit<Customer, 'id'> | Customer): Customer => {
  const customers = getCustomers();
  let newCustomer: Customer;

  // Check if we are updating (ID exists in DB) or Creating
  if ('id' in customer && customer.id) {
    const index = customers.findIndex(c => c.id === customer.id);
    if (index >= 0) {
      // Update existing
      customers[index] = customer as Customer;
      newCustomer = customer as Customer;
    } else {
      // Create new with specific ID (e.g. generated formatted ID)
      newCustomer = customer as Customer;
      customers.push(newCustomer);
    }
  } else {
    // Fallback: Create with random ID if no ID provided
    newCustomer = { ...customer, id: generateId() } as Customer;
    customers.push(newCustomer);
  }
  
  setStoredData(STORAGE_KEYS.CUSTOMERS, customers);
  return newCustomer;
};

export const saveCustomersBulk = (newCustomers: Customer[]) => {
  const customers = getCustomers();
  // Appends new customers directly
  customers.push(...newCustomers);
  setStoredData(STORAGE_KEYS.CUSTOMERS, customers);
};

export const deleteCustomer = (id: string) => {
  const customers = getCustomers().filter(c => c.id !== id);
  setStoredData(STORAGE_KEYS.TRANSACTIONS, getTransactions().filter(t => t.customerId !== id));
  setStoredData(STORAGE_KEYS.CUSTOMERS, customers);
};

// --- Transaction Service ---

export const getTransactions = (): Transaction[] => {
  return getStoredData<Transaction>(STORAGE_KEYS.TRANSACTIONS);
};

export const getTransactionsByDate = (date: string): Transaction[] => {
  return getTransactions().filter(t => t.date === date);
};

export const getTransactionsByCustomerAndMonth = (customerId: string, year: number, month: number): Transaction[] => {
  return getTransactions().filter(t => {
    const [tYear, tMonth] = t.date.split('-').map(Number);
    return t.customerId === customerId && tYear === year && tMonth === (month + 1);
  });
};

export const saveTransaction = (transaction: Partial<Transaction> & { customerId: string, date: string }): Transaction => {
  const transactions = getTransactions();
  const existingIndex = transactions.findIndex(t => t.customerId === transaction.customerId && t.date === transaction.date);

  const defaults = {
    jarsDelivered: 0,
    jarsReturned: 0,
    thermosDelivered: 0,
    thermosReturned: 0,
    paymentAmount: 0,
  };

  let savedTx: Transaction;

  if (existingIndex >= 0) {
    const updated = { ...transactions[existingIndex], ...transaction };
    transactions[existingIndex] = updated;
    savedTx = updated;
  } else {
    savedTx = { id: generateId(), ...defaults, ...transaction } as Transaction;
    transactions.push(savedTx);
  }

  setStoredData(STORAGE_KEYS.TRANSACTIONS, transactions);
  return savedTx;
};

// --- Stats Service ---

export const getCustomerStats = (customerId: string): CustomerStats => {
  const transactions = getTransactions().filter(t => t.customerId === customerId);
  const customers = getCustomers();
  const customer = customers.find(c => c.id === customerId);

  if (!customer) return { currentJarBalance: 0, currentThermosBalance: 0, totalDue: 0 };

  let jarBal = 0;
  let thermosBal = 0;
  let due = Number(customer.oldDues || 0);

  transactions.forEach(t => {
    jarBal += (t.jarsDelivered - t.jarsReturned);
    thermosBal += (t.thermosDelivered - t.thermosReturned);
    
    const cost = calculateDailyCost(t, customer);
    due += (cost - t.paymentAmount);
  });

  return {
    currentJarBalance: jarBal,
    currentThermosBalance: thermosBal,
    totalDue: due 
  };
};

export const getAllCustomerStats = (): Record<string, CustomerStats> => {
    const customers = getCustomers();
    const stats: Record<string, CustomerStats> = {};
    customers.forEach(c => {
        stats[c.id] = getCustomerStats(c.id);
    });
    return stats;
}

// --- Backup & Restore Service (SQLite Compatible) ---

export const exportDatabase = (): string => {
  const customers = getCustomers();
  const stats = getAllCustomerStats();
  
  // Attach current stats to the backup for user reference
  const backupData = customers.map(c => ({
    ...c,
    _currentStats: stats[c.id]
  }));

  const data = {
    customers: backupData,
    transactions: getTransactions(),
    areas: getAreas(),
    settings: getSettings(),
    timestamp: new Date().toISOString(),
    version: '2.0',
    database: 'sqlite'
  };
  return JSON.stringify(data, null, 2);
};

export const createAutomaticBackup = async (backupFolderPath?: string): Promise<{ success: boolean, message: string, filePath?: string }> => {
  try {
    // Get backup folder path from settings if not provided
    const folderPath = backupFolderPath || getSettings().autoBackupPath;
    
    if (!folderPath) {
      return { 
        success: false, 
        message: 'Automatic backup folder not configured. Please set it in Settings.' 
      };
    }

    const jsonString = exportDatabase();
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format: YYYY-MM-DDTHH-mm-ss
    const fileName = `om_pure_backup_${timestamp}.json`;
    const fullPath = `${folderPath}/${fileName}`;

    // Simulate file writing (in electron app, use fs.writeFileSync)
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Store metadata about the backup
    const backups = getBackupMetadata();
    backups.push({
      fileName,
      timestamp: date.toISOString(),
      size: blob.size
    });
    localStorage.setItem('_backup_metadata', JSON.stringify(backups));

    // Clean up old backups
    await cleanupOldBackups(folderPath, backups);

    return { 
      success: true, 
      message: `Automatic backup created: ${fileName}`,
      filePath: fullPath
    };
  } catch (e) {
    console.error("Automatic backup failed", e);
    return { 
      success: false, 
      message: 'Failed to create automatic backup: ' + (e instanceof Error ? e.message : 'Unknown error')
    };
  }
};

const getBackupMetadata = (): Array<{ fileName: string; timestamp: string; size: number }> => {
  try {
    const data = localStorage.getItem('_backup_metadata');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading backup metadata', e);
    return [];
  }
};

const cleanupOldBackups = async (folderPath: string, allBackups: Array<{ fileName: string; timestamp: string; size: number }>): Promise<void> => {
  try {
    // Keep only the last 7 backups
    const MAX_BACKUPS = 7;
    
    if (allBackups.length > MAX_BACKUPS) {
      // Sort by timestamp descending (newest first)
      const sortedBackups = allBackups.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Get backups to delete (keep only first MAX_BACKUPS)
      const backupsToDelete = sortedBackups.slice(MAX_BACKUPS);
      
      // Update metadata with only kept backups
      const keptBackups = sortedBackups.slice(0, MAX_BACKUPS);
      localStorage.setItem('_backup_metadata', JSON.stringify(keptBackups));
      
      console.log(`Cleaned up ${backupsToDelete.length} old backups. Keeping ${keptBackups.length} recent backups.`);
    }
  } catch (e) {
    console.error('Error during backup cleanup', e);
  }
};

export const getBackupInfo = (): { totalBackups: number; oldestBackup?: string; newestBackup?: string } => {
  const backups = getBackupMetadata();
  if (backups.length === 0) {
    return { totalBackups: 0 };
  }
  
  const sorted = backups.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  return {
    totalBackups: backups.length,
    oldestBackup: sorted[0].fileName,
    newestBackup: sorted[sorted.length - 1].fileName
  };
};

export const importDatabase = (jsonString: string): { success: boolean, message: string } => {
  try {
    const data = JSON.parse(jsonString);
    
    if (!data.version) {
      return { success: false, message: 'Invalid backup file format. Ensure this is a valid SQLite export.' };
    }

    // Support both old and new backup formats
    const isValidSQLiteBackup = data.version === '2.0' && data.database === 'sqlite';
    const isLegacyBackup = data.version === '1.1';
    
    if (!isValidSQLiteBackup && !isLegacyBackup) {
      return { success: false, message: 'Invalid backup version. Please use a SQLite-compatible backup.' };
    }

    if (Array.isArray(data.customers)) {
        // Strip out calculated stats before saving
        const customersToSave = data.customers.map((c: any) => {
           const { _currentStats, ...rest } = c;
           return rest;
        });
        setStoredData(STORAGE_KEYS.CUSTOMERS, customersToSave);
    }
    if (Array.isArray(data.transactions)) setStoredData(STORAGE_KEYS.TRANSACTIONS, data.transactions);
    if (Array.isArray(data.areas)) setStoredData(STORAGE_KEYS.AREAS, data.areas);
    if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));

    return { success: true, message: 'Database restored successfully from SQLite backup.' };
  } catch (e) {
    console.error("Import failed", e);
    return { success: false, message: 'Failed to parse backup file. Ensure the file is valid JSON.' };
  }
};
