
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { DashboardPage } from './components/DashboardPage';
import { AccountsPage } from './components/AccountsPage';
import { TransactionsPage } from './components/TransactionsPage';
import { BudgetPage } from './components/BudgetPage';
import { BusinessPage } from './components/BusinessPage';
import { useBusiness } from './contexts/BusinessContext';
import { InvestmentsPage } from './components/InvestmentsPage';
import { ReportsPage } from './components/ReportsPage';
import { SettingsPage } from './components/SettingsPage';
import { ScanPage } from './components/ScanPage';

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
// selectors available if needed, though useFinancialMetrics handles most logic now
import { computeNetWorth, computeBudgetSpentMonthly, computeBusinessMetrics } from './lib/selectors';
import { reconcileAccountBalance, convertAmount, formatCurrency } from './lib/money';
import { addMonthsToDate, addDaysToDate, addYearsToDate, getLocalDateISO } from './lib/dates';

// Hooks
import { useAccounts } from './contexts/AccountsContext';
import { useTransactions } from './contexts/TransactionsContext';
import { useBudgets } from './contexts/BudgetsContext';
import { useInvestments } from './contexts/InvestmentsContext';
import { useCategories } from './contexts/CategoryContext';
import { useAuth } from './contexts/AuthContext';
import { useSecurity } from './contexts/SecurityContext'; // If needed, or just provider

// Custom Hooks
import { useFinancialMetrics } from './hooks/useFinancialMetrics';
import { useNotificationEngine } from './hooks/useNotificationEngine';
import { useTransactionOrchestrator } from './hooks/useTransactionOrchestrator';
import { useTransactionOperations } from './hooks/useTransactionOperations';

// Security Components
import { SecurityProvider } from './contexts/SecurityContext';
import { AppLock } from './components/AppLock';
import { PrivacyShield } from './components/PrivacyShield';

// Auth Pages
import { LoginPage } from './components/LoginPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';

// ...

export default function App() {
    const { user, profile, loading, signOut, passwordRecoveryMode } = useAuth();

    // Context Data
    const { accounts, addAccount, updateAccount, deleteAccount, refreshAccounts } = useAccounts();
    const { transactions, addTransaction, updateTransaction, deleteTransaction, refreshTransactions } = useTransactions();

    // New Category Context
    const {
        categories,
        addCategory,
        updateCategory,
        deleteCategory
    } = useCategories();

    // Legacy Budgets Context (Only for Goals now)
    const {
        goals,
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
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => getJSON(STORAGE_KEYS.NOTIFICATIONS_ENABLED, true));
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
        setJSON(STORAGE_KEYS.NOTIFICATIONS_ENABLED, notificationsEnabled);
        setJSON(STORAGE_KEYS.PRIVACY, privacyMode);
    }, [baseCurrency, language, notificationsEnabled, privacyMode]);

    // --- DERIVED STATE (Refactored to Hook) ---
    const {
        netWorth,
        enrichedBudgets,
        enrichedEntities,
        assetsByType,
        monthlySurplus,
        budgetMetrics,
        healthScore,
        healthBreakdown, // New
        spendingTrend,
        chartData,
        upcomingBills
    } = useFinancialMetrics({
        transactions,
        accounts,
        budgets: categories, // Pass categories as budgets
        investments,
        businessEntities,
        baseCurrency,
        language
    });

    const t = useCallback((key: string) => {
        const keys = key.split('.');
        let val: any = TRANSLATIONS[language];
        for (const k of keys) {
            val = val?.[k];
        }
        return val || key;
    }, [language]);

    // --- NOTIFICATION ENGINE ---
    const { notifications, setNotifications } = useNotificationEngine(transactions, enrichedBudgets, baseCurrency, t, notificationsEnabled);

    // --- SAFETY WRAPPERS ---
    // Ensure we never persist the calculated 'spent' value to storage.
    // We reset it to 0 before saving to state (which triggers the persistence useEffect).

    // --- ORCHESTRATION HANDLERS ---
    const { handleSaveTransaction: saveTransaction } = useTransactionOrchestrator({
        transactions,
        accounts,
        addTransaction,
        updateTransaction,
        updateAccount,
        pendingRecurringId,
        setPendingRecurringId
    });

    const handleSaveTransaction = (tx: Transaction) => {
        saveTransaction(tx, editingTransaction);
        setShowTransactionForm(false);
        setEditingTransaction(null);
        setScannedData(null);
    };

    // --- OPERATIONS HANDLER (Refactored) ---
    const { handleTransfer, handleDeleteTransaction: handleDeleteTransactionWrapper } = useTransactionOperations({
        transactions,
        accounts,
        addTransaction,
        deleteTransaction,
        updateAccount
    });

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

        if (payload?.action === 'scanned' && payload.data) {
            setScannedData(payload.data);
            setShowTransactionForm(true);
        }

        if (payload?.action === 'payRecurring' && payload.transactionId) {
            const original = transactions.find(t => t.id === payload.transactionId);
            if (original) {
                // Destructure to remove recurring properties cleanly without 'delete' operator
                const { recurringFrequency, nextRecurringDate, recurringEndDate, ...rest } = original;

                const paymentTemplate: Transaction = {
                    ...rest,
                    id: crypto.randomUUID(), // New ID for payment
                    date: getLocalDateISO(), // Use local date
                    isRecurring: false,
                    status: 'completed',
                };

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
                    t={t}
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
                    language={language}
                    // New Props
                    assetsByType={assetsByType}
                    monthlySurplus={monthlySurplus}
                    budgetMetrics={budgetMetrics}
                    healthScore={healthScore}
                    spendingTrend={spendingTrend}
                    chartData={chartData}
                    upcomingBills={upcomingBills}
                    healthBreakdown={healthBreakdown}
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
                    onScan={() => setActiveTab('scan')}
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
                    onUpdateBudget={updateCategory}
                    onAddBudget={(b) => {
                        // Strip temporary ID and spent, ensure only required fields are passed
                        const { id, spent, user_id, ...rest } = b;
                        addCategory(rest);
                    }}
                    onDeleteBudget={deleteCategory}
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
                    notificationsEnabled={notificationsEnabled}
                    onToggleNotifications={() => setNotificationsEnabled(!notificationsEnabled)}
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
    // --- MAIN RENDER ---
    const shouldShowLoader = loading;
    const shouldShowLogin = !user && !loading;

    return (
        <SecurityProvider>
            {/* App Lock should be active globally if enabled */}
            <AppLock />
            <PrivacyShield />

            {shouldShowLoader ? (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                </div>
            ) : passwordRecoveryMode ? (
                <ResetPasswordPage t={t} />
            ) : shouldShowLogin ? (
                <LoginPage t={t} />
            ) : (
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
                    onAddBudget={(b) => {
                        const { id, spent, user_id, ...rest } = b;
                        // Check if category already exists (UPSERT Logic)
                        const existing = categories.find(c => c.category === b.category);
                        if (existing) {
                            // Update existing category with new limit/type/color/icon
                            updateCategory({
                                ...existing,
                                limit: b.limit,
                                type: b.type,
                                color: b.color,
                                icon_key: b.icon_key
                            });
                        } else {
                            // Create new category
                            addCategory(rest);
                        }
                    }}
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
                    isLoading={loading}
                >
                    {renderContent()}
                </Layout>
            )}
        </SecurityProvider>
    );
}
