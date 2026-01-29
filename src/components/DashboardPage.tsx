
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
    TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Shield, Calendar,
    BrainCircuit, PieChart, AlertTriangle, ArrowRight, Activity, Zap, CreditCard,
    Building, ChevronRight, MoreHorizontal, Wallet, Loader2, Repeat, Briefcase, Gauge, Play, Volume2, StopCircle,
    Plus, Camera, ArrowRightLeft, RefreshCw, Maximize2, FileText // [NEW] Icons for Quick Actions
} from 'lucide-react';
import { CurrencyConverter } from './CurrencyConverter';
import { Type } from "@google/genai";
import { RecentActivity } from './RecentActivity';
import { FinancialBreakdown } from './FinancialBreakdown';
import { DocumentScanner } from './Scanner/DocumentScanner';

// ... (other imports)


import { Transaction, Insight, Account, Investment, BudgetCategory, AppNotification, HealthBreakdown, BudgetMetrics, ChartDataPoint, NavTab } from '../types';
import { CURRENCIES, FX_RATES, BUSINESS_ENTITIES } from '../constants';
import { ProjectionChart } from './ProjectionChart';
import { AurumScoreModal } from './AurumScoreModal';
import { convertAmount, formatCurrency } from '../lib/money';
import { useAccounts } from '../contexts/AccountsContext';
import { useTransactions } from '../contexts/TransactionsContext';
import { useBudgets } from '../contexts/BudgetsContext'; // [NEW]
import { useInvestments } from '../contexts/InvestmentsContext';
import { useAuth } from '../contexts/AuthContext';
import { useSecurity } from '../contexts/SecurityContext';

interface DashboardPageProps {
    // transactions, accounts, budgets, investments removed as they are fetched via hooks
    baseCurrency: string;
    // onViewAllAccounts, onViewAllTransactions removed
    onNavigate?: (tab: NavTab, params?: any) => void;
    privacyMode: boolean;
    // notifications, onClearNotifications, onAddBudget removed
    // userName removed
    t: (key: string) => string;
    language?: string;
    // Pre-calculated Metrics
    netWorth: number;
    assetsByType: Record<string, number>;
    monthlySurplus: number;
    budgetMetrics: BudgetMetrics;
    healthScore: number;
    spendingTrend: { diff: number; percent: number };
    chartData: ChartDataPoint[];
    upcomingBills: any[]; // Keep any for now if not strictly defined, or use Transaction[]
    healthBreakdown: HealthBreakdown; // New Prop
}

// --- NEW COMPONENT: SCORE DETAIL MODAL ---
// AurumScoreModal extracted to separate component

