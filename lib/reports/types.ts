
import { Transaction, Account, BusinessEntity, Investment } from '../../types';

export type ReportScope = 'all' | 'personal' | 'business';
export type ReportPeriod = 'month' | 'quarter' | 'year' | 'ytd' | 'custom';

export interface ReportSpec {
    id: string; // hash of parameters
    scope: ReportScope;
    period: ReportPeriod;
    customRange?: { start: string; end: string }; // ISO YYYY-MM-DD
    baseCurrency: string;
    filters?: {
        accounts?: string[];
        categories?: string[];
        tags?: string[];
        excludeInternalTransfers?: boolean;
    };
}

export interface MetricValue {
    value: number;
    formatted: string;
    delta?: number; // percent change vs previous period
    deltaValue?: number; // absolute change
    trend?: number[]; // series for sparkline
}

export interface CategoryBreakdown {
    id: string;
    name: string;
    value: number;
    percentage: number;
    transactionCount: number;
}

export interface ReportSnapshot {
    spec: ReportSpec;
    generatedAt: string;

    // Metadata
    txCount: number;
    excludedTxCount: number;
    uncategorizedPercent: number;
    currency: string;
    dateRange: { start: string; end: string };

    // Sections
    summary: {
        income: MetricValue;
        expense: MetricValue;
        net: MetricValue;
        savingsRate?: MetricValue;

        // Wealth (Point in time at END of period)
        netWorth: MetricValue;
        liquidAssets: MetricValue;
        investedAssets: MetricValue;
    };

    trends: {
        netWorth: { date: string; value: number }[];
        cashFlow: { date: string; income: number; expense: number }[];
    };

    topCategories: {
        expense: CategoryBreakdown[];
        income: CategoryBreakdown[];
    };

    // Business Specifics (if scope != personal)
    business?: {
        revenue: MetricValue;
        cogs: MetricValue; // if applicable
        grossProfit: MetricValue;
        expenses: MetricValue;
        netProfit: MetricValue;
        margins: {
            gross: number;
            net: number;
        };
        byEntity: {
            id: string;
            name: string;
            revenue: number;
            expense: number;
            profit: number;
            margin: number;
        }[];
    };

    // Data Quality
    dataQuality: {
        score: number; // 0-100
        warnings: string[];
    };
}
