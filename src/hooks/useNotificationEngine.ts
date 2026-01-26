import { useEffect, useState } from 'react';
import { Transaction, BudgetCategory, AppNotification, RecurringFrequency } from '../types';
import { formatCurrency } from '../lib/money';
import { addDaysToDate, addMonthsToDate, addYearsToDate } from '../lib/dates';

export const useNotificationEngine = (
    transactions: Transaction[],
    enrichedBudgets: BudgetCategory[],
    baseCurrency: string,
    t: (key: string) => string,
    enabled: boolean = true // Default true
) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    useEffect(() => {
        if (!enabled) {
            setNotifications([]);
            return;
        }
        const todayStr = new Date().toISOString().split('T')[0];
        const generated: AppNotification[] = [];

        // 1. Budget Alerts
        enrichedBudgets.forEach(b => {
            if (b.type !== 'income' && b.limit > 0 && b.spent > b.limit) {
                const excess = b.spent - b.limit;
                generated.push({
                    id: `budget-${b.id}`,
                    title: `${t('budget.alert')}: ${b.category}`,
                    message: `${t('budget.alertMessage')} ${formatCurrency(excess, baseCurrency)}.`,
                    type: 'critical',
                    timestamp: new Date(),
                    read: false,
                    actionLabel: 'Adjust Plan',
                    actionTab: 'budget'
                });
            }
        });

        // 2. Recurring Due Alerts
        transactions.forEach(t => {
            if (t.isRecurring && t.nextRecurringDate && t.nextRecurringDate <= todayStr) {
                // Stop if past end date
                if (t.recurringEndDate && t.nextRecurringDate > t.recurringEndDate) return;

                generated.push({
                    id: `rec-due-${t.id}-${t.nextRecurringDate}`,
                    title: `Subscription Due: ${t.name}`,
                    message: `${t.amount} is due today.`,
                    type: 'warning',
                    timestamp: new Date(),
                    read: false,
                    actionLabel: 'Pay Now',
                    actionTab: 'transactions',
                    payload: { action: 'payRecurring', transactionId: t.id }
                });
            }
        });

        // 3. Deduplicate & Merge
        setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newItems = generated.filter(n => !existingIds.has(n.id));

            if (newItems.length === 0) return prev;

            // Newest first, max 10
            return [...newItems, ...prev].slice(0, 10);
        });

    }, [enrichedBudgets, transactions, baseCurrency]);

    return { notifications, setNotifications };
};
