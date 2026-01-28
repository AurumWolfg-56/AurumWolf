
import React, { useState } from 'react';
import {
    PieChart, Edit2, Plus, Check, Target, Activity, Trophy,
    DollarSign, X, TrendingUp, TrendingDown, Scale, BrainCircuit
} from 'lucide-react';
import { BudgetCategory, SavingsGoal, Transaction } from '../types';
import { GoalForm } from './GoalForm';
import { BudgetForm } from './BudgetForm';
import { formatCurrency } from '../lib/money';
import { useAccounts } from '../contexts/AccountsContext';

// Extracted sub-components
import { BudgetDetailModal, BudgetCard, GoalCard } from './budget';
import { BudgetAnalyzer } from './budget/BudgetAnalyzer';
import { getIconComponent } from '../lib/iconMapper';

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
    const [viewMode, setViewMode] = useState<'dashboard' | 'categories' | 'analyzer'>('dashboard');
    const [activeBudgetModal, setActiveBudgetModal] = useState<{ mode: 'budget' | 'category'; data: BudgetCategory | 'new'; returnToBudget?: boolean } | null>(null);

    const [activeGoalModal, setActiveGoalModal] = useState<SavingsGoal | 'new' | null>(null);
    const [detailModalItem, setDetailModalItem] = useState<BudgetCategory | null>(null);
    const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
    const [depositAmount, setDepositAmount] = useState('');

    // FILTER: 
    // Dashboard Mode: Only show active budgets (limit > 0)
    // Categories Mode: Show ALL categories
    const incomeCategories = budgets.filter(b => b.type === 'income');
    const expenseCategories = budgets.filter(b => b.type !== 'income');

    // Financial Data (for stats) always uses active budgets
    const activeIncome = incomeCategories.filter(b => b.limit > 0);
    const activeExpenses = expenseCategories.filter(b => b.limit > 0);

    // Display Data based on View Mode
    const displayedIncome = viewMode === 'categories' ? incomeCategories : activeIncome;
    const displayedExpenses = viewMode === 'categories' ? expenseCategories : activeExpenses;

    const totalIncome = activeIncome.reduce((acc, b) => acc + b.spent, 0);
    const totalExpenses = activeExpenses.reduce((acc, b) => acc + b.spent, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Handlers
    const handleSaveBudget = (b: BudgetCategory) => {
        if (activeBudgetModal?.data === 'new') {
            const cleanBudget = { ...b, spent: 0 };
            onAddBudget?.(cleanBudget);

            // If returning to budget mode after creating category
            if (activeBudgetModal.returnToBudget) {
                setActiveBudgetModal({
                    mode: 'budget',
                    data: cleanBudget,
                    returnToBudget: false
                });
                return;
            }
        } else {
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

            {/* --- HEADER STATS (Only in Dashboard) --- */}
            {viewMode === 'dashboard' && (
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
            )}

            {/* --- CONTROLS --- */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    {viewMode === 'dashboard'
                        ? <><PieChart size={20} className="text-gold-500" /> {t('budget.allocations')}</>
                        : viewMode === 'analyzer'
                            ? <><Activity size={20} className="text-indigo-500" /> Financial Intelligence</>
                            : <><Edit2 size={20} className="text-purple-500" /> Category Manager</>
                    }
                </h2>
                <div className="flex gap-2">
                    {/* Analyzer Toggle */}
                    <button
                        onClick={() => setViewMode(viewMode === 'analyzer' ? 'dashboard' : 'analyzer')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${viewMode === 'analyzer'
                            ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500'
                            : 'bg-white dark:bg-neutral-900 text-neutral-400 border-platinum-200 dark:border-neutral-800 hover:text-indigo-500 hover:border-indigo-200'
                            }`}
                    >
                        <BrainCircuit size={14} /> {viewMode === 'analyzer' ? "Close Analyzer" : "Smart Analyzer"}
                    </button>

                    {viewMode === 'dashboard' && (
                        <button
                            onClick={() => setActiveBudgetModal({ mode: 'budget', data: 'new' })}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-gold-500 text-neutral-950 hover:bg-gold-400 shadow-lg hover:shadow-gold-500/20"
                        >
                            <Plus size={14} /> {t('common.add')}
                        </button>
                    )}

                    {viewMode !== 'analyzer' && (
                        <button
                            onClick={() => setViewMode(viewMode === 'dashboard' ? 'categories' : 'dashboard')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${viewMode === 'categories'
                                ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 hover:opacity-90'
                                : 'bg-white dark:bg-neutral-900 text-neutral-400 border-platinum-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                                }`}
                        >
                            {viewMode === 'categories' ? <Check size={14} /> : <Edit2 size={14} />}
                            {viewMode === 'categories' ? "Done Managing" : "Manage Categories"}
                        </button>
                    )}
                </div>
            </div>

            {/* --- ANALYZER VIEW --- */}
            {viewMode === 'analyzer' ? (
                <BudgetAnalyzer
                    transactions={transactions}
                    budgets={budgets}
                    baseCurrency={baseCurrency}
                    t={t}
                />
            ) : (
                <>
                    {/* ... Existing Dashboard/Category View ... */}


                    {/* --- CATEGORY MANAGER HINT --- */}
                    {viewMode === 'categories' && (
                        <div className="flex items-center justify-center -mt-2 mb-6 animate-pulse">
                            <button
                                onClick={() => setActiveBudgetModal({ mode: 'category', data: 'new' })}
                                className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:scale-105 transition-transform border border-purple-200 dark:border-purple-800"
                            >
                                <Plus size={14} /> Create New Structure Category
                            </button>
                        </div>
                    )}


                    {/* --- GOALS SECTION (Only Dashboard) --- */}
                    {viewMode === 'dashboard' && (
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
                                        isEditing={false}
                                        onEditClick={(g) => setActiveGoalModal(g)}
                                        onDepositClick={(g) => setDepositGoalId(g.id)}
                                        privacyMode={privacyMode}
                                        currencyCode={baseCurrency}
                                        t={t}
                                    />
                                ))}
                                <button
                                    onClick={() => setActiveGoalModal('new')}
                                    className="rounded-2xl border-2 border-dashed border-platinum-300 dark:border-neutral-800 flex flex-col items-center justify-center gap-3 text-neutral-400 dark:text-neutral-600 hover:text-blue-500 dark:hover:text-blue-500 hover:border-blue-500/50 hover:bg-platinum-50 dark:hover:bg-neutral-900/50 transition-all min-h-[150px]"
                                >
                                    <Plus size={24} />
                                    <span className="text-xs font-bold uppercase tracking-wider">{t('budget.newGoal')}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- LISTS --- */}

                    {/* EXPENSES */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                                <TrendingDown size={16} className="text-red-500" />
                                {viewMode === 'dashboard' ? t('budget.expenseLimits') : "Expense Categories"}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {displayedExpenses.map(item => (
                                // Logic Switch based on mode
                                viewMode === 'dashboard' ? (
                                    <BudgetCard
                                        key={item.id}
                                        item={item}
                                        spent={item.spent}
                                        isEditing={false}
                                        onEditClick={(b) => setActiveBudgetModal({ mode: 'budget', data: b })} // Edit Budget Limit
                                        onClick={(b) => setDetailModalItem(b)}
                                        privacyMode={privacyMode}
                                        currencyCode={baseCurrency}
                                        t={t}
                                    />
                                ) : (
                                    // CATEGORY CARD COMPONENT
                                    <CategoryCard
                                        key={item.id}
                                        item={item}
                                        onClick={() => setActiveBudgetModal({ mode: 'category', data: item })}
                                    />
                                )
                            ))}
                            {displayedExpenses.length === 0 && viewMode === 'dashboard' && (
                                <div className="col-span-full p-8 border border-dashed border-platinum-300 dark:border-neutral-800 rounded-2xl text-center text-neutral-500">
                                    No active expense budgets. Click "Add" or "Manage Categories" to set one up.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* INCOME */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp size={16} className="text-emerald-500" />
                            {viewMode === 'dashboard' ? t('budget.incomeTargets') : "Income Sources"}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {displayedIncome.map(item => (
                                viewMode === 'dashboard' ? (
                                    <BudgetCard
                                        key={item.id}
                                        item={item}
                                        spent={item.spent}
                                        isEditing={false}
                                        onEditClick={(b) => setActiveBudgetModal({ mode: 'budget', data: b })}
                                        onClick={(b) => setDetailModalItem(b)}
                                        privacyMode={privacyMode}
                                        currencyCode={baseCurrency}
                                        t={t}
                                    />
                                ) : (
                                    <CategoryCard
                                        key={item.id}
                                        item={item}
                                        onClick={() => setActiveBudgetModal({ mode: 'category', data: item })}
                                    />
                                )
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
                                        ? () => setActiveBudgetModal({ mode: 'category', data: 'new', returnToBudget: true })
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

                </>
            )}

        </div >

    );
};

// Icon Helper
const ScaleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
);

interface CategoryCardProps {
    item: BudgetCategory;
    onClick: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ item, onClick }) => {
    const Icon = getIconComponent(item.icon_key);
    return (
        <div
            onClick={onClick}
            className="group relative bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl p-4 flex items-center gap-4 hover:border-gold-500/50 hover:shadow-lg transition-all cursor-pointer"
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0 ${item.color || 'bg-neutral-800'}`}>
                <Icon size={24} />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-neutral-900 dark:text-white truncate">{item.category}</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate capitalize">{item.type} Category</p>
            </div>
            <div className="p-2 rounded-full bg-platinum-100 dark:bg-neutral-800 text-neutral-400 group-hover:text-gold-500 transition-colors">
                <Edit2 size={16} />
            </div>
        </div>
    );
};
