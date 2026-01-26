
import { Transaction } from '../../types';
import { BusinessMetric, MetricStatus, MetricSnapshot, BusinessHealthSnapshot } from './types';

// Helper to sum transactions by type/category
const sumTransactions = (txs: Transaction[], type: 'credit' | 'debit', category?: string) => {
    return txs
        .filter(t => t.type === type && (!category || t.category === category))
        .reduce((sum, t) => sum + t.numericAmount, 0);
};

// 1. Core Calculator Function
export const calculateMetricValue = (metricId: string, transactions: Transaction[]): number => {
    // Basic Financials
    const revenue = sumTransactions(transactions, 'credit');
    const expenses = sumTransactions(transactions, 'debit');

    switch (metricId) {
        case 'revenue':
            return revenue;
        case 'expenses':
            return expenses;
        case 'net_profit':
            return revenue - expenses;
        case 'gross_profit':
            // Assuming COGS is a category or we approximate it. 
            // For now, let's assume 'Inventory' or 'Cost of Goods' is the COGS category.
            // This is a simplification. Real implementation might need rigorous category mapping.
            const cogs = sumTransactions(transactions, 'debit', 'Inventory') + sumTransactions(transactions, 'debit', 'COGS');
            return revenue - cogs;
        case 'gross_margin':
            const grossProfit = calculateMetricValue('gross_profit', transactions);
            return revenue > 0 ? (grossProfit / revenue) * 100 : 0;
        case 'net_margin':
            const netProfit = revenue - expenses;
            return revenue > 0 ? (netProfit / revenue) * 100 : 0;
        case 'aov':
            const orderCount = transactions.filter(t => t.type === 'credit').length;
            return orderCount > 0 ? revenue / orderCount : 0;
        case 'refund_rate':
            // Assuming refunds are debits with 'Refund' category or negative credits?
            // Let's assume Refunds are Debits classified as 'Refund'.
            const refunds = sumTransactions(transactions, 'debit', 'Refund');
            return revenue > 0 ? (refunds / revenue) * 100 : 0;
        default:
            return 0; // Manual metrics or unknown
    }
};

// 2. Evaluation System (RAG)
export const evaluateMetric = (
    value: number,
    config: BusinessMetric
): { status: MetricStatus; score: number } => {
    const { target_value, warning_threshold, critical_threshold, is_higher_better } = config;

    // If no targets set, default to neutral/100
    if (target_value === undefined || warning_threshold === undefined) {
        return { status: 'neutral', score: 100 };
    }

    let status: MetricStatus = 'healthy';
    let score = 100;

    if (is_higher_better) {
        if (value >= target_value) {
            status = 'healthy';
            score = 100;
        } else if (value >= warning_threshold) {
            status = 'warning';
            // Linear interpolation between Warning (50) and Target (100)
            const range = target_value - warning_threshold;
            const progress = value - warning_threshold;
            score = 50 + (progress / range) * 50;
        } else {
            status = 'critical';
            // Linear interpolation between Critical (0) and Warning (50)
            // If critical_threshold is undefined, assume 0
            const floor = critical_threshold || 0;
            if (value < floor) score = 0;
            else {
                const range = warning_threshold - floor;
                const progress = value - floor;
                score = (progress / range) * 50;
            }
        }
    } else {
        // Lower is better (e.g. Refund Rate, Expenses)
        if (value <= target_value) {
            status = 'healthy';
            score = 100;
        } else if (value <= warning_threshold) {
            status = 'warning';
            const range = warning_threshold - target_value;
            const progress = warning_threshold - value;
            score = 50 + (progress / range) * 50;
        } else {
            status = 'critical';
            const ceiling = critical_threshold || warning_threshold * 2;
            if (value > ceiling) score = 0;
            else {
                const range = ceiling - warning_threshold;
                const progress = ceiling - value;
                score = (progress / range) * 50;
            }
        }
    }

    return { status, score: Math.round(score) };
};

// 3. Health Score Aggregator
export const computeBusinessHealth = (
    metrics: { config: BusinessMetric, currentVal: number }[]
): BusinessHealthSnapshot => {
    let totalWeight = 0;
    let weightedScoreSum = 0;
    const detractors: { id: string; score: number }[] = [];

    metrics.forEach(m => {
        if (!m.config.is_active) return;

        const evaluation = evaluateMetric(m.currentVal, m.config);
        const weight = m.config.weight || 1;

        weightedScoreSum += evaluation.score * weight;
        totalWeight += weight;

        if (evaluation.score < 70) {
            detractors.push({ id: m.config.metric_id, score: evaluation.score });
        }
    });

    const overallScore = totalWeight > 0 ? Math.round(weightedScoreSum / totalWeight) : 100;

    let status: 'healthy' | 'at_risk' | 'critical' = 'healthy';
    if (overallScore < 50) status = 'critical';
    else if (overallScore < 80) status = 'at_risk';

    return {
        id: crypto.randomUUID(), // ephemeral
        business_id: metrics[0]?.config.business_id || '',
        period_start: new Date().toISOString(), // placeholders
        period_end: new Date().toISOString(),
        overall_score: overallScore,
        status,
        trend: 0, // Needs historical context
        diagnosis: {
            top_detractors: detractors.sort((a, b) => a.score - b.score).slice(0, 3).map(d => d.id),
            summary: detractors.length > 0
                ? `${detractors.length} issues detected. Primary concerns: ${detractors.map(d => d.id.replace(/_/g, ' ')).join(', ')}.`
                : "All systems operational. Performance targets met."
        }
    };
};
