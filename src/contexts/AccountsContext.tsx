
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Account } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

import { parseSupabaseData } from '../lib/supabaseSafe';
import { AccountSchema } from '../lib/validators';

interface AccountsContextType {
  accounts: Account[];
  addAccount: (account: Account) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  refreshAccounts: (accounts: Account[]) => void;
  loading: boolean;
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

export const AccountsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const fetchAccounts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching accounts:', error);
      } else {
        const candidates = (data || []).map((row: any) => ({
          ...row,
          isFrozen: row.is_frozen,
          creditDetails: row.credit_details,
          businessDetails: row.business_details,
          linked_business_id: row.linked_business_id,
          balance: Number(row.balance)
        }));

        const validAccounts = parseSupabaseData(AccountSchema, candidates, []) as Account[];
        setAccounts(validAccounts);
      }
      setLoading(false);
    };

    fetchAccounts();
  }, [user]);

  // --- SAFE ORCHESTRATION ---

  const addAccount = async (account: Account) => {
    // 1. Optimistic Update
    const prevAccounts = [...accounts];
    setAccounts(prev => [...prev, account]);

    if (!user) return; // Local mode only

    try {
      const dbPayload = {
        id: account.id,
        user_id: user.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        currency: account.currency,
        institution: account.institution,
        color: account.color,
        is_frozen: account.isFrozen || false,
        credit_details: account.creditDetails || null,

        business_details: account.businessDetails || null,
        linked_business_id: account.linked_business_id || null,
        last4: account.last4 || null
      };

      const { error } = await supabase.from('accounts').insert(dbPayload);
      if (error) throw error;

    } catch (err) {
      console.error("Error adding account:", err);
      // Rollback
      setAccounts(prevAccounts);
      // Optional: Toast notification here if we had a toast system
      alert("Failed to save account. Please check your connection.");
    }
  };

  const updateAccount = async (account: Account) => {
    const prevAccounts = [...accounts];
    setAccounts(prev => prev.map(a => a.id === account.id ? account : a));

    if (!user) return;

    try {
      const dbPayload = {
        name: account.name,
        type: account.type,
        balance: account.balance,
        currency: account.currency,
        institution: account.institution,
        color: account.color,
        is_frozen: account.isFrozen,
        credit_details: account.creditDetails,
        business_details: account.businessDetails,
        linked_business_id: account.linked_business_id,
        last4: account.last4
      };

      const { error } = await supabase.from('accounts').update(dbPayload).eq('id', account.id);
      if (error) throw error;
    } catch (err) {
      console.error("Error updating account:", err);
      setAccounts(prevAccounts);
    }
  };

  const deleteAccount = async (id: string) => {
    const prevAccounts = [...accounts];
    setAccounts(prev => prev.filter(a => a.id !== id));

    if (!user) return;

    try {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Error deleting account:", err);
      setAccounts(prevAccounts);
    }
  };

  const refreshAccounts = (accts: Account[]) => setAccounts(accts);

  return (
    <AccountsContext.Provider value={{ accounts, addAccount, updateAccount, deleteAccount, refreshAccounts, loading }}>
      {children}
    </AccountsContext.Provider>
  );
};

export const useAccounts = () => {
  const context = useContext(AccountsContext);
  if (!context) throw new Error('useAccounts must be used within an AccountsProvider');
  return context;
};
