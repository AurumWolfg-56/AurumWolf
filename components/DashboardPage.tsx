
import React, { useMemo, useState, useRef } from 'react';
import {
    TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Shield, Calendar,
    BrainCircuit, PieChart, AlertTriangle, ArrowRight, Activity, Zap, CreditCard,
    Building, ChevronRight, MoreHorizontal, Wallet, Loader2, Repeat, Briefcase, Gauge, Play, Volume2, StopCircle,
    Plus, Camera, ArrowRightLeft // [NEW] Icons for Quick Actions
} from 'lucide-react';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { RecentActivity } from './RecentActivity';
import { FinancialBreakdown } from './FinancialBreakdown';

// ... (other imports)


import { Transaction, Insight, Account, Investment, BudgetCategory, AppNotification } from '../types';
import { CURRENCIES, FX_RATES, BUSINESS_ENTITIES } from '../constants';
import { ProjectionChart } from './ProjectionChart';
import { convertAmount, formatCurrency } from '../lib/money';
import { useAccounts } from '../contexts/AccountsContext';
import { useTransactions } from '../contexts/TransactionsContext';
import { useBudgets } from '../contexts/BudgetsContext'; // [NEW]

interface DashboardPageProps {
    transactions: Transaction[];
    accounts: Account[];
    budgets: BudgetCategory[];
    investments: Investment[];
    baseCurrency: string;
    onViewAllAccounts: () => void;
    onViewAllTransactions: () => void;
    privacyMode: boolean;
    notifications: AppNotification[];
    onClearNotifications: () => void;
    onAddBudget: (b: BudgetCategory) => void;
    userName: string;
    t: (key: string) => string;
}

