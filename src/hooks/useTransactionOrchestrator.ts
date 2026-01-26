import { Transaction, Account, RecurringFrequency } from '../types';
import { reconcileAccountBalance, convertAmount } from '../lib/money';
import { addDaysToDate, addMonthsToDate, addYearsToDate } from '../lib/dates';

interface OrchestratorProps {
    transactions: Transaction[];
    accounts: Account[];
    addTransaction: (tx: Transaction) => Promise<void>;
    updateTransaction: (tx: Transaction) => Promise<void>;
    updateAccount: (account: Account) => Promise<void>;
    pendingRecurringId: string | null;
    setPendingRecurringId: (id: string | null) => void;
}

export const useTransactionOrchestrator = ({
    transactions,
    accounts,
    addTransaction,
    updateTransaction,
    updateAccount,
    pendingRecurringId,
    setPendingRecurringId
}: OrchestratorProps) => {

    const calculateNextDate = (startDate: string, freq: RecurringFrequency): string => {
        if (freq === 'daily') return addDaysToDate(startDate, 1);
        if (freq === 'weekly') return addDaysToDate(startDate, 7);
        if (freq === 'monthly') return addMonthsToDate(startDate, 1);
        if (freq === 'yearly') return addYearsToDate(startDate, 1);
        return startDate;
    };

    const handleSaveTransaction = (tx: Transaction, editingTransaction: Transaction | null) => {
        let oldTx: Transaction | undefined;
        let isEdit = !!editingTransaction;

        // 1. Update Transaction State (Optimistic)
        if (isEdit) {
            oldTx = transactions.find(t => t.id === tx.id);
            updateTransaction(tx);
        } else {
            addTransaction(tx);
        }

        // Handle Recurring Logic (if triggered from "Pay Now")
        if (pendingRecurringId) {
            const parent = transactions.find(t => t.id === pendingRecurringId);
            if (parent && parent.isRecurring && parent.recurringFrequency) {
                const nextDate = calculateNextDate(parent.nextRecurringDate || parent.date, parent.recurringFrequency);
                updateTransaction({ ...parent, nextRecurringDate: nextDate });
            }
            setPendingRecurringId(null);
        }

        // 2. Reconcile Account Balances (Crucial Step: Don't just add/sub, Recalculate!)
        let proposedTransactions = isEdit
            ? transactions.map(t => t.id === tx.id ? tx : t)
            : [tx, ...transactions];

        const impactedAccountIds = new Set<string>();
        impactedAccountIds.add(tx.accountId);
        if (oldTx) impactedAccountIds.add(oldTx.accountId);

        impactedAccountIds.forEach(accId => {
            const account = accounts.find(a => a.id === accId);
            if (account) {
                // Re-sum ALL transactions for this account to get the true balance
                const newBalance = reconcileAccountBalance(account, proposedTransactions);
                if (newBalance !== account.balance) {
                    updateAccount({ ...account, balance: newBalance });
                }
            }
        });
    };

    return { handleSaveTransaction };
};
