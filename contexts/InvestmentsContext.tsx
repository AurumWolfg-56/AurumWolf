
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Investment } from '../types';

interface InvestmentsContextType {
    investments: Investment[];
    loading: boolean;
    error: string | null;
    addInvestment: (inv: Investment) => Promise<void>;
    updateInvestment: (inv: Investment) => Promise<void>;
    deleteInvestment: (id: string) => Promise<void>;
    refreshInvestments: () => Promise<void>;
}

const InvestmentsContext = createContext<InvestmentsContextType | undefined>(undefined);

export function InvestmentsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInvestments = async () => {
        if (!user) {
            setInvestments([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('investments')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;

            if (data) {
                const mapped: Investment[] = data.map(i => ({
                    id: i.id,
                    name: i.name,
                    ticker: i.ticker,
                    type: i.type,
                    strategy: i.strategy,
                    quantity: i.quantity,
                    costBasis: i.cost_basis,
                    currentPrice: i.current_price,
                    currency: i.currency,
                    lastUpdated: i.last_updated,
                    notes: i.notes || '',
                    // Calculated fields (runtime only)
                    currentValue: i.quantity * i.current_price,
                    unrealizedPnL: (i.quantity * i.current_price) - (i.quantity * i.cost_basis),
                    roiPercent: i.cost_basis > 0 ? (((i.quantity * i.current_price) - (i.quantity * i.cost_basis)) / (i.quantity * i.cost_basis)) * 100 : 0
                }));
                setInvestments(mapped);
            }
        } catch (err: any) {
            console.error('Error fetching investments:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvestments();
    }, [user]);

    const addInvestment = async (inv: Investment) => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('investments')
                .insert([{
                    id: inv.id,
                    user_id: user.id,
                    name: inv.name,
                    ticker: inv.ticker,
                    type: inv.type,
                    strategy: inv.strategy,
                    quantity: inv.quantity,
                    cost_basis: inv.costBasis,
                    current_price: inv.currentPrice,
                    currency: inv.currency,
                    notes: inv.notes
                }])
                .select()
                .single();

            if (error) throw error;

            const newInv: Investment = {
                id: data.id,
                name: data.name,
                ticker: data.ticker,
                type: data.type,
                strategy: data.strategy,
                quantity: data.quantity,
                costBasis: data.cost_basis,
                currentPrice: data.current_price,
                currency: data.currency,
                lastUpdated: data.last_updated,
                notes: data.notes,
                currentValue: data.quantity * data.current_price,
                unrealizedPnL: (data.quantity * data.current_price) - (data.quantity * data.cost_basis),
                roiPercent: data.cost_basis > 0 ? (((data.quantity * data.current_price) - (data.quantity * data.cost_basis)) / (data.quantity * data.cost_basis)) * 100 : 0
            };

            setInvestments(prev => [...prev, newInv]);
        } catch (err: any) {
            console.error('Error adding investment:', err);
            setError(err.message);
        }
    };

    const updateInvestment = async (inv: Investment) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('investments')
                .update({
                    name: inv.name,
                    ticker: inv.ticker,
                    type: inv.type,
                    strategy: inv.strategy,
                    quantity: inv.quantity,
                    cost_basis: inv.costBasis,
                    current_price: inv.currentPrice,
                    currency: inv.currency,
                    notes: inv.notes,
                    last_updated: new Date().toISOString()
                })
                .eq('id', inv.id);

            if (error) throw error;

            // Recalculate derived fields
            const updatedInv: Investment = {
                ...inv,
                currentValue: inv.quantity * inv.currentPrice,
                unrealizedPnL: (inv.quantity * inv.currentPrice) - (inv.quantity * inv.costBasis),
                roiPercent: inv.costBasis > 0 ? (((inv.quantity * inv.currentPrice) - (inv.quantity * inv.costBasis)) / (inv.quantity * inv.costBasis)) * 100 : 0
            };

            setInvestments(prev => prev.map(i => i.id === inv.id ? updatedInv : i));
        } catch (err: any) {
            console.error('Error updating investment:', err);
            setError(err.message);
        }
    };

    const deleteInvestment = async (id: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('investments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setInvestments(prev => prev.filter(i => i.id !== id));
        } catch (err: any) {
            console.error('Error deleting investment:', err);
            setError(err.message);
        }
    };

    const value = {
        investments,
        loading,
        error,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        refreshInvestments: fetchInvestments
    };

    return <InvestmentsContext.Provider value={value}>{children}</InvestmentsContext.Provider>;
}

export const useInvestments = () => {
    const context = useContext(InvestmentsContext);
    if (context === undefined) {
        throw new Error('useInvestments must be used within an InvestmentsProvider');
    }
    return context;
};
