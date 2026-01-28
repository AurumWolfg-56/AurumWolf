
import { useMemo } from 'react';
import { Transaction, Account, BudgetCategory, Investment, BusinessEntity } from '../types';
import { computeNetWorth, computeBudgetSpentMonthly, computeBusinessMetrics } from '../lib/selectors';
import { convertAmount, formatCurrency } from '../lib/money';

interface UseFinancialMetricsProps {
    transactions: Transaction[];
    accounts: Account[];
    budgets: BudgetCategory[];
    investments: Investment[];
    businessEntities: BusinessEntity[];
    baseCurrency: string;
    language?: string;
}

export const useFinancialMetrics = ({
    transactions,
    accounts,
    budgets,
    investments,
    businessEntities,
    baseCurrency,
    language = 'en'
}: UseFinancialMetricsProps) => {

    const locale = language === 'es' ? 'es-MX' : 'en-US';

    // 1. Core Metrics (App.tsx used these)
    const netWorth = useMemo(() => computeNetWorth(accounts, investments, baseCurrency), [accounts, investments, baseCurrency]);
    const enrichedBudgets = useMemo(() => computeBudgetSpentMonthly(budgets, transactions, baseCurrency), [budgets, transactions, baseCurrency]);
    const enrichedEntities = useMemo(() => computeBusinessMetrics(businessEntities, transactions, baseCurrency), [businessEntities, transactions, baseCurrency]);

    // 2. Dashboard Specific Metrics

    // Assets Breakdown
    // Assets Breakdown
    const assetsByType = useMemo(() => {
        const breakdown = accounts.reduce((acc, curr) => {
            const type = curr.type === 'checking' || curr.type === 'savings' ? 'Cash' :
                curr.type === 'business' ? 'Business' :
                    curr.type === 'crypto' ? 'Crypto' :
                        curr.type === 'investment' ? 'Equities' :
                            curr.type === 'credit' ? 'Debt' : 'Other'; // Better default than Debt

            if (!acc[type]) acc[type] = 0;
            acc[type] += convertAmount(curr.balance, curr.currency, baseCurrency);
            return acc;
        }, {} as Record<string, number>);

        investments.forEach(inv => {
            let type = 'Other';
            if (inv.type === 'stock' || inv.type === 'etf' || inv.type === 'bond') type = 'Equities';
            else if (inv.type === 'real_estate') type = 'Real Estate';
            else if (inv.type === 'crypto') type = 'Crypto';
            else if (inv.type === 'startup') type = 'Venture';

            if (!breakdown[type]) breakdown[type] = 0;
            breakdown[type] += convertAmount(inv.currentValue, inv.currency || 'USD', baseCurrency);
        });

        return breakdown;
    }, [accounts, investments, baseCurrency]);

    const totalPositiveAssets = Object.entries(assetsByType)
        .filter(([k, v]) => (v as number) > 0 && k !== 'Debt') // Explicitly exclude Debt from positive asset sum just in case
        .reduce((acc, [k, v]) => acc + (v as number), 0);

    // Monthly Surplus
    const monthlySurplus = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const limitStr = thirtyDaysAgo.toISOString().split('T')[0];

        const recentTx = transactions.filter(t =>
            t.date >= limitStr &&
            t.category !== 'Transfer' &&
            t.category !== 'Credit Card Payment' &&
            t.category !== 'Adjustment' &&
            t.category !== 'Starting Balance'
        );

        const income = recentTx
            .filter(t => t.type === 'credit')
            .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

        const expense = recentTx
            .filter(t => t.type === 'debit')
            .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

        return income - expense;
    }, [transactions, baseCurrency]);

    // Upcoming Bills (Calculated first to be used in Safe to Spend)
    const upcomingBillsSum = useMemo(() => {
        const today = new Date();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const todayStr = today.toISOString().split('T')[0];
        const endOfMonthStr = endOfMonth.toISOString().split('T')[0];

        // Sum of recurring payments due between now and end of month
        return transactions
            .filter(t =>
                t.isRecurring &&
                t.type === 'debit' &&
                t.nextRecurringDate &&
                t.nextRecurringDate >= todayStr &&
                t.nextRecurringDate <= endOfMonthStr
            )
            .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);
    }, [transactions, baseCurrency]);

    // Budget Metrics (Safe To Spend)
    const budgetMetrics = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const currentMonthTx = transactions.filter(t => t.date >= startOfMonth && t.type === 'debit' && t.category !== 'Adjustment');
        const spentThisMonth = currentMonthTx.reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

        // 1. Calculate Budget Ceilings
        const expenseBudgets = budgets.filter(b => b.type !== 'income');
        const incomeBudgets = budgets.filter(b => b.type === 'income');

        const totalExpenseLimit = expenseBudgets.reduce((acc, b) => acc + convertAmount(b.limit, 'USD', baseCurrency), 0);
        const totalIncomeTarget = incomeBudgets.reduce((acc, b) => acc + convertAmount(b.limit, 'USD', baseCurrency), 0);

        // 2. Sustainable Spend: Lesser of what you planned to spend vs what you expect to earn
        // If no income budgets set, default to expenses limit (or 0 if neither). 
        // If no expense budgets, use income.
        let sustainableSpend = 0;
        if (totalExpenseLimit > 0 && totalIncomeTarget > 0) {
            sustainableSpend = Math.min(totalExpenseLimit, totalIncomeTarget);
        } else {
            sustainableSpend = Math.max(totalExpenseLimit, totalIncomeTarget);
        }

        // 3. Financial Reality (Liquidity Check)
        const liquidAssets = (assetsByType['Cash'] || 0); // Cash on hand
        const netWorthDeficit = netWorth < 0 ? Math.abs(netWorth) : 0; // "Hole" to fill

        // Effective Cash = Cash - DebtHole - ImmediateBills
        const financialReality = Math.max(0, liquidAssets - netWorthDeficit - upcomingBillsSum);

        // 4. Final Safe Limit
        // If budgets are 0 (not set up), we fallback to financialReality to be safe, or 0? 
        // Let's fallback to financialReality if no budgets exist, otherwise respect the budget cap.
        const safeLimit = sustainableSpend > 0
            ? Math.min(sustainableSpend, financialReality)
            : financialReality;

        const leftToSpend = Math.max(0, safeLimit - spentThisMonth);

        // Progress relative to the determined safe limit
        const progress = safeLimit > 0 ? (spentThisMonth / safeLimit) * 100 : (spentThisMonth > 0 ? 100 : 0);

        return { spentThisMonth, totalBudgetLimit: totalExpenseLimit, leftToSpend, progress, safeLimit };
    }, [transactions, budgets, baseCurrency, netWorth, assetsByType, upcomingBillsSum]);

    // Health Score
    // Health Score - Robust Calculation
    const healthScoreData = useMemo(() => {
        // 1. Gather Data
        const cash = assetsByType['Cash'] || 0;
        const totalAssets = totalPositiveAssets;
        const totalDebt = Math.abs(assetsByType['Debt'] || 0);

        // Calculate average monthly expense (rough estimate from last 30 days)
        const expense30Days = Math.abs(monthlySurplus < 0 ? monthlySurplus : transactions // simplified fallback
            .filter(t =>
                t.type === 'debit' &&
                t.date >= new Date(Date.now() - 30 * 86400000).toISOString() &&
                t.category !== 'Adjustment'
            )
            .reduce((s, t) => s + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0)
        ) || 1; // avoid divide by zero

        const income30Days = transactions
            .filter(t =>
                t.type === 'credit' &&
                t.date >= new Date(Date.now() - 30 * 86400000).toISOString() &&
                t.category !== 'Adjustment' &&
                t.category !== 'Starting Balance' &&
                t.name !== 'Starting Balance' && // New Robust Filter
                t.name !== 'Balance Adjustment'
            )
            .reduce((s, t) => s + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

        // --- SCORING COMPONENTS (Max 100) ---

        // A. Liquidity (Max 30pts) - Goal: 6 months of runway
        const monthsRunway = cash / (expense30Days || 1);
        const liquidityScore = Math.min(30, (monthsRunway / 6) * 30);

        // B. Savings Rate (Max 40pts) - Goal: 20%+ savings rate gets max points? Maybe 50% for elite.
        // Let's say 40% savings rate = Max points.
        const savingsRate = income30Days > 0 ? (income30Days - expense30Days) / income30Days : 0;
        const savingsScore = Math.min(40, Math.max(0, (savingsRate / 0.40) * 40));

        // C. Solvency / Debt (Max 20pts) - Goal: 0 Debt ratio.
        // If Debt/Asset > 0.5, score drops.
        const debtRatio = totalAssets > 0 ? totalDebt / totalAssets : 0;
        // 0% debt = 20pts. 50% debt = 10pts. 100% debt = 0pts.
        const debtScore = Math.min(20, Math.max(0, 20 - (debtRatio * 20)));

        // D. Diversity (Max 10pts) - Goal: 3+ asset classes
        const assetClasses = Object.keys(assetsByType).filter(k => assetsByType[k] > 0 && k !== 'Debt').length;
        const diversityScore = Math.min(10, (assetClasses / 4) * 10);

        const totalScore = Math.round(liquidityScore + savingsScore + debtScore + diversityScore);

        // Data Sufficiency Check
        const isNewAccount = transactions.length < 5 && totalAssets === 0;

        return {
            score: isNewAccount ? 0 : totalScore,
            details: {
                liquidity: Math.round(liquidityScore),
                savings: Math.round(savingsScore),
                debt: Math.round(debtScore),
                diversity: Math.round(diversityScore),
                monthsRunway: parseFloat(monthsRunway.toFixed(1)),
                savingsRatePct: Math.round(savingsRate * 100),
                debtRatioPct: Math.round(debtRatio * 100),
                classCount: assetClasses
            },
            isNew: isNewAccount
        };
    }, [assetsByType, totalPositiveAssets, monthlySurplus, transactions, baseCurrency]);

    const healthScore = healthScoreData.score; // Legacy compatibility
    const healthBreakdown = healthScoreData; // New detailed object

    // Trend Analysis
    const spendingTrend = useMemo(() => {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const currentMonthSpent = transactions
            .filter(t => t.date >= currentMonthStart.toISOString() && t.type === 'debit' && t.category !== 'Adjustment')
            .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

        const lastMonthSpent = transactions
            .filter(t => t.date >= lastMonthStart.toISOString() && t.date <= lastMonthEnd.toISOString() && t.type === 'debit' && t.category !== 'Adjustment')
            .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

        const diff = currentMonthSpent - lastMonthSpent;
        const percent = lastMonthSpent > 0 ? (diff / lastMonthSpent) * 100 : 0;

        return { currentMonthSpent, lastMonthSpent, diff, percent };
    }, [transactions, baseCurrency]);

    // Chart Data
    const chartData = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push({
                fullDate: d.toISOString().split('T')[0],
                label: d.toLocaleDateString(locale, { weekday: 'narrow' }),
                fullLabel: d.toLocaleDateString(locale, { weekday: 'long' })
            });
        }

        const dailyTotals = days.map(day => {
            const dayTotal = transactions
                .filter(t => t.date === day.fullDate && t.type === 'debit')
                .reduce((sum, t) => {
                    const txAmount = t.numericAmount || 0;
                    const convertedTxAmount = convertAmount(txAmount, t.accountCurrency || 'USD', baseCurrency);
                    return sum + convertedTxAmount;
                }, 0);

            return { ...day, value: dayTotal };
        });

        const max = Math.max(...dailyTotals.map(d => d.value), 100);

        return dailyTotals.map(d => ({
            ...d,
            height: Math.max((d.value / max) * 100, 4),
            formattedValue: formatCurrency(d.value, baseCurrency, { locale }),
            displayIncome: formatCurrency(transactions
                .filter(t => t.date === d.fullDate && t.type === 'credit')
                .reduce((s, t) => s + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0),
                baseCurrency, { locale, compact: true }),
            displayExpense: formatCurrency(transactions
                .filter(t => t.date === d.fullDate && t.type === 'debit')
                .reduce((s, t) => s + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0),
                baseCurrency, { locale, compact: true })
        }));
    }, [transactions, baseCurrency, locale]);

    // Upcoming Bills
    const upcomingBills = useMemo(() => {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        const todayStr = today.toISOString().split('T')[0];
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        return transactions
            .filter(t => t.isRecurring && t.nextRecurringDate && t.nextRecurringDate >= todayStr && t.nextRecurringDate <= nextWeekStr)
            .sort((a, b) => (a.nextRecurringDate || '').localeCompare(b.nextRecurringDate || ''))
            .slice(0, 3);
    }, [transactions]);

    return {
        netWorth,
        enrichedBudgets,
        enrichedEntities,
        assetsByType,
        monthlySurplus,
        budgetMetrics,
        healthScore,
        spendingTrend,
        chartData,
        upcomingBills,
        healthBreakdown
    };
};
