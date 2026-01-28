import React, { useState } from 'react';
import { Transaction, BudgetCategory } from '../../types';
import { formatCurrency } from '../../lib/money';
import { useBudgetAnalysis, TimeRange } from '../../hooks/useBudgetAnalysis';
import {
    Calendar, TrendingUp, TrendingDown,
    AlertCircle, CheckCircle, BrainCircuit,
    BarChart3, ArrowRight, Target
} from 'lucide-react';

interface BudgetAnalyzerProps {
    transactions: Transaction[];
    budgets: BudgetCategory[];
    baseCurrency: string;
    t: (key: string) => string;
}

export const BudgetAnalyzer: React.FC<BudgetAnalyzerProps> = ({
    transactions,
    budgets,
    baseCurrency,
    t
}) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('6m');
    const { history, insights, idealAllocation, totalIncomePeriod, totalExpensePeriod } = useBudgetAnalysis(
        transactions,
        budgets,
        timeRange,
        baseCurrency
    );

    // Calc max value for chart scaling
    const maxVal = Math.max(...history.map(h => Math.max(h.income, h.expense)), 1);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* --- HEADER CONTROLS --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-platinum-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                        <BrainCircuit size={24} />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-neutral-900 dark:text-white">Smart Analyzer</h2>
                        <p className="text-xs text-neutral-500">AI-driven insights & history</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-platinum-100 dark:bg-neutral-950 p-1 rounded-xl">
                    {(['6m', 'ytd', '1y'] as TimeRange[]).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeRange === range
                                    ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-white shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'
                                }`}
                        >
                            {range === '6m' ? '6 Months' : range === 'ytd' ? 'YTD' : '1 Year'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* --- CHART SECTION --- */}
                <div className="lg:col-span-2 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-platinum-200 dark:border-neutral-800 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <BarChart3 size={18} className="text-indigo-500" />
                            Spending Trends
                        </h3>
                        <div className="flex gap-4 text-xs font-bold text-neutral-500">
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Income</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div> Expenses</div>
                        </div>
                    </div>

                    <div className="h-64 flex items-end gap-2 sm:gap-4">
                        {history.map((month) => (
                            <div key={month.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-neutral-900 text-white text-[10px] p-2 rounded-lg pointer-events-none transition-opacity z-10 w-32 text-center">
                                    <div className="font-bold mb-1">{month.label}</div>
                                    <div className="text-emerald-400">In: {formatCurrency(month.income, baseCurrency)}</div>
                                    <div className="text-red-400">Out: {formatCurrency(month.expense, baseCurrency)}</div>
                                    <div className="border-t border-white/20 mt-1 pt-1">Sav: {Math.round(month.savingsRate)}%</div>
                                </div>

                                <div className="w-full flex gap-1 items-end justify-center h-full relative">
                                    {/* Income Bar */}
                                    <div
                                        style={{ height: `${(month.income / maxVal) * 100}%` }}
                                        className="w-1/3 bg-emerald-400/20 rounded-t-sm relative transition-all group-hover:bg-emerald-400/40"
                                    >
                                        <div
                                            style={{ height: '4px' }}
                                            className="w-full bg-emerald-400 absolute top-0"
                                        />
                                    </div>
                                    {/* Expense Bar */}
                                    <div
                                        style={{ height: `${(month.expense / maxVal) * 100}%` }}
                                        className="w-1/3 bg-red-400/20 rounded-t-sm relative transition-all group-hover:bg-red-400/40"
                                    >
                                        <div
                                            style={{ height: '4px' }}
                                            className="w-full bg-red-400 absolute top-0"
                                        />
                                    </div>
                                </div>
                                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">{month.label.split(' ')[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- INSIGHTS SIDEBAR --- */}
                <div className="space-y-6">
                    {/* Insights Card */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl text-white shadow-lg shadow-indigo-500/20">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <BrainCircuit size={20} /> AI Insights
                        </h3>
                        <div className="space-y-3">
                            {insights.map((insight, i) => (
                                <div key={i} className="flex gap-3 items-start bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0 opacity-80" />
                                    <p className="text-sm font-medium opacity-90 leading-tight">{insight}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Ideal Allocation */}
                    <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-platinum-200 dark:border-neutral-800">
                        <h3 className="font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                            <Target size={18} className="text-gold-500" /> 50/30/20 Rule
                        </h3>

                        <div className="space-y-4">
                            {/* Needs */}
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-neutral-500">Suggested Needs (50%)</span>
                                    <span className="font-bold dark:text-white">{formatCurrency(idealAllocation.needs, baseCurrency)}</span>
                                </div>
                                <div className="h-2 w-full bg-platinum-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-neutral-400 w-1/2 opacity-30"></div>
                                </div>
                            </div>
                            {/* Wants */}
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-neutral-500">Suggested Wants (30%)</span>
                                    <span className="font-bold dark:text-white">{formatCurrency(idealAllocation.wants, baseCurrency)}</span>
                                </div>
                                <div className="h-2 w-full bg-platinum-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-neutral-400 w-[30%] opacity-30"></div>
                                </div>
                            </div>
                            {/* Savings */}
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-neutral-500">Actual Savings (Avg)</span>
                                    <span className={`font-bold ${idealAllocation.actualSavings >= idealAllocation.savings ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {formatCurrency(idealAllocation.actualSavings, baseCurrency)}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-platinum-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${Math.min(100, (idealAllocation.actualSavings / (idealAllocation.needs * 2)) * 100)}%` }} // Scaling based on total income
                                        className={`h-full ${idealAllocation.actualSavings >= idealAllocation.savings ? 'bg-emerald-500' : 'bg-red-500'}`}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                                    <span>Target: {formatCurrency(idealAllocation.savings, baseCurrency)} (20%)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
