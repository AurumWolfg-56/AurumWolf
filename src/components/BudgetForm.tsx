
import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, PieChart, DollarSign, Wallet, ShoppingBag, Home, Utensils, Plane, Zap, Film, Laptop, Car, GraduationCap, Stethoscope, Scissors, PawPrint, Smartphone, Gift, TrendingUp, Music, BookOpen, Coffee, Dumbbell, Gamepad2, Monitor, Wrench, Baby, Crown, Clock, RefreshCcw, Percent, Tag, ShoppingBasket, Bus, Fuel, Package, Megaphone, Trophy, Landmark, Umbrella, Repeat, Heart, Plus, Sparkles } from 'lucide-react';
import { BudgetCategory } from '../types';
import { CategorySelect } from './CategorySelect';
// CATEGORIES removed as we use context
import { useCategories } from '../contexts/CategoryContext';

import { getSmartSuggestion } from '../lib/smartBudget';
import { ICON_MAP } from '../lib/iconMapper';

interface BudgetFormProps {
  initialData?: BudgetCategory | null;
  mode: 'budget' | 'category'; // [NEW] Explicit mode
  onSave: (budget: BudgetCategory) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  /** Optional: Handler to open category creator from within budget mode */
  onOpenCategoryCreator?: () => void;
}

// Map from ICON_MAP to the format expected by the UI (id + icon component)
const ICONS = Object.keys(ICON_MAP).map(key => ({
  id: key,
  icon: ICON_MAP[key]
}));

const COLORS = [
  'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-blue-500',
  'bg-green-500', 'bg-red-500', 'bg-teal-500', 'bg-emerald-500',
  'bg-indigo-500', 'bg-cyan-500', 'bg-rose-500', 'bg-amber-500',
  'bg-violet-600', 'bg-sky-500', 'bg-lime-500', 'bg-fuchsia-500'
];

