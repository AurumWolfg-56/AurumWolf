
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Layout } from './components/Layout';
import { DashboardPage } from './components/DashboardPage';
import { AccountsPage } from './components/AccountsPage';
import { TransactionsPage } from './components/TransactionsPage';
import { BudgetPage } from './components/BudgetPage';
import { BusinessPage } from './components/BusinessPage';
import { InvestmentsPage } from './components/InvestmentsPage';
import { ReportsPage } from './components/ReportsPage';
import { SettingsPage } from './components/SettingsPage';
import { ScanPage } from './components/ScanPage';
import { LockScreen } from './components/LockScreen';
import { TransactionForm } from './components/TransactionForm';

import {
    Transaction, Account, BudgetCategory, SavingsGoal,
    Investment, BusinessEntity, AppNotification, NavTab, Language, RecurringFrequency
} from './types';
import {
    TRANSLATIONS, INITIAL_BUDGET_CONFIG, INITIAL_GOALS,
    INITIAL_INVESTMENTS, BUSINESS_ENTITIES as DEFAULT_BUSINESS_ENTITIES
} from './constants';
import {
    getJSON, setJSON, getSafeArray, STORAGE_KEYS, migrateIfNeeded, clearData
} from './lib/storage';
import {
    computeNetWorth, computeBudgetSpentMonthly, computeBusinessMetrics
} from './lib/selectors';
import { reconcileAccountBalance, convertAmount, formatCurrency } from './lib/money';
import { addMonthsToDate, addDaysToDate, addYearsToDate, getLocalDateISO } from './lib/dates';

// Hooks
import { useAccounts } from './contexts/AccountsContext';
import { useTransactions } from './contexts/TransactionsContext';
import { useBudgets } from './contexts/BudgetsContext';
import { useInvestments } from './contexts/InvestmentsContext';
import { useBusiness } from './contexts/BusinessContext';

import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';

// ... (keep imports)

