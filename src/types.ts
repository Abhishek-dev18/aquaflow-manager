
export interface Customer {
  id: string;
  name: string;
  name_hindi?: string;
  area: string;
  address: string; 
  landmark: string;
  landmark_hindi?: string;
  mobile: string;
  rate_jar: number;
  rate_thermos: number;
  security_deposit: number;
  old_dues: number;
  start_date: string;
}

export interface Area {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  customer_id: string;
  date: string; // YYYY-MM-DD
  jars_delivered: number;
  jars_returned: number;
  thermos_delivered: number;
  thermos_returned: number;
  amount: number;
}

export interface CustomerStats {
  currentJarBalance: number;
  currentThermosBalance: number;
  totalDue: number;
}

export interface AppSettings {
  company_name: string;
  company_address: string;
  company_mobile: string;
  bill_footer_note: string;
  auto_backup_path?: string;  // Path for Automatic Backups
}

export const calculateDailyCost = (t: Transaction, c: Customer): number => {
  return (t.jars_delivered * c.rate_jar) + (t.thermos_delivered * c.rate_thermos);
};
