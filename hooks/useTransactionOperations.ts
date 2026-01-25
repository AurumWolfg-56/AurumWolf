
import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Account } from '../types';
import { convertAmount } from '../lib/money';
import { ErrorService } from '../lib/errorService';

interface UseTransactionOperationsProps {
    transactions: Transaction[];
    accounts: Account[];
    addTransaction: (tx: Transaction) => Promise<void>;
    deleteTransaction: (id: string) => Promise<boolean>;
    updateAccount: (account: Account) => Promise<void>;
}

export const useTransactionOperations = ({
    transactions,
    accounts,
    addTransaction,
    deleteTransaction,
    updateAccount
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
            // @ts-ignore
            const { error, data } = await supabase.rpc('perform_transfer', {
                p_from_account_id: fromAccountId,
                p_to_account_id: toAccountId,
                p_amount: amount,
                p_date: date,
                p_description: 'Transfer',
                p_currency: fromAcc.currency,
                p_converted_amount: convertedAmount,
                p_to_currency: toAcc.currency
            });

            if (error) {
                ErrorService.log(new Error("Atomic Transfer RPC Error"), 'error', {
                    supabaseError: error,
                    fromAccountId,
                    toAccountId
                });
                alert("Transfer failed: " + error.message);
                return;
            }

            // ... (rest of logic) ...

        } catch (e) {
            ErrorService.log(e as Error, 'error', { context: 'handleTransfer exception' });
        }

    }, [accounts, transactions, updateAccount]);

    const handleDeleteTransaction = useCallback(async (id: string) => {
        const tx = transactions.find(t => t.id === id);
        if (!tx) return;

        // Check for linked transfer
        // @ts-ignore
        const linkId = tx.transfer_link_id;

        let idsToDelete = [id];
        if (linkId) {
            // Find the partner
            // @ts-ignore
            const partner = transactions.find(t => t.transfer_link_id === linkId && t.id !== id);
            if (partner) {
                if (confirm("This is part of a transfer. Delete the other side as well?")) {
                    idsToDelete.push(partner.id);
                }
            }
        }

        for (const tid of idsToDelete) {
            await deleteTransaction(tid);
        }

        // Final balance update logic...
        // (Simplified for brevity, assuming context updates or reload)
        window.location.reload();

    }, [transactions, accounts, deleteTransaction, updateAccount]);

    return {
        handleTransfer,
        handleDeleteTransaction
    };
};
