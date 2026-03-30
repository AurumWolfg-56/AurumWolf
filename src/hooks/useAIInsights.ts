
import { useState, useCallback } from 'react';
import { localAI, LocalAIError } from '../lib/ai/localAI';
import { CATEGORIES } from '../constants';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export interface AIInsight {
    id: string;
    type: 'alert' | 'opportunity' | 'info';
    title: string;
    message: string;
    action?: string;
}

export interface PortfolioData {
    baseCurrency: string;
    netWorth: number;
    assets: Record<string, number>;
    healthScore: number;
    recentSpending: { day: string; amount: number }[];
    upcomingBills: { name: string; amount: number; due: string }[];
    monthlySurplus: number;
}

export interface MonthlyDigestData {
    monthlyNetIncome: number;
    monthlyTotalExpenses: number;
    monthlyCashFlow: number;
    savingsRate: number;
    dti: number;
    topCategories: { name: string; amount: number }[];
    baseCurrency: string;
}

// ============================================
// HOOK
// ============================================

export const useAIInsights = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

    /**
     * Check if AI is available (LM Studio running)
     */
    const checkAvailability = useCallback(async () => {
        const available = await localAI.isAvailable();
        setIsAvailable(available);
        return available;
    }, []);

    /**
     * Analyze portfolio and generate 2-3 actionable insights
     */
    const analyzePortfolio = useCallback(async (data: PortfolioData): Promise<AIInsight[]> => {
        setIsLoading(true);
        try {
            const response = await localAI.chat([
                {
                    role: 'system',
                    content: `You are a top financial advisor analyzing a user's financial snapshot. Generate 2-3 brief, high-impact, actionable insights. Respond ONLY with a JSON array. Each object must have: id (string), type ("alert"|"opportunity"|"info"), title (string, max 4 words), message (string, max 15 words), action (string, short label like "Review" or "Optimize"). Use the user's currency (${data.baseCurrency}) in amounts.`
                },
                {
                    role: 'user',
                    content: `Analyze this financial snapshot and generate insights:\n${JSON.stringify(data, null, 2)}`
                }
            ], {
                temperature: 0.4,
                max_tokens: 512,
                response_format: { type: 'json_object' },
            });

            const parsed = localAI.parseJSON<any>(response.text);
            // Handle both { insights: [...] } and [...] formats
            const arr = Array.isArray(parsed) ? parsed : (parsed.insights || parsed.data || []);

            return arr.map((item: any, idx: number) => ({
                id: item.id || `ai-${idx}`,
                type: ['alert', 'opportunity', 'info'].includes(item.type) ? item.type : 'info',
                title: String(item.title || 'Insight').substring(0, 40),
                message: String(item.message || 'Review your finances.').substring(0, 80),
                action: item.action || 'View',
            }));

        } catch (err: any) {
            console.error('Portfolio analysis failed:', err);
            if (err instanceof LocalAIError && err.code === 'OFFLINE') {
                toast.error('🔌 Inicia LM Studio para usar el análisis AI');
            }
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Auto-categorize a transaction based on merchant name
     */
    const categorizeTransaction = useCallback(async (
        merchantName: string,
        amount?: number
    ): Promise<string | null> => {
        if (!merchantName || merchantName.length < 2) return null;

        try {
            const categoryList = CATEGORIES.map(c => c.category).join(', ');

            const response = await localAI.chat([
                {
                    role: 'system',
                    content: `You are a transaction categorizer. Given a merchant name, respond with ONLY the best matching category from this list: ${categoryList}. Respond with ONLY the category name, nothing else. If unsure, respond with "Other".`
                },
                {
                    role: 'user',
                    content: `Merchant: "${merchantName}"${amount ? ` | Amount: $${amount}` : ''}`
                }
            ], {
                temperature: 0.1,
                max_tokens: 32,
                timeout: 10000, // Quick response needed
            });

            const suggested = response.text.trim().replace(/['"]/g, '');
            // Validate it's actually in our category list
            const match = CATEGORIES.find(c =>
                c.category.toLowerCase() === suggested.toLowerCase()
            );
            return match ? match.category : null;

        } catch {
            // Silently fail — user can categorize manually
            return null;
        }
    }, []);

    /**
     * Generate a natural-language monthly financial digest
     */
    const generateMonthlyDigest = useCallback(async (data: MonthlyDigestData): Promise<string | null> => {
        setIsLoading(true);
        try {
            const response = await localAI.chat([
                {
                    role: 'system',
                    content: `You are a concise financial advisor. Write a brief 2-3 sentence monthly financial summary in Spanish. Be specific with numbers. Use the user's currency (${data.baseCurrency}). Focus on what changed and one actionable tip. Keep it conversational but professional.`
                },
                {
                    role: 'user',
                    content: `Monthly metrics:
- Net Income: ${data.monthlyNetIncome}
- Total Expenses: ${data.monthlyTotalExpenses}
- Cash Flow: ${data.monthlyCashFlow}
- Savings Rate: ${(data.savingsRate * 100).toFixed(1)}%
- DTI Ratio: ${(data.dti * 100).toFixed(1)}%
- Top spending categories: ${data.topCategories.map(c => `${c.name}: ${c.amount}`).join(', ')}`
                }
            ], {
                temperature: 0.5,
                max_tokens: 256,
            });

            return response.text.trim() || null;

        } catch (err: any) {
            console.error('Monthly digest failed:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Generate AI-powered budget insights (replaces hardcoded ones)
     */
    const generateBudgetInsights = useCallback(async (
        historyData: { month: string; income: number; expense: number; savingsRate: number }[],
        baseCurrency: string
    ): Promise<string[]> => {
        try {
            const response = await localAI.chat([
                {
                    role: 'system',
                    content: `You are a financial analyst. Based on monthly income/expense history, generate exactly 3 brief insights (1 sentence each). Respond as a JSON array of 3 strings. Use ${baseCurrency} for amounts. Be specific with numbers and trends. Write in Spanish.`
                },
                {
                    role: 'user',
                    content: `Monthly financial history:\n${JSON.stringify(historyData)}`
                }
            ], {
                temperature: 0.3,
                max_tokens: 256,
                response_format: { type: 'json_object' },
            });

            const parsed = localAI.parseJSON<any>(response.text);
            const arr = Array.isArray(parsed) ? parsed : (parsed.insights || parsed.data || []);
            return arr.filter((s: any) => typeof s === 'string').slice(0, 3);

        } catch {
            // Return empty — fallback to rule-based insights
            return [];
        }
    }, []);

    return {
        isLoading,
        isAvailable,
        checkAvailability,
        analyzePortfolio,
        categorizeTransaction,
        generateMonthlyDigest,
        generateBudgetInsights,
    };
};
