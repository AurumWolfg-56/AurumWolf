
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { PersonalAsset, PersonalLiability } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface CashFlowContextType {
  assets: PersonalAsset[];
  liabilities: PersonalLiability[];
  addAsset: (asset: PersonalAsset) => Promise<void>;
  updateAsset: (asset: PersonalAsset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  addLiability: (liability: PersonalLiability) => Promise<void>;
  updateLiability: (liability: PersonalLiability) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;
  loading: boolean;
}

const CashFlowContext = createContext<CashFlowContextType | undefined>(undefined);

export const CashFlowProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<PersonalAsset[]>([]);
  const [liabilities, setLiabilities] = useState<PersonalLiability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAssets([]);
      setLiabilities([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      const [assetsRes, liabilitiesRes] = await Promise.all([
        supabase.from('personal_assets').select('*').order('created_at', { ascending: true }),
        supabase.from('personal_liabilities').select('*').order('created_at', { ascending: true })
      ]);

      if (assetsRes.error) {
        console.error('Error fetching assets:', assetsRes.error);
      } else {
        const mapped = (assetsRes.data || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          category: row.category,
          classification: row.classification,
          estimatedValue: Number(row.estimated_value),
          currency: row.currency,
          acquisitionDate: row.acquisition_date,
          monthlyIncome: Number(row.monthly_income || 0),
          depreciationRateAnnual: Number(row.depreciation_rate_annual || 0),
          notes: row.notes,
          linkedAccountId: row.linked_account_id,
          lastValuationDate: row.last_valuation_date,
        }));
        setAssets(mapped);
      }

      if (liabilitiesRes.error) {
        console.error('Error fetching liabilities:', liabilitiesRes.error);
      } else {
        const mapped = (liabilitiesRes.data || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          expenseClass: row.expense_class,
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

  // --- ASSET CRUD ---

  const addAsset = async (asset: PersonalAsset) => {
    const prevAssets = [...assets];
    setAssets(prev => [...prev, asset]);

    if (!user) return;

    try {
      const dbPayload = {
        id: asset.id,
        user_id: user.id,
        name: asset.name,
        type: asset.type,
        category: asset.category,
        classification: asset.classification,
        estimated_value: asset.estimatedValue,
        currency: asset.currency,
        acquisition_date: asset.acquisitionDate || null,
        monthly_income: asset.monthlyIncome || 0,
        depreciation_rate_annual: asset.depreciationRateAnnual || 0,
        notes: asset.notes || null,
        linked_account_id: asset.linkedAccountId || null,
        last_valuation_date: asset.lastValuationDate || null,
      };

      const { error } = await supabase.from('personal_assets').insert(dbPayload);
      if (error) throw error;
      toast.success('Asset added');
    } catch (err) {
      console.error('Error adding asset:', err);
      setAssets(prevAssets);
      toast.error('Failed to save asset.');
    }
  };

  const updateAsset = async (asset: PersonalAsset) => {
    const prevAssets = [...assets];
    setAssets(prev => prev.map(a => a.id === asset.id ? asset : a));

    if (!user) return;

    try {
      const dbPayload = {
        name: asset.name,
        type: asset.type,
        category: asset.category,
        classification: asset.classification,
        estimated_value: asset.estimatedValue,
        currency: asset.currency,
        acquisition_date: asset.acquisitionDate || null,
        monthly_income: asset.monthlyIncome || 0,
        depreciation_rate_annual: asset.depreciationRateAnnual || 0,
        notes: asset.notes || null,
        linked_account_id: asset.linkedAccountId || null,
        last_valuation_date: asset.lastValuationDate || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('personal_assets').update(dbPayload).eq('id', asset.id);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating asset:', err);
      setAssets(prevAssets);
      toast.error('Failed to update asset.');
    }
  };

  const deleteAsset = async (id: string) => {
    const prevAssets = [...assets];
    setAssets(prev => prev.filter(a => a.id !== id));

    if (!user) return;

    try {
      const { error } = await supabase.from('personal_assets').delete().eq('id', id);
      if (error) throw error;
      toast.success('Asset deleted');
    } catch (err) {
      console.error('Error deleting asset:', err);
      setAssets(prevAssets);
    }
  };

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
        expense_class: liability.expenseClass,
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
        expense_class: liability.expenseClass,
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
      assets,
      liabilities,
      addAsset,
      updateAsset,
      deleteAsset,
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
