import { z } from 'zod';
import { NavTab } from '../../types';

// --- PRIMITIVES ---
// --- PRIMITIVES ---
const uuid = z.string(); // Simplification to avoid Zod union inference issues
const dateString = z.string(); // ISO date string

// --- USER PROFILE ---
export const UserProfileSchema = z.object({
    id: uuid,
    full_name: z.string().optional(),
    avatar_url: z.string().optional(),
    email: z.string().email().optional(),
    updated_at: dateString.optional(),
});

// --- ACCOUNT ---
export const CreditAccountDetailsSchema = z.object({
    limit: z.number().min(0),
    statementDay: z.number().min(1).max(31),
    paymentDueDay: z.number().min(1).max(31),
    apr: z.number().optional(),
});

export const BusinessAccountDetailsSchema = z.object({
    taxId: z.string().optional(),
    entityType: z.enum(['LLC', 'Corp', 'Sole Prop', 'Partnership', 'Other']),
    monthlyFee: z.number().optional(),
    overdraftLimit: z.number().optional(),
});

export const AccountSchema = z.object({
    id: uuid,
    name: z.string(),
    type: z.enum(['checking', 'savings', 'credit', 'investment', 'crypto', 'business']),
    balance: z.coerce.number(), // Coerce string->number for Numeric/Decimal types
    initialBalance: z.coerce.number().nullable().default(0).transform(val => val || 0),
    currency: z.string().default('USD'),
    last4: z.string().nullable().default(null),
    color: z.string().nullable().default('from-gray-500 to-gray-700').transform(v => v || 'from-gray-500 to-gray-700'),
    institution: z.string().nullable().default('Unknown').transform(v => v || 'Unknown'),
    isFrozen: z.boolean().nullable().default(false),
    creditDetails: CreditAccountDetailsSchema.nullable().default(null).optional(),
    businessDetails: BusinessAccountDetailsSchema.nullable().default(null).optional(),
    linked_business_id: z.string().nullable().default(null).optional(),
});

// --- BUDGET ---
export const BudgetCategorySchema = z.object({
    id: uuid,
    category: z.string(),
    name: z.string().optional(), // Alias for category
    limit: z.coerce.number().min(0),
    spent: z.coerce.number().nullable().default(0).transform(v => v || 0), // Required in Type
    color: z.string().nullable().default('bg-gray-500').transform(v => v || 'bg-gray-500'),
    icon_key: z.string().optional(),
    icon: z.string().optional(), // Alias for icon_key
    type: z.enum(['income', 'expense']).optional(),
    user_id: z.string().optional(),
});

export const SavingsGoalSchema = z.object({
    id: uuid,
    name: z.string(),
    targetAmount: z.number(),
    savedAmount: z.number(),
    deadline: dateString.optional(),
    color: z.string(),
});

// --- TRANSACTION ---
export const TransactionSplitSchema = z.object({
    id: z.union([z.string(), z.number()]).nullable().default(() => crypto.randomUUID()).transform(v => v ?? crypto.randomUUID()),
    category: z.string(),
    amount: z.number(),
});

export const TransactionSchema = z.object({
    id: uuid,
    accountId: uuid,
    name: z.string(),
    amount: z.coerce.string(), // Formatted string from DB or UI (handles numbers too)
    numericAmount: z.coerce.number(), // Required in Type
    currency: z.string().default('USD'),

    accountCurrency: z.string().nullable().optional(),
    foreignAmount: z.coerce.number().nullable().default(0).transform(val => val || 0),
    exchangeRate: z.coerce.number().nullable().default(1).transform(val => val || 1),

    date: dateString,
    category: z.string(),
    splits: z.array(TransactionSplitSchema).nullable().optional(),
    description: z.string().nullable().optional(),
    type: z.enum(['credit', 'debit']),
    status: z.enum(['pending', 'completed']).nullable().default('completed').transform(v => v || 'completed'),
    business_id: z.string().nullable().optional(),

    isRecurring: z.boolean().nullable().optional(),
    recurringFrequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).nullable().optional(),
    nextRecurringDate: dateString.nullable().optional(),
    recurringEndDate: dateString.nullable().optional(),
});

// --- BUSINESS ENTITY ---
// --- BUSINESS ENTITY ---

// Corresponds to 'business_metrics' table + config
export const BusinessMetricSchema = z.object({
    id: uuid,
    business_id: z.string(),
    metric_id: z.string(),
    is_active: z.boolean(),
    weight: z.coerce.number().default(1),
    target_value: z.coerce.number().optional(),
    warning_threshold: z.coerce.number().optional(),
    critical_threshold: z.coerce.number().optional(),
    is_higher_better: z.boolean().default(true),
    frequency: z.enum(['daily', 'weekly', 'monthly']),

    // Optional join fields
    definition: z.any().optional() // We won't valid deep definition here usually
});

export const BusinessEntitySchema = z.object({
    id: uuid,
    name: z.string(),
    type: z.enum(['store', 'channel', 'subsidiary', 'real_estate', 'service']),
    parent_id: z.string().nullable().optional(),

    // UI Helpers (metrics might not be on the entity object directly from DB if doing joins manually)
    customMetricsConfig: z.array(z.string()).nullable().optional(),
    customMetricsValues: z.record(z.string(), z.number()).nullable().optional(),
});

export const MetricSnapshotSchema = z.object({
    id: z.string(),
    business_id: z.string(),
    metric_id: z.string(),
    period_start: z.string(),
    period_end: z.string(),
    value: z.coerce.number(),
    formatted_value: z.string().optional(),
    status: z.enum(['healthy', 'warning', 'critical', 'neutral']),
    score_contribution: z.coerce.number().optional(),
    confidence: z.coerce.number().optional()
});

// --- INVESTMENT ---
export const InvestmentSchema = z.object({
    id: uuid,
    name: z.string(),
    ticker: z.string().optional(),
    type: z.enum(['stock', 'etf', 'crypto', 'real_estate', 'bond', 'startup', 'commodity']),
    strategy: z.enum(['passive', 'active']),

    quantity: z.coerce.number(),
    costBasis: z.coerce.number(),
    currentPrice: z.coerce.number(),
    currentValue: z.coerce.number(),

    unrealizedPnL: z.coerce.number(),
    roiPercent: z.coerce.number(),

    currency: z.string().default('USD'),
    lastUpdated: dateString,
    notes: z.string().optional(),
});
