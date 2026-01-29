
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
        const tx = transactions.find(t => t.id === id);
        if (!tx) return;

        // Check for linked transfer
        const linkId = tx.transfer_link_id;

        let idsToDelete = [id];
        if (linkId) {
            // Find the partner
            const partner = transactions.find(t => t.transfer_link_id === linkId && t.id !== id);
            if (partner) {
                // TODO: Replace with better UI confirmation in future phase
                if (confirm("This is part of a transfer. Delete the other side as well?")) {
                    idsToDelete.push(partner.id);
                }
            }
        }

        for (const tid of idsToDelete) {
            await deleteTransaction(tid);
        }

        // Final balance update logic...
        // Refresh state instead of full reload
        await Promise.all([refreshAccounts(), refreshTransactions()]);

    }, [transactions, accounts, deleteTransaction, updateAccount, refreshAccounts, refreshTransactions]);

    return {
        handleTransfer,
        handleDeleteTransaction
    };
};

