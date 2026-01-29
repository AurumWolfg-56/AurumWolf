
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Transaction } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

import { parseSupabaseData } from '../lib/supabaseSafe';
import { TransactionSchema } from '../lib/validators';

interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (tx: Transaction) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<boolean>;
  refreshTransactions: () => Promise<void>;
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
        // Map snake_case (DB) to camelCase (Internal Type) BEFORE validation
        // casting as any[] to allow mapping
        const candidates = (data || []).map((row: any) => ({
          ...row,
          accountId: row.account_id,
          numericAmount: Number(row.amount), // Coerce to number
          business_id: row.business_id,
          // Recurring fields
          isRecurring: row.is_recurring,
          recurringFrequency: row.recurring_frequency,
          nextRecurringDate: row.next_recurring_date,
          recurringEndDate: row.recurring_end_date,
          // Metadata
          ...row.metadata
        }));

        // Validate the mapped objects against our internal Schema
        const validTransactions = parseSupabaseData(TransactionSchema, candidates, []) as Transaction[];

        setTransactions(validTransactions);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [user]);

  const addTransaction = async (tx: Transaction) => {
    // 1. Optimistic Update
    const prevTransactions = [...transactions];
    setTransactions(prev => [tx, ...prev]);

    if (!user) return;

    try {
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
      if (error) throw error;
    } catch (err) {
      console.error("Error adding transaction:", err);
      setTransactions(prevTransactions);
    }
  };

  const updateTransaction = async (tx: Transaction) => {
    const prevTransactions = [...transactions];
    setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));

    if (!user) return;

    try {
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
      if (error) throw error;
    } catch (err) {
      console.error("Error updating transaction:", err);
      setTransactions(prevTransactions);
    }
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    const prevTransactions = [...transactions];
    setTransactions(prev => prev.filter(t => t.id !== id));

    if (!user) return false;

    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error deleting transaction:", err);
      setTransactions(prevTransactions);
      return false;
    }
  };

  const refreshTransactions = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
    } else {
      const candidates = (data || []).map((row: any) => ({
        ...row,
        accountId: row.account_id,
        numericAmount: Number(row.amount),
        business_id: row.business_id,
        isRecurring: row.is_recurring,
        recurringFrequency: row.recurring_frequency,
        nextRecurringDate: row.next_recurring_date,
        recurringEndDate: row.recurring_end_date,
        ...row.metadata
      }));

      const validTransactions = parseSupabaseData(TransactionSchema, candidates, []) as Transaction[];
      setTransactions(validTransactions);
    }
    setLoading(false);
  };

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
