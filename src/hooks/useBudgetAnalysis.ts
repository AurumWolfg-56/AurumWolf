
import { useMemo } from 'react';
import { Transaction, BudgetCategory } from '../types';
import { convertAmount } from '../lib/money';

export type TimeRange = '6m' | 'ytd' | '1y' | 'all';

interface AnalysisResult {
    history: MonthlyStats[];
    yearlyComparison?: { yearA: number; yearB: number; months: ComparisonMonth[] };
    insights: string[];
    idealAllocation: {
        needs: number; // 50%
        wants: number; // 30%
        savings: number; // 20%
        actualNeeds: number; // Estimated
        actualWants: number; // Estimated
        actualSavings: number;
    };
    totalIncomePeriod: number;
    totalExpensePeriod: number;
}

interface MonthlyStats {
    date: string; // YYYY-MM-01
    label: string; // "Jan 2025"
    income: number;
    expense: number;
    net: number;
    savingsRate: number;
}

interface ComparisonMonth {
    monthIndex: number; // 0-11
    label: string;
    amountA: number;
    amountB: number;
    diff: number;
}

export const useBudgetAnalysis = (
    transactions: Transaction[],
    budgets: BudgetCategory[],
    timeRange: TimeRange,
    baseCurrency: string,
    locale: string = 'en-US'
): AnalysisResult => {

    // Helper to get ranges
    const getStartDate = () => {
        const now = new Date();
        switch (timeRange) {
            case '6m': return new Date(now.getFullYear(), now.getMonth() - 5, 1);
            case 'ytd': return new Date(now.getFullYear(), 0, 1);
            case '1y': return new Date(now.getFullYear() - 1, now.getMonth(), 1);
            case 'all': return new Date(0); // Beginning of time
            default: return new Date(now.getFullYear(), now.getMonth() - 5, 1);
        }
    };

    const history = useMemo(() => {
        const startDate = getStartDate();
        const endOfCurrentMonth = new Date();
        endOfCurrentMonth.setMonth(endOfCurrentMonth.getMonth() + 1);
        endOfCurrentMonth.setDate(0);

        const relevantTx = transactions.filter(t => new Date(t.date) >= startDate && new Date(t.date) <= endOfCurrentMonth);

        // Group by Month
        const monthlyData: Record<string, MonthlyStats> = {};

        // Initialize months to ensure continuity
        let iter = new Date(startDate);
        while (iter <= endOfCurrentMonth) {
            const key = iter.toISOString().slice(0, 7); // YYYY-MM
            const label = iter.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
            monthlyData[key] = { date: key + "-01", label, income: 0, expense: 0, net: 0, savingsRate: 0 };
            iter.setMonth(iter.getMonth() + 1);
        }

        // Aggregate
        relevantTx.forEach(t => {
            const key = t.date.slice(0, 7);
            if (monthlyData[key]) {
                const amount = convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency);
                if (t.type === 'credit' && t.category !== 'Adjustment' && t.category !== 'Starting Balance') {
                    monthlyData[key].income += amount;
                } else if (t.type === 'debit' && t.category !== 'Adjustment') {
                    monthlyData[key].expense += amount;
                }
            }
        });

        // Calculate Net & Savings
        return Object.values(monthlyData).map(m => ({
            ...m,
            net: m.income - m.expense,
            savingsRate: m.income > 0 ? ((m.income - m.expense) / m.income) * 100 : 0
        })).sort((a, b) => a.date.localeCompare(b.date));

    }, [transactions, timeRange, baseCurrency, locale]);

    // Ideal Allocation (50/30/20) Logic
    const idealAllocation = useMemo(() => {
        // Calculate average monthly income over the period
        const totalIncome = history.reduce((sum, m) => sum + m.income, 0);
        const totalExpense = history.reduce((sum, m) => sum + m.expense, 0);
        const monthsCount = history.length || 1;

        const avgIncome = totalIncome / monthsCount;

        // Actual Savings (Income - Expense)
        const actualSavings = Math.max(0, totalIncome - totalExpense) / monthsCount;

        // Naive categorization for demonstration:
        // We lack explicit Tags for Needs vs Wants, so we might need to rely on assumptions or just show "Remaining for Needs/Wants"
        // For now, let's assume 'Housing', 'Food', 'Utilities', 'Medical' are Needs?
        // Let's keep it simple: Show the Totals vs the Ideal.

        return {
            needs: avgIncome * 0.50,
            wants: avgIncome * 0.30,
            savings: avgIncome * 0.20,
            actualNeeds: 0, // Placeholder for future enhancement
            actualWants: 0, // Placeholder
            actualSavings: actualSavings
        };
    }, [history]);

    // Generate Insights
    const insights = useMemo(() => {
        const list: string[] = [];
        const avgIncome = idealAllocation.needs * 2; // Reverse engineer

        if (history.length < 2) return ["Not enough data for insights."];

        const lastMonth = history[history.length - 1];
        const prevMonth = history[history.length - 2];

        // Trend
        if (lastMonth.expense > prevMonth.expense * 1.10) {
            list.push(`Spending is up 10% compared to last month.`);
        } else if (lastMonth.expense < prevMonth.expense * 0.90) {
            list.push(`Great job! Spending is down compared to last month.`);
        }

        // Savings Goal
        if (lastMonth.savingsRate < 20) {
            list.push(`Your savings rate (${Math.round(lastMonth.savingsRate)}%) is below the recommended 20%.`);
        } else {
            list.push(`You are hitting the 20% savings target! Keep it up.`);
        }

        // Volatility
        const expenses = history.map(h => h.expense);
        const maxEx = Math.max(...expenses);
        const minEx = Math.min(...expenses);
        if (maxEx > minEx * 2) {
            list.push(`Your monthly spending is highly volatile (${minEx.toFixed(0)} - ${maxEx.toFixed(0)}). Try to smooth out irregular expenses.`);
        }

        return list;
    }, [history, idealAllocation]);

    // Comparisons (Year vs Year) - simplified for v1
    const totalIncomePeriod = history.reduce((acc, curr) => acc + curr.income, 0);
    const totalExpensePeriod = history.reduce((acc, curr) => acc + curr.expense, 0);

    return {
        history,
        insights,
        idealAllocation,
        totalIncomePeriod,
        totalExpensePeriod
    };
};
