import React, { useMemo } from 'react';
import { Transaction } from '../../types';
import { formatCurrency } from '../../lib/money';

export interface BalanceChartProps {
    currentBalance: number;
    transactions: Transaction[];
    currency: string;
    accountId: string;
    days?: number;
}

export const BalanceChart: React.FC<BalanceChartProps> = ({
    currentBalance, transactions, currency, accountId, days = 30
}) => {
    const chartData = useMemo(() => {
        const dataPoints = [];
        let runningBalance = currentBalance;
        const now = new Date();
        const txMap: Record<string, number> = {};
        transactions
            .filter(t => t.accountId === accountId)
            .forEach(t => {
                const dateKey = t.date;
                const impact = t.type === 'credit' ? t.numericAmount : -t.numericAmount;
                txMap[dateKey] = (txMap[dateKey] || 0) + impact;
            });

        for (let i = 0; i < days; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            dataPoints.push({
                date: dateStr,
                displayDate: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                value: runningBalance
            });

            if (txMap[dateStr]) {
                runningBalance -= txMap[dateStr];
            }
        }

        return dataPoints.reverse();
    }, [currentBalance, transactions, accountId, days]);

    const minVal = Math.min(...chartData.map(d => d.value));
    const maxVal = Math.max(...chartData.map(d => d.value));
    const range = maxVal - minVal || 1;
    const startBal = chartData[0]?.value || 0;
    const endBal = chartData[chartData.length - 1]?.value || 0;
    const isPositive = endBal >= startBal;

    return (
        <div className="w-full h-48 flex items-end gap-1 pt-8 relative group">
            <div className="absolute inset-x-0 border-t border-dashed border-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none top-1/2"></div>

            {chartData.map((d, i) => {
                const heightPercent = ((d.value - minVal) / range) * 80 + 10;
                return (
                    <div key={d.date} className="flex-1 flex flex-col justify-end items-center relative group/bar h-full">
                        <div
                            className={`w-full min-w-[4px] rounded-t-sm transition-all duration-500 opacity-60 hover:opacity-100 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'
                                }`}
                            style={{ height: `${heightPercent}%` }}
                        ></div>
                        <div className="absolute bottom-full mb-2 bg-neutral-900 border border-neutral-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                            {d.displayDate}: {formatCurrency(d.value, currency)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
