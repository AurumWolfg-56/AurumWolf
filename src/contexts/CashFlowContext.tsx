
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { PersonalLiability } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface CashFlowContextType {
  liabilities: PersonalLiability[];
  addLiability: (liability: PersonalLiability) => Promise<void>;
  updateLiability: (liability: PersonalLiability) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;
  loading: boolean;
}

const CashFlowContext = createContext<CashFlowContextType | undefined>(undefined);

export const CashFlowProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [liabilities, setLiabilities] = useState<PersonalLiability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLiabilities([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('personal_liabilities')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching liabilities:', error);
      } else {
        const mapped = (data || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          currentBalance: Number(row.current_balance),
          monthlyPayment: Number(row.monthly_payment),
          interestRate: Number(row.interest_rate),
          remainingTermMonths: Number(row.remaining_term_months),
          hasCollateral: row.has_collateral,
          collateralDescription: row.collateral_description,
          currency: row.currency,
          startDate: row.start_date,
          notes: row.notes,
        }));
        setLiabilities(mapped);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  // --- LIABILITY CRUD ---

  const addLiability = async (liability: PersonalLiability) => {
    const prevLiabilities = [...liabilities];
    setLiabilities(prev => [...prev, liability]);

    if (!user) return;

    try {
      const dbPayload = {
        id: liability.id,
        user_id: user.id,
        name: liability.name,
        type: liability.type,
        current_balance: liability.currentBalance,
        monthly_payment: liability.monthlyPayment,
        interest_rate: liability.interestRate,
        remaining_term_months: liability.remainingTermMonths,
        has_collateral: liability.hasCollateral,
        collateral_description: liability.collateralDescription || null,
        currency: liability.currency,
        start_date: liability.startDate || null,
        notes: liability.notes || null,
      };

      const { error } = await supabase.from('personal_liabilities').insert(dbPayload);
      if (error) throw error;
      toast.success('Liability added');
    } catch (err) {
      console.error('Error adding liability:', err);
      setLiabilities(prevLiabilities);
      toast.error('Failed to save liability.');
    }
  };

  const updateLiability = async (liability: PersonalLiability) => {
    const prevLiabilities = [...liabilities];
    setLiabilities(prev => prev.map(l => l.id === liability.id ? liability : l));

    if (!user) return;

    try {
      const dbPayload = {
        name: liability.name,
        type: liability.type,
        current_balance: liability.currentBalance,
        monthly_payment: liability.monthlyPayment,
        interest_rate: liability.interestRate,
        remaining_term_months: liability.remainingTermMonths,
        has_collateral: liability.hasCollateral,
        collateral_description: liability.collateralDescription || null,
        currency: liability.currency,
        start_date: liability.startDate || null,
        notes: liability.notes || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('personal_liabilities').update(dbPayload).eq('id', liability.id);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating liability:', err);
      setLiabilities(prevLiabilities);
      toast.error('Failed to update liability.');
    }
  };

  const deleteLiability = async (id: string) => {
    const prevLiabilities = [...liabilities];
    setLiabilities(prev => prev.filter(l => l.id !== id));

    if (!user) return;

    try {
      const { error } = await supabase.from('personal_liabilities').delete().eq('id', id);
      if (error) throw error;
      toast.success('Liability deleted');
    } catch (err) {
      console.error('Error deleting liability:', err);
      setLiabilities(prevLiabilities);
    }
  };

  return (
    <CashFlowContext.Provider value={{
      liabilities,
      addLiability,
      updateLiability,
      deleteLiability,
      loading
    }}>
      {children}
    </CashFlowContext.Provider>
  );
};

export const useCashFlow = () => {
  const context = useContext(CashFlowContext);
  if (!context) throw new Error('useCashFlow must be used within a CashFlowProvider');
  return context;
};
