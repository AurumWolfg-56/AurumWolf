
import React, { useState, useMemo } from 'react';
import {
    Plus, CreditCard, Wallet, Bitcoin, MoreVertical,
    ArrowUpRight, ArrowDownRight, Copy, ShieldCheck, Eye, EyeOff,
    ChevronLeft, History, Send, Snowflake, Edit2, X, ArrowRight, Globe, ArrowDown, TrendingUp,
    Briefcase, ArrowLeftRight
} from 'lucide-react';
import { Account, Transaction } from '../types';
import { CURRENCIES } from '../constants';
import { AccountForm } from './AccountForm';
import { formatCurrency, convertAmount } from '../lib/money';
import { useAccounts } from '../contexts/AccountsContext';
import { useTransactions } from '../contexts/TransactionsContext';
import { useBusiness } from '../contexts/BusinessContext';
import { getLocalDateISO } from '../lib/dates';

// Extracted sub-components
import { BalanceChart, CardVisual, TransferModal } from './accounts';

// Re-export for backwards compatibility
export { CardVisual } from './accounts';
export type { CardVisualProps } from './accounts';


interface AccountsPageProps {
    onEditTransaction?: (tx: Transaction) => void;
    onTransfer?: (sourceId: string, destId: string, amount: number, date: string) => void;
    onAddAccount?: (account: Account) => Promise<void>;
    onUpdateAccount?: (account: Account) => Promise<void>;
    onDeleteAccount?: (id: string) => void;
    onViewHistory?: (accountId: string) => void;
    searchQuery?: string;
    privacyMode?: boolean;
    baseCurrency?: string;
    t: (key: string) => string;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({
    onEditTransaction,
    onTransfer,
    onAddAccount,
    onUpdateAccount,
    onDeleteAccount,
    onViewHistory,
    searchQuery = '',
    privacyMode = false,
    baseCurrency = 'USD',
    t
}) => {
    const { accounts } = useAccounts();
    const { transactions, addTransaction, updateTransaction } = useTransactions();
    const { entities: businessEntities } = useBusiness();


    const showBalances = !privacyMode;
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditingAccount, setIsEditingAccount] = useState(false);

    // Transfer State
    const [transferFrom, setTransferFrom] = useState('');
    const [transferTo, setTransferTo] = useState('');
    const [transferAmount, setTransferAmount] = useState('');


    const [transferDate, setTransferDate] = useState(getLocalDateISO());

    const filteredAccounts = useMemo(() => {
        if (!searchQuery) return accounts;
        const lower = searchQuery.toLowerCase();
        return accounts.filter(acc =>
            acc.name.toLowerCase().includes(lower) ||
            acc.institution.toLowerCase().includes(lower) ||
            acc.type.toLowerCase().includes(lower)
        );
    }, [accounts, searchQuery]);

    const totalLiquid = accounts.reduce((acc, curr) => {
        const convertedVal = convertAmount(curr.balance, curr.currency, baseCurrency);
        return curr.type === 'credit' ? acc - Math.abs(convertedVal) : acc + convertedVal;
    }, 0);

