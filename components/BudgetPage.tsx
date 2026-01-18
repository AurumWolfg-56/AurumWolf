
import React, { useState } from 'react';
import {
    PieChart, Edit2, Plus, Check, Target, AlertTriangle, Activity, Trophy, Landmark,
    Wallet, DollarSign, X, TrendingUp, TrendingDown
} from 'lucide-react';
import { BudgetCategory, SavingsGoal } from '../types';
import { GoalForm } from './GoalForm';
import { BudgetForm } from './BudgetForm';
import { formatCurrency } from '../lib/money';
import { ICON_MAP } from '../constants';

// --- SUB COMPONENTS ---

import { getCategoriesForBudget } from '../lib/money';
import { Transaction } from '../types';

// --- SUB COMPONENTS ---

interface BudgetDetailModalProps {
    item: BudgetCategory;
    transactions: Transaction[];
    currencyCode: string;
    onClose: () => void;
    privacyMode: boolean;
    t: (key: string) => string;
}

const BudgetDetailModal: React.FC<BudgetDetailModalProps> = ({ item, transactions, currencyCode, onClose, privacyMode, t }) => {
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
        // If earned > limit, that's good (positive deviation)
        // If earned < limit but date is late, that's bad (negative deviation)
        if (item.spent > item.limit) {
            const percentHigher = Math.round(((item.spent - item.limit) / item.limit) * 100);
            insightMessage = `${percentHigher}% ${t('budget.incomeHigher')}`;
            insightType = 'positive';
        } else if (today.getDate() > 20 && (item.spent / item.limit) < 0.5) {
            // Late in month but low income
            const percentLower = Math.round(((item.limit - item.spent) / item.limit) * 100);
            insightMessage = `${percentLower}% ${t('budget.incomeLower')}`;
            insightType = 'negative';
        }
    }

    // Major Contributor (Expense)
    const maxTx = relevantTransactions.length > 0
        ? relevantTransactions.reduce((prev, current) => (prev.numericAmount > current.numericAmount) ? prev : current)
        : null;

    // If expense and over budget, or simply high usage, point out the max contributor
    if (!isIncome && maxTx && (item.spent / item.limit) > 0.5) {
        // Only show if it matches the deviation/spend significantly
        insightMessage = `${t('budget.majorContributor')}: ${maxTx.description} (${formatCurrency(maxTx.numericAmount, currencyCode, { privacy: privacyMode })})`;
        insightType = isOverBudget ? 'negative' : 'neutral';
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-platinum-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${isOverBudget ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {item.icon && typeof item.icon === 'string' && ICON_MAP[item.icon] ? React.createElement(ICON_MAP[item.icon], { size: 24 }) : <Wallet size={24} />}
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
                                                <p className="text-[10px] text-neutral-500">{tx.accountName}</p>
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


interface BudgetCardProps {
    item: BudgetCategory;
    spent: number;
    isEditing: boolean;
    onEditClick: (item: BudgetCategory) => void;
    onClick?: (item: BudgetCategory) => void; // New Prop
    privacyMode: boolean;
    currencyCode: string;
    t: (key: string) => string;
}

const BudgetCard: React.FC<BudgetCardProps> = ({ item, spent, isEditing, onEditClick, onClick, privacyMode, currencyCode, t }) => {
    const isIncome = item.type === 'income';
    // Safe Icon Resolution
    let Icon = Wallet;
    if (typeof item.icon === 'string' && ICON_MAP[item.icon]) {
        Icon = ICON_MAP[item.icon];
    } else if (typeof item.icon === 'function') {
        Icon = item.icon;
    }


    // --- PACING LOGIC ---
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const monthProgress = currentDay / daysInMonth; // 0.0 to 1.0

    const expectedSpend = item.limit * monthProgress;
    const isOverLimit = !isIncome && spent > item.limit;
    const isTargetMet = isIncome && spent >= item.limit;

    // Fixed Pacing calculation for UI display consistency
    // If Over Limit, we are clearly "ahead of pace" in a bad way.
    // Pacing Diff: + means Spent MORE than expected (Bad for expenses, Good for income?)
    // Actually simplicity is better:
    // Expense: Over Budget > Warning > Safe
    // Income: Target Met > In Progress

    // --- METRIC CALCULATIONS ---
    const remaining = Math.max(0, item.limit - spent);
    const percentage = item.limit > 0 ? (spent / item.limit) * 100 : 0;
    const percentageRounded = Math.round(percentage);

    // Bar Scaling
    const maxValue = Math.max(item.limit, spent, 1);
    const limitPercent = (item.limit / maxValue) * 100;
    const spentPercent = Math.max(0, (spent / maxValue) * 100);
    const pacingMarkerPercent = ((item.limit * monthProgress) / maxValue) * 100;

    // --- STATUS TEXT & COLOR RESOLUTION ---
    let statusLabel = '';
    let statusColor = '';
    let progressBarColor = '';

    if (isIncome) {
        if (isTargetMet) {
            statusLabel = t('budget.targetMet');
            statusColor = 'text-emerald-500';
            progressBarColor = 'bg-emerald-500';
        } else {
            statusLabel = t('budget.underBudget'); // Technically "Under Target", keeping simple
            statusColor = 'text-neutral-500';
            progressBarColor = 'bg-neutral-300 dark:bg-neutral-700'; // Neutral until hit
            progressBarColor = item.color; // Or use category color
        }
    } else {
        // Expenses
        if (isOverLimit) {
            statusLabel = `${t('budget.overBudget')} (${percentageRounded}%)`;
            statusColor = 'text-red-500';
            progressBarColor = 'bg-red-500';
        } else {
            // Check if "At Risk" (e.g. > 90% and it's early?)
            // For now, simple "Within Budget"
            statusLabel = t('budget.withinBudget');
            statusColor = 'text-emerald-500';
            progressBarColor = item.color;
        }
    }


    return (
        <div
            onClick={() => {
                if (isEditing) {
                    onEditClick(item);
                } else if (onClick) {
                    onClick(item);
                }
            }}
            className={`bg-white dark:bg-neutral-900 border rounded-2xl p-5 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[190px] shadow-sm dark:shadow-none ${isEditing
                ? 'border-gold-500/50 bg-platinum-100 dark:bg-neutral-900/80 cursor-pointer hover:bg-white dark:hover:bg-neutral-800'
                : 'border-platinum-200 dark:border-neutral-800 hover:border-platinum-300 dark:hover:border-neutral-700 cursor-pointer hover:shadow-md'
                } ${isOverLimit && !isEditing ? 'bg-red-50 dark:bg-neutral-900 border-red-200 dark:border-neutral-800' : ''}`}
        >
            {isOverLimit && !isEditing && (
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <AlertTriangle size={100} className="text-red-500" />
                </div>
            )}

            {/* Top Section: Icon & Category & STATUS */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-lg shrink-0 ${isOverLimit
                        ? 'bg-red-500/10 text-red-500 shadow-red-900/20'
                        : isTargetMet
                            ? 'bg-emerald-500/10 text-emerald-500 shadow-emerald-900/20'
                            : 'bg-platinum-100 dark:bg-neutral-800 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white'
                        }`}>
                        <Icon size={24} />
                    </div>
                    <div className="overflow-hidden flex-1 min-w-0">
                        <h4 className="font-bold text-neutral-900 dark:text-white text-base truncate">{item.category}</h4>
                        {/* THE REQUESTED STATUS LINE */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isOverLimit ? 'bg-red-500' : isIncome && !isTargetMet ? 'bg-neutral-400' : 'bg-emerald-500'}`}></div>
                            <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${statusColor}`}>
                                {statusLabel}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle Section: Big Numbers (Used vs Limit) */}
            <div className="relative z-10 mb-4">
                <div className="flex items-baseline justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-neutral-500 font-bold">{isIncome ? t('budget.received') : t('budget.used')}</span>
                        <span className={`text-2xl font-display font-bold ${isOverLimit ? 'text-red-500' : 'text-neutral-900 dark:text-white'}`}>
                            {formatCurrency(spent, currencyCode, { privacy: privacyMode })}
                        </span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase text-neutral-500 font-bold">{t('accounts.limit')}</span>
                        <span className="text-lg font-mono text-neutral-400 dark:text-neutral-600">
                            {formatCurrency(item.limit, currencyCode, { privacy: privacyMode })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Progress Bar & Detailed Metrics */}
            <div className="space-y-2 relative z-10 mt-auto">

                {/* Track */}
                <div className="h-4 w-full bg-platinum-200 dark:bg-neutral-950 rounded-full overflow-hidden relative border border-platinum-300 dark:border-neutral-800/50">
                    {/* Pacing Marker (Projected 'Today' line) */}
                    {!isIncome && (
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-neutral-900/30 dark:bg-white/30 z-20"
                            style={{ left: `${pacingMarkerPercent}%` }}
                            title={t('budget.pacingToday')}
                        ></div>
                    )}
                    {/* Limit Marker (Background Fill for Limit) */}
                    <div
                        className={`absolute top-0 bottom-0 left-0 bg-platinum-300 dark:bg-neutral-800/50 z-0 border-r border-dashed border-neutral-400 dark:border-neutral-600`}
                        style={{ width: `${limitPercent}%` }}
                    ></div>

                    {/* Actual Spend Bar */}
                    <div
                        className={`h-full rounded-full transition-all duration-700 relative z-10 ${progressBarColor}`}
                        style={{ width: `${spentPercent}%` }}
                    ></div>
                    {/* Overlimit Warning Stripe pattern if needed, but solid red is clearer */}
                </div>

                {/* Footer Metrics: Remaining & Percentage */}
                <div className="flex justify-between items-center text-[11px] font-medium">
                    <div className="flex items-center gap-1">
                        <span className="text-neutral-500">{t('budget.remaining')}:</span>
                        <span className={`font-bold ${remaining < 0 ? 'text-red-500' : 'text-neutral-900 dark:text-white'}`}>
                            {formatCurrency(isIncome ? Math.max(0, item.limit - spent) : remaining, currencyCode, { privacy: privacyMode })}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-neutral-500">{t('budget.percentage')}:</span>
                        <span className={`font-bold ${isOverLimit ? 'text-red-500' : 'text-neutral-900 dark:text-white'}`}>
                            {percentageRounded}%
                        </span>
                    </div>
                </div>

            </div>

            {isEditing && (
                <div className="absolute inset-0 bg-white/80 dark:bg-neutral-950/60 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full p-2 text-gold-500">
                        <Edit2 size={24} />
                    </div>
                </div>
            )}
        </div>
    );
};

interface GoalCardProps {
    goal: SavingsGoal;
    isEditing: boolean;
    onEditClick: (goal: SavingsGoal) => void;
    onDepositClick: (goal: SavingsGoal) => void;
    privacyMode: boolean;
    currencyCode: string;
    t: (key: string) => string;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, isEditing, onEditClick, onDepositClick, privacyMode, currencyCode, t }) => {
    // Safe Icon Resolution
    let Icon = Trophy;
    if (typeof goal.icon === 'string' && ICON_MAP[goal.icon]) {
        Icon = ICON_MAP[goal.icon];
    } else if (typeof goal.icon === 'function') {
        Icon = goal.icon;
    }

    const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div
            onClick={() => isEditing && onEditClick(goal)}
            className={`bg-white dark:bg-neutral-900 border rounded-2xl p-6 flex items-center gap-6 relative overflow-hidden group transition-all shadow-sm dark:shadow-none ${isEditing
                ? 'border-gold-500/50 cursor-pointer bg-platinum-50 dark:bg-neutral-900/80 hover:bg-white dark:hover:bg-neutral-800'
                : 'border-platinum-200 dark:border-neutral-800 hover:border-gold-500/30'
                }`}
        >
            {/* Circular Progress */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r={radius} className="stroke-platinum-200 dark:stroke-neutral-800" strokeWidth="6" fill="none" />
                    <circle
                        cx="40" cy="40" r={radius}
                        stroke={goal.color.replace('bg-', 'text-').replace('500', '400')}
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-1000 ease-out"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">{Math.round(progress)}%</span>
                </div>
            </div>

            <div className="flex-1 z-10">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className="font-bold text-neutral-900 dark:text-white text-sm">{goal.name}</h4>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{goal.deadline ? `${t('budget.due')} ${goal.deadline}` : t('budget.noDeadline')}</p>
                    </div>
                    {isEditing ? (
                        <div className={`p-2 rounded-lg bg-platinum-100 dark:bg-neutral-950 ${goal.color.replace('bg-', 'text-')} bg-opacity-10`}>
                            <Icon size={16} />
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDepositClick(goal); }}
                            className="p-2 rounded-lg bg-gold-500 text-neutral-950 hover:bg-gold-400 transition-colors shadow-lg"
                            title={t('budget.addFunds')}
                        >
                            <Plus size={16} />
                        </button>
                    )}
                </div>

                <div>
                    <p className="text-lg font-mono font-bold text-neutral-900 dark:text-white">{formatCurrency(goal.savedAmount, currencyCode, { privacy: privacyMode })}</p>
                    <p className="text-[10px] text-neutral-500">{t('budget.ofGoal')} {formatCurrency(goal.targetAmount, currencyCode, { privacy: privacyMode })}</p>
                </div>
            </div>

            {isEditing && (
                <div className="absolute inset-0 bg-white/80 dark:bg-neutral-950/60 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full p-2 text-gold-500">
                        <Edit2 size={20} />
                    </div>
                </div>
            )}
        </div>
    );
};

interface BudgetPageProps {
    budgets: BudgetCategory[];
    onUpdateBudget: (budget: BudgetCategory) => void;
    onAddBudget?: (b: BudgetCategory) => void;
    onDeleteBudget?: (id: string) => void;

    goals?: SavingsGoal[];
    onUpdateGoal?: (goal: SavingsGoal) => void;
    onAddGoal?: (g: SavingsGoal) => void;
    onDeleteGoal?: (id: string) => void;
    onContributeToGoal?: (id: string, amount: number) => void;
    transactions?: Transaction[]; // New Prop

    privacyMode?: boolean;
    baseCurrency: string;
    t: (key: string) => string;
}

export const BudgetPage: React.FC<BudgetPageProps> = ({
    budgets,
    onUpdateBudget,
    onAddBudget,
    onDeleteBudget,
    goals = [],
    onUpdateGoal,
    onAddGoal,
    onDeleteGoal,
    onContributeToGoal,
    transactions = [],
    privacyMode = false,
    baseCurrency = 'USD',
    t
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [activeBudgetModal, setActiveBudgetModal] = useState<BudgetCategory | 'new' | null>(null);
    const [activeGoalModal, setActiveGoalModal] = useState<SavingsGoal | 'new' | null>(null);
    const [detailModalItem, setDetailModalItem] = useState<BudgetCategory | null>(null); // New State
    const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
    const [depositAmount, setDepositAmount] = useState('');

    // Split into Income and Expense based on props
    const incomeBudgets = budgets.filter(b => b.type === 'income');
    const expenseBudgets = budgets.filter(b => b.type !== 'income');

    // Totals
    const totalIncome = incomeBudgets.reduce((acc, b) => acc + b.spent, 0);
    const totalExpenses = expenseBudgets.reduce((acc, b) => acc + b.spent, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Handlers
    const handleSaveBudget = (b: BudgetCategory) => {
        const cleanBudget = { ...b, spent: 0 };

        if (activeBudgetModal === 'new') {
            onAddBudget?.(cleanBudget);
        } else {
            onUpdateBudget(cleanBudget);
        }
        setActiveBudgetModal(null);
    };

    const handleSaveGoal = (g: SavingsGoal) => {
        if (activeGoalModal === 'new') {
            onAddGoal?.(g);
        } else {
            onUpdateGoal?.(g);
        }
        setActiveGoalModal(null);
    };

    const handleDeleteBudgetHandler = (id: string) => {
        onDeleteBudget?.(id);
        setActiveBudgetModal(null);
    };

    const handleDeleteGoalHandler = (id: string) => {
        onDeleteGoal?.(id);
        setActiveGoalModal(null);
    };

    const handleExecuteDeposit = (e: React.FormEvent) => {
        e.preventDefault();
        if (depositGoalId && depositAmount && onContributeToGoal) {
            onContributeToGoal(depositGoalId, parseFloat(depositAmount));
            setDepositGoalId(null);
            setDepositAmount('');
        }
    };

    return (
        <div className="animate-fade-in space-y-8 pb-20 md:pb-0">

            {/* --- HEADER STATS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Net Cash Flow */}
                <div className="bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl p-5 relative overflow-hidden group shadow-sm dark:shadow-none">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={80} className="text-neutral-900 dark:text-white" /></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-platinum-100 dark:bg-neutral-950 rounded-lg text-gold-500 border border-platinum-200 dark:border-neutral-800"><ScaleIcon /></div>
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t('budget.netCashFlow')}</span>
                        </div>
                        <h3 className={`text-3xl font-display font-bold ${netSavings >= 0 ? 'text-neutral-900 dark:text-white' : 'text-red-500'}`}>
                            {netSavings > 0 ? '+' : ''}{formatCurrency(netSavings, baseCurrency, { privacy: privacyMode })}
                        </h3>
                        <div className="mt-2 text-xs text-neutral-500">
                            <span className={savingsRate > 20 ? 'text-green-500 font-bold' : 'text-neutral-400'}>{savingsRate.toFixed(0)}%</span> {t('budget.savingsRate')}
                        </div>
                    </div>
                </div>

                {/* Monthly Income */}
                <div className="bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl p-5 relative overflow-hidden group shadow-sm dark:shadow-none">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={80} className="text-emerald-500" /></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-platinum-100 dark:bg-neutral-950 rounded-lg text-emerald-500 border border-platinum-200 dark:border-neutral-800"><TrendingUp size={16} /></div>
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t('budget.incomeMtd')}</span>
                        </div>
                        <h3 className="text-3xl font-display font-bold text-emerald-500">{formatCurrency(totalIncome, baseCurrency, { privacy: privacyMode })}</h3>
                    </div>
                </div>

                {/* Monthly Expenses */}
                <div className="bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl p-5 relative overflow-hidden group shadow-sm dark:shadow-none">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingDown size={80} className="text-red-500" /></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-platinum-100 dark:bg-neutral-950 rounded-lg text-red-500 border border-platinum-200 dark:border-neutral-800"><TrendingDown size={16} /></div>
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t('budget.expensesMtd')}</span>
                        </div>
                        <h3 className="text-3xl font-display font-bold text-red-500">{formatCurrency(totalExpenses, baseCurrency, { privacy: privacyMode })}</h3>
                    </div>
                </div>
            </div>

            {/* --- CONTROLS --- */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <PieChart size={20} className="text-gold-500" /> {t('budget.allocations')}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveBudgetModal('new')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-platinum-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-platinum-200 dark:hover:bg-neutral-700"
                    >
                        <Plus size={14} /> {t('common.add')}
                    </button>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isEditing
                            ? 'bg-gold-500 text-neutral-950 border-gold-500 hover:bg-gold-400'
                            : 'bg-white dark:bg-neutral-900 text-neutral-400 border-platinum-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-white hover:border-platinum-300 dark:hover:border-neutral-600'
                            }`}
                    >
                        {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
                        {isEditing ? t('budget.doneEditing') : t('budget.editStructure')}
                    </button>
                </div>
            </div>

            {/* --- GOALS SECTION --- */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                        <Target size={16} className="text-blue-500" /> {t('budget.wealthGoals')}
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {goals.map(goal => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            isEditing={isEditing}
                            onEditClick={(g) => setActiveGoalModal(g)}
                            onDepositClick={(g) => setDepositGoalId(g.id)}
                            privacyMode={privacyMode}
                            currencyCode={baseCurrency}
                            t={t}
                        />
                    ))}
                    {isEditing && (
                        <button
                            onClick={() => setActiveGoalModal('new')}
                            className="rounded-2xl border-2 border-dashed border-platinum-300 dark:border-neutral-800 flex flex-col items-center justify-center gap-3 text-neutral-400 dark:text-neutral-600 hover:text-gold-500 dark:hover:text-gold-500 hover:border-gold-500/50 hover:bg-platinum-50 dark:hover:bg-neutral-900/50 transition-all min-h-[150px]"
                        >
                            <Plus size={24} />
                            <span className="text-xs font-bold uppercase tracking-wider">{t('budget.newGoal')}</span>
                        </button>
                    )}
                </div>
                {goals.length === 0 && !isEditing && (
                    <div className="p-8 border border-dashed border-platinum-300 dark:border-neutral-800 rounded-2xl text-center text-neutral-500">
                        <p className="text-sm">{t('budget.noGoals')}</p>
                    </div>
                )}
            </div>

            {/* --- EXPENSE BUDGETS --- */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                        <TrendingDown size={16} className="text-red-500" /> {t('budget.expenseLimits')}
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {expenseBudgets.map(item => (
                        <BudgetCard
                            key={item.id}
                            item={item}
                            spent={item.spent}
                            isEditing={isEditing}
                            onEditClick={(b) => setActiveBudgetModal(b)}
                            onClick={(b) => setDetailModalItem(b)}
                            privacyMode={privacyMode}
                            currencyCode={baseCurrency}
                            t={t}
                        />
                    ))}
                    {isEditing && (
                        <button
                            onClick={() => setActiveBudgetModal('new')}
                            className="rounded-2xl border-2 border-dashed border-platinum-300 dark:border-neutral-800 flex flex-col items-center justify-center gap-3 text-neutral-400 dark:text-neutral-600 hover:text-gold-500 dark:hover:text-gold-500 hover:border-gold-500/50 hover:bg-platinum-50 dark:hover:bg-neutral-900/50 transition-all min-h-[150px]"
                        >
                            <Plus size={24} />
                            <span className="text-xs font-bold uppercase tracking-wider">{t('budget.newCategory')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* --- INCOME TARGETS --- */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-500" /> {t('budget.incomeTargets')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {incomeBudgets.map(item => (
                        <BudgetCard
                            key={item.id}
                            item={item}
                            spent={item.spent}
                            isEditing={isEditing}
                            onEditClick={(b) => setActiveBudgetModal(b)}
                            onClick={(b) => setDetailModalItem(b)}
                            privacyMode={privacyMode}
                            currencyCode={baseCurrency}
                            t={t}
                        />
                    ))}
                </div>
            </div>

            {/* --- MODALS --- */}
            {activeBudgetModal && (
                <BudgetForm
                    initialData={activeBudgetModal === 'new' ? null : activeBudgetModal}
                    onSave={handleSaveBudget}
                    onDelete={handleDeleteBudgetHandler}
                    onCancel={() => setActiveBudgetModal(null)}
                />
            )}

            {activeGoalModal && (
                <GoalForm
                    initialData={activeGoalModal === 'new' ? null : activeGoalModal}
                    onSave={handleSaveGoal}
                    onDelete={handleDeleteGoalHandler}
                    onCancel={() => setActiveGoalModal(null)}
                />
            )}

            {/* DEPOSIT MODAL */}
            {depositGoalId && (
                <div className="fixed inset-0 z-[80] bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fade-in relative">
                        <button onClick={() => setDepositGoalId(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">{t('budget.addFunds')}</h3>
                        <form onSubmit={handleExecuteDeposit}>
                            <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase">{t('common.amount')}</label>
                            <div className="relative mb-6">
                                <DollarSign size={16} className="absolute left-3 top-3.5 text-neutral-500" />
                                <input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    className="w-full bg-platinum-50 dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-lg font-bold rounded-xl p-3 pl-9 outline-none focus:border-gold-500"
                                    placeholder="0.00"
                                    autoFocus
                                />
                                <span className="absolute right-3 top-3.5 text-xs text-neutral-500 font-bold">{baseCurrency}</span>
                            </div>
                            <button type="submit" disabled={!depositAmount} className="w-full py-3 bg-gold-500 text-neutral-950 font-bold rounded-xl hover:bg-gold-400 disabled:opacity-50 transition-all">
                                {t('budget.confirmDeposit')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL */}
            {detailModalItem && (
                <BudgetDetailModal
                    item={detailModalItem}
                    transactions={transactions}
                    currencyCode={baseCurrency}
                    onClose={() => setDetailModalItem(null)}
                    privacyMode={privacyMode}
                    t={t}
                />
            )}

        </div>
    );
};

// Icon Helper
const ScaleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
);
