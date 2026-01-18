
import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, PieChart, DollarSign, Wallet, ShoppingBag, Home, Utensils, Plane, Zap, Film, Laptop } from 'lucide-react';
import { BudgetCategory } from '../types';
import { CategorySelect } from './CategorySelect';
import { CATEGORIES } from '../constants';

interface BudgetFormProps {
  initialData?: BudgetCategory | null;
  onSave: (budget: BudgetCategory) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}

const ICONS = [
  { id: 'wallet', icon: Wallet },
  { id: 'laptop', icon: Laptop },
  { id: 'shopping', icon: ShoppingBag },
  { id: 'home', icon: Home },
  { id: 'food', icon: Utensils },
  { id: 'travel', icon: Plane },
  { id: 'zap', icon: Zap },
  { id: 'film', icon: Film },
  { id: 'chart', icon: PieChart },
];

const COLORS = [
  'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-blue-500',
  'bg-green-500', 'bg-red-500', 'bg-teal-500', 'bg-emerald-500'
];

export const BudgetForm: React.FC<BudgetFormProps> = ({ initialData, onSave, onDelete, onCancel }) => {
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState<any>(Wallet);

  useEffect(() => {
    if (initialData) {
      setCategory(initialData.category);
      setLimit(initialData.limit.toString());
      setType(initialData.type || 'expense');
      setColor(initialData.color);
      if (initialData.icon) setIcon(initialData.icon);
    }
  }, [initialData]);

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    const match = CATEGORIES.find(c => c.name === val);
    if (match) {
      setType(match.type as 'income' | 'expense');
      setColor(match.color);
      setIcon(match.icon);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !limit) return;

    const newBudget: BudgetCategory = {
      id: initialData ? initialData.id : crypto.randomUUID(),
      category,
      limit: parseFloat(limit),
      spent: initialData ? initialData.spent : 0,
      type,
      color,
      icon
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
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl animate-fade-in relative">

        <button onClick={onCancel} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
          <PieChart size={24} className="text-gold-500" />
          {initialData ? 'Edit Category' : 'New Category'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="flex bg-neutral-950 rounded-xl p-1 border border-neutral-800">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'expense' ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'income' ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}
            >
              Income Target
            </button>
          </div>

          <div>
            <CategorySelect
              value={category}
              onChange={handleCategoryChange}
              placeholder="Select or Create Category"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">{type === 'income' ? 'Target Amount' : 'Monthly Limit'}</label>
            <div className="relative">
              <DollarSign size={14} className="absolute left-3 top-3.5 text-neutral-500" />
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="0.00"
                className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm rounded-xl p-3 pl-8 outline-none focus:border-gold-500 transition-colors"
              />
            </div>
          </div>

          {/* Visuals */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">Icon</label>
              <div className="grid grid-cols-4 gap-2">
                {ICONS.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.icon)}
                    className={`p-2 rounded-lg flex items-center justify-center border transition-all ${icon === item.icon
                      ? 'bg-gold-500 text-neutral-950 border-gold-500'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-white'
                      }`}
                  >
                    <item.icon size={16} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">Color Tag</label>
              <div className="grid grid-cols-4 gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${c.replace('bg-', 'bg-')} ${color === c ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-neutral-800">
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
              className="flex-1 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 font-bold hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gold-500 text-neutral-950 font-bold hover:bg-gold-400 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <Check size={18} /> Save Category
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