    const handleExecuteTransfer = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(transferAmount);
        if (transferFrom && transferTo && amt > 0 && onTransfer) {
            onTransfer(transferFrom, transferTo, amt, transferDate);
            setIsTransferOpen(false);
            setTransferAmount('');
            setTransferFrom('');
            setTransferTo('');
        }
    };

    const handleToggleFreeze = () => {
        if (selectedAccount && onUpdateAccount) {
            const updatedAccount = { ...selectedAccount, isFrozen: !selectedAccount.isFrozen };
            onUpdateAccount(updatedAccount);
            setSelectedAccount(updatedAccount);
        }
    };

    const openTransferModal = (sourceId?: string) => {
        if (sourceId) {
            const acc = accounts.find(a => a.id === sourceId);
            if (acc?.isFrozen) {
                alert(t('accounts.frozenAlert'));
                return;
            }
            setTransferFrom(sourceId);
        }
        setIsTransferOpen(true);
    }

    const handleSaveAccount = async (account: Account) => {
        // DOUBLE-ENTRY LOGIC:
        // We do NOT rely on 'initialBalance' field since it's not persisted reliably in typical SQL schemas without specific columns.
        // Instead, we ensure the Sum(Transactions) matches the desired Account Balance.

        // 0. CHECK FOR BALANCE CHANGE (Prevent Phantom Transactions)
        // Find the original state of this account to see if the user actually modified the balance.
        const originalAccount = accounts.find(a => a.id === account.id);

        // If it's a new account (no original) OR the balance is significantly different, proceed.
        const hasBalanceChanged = !originalAccount || Math.abs(originalAccount.balance - account.balance) > 0.01;

        if (!hasBalanceChanged) {
            // User only edited metadata (Name, Last4, etc.). Do NOT touch transactions.
            // Just save the metadata update.
            if (isEditingAccount && onUpdateAccount) {
                onUpdateAccount(account);
                setSelectedAccount(account);
            }
            setIsFormOpen(false);
            setIsEditingAccount(false);
            return;
        }

        if (isEditingAccount && onUpdateAccount) {
            await onUpdateAccount(account);
            setSelectedAccount(account);
        } else if (onAddAccount) {
            await onAddAccount(account);
        }

        // 1. Calculate what the system CURRENTLY thinks the balance is (Sum of existing Txs)
        // Note: For a NEW account, this is 0.
        const accountTxs = transactions.filter(t => t.accountId === account.id);
        const currentCalculatedBalance = accountTxs.reduce((acc, t) => {
            if (t.type === 'credit') return acc + t.numericAmount;
            if (t.type === 'debit') return acc - t.numericAmount;
            return acc;
        }, 0);

        // 2. Determine if we need an adjustment Transaction
        // Target Balance = account.balance (User input from Form)
        // Adjustment Needed = Target - CurrentCalculated
        const adjustmentAmount = account.balance - currentCalculatedBalance;

        // Only create/update transaction if difference is significant (floating point safety)
        if (Math.abs(adjustmentAmount) > 0.01) {
            // Smart Logic: Check if we have an existing "system" transaction we can just update
            // effectively "correcting" the initial balance instead of spamming the ledger.
            const existingSystemTx = accountTxs.find(tx =>
                (tx.name === t('accounts.startingBalance') || tx.name === t('accounts.balanceAdjustment')) &&
                tx.date === getLocalDateISO() // Only merge if it happened today (or make this broader if needed)
            );

            if (existingSystemTx && updateTransaction) {
                // Update the existing transaction
                const newAmount = existingSystemTx.numericAmount + (existingSystemTx.type === 'credit' ? adjustmentAmount : -adjustmentAmount);
                // Wait, easier: Just Calculate what the "Starting Balance" SHOULD have been.
                // Target = currentCalculated - existingSystemTx + NewSystemTx
                // We simply add the adjustment to the existing transaction's numeric value.

                // Let's keep it simple: just Add/Subtract the adjustment from the existing amount.
                // If it was Credit 500, and adjustment is +100 (Target 600). New is Credit 600.

                let newNumeric = 0;
                let newType = existingSystemTx.type;

                // Normalize: Helper to get signed value
                const existingSigned = existingSystemTx.type === 'credit' ? existingSystemTx.numericAmount : -existingSystemTx.numericAmount;
                const newSigned = existingSigned + adjustmentAmount;

                if (newSigned >= 0) {
                    newNumeric = newSigned;
                    newType = 'credit';
                } else {
                    newNumeric = Math.abs(newSigned);
                    newType = 'debit';
                }

                await updateTransaction({
                    ...existingSystemTx,
                    numericAmount: newNumeric,
                    amount: formatCurrency(newNumeric, account.currency),
                    type: newType
                });

            } else {
                const isPositiveAdjustment = adjustmentAmount > 0;
                const adjustmentTx: Transaction = {
                    id: crypto.randomUUID(),
                    accountId: account.id,
                    name: isEditingAccount ? t('accounts.balanceAdjustment') : t('accounts.startingBalance'),
                    amount: formatCurrency(Math.abs(adjustmentAmount), account.currency),
                    numericAmount: Math.abs(adjustmentAmount),
                    currency: account.currency,
                    date: getLocalDateISO(),
                    category: 'Adjustment', // Changed from Income/Adjustment logic to always be Adjustment for system ops
                    type: isPositiveAdjustment ? 'credit' : 'debit',
                    status: 'completed',
                    description: isEditingAccount ? 'Manual balance correction' : 'Initial deposit'
                };
                await addTransaction(adjustmentTx);
            }
        }

        setIsFormOpen(false);
        setIsEditingAccount(false);
    };

    const handleDeleteAccount = (id: string) => {
        if (onDeleteAccount) {
            onDeleteAccount(id);
            setIsFormOpen(false);
            setSelectedAccount(null);
        }
    };

    if (selectedAccount) {
        const accountTransactions = transactions.filter(t => t.accountId === selectedAccount.id);
        accountTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const isCredit = selectedAccount.type === 'credit';
        const isBusiness = selectedAccount.type === 'business';

        // Calculate Running Balances (Reverse Order)
        let runningCalc = selectedAccount.balance;
        const transactionsWithBalance = accountTransactions.map(t => {
            const currentSnapshot = runningCalc;
            // Prepare for next iteration (older transaction)
            if (t.type === 'credit') {
                runningCalc -= t.numericAmount;
            } else { // debit
                runningCalc += t.numericAmount;
            }
            return { ...t, balanceSnapshot: currentSnapshot };
        });

        return (
            <div className="animate-fade-in space-y-6 pb-20 md:pb-0">
                {/* Navigation Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSelectedAccount(null)}
                            className="p-2 rounded-full bg-white dark:bg-neutral-900 hover:bg-platinum-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors border border-platinum-200 dark:border-neutral-800"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h2 className="text-xl font-display font-bold text-neutral-900 dark:text-white">{selectedAccount.name}</h2>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setIsEditingAccount(true); setIsFormOpen(true); }} className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                            <Edit2 size={18} />
                        </button>
                    </div>
                </div>

                {/* Hero Card (Large) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <CardVisual
                            account={selectedAccount}
                            showBalances={showBalances}
                            onClick={() => { }}
                            variant="large"
                            t={t}
                            linkedBusinessName={selectedAccount.linked_business_id ? businessEntities.find(e => e.id === selectedAccount.linked_business_id)?.name : undefined}
                        />
                    </div>

                    {/* Quick Stats / Actions */}
                    <div className="lg:col-span-1 bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-3xl p-6 flex flex-col justify-between shadow-sm dark:shadow-none">
                        <div>
                            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">{t('accounts.quickActions')}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => openTransferModal(selectedAccount.id)}
                                    disabled={selectedAccount.isFrozen}
                                    className="p-3 rounded-xl bg-platinum-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold text-xs hover:bg-platinum-200 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={14} /> {t('common.transfer')}
                                </button>
                                <button
                                    onClick={handleToggleFreeze}
                                    className={`p-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 ${selectedAccount.isFrozen
                                        ? 'bg-blue-500 text-white hover:bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                        : 'bg-platinum-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-platinum-200 dark:hover:bg-neutral-700'
                                        }`}
                                >
                                    <Snowflake size={14} /> {selectedAccount.isFrozen ? t('accounts.unfreeze') : t('accounts.freeze')}
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-platinum-200 dark:border-neutral-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-neutral-500">{t('accounts.flow30')}</span>
                                <TrendingUp size={14} className="text-emerald-500" />
                            </div>
                            <div className="text-2xl font-mono font-bold text-neutral-900 dark:text-white">
                                {formatCurrency(selectedAccount.balance, selectedAccount.currency, { privacy: !showBalances })}
                            </div>

                            {isCredit && selectedAccount.creditDetails && (
                                <div className="mt-2 space-y-1">
                                    <div className="flex justify-between text-[10px] text-neutral-400">
                                        <span>{t('accounts.limit')}: {formatCurrency(selectedAccount.creditDetails.limit, selectedAccount.currency, { privacy: !showBalances })}</span>
                                        <span>{t('accounts.apr')}: {selectedAccount.creditDetails.apr || 0}%</span>
                                    </div>
                                </div>
                            )}

                            {isBusiness && selectedAccount.businessDetails && (
                                <div className="mt-3 bg-platinum-50 dark:bg-neutral-950 rounded-lg p-2 border border-platinum-200 dark:border-neutral-800 space-y-1">
                                    <div className="flex items-center gap-2 text-gold-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                                        <Briefcase size={12} /> {t('business.entity')}
                                    </div>
                                    <div className="flex justify-between text-[10px] text-neutral-500 dark:text-neutral-400">
                                        <span>{t('business.taxId')}: {selectedAccount.businessDetails.taxId || 'N/A'}</span>
                                        <span>{selectedAccount.businessDetails.entityType}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* BALANCE HISTORY CHART */}
                <div className="glass-card rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp size={16} className="text-gold-500" /> {t('accounts.balanceHistory')}
                        </h3>
                        <span className="text-[10px] text-neutral-500 bg-platinum-100 dark:bg-neutral-950 px-2 py-1 rounded">{t('common.last30Days')}</span>
                    </div>
                    <BalanceChart
                        currentBalance={selectedAccount.balance}
                        transactions={transactions}
                        currency={selectedAccount.currency}
                        accountId={selectedAccount.id}
                    />
                </div>

                {/* Transaction History for this Account */}
                <div className="glass-card rounded-3xl overflow-hidden mt-6 shadow-sm">
                    <div className="p-6 border-b border-platinum-200 dark:border-neutral-800 flex justify-between items-center bg-platinum-50 dark:bg-neutral-950">
                        <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <History size={16} className="text-gold-500" /> {t('accounts.ledger')}
                        </h3>
                        {onViewHistory && (
                            <button
                                onClick={() => onViewHistory(selectedAccount.id)}
                                className="text-xs font-bold text-neutral-500 hover:text-gold-500 flex items-center gap-1 transition-colors group"
                            >
                                {t('common.viewAll')} <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        )}
                    </div>
                    <div className="divide-y divide-platinum-200 dark:divide-neutral-800">
                        {transactionsWithBalance.length > 0 ? (
                            transactionsWithBalance.slice(0, 50).map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => onEditTransaction?.(t)}
                                    className="p-5 flex items-center justify-between hover:bg-platinum-50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${t.type === 'debit'
                                            ? 'bg-platinum-50 dark:bg-neutral-950 border-platinum-200 dark:border-neutral-800 text-neutral-400'
                                            : 'bg-green-500/10 border-green-500/20 text-green-500'
                                            }`}>
                                            {t.type === 'debit' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-neutral-900 dark:text-neutral-200 text-sm group-hover:text-gold-500 transition-colors">{t.name}</p>
                                            <p className="text-xs text-neutral-500">{t.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-mono font-bold text-sm ${t.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-neutral-900 dark:text-white'}`}>
                                            {privacyMode ? '••••' : t.amount}
                                        </p>
                                        <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                                            Bal: {privacyMode ? '••••' : formatCurrency(t.balanceSnapshot, selectedAccount.currency)}
                                        </p>
                                        <div className="flex items-center justify-end gap-2 mt-0.5">
                                            <p className="text-[10px] text-neutral-600">{t.date}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-neutral-500">
                                <p className="text-sm">{t('transactions.noTransactions')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {isTransferOpen && (
                    <TransferModal
                        accounts={accounts}
                        transferFrom={transferFrom}
                        transferTo={transferTo}
                        transferAmount={transferAmount}
                        transferDate={transferDate}
                        onFromChange={setTransferFrom}
                        onToChange={setTransferTo}
                        onAmountChange={setTransferAmount}
                        onDateChange={setTransferDate}
                        onSubmit={handleExecuteTransfer}
                        onClose={() => setIsTransferOpen(false)}
                        t={t}
                    />
                )}

                {isFormOpen && (
                    <AccountForm
                        initialData={selectedAccount}
                        onSave={handleSaveAccount}
                        onDelete={handleDeleteAccount}
                        onCancel={() => { setIsFormOpen(false); setIsEditingAccount(false); }}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">

            {/* Overview Header */}
            <div className="glass-card rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm dark:shadow-none">
                <div>
                    <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <Globe size={16} className="text-gold-500" /> {t('accounts.globalNetLiquid')}
                    </h2>
                    <p className="text-3xl font-display font-bold text-neutral-900 dark:text-white">
                        {formatCurrency(totalLiquid, baseCurrency, { privacy: !showBalances })}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsTransferOpen(true)} className="px-4 py-2 rounded-xl bg-platinum-100 dark:bg-neutral-800 border border-platinum-200 dark:border-neutral-700 text-neutral-900 dark:text-white font-bold hover:bg-platinum-200 dark:hover:bg-neutral-700 transition-all flex items-center gap-2">
                        <ArrowLeftRight size={16} /> {t('common.transfer')}
                    </button>
                    <button
                        onClick={() => { setIsEditingAccount(false); setIsFormOpen(true); }}
                        className="px-4 py-2 rounded-xl bg-gold-500 text-neutral-950 font-bold hover:bg-gold-400 transition-all shadow-lg flex items-center gap-2"
                    >
                        <Plus size={16} /> {t('accounts.addAsset')}
                    </button>
                </div>
            </div>

            {/* Account Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAccounts.map(account => (
                    <CardVisual
                        key={account.id}
                        account={account}
                        showBalances={showBalances}
                        onClick={() => setSelectedAccount(account)}
                        t={t}
                        linkedBusinessName={account.linked_business_id ? businessEntities.find(e => e.id === account.linked_business_id)?.name : undefined}
                    />
                ))}

                {/* Add New Placeholder */}
                <button
                    onClick={() => { setIsEditingAccount(false); setIsFormOpen(true); }}
                    className="aspect-[1.586] rounded-2xl border-2 border-dashed border-platinum-300 dark:border-neutral-800 flex flex-col items-center justify-center gap-3 text-neutral-600 dark:text-neutral-600 hover:text-gold-500 dark:hover:text-gold-500 hover:border-gold-500/50 hover:bg-platinum-50 dark:hover:bg-neutral-900/50 transition-all"
                >
                    <div className="w-12 h-12 rounded-full bg-platinum-100 dark:bg-neutral-900 border border-platinum-300 dark:border-neutral-800 flex items-center justify-center">
                        <Plus size={24} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">{t('accounts.addAsset')}</span>
                </button>
            </div>

            {isTransferOpen && (
                <TransferModal
                    accounts={accounts}
                    transferFrom={transferFrom}
                    transferTo={transferTo}
                    transferAmount={transferAmount}
                    transferDate={transferDate}
                    onFromChange={setTransferFrom}
                    onToChange={setTransferTo}
                    onAmountChange={setTransferAmount}
                    onDateChange={setTransferDate}
                    onSubmit={handleExecuteTransfer}
                    onClose={() => setIsTransferOpen(false)}
                    t={t}
                />
            )}

            {isFormOpen && (
                <AccountForm
                    initialData={null}
                    onSave={handleSaveAccount}
                    onCancel={() => setIsFormOpen(false)}
                />
            )}
        </div>
    );
};
