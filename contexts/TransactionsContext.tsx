
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Transaction } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (tx: Transaction) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  refreshTransactions: (txs: Transaction[]) => void;
  loading: boolean;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const TransactionsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
      } else {
        const mapped: Transaction[] = (data || []).map((row: any) => ({
          ...row,
          accountId: row.account_id,
          numericAmount: Number(row.amount),
          business_id: row.business_id,
          // Map snake_case used in DB to camelCase if needed, or update types. 
          // Types: accountId, numericAmount, isRecurring, recurringFrequency, nextRecurringDate, recurringEndDate
          isRecurring: row.is_recurring,
          recurringFrequency: row.recurring_frequency,
          nextRecurringDate: row.next_recurring_date,
          recurringEndDate: row.recurring_end_date,
          // Ensure metadata is spread if used
          ...row.metadata
        }));
        setTransactions(mapped);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [user]);

  const addTransaction = async (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);

    if (user) {
      const dbPayload = {
        id: tx.id,
        user_id: user.id,
        account_id: tx.accountId,
        name: tx.name,
        amount: tx.numericAmount,
        currency: tx.currency,
        date: tx.date,
        category: tx.category,
        type: tx.type,
        status: tx.status,
        is_recurring: tx.isRecurring,
        recurring_frequency: tx.recurringFrequency,
        next_recurring_date: tx.nextRecurringDate,
        recurring_end_date: tx.recurringEndDate,
        business_id: tx.business_id,
        // Store extra fields in metadata if they don't have columns
        metadata: {
          splits: tx.splits,
          description: tx.description,
          accountCurrency: tx.accountCurrency,
          foreignAmount: tx.foreignAmount,
          exchangeRate: tx.exchangeRate
        }
      };

      const { error } = await supabase.from('transactions').insert(dbPayload);
      if (error) console.error("Error adding transaction:", error);
    }
  };

  const updateTransaction = async (tx: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));

    if (user) {
      const dbPayload = {
        account_id: tx.accountId,
        name: tx.name,
        amount: tx.numericAmount,
        currency: tx.currency,
        date: tx.date,
        category: tx.category,
        type: tx.type,
        status: tx.status,
        is_recurring: tx.isRecurring,
        recurring_frequency: tx.recurringFrequency,
        next_recurring_date: tx.nextRecurringDate,
        recurring_end_date: tx.recurringEndDate,
        business_id: tx.business_id,
        metadata: {
          splits: tx.splits,
          description: tx.description,
          accountCurrency: tx.accountCurrency,
          foreignAmount: tx.foreignAmount,
          exchangeRate: tx.exchangeRate
        }
      };

      const { error } = await supabase.from('transactions').update(dbPayload).eq('id', tx.id);
      if (error) console.error("Error updating transaction:", error);
    }
  };

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));

    if (user) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) console.error("Error deleting transaction:", error);
    }
  };

  const refreshTransactions = (txs: Transaction[]) => setTransactions(txs);

  return (
    <TransactionsContext.Provider value={{ transactions, addTransaction, updateTransaction, deleteTransaction, refreshTransactions, loading }}>
      {children}
    </TransactionsContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionsContext);
  if (!context) throw new Error('useTransactions must be used within a TransactionsProvider');
  return context;
};