export const BudgetForm: React.FC<BudgetFormProps> = ({ initialData, mode, onSave, onDelete, onCancel, onOpenCategoryCreator }) => {
  const { categories, totalProjectedIncome } = useCategories();
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [color, setColor] = useState(COLORS[0]);
  const [iconKey, setIconKey] = useState<string>('Wallet'); // Default to Wallet

  useEffect(() => {
    if (initialData) {
      setCategory(initialData.category);
      setLimit(initialData.limit.toString());
      setType(initialData.type || 'expense');
      setColor(initialData.color);
      if (initialData.icon_key) setIconKey(initialData.icon_key);
    }
  }, [initialData]);

  // Use extracted logic
  const suggestion = (type === 'expense') ? getSmartSuggestion(category, totalProjectedIncome) : null;
  const suggestedLimit = suggestion ? Math.round(suggestion.amount) : 0;

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    // [FIX] Lookup in dynamic categories list, NOT static constant
    const match = categories.find(c => c.category === val);
    if (match) {
      setType(match.type as 'income' | 'expense');
      setColor(match.color);
      // Try to find matching icon key
      if (match.icon_key && ICONS.some(i => i.id === match.icon_key)) {
        setIconKey(match.icon_key);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;
    // In 'budget' mode, limit is required. In 'category' mode, it defaults to 0 if empty.
    if (mode === 'budget' && !limit && type !== 'income') return; // Enforce limit for expenses

    const newBudget: BudgetCategory = {
      id: initialData ? initialData.id : crypto.randomUUID(),
      category,
      limit: limit ? parseFloat(limit) : 0,
      spent: initialData ? initialData.spent : 0,
      type,
      color,
      icon_key: iconKey,
    };

    onSave(newBudget);
  };

  const handleDelete = () => {
    if (initialData && onDelete) {
      if (window.confirm("Are you sure you want to delete this category?")) {
        onDelete(initialData.id);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full ${mode === 'category' ? 'max-w-xl' : 'max-w-md'} bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl animate-fade-in relative transition-all`}>

        <button onClick={onCancel} className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-xl font-display font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
          {mode === 'category' ? (
            <>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 text-purple-600 rounded-xl">
                <Tag size={20} />
              </div>
              {initialData ? 'Edit Category Visuals' : 'Create Custom Category'}
            </>
          ) : (
            <>
              <div className="p-2 bg-gold-500/10 text-gold-500 rounded-xl">
                <PieChart size={20} />
              </div>
              {initialData ? 'Update Budget Limit' : 'Set Budget Limit'}
            </>
          )}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* SHARED: TYPE SELECTION (Only visible if creating new or editing visuals) */}
          {(mode === 'category' || !initialData) && (
            <div className="flex bg-platinum-100 dark:bg-neutral-950 rounded-xl p-1 border border-platinum-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'expense' ? 'bg-neutral-800 text-white shadow-md' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'income' ? 'bg-neutral-800 text-white shadow-md' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}`}
              >
                Income Source
              </button>
            </div>
          )}

          {/* MODE: BUDGET (Simpler Flow) */}
          {mode === 'budget' && (
            <>
              <div>
                <CategorySelect
                  value={category}
                  onChange={handleCategoryChange}
                  placeholder="Select Category..."
                  onCreateNew={onOpenCategoryCreator}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">{type === 'income' ? 'Target Amount' : 'Monthly Limit'}</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-3.5 text-neutral-500" />
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                    className="w-full bg-platinum-50 dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-lg font-bold rounded-xl p-3 pl-9 outline-none focus:border-gold-500 transition-colors"
                  />
                </div>
                {/* SUGGESTION UI */}
                {suggestedLimit > 0 && (!limit || Number(limit) === 0) ? (
                  <button
                    type="button"
                    onClick={() => setLimit(suggestedLimit.toString())}
                    className="mt-2 text-xs flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 transition-colors animate-fade-in font-bold bg-emerald-50 dark:bg-emerald-900/10 px-3 py-2 rounded-lg border border-emerald-100 dark:border-emerald-900/30 w-full"
                  >
                    <Sparkles size={14} />
                    <span>
                      Smart Suggestion: ${suggestedLimit} ({suggestion?.reason})
                    </span>
                  </button>
                ) : (type === 'expense' && totalProjectedIncome === 0) ? (
                  <div className="mt-2 text-[10px] text-neutral-400 flex items-center gap-1.5 px-2">
                    <Sparkles size={12} className="text-neutral-500" />
                    Add Income items to see smart budget suggestions.
                  </div>
                ) : null}
              </div>
            </>
          )}

          {/* MODE: CATEGORY (Visual Rich Flow) */}
          {mode === 'category' && (
            <>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Category Name</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Hobby Projects, Weekend Trips..."
                  className="w-full bg-platinum-50 dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-base font-bold rounded-xl p-3 outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Visuals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. COLOR PICKER */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-wider">Color Theme</label>
                  <div className="grid grid-cols-4 gap-3 bg-platinum-50 dark:bg-neutral-950 p-3 rounded-2xl border border-platinum-100 dark:border-neutral-800">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-full aspect-square rounded-full transition-all duration-300 flex items-center justify-center ${c.replace('bg-', 'bg-')} ${color === c ? 'scale-110 shadow-lg ring-2 ring-offset-2 ring-neutral-900 dark:ring-white ring-offset-white dark:ring-offset-black' : 'opacity-70 hover:opacity-100 hover:scale-105'
                          }`}
                      >
                        {color === c && <Check size={12} className="text-white drop-shadow-md" strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. ICON PICKER (Enhanced) */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-wider">Icon</label>
                  <div className="grid grid-cols-5 gap-2 h-48 overflow-y-auto p-2 bg-platinum-50 dark:bg-neutral-950 rounded-2xl border border-platinum-100 dark:border-neutral-800 custom-scrollbar content-start">
                    {ICONS.map((item, idx) => {
                      const isSelected = iconKey === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setIconKey(item.id)}
                          className={`aspect-square rounded-xl flex items-center justify-center transition-all duration-300 relative group
                            ${isSelected
                              ? 'scale-110 z-10 shadow-lg ring-2 ring-offset-1 ring-neutral-200 dark:ring-neutral-700'
                              : 'hover:bg-white dark:hover:bg-neutral-800 hover:shadow-sm'
                            }`}
                        >
                          {/* Solid Background for Selected */}
                          <div className={`absolute inset-0 rounded-xl transition-all ${isSelected ? color : 'bg-transparent'}`}></div>

                          <item.icon
                            size={18}
                            className={`relative z-10 transition-colors ${isSelected ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white'}`}
                          />

                          {isSelected && (
                            <div className="absolute inset-0 rounded-xl ring-2 ring-white/20"></div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-platinum-200 dark:border-neutral-800">
            {initialData && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                title="Delete Category"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 rounded-xl bg-platinum-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold hover:bg-platinum-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:brightness-110 hover:translate-y-[-1px] active:translate-y-[0px] text-white ${mode === 'category' ? 'bg-purple-600' : 'bg-gold-500 text-neutral-950'}`}
            >
              <Check size={18} />
              {initialData ? 'Save Changes' : (mode === 'category' ? 'Create Category' : 'Set Budget')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
