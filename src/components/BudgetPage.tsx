
import React, { useState } from 'react';
import {
    PieChart, Edit2, Plus, Check, Target, Activity, Trophy,
    DollarSign, X, TrendingUp, TrendingDown, Scale
} from 'lucide-react';
import { BudgetCategory, SavingsGoal, Transaction } from '../types';
import { GoalForm } from './GoalForm';
import { BudgetForm } from './BudgetForm';
import { formatCurrency } from '../lib/money';
import { useAccounts } from '../contexts/AccountsContext';

// Extracted sub-components
import { BudgetDetailModal, BudgetCard, GoalCard } from './budget';

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
    transactions?: Transaction[];

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
    const { accounts } = useAccounts();
    const [isEditing, setIsEditing] = useState(false);
    const [activeBudgetModal, setActiveBudgetModal] = useState<{ mode: 'budget' | 'category'; data: BudgetCategory | 'new' } | null>(null);
    const [activeGoalModal, setActiveGoalModal] = useState<SavingsGoal | 'new' | null>(null);
    const [detailModalItem, setDetailModalItem] = useState<BudgetCategory | null>(null); // New State
    const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
    const [depositAmount, setDepositAmount] = useState('');

    // FILTER: Only show active budgets (limit > 0) OR if user is in "Manage Categories" mode (editing)
    const incomeBudgets = budgets.filter(b => b.type === 'income' && (b.limit > 0 || isEditing));
    const expenseBudgets = budgets.filter(b => b.type !== 'income' && (b.limit > 0 || isEditing));

    // Totals
    const totalIncome = incomeBudgets.reduce((acc, b) => acc + b.spent, 0);
    const totalExpenses = expenseBudgets.reduce((acc, b) => acc + b.spent, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Handlers
    const handleSaveBudget = (b: BudgetCategory) => {
        if (activeBudgetModal?.data === 'new') {
            const cleanBudget = { ...b, spent: 0 };
            onAddBudget?.(cleanBudget);
        } else {
            // Preserve existing spent amount if updating
            onUpdateBudget(b);
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
                            <div className="p-2 bg-platinum-100 dark:bg-neutral-950 rounded-lg text-gold-500 border border-platinum-200 dark:border-neutral-800"><Scale /></div>
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
                        onClick={() => setActiveBudgetModal({ mode: 'budget', data: 'new' })} // Explicitly use mode
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-gold-500 text-neutral-950 hover:bg-gold-400 shadow-lg hover:shadow-gold-500/20"
                    >
                        <Plus size={14} /> {t('common.add')}
                    </button>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isEditing
                            ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900'
                            : 'bg-white dark:bg-neutral-900 text-neutral-400 border-platinum-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                            }`}
                    >
                        {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
                        {isEditing ? t('budget.doneEditing') : "Manage Categories"}
                    </button>
                </div>
            </div>

            {/* Editing Config Hint */}
            {isEditing && (
                <div className="flex items-center justify-center -mt-2 mb-6 animate-pulse">
                    <button
                        onClick={() => setActiveBudgetModal({ mode: 'category', data: 'new' })}
                        className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:scale-105 transition-transform border border-purple-200 dark:border-purple-800"
                    >
                        <Plus size={14} /> Create Custom Category
                    </button>
                </div>
            )}


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
                            onEditClick={(b) => setActiveBudgetModal({ mode: 'category', data: b })}
                            onClick={(b) => setDetailModalItem(b)}
                            privacyMode={privacyMode}
                            currencyCode={baseCurrency}
                            t={t}
                        />
                    ))}
                    {isEditing && (
                        <button
                            onClick={() => setActiveBudgetModal({ mode: 'category', data: 'new' })}
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
                            onEditClick={(b) => setActiveBudgetModal({ mode: 'category', data: b })}
                            onClick={(b) => setDetailModalItem(b)}
                            privacyMode={privacyMode}
                            currencyCode={baseCurrency}
                            t={t}
                        />
                    ))}
                </div>
            </div>

            {/* --- MODALS --- */}
            {
                activeBudgetModal && (
                    <BudgetForm
                        initialData={activeBudgetModal.data === 'new' ? null : activeBudgetModal.data}
                        mode={activeBudgetModal.mode}
                        onSave={handleSaveBudget}
                        onDelete={handleDeleteBudgetHandler}
                        onCancel={() => setActiveBudgetModal(null)}
                        onOpenCategoryCreator={
                            // When in budget mode, clicking "Create New Category" opens category creation mode
                            activeBudgetModal.mode === 'budget'
                                ? () => setActiveBudgetModal({ mode: 'category', data: 'new' })
                                : undefined
                        }
                    />
                )
            }

            {
                activeGoalModal && (
                    <GoalForm
                        initialData={activeGoalModal === 'new' ? null : activeGoalModal}
                        onSave={handleSaveGoal}
                        onDelete={handleDeleteGoalHandler}
                        onCancel={() => setActiveGoalModal(null)}
                    />
                )
            }

            {/* DEPOSIT MODAL */}
            {
                depositGoalId && (
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
                )
            }

            {/* DETAIL MODAL */}
            {
                detailModalItem && (
                    <BudgetDetailModal
                        item={detailModalItem}
                        transactions={transactions}
                        accounts={accounts}
                        currencyCode={baseCurrency}
                        onClose={() => setDetailModalItem(null)}
                        privacyMode={privacyMode}
                        t={t}
                    />
                )
            }

        </div >
    );
};

// Icon Helper
const ScaleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
);
