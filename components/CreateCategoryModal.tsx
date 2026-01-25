import React, { useState } from 'react';
import { X, Check, Sparkles } from 'lucide-react';
import { useCategories } from '../contexts/CategoryContext';
import { AVAILABLE_ICONS, getIconComponent } from '../lib/iconMapper';

interface CreateCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (name: string) => void;
    initialType?: 'income' | 'expense';
}

const COLORS = [
    'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30',
    'bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/30',
    'bg-gradient-to-br from-lime-400 to-lime-600 shadow-lg shadow-lime-500/30',
    'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/30',
    'bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/30',
    'bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-500/30',
    'bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg shadow-indigo-500/30',
    'bg-gradient-to-br from-violet-400 to-violet-600 shadow-lg shadow-violet-500/30',
    'bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg shadow-purple-500/30',
    'bg-gradient-to-br from-fuchsia-400 to-fuchsia-600 shadow-lg shadow-fuchsia-500/30',
    'bg-gradient-to-br from-pink-400 to-pink-600 shadow-lg shadow-pink-500/30',
    'bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-500/30',
    'bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/30',
    'bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30',
    'bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30',
    'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/30',
    'bg-gradient-to-br from-zinc-500 to-zinc-700 shadow-lg shadow-zinc-500/30',
    'bg-gradient-to-br from-slate-500 to-slate-700 shadow-lg shadow-slate-500/30'
];

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({ isOpen, onClose, onSuccess, initialType = 'expense' }) => {
    const { addCategory, totalProjectedIncome } = useCategories();
    const [name, setName] = useState('');
    const [type, setType] = useState<'income' | 'expense'>(initialType);
    // Limit removed from creation flow
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [selectedIcon, setSelectedIcon] = useState('Home'); // Default to valid key
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setLoading(true);
        try {
            await addCategory({
                category: name,
                type,
                limit: 0, // Default to 0 for new categories
                color: selectedColor,
                icon_key: selectedIcon
            });
            onSuccess?.(name);
            onClose();
            setName('');
            // limit state removed
        } catch (error: any) {
            console.error(error);
            alert(`Failed to create category: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    const IconPreview = getIconComponent(selectedIcon);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-white">New Category</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Name & Type */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-400 uppercase tracking-wider">Category Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 mt-1"
                                placeholder="e.g. Gaming"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setType('expense')}
                                className={`py-2 rounded-lg text-sm font-medium transition-all ${type === 'expense' ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                Expense
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('income')}
                                className={`py-2 rounded-lg text-sm font-medium transition-all ${type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                Income
                            </button>
                        </div>
                    </div>

                    {/* Limit (Expense Only) - REMOVED as per user request. Initial limit is 0. */}
                    {/* Categories are created with 0 limit, then budgeted in BudgetForm. */}

                    {/* Color Picker */}
                    <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Color Tag</label>
                        <div className="grid grid-cols-6 gap-2">
                            {COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-8 h-8 rounded-full ${color} transition-transform hover:scale-110 flex items-center justify-center ${selectedColor === color ? 'ring-2 ring-white scale-110' : 'opacity-70'
                                        }`}
                                >
                                    {selectedColor === color && <Check size={12} className="text-white drop-shadow-md" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Icon Picker */}
                    <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Icon</label>
                        <div className="h-48 overflow-y-auto grid grid-cols-5 gap-2 pr-2 custom-scrollbar">
                            {AVAILABLE_ICONS.map(iconKey => {
                                const Icon = getIconComponent(iconKey);
                                return (
                                    <button
                                        key={iconKey}
                                        type="button"
                                        onClick={() => setSelectedIcon(iconKey)}
                                        className={`p-3 rounded-xl flex items-center justify-center transition-all ${selectedIcon === iconKey
                                            ? 'bg-white/10 text-white ring-1 ring-white/50'
                                            : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                                            }`}
                                    >
                                        <Icon size={20} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t border-white/10 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name || loading}
                            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? 'Creating...' : 'Create Category'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
