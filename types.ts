
export type NavTab = 'home' | 'accounts' | 'budget' | 'scan' | 'transactions' | 'business' | 'investments' | 'reports' | 'settings';
export type Language = 'en' | 'es';

export interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  updated_at?: string;
}

export interface CreditAccountDetails {
  limit: number;
  statementDay: number; // 1-31
  paymentDueDay: number; // 1-31
  apr?: number;
}

export interface BusinessAccountDetails {
  taxId?: string; // EIN, VAT, RFC
  entityType: 'LLC' | 'Corp' | 'Sole Prop' | 'Partnership' | 'Other';
  monthlyFee?: number;
  overdraftLimit?: number;
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'crypto' | 'business';
  balance: number;
  initialBalance?: number; // Snapshot for reconciliation
  currency: string;
  last4?: string;
  color: string; // Gradient class or hex
  institution: string;
  isFrozen?: boolean;
  creditDetails?: CreditAccountDetails;
  businessDetails?: BusinessAccountDetails;
  linked_business_id?: string; // Automatically tag transactions to this business
}

export interface BudgetCategory {
  id: string;
  category: string;
  limit: number;
  spent: number; // Calculated on frontend based on Transactions
  color: string;
  icon?: any; // Lucide Icon name or component
  type?: 'income' | 'expense';
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline?: string;
  color: string;
  icon?: any;
}

export interface TransactionSplit {
  id: string | number;
  category: string;
  amount: number;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Transaction {
  id: string; // Changed to UUID string for Supabase
  accountId: string;
  name: string; // Merchant
  amount: string; // Formatted Display string
  numericAmount: number; // The actual value affecting balance
  currency: string; // Transaction original currency

  // FX Fields
  accountCurrency?: string;
  foreignAmount?: number;
  exchangeRate?: number;

  date: string;
  category: string;
  splits?: TransactionSplit[];
  description?: string;
  type: 'credit' | 'debit';
  status: 'pending' | 'completed';
  business_id?: string; // Link to Business Entity

  // Recurring Logic
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  nextRecurringDate?: string;
  recurringEndDate?: string;
}

export interface Insight {
  id: string;
  type: 'alert' | 'opportunity' | 'info';
  title: string;
  message: string;
  action?: string;
  icon?: any;
}

// --- BUSINESS TYPES ---

export interface BusinessEntity {
  id: string;
  name: string;
  type: 'store' | 'channel' | 'subsidiary' | 'real_estate' | 'service';
  parent_id?: string;

  // Frontend Metrics (Calculated dynamically)
  metrics?: {
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
    trend: number;
  };

  // Configuration
  customMetricsConfig?: string[];
  customMetricsValues?: Record<string, number>;
}

// --- INVESTMENT TYPES ---

export type InvestmentStrategy = 'passive' | 'active';
export type InvestmentType = 'stock' | 'etf' | 'crypto' | 'real_estate' | 'bond' | 'startup' | 'commodity';

export interface Investment {
  id: string;
  name: string;
  ticker?: string;
  type: InvestmentType;
  strategy: InvestmentStrategy;

  // Position Data
  quantity: number;
  costBasis: number;
  currentPrice: number;
  currentValue: number;

  // Performance
  unrealizedPnL: number;
  roiPercent: number;

  // Metadata
  currency: string;
  lastUpdated: string;
  notes?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'critical';
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionTab?: NavTab;
  payload?: any; // For custom actions (e.g. paying a specific recurring ID)
}
