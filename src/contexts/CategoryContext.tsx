import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BudgetCategory } from '../types';
import { useAuth } from './AuthContext';
import { parseSupabaseData } from '../lib/supabaseSafe';
import { BudgetCategorySchema } from '../lib/validators';

// Default categories removed for user-controlled setup

interface CategoryContextType {
    categories: BudgetCategory[];
    loading: boolean;
    totalProjectedIncome: number;
    refreshCategories: () => Promise<void>;
    addCategory: (category: Omit<BudgetCategory, 'id' | 'spent' | 'user_id'>) => Promise<void>;
    updateCategory: (category: BudgetCategory) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [categories, setCategories] = useState<BudgetCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const totalProjectedIncome = categories
        .filter(c => c.type === 'income')
        .reduce((sum, c) => sum + c.limit, 0);

    const fetchCategories = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('budget_categories')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;

            if (data) {
                // Map DB fields to Frontend types before validation
                const candidates = data.map((item: any) => ({
                    id: item.id,
                    category: item.name,
                    limit: Number(item.limit_amount),
                    spent: 0, // Calculated elsewhere
                    color: item.color,
                    icon_key: item.icon_key,
                    type: item.type as 'income' | 'expense',
                    is_system: item.is_system,
                    user_id: user.id
                }));

                // Validate using Zod schema
                const validCategories = parseSupabaseData(BudgetCategorySchema, candidates, []) as BudgetCategory[];
                setCategories(validCategories);
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
        } finally {
            setLoading(false);
        }
    };

    const addCategory = async (newCat: Omit<BudgetCategory, 'id' | 'spent' | 'user_id'>) => {
        // DEBUG: Temporary alerts to diagnose user issue
        // alert(`Debug: Attempting addCategory. User: ${user?.id}`);

        if (!user) {
            alert("Error: User is not authenticated in CategoryContext");
            throw new Error("User not authenticated");
        }

        // --- DUPLICATION CHECK ---
        const normalizedName = newCat.category.trim().toLowerCase();
        // Check local state first (assuming it's relatively up to date with fetchCategories)
        const existing = categories.find(c =>
            c.category.toLowerCase() === normalizedName &&
            c.type === newCat.type
        );

        if (existing) {
            // Category already exists. 
            // In the "Create Budget" flow, the user might be trying to 'activate' it, but addCategory usually just adds.
            // We'll treat this as a success (idempotent) so the UI can just select it.
            // console.log("Category already exists, skipping creation:", existing);
            return;
        }

        const { error } = await supabase.from('budget_categories').insert({
            user_id: user.id,
            name: newCat.category,
            type: newCat.type,
            limit_amount: newCat.limit,
            color: newCat.color,
            icon_key: newCat.icon_key,
            is_system: false
        });

        if (error) {
            console.error("Failed to add category", error);
            alert(`DB Error: ${error.message}`);
            throw error;
        }
        await fetchCategories();
    };

    const deleteCategory = async (id: string) => {
        const { error } = await supabase.from('budget_categories').delete().eq('id', id);
        if (error) {
            alert(`DB Error Delete: ${error.message}`);
            throw error;
        }
        await fetchCategories();
    };

    const updateCategory = async (category: BudgetCategory) => {
        if (!user) {
            alert("Error: User is not authenticated in CategoryContext (Update)");
            throw new Error("User not authenticated");
        }

        const { error } = await supabase.from('budget_categories').update({
            name: category.category,
            limit_amount: category.limit,
            color: category.color,
            icon_key: category.icon_key,
            type: category.type
        }).eq('id', category.id);

        if (error) {
            console.error("Failed to update category", error);
            alert(`DB Error Update: ${error.message}`);
            throw error;
        }
        await fetchCategories();
    };

    useEffect(() => {
        fetchCategories();
    }, [user]);

    return (
        <CategoryContext.Provider value={{ categories, loading, totalProjectedIncome, refreshCategories: fetchCategories, addCategory, updateCategory, deleteCategory }}>
            {children}
        </CategoryContext.Provider>
    );
};

export const useCategories = () => {
    const context = useContext(CategoryContext);
    if (!context) throw new Error("useCategories must be used within a CategoryProvider");
    return context;
};
