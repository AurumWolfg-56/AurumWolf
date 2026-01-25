
import { describe, it, expect } from 'vitest';
import { computeNetWorth, computeBudgetSpentMonthly } from '../lib/selectors';
import { Account, Investment, Transaction, BudgetCategory } from '../types';

describe('Selectors', () => {
    describe('computeNetWorth', () => {
        it('should sum accounts and investments in base currency', () => {
            const accounts: Account[] = [
                { id: '1', balance: 1000, currency: 'USD', type: 'checking', name: 'A', userId: 'u' },
                { id: '2', balance: 500, currency: 'USD', type: 'savings', name: 'B', userId: 'u' }
            ];
            const investments: Investment[] = [
                { id: '1', currentValue: 2000, currency: 'USD', type: 'stock', name: 'I', userId: 'u', quantity: 1, currentPrice: 2000, costBasis: 1000 }
            ];

            const netWorth = computeNetWorth(accounts, investments, 'USD');
            expect(netWorth).toBe(3500);
        });

        it('should handle different currencies (assuming static rates or mock)', () => {
            const accounts: Account[] = [
                { id: '1', balance: 100, currency: 'EUR', type: 'checking', name: 'A', userId: 'u' }
            ];

            const val = computeNetWorth(accounts, [], 'EUR');
            expect(val).toBe(100);
        });
    });

    describe('computeBudgetSpentMonthly', () => {
        it('should only sum transaction for the current month', () => {
            const now = new Date();
            const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            const budgets: BudgetCategory[] = [
                { id: 'b1', category: 'Food', limit: 500, type: 'expense', spent: 0 }
            ];

            const txs: Transaction[] = [
                { id: 't1', amount: '10', numericAmount: 10, date: `${currentMonthPrefix}-01`, category: 'Food', type: 'debit', userId: 'u', name: 'Lunch', accountId: 'a1', currency: 'USD', status: 'completed' },
                { id: 't2', amount: '20', numericAmount: 20, date: '2020-01-01', category: 'Food', type: 'debit', userId: 'u', name: 'Old Lunch', accountId: 'a1', currency: 'USD', status: 'completed' }
            ];

            const result = computeBudgetSpentMonthly(budgets, txs, 'USD');
            expect(result[0].spent).toBe(10);
        });

        it('should sum split transactions if we had them (future proof)', () => {
            const now = new Date();
            const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            const budgets: BudgetCategory[] = [
                { id: 'b1', category: 'Food', limit: 500, type: 'expense', spent: 0 }
            ];

            const txs: Transaction[] = [
                { id: 't1', amount: '100', numericAmount: 100, date: `${currentMonthPrefix}-15`, category: 'Food', type: 'debit', name: 'Groceries', accountId: 'a1', currency: 'USD', status: 'completed', userId: 'u' }
            ];

            const result = computeBudgetSpentMonthly(budgets, txs, 'USD');
            expect(result[0].spent).toBe(100);
        });
    });
});