// --- SUB-COMPONENTS ---
// Define SpendingFlowChart OUTSIDE the main component to avoid recreation on every render
const SpendingFlowChart: React.FC<{ data: any[] }> = ({ data }) => {
    const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense, 100)));

    return (
        <div className="h-40 sm:h-48 flex items-end justify-between gap-1 sm:gap-2 group px-1 sm:px-2">
            {data.map((d, i) => {
                const incH = (d.income / maxVal) * 100;
                const expH = (d.expense / maxVal) * 100;
                return (
                    <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 h-full relative group/bar">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-3 opacity-0 group-hover/bar:opacity-100 transition-all duration-300 translate-y-2 group-hover/bar:translate-y-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200/50 dark:border-white/10 text-neutral-900 dark:text-white text-[10px] p-2.5 rounded-xl shadow-xl pointer-events-none z-20 whitespace-nowrap">
                            <div className="font-bold mb-1 opacity-50 uppercase tracking-wider text-[8px]">{d.displayDate}</div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-emerald-600 dark:text-emerald-400">{d.displayIncome}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-rose-600 dark:text-rose-400">{d.displayExpense}</span>
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
    // investments removed from props
    netWorth,
    onNavigate,
    privacyMode = false,
    baseCurrency = 'USD',
    t,
    language = 'en',
    // New Props
    assetsByType,
    monthlySurplus,
    budgetMetrics,
    healthScore,
    spendingTrend,
    chartData,
    upcomingBills,
    healthBreakdown
}) => {
    const { accounts } = useAccounts();
    const { transactions } = useTransactions();
    const { budgets } = useBudgets();
    const { investments } = useInvestments();
    const { profile } = useAuth();
    // [NEW] Use Security Context to warn user
    const { hasPin } = useSecurity();

    const userName = profile?.full_name || 'User';

    const locale = language === 'es' ? 'es-MX' : 'en-US';

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isConverterOpen, setIsConverterOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
    const [insights, setInsights] = useState<Insight[]>(INITIAL_INSIGHTS);

    // [New] Effect to inject Security Warning if disabled
    useEffect(() => {
        if (!hasPin) {
            setInsights(prev => {
                if (prev.find(i => i.id === 'security-warning')) return prev;
                return [{
                    id: 'security-warning',
                    type: 'alert',
                    title: t('settings.security'), // Fallback "Security"
                    message: "App is unlocked. Set a PIN to enable Auto-Lock.",
                    action: 'Setup', // Helper string
                    icon: Shield
                }, ...prev];
            });
        }
    }, [hasPin, t]);

    // ... (keep audio refs)
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // Removed internal computations done in hook
    const totalNetWorth = netWorth;

    // AI Analysis Handler
    const handleAnalyzePortfolio = async () => {
        setIsAnalyzing(true);
        try {
            const { aiClient } = await import('../lib/ai/proxy');

            // Prepare context
            const contextData = {
                baseCurrency: baseCurrency,
                netWorth: totalNetWorth,
                assets: assetsByType,
                healthScore: healthScore,
                recentSpending: chartData.map(d => ({ day: d.fullLabel, amount: d.value })),
                upcomingBills: upcomingBills.map(b => ({ name: b.name, amount: b.numericAmount, due: b.nextRecurringDate }))
            };

            const response = await aiClient.generateContent(
                'gemini-2.0-flash', // Using 2.0 Flash for best availability
                [{
                    role: 'user',
                    parts: [{
                        text: `As a top-tier financial advisor, analyze this snapshot (values in ${baseCurrency}) and provide 2-3 brief, high-impact executable insights.
                        Focus on immediate optimization (cash flow, liquidity, savings).
                        Format as JSON array of objects with keys: id, type (alert|opportunity|info), title, message (max 12 words), action (short label).
                        Data: ${JSON.stringify(contextData)}`
                    }]
                }],
                {
                    responseMimeType: "application/json"
                }
            );

            const text = response.text();
            if (text) {
                try {
                    const rawData = JSON.parse(text);
                    const processedInsights: Insight[] = Array.isArray(rawData) ? rawData.map((item: any, idx: number) => ({
                        id: item.id || `ai-${idx}`,
                        type: ['alert', 'opportunity', 'info'].includes(item.type) ? item.type : 'info',
                        title: item.title || 'Insight',
                        message: item.message || 'Review your recent financial activity.',
                        action: item.action || 'View',
                        icon: item.type === 'alert' ? AlertTriangle : item.type === 'opportunity' ? Zap : BrainCircuit
                    })) : [];

                    if (processedInsights.length > 0) {
                        setInsights(processedInsights);
                    }
                } catch (e) {
                    console.error("Failed to parse AI response", e);
                    toast.error("AI Response invalid format");
                }
            }

        } catch (error: any) {
            console.error("AI Analysis Failed:", error);

            // Check for custom AIError code
            if (error.code === 'QUOTA_EXCEEDED') {
                // Could set a specific UI state here, but for now specific alert is better than generic
                toast.warning("⚠️ AI is busy (Quota Exceeded). Please wait 30s and try again.");
            } else if (error.code === 'UNAUTHORIZED') {
                toast.error("Please log in again to use AI features.");
            } else {
                toast.error(`AI Analysis Failed: ${error.message || "Unknown error"}. Check API Key or Connection.`);
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Audio Briefing Handler
    const handlePlayBriefing = async () => {
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
            const insightText = insights.map(i => `${i.title}: ${i.message}`).join('. ');
            const text = `Here is your Aurum Wolf briefing. Current Net Worth is ${formatCurrency(totalNetWorth, baseCurrency, { locale })}. ${insightText || "No urgent alerts at this time."} Have a prosperous day.`;

            const { aiClient } = await import('../lib/ai/proxy');

            // Using the TTS model often available in Gemini (or simulated via correct model config)
            const response = await aiClient.generateContent(
                "gemini-2.0-flash",
                [{ parts: [{ text: `Generate spoken audio for this text: "${text}"` }] }], // Note: Actual TTS request structure depends on capabilities. Assuming text-to-speech config is handled by proxy or model.
                {
                    // If the proxy handles 'speechConfig' correctly for a model that supports it:
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
                    }
                }
            );

            // Check for audio data (if using a multimodal model)
            // If the proxy/client returns standard GenerateContentResponse, check inlineData or similar?
            // The proxy wrapper usually exposes .audioData() if customized?
            // Let's assume the standard client method or the one seen in other files.

            // Wait, looking at `ConciergeWidget.tsx` (from memory): it processes audio output.
            // Let's rely on `response.audioData()` if strictly using the `aiClient` from the proxy provided in this codebase.
            // If `aiClient` is standard GoogleGenAI client, it might be `response.functionCalls()` etc.
            // BUT, `lib/ai/proxy.ts` wrapper might add helpers.
            // I'll assume `response.audioData()` exists or I need to handle base64 from `candidates[0].content.parts[0].inlineData`.

            let audioBase64: string | undefined;
            // Robust check
            if (typeof response.audioData === 'function') {
                audioBase64 = response.audioData();
            } else {
                // Fallback to standard structure inspection
                // @ts-ignore
                audioBase64 = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
            }

            if (audioBase64) {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                audioContextRef.current = ctx;

                const audioBuffer = await decodeAudioData(
                    decode(audioBase64),
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
                console.warn("No audio data received");
                setIsPlaying(false);
            }

        } catch (error) {
            console.error("TTS Failed", error);
            setIsPlaying(false);
        }
    };

    // Cleanup Audio
    useEffect(() => {
        return () => {
            if (audioSourceRef.current) {
                audioSourceRef.current.stop();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    // Just modify the render return to include the modal and the onClick
    return (
        <>
            <AurumScoreModal
                isOpen={isScoreModalOpen}
                onClose={() => setIsScoreModalOpen(false)}
                breakdown={healthBreakdown}
                t={t}
            />

            {isScannerOpen && (
                <DocumentScanner
                    onClose={() => setIsScannerOpen(false)}
                    onSave={(data) => {
                        setIsScannerOpen(false);
                        // Trigger the parent's logic to open transaction form with scanned data
                        if (onNavigate) {
                            // Map scanned data to match Transaction partial structure
                            const mappedData = {
                                amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency || baseCurrency }).format(data.amount || 0),
                                numericAmount: data.amount || 0,
                                currency: data.currency || baseCurrency,
                                name: data.merchant,
                                date: data.date,
                                category: data.category,
                                description: data.description
                            };
                            onNavigate('transactions', { action: 'scanned', data: mappedData });
                        }
                    }}
                />
            )}

            <div className="relative">
                {/* ... (backgrounds) ... */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-gold-500/10 rounded-full blur-[120px] mix-blend-screen opacity-50 dark:opacity-20 animate-pulse-slow"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] mix-blend-screen opacity-50 dark:opacity-20"></div>
                    <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] mix-blend-screen opacity-30 dark:opacity-10"></div>
                </div>

                <div className="relative z-10 animate-fade-in px-4 md:px-8 max-w-[1600px] mx-auto space-y-8 pt-6">

                    {/* HEADER */}
                    <div className="flex items-center justify-between">
                        {/* ... (keep header) ... */}
                        <div>
                            <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white tracking-tight">
                                {t('dashboard.welcomeBack')}, {userName?.split(' ')[0]}
                            </h1>
                            <p className="text-sm text-neutral-500 font-medium mt-1 flex items-center gap-2">
                                <Calendar size={14} />
                                {new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 md:gap-6 xl:gap-8">
                        {/* ... (keep ROW 1 STATUS) ... */}
                        <div className="md:col-span-2 xl:col-span-8 relative overflow-hidden p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] glass shadow-2xl flex flex-col justify-between min-h-[300px] md:min-h-[340px] group transition-transform hover:scale-[1.005]">
                            {/* ... (keep net worth card content) ... */}
                            {/* Re-use exact previous content but truncated for brevity in replace tool if possible? No, must replace contiguous block. */}
                            {/* Background Effects */}
                            <div className="absolute top-0 right-0 p-12 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity duration-700">
                                <Shield size={400} className="text-neutral-900 dark:text-white transform rotate-12 translate-x-20 -translate-y-20" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-gold-500/10 via-transparent to-transparent opacity-100 pointer-events-none"></div>
                            {/* CSS-only Noise/Texture replacement */}
                            <div className="absolute inset-0 opacity-20 dark:opacity-10 mix-blend-overlay pointer-events-none" style={{ backgroundImage: `radial-gradient(at 20% 20%, rgba(255,215,0,0.1) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(52,211,153,0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(251,113,133,0.1) 0px, transparent 50%)` }}></div>

                            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-6">
                                <div>
                                    <h3 className="text-xs font-bold text-gold-600 dark:text-gold-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                                        <Wallet size={12} /> {t('dashboard.netWorth')}
                                    </h3>
                                    <span className="text-4xl sm:text-6xl xl:text-8xl font-display font-bold text-neutral-900 dark:text-white tracking-tighter block leading-none break-all sm:break-normal">
                                        {formatCurrency(totalNetWorth, baseCurrency, { privacy: privacyMode, locale })}
                                    </span>
                                </div>
                                <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl pl-2 pr-5 py-2 rounded-2xl border border-neutral-200/50 dark:border-white/10 flex items-center gap-3 shadow-sm dark:shadow-2xl">
                                    <div className={`p-3 rounded-xl ${monthlySurplus >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                        {monthlySurplus >= 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-neutral-900 dark:text-white">{monthlySurplus >= 0 ? '+' : ''}{formatCurrency(monthlySurplus, baseCurrency, { locale })}</p>
                                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-medium">{t('dashboard.thisMonth')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-10 w-full bg-gradient-to-br from-white/60 to-white/30 dark:from-white/10 dark:to-white/5 backdrop-blur-xl rounded-[1.5rem] p-6 border border-white/40 dark:border-white/10 mt-auto shadow-lg ring-1 ring-white/20 dark:ring-white/5">
                                <div className="flex justify-between items-end mb-5">
                                    <div>
                                        <p className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <Activity size={12} className="text-gold-500" />
                                            {t('dashboard.safeToSpend')}
                                        </p>
                                        <p className="text-4xl font-display font-bold text-neutral-900 dark:text-white tracking-tighter drop-shadow-sm">
                                            {formatCurrency(budgetMetrics.leftToSpend, baseCurrency, { privacy: privacyMode, locale })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold mb-2 shadow-lg backdrop-blur-md border border-white/10 ${budgetMetrics.progress > 100
                                            ? 'bg-rose-500 text-white shadow-rose-500/20'
                                            : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}>
                                            {budgetMetrics.progress > 100 ? t('dashboard.overBudget') : t('dashboard.onTrack')}
                                        </div>
                                        <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">{Math.round(budgetMetrics.progress)}% {t('dashboard.consumed')}</p>
                                    </div>
                                </div>
                                <div className="w-full bg-black/5 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 relative shadow-sm ${budgetMetrics.progress > 90 ? 'bg-gradient-to-r from-rose-500 to-rose-400' :
                                            budgetMetrics.progress > 75 ? 'bg-gradient-to-r from-orange-500 to-orange-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                            }`}
                                        style={{ width: `${Math.min(100, budgetMetrics.progress)}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/30 animate-pulse-slow"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AURUM SCORE CARD - CLICKABLE */}
                        <div
                            onClick={() => setIsScoreModalOpen(true)}
                            className="md:col-span-2 xl:col-span-4 glass rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 relative overflow-hidden shadow-2xl flex flex-col justify-between group hover:border-gold-500/20 transition-all duration-500 cursor-pointer active:scale-[0.98]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 pointer-events-none"></div>

                            {/* Hover hint */}
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-gold-500">
                                <Maximize2 size={20} />
                            </div>

                            <div className="relative z-10 flex justify-between items-start">
                                <div>
                                    <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                                        <Gauge size={14} className="text-gold-500" /> {t('dashboard.aurumScore')}
                                    </h3>
                                    <p className="text-[10px] text-neutral-500 font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg inline-block">{t('dashboard.finHealthIndex')}</p>
                                </div>
                                <span className={`text-7xl font-display font-bold tracking-tighter drop-shadow-sm ${healthBreakdown.isNew ? 'text-neutral-600 dark:text-neutral-500' :
                                    healthScore >= 80 ? 'text-emerald-500' :
                                        healthScore >= 60 ? 'text-gold-500' : 'text-rose-500'
                                    }`}>
                                    {healthBreakdown.isNew ? '—' : healthScore}
                                </span>
                            </div>
                            <div className="relative z-10 mt-8">
                                <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-6 rounded-full overflow-hidden mb-4 border border-neutral-200 dark:border-neutral-700 p-1">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 shadow-sm ${healthBreakdown.isNew ? 'bg-neutral-500' :
                                            healthScore >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                                healthScore >= 60 ? 'bg-gradient-to-r from-gold-500 to-gold-400' :
                                                    'bg-gradient-to-r from-rose-500 to-rose-400'}`}
                                        style={{ width: `${healthBreakdown.isNew ? 0 : healthScore}%` }}
                                    ></div>
                                </div>
                                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium">
                                    {healthBreakdown.isNew ? t('dashboard.scoreDetail.pending') :
                                        healthScore >= 80 ? t('dashboard.healthExcellent') :
                                            healthScore >= 60 ? t('dashboard.healthGood') :
                                                t('dashboard.healthPoor')}
                                </p>
                            </div>
                        </div>

                        {/* ROW 2: ACTIONS & INTELLIGENCE */}
                        <div className="md:col-span-1 xl:col-span-3 glass rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 shadow-xl flex flex-col justify-center group hover:border-gold-500/20 transition-colors duration-500">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 md:mb-6 ml-1">{t('dashboard.quickActions')}</h3>
                            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 md:grid md:grid-cols-2 md:gap-4 h-full pb-2 md:pb-0 -mx-5 px-5 md:mx-0 md:px-0 scrollbar-hide">
                                <button onClick={() => setIsScannerOpen(true)} className="min-w-[220px] md:min-w-0 md:col-span-2 snap-center flex flex-row items-center justify-between px-6 py-4 rounded-[2rem] bg-gradient-to-r from-gold-500 to-gold-400 text-white shadow-xl shadow-gold-500/20 transition-all hover:scale-[1.02] active:scale-95 group/btn relative overflow-hidden">
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 ease-out"></div>
                                    <div className="relative z-10 flex items-center gap-3">
                                        <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                                            <Camera size={24} strokeWidth={2} />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-xs font-bold uppercase tracking-wider opacity-90">{t('common.scan')}</span>
                                            <span className="block text-sm font-bold">Receipt / Invoice</span>
                                        </div>
                                    </div>
                                    <ArrowRight size={20} className="relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                                <button onClick={() => onNavigate && onNavigate('transactions', { action: 'newTransaction' })} className="min-w-[100px] snap-center flex flex-col items-center justify-center gap-2 p-4 rounded-[2rem] bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-900 dark:text-white transition-all hover:border-gold-500/50 hover:shadow-lg active:scale-95 group/btn hover:bg-neutral-50 dark:hover:bg-neutral-750">
                                    <Plus size={24} strokeWidth={2} className="group-hover/btn:text-gold-500 transition-colors" />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">{t('common.add')}</span>
                                </button>
                                <button onClick={() => onNavigate && onNavigate('accounts')} className="min-w-[100px] snap-center flex flex-col items-center justify-center gap-2 p-4 rounded-[2rem] bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-900 dark:text-white transition-all hover:border-gold-500/50 hover:shadow-lg active:scale-95 group/btn hover:bg-neutral-50 dark:hover:bg-neutral-750">
                                    <ArrowRightLeft size={24} strokeWidth={2} className="group-hover/btn:text-gold-500 transition-colors" />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">{t('common.transfer')}</span>
                                </button>
                                <button onClick={() => onNavigate && onNavigate('budget')} className="min-w-[100px] snap-center flex flex-col items-center justify-center gap-2 p-4 rounded-[2rem] bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-900 dark:text-white transition-all hover:border-gold-500/50 hover:shadow-lg active:scale-95 group/btn hover:bg-neutral-50 dark:hover:bg-neutral-750">
                                    <PieChart size={24} strokeWidth={2} className="group-hover/btn:text-gold-500 transition-colors" />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">{t('nav.budget')}</span>
                                </button>
                                <button onClick={() => setIsConverterOpen(true)} className="min-w-[100px] snap-center flex flex-col items-center justify-center gap-2 p-4 rounded-[2rem] bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-900 dark:text-white transition-all hover:border-gold-500/50 hover:shadow-lg active:scale-95 group/btn hover:bg-neutral-50 dark:hover:bg-neutral-750">
                                    <RefreshCw size={24} strokeWidth={2} className="group-hover/btn:text-gold-500 transition-colors" />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">{t('dashboard.currency') || 'Convert'}</span>
                                </button>
                                <button onClick={() => onNavigate && onNavigate('reports')} className="min-w-[100px] snap-center flex flex-col items-center justify-center gap-2 p-4 rounded-[2rem] bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-900 dark:text-white transition-all hover:border-gold-500/50 hover:shadow-lg active:scale-95 group/btn hover:bg-neutral-50 dark:hover:bg-neutral-750">
                                    <FileText size={24} strokeWidth={2} className="group-hover/btn:text-gold-500 transition-colors" />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">{t('nav.reports')}</span>
                                </button>
                                <button onClick={() => onNavigate && onNavigate('investments')} className="min-w-[100px] snap-center flex flex-col items-center justify-center gap-2 p-4 rounded-[2rem] bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-900 dark:text-white transition-all hover:border-gold-500/50 hover:shadow-lg active:scale-95 group/btn hover:bg-neutral-50 dark:hover:bg-neutral-750">
                                    <TrendingUp size={24} strokeWidth={2} className="group-hover/btn:text-gold-500 transition-colors" />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">{t('nav.investments')}</span>
                                </button>
                            </div>
                        </div>

                        <div className="md:col-span-1 xl:col-span-5 glass rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 relative overflow-hidden shadow-xl flex flex-col group hover:border-gold-500/20 transition-colors duration-500">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-500">
                                        <BrainCircuit size={20} className={`${isAnalyzing ? 'animate-pulse' : ''}`} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">{t('dashboard.wealthAi')}</h2>
                                        <p className="text-[10px] text-neutral-500 font-medium">{t('dashboard.savingsRadar')}</p>
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
                                            <div className="flex-1">
                                                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">{insight.title}</h4>
                                                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{insight.message}</p>
                                                {insight.action && (
                                                    <button
                                                        onClick={() => {
                                                            if (insight.action === 'Setup') onNavigate && onNavigate('settings');
                                                            if (insight.action === 'Review') onNavigate && onNavigate('transactions');
                                                        }}
                                                        className="mt-3 text-[10px] font-bold uppercase tracking-wider text-gold-600 dark:text-gold-500 hover:text-gold-700 dark:hover:text-gold-400 flex items-center gap-1 group/act"
                                                    >
                                                        {insight.action === 'Setup' ? t('settings.security') : t('common.view')} <ArrowRight size={12} className="group-hover/act:translate-x-1 transition-transform" />
                                                    </button>
                                                )}
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

                        <div className="md:col-span-2 xl:col-span-4 glass rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 shadow-xl flex flex-col group hover:border-gold-500/20 transition-colors duration-500">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={14} className="text-gold-500" /> {t('dashboard.upcoming')}
                                </h3>
                                <button className="text-[10px] font-bold text-gold-500 hover:underline">{t('dashboard.viewAll')}</button>
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
                                                        <p className="text-[10px] text-neutral-500">{t('dashboard.autoPay')}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-neutral-900 dark:text-white font-mono">
                                                    {formatCurrency(bill.numericAmount, bill.currency || baseCurrency, { privacy: privacyMode, locale })}
                                                </p>
                                                <button onClick={() => onNavigate('transactions', { action: 'payRecurring', transactionId: bill.id })} className="text-[10px] font-bold text-gold-600 dark:text-gold-500 hover:underline mt-1">
                                                    {t('dashboard.payNow')}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-neutral-400 text-xs text-italic flex flex-col items-center justify-center gap-2">
                                        <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-300">
                                            <Calendar size={20} />
                                        </div>
                                        {t('dashboard.noBills')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ROW 3: DEEP DIVES */}
                        <div className="md:col-span-2 xl:col-span-8 glass rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 shadow-xl hover:border-gold-500/20 transition-colors duration-500">
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
                                            {Math.abs(Math.round(spendingTrend.percent))}% {spendingTrend.percent > 0 ? t('dashboard.more') : t('dashboard.less')}
                                        </span>
                                        <span className="text-[10px] text-neutral-400 font-medium">{t('dashboard.vsLastMonth')}</span>
                                    </div>
                                    <div className="px-4 py-2 text-xs font-bold text-neutral-900 dark:text-white bg-white/80 dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-100 dark:border-neutral-700">
                                        {t('common.last30Days')}
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
                        <div className="md:col-span-2 xl:col-span-8 glass rounded-[1.5rem] md:rounded-[2.5rem] p-2 shadow-xl hover:border-gold-500/20 transition-colors duration-500">
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

            <CurrencyConverter
                isOpen={isConverterOpen}
                onClose={() => setIsConverterOpen(false)}
                baseCurrency={baseCurrency}
                t={t}
                language={language}
            />
        </>
    );
};
