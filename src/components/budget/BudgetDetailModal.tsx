import React from 'react';
import { X, AlertTriangle, Target, Activity, TrendingUp } from 'lucide-react';
import { BudgetCategory, Transaction, Account } from '../../types';
import { formatCurrency, getCategoriesForBudget } from '../../lib/money';
import { getIconComponent } from '../../lib/iconMapper';

export interface BudgetDetailModalProps {
    item: BudgetCategory;
    transactions: Transaction[];
    accounts: Account[];
    currencyCode: string;
    onClose: () => void;
    privacyMode: boolean;
    t: (key: string) => string;
}

export const BudgetDetailModal: React.FC<BudgetDetailModalProps> = ({
    item, transactions, accounts, currencyCode, onClose, privacyMode, t
}) => {
    // 1. Get Matching Transactions
    const mappedCategories = getCategoriesForBudget(item.category);
    const relevantTransactions = transactions.filter(t =>
        mappedCategories.includes(t.category) &&
        new Date(t.date).getMonth() === new Date().getMonth() &&
        new Date(t.date).getFullYear() === new Date().getFullYear()
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 2. Smart Insights
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(1, daysInMonth - today.getDate());
    const remainingBudget = item.limit - item.spent;
    const isIncome = item.type === 'income';

    // Daily Spend Logic
    const dailySafeSpend = Math.max(0, remainingBudget / daysRemaining);
    const isOverBudget = !isIncome && remainingBudget < 0;

    // --- DEVIATION & INSIGHT LOGIC ---
    let insightMessage = '';
    let insightType: 'positive' | 'negative' | 'neutral' = 'neutral';

    // Income Deviation
    if (isIncome && item.limit > 0) {
        if (item.spent > item.limit) {
            const percentHigher = Math.round(((item.spent - item.limit) / item.limit) * 100);
            insightMessage = `${percentHigher}% ${t('budget.incomeHigher')}`;
            insightType = 'positive';
        } else if (today.getDate() > 20 && (item.spent / item.limit) < 0.5) {
            const percentLower = Math.round(((item.limit - item.spent) / item.limit) * 100);
            insightMessage = `${percentLower}% ${t('budget.incomeLower')}`;
            insightType = 'negative';
        }
    }

    // Major Contributor (Expense)
    const maxTx = relevantTransactions.length > 0
        ? relevantTransactions.reduce((prev, current) => (prev.numericAmount > current.numericAmount) ? prev : current)
        : null;

    if (!isIncome && maxTx && (item.spent / item.limit) > 0.5) {
        insightMessage = `${t('budget.majorContributor')}: ${maxTx.description} (${formatCurrency(maxTx.numericAmount, currencyCode, { privacy: privacyMode })})`;
        insightType = isOverBudget ? 'negative' : 'neutral';
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-platinum-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl shadow-lg text-white ${isOverBudget ? 'bg-red-500 shadow-red-900/20' :
                            (item.color || 'bg-emerald-500')
                            }`}>
                            {React.createElement(getIconComponent(item.icon_key), { size: 24 })}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{item.category}</h2>
                            <p className="text-xs text-neutral-500 uppercase tracking-wider">{isIncome ? t('transactions.income') : t('transactions.expense')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-platinum-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-6 space-y-6">

                    {/* Deviation / Insight Card */}
                    {insightMessage && (
                        <div className={`rounded-2xl p-5 border ${insightType === 'positive'
                            ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30'
                            : insightType === 'negative'
                                ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
                                : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30'}`}>
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-full ${insightType === 'positive' ? 'bg-emerald-100 text-emerald-600' : insightType === 'negative' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {insightType === 'positive' ? <TrendingUp size={20} /> : <AlertTriangle size={20} />}
                                </div>
                                <div>
                                    <h4 className={`font-bold text-sm mb-1 ${insightType === 'positive' ? 'text-emerald-700 dark:text-emerald-400' : insightType === 'negative' ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>
                                        {isIncome ? (insightType === 'positive' ? t('budget.targetMet') : t('budget.status')) : t('budget.attention')}
                                    </h4>
                                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed">
                                        {insightMessage}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Daily Safe Spend (Only for Expenses) */}
                    {!isIncome && (
                        <div className={`rounded-2xl p-5 ${isOverBudget ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30' : 'bg-neutral-50 dark:bg-neutral-900/30 border border-neutral-200 dark:border-neutral-800'}`}>
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-full ${isOverBudget ? 'bg-red-100 text-red-600' : 'bg-neutral-200 text-neutral-600'}`}>
                                    {isOverBudget ? <AlertTriangle size={20} /> : <Target size={20} />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm mb-1 text-neutral-900 dark:text-white">
                                        {isOverBudget ? t('budget.overBudget') : t('budget.dailySafeSpend')}
                                    </h4>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2 leading-relaxed">
                                        {isOverBudget ? t('budget.adviceOver') : t('budget.adviceSafe')}
                                    </p>
                                    {!isOverBudget && (
                                        <div className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
                                            {formatCurrency(dailySafeSpend, currencyCode, { privacy: privacyMode })} <span className="text-xs font-sans font-normal text-neutral-500">/ {t('common.day')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Transaction List */}
                    <div>
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                            <Activity size={16} className="text-gold-500" /> {t('budget.recentTransactions')}
                        </h3>
                        {relevantTransactions.length > 0 ? (
                            <div className="space-y-3">
                                {relevantTransactions.slice(0, 10).map(tx => (
                                    <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-platinum-50 dark:hover:bg-neutral-800/50 transition-colors border border-transparent hover:border-platinum-200 dark:hover:border-neutral-800">
                                        <div className="flex items-center gap-3">
                                            <div className="text-xs font-bold text-neutral-400 w-8 text-center leading-tight">
                                                {new Date(tx.date).getDate()}
                                                <span className="block text-[8px] font-normal uppercase">{new Date(tx.date).toLocaleString('default', { month: 'short' })}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">{tx.description}</p>
                                                <p className="text-[10px] text-neutral-500">{accounts.find(a => a.id === tx.accountId)?.name || 'Unknown'}</p>
                                            </div>
                                        </div>
                                        <span className={`font-mono font-bold text-sm ${tx.type === 'credit' ? 'text-emerald-500' : 'text-neutral-900 dark:text-white'}`}>
                                            {tx.type === 'credit' ? '+' : ''}{formatCurrency(tx.numericAmount, currencyCode, { privacy: privacyMode })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-neutral-500 text-xs italic">
                                {t('transactions.noResults')}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
