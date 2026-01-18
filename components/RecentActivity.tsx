
import React from 'react';
import { Transaction } from '../types';
import { formatCurrency } from '../lib/money';
import { ArrowUpRight, ArrowDownRight, Coffee, ShoppingBag, Car, Home, Zap, Monitor, DollarSign, RefreshCw } from 'lucide-react';

interface RecentActivityProps {
    transactions: Transaction[];
    baseCurrency: string;
    onViewAll: () => void;
    privacyMode?: boolean;
}

const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('food') || lower.includes('dining')) return Coffee;
    if (lower.includes('shopping')) return ShoppingBag;
    if (lower.includes('transport') || lower.includes('fuel')) return Car;
    if (lower.includes('housing') || lower.includes('rent')) return Home;
    if (lower.includes('utilities')) return Zap;
    if (lower.includes('entertainment')) return Monitor;
    if (lower.includes('income') || lower.includes('salary')) return DollarSign;
    if (lower.includes('transfer')) return RefreshCw;
    return DollarSign;
};

export const RecentActivity: React.FC<RecentActivityProps> = ({ transactions, baseCurrency, onViewAll, privacyMode = false }) => {
    const sorted = [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

    return (
        <div className="bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-[2rem] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                    Recent Activity
                </h3>
                <button
                    onClick={onViewAll}
                    className="text-xs font-bold text-gold-600 dark:text-gold-500 hover:underline"
                >
                    View All
                </button>
            </div>

            <div className="space-y-4">
                {sorted.length > 0 ? (
                    sorted.map(tx => {
                        const Icon = getCategoryIcon(tx.category || '');
                        const isCredit = tx.type === 'credit';

                        return (
                            <div key={tx.id} className="flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isCredit
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                            : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
                                        }`}>
                                        <Icon size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-neutral-900 dark:text-white truncate max-w-[140px] md:max-w-[200px]">
                                            {tx.name}
                                        </p>
                                        <p className="text-[10px] text-neutral-500 font-medium">
                                            {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {tx.category}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-sm font-bold font-mono ${isCredit ? 'text-emerald-500' : 'text-neutral-900 dark:text-white'
                                        }`}>
                                        {isCredit ? '+' : ''}{formatCurrency(tx.numericAmount, tx.currency || baseCurrency, { privacy: privacyMode })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-6 text-neutral-400 text-xs text-italic">
                        No recent activity.
                    </div>
                )}
            </div>
        </div>
    );
};
