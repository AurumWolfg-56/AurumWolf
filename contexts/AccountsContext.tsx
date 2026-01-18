
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Account } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
        const mapped: Account[] = (data || []).map((row: any) => ({
          ...row,
          isFrozen: row.is_frozen,
          creditDetails: row.credit_details,
          businessDetails: row.business_details,
          linked_business_id: row.linked_business_id,
          balance: Number(row.balance)
        }));
        setAccounts(mapped);
      }
      setLoading(false);
    };

    fetchAccounts();
  }, [user]);

  const addAccount = async (account: Account) => {
    setAccounts(prev => [...prev, account]);

    if (user) {
      const dbPayload = {
        id: account.id,
        user_id: user.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        currency: account.currency,
        institution: account.institution,
        color: account.color,
        is_frozen: account.isFrozen,
        credit_details: account.creditDetails,

        business_details: account.businessDetails,
        linked_business_id: account.linked_business_id
      };

      const { error } = await supabase.from('accounts').insert(dbPayload);
      if (error) console.error("Error adding account:", error);
    }
  };

  const updateAccount = async (account: Account) => {
    setAccounts(prev => prev.map(a => a.id === account.id ? account : a));

    if (user) {
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
        linked_business_id: account.linked_business_id
      };

      const { error } = await supabase.from('accounts').update(dbPayload).eq('id', account.id);
      if (error) console.error("Error updating account:", error);
    }
  };

  const deleteAccount = async (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));

    if (user) {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) console.error("Error deleting account:", error);
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
