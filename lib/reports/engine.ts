
import { Transaction, Account, BusinessEntity, Investment } from '../../types';
import { ReportSpec, ReportSnapshot, MetricValue, CategoryBreakdown } from './types';
import { convertAmount } from '../money'; // We need access to this or we pass it in

// --- DATE HELPERS (Strict Exclusive Logic) ---

/**
 * Returns true if date is >= start AND < nextDay(end)
 * This ensures "End of Jan 31" includes all of Jan 31, but stops before Feb 1 00:00
 */
const isDateInRanges = (dateStr: string, startStr: string, endStr: string): boolean => {
    // Strings are YYYY-MM-DD. 
    // We treat startStr as 00:00:00 and endStr as 23:59:59 (effectively < end + 1 day)

    // Simple string comparison works for YYYY-MM-DD if we are careful
    return dateStr >= startStr && dateStr <= endStr;
};

// --- ENGINE ---

interface EngineContext {
    transactions: Transaction[];
    accounts: Account[];
    businessEntities: BusinessEntity[];
    investments: Investment[];
    convertAmount: (amount: number, from: string, to: string) => number;
}

export class ReportEngine {
    private ctx: EngineContext;

    constructor(ctx: EngineContext) {
        this.ctx = ctx;
    }

    public generate(spec: ReportSpec): ReportSnapshot {
        const { start, end } = this.resolveDateRange(spec);
        const { start: prevStart, end: prevEnd } = this.resolvePreviousRange(start, end);

        // 1. Filter Transactions
        const currentTxs = this.filterTransactions(this.ctx.transactions, spec, start, end);
        const previousTxs = this.filterTransactions(this.ctx.transactions, spec, prevStart, prevEnd);

        // 2. Aggregate Data
        const currentAgg = this.aggregate(currentTxs, spec.baseCurrency);
        const previousAgg = this.aggregate(previousTxs, spec.baseCurrency);

        // 3. Calculate Deltas
        const getDelta = (curr: number, prev: number) => {
            if (prev === 0) return curr === 0 ? 0 : 100;
            return ((curr - prev) / Math.abs(prev)) * 100;
        };

        const createMetric = (curr: number, prev: number, format: 'currency' | 'percent' = 'currency'): MetricValue => ({
            value: curr,
            formatted: format === 'currency'
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: spec.baseCurrency }).format(curr)
                : curr.toFixed(1) + '%',
            delta: getDelta(curr, prev),
            deltaValue: curr - prev
        });

        // 4. Net Worth & Assets (Point-in-time calculation)
        const assetMetrics = this.calculatePointInTimeAssets(end, spec.baseCurrency);

        // 5. Build Snapshot
        const snapshot: ReportSnapshot = {
            spec,
            generatedAt: new Date().toISOString(),
            txCount: currentTxs.length,
            excludedTxCount: this.ctx.transactions.length - currentTxs.length,
            uncategorizedPercent: this.calculateUncategorized(currentTxs),
            currency: spec.baseCurrency,
            dateRange: { start, end },

            summary: {
                income: createMetric(currentAgg.income, previousAgg.income),
                expense: createMetric(currentAgg.expense, previousAgg.expense),
                net: createMetric(currentAgg.net, previousAgg.net),
                savingsRate: createMetric(currentAgg.savingsRate, previousAgg.savingsRate, 'percent'),
                netWorth: { value: assetMetrics.netWorth, formatted: this.formatRaw(assetMetrics.netWorth, spec.baseCurrency) },
                liquidAssets: { value: assetMetrics.liquid, formatted: this.formatRaw(assetMetrics.liquid, spec.baseCurrency) },
                investedAssets: { value: assetMetrics.invested, formatted: this.formatRaw(assetMetrics.invested, spec.baseCurrency) }
            },

            trends: {
                netWorth: [], // TODO: Implement backcasting logic if needed here, or keep simple
                cashFlow: []
            },

            topCategories: {
                income: currentAgg.topIncomeCats,
                expense: currentAgg.topExpenseCats
            },

            dataQuality: {
                score: 100, // Placeholder
                warnings: []
            }
        };

        // 6. Business Specifics
        if (spec.scope !== 'personal') {
            snapshot.business = {
                revenue: createMetric(currentAgg.businessRevenue, previousAgg.businessRevenue),
                cogs: createMetric(0, 0), // Pending specific COGS tracking 
                grossProfit: createMetric(currentAgg.businessRevenue, previousAgg.businessRevenue), // Assuming 0 COGS
                expenses: createMetric(currentAgg.businessExpense, previousAgg.businessExpense),
                netProfit: createMetric(currentAgg.businessNet, previousAgg.businessNet),
                margins: {
                    gross: currentAgg.businessRevenue ? (currentAgg.businessRevenue / currentAgg.businessRevenue) * 100 : 0,
                    net: currentAgg.businessRevenue ? (currentAgg.businessNet / currentAgg.businessRevenue) * 100 : 0
                },
                byEntity: this.breakdownByEntity(currentTxs, spec.baseCurrency)
            };
        }

        return snapshot;
    }

    private resolveDateRange(spec: ReportSpec): { start: string, end: string } {
        if (spec.period === 'custom' && spec.customRange) {
            return spec.customRange;
        }

        const now = new Date();
        const start = new Date();
        let end = new Date();

        // Helper to format consistent YYYY-MM-DD
        const toISO = (d: Date) => {
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offset).toISOString().split('T')[0];
        }

        switch (spec.period) {
            case 'month':
                start.setDate(1); // 1st of current month (default) - usually we want LAST month? 
                // Let's assume "Current View" means "This Month" unless specified. 
                // But typically reports default to "Last Month" or "Current Month MTD".
                // Let's do CURRENT MONTH MTD for now to match dashboard, 
                // OR let UI decide. The UI said "month" -> usually implies 'Current Month'.
                start.setDate(1);
                break;
            case 'quarter':
                start.setMonth(Math.floor(start.getMonth() / 3) * 3);
                start.setDate(1);
                break;
            case 'year':
                start.setMonth(0, 1);
                break;
            case 'ytd':
                start.setMonth(0, 1);
                break;
        }

        return { start: toISO(start), end: toISO(end) };
    }

    private resolvePreviousRange(start: string, end: string): { start: string, end: string } {
        // Validation: If start/end are invalid (e.g. empty strings from custom input), return safe defaults or throw
        if (!start || !end || isNaN(new Date(start).getTime()) || isNaN(new Date(end).getTime())) {
            // Return formatted "today" as fallback to prevent crash, effectively 0 duration
            const today = new Date().toISOString().split('T')[0];
            return { start: today, end: today };
        }

        const dStart = new Date(start);
        const dEnd = new Date(end);
        const diff = dEnd.getTime() - dStart.getTime(); // Duration in ms


        // Previous period ends just before current starts?
        // Actually typically compare to same period LAST YEAR or PREVIOUS PERIOD?
        // Let's do Previous Period (e.g. Feb vs Jan)
        const prevEnd = new Date(dStart.getTime() - 24 * 60 * 60 * 1000); // 1 day before start
        const prevStart = new Date(prevEnd.getTime() - diff);

        const toISO = (d: Date) => {
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offset).toISOString().split('T')[0];
        }

        return { start: toISO(prevStart), end: toISO(prevEnd) };
    }

    private filterTransactions(allTxs: Transaction[], spec: ReportSpec, start: string, end: string): Transaction[] {
        return allTxs.filter(t => {
            // 1. Date Check (Inclusive YYYY-MM-DD comparison works for "in range")
            if (t.date < start || t.date > end) return false;

            // 2. Scope Check
            if (spec.scope === 'personal' && t.business_id) return false;
            // Notes: We might want strictly personal, or hybrid.
            // If scope is 'business' we might want ONLY business.
            if (spec.scope === 'business' && !t.business_id) return false;

            return true;
        });
    }

    private aggregate(txs: Transaction[], currency: string) {
        let income = 0;
        let expense = 0;
        let businessRevenue = 0;
        let businessExpense = 0;

        const catMap = new Map<string, number>();

        txs.forEach(t => {
            const amt = this.ctx.convertAmount(t.numericAmount, t.currency, currency);

            // Business Logic
            if (t.business_id) {
                if (t.type === 'credit') businessRevenue += amt;
                else businessExpense += amt;
            } else {
                // Personal Logic
                if (t.type === 'credit') income += amt;
                else {
                    expense += amt;
                    catMap.set(t.category, (catMap.get(t.category) || 0) + amt);
                }
            }
        });

        const net = income - expense;
        const businessNet = businessRevenue - businessExpense;
        const savingsRate = income > 0 ? (net / income) * 100 : 0;

        // Breakdowns
        const formatCat = (entries: [string, number][], total: number): CategoryBreakdown[] => {
            return entries
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([name, value], i) => ({
                    id: name,
                    name,
                    value,
                    percentage: total > 0 ? (value / total) * 100 : 0,
                    transactionCount: 0 // Placeholder
                }));
        };

        const topExpenseCats = formatCat(Array.from(catMap.entries()), expense);

        return {
            income, expense, net, savingsRate,
            businessRevenue, businessExpense, businessNet,
            topIncomeCats: [], // TODO if needed
            topExpenseCats
        };
    }

    private calculatePointInTimeAssets(dateStr: string, currency: string) {
        // Simplified: Current Balance (Assume live connection means 'Now')
        // Ideally we subtract transactions AFTER dateStr to get historical balance
        // For now, using Live
        const liquid = this.ctx.accounts.reduce((sum, a) => sum + this.ctx.convertAmount(a.balance, a.currency, currency), 0);
        const invested = this.ctx.investments.reduce((sum, i) => sum + this.ctx.convertAmount(i.currentValue, i.currency, currency), 0);

        return { liquid, invested, netWorth: liquid + invested };
    }

    private breakdownByEntity(txs: Transaction[], currency: string) {
        const map = new Map<string, { rev: number, exp: number }>();

        txs.forEach(t => {
            if (!t.business_id) return;
            const amt = this.ctx.convertAmount(t.numericAmount, t.currency, currency);
            const curr = map.get(t.business_id) || { rev: 0, exp: 0 };

            if (t.type === 'credit') curr.rev += amt;
            else curr.exp += amt;

            map.set(t.business_id, curr);
        });

        return Array.from(map.entries()).map(([id, data]) => {
            const entity = this.ctx.businessEntities.find(e => e.id === id);
            return {
                id,
                name: entity?.name || 'Unknown Entity',
                revenue: data.rev,
                expense: data.exp,
                profit: data.rev - data.exp,
                margin: data.rev > 0 ? ((data.rev - data.exp) / data.rev) * 100 : 0
            };
        }).sort((a, b) => b.revenue - a.revenue);
    }

    private calculateUncategorized(txs: Transaction[]): number {
        const uncategorized = txs.filter(t => t.category === 'Uncategorized' || !t.category).length;
        return txs.length > 0 ? (uncategorized / txs.length) * 100 : 0;
    }

    private formatRaw(val: number, curr: string) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(val);
    }
}
