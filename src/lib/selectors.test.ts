import { describe, it, expect, vi } from 'vitest';
import { computeNetWorth, computeBudgetSpentMonthly, computeBusinessMetrics } from './selectors';
import { Account, Investment, Transaction, BudgetCategory, BusinessEntity } from '../types';

// Mock the money module
vi.mock('./money', () => ({
    convertAmount: vi.fn((amount: number, _from: string, _to: string) => amount),
    getCategoriesForBudget: vi.fn((category: string) => [category])
}));

// Helper to create partial mocks
const mockAccount = (overrides: Partial<Account>): Account => ({
    id: 'test',
    name: 'Test Account',
    balance: 0,
    currency: 'USD',
    type: 'checking',
    color: 'bg-blue-500',
    institution: 'Test Bank',
    ...overrides
} as Account);

const mockInvestment = (overrides: Partial<Investment>): Investment => ({
    id: 'inv-test',
    name: 'Test Investment',
    type: 'stock',
    quantity: 1,
    currentPrice: 100,
    currentValue: 100,
    strategy: 'growth',
    costBasis: 100,
    unrealizedPnL: 0,
    roiPercent: 0,
    ...overrides
} as Investment);

const mockTransaction = (overrides: Partial<Transaction>): Transaction => ({
    id: 'tx-test',
    accountId: 'acc1',
    name: 'Test Transaction',
    amount: '$0',
    numericAmount: 0,
    currency: 'USD',
    date: '2024-01-15',
    category: 'Other',
    type: 'debit',
    status: 'completed',
    ...overrides
} as Transaction);

const mockBudget = (overrides: Partial<BudgetCategory>): BudgetCategory => ({
    id: 'budget-test',
    category: 'Test',
    limit: 500,
    spent: 0,
    color: 'bg-blue-500',
    icon_key: 'test',
    type: 'expense',
    ...overrides
} as BudgetCategory);

const mockBusinessEntity = (overrides: Partial<BusinessEntity>): BusinessEntity => ({
    id: 'business-test',
    name: 'Test Business',
    type: 'service',
    industry: 'Tech',
    ...overrides
} as BusinessEntity);

describe('Financial Selectors', () => {
    describe('computeNetWorth', () => {
        it('should return 0 for empty accounts and investments', () => {
            const result = computeNetWorth([], [], 'USD');
            expect(result).toBe(0);
        });

        it('should sum account balances correctly', () => {
            const accounts = [
                mockAccount({ id: '1', name: 'Checking', balance: 1000 }),
                mockAccount({ id: '2', name: 'Savings', balance: 2500, type: 'savings' })
            ];
            const result = computeNetWorth(accounts, [], 'USD');
            expect(result).toBe(3500);
        });

        it('should include investment values', () => {
            const accounts = [mockAccount({ id: '1', balance: 1000 })];
            const investments = [mockInvestment({ id: 'inv1', currentValue: 5000 })];
            const result = computeNetWorth(accounts, investments, 'USD');
            expect(result).toBe(6000);
        });

        it('should handle negative balances (credit cards)', () => {
            const accounts = [
                mockAccount({ id: '1', balance: 5000 }),
                mockAccount({ id: '2', name: 'Credit Card', balance: -2000, type: 'credit' })
            ];
            const result = computeNetWorth(accounts, [], 'USD');
            expect(result).toBe(3000);
        });
    });

    describe('computeBudgetSpentMonthly', () => {
        const currentMonth = new Date().toISOString().slice(0, 7);

        it('should return budgets with 0 spent when no transactions', () => {
            const budgets = [mockBudget({ category: 'Food' })];
            const result = computeBudgetSpentMonthly(budgets, [], 'USD');
            expect(result[0].spent).toBe(0);
        });

        it('should calculate spent amount for matching category', () => {
            const budgets = [mockBudget({ category: 'Food' })];
            const transactions = [
                mockTransaction({ id: 't1', numericAmount: 100, category: 'Food', date: `${currentMonth}-15`, type: 'debit' }),
                mockTransaction({ id: 't2', numericAmount: 50, category: 'Food', date: `${currentMonth}-20`, type: 'debit' })
            ];
            const result = computeBudgetSpentMonthly(budgets, transactions, 'USD');
            expect(result[0].spent).toBe(150);
        });

        it('should not include Transfer category in calculations', () => {
            const budgets = [mockBudget({ category: 'Transfer' })];
            const transactions = [
                mockTransaction({ id: 't1', numericAmount: 500, category: 'Transfer', date: `${currentMonth}-15` })
            ];
            const result = computeBudgetSpentMonthly(budgets, transactions, 'USD');
            expect(result[0].spent).toBe(0);
        });

        it('should handle income budgets correctly', () => {
            const budgets = [mockBudget({ category: 'Salary', type: 'income' })];
            const transactions = [
                mockTransaction({ id: 't1', numericAmount: 4500, category: 'Salary', date: `${currentMonth}-01`, type: 'credit' })
            ];
            const result = computeBudgetSpentMonthly(budgets, transactions, 'USD');
            expect(result[0].spent).toBe(4500);
        });
    });

    describe('computeBusinessMetrics', () => {
        it('should return entities with zero metrics when no transactions', () => {
            const entities = [mockBusinessEntity({ id: 'b1' })];
            const result = computeBusinessMetrics(entities, [], 'USD');
            expect(result[0].metrics?.revenue).toBe(0);
            expect(result[0].metrics?.expenses).toBe(0);
            expect(result[0].metrics?.profit).toBe(0);
            expect(result[0].metrics?.margin).toBe(0);
        });

        it('should calculate revenue from credit transactions', () => {
            const entities = [mockBusinessEntity({ id: 'b1' })];
            const transactions = [
                mockTransaction({ id: 't1', numericAmount: 1000, type: 'credit', business_id: 'b1' })
            ];
            const result = computeBusinessMetrics(entities, transactions, 'USD');
            expect(result[0].metrics?.revenue).toBe(1000);
        });

        it('should calculate profit margin correctly', () => {
            const entities = [mockBusinessEntity({ id: 'b1' })];
            const transactions = [
                mockTransaction({ id: 't1', numericAmount: 1000, type: 'credit', business_id: 'b1' }),
                mockTransaction({ id: 't2', numericAmount: 200, type: 'debit', business_id: 'b1' })
            ];
            const result = computeBusinessMetrics(entities, transactions, 'USD');
            expect(result[0].metrics?.revenue).toBe(1000);
            expect(result[0].metrics?.expenses).toBe(200);
            expect(result[0].metrics?.profit).toBe(800);
            expect(result[0].metrics?.margin).toBe(80);
        });
    });
});
