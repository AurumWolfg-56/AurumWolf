
import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Account } from '../types';
import { convertAmount } from '../lib/money';
import { ErrorService } from '../lib/errorService';
import { toast } from 'sonner';

// Define RPC params interface for type safety
interface PerformTransferParams {
    p_from_account_id: string;
    p_to_account_id: string;
    p_amount: number;
    p_date: string;
    p_description: string;
    p_currency: string;
    p_converted_amount: number;
    p_to_currency: string;
}

interface UseTransactionOperationsProps {
    transactions: Transaction[];
    accounts: Account[];
    addTransaction: (tx: Transaction) => Promise<void>;
    deleteTransaction: (id: string) => Promise<boolean>;
    updateAccount: (account: Account) => Promise<void>;
    refreshAccounts: () => Promise<void>;
    refreshTransactions: () => Promise<void>;
}

export const useTransactionOperations = ({
    transactions,
    accounts,
    addTransaction,
    deleteTransaction,
    updateAccount,
    refreshAccounts,
    refreshTransactions
}: UseTransactionOperationsProps) => {

    const handleTransfer = useCallback(async (fromAccountId: string, toAccountId: string, amount: number, date: string) => {
        const fromAcc = accounts.find(a => a.id === fromAccountId);
        const toAcc = accounts.find(a => a.id === toAccountId);

        if (!fromAcc || !toAcc) {
            ErrorService.log("Transfer failed: Account not found", 'error', { fromAccountId, toAccountId });
            return;
        }

        const convertedAmount = convertAmount(amount, fromAcc.currency, toAcc.currency);

        try {
            // New Atomic Logic using RPC
            const rpcParams: PerformTransferParams = {
                p_from_account_id: fromAccountId,
                p_to_account_id: toAccountId,
                p_amount: amount,
                p_date: date,
                p_description: 'Transfer',
                p_currency: fromAcc.currency,
                p_converted_amount: convertedAmount,
                p_to_currency: toAcc.currency
            };

            const { error } = await supabase.rpc('perform_transfer', rpcParams);

            if (error) {
                ErrorService.log(new Error("Atomic Transfer RPC Error"), 'error', {
                    supabaseError: error,
                    fromAccountId,
                    toAccountId
                });
                toast.error("Transfer failed: " + error.message);
                return;
            }

            // Refresh state instead of full reload
            await Promise.all([refreshAccounts(), refreshTransactions()]);

        } catch (e) {
            ErrorService.log(e as Error, 'error', { context: 'handleTransfer exception' });
        }

    }, [accounts, transactions, updateAccount, refreshAccounts, refreshTransactions]);

    const handleDeleteTransaction = useCallback(async (id: string) => {
        // Atomic RPC (delete_transaction_v2) handles:
        // 1. Reverting balance (Expense/Income)
        // 2. Finding and reverting/deleting linked transfer (if any)

        await deleteTransaction(id);

        // Refresh state to reflect changes (including partner deletion if it was a transfer)
        await Promise.all([refreshAccounts(), refreshTransactions()]);
    }, [deleteTransaction, refreshAccounts, refreshTransactions]);

    return {
        handleTransfer,
        handleDeleteTransaction
    };
};

