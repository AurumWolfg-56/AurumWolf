
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { BudgetCategory, SavingsGoal } from '../types';
import { INITIAL_BUDGET_CONFIG, INITIAL_GOALS } from '../constants';
import { parseSupabaseData } from '../lib/supabaseSafe';
import { BudgetCategorySchema, SavingsGoalSchema } from '../lib/validators';

interface BudgetsContextType {
    budgets: BudgetCategory[];
    goals: SavingsGoal[];
    loading: boolean;
    error: string | null;
    addBudget: (budget: BudgetCategory) => Promise<void>;
    updateBudget: (budget: BudgetCategory) => Promise<void>;
    deleteBudget: (id: string) => Promise<void>;
    addGoal: (goal: SavingsGoal) => Promise<void>;
    updateGoal: (goal: SavingsGoal) => Promise<void>;
    deleteGoal: (id: string) => Promise<void>;
    refreshBudgets: () => Promise<void>;
}

const BudgetsContext = createContext<BudgetsContextType | undefined>(undefined);

export function BudgetsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBudgetsAndGoals = async () => {
        if (!user) {
            setBudgets([]);
            setGoals([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // Fetch Budgets
            const { data: budgetsData, error: budgetsError } = await supabase
                .from('budgets')
                .select('*')
                .eq('user_id', user.id);

            if (budgetsError) throw budgetsError;

            const mappedBudgets = (budgetsData || []).map(b => ({
                id: b.id,
                category: b.category,
                limit: b.limit_amount, // Map snake_case to camelCase
                spent: 0, // Calculated at runtime
                color: b.color,
                icon: b.icon, // String name
                type: b.type
            }));

            const validBudgets = parseSupabaseData(BudgetCategorySchema, mappedBudgets, []) as BudgetCategory[];
            setBudgets(validBudgets);

            // Fetch Goals
            const { data: goalsData, error: goalsError } = await supabase
                .from('goals')
                .select('*')
                .eq('user_id', user.id);

            if (goalsError) throw goalsError;

            const mappedGoals = (goalsData || []).map(g => ({
                id: g.id,
                name: g.name,
                targetAmount: g.target_amount,
                savedAmount: g.saved_amount,
                deadline: g.deadline,
                color: g.color,
                icon: g.icon
            }));

            const validGoals = parseSupabaseData(SavingsGoalSchema, mappedGoals, []) as SavingsGoal[];
            setGoals(validGoals);

        } catch (err: any) {
            console.error('Error fetching budgets/goals:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBudgetsAndGoals();
    }, [user]);

    const addBudget = async (budget: BudgetCategory) => {
        // Optimistic
        const prevBudgets = [...budgets];
        // We rely on the DB to generate the ID normally for new inserts if we don't provide one, 
        // but for optimistic UI updates we need an ID. 
        // NOTE: The original code waited for the DB. We will change to Optimistic + Rollback.
        // If ID is missing, we can't optimistically update easily without generating a temp ID.
        // Given the existing implementation waited for data, I will keep the WAIT for ID generation 
        // but add error handling. However, to be truly optimistic, we should generate UUIDs on client.
        // For now, I will wrap the existing logic in better error handling as a hybrid approach 
        // because changing ID generation strategy is risky.

        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('budgets')
                .insert([{
                    user_id: user.id,
                    category: budget.category,
                    limit_amount: budget.limit,
                    color: budget.color,
                    icon: budget.icon,
                    type: budget.type
                }])
                .select()
                .single();

            if (error) throw error;

            const newBudget: BudgetCategory = {
                id: data.id,
                category: data.category,
                limit: data.limit_amount,
                color: data.color,
                icon_key: data.icon,
                type: data.type,
                spent: 0
            };

            setBudgets(prev => [...prev, newBudget]);
        } catch (err: any) {
            console.error('Error adding budget:', err);
            setError(err.message);
        }
    };

    const updateBudget = async (budget: BudgetCategory) => {
        const prevBudgets = [...budgets];
        setBudgets(prev => prev.map(b => b.id === budget.id ? { ...budget, spent: b.spent } : b)); // Preserve calculated spent

        if (!user) return;
        try {
            const { error } = await supabase
                .from('budgets')
                .update({
                    category: budget.category,
                    limit_amount: budget.limit,
                    color: budget.color,
                    icon: budget.icon,
                    type: budget.type
                })
                .eq('id', budget.id);

            if (error) throw error;
        } catch (err: any) {
            console.error('Error updating budget:', err);
            setError(err.message);
            setBudgets(prevBudgets); // Rollback
        }
    };

    const deleteBudget = async (id: string) => {
        const prevBudgets = [...budgets];
        setBudgets(prev => prev.filter(b => b.id !== id));

        if (!user) return;
        try {
            const { error } = await supabase
                .from('budgets')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (err: any) {
            console.error('Error deleting budget:', err);
            setError(err.message);
            setBudgets(prevBudgets); // Rollback
        }
    };

    // Goals

    const addGoal = async (goal: SavingsGoal) => {
        // See comments in addBudget re: ID generation vs Optimistic updates
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('goals')
                .insert([{
                    user_id: user.id,
                    name: goal.name,
                    target_amount: goal.targetAmount,
                    saved_amount: goal.savedAmount,
                    deadline: goal.deadline,
                    color: goal.color,
                    icon: goal.icon
                }])
                .select()
                .single();

            if (error) throw error;

            const newGoal: SavingsGoal = {
                id: data.id,
                name: data.name,
                targetAmount: data.target_amount,
                savedAmount: data.saved_amount,
                deadline: data.deadline,
                color: data.color,
                icon: data.icon
            };

            setGoals(prev => [...prev, newGoal]);
        } catch (err: any) {
            console.error('Error adding goal:', err);
            setError(err.message);
        }
    };

    const updateGoal = async (goal: SavingsGoal) => {
        const prevGoals = [...goals];
        setGoals(prev => prev.map(g => g.id === goal.id ? goal : g));

        if (!user) return;

        try {
            const { error } = await supabase
                .from('goals')
                .update({
                    name: goal.name,
                    target_amount: goal.targetAmount,
                    saved_amount: goal.savedAmount,
                    deadline: goal.deadline,
                    color: goal.color,
                    icon: goal.icon
                })
                .eq('id', goal.id);

            if (error) throw error;
        } catch (err: any) {
            console.error('Error updating goal:', err);
            setError(err.message);
            setGoals(prevGoals); // Rollback
        }
    };

    const deleteGoal = async (id: string) => {
        const prevGoals = [...goals];
        setGoals(prev => prev.filter(g => g.id !== id));

        if (!user) return;
        try {
            const { error } = await supabase
                .from('goals')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (err: any) {
            console.error('Error deleting goal:', err);
            setError(err.message);
            setGoals(prevGoals); // Rollback
        }
    };

    const value = {
        budgets,
        goals,
        loading,
        error,
        addBudget,
        updateBudget,
        deleteBudget,
        addGoal,
        updateGoal,
        deleteGoal,
        refreshBudgets: fetchBudgetsAndGoals
    };

    return <BudgetsContext.Provider value={value}>{children}</BudgetsContext.Provider>;
}

export const useBudgets = () => {
    const context = useContext(BudgetsContext);
    if (context === undefined) {
        throw new Error('useBudgets must be used within a BudgetsProvider');
    }
    return context;
};