// --- SUB-COMPONENTS ---
// Define SpendingFlowChart OUTSIDE the main component to avoid recreation on every render
const SpendingFlowChart: React.FC<{ data: any[] }> = ({ data }) => {
    const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense, 100)));

    return (
        <div className="h-48 flex items-end justify-between gap-2 group px-2">
            {data.map((d, i) => {
                const incH = (d.income / maxVal) * 100;
                const expH = (d.expense / maxVal) * 100;
                return (
                    <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 h-full relative group/bar">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-3 opacity-0 group-hover/bar:opacity-100 transition-all duration-300 translate-y-2 group-hover/bar:translate-y-0 bg-neutral-900/90 backdrop-blur-md border border-white/10 text-white text-[10px] p-2.5 rounded-xl shadow-xl pointer-events-none z-20 whitespace-nowrap">
                            <div className="font-bold mb-1 opacity-50 uppercase tracking-wider text-[8px]">{d.displayDate}</div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                <span className="font-mono text-emerald-400">${(d.income || 0).toFixed(0)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                                <span className="font-mono text-rose-400">${(d.expense || 0).toFixed(0)}</span>
                            </div>
                        </div>

                        {/* Bars */}
                        <div className="w-full flex gap-1 items-end h-full px-1">
                            <div className="w-full bg-gradient-to-t from-emerald-500/20 to-emerald-400 rounded-t-md transition-all duration-500 hover:brightness-110 shadow-[0_0_10px_rgba(52,211,153,0.3)]" style={{ height: `${Math.max(incH, 4)}%` }}></div>
                            <div className="w-full bg-gradient-to-t from-rose-500/20 to-rose-400 rounded-t-md transition-all duration-500 hover:brightness-110 shadow-[0_0_10px_rgba(251,113,133,0.3)]" style={{ height: `${Math.max(expH, 4)}%` }}></div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

// --- MOCK DATA (Fallback) ---
const INITIAL_INSIGHTS: Insight[] = [
    {
        id: '1',
        type: 'alert',
        title: 'Spending Spike',
        message: 'Travel expenses are +45% higher than your monthly average.',
        action: 'Review',
        icon: AlertTriangle
    },
    {
        id: '2',
        type: 'opportunity',
        title: 'Optimize Cash',
        message: 'You have significant idle cash. Consider moving funds to a HYSA.',
        action: 'Move',
        icon: Zap
    },
];

// --- AUDIO HELPERS ---
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
    investments = [],
    netWorth,
    onNavigate,
    privacyMode = false,
    baseCurrency = 'USD',
    t
}) => {
    const { accounts } = useAccounts();
    const { transactions } = useTransactions();
    const { budgets } = useBudgets(); // [NEW]

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [insights, setInsights] = useState<Insight[]>(INITIAL_INSIGHTS);

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // 2. Investments Net (Investable Assets for Projection) - still needed for projection breakdown
    const investmentsNet = useMemo(() => investments.reduce((acc, curr) => {
        const convertedVal = convertAmount(curr.currentValue, curr.currency || 'USD', baseCurrency);
        return acc + convertedVal;
    }, 0), [investments, baseCurrency]);

    const totalNetWorth = netWorth;

    // ... existing code ...
    // 3. Monthly Surplus Calculation (Last 30 Days)
    const monthlySurplus = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const limitStr = thirtyDaysAgo.toISOString().split('T')[0];

        const recentTx = transactions.filter(t =>
            t.date >= limitStr &&
            t.category !== 'Transfer' &&
            t.category !== 'Credit Card Payment'
        );

        const income = recentTx
            .filter(t => t.type === 'credit')
            .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

        const expense = recentTx
            .filter(t => t.type === 'debit')
            .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

        return income - expense;
    }, [transactions, baseCurrency]);

    const assetsByType = useMemo(() => {
        const breakdown = accounts.reduce((acc, curr) => {
            const type = curr.type === 'checking' || curr.type === 'savings' ? 'Cash' :
                curr.type === 'crypto' ? 'Crypto' :
                    curr.type === 'investment' ? 'Equities' : 'Debt';
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
        .filter(([k, v]) => (v as number) > 0)
        .reduce((acc, [k, v]) => acc + (v as number), 0);

    // 4. Budget / "Safe to Spend" Logic
    const budgetMetrics = useMemo(() => {
        // Simple Logic: Sum of all expenses in last 30 days vs Sum of all budget limits
        // Refined: We want "Left to Spend" for CURRENT MONTH.

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const currentMonthTx = transactions.filter(t => t.date >= startOfMonth && t.type === 'debit');
        const spentThisMonth = currentMonthTx.reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

        // Total Budget Limit (Sum of all budgets)
        const totalBudgetLimit = budgets.reduce((acc, b) => acc + convertAmount(b.limit, 'USD', baseCurrency), 0);
        // Note: Budgets are stored in base currency usually, but simplicity implies checking. 
        // Assuming budgets created in base currency context or we need conversion if they have specific currency. 
        // For now, assume budget limits are in base currency.

        // If no budgets, maybe use Income * 0.8 as a proxy? Let's stay strict to budgets for now.
        // If totalBudgetLimit is 0, we can't show "Left to Spend" accurately without income.
        // Let's fallback to: (Income This Month) - (Spent This Month)

        const incomeThisMonth = transactions
            .filter(t => t.date >= startOfMonth && t.type === 'credit')
            .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

        const safeLimit = totalBudgetLimit > 0 ? totalBudgetLimit : incomeThisMonth;
        const leftToSpend = Math.max(0, safeLimit - spentThisMonth);
        const progress = safeLimit > 0 ? (spentThisMonth / safeLimit) * 100 : 0;

        return { spentThisMonth, totalBudgetLimit, leftToSpend, progress, safeLimit };
    }, [transactions, budgets, baseCurrency]);

    // 5. Upcoming Bills Logic (Next 7 Days)
    const upcomingBills = useMemo(() => {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        const todayStr = today.toISOString().split('T')[0];
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        return transactions
            .filter(t => t.isRecurring && t.nextRecurringDate && t.nextRecurringDate >= todayStr && t.nextRecurringDate <= nextWeekStr)
            .sort((a, b) => (a.nextRecurringDate || '').localeCompare(b.nextRecurringDate || ''))
            .slice(0, 3); // Top 3
    }, [transactions]);

    // --- HEALTH SCORE ENGINE ---
    const healthScore = useMemo(() => {
        let score = 50; // Base score

        // 1. Liquidity Ratio (Cash / Debt)
        const cash = assetsByType['Cash'] || 0;
        const debt = Math.abs(assetsByType['Debt'] || 0);
        if (cash > debt * 3) score += 15;
        else if (cash > debt) score += 10;
        else if (debt > 0) score -= 10;

        // 2. Investment Ratio (Investments > 30% of Net Worth)
        const invested = (assetsByType['Equities'] || 0) + (assetsByType['Real Estate'] || 0) + (assetsByType['Venture'] || 0);
        const investRatio = totalPositiveAssets > 0 ? (invested / totalPositiveAssets) : 0;
        if (investRatio > 0.5) score += 20;
        else if (investRatio > 0.2) score += 10;

        // 3. Diversification (Do we have > 3 asset classes?)
        const assetClasses = Object.keys(assetsByType).filter(k => assetsByType[k] > 0).length;
        if (assetClasses >= 4) score += 15;
        else if (assetClasses >= 3) score += 10;

        return Math.min(100, Math.max(0, Math.round(score)));
    }, [assetsByType, totalPositiveAssets]);

    const chartData = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push({
                fullDate: d.toISOString().split('T')[0],
                label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
                fullLabel: d.toLocaleDateString('en-US', { weekday: 'long' })
            });
        }

        const dailyTotals = days.map(day => {
            // Sum transactions for the day, converting each to base currency
            const dayTotal = transactions
                .filter(t => t.date === day.fullDate && t.type === 'debit')
                .reduce((sum, t) => {
                    const txAmount = t.numericAmount || 0;
                    // Use accountCurrency if available, otherwise default to USD (should rarely happen in strict mode)
                    const convertedTxAmount = convertAmount(txAmount, t.accountCurrency || 'USD', baseCurrency);
                    return sum + convertedTxAmount;
                }, 0);

            return { ...day, value: dayTotal };
        });

        const max = Math.max(...dailyTotals.map(d => d.value), 100);

        return dailyTotals.map(d => ({
            ...d,
            height: Math.max((d.value / max) * 100, 4),
            formattedValue: formatCurrency(d.value, baseCurrency, { privacy: privacyMode })
        }));
    }, [transactions, privacyMode, baseCurrency]);

    const handleAnalyzePortfolio = async () => {
        if (!import.meta.env.VITE_GEMINI_API_KEY) {
            alert("API Key missing. Please configure your environment.");
            return;
        }

        setIsAnalyzing(true);

        try {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
            const contextData = {
                baseCurrency: baseCurrency,
                netWorth: totalNetWorth,
                assets: assetsByType,
                healthScore: healthScore,
                recentSpending: chartData.map(d => ({ day: d.fullLabel, amount: d.value })),
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `As a financial advisor, analyze this snapshot (values in ${baseCurrency}) and provide 3 actionable insights focusing on spending habits, recurring costs, and savings opportunities (max 10 words each).
            Data: ${JSON.stringify(contextData)}`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                type: { type: Type.STRING, enum: ['alert', 'opportunity', 'info'] },
                                title: { type: Type.STRING },
                                message: { type: Type.STRING },
                                action: { type: Type.STRING }
                            }
                        }
                    }
                }
            });

            if (response.text) {
                const rawData = JSON.parse(response.text);
                const processedInsights: Insight[] = rawData.map((item: any) => ({
                    ...item,
                    icon: item.type === 'alert' ? AlertTriangle
                        : item.type === 'opportunity' ? Zap
                            : BrainCircuit
                }));
                setInsights(processedInsights);
            }

        } catch (error) {
            console.error("AI Analysis Failed:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handlePlayBriefing = async () => {
        if (!import.meta.env.VITE_GEMINI_API_KEY) return;

        if (isPlaying) {
            if (audioSourceRef.current) {
                audioSourceRef.current.stop();
                audioSourceRef.current = null;
            }
            setIsPlaying(false);
            return;
        }

        setIsPlaying(true);

        try {
            // Construct Briefing Text
            const insightText = insights.map(i => `${i.title}: ${i.message}`).join('. ');
            const text = `Good morning. Here is your executive summary. Net Worth is ${formatCurrency(totalNetWorth, baseCurrency)}. Key insights: ${insightText}. End of briefing.`;

            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
                    },
                },
            });

            // Decode and Play
            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audioData) {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                audioContextRef.current = ctx;

                const audioBuffer = await decodeAudioData(
                    decode(audioData),
                    ctx,
                    24000,
                    1
                );

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.start();
                audioSourceRef.current = source;

                source.onended = () => setIsPlaying(false);
            } else {
                setIsPlaying(false);
            }

        } catch (error) {
            console.error("TTS Failed", error);
            setIsPlaying(false);
        }
    };

    // 6. Trend Analysis (Current vs Last Month Spending)
    const spendingTrend = useMemo(() => {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const currentMonthSpent = transactions
            .filter(t => t.date >= currentMonthStart.toISOString() && t.type === 'debit')
            .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

        const lastMonthSpent = transactions
            .filter(t => t.date >= lastMonthStart.toISOString() && t.date <= lastMonthEnd.toISOString() && t.type === 'debit')
            .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

        const diff = currentMonthSpent - lastMonthSpent;
        const percent = lastMonthSpent > 0 ? (diff / lastMonthSpent) * 100 : 0;

        return { currentMonthSpent, lastMonthSpent, diff, percent };
    }, [transactions, baseCurrency]);

    return (
        <div className="relative min-h-screen pb-20 md:pb-0">
            {/* ATMOSPHERIC BACKGROUND */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-gold-500/10 rounded-full blur-[120px] mix-blend-screen opacity-50 dark:opacity-20 animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] mix-blend-screen opacity-50 dark:opacity-20"></div>
                <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] mix-blend-screen opacity-30 dark:opacity-10"></div>
            </div>

            <div className="relative z-10 animate-fade-in px-4 md:px-8 max-w-[1600px] mx-auto space-y-8 pt-6">

                {/* HEADER */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white tracking-tight">
                            {t('dashboard.welcomeBack')}
                        </h1>
                        <p className="text-sm text-neutral-500 font-medium mt-1 flex items-center gap-2">
                            <Calendar size={14} />
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <button
                        onClick={handleAnalyzePortfolio}
                        disabled={isAnalyzing}
                        className="p-3 rounded-full bg-white/50 dark:bg-neutral-800/50 backdrop-blur-md border border-white/20 dark:border-white/10 text-gold-500 shadow-lg shadow-gold-500/10 transition-all hover:scale-105 active:scale-95 group hover:border-gold-500/30"
                    >
                        {isAnalyzing ? <Loader2 size={24} className="animate-spin" /> : <BrainCircuit size={24} className="group-hover:text-gold-400 transition-colors" />}
                    </button>
                </div>

                {/* BENTO GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 xl:gap-8">

                    {/* ROW 1: STATUS (Net Worth + Health) */}
                    <div className="md:col-span-2 xl:col-span-8 relative overflow-hidden p-8 rounded-[2.5rem] bg-neutral-900 dark:bg-black border border-neutral-800 shadow-2xl flex flex-col justify-between min-h-[340px] group transition-transform hover:scale-[1.005]">
                        {/* Background Effects */}
                        <div className="absolute top-0 right-0 p-12 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity duration-700">
                            <Shield size={400} className="text-white transform rotate-12 translate-x-20 -translate-y-20" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-gold-500/10 via-transparent to-transparent opacity-100 pointer-events-none"></div>
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none mix-blend-overlay"></div>

                        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-6">
                            <div>
                                <h3 className="text-xs font-bold text-gold-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                                    <Wallet size={12} /> {t('dashboard.netWorth')}
                                </h3>
                                <span className="text-6xl xl:text-8xl font-display font-bold text-white tracking-tighter block leading-none">
                                    {formatCurrency(totalNetWorth, baseCurrency, { privacy: privacyMode })}
                                </span>
                            </div>
                            {/* Trend Indicator */}
                            <div className="bg-white/5 backdrop-blur-xl pl-2 pr-5 py-2 rounded-2xl border border-white/10 flex items-center gap-3 shadow-2xl">
                                <div className={`p-3 rounded-xl ${monthlySurplus >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                    {monthlySurplus >= 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{monthlySurplus >= 0 ? '+' : ''}{formatCurrency(monthlySurplus, baseCurrency)}</p>
                                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium">This Month</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 w-full bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/5 mt-auto shadow-inner">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Safe to Spend</p>
                                    <p className="text-3xl font-bold text-white font-mono tracking-tight">
                                        {formatCurrency(budgetMetrics.leftToSpend, baseCurrency, { privacy: privacyMode })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-neutral-400 mb-1.5">{Math.round(budgetMetrics.progress)}% Consumed</p>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold inline-block shadow-lg ${budgetMetrics.progress > 100 ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-emerald-500 text-neutral-900 shadow-emerald-500/20'}`}>
                                        {budgetMetrics.progress > 100 ? 'Over Budget' : 'On Track'}
                                    </div>
                                </div>
                            </div>
                            <div className="w-full bg-neutral-800/50 h-3 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 relative ${budgetMetrics.progress > 90 ? 'bg-gradient-to-r from-rose-600 to-rose-400' :
                                        budgetMetrics.progress > 75 ? 'bg-gradient-to-r from-orange-600 to-orange-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                                        }`}
                                    style={{ width: `${Math.min(100, budgetMetrics.progress)}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse-slow"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 xl:col-span-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl flex flex-col justify-between group hover:border-gold-500/20 transition-colors duration-500">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 pointer-events-none"></div>
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                                    <Gauge size={14} className="text-gold-500" /> {t('dashboard.aurumScore')}
                                </h3>
                                <p className="text-[10px] text-neutral-500 font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg inline-block">{t('dashboard.finHealthIndex')}</p>
                            </div>
                            <span className={`text-7xl font-display font-bold tracking-tighter ${healthScore >= 80 ? 'text-emerald-500 drop-shadow-sm' : healthScore >= 60 ? 'text-gold-500 drop-shadow-sm' : 'text-rose-500 drop-shadow-sm'}`}>
                                {healthScore}
                            </span>
                        </div>
                        <div className="relative z-10 mt-8">
                            <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-6 rounded-full overflow-hidden mb-4 border border-neutral-200 dark:border-neutral-700 p-1">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 shadow-sm ${healthScore >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : healthScore >= 60 ? 'bg-gradient-to-r from-gold-500 to-gold-400' : 'bg-gradient-to-r from-rose-500 to-rose-400'}`}
                                    style={{ width: `${healthScore}%` }}
                                ></div>
                            </div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium">
                                {healthScore >= 80 ? t('dashboard.healthExcellent') : healthScore >= 60 ? t('dashboard.healthGood') : t('dashboard.healthPoor')}
                            </p>
                        </div>
                    </div>

                    {/* ROW 2: ACTIONS & INTELLIGENCE */}
                    <div className="md:col-span-1 xl:col-span-3 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-[2.5rem] p-8 shadow-xl flex flex-col justify-center group hover:border-gold-500/20 transition-colors duration-500">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-6 ml-1">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-4 h-full">
                            <button onClick={() => onNavigate('scan')} className="flex flex-col items-center justify-center gap-3 p-4 rounded-3xl bg-gold-500 text-neutral-950 shadow-xl shadow-gold-500/20 transition-all hover:scale-105 active:scale-95 group/btn relative overflow-hidden">
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                                <Camera size={28} strokeWidth={2} className="relative z-10" />
                                <span className="text-xs font-bold relative z-10">Scan</span>
                            </button>
                            <button onClick={() => onNavigate('transactions', { action: 'newTransaction' })} className="flex flex-col items-center justify-center gap-3 p-4 rounded-3xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-900 dark:text-white transition-all hover:border-gold-500/50 hover:shadow-lg active:scale-95 group/btn">
                                <Plus size={28} strokeWidth={2} className="group-hover/btn:text-gold-500 transition-colors" />
                                <span className="text-xs font-bold">Add</span>
                            </button>
                            <button onClick={() => onNavigate('accounts')} className="flex flex-col items-center justify-center gap-3 p-4 rounded-3xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-900 dark:text-white transition-all hover:border-gold-500/50 hover:shadow-lg active:scale-95 group/btn">
                                <ArrowRightLeft size={28} strokeWidth={2} className="group-hover/btn:text-gold-500 transition-colors" />
                                <span className="text-xs font-bold">Transfer</span>
                            </button>
                            <button onClick={() => onNavigate('budget')} className="flex flex-col items-center justify-center gap-3 p-4 rounded-3xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-900 dark:text-white transition-all hover:border-gold-500/50 hover:shadow-lg active:scale-95 group/btn">
                                <PieChart size={28} strokeWidth={2} className="group-hover/btn:text-gold-500 transition-colors" />
                                <span className="text-xs font-bold">Budget</span>
                            </button>
                        </div>
                    </div>

                    <div className="md:col-span-1 xl:col-span-5 bg-gradient-to-b from-white to-platinum-50 dark:from-neutral-900 dark:to-black border border-white/40 dark:border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden shadow-xl flex flex-col group hover:border-gold-500/20 transition-colors duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-500">
                                    <BrainCircuit size={20} className={`${isAnalyzing ? 'animate-pulse' : ''}`} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">{t('dashboard.wealthAi')}</h2>
                                    <p className="text-[10px] text-neutral-500 font-medium">Savings Radar Active</p>
                                </div>
                            </div>
                            <button onClick={handlePlayBriefing} className={`p-2 rounded-full transition-all border ${isPlaying ? 'bg-gold-500 text-white border-gold-500 shadow-lg shadow-gold-500/20 animate-pulse' : 'bg-transparent border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400'}`}>
                                {isPlaying ? <StopCircle size={18} /> : <Volume2 size={18} />}
                            </button>
                        </div>
                        <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                            {insights.slice(0, 2).map((insight) => (
                                <div key={insight.id} className="bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-700/50 p-4 rounded-2xl shadow-sm hover:bg-white/80 dark:hover:bg-neutral-800 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 min-w-[24px] h-6 rounded-lg flex items-center justify-center ${insight.type === 'alert' ? 'bg-rose-500/10 text-rose-500' : 'bg-gold-500/10 text-gold-600 dark:text-gold-500'}`}>
                                            <insight.icon size={14} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">{insight.title}</h4>
                                            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{insight.message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAnalyzePortfolio} disabled={isAnalyzing} className="relative z-10 w-full mt-6 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-gold-600 dark:hover:text-white hover:border-gold-500/50 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md group/btn">
                            {isAnalyzing ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>{t('dashboard.analyzing')}</span>
                                </>
                            ) : (
                                <>
                                    <Zap size={14} className="group-hover/btn:text-gold-500 transition-colors" />
                                    <span>{t('dashboard.analyze')}</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="md:col-span-2 xl:col-span-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-[2.5rem] p-8 shadow-xl flex flex-col group hover:border-gold-500/20 transition-colors duration-500">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                                <Calendar size={14} className="text-gold-500" /> Upcoming
                            </h3>
                            <button className="text-[10px] font-bold text-gold-500 hover:underline">View All</button>
                        </div>
                        <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {upcomingBills.length > 0 ? (
                                upcomingBills.map(bill => (
                                    <div key={bill.id} className="flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 rounded-2xl border border-white/20 dark:border-white/5 hover:border-gold-500/30 transition-colors group/bill">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-800 flex flex-col items-center justify-center border border-neutral-100 dark:border-neutral-700 shadow-sm group-hover/bill:scale-105 transition-transform">
                                                <span className="text-lg font-bold text-neutral-900 dark:text-white leading-none">{new Date(bill.nextRecurringDate!).getDate()}</span>
                                                <span className="text-[8px] font-bold text-gold-500 uppercase">{new Date(bill.nextRecurringDate!).toLocaleString('default', { month: 'short' })}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-neutral-900 dark:text-white truncate max-w-[120px]">{bill.name}</p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                    <p className="text-[10px] text-neutral-500">Auto-Pay</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-neutral-900 dark:text-white font-mono">
                                                {formatCurrency(bill.numericAmount, bill.currency || baseCurrency, { privacy: privacyMode })}
                                            </p>
                                            <button onClick={() => onNavigate('transactions', { action: 'payRecurring', transactionId: bill.id })} className="text-[10px] font-bold text-gold-600 dark:text-gold-500 hover:underline mt-1">
                                                Pay Now
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-neutral-400 text-xs text-italic flex flex-col items-center justify-center gap-2">
                                    <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-300">
                                        <Calendar size={20} />
                                    </div>
                                    No upcoming bills.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ROW 3: DEEP DIVES */}
                    <div className="md:col-span-2 xl:col-span-8 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-[2.5rem] p-8 shadow-xl hover:border-gold-500/20 transition-colors duration-500">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                                    <Activity size={18} className="text-gold-500" /> {t('dashboard.flow')}
                                </h3>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Trend Indicator */}
                                <div className="flex items-center gap-2 bg-white/50 dark:bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-200/50 dark:border-white/5">
                                    {spendingTrend.percent > 0 ? (
                                        <TrendingUp size={16} className="text-rose-500" />
                                    ) : (
                                        <TrendingDown size={16} className="text-emerald-500" />
                                    )}
                                    <span className={`text-xs font-bold ${spendingTrend.percent > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {Math.abs(Math.round(spendingTrend.percent))}% {spendingTrend.percent > 0 ? 'more' : 'less'}
                                    </span>
                                    <span className="text-[10px] text-neutral-400 font-medium">vs last month</span>
                                </div>
                                <div className="px-4 py-2 text-xs font-bold text-neutral-900 dark:text-white bg-white/80 dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-100 dark:border-neutral-700">
                                    Last 30 Days
                                </div>
                            </div>
                        </div>
                        <div className="h-[280px]">
                            <SpendingFlowChart data={chartData} />
                        </div>
                    </div>

                    {/* FINANCIAL BREAKDOWN (Tall Card) - Row Span 2 */}
                    <div className="md:col-span-2 xl:col-span-4 xl:row-span-2 h-full">
                        <FinancialBreakdown
                            transactions={transactions}
                            baseCurrency={baseCurrency}
                            period={30}
                            t={t}
                        />
                    </div>

                    {/* RECENT ACTIVITY */}
                    <div className="md:col-span-2 xl:col-span-8 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-[2.5rem] p-2 shadow-xl hover:border-gold-500/20 transition-colors duration-500">
                        <RecentActivity
                            transactions={transactions}
                            baseCurrency={baseCurrency}
                            onViewAll={() => onNavigate('transactions')}
                            privacyMode={privacyMode}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
};
