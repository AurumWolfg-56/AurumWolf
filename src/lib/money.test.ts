import { describe, it, expect } from 'vitest';
import { round2, convertAmount, formatCurrency, reconcileAccountBalance } from './money';
import { Transaction, Account } from '../types';

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

describe('Money Utilities', () => {
    describe('round2', () => {
        it('should round to 2 decimal places', () => {
            expect(round2(1.234)).toBe(1.23);
            expect(round2(1.235)).toBe(1.24);
            expect(round2(1.999)).toBe(2);
        });

        it('should handle whole numbers', () => {
            expect(round2(100)).toBe(100);
            expect(round2(0)).toBe(0);
        });

        it('should handle negative numbers', () => {
            expect(round2(-1.234)).toBe(-1.23);
            expect(round2(-1.236)).toBe(-1.24);
        });

        it('should minimize floating point errors', () => {
            expect(round2(0.1 + 0.2)).toBe(0.3);
        });
    });

    describe('convertAmount', () => {
        const mockRates = {
            'USD': 1,
            'EUR': 0.85,
            'MXN': 17.5,
            'GBP': 0.75
        };

        it('should return same amount when currencies match', () => {
            expect(convertAmount(100, 'USD', 'USD', mockRates)).toBe(100);
            expect(convertAmount(50, 'EUR', 'EUR', mockRates)).toBe(50);
        });

        it('should convert USD to other currencies', () => {
            expect(convertAmount(100, 'USD', 'EUR', mockRates)).toBe(85);
            expect(convertAmount(100, 'USD', 'MXN', mockRates)).toBe(1750);
        });

        it('should convert other currencies to USD', () => {
            expect(convertAmount(85, 'EUR', 'USD', mockRates)).toBe(100);
            expect(convertAmount(1750, 'MXN', 'USD', mockRates)).toBe(100);
        });

        it('should convert between non-USD currencies via USD', () => {
            const result = convertAmount(100, 'EUR', 'MXN', mockRates);
            expect(result).toBeCloseTo(2058.82, 1);
        });
    });

    describe('formatCurrency', () => {
        it('should format USD correctly', () => {
            const result = formatCurrency(1234.56, 'USD');
            expect(result).toContain('1,234.56');
        });

        it('should show privacy mask when enabled', () => {
            expect(formatCurrency(1234.56, 'USD', { privacy: true })).toBe('••••••••');
        });

        it('should format BTC with 4 decimals', () => {
            const result = formatCurrency(0.12345, 'BTC');
            expect(result).toBe('₿0.1235');
        });
    });

    describe('reconcileAccountBalance', () => {
        it('should return initial balance when no transactions', () => {
            const account = mockAccount({ id: 'acc1', balance: 1000, initialBalance: 1000 });
            const result = reconcileAccountBalance(account, []);
            expect(result).toBe(1000);
        });

        it('should add credit transactions to balance', () => {
            const account = mockAccount({ id: 'acc1', balance: 1000, initialBalance: 1000 });
            const transactions = [
                mockTransaction({ id: 't1', accountId: 'acc1', numericAmount: 500, type: 'credit' })
            ];
            const result = reconcileAccountBalance(account, transactions);
            expect(result).toBe(1500);
        });

        it('should subtract debit transactions from balance', () => {
            const account = mockAccount({ id: 'acc1', balance: 1000, initialBalance: 1000 });
            const transactions = [
                mockTransaction({ id: 't1', accountId: 'acc1', numericAmount: 200, type: 'debit' })
            ];
            const result = reconcileAccountBalance(account, transactions);
            expect(result).toBe(800);
        });

        it('should only consider transactions for this account', () => {
            const account = mockAccount({ id: 'acc1', balance: 1000, initialBalance: 1000 });
            const transactions = [
                mockTransaction({ id: 't1', accountId: 'acc1', numericAmount: 500, type: 'credit' }),
                mockTransaction({ id: 't2', accountId: 'OTHER', numericAmount: 1000, type: 'debit' })
            ];
            const result = reconcileAccountBalance(account, transactions);
            expect(result).toBe(1500);
        });

        it('should handle credit card accounts (negative balances)', () => {
            const account = mockAccount({
                id: 'cc1',
                type: 'credit',
                balance: -500,
                initialBalance: 0
            });
            const transactions = [
                mockTransaction({ id: 't1', accountId: 'cc1', numericAmount: 300, type: 'debit' }),
                mockTransaction({ id: 't2', accountId: 'cc1', numericAmount: 100, type: 'credit' })
            ];
            const result = reconcileAccountBalance(account, transactions);
            expect(result).toBe(-200);
        });
    });
});
