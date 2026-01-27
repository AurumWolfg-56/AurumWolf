import React from 'react';
import { Filter, X, CheckSquare, Square } from 'lucide-react';

interface FilterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    // Date Range
    dateRange: { start: string; end: string };
    onDateRangeChange: (range: { start: string; end: string }) => void;
    // Accounts
    accounts: { id: string; name: string }[];
    selectedAccountIds: string[];
    onAccountToggle: (id: string) => void;
    // Categories
    categories: string[];
    selectedCategories: string[];
    onCategoryToggle: (cat: string) => void;
    // Amount
    amountRange: { min: string; max: string };
    onAmountRangeChange: (range: { min: string; max: string }) => void;
    // Actions
    onClear: () => void;
    t: (key: string) => string;
}

export const TransactionFilterDrawer: React.FC<FilterDrawerProps> = ({
    isOpen,
    onClose,
    dateRange,
    onDateRangeChange,
    accounts,
    selectedAccountIds,
    onAccountToggle,
    categories,
    selectedCategories,
    onCategoryToggle,
    amountRange,
    onAmountRangeChange,
    onClear,
    t
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-neutral-900 h-full shadow-2xl border-l border-platinum-200 dark:border-neutral-800 flex flex-col animate-fade-in">

                <div className="p-5 border-b border-platinum-200 dark:border-neutral-800 flex justify-between items-center bg-platinum-50 dark:bg-neutral-950">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <Filter size={20} className="text-gold-500" /> {t('transactions.filters')}
                    </h3>
                    <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">

                    {/* Date Range */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('common.date')}</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-neutral-600 block mb-1">{t('common.from')}</label>
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
                                    className="w-full bg-platinum-50 dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 rounded-lg p-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-gold-500 [&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:invert-0"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-neutral-600 block mb-1">{t('common.to')}</label>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
                                    className="w-full bg-platinum-50 dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 rounded-lg p-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-gold-500 [&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:invert-0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Accounts */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('common.accounts')}</h4>
                        <div className="space-y-2">
                            {accounts.map(acc => {
                                const isSelected = selectedAccountIds.includes(acc.id);
                                return (
                                    <button
                                        key={acc.id}
                                        onClick={() => onAccountToggle(acc.id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isSelected
                                            ? 'bg-gold-500/10 border-gold-500/50 text-neutral-900 dark:text-white'
                                            : 'bg-white dark:bg-neutral-950 border-platinum-200 dark:border-neutral-800 text-neutral-500 hover:bg-platinum-50 dark:hover:bg-neutral-900'
                                            }`}
                                    >
                                        <span className="text-xs font-bold">{acc.name}</span>
                                        {isSelected ? <CheckSquare size={16} className="text-gold-500" /> : <Square size={16} />}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('common.category')}</h4>
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => {
                                const isSelected = selectedCategories.includes(cat);
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => onCategoryToggle(cat)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${isSelected
                                            ? 'bg-gold-500 text-neutral-950 border-gold-500'
                                            : 'bg-white dark:bg-neutral-950 border-platinum-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-600'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Amount Range */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('common.amount')}</h4>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                placeholder="Min"
                                value={amountRange.min}
                                onChange={(e) => onAmountRangeChange({ ...amountRange, min: e.target.value })}
                                className="w-full bg-platinum-50 dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 rounded-lg p-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-gold-500"
                            />
                            <span className="text-neutral-600">-</span>
                            <input
                                type="number"
                                placeholder="Max"
                                value={amountRange.max}
                                onChange={(e) => onAmountRangeChange({ ...amountRange, max: e.target.value })}
                                className="w-full bg-platinum-50 dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 rounded-lg p-2 text-xs text-neutral-900 dark:text-white outline-none focus:border-gold-500"
                            />
                        </div>
                    </div>

                </div>

                <div className="p-5 border-t border-platinum-200 dark:border-neutral-800 bg-platinum-50 dark:bg-neutral-950 flex gap-3">
                    <button onClick={onClear} className="flex-1 py-3 rounded-xl border border-platinum-300 dark:border-neutral-800 text-neutral-500 font-bold hover:bg-white dark:hover:bg-neutral-900 transition-colors">
                        {t('common.reset')}
                    </button>
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gold-500 text-neutral-950 font-bold hover:bg-gold-400 transition-colors shadow-lg">
                        {t('common.apply')}
                    </button>
                </div>

            </div>
        </div>
    );
};
