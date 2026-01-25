
export type MetricType = 'currency' | 'percentage' | 'count' | 'ratio' | 'duration';
export type MetricStatus = 'healthy' | 'warning' | 'critical' | 'neutral';
export type EvaluationDirection = 'higher_is_better' | 'lower_is_better';

export interface MetricDefinition {
    id: string;
    name: string;
    description?: string;
    type: MetricType;
    is_calculated: boolean;
    format?: string;
    format_options?: Record<string, any>;
}

export interface BusinessMetric {
    id: string; // unique config id
    business_id: string;
    metric_id: string;
    is_active: boolean;
    weight: number; // 1-10
    target_value?: number;
    warning_threshold?: number;
    critical_threshold?: number;
    is_higher_better: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';

    // Joined fields
    definition?: MetricDefinition;
}

export interface MetricSnapshot {
    id: string;
    business_id: string;
    metric_id: string;
    period_start: string; // ISO Date
    period_end: string; // ISO Date
    value: number;
    formatted_value?: string;
    status: MetricStatus;
    score_contribution?: number; // 0-100 normalized score based on target/thresholds
    confidence?: number;
}

export interface BusinessHealthSnapshot {
    id: string;
    business_id: string;
    period_start: string;
    period_end: string;
    overall_score: number; // 0-100
    status: 'healthy' | 'at_risk' | 'critical';
    trend: number; // +5, -2, etc.
    diagnosis: {
        top_detractors: string[]; // metric_ids
        summary: string;
    };
}

export interface MetricPack {
    id: string;
    name: string;
    business_type: string;
    description?: string;
    items?: MetricPackItem[];
}

export interface MetricPackItem {
    metric_id: string;
    default_weight: number;
    default_is_higher_better: boolean;
}