export default function App() {
    const { user, profile, loading, signOut, passwordRecoveryMode } = useAuth();

    // Context Data
    const { accounts, addAccount, updateAccount, deleteAccount, refreshAccounts } = useAccounts();
    const { transactions, addTransaction, updateTransaction, deleteTransaction, refreshTransactions } = useTransactions();
    const {
        budgets, goals,
        addBudget, updateBudget, deleteBudget,
        addGoal, updateGoal, deleteGoal,
        refreshBudgets
    } = useBudgets();
    const { investments } = useInvestments();
    const { entities: businessEntities, healthScores } = useBusiness();

    const [activeTab, setActiveTab] = useState<NavTab>('home');
    // const [isLocked, setIsLocked] = useState(true); // Removing legacy local lock
    const [baseCurrency, setBaseCurrency] = useState<string>(() => getJSON(STORAGE_KEYS.BASE_CURRENCY, 'USD'));
    // ...

    // --- RENDER CHECKS MOVED TO END ---

    // ... (rest of App component)
    const [language, setLanguage] = useState<Language>(() => getJSON(STORAGE_KEYS.LANGUAGE, 'en'));
    const [privacyMode, setPrivacyMode] = useState(() => getJSON(STORAGE_KEYS.PRIVACY, false));
    const [searchQuery, setSearchQuery] = useState('');
    const [showTransactionForm, setShowTransactionForm] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    // State for transaction filtering via navigation
    const [transactionsFilterAccountId, setTransactionsFilterAccountId] = useState<string | null>(null);

    // State to track which recurring transaction is being paid
    const [pendingRecurringId, setPendingRecurringId] = useState<string | null>(null);

    // --- SCANNING STATE ---
    const [scannedData, setScannedData] = useState<Partial<Transaction> | null>(null);

    const initialized = useRef(false);

    // Initialize OTHER state (not moved to context yet)


    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    // --- PERSISTENCE FOR OTHER STATE ---
    useEffect(() => {
        if (!initialized.current) {
            migrateIfNeeded();
            initialized.current = true;
        }
    }, []);

    useEffect(() => {
        // Accounts, Transactions, Budgets, Goals are handled by Contexts now
        // Investments and Business are also handled by Contexts (Phase 2)
        setJSON(STORAGE_KEYS.BASE_CURRENCY, baseCurrency);
        setJSON(STORAGE_KEYS.LANGUAGE, language);
        setJSON(STORAGE_KEYS.PRIVACY, privacyMode);
    }, [baseCurrency, language, privacyMode]);

    // --- DERIVED STATE (SELECTORS) ---
    const netWorth = useMemo(() => computeNetWorth(accounts, investments, baseCurrency), [accounts, investments, baseCurrency]);
    const enrichedBudgets = useMemo(() => computeBudgetSpentMonthly(budgets, transactions, baseCurrency), [budgets, transactions, baseCurrency]);
    const enrichedEntities = useMemo(() => computeBusinessMetrics(businessEntities, transactions, baseCurrency), [businessEntities, transactions, baseCurrency]);

    // --- NOTIFICATION ENGINE ---
    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const generated: AppNotification[] = [];

        // 1. Budget Alerts
        enrichedBudgets.forEach(b => {
            if (b.type !== 'income' && b.limit > 0 && b.spent > b.limit) {
                const excess = b.spent - b.limit;
                generated.push({
                    id: `budget-${b.id}`,
                    title: `${t('budget.alert')}: ${b.category}`,
                    message: `${t('budget.alertMessage')} ${formatCurrency(excess, baseCurrency)}.`,
                    type: 'critical',
                    timestamp: new Date(),
                    read: false,
                    actionLabel: 'Adjust Plan',
                    actionTab: 'budget'
                });
            }
        });

        // 2. Recurring Due Alerts
        transactions.forEach(t => {
            if (t.isRecurring && t.nextRecurringDate && t.nextRecurringDate <= todayStr) {
                // Stop if past end date
                if (t.recurringEndDate && t.nextRecurringDate > t.recurringEndDate) return;

                generated.push({
                    id: `rec-due-${t.id}-${t.nextRecurringDate}`,
                    title: `Subscription Due: ${t.name}`,
                    message: `${t.amount} is due today.`,
                    type: 'warning',
                    timestamp: new Date(),
                    read: false,
                    actionLabel: 'Pay Now',
                    actionTab: 'transactions',
                    payload: { action: 'payRecurring', transactionId: t.id }
                });
            }
        });

        // 3. Deduplicate & Merge
        setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newItems = generated.filter(n => !existingIds.has(n.id));

            if (newItems.length === 0) return prev;

            // Newest first, max 10
            return [...newItems, ...prev].slice(0, 10);
        });

    }, [enrichedBudgets, transactions, baseCurrency]);

    const t = useCallback((key: string) => {
        const keys = key.split('.');
        let val: any = TRANSLATIONS[language];
        for (const k of keys) {
            val = val?.[k];
        }
        return val || key;
    }, [language]);

    // --- SAFETY WRAPPERS ---
    // Ensure we never persist the calculated 'spent' value to storage.
    // We reset it to 0 before saving to state (which triggers the persistence useEffect).

    const calculateNextDate = (startDate: string, freq: RecurringFrequency): string => {
        if (freq === 'daily') return addDaysToDate(startDate, 1);
        if (freq === 'weekly') return addDaysToDate(startDate, 7);
        if (freq === 'monthly') return addMonthsToDate(startDate, 1);
        if (freq === 'yearly') return addYearsToDate(startDate, 1);
        return startDate;
    };

    // --- ORCHESTRATION HANDLERS ---
    // These handlers use context setters to update multiple stores if needed

    const handleSaveTransaction = (tx: Transaction) => {
        let oldTx: Transaction | undefined;

        // 1. Capture old state if editing
        if (editingTransaction) {
            oldTx = transactions.find(t => t.id === tx.id);
            updateTransaction(tx);
        } else {
            addTransaction(tx);
        }

        // Handle Recurring Update (if this was a "Pay Now" action)
        if (pendingRecurringId) {
            const parent = transactions.find(t => t.id === pendingRecurringId);
            if (parent && parent.isRecurring && parent.recurringFrequency) {
                const nextDate = calculateNextDate(parent.nextRecurringDate || parent.date, parent.recurringFrequency);
                updateTransaction({
                    ...parent,
                    nextRecurringDate: nextDate
                });
            }
            setPendingRecurringId(null);
        }

        // 2. Simulate the new transaction list locally to calculate balances immediately
        // (Context update is async, so we can't rely on 'transactions' being updated yet)
        let updatedTransactionsList = editingTransaction
            ? transactions.map(t => t.id === tx.id ? tx : t)
            : [tx, ...transactions];

        // 3. Reconcile the NEW account (Target)
        const newAccount = accounts.find(a => a.id === tx.accountId);
        if (newAccount) {
            const newBalance = reconcileAccountBalance(newAccount, updatedTransactionsList);
            updateAccount({ ...newAccount, balance: newBalance });
        }

        // 4. If editing and the account ID changed, we MUST reconcile the OLD account too
        // The old account needs to "remove" this transaction from its history.
        // Since 'updatedTransactionsList' now has the transaction pointing to the NEW accountId,
        // reconcileAccountBalance(oldAccount, updatedTransactionsList) will automatically 
        // exclude this transaction, resulting in the correct balance.
        if (editingTransaction && oldTx && oldTx.accountId !== tx.accountId) {
            const oldAccount = accounts.find(a => a.id === oldTx?.accountId);
            if (oldAccount) {
                const oldBalance = reconcileAccountBalance(oldAccount, updatedTransactionsList);
                updateAccount({ ...oldAccount, balance: oldBalance });
            }
        }

        setShowTransactionForm(false);
        setEditingTransaction(null);
        setScannedData(null);
    };

    const handleDeleteTransactionWrapper = (id: string) => {
        const tx = transactions.find(t => t.id === id);

        deleteTransaction(id);

        if (tx) {
            // Reconcile account balance after deletion
            const updatedTransactionsList = transactions.filter(t => t.id !== id);
            const account = accounts.find(a => a.id === tx.accountId);
            if (account) {
                const newBalance = reconcileAccountBalance(account, updatedTransactionsList);
                updateAccount({ ...account, balance: newBalance });
            }
        }
        setShowTransactionForm(false);
        setEditingTransaction(null);
    };

    const handleTransfer = (from: string, to: string, amount: number, date: string) => {
        const fromAcc = accounts.find(a => a.id === from);
        const toAcc = accounts.find(a => a.id === to);
        if (!fromAcc || !toAcc) return;

        const txOut: Transaction = {
            id: crypto.randomUUID(),
            accountId: from,
            name: `Transfer to ${toAcc.name}`,
            amount: formatCurrency(amount, fromAcc.currency),
            numericAmount: amount,
            currency: fromAcc.currency,
            date,
            category: 'Transfer',
            type: 'debit',
            status: 'completed'
        };

        const txIn: Transaction = {
            id: crypto.randomUUID(),
            accountId: to,
            name: `Transfer from ${fromAcc.name}`,
            amount: formatCurrency(convertAmount(amount, fromAcc.currency, toAcc.currency), toAcc.currency),
            numericAmount: convertAmount(amount, fromAcc.currency, toAcc.currency),
            currency: toAcc.currency,
            date,
            category: 'Transfer',
            type: 'credit',
            status: 'completed'
        };

        addTransaction(txOut);
        addTransaction(txIn);

        const newTxs = [txIn, txOut, ...transactions];
        const newFromBal = reconcileAccountBalance(fromAcc, newTxs);
        const newToBal = reconcileAccountBalance(toAcc, newTxs);

        updateAccount({ ...fromAcc, balance: newFromBal });
        updateAccount({ ...toAcc, balance: newToBal });
    };

    // --- RENDER ---
    // Removed legacy LockScreen check


    // --- NAVIGATION HANDLER ---
    const handleNavigation = (tab: NavTab, payload?: any) => {
        setActiveTab(tab);

        // Reset Transaction Form state when changing tabs
        setShowTransactionForm(false);
        setEditingTransaction(null);
        setScannedData(null);

        // Clear transaction filters if navigating away from transactions tab
        if (tab !== 'transactions') {
            setTransactionsFilterAccountId(null);
        }

        if (payload?.action === 'newTransaction') {
            setShowTransactionForm(true);
        }

        if (payload?.action === 'payRecurring' && payload.transactionId) {
            const original = transactions.find(t => t.id === payload.transactionId);
            if (original) {
                const paymentTemplate: Transaction = {
                    ...original,
                    id: crypto.randomUUID(), // New ID for payment
                    date: getLocalDateISO(), // Use local date
                    isRecurring: false,
                    status: 'completed',
                };
                // Strip recurring fields
                delete (paymentTemplate as any).recurringFrequency;
                delete (paymentTemplate as any).nextRecurringDate;
                delete (paymentTemplate as any).recurringEndDate;

                setEditingTransaction(paymentTemplate);
                setPendingRecurringId(payload.transactionId); // To update original's next date on save
                setShowTransactionForm(true);
            }
        }
    };

    const renderContent = () => {
        // --- EARLY RETURNS (Render Phase) ---
        if (loading) {
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                </div>
            );
        }

        if (!user) {
            return <LoginPage t={t} />;
        }

        if (showTransactionForm) {
            return (
                <TransactionForm
                    initialData={editingTransaction || (scannedData as Transaction)}
                    accounts={accounts}
                    transactions={transactions}
                    onSave={handleSaveTransaction}
                    onDelete={handleDeleteTransactionWrapper}
                    onCancel={() => {
                        setShowTransactionForm(false);
                        setEditingTransaction(null);
                        setScannedData(null);
                        setPendingRecurringId(null);
                    }}
                />
            );
        }

        switch (activeTab) {
            case 'home':
                return <DashboardPage
                    netWorth={netWorth}
                    onNavigate={handleNavigation}
                    privacyMode={privacyMode}
                    baseCurrency={baseCurrency}
                    t={t}
                />;
            case 'accounts':
                return <AccountsPage
                    onEditTransaction={(tx) => { setEditingTransaction(tx); setShowTransactionForm(true); }}
                    onTransfer={handleTransfer}
                    onAddAccount={addAccount}
                    onUpdateAccount={updateAccount}
                    onDeleteAccount={deleteAccount}
                    onViewHistory={(accountId) => {
                        setTransactionsFilterAccountId(accountId);
                        handleNavigation('transactions');
                    }}
                    privacyMode={privacyMode}
                    baseCurrency={baseCurrency}
                    t={t}
                />;
            case 'transactions':
                return <TransactionsPage
                    onEditTransaction={(tx) => { setEditingTransaction(tx); setShowTransactionForm(true); }}
                    onNewTransaction={() => { setEditingTransaction(null); setShowTransactionForm(true); }}
                    onDeleteTransaction={handleDeleteTransactionWrapper}
                    onScan={() => handleNavigation('scan')}
                    onStopRecurring={(id) => {
                        const tx = transactions.find(t => t.id === id);
                        if (tx) {
                            updateTransaction({
                                ...tx,
                                isRecurring: false,
                                recurringFrequency: undefined,
                                nextRecurringDate: undefined
                            });
                        }
                    }}
                    initialAccountId={transactionsFilterAccountId}
                    t={t}
                />;
            case 'budget':
                return <BudgetPage
                    budgets={enrichedBudgets}
                    onUpdateBudget={updateBudget}
                    onAddBudget={addBudget}
                    onDeleteBudget={deleteBudget}
                    goals={goals}
                    onUpdateGoal={updateGoal}
                    onAddGoal={addGoal}
                    onDeleteGoal={deleteGoal}
                    onContributeToGoal={(id, amount) => {
                        const goal = goals.find(g => g.id === id);
                        if (goal) updateGoal({ ...goal, savedAmount: goal.savedAmount + amount });
                    }}
                    transactions={transactions}
                    privacyMode={privacyMode}
                    baseCurrency={baseCurrency}
                    t={t}
                />;
            case 'business':
                return <BusinessPage
                    baseCurrency={baseCurrency}
                    t={t}
                />;
            case 'investments':
                return <InvestmentsPage
                    baseCurrency={baseCurrency}
                    t={t}
                />;
            case 'reports':
                return <ReportsPage
                    transactions={transactions}
                    accounts={accounts}
                    businessEntities={enrichedEntities}
                    healthScores={healthScores}
                    investments={investments}
                    baseCurrency={baseCurrency}
                    convertAmount={(amt, from, to) => convertAmount(amt, from, to)}
                    t={t}
                />;
            case 'scan':
                return <ScanPage
                    onScanComplete={(data) => {
                        setScannedData(data);
                        handleNavigation('transactions');
                        setShowTransactionForm(true);
                    }}
                    onCancel={() => handleNavigation('home')}
                    t={t}
                />;
            case 'settings':
                return <SettingsPage
                    transactions={transactions}
                    accounts={accounts}
                    investments={investments}
                    onReset={() => {
                        clearData();
                        window.location.reload();
                    }}
                    baseCurrency={baseCurrency}
                    onCurrencyChange={setBaseCurrency}
                    onLanguageChange={setLanguage}
                    currentLanguage={language}
                    onSignOut={() => signOut()}
                    onReconcile={() => {
                        const updates = accounts.map(a => {
                            const newBalance = reconcileAccountBalance(a, transactions);
                            if (newBalance !== a.balance) {
                                return { ...a, balance: newBalance };
                            }
                            return null;
                        }).filter(Boolean) as Account[];

                        updates.forEach(account => updateAccount(account));
                    }}
                    userName={profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Auth User"}
                    userEmail={user?.email}
                    t={t}
                />;
            default:
                return null;
        }
    };

    // --- MAIN RENDER ---
    const shouldShowLoader = loading;
    const shouldShowLogin = !user && !loading;

    if (shouldShowLoader) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (passwordRecoveryMode) {
        return <ResetPasswordPage t={t} />;
    }

    if (shouldShowLogin) {
        return <LoginPage t={t} />;
    }

    return (
        <Layout
            activeTab={activeTab}
            onTabChange={handleNavigation}
            onNewTransaction={() => { setEditingTransaction(null); setShowTransactionForm(true); }}
            privacyMode={privacyMode}
            onTogglePrivacy={() => setPrivacyMode(!privacyMode)}
            transactions={transactions}
            accounts={accounts}
            budgets={enrichedBudgets}
            investments={investments}
            notifications={notifications}
            onClearNotifications={() => setNotifications([])}
            onAddBudget={addBudget}
            onAddTransactionData={(tx) => {
                setScannedData(tx);
                setActiveTab('transactions');
                setShowTransactionForm(true);
            }}
            userName={profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Auth User"}
            userEmail={user?.email}
            t={t}
            onSignOut={() => signOut()}
            language={language}
        >
            {renderContent()}
        </Layout>
    );
}
