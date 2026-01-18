import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { convertAmount, formatCurrency } from '../lib/money';
import { PieChart, TrendingUp, TrendingDown, DollarSign, Layers } from 'lucide-react';

interface FinancialBreakdownProps {
    transactions: Transaction[];
    baseCurrency: string;
    period: number; // Days to analyze (e.g. 30)
    t: (key: string) => string;
}

export const FinancialBreakdown: React.FC<FinancialBreakdownProps> = ({ transactions, baseCurrency, period = 30, t }) => {
    const [viewMode, setViewMode] = useState<'expense' | 'income'>('expense');

    const analysis = useMemo(() => {
        const now = new Date();
        const limitDate = new Date();
        limitDate.setDate(now.getDate() - period);
        const limitStr = limitDate.toISOString().split('T')[0];

        const relevantTx = transactions.filter(tx =>
            tx.date >= limitStr &&
            tx.category !== 'Transfer' &&
            tx.category !== 'Credit Card Payment'
        );

        const incomeTx = relevantTx.filter(tx => tx.type === 'credit');
        const expenseTx = relevantTx.filter(tx => tx.type === 'debit');

        const totalIncome = incomeTx.reduce((acc, tx) => acc + convertAmount(tx.numericAmount, tx.currency || 'USD', baseCurrency), 0);
        const totalExpense = expenseTx.reduce((acc, tx) => acc + convertAmount(tx.numericAmount, tx.currency || 'USD', baseCurrency), 0);

        // Category Breakdown
        const sourceMap: Record<string, number> = {};
        const targetList = viewMode === 'expense' ? expenseTx : incomeTx;

        targetList.forEach(tx => {
            const cat = tx.category || 'Uncategorized';
            const val = convertAmount(tx.numericAmount, tx.currency || 'USD', baseCurrency);
            sourceMap[cat] = (sourceMap[cat] || 0) + val;
        });

        const categories = Object.entries(sourceMap)
            .map(([name, value]) => ({ name, value, percent: 0, color: '' }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6); // Top 6

        const totalForMode = viewMode === 'expense' ? totalExpense : totalIncome;

        // Assign colors and percents
        const colors = [
            '#eab308', // gold-500
            '#ef4444', // red-500
            '#3b82f6', // blue-500
            '#10b981', // emerald-500
            '#8b5cf6', // violet-500
            '#f97316', // orange-500
        ];

        let cumPercent = 0;
        categories.forEach((c, i) => {
            c.percent = totalForMode > 0 ? (c.value / totalForMode) * 100 : 0;
            c.color = colors[i % colors.length];
            cumPercent += c.percent;
        });

        // Add "Others" if needed
        if (totalForMode > 0 && cumPercent < 99) {
            const othersVal = totalForMode - categories.reduce((sum, c) => sum + c.value, 0);
            if (othersVal > 0) {
                categories.push({
                    name: 'Others',
                    value: othersVal,
                    percent: (othersVal / totalForMode) * 100,
                    color: '#737373' // neutral-500
                });
            }
        }

        return {
            totalIncome,
            totalExpense,
            categories
        };

    }, [transactions, baseCurrency, period, viewMode]);

    // --- Donut Chart Logic ---
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;

    return (
        <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-[2.5rem] p-8 shadow-xl flex flex-col h-full group transition-colors hover:border-gold-500/20 duration-500">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                    <PieChart size={16} className="text-gold-500" /> Breakdown
                </h3>
                <div className="flex bg-white/50 dark:bg-neutral-800/50 backdrop-blur-md rounded-xl p-1 border border-white/20 dark:border-white/5">
                    <button
                        onClick={() => setViewMode('expense')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'expense'
                            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                            }`}
                    >
                        Exp
                    </button>
                    <button
                        onClick={() => setViewMode('income')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'income'
                            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                            }`}
                    >
                        Inc
                    </button>
                </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">

                {/* Visual Chart */}
                <div className="relative flex items-center justify-center">
                    {/* SVG Donut */}
                    <svg viewBox="0 0 120 120" className="w-48 h-48 transform -rotate-90 drop-shadow-xl">
                        {analysis.categories.map((cat, i) => {
                            const dashArray = (cat.percent / 100) * circumference;
                            const offset = currentOffset;
                            currentOffset -= dashArray; // SVG draws clockwise from 3 o'clock usually, but consistent rotation fixes it

                            return (
                                <circle
                                    key={i}
                                    cx="60" cy="60" r={radius}
                                    fill="transparent"
                                    stroke={cat.color}
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeDasharray={`${dashArray} ${circumference}`}
                                    strokeDashoffset={-Math.abs(currentOffset + dashArray)} // Tricky offset logic
                                    className="transition-all duration-1000 origin-center hover:stroke-width-[14px] hover:opacity-90 cursor-pointer"
                                />
                            );
                        })}
                        {/* Empty State Ring */}
                        {analysis.categories.length === 0 && (
                            <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#e5e5e5" strokeWidth="12" className="dark:stroke-neutral-800" />
                        )}
                    </svg>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-1">Total</span>
                        <span className={`text-xl font-bold font-mono tracking-tight ${viewMode === 'expense' ? 'text-neutral-900 dark:text-white' : 'text-emerald-500'}`}>
                            {formatCurrency(viewMode === 'expense' ? analysis.totalExpense : analysis.totalIncome, baseCurrency, { compact: true })}
                        </span>
                    </div>
                </div>

                {/* Legend / List */}
                <div className="space-y-4">
                    {/* Top Insight */}
                    {analysis.categories.length > 0 && (
                        <div className="mb-4 pb-4 border-b border-neutral-200/50 dark:border-white/5">
                            <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold mb-1">Highest Spend</p>
                            <p className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: analysis.categories[0].color }}></span>
                                {analysis.categories[0].name} <span className="text-neutral-400 text-xs font-medium ml-auto">({Math.round(analysis.categories[0].percent)}%)</span>
                            </p>
                        </div>
                    )}
                    {analysis.categories.length > 0 ? (
                        analysis.categories.slice(0, 5).map((cat, idx) => (
                            <div key={idx} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full ring-2 ring-white/10 dark:ring-black/10" style={{ backgroundColor: cat.color }}></div>
                                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 truncate max-w-[100px] group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                                        {cat.name}
                                    </span>
                                </div>
                                <div className="text-right flex items-center gap-3">
                                    <span className="block text-xs font-bold text-neutral-900 dark:text-white font-mono">
                                        {formatCurrency(cat.value, baseCurrency, { compact: true })}
                                    </span>
                                    <span className="text-[10px] text-neutral-400 w-8 text-right">
                                        {Math.round(cat.percent)}%
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4 text-neutral-400 text-xs">
                            No data for this period
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
