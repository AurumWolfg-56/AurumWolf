
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, Loader2, ChevronDown, Minimize2, Maximize2, Mic, MicOff, Headphones, Activity } from 'lucide-react';
import { FunctionDeclaration, Type } from "@google/genai";
import { Transaction, Account, BudgetCategory, NavTab, Investment } from '../types';
import { getLocalDateISO } from '../lib/dates';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/money';
import { convertWithRealRate } from '../lib/currency';
import { useAuth } from '../contexts/AuthContext';

interface ConciergeWidgetProps {
    transactions: Transaction[];
    accounts: Account[];
    budgets: BudgetCategory[];
    investments?: Investment[];
    activeTab: NavTab;
    onAddTransactionData?: (tx: Transaction) => void;
    onAddBudget?: (budget: Omit<BudgetCategory, 'id' | 'spent'>) => void;
    t: (key: string) => string;
    language: string;
    privacyMode: boolean;
}

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

// --- AUDIO UTILS (Per Guidelines) ---
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
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

export const ConciergeWidget: React.FC<ConciergeWidgetProps> = ({ transactions, accounts, budgets, investments = [], activeTab, onAddTransactionData, onAddBudget, t, language, privacyMode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState<'connecting' | 'listening' | 'speaking' | 'idle'>('idle');
    const isVoiceActiveRef = useRef(false); // Ref for safe access in callbacks

    const locale = language === 'es' ? 'es-MX' : 'en-US';

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            role: 'model',
            text: t('concierge.welcomeAttributes'),
            timestamp: new Date()
        }
    ]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // --- LIVE API REFS ---
    const videoEl = useRef<HTMLVideoElement>(null); // For future video expansion
    const canvasEl = useRef<HTMLCanvasElement>(null);
    const liveSession = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const nextStartTime = useRef<number>(0);
    const audioSources = useRef<Set<AudioBufferSourceNode>>(new Set());

    // --- CONTEXTUAL GREETING ---
    useEffect(() => {
        if (isOpen && !isVoiceActive) {
            let greeting = "";
            switch (activeTab) {
                case 'business':
                    greeting = t('concierge.contextBusiness');
                    break;
                case 'budget':
                    greeting = t('concierge.contextBudget');
                    break;
                case 'accounts':
                    greeting = t('concierge.contextAssets');
                    break;
                case 'investments':
                    greeting = t('concierge.contextPortfolio');
                    break;
                case 'scan':
                    greeting = t('concierge.contextScan');
                    break;
                default:
                    greeting = t('concierge.contextGeneral');
            }

            // Only add if last message wasn't this greeting
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last.text !== greeting && last.role === 'model') {
                    // Don't spam, just return prev
                    return prev;
                }
                if (last.text !== greeting) {
                    return [...prev, { id: Date.now().toString(), role: 'model', text: greeting, timestamp: new Date() }];
                }
                return prev;
            });
        }
    }, [activeTab, isOpen]);

    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    // --- TOOL DEFINITION ---
    const addTransactionTool: FunctionDeclaration = {
        name: 'addTransaction',
        description: 'Add a new financial transaction to the ledger.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                merchant: { type: Type.STRING, description: 'Name of the merchant or payee' },
                amount: { type: Type.NUMBER, description: 'Transaction amount' },
                category: { type: Type.STRING, description: 'Category of expense/income' },
                type: { type: Type.STRING, enum: ['credit', 'debit'], description: 'Credit (Income) or Debit (Expense)' },
                date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format (use today if unspecified)' }
            },
            required: ['merchant', 'amount', 'type']
        }
    };

    const searchTransactionsTool: FunctionDeclaration = {
        name: 'searchTransactions',
        description: 'Search for transactions based on a query or date range.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: { type: Type.STRING, description: 'Search term (merchant name, category, etc.)' },
                startDate: { type: Type.STRING, description: 'Start date (YYYY-MM-DD)' },
                endDate: { type: Type.STRING, description: 'End date (YYYY-MM-DD)' }
            }
        }
    };

    const createBudgetTool: FunctionDeclaration = {
        name: 'createBudget',
        description: 'Create a new monthly budget category.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                category: { type: Type.STRING, description: 'Name of the budget category (e.g., Dining, Groceries)' },
                limit: { type: Type.NUMBER, description: 'Monthly limit amount' }
            },
            required: ['category', 'limit']
        }
    };

    const convertCurrencyTool: FunctionDeclaration = {
        name: 'convert_currency',
        description: 'Convert a currency amount to another currency using real-time rates.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                amount: { type: Type.NUMBER, description: 'Amount to convert' },
                from: { type: Type.STRING, description: 'Source currency code (e.g. USD, EUR, MXN)' },
                to: { type: Type.STRING, description: 'Target currency code (e.g. EUR, GBP, JPY)' }
            },
            required: ['amount', 'from', 'to']
        }
    };

    // --- CONTEXT PREPARATION ---
    const getFinancialContext = () => {
        // Summarize data to save tokens
        const accountSummary = accounts.map(a => `${a.name} (${a.type}): ${formatCurrency(a.balance, a.currency, { locale })}`).join(', ');
        const budgetSummary = budgets.map(b => `${b.category}: ${formatCurrency(b.spent, b.currency, { locale })} / ${formatCurrency(b.limit, b.currency, { locale })}`).join(', ');
        const investmentSummary = investments.length > 0
            ? investments.map(i => `${i.name} (${i.type}): ${formatCurrency(i.currentValue, i.currency, { locale })} (${i.roiPercent.toFixed(1)}% ROI)`).join(', ')
            : "No investments tracked.";

        // Last 10 Transactions for context
        const recentTx = transactions.slice(0, 10).map(t =>
            `${t.date}: ${t.name} (${t.category}) - ${t.type === 'credit' ? '+' : '-'}${formatCurrency(t.numericAmount, t.currency || 'USD', { locale })}`
        ).join('\n');

        return `
      Current View: ${activeTab}
      User Financial Context:
      - Net Worth Accounts: ${accountSummary}
      - Investment Portfolio: ${investmentSummary}
      - Monthly Budgets Status: ${budgetSummary}
      - Recent Transactions (Last 10):
      ${recentTx}
    `;
    };

    // --- TURN-BASED VOICE HANDLER ---
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const stopVoiceSession = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }

        // Stop playback
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current = null;
        }

        // Stop tracks
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(t => t.stop());
            audioStreamRef.current = null;
        }

        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(t => t.stop());
            audioStreamRef.current = null;
        }

        setIsVoiceActive(false);
        isVoiceActiveRef.current = false;
        setVoiceStatus('idle');
    };

    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const startVoiceSession = async () => {
        setIsVoiceActive(true);
        isVoiceActiveRef.current = true;
        setVoiceStatus('listening');
        chunksRef.current = [];

        try {
            // Ensure AudioContext is running (Mobile Safari fix)
            const checkAudioContext = () => {
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                    audioContextRef.current.resume();
                }
            };
            checkAudioContext();

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                setVoiceStatus('connecting'); // Processing...
                const audioBlob = new Blob(chunksRef.current, { type: mimeType });

                // Convert to base64
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const result = reader.result as string;
                    const base64Audio = result.split(',')[1];
                    const context = getFinancialContext();

                    try {
                        const { aiClient } = await import('../lib/ai/proxy');

                        // Send Audio to Geminii via Proxy (Multimodal)
                        const response = await aiClient.generateContent(
                            'gemini-2.0-flash', // Multimodal model
                            [{
                                role: 'user',
                                parts: [
                                    { text: `Context: ${context}. Respond briefly.` },
                                    { inlineData: { mimeType: 'audio/webm', data: base64Audio } }
                                ]
                            }],
                            {
                                responseModalities: ["AUDIO"],
                                systemInstruction: `You are AurumWolf Voice. Concise financial assistant. Use tools if needed. ${privacyMode ? 'PRIVACY MODE ON. DO NOT SPEAK BALANCES.' : ''}`,
                                tools: [{ functionDeclarations: [addTransactionTool, searchTransactionsTool, createBudgetTool, convertCurrencyTool] }]
                            }
                        );

                        // 1. Play Audio Response
                        const audioResp = response.audioData();
                        if (audioResp) {
                            setVoiceStatus('speaking');
                            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                            audioContextRef.current = ctx;
                            const buffer = await decodeAudioData(decode(audioResp), ctx, 24000, 1);
                            const source = ctx.createBufferSource();
                            source.buffer = buffer;
                            source.connect(ctx.destination);
                            source.start();
                            audioSourceRef.current = source;
                            source.onended = () => {
                                // Auto-listen for Conversation Mode
                                if (isVoiceActiveRef.current) {
                                    // Add a slight delay for natural turn-taking
                                    setTimeout(() => {
                                        if (isVoiceActiveRef.current) {
                                            startVoiceSession();
                                        }
                                    }, 500);
                                } else {
                                    setVoiceStatus('idle');
                                }
                            };
                        }

                        // 2. Handle Tool Calls (Backend executed tools, we just get result? No, model returns FunctionCall request)
                        const calls = response.functionCalls();
                        if (calls.length > 0) {
                            // ... (Same logic as text mode)
                            // Ideally we would execute tools and send back results to model to get final speech...
                            // But for "Turn Based", doing a multi-turn loop is complex.
                            // Simplified: Execute tool and speak generic success message.

                            for (const call of calls) {
                                if (call.name === 'addTransaction' && onAddTransactionData) {
                                    const args = call.args as any;
                                    onAddTransactionData({
                                        id: crypto.randomUUID(),
                                        accountId: accounts[0]?.id || '1',
                                        name: args.merchant,
                                        amount: formatCurrency(args.amount, 'USD', { locale }),
                                        numericAmount: args.amount,
                                        currency: 'USD',
                                        date: args.date || getLocalDateISO(),
                                        category: args.category || 'Uncategorized',
                                        type: args.type,
                                        status: 'completed'
                                    });
                                }

                                if (call.name === 'convert_currency') {
                                    const args = call.args as any;
                                    const result = await convertWithRealRate(args.amount, args.from, args.to);
                                    if (result) {
                                        // Since we can't speak back dynamically in this loop, we show a message
                                        setMessages(prev => [...prev, {
                                            id: (Date.now() + 1).toString(),
                                            role: 'model',
                                            text: `💱 ${formatCurrency(args.amount, args.from, { locale })} = ${formatCurrency(result.convertedAmount, args.to, { locale })}`,
                                            timestamp: new Date()
                                        }]);
                                    }
                                }
                                // Other tools...
                            }
                        }

                    } catch (err) {
                        console.error("Voice Processing Error", err);
                        setVoiceStatus('idle');
                    }
                };
            };

            recorder.start();

        } catch (err: any) {
            console.error("Mic Access Error", err);
            setIsVoiceActive(false);
            isVoiceActiveRef.current = false;

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert(t('concierge.micErrorDenied'));
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                alert(t('concierge.micErrorNotFound'));
            } else {
                alert(`${t('concierge.micErrorUnknown')}: ${err.message || 'Unknown error'}`);
            }
        }
    };

    // --- TEXT MODE HANDLER ---
    const handleSendText = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const { aiClient } = await import('../lib/ai/proxy');
            const context = getFinancialContext();

            const response = await aiClient.generateContent(
                'gemini-2.5-flash',
                [
                    {
                        role: 'user',
                        parts: [{ text: `Context Data:\n${context}\n\nUser Query: ${userMsg.text}` }]
                    }
                ],
                {
                    systemInstruction: `You are the AurumWolf Concierge. Use tools to add transactions if asked. Answer financial questions briefly. ${privacyMode ? 'PRIVACY MODE ON. DO NOT REVEAL SPECIFIC BALANCES OR SENSITIVE DATA UNLESS EXPLICITLY ASKED BY USER.' : ''}`,
                    tools: [
                        { functionDeclarations: [addTransactionTool, searchTransactionsTool, createBudgetTool, convertCurrencyTool] }
                    ]
                }
            );

            const functionCalls = response.functionCalls();
            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];
                if (call.name === 'addTransaction' && onAddTransactionData) {
                    const args = call.args as any;
                    const newTx: Transaction = {
                        id: crypto.randomUUID(),
                        accountId: accounts[0]?.id || '1',
                        name: args.merchant,
                        amount: formatCurrency(args.amount, 'USD', { locale }),
                        numericAmount: args.amount,
                        currency: 'USD',
                        date: args.date || new Date().toISOString().split('T')[0],
                        category: args.category || 'Uncategorized',
                        type: args.type,
                        status: 'completed',
                        description: t('concierge.addedVia')
                    };
                    onAddTransactionData(newTx);
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'model',
                        text: t('concierge.transactionRecorded')
                            .replace('{name}', newTx.name)
                            .replace('{amount}', formatCurrency(Number(newTx.amount), newTx.currency || 'USD', { locale })),
                        timestamp: new Date()
                    }]);
                }
                if (call.name === 'searchTransactions') {
                    const args = call.args as any;
                    const query = (args.query || '').trim();
                    let responseText = t('concierge.noResults');

                    try {
                        let dbQuery = supabase
                            .from('transactions')
                            .select('*')
                            .order('date', { ascending: false })
                            .limit(10);

                        if (query) {
                            // Search name or category case-insensitive
                            dbQuery = dbQuery.or(`name.ilike.%${query}%,category.ilike.%${query}%`);
                        }

                        // Date filters are tricky in 'or' logic, so we chain them if present
                        if (args.startDate) dbQuery = dbQuery.gte('date', args.startDate);
                        if (args.endDate) dbQuery = dbQuery.lte('date', args.endDate);

                        const { data, error } = await dbQuery;

                        if (error) {
                            console.error("Search error:", error);
                            responseText = t('common.error');
                        } else if (data && data.length > 0) {
                            const foundMsg = t('concierge.foundTransactions').replace('{count}', data.length.toString());
                            responseText = `${foundMsg}\n` +
                                data.map((t: any) => `- ${t.date}: ${t.name} (${formatCurrency(t.amount, t.currency || 'USD', { locale, compact: true })})`).join('\n');
                        } else {
                            responseText = t('concierge.noResults');
                        }

                    } catch (err) {
                        console.error("Search exception:", err);
                        responseText = t('common.error');
                    }

                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'model',
                        text: responseText,
                        timestamp: new Date()
                    }]);
                }

                if (call.name === 'createBudget' && onAddBudget) {
                    const args = call.args as any;
                    onAddBudget({
                        category: args.category,
                        limit: args.limit,
                        color: 'bg-indigo-500', // Default color
                        currency: 'USD',
                        icon_key: 'Tag',
                        type: 'expense'
                    });
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'model',
                        text: t('concierge.budgetCreated')
                            .replace('{category}', args.category)
                            .replace('{limit}', formatCurrency(Number(args.limit), 'USD', { locale, compact: true })),
                        timestamp: new Date()
                    }]);
                }

                if (call.name === 'convert_currency') {
                    const args = call.args as any;
                    try {
                        const result = await convertWithRealRate(args.amount, args.from, args.to);
                        if (result) {
                            setMessages(prev => [...prev, {
                                id: (Date.now() + 1).toString(),
                                role: 'model',
                                text: `💱 ${formatCurrency(args.amount, args.from, { locale })} = **${formatCurrency(result.convertedAmount, args.to, { locale })}**\n(Rate: ${result.rate.toFixed(4)})`,
                                timestamp: new Date()
                            }]);
                        } else {
                            setMessages(prev => [...prev, {
                                id: (Date.now() + 1).toString(),
                                role: 'model',
                                text: t('common.error'),
                                timestamp: new Date()
                            }]);
                        }
                    } catch (err) {
                        console.error("Conversion error", err);
                    }
                }
            } else {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'model',
                    text: response.text() || t('concierge.processed'),
                    timestamp: new Date()
                }]);
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: `${t('concierge.connectionError')} Details: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSendText();
    };

    // --- RENDER ---

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 md:bottom-8 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center justify-center text-neutral-950 transition-transform hover:scale-110 active:scale-95 group"
            >
                <div className="absolute inset-0 bg-white rounded-full opacity-0 group-hover:opacity-20 animate-pulse-slow"></div>
                <Sparkles size={24} fill="currentColor" />
            </button>
        );
    }

    return (
        <div className={`fixed z-50 transition-all duration-300 ease-in-out shadow-2xl overflow-hidden flex flex-col bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-gold-500/30
      ${isExpanded
                ? 'inset-0 md:inset-auto md:bottom-8 md:right-8 md:w-[600px] md:h-[80vh] md:rounded-3xl'
                : 'bottom-24 md:bottom-8 right-4 md:right-8 w-[90vw] md:w-[400px] h-[500px] rounded-3xl'
            }
    `}>

            {/* Header */}
            <div className="h-16 bg-white dark:bg-gradient-to-r dark:from-neutral-950 dark:to-neutral-900 border-b border-platinum-200 dark:border-neutral-800 flex items-center justify-between px-5 shrink-0 relative z-20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-500">
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-display font-bold text-neutral-900 dark:text-white tracking-wide">Concierge</h3>
                        <p className="text-[10px] text-green-600 dark:text-green-500 font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> {t('concierge.online')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 transition-colors hidden md:block">
                        {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                    <button onClick={() => { setIsOpen(false); stopVoiceSession(); }} className="p-2 transition-colors">
                        <ChevronDown size={20} />
                    </button>
                </div>
            </div>

            {/* --- VOICE MODE OVERLAY --- */}
            {isVoiceActive && (
                <div className="absolute inset-0 top-16 z-10 bg-neutral-950/95 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in">
                    <div className="relative mb-8">
                        <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${voiceStatus === 'speaking'
                            ? 'border-gold-500 shadow-[0_0_50px_rgba(212,175,55,0.5)] scale-110'
                            : voiceStatus === 'listening'
                                ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] animate-pulse'
                                : 'border-neutral-700'
                            }`}>
                            {voiceStatus === 'connecting' ? <Loader2 size={40} className="animate-spin text-neutral-500" /> :
                                voiceStatus === 'speaking' ? <Activity size={48} className="text-gold-500 animate-bounce" /> :
                                    <Mic size={48} className="text-blue-500" />}
                        </div>
                    </div>
                    <h3 className="text-xl font-display font-bold text-white mb-2">
                        {voiceStatus === 'connecting' ? t('concierge.connecting') :
                            voiceStatus === 'listening' ? t('concierge.listening') :
                                t('concierge.speaking')}
                    </h3>
                    <p className="text-sm text-neutral-500 max-w-xs text-center mb-12">
                        {t('concierge.voicePrompt')}
                    </p>
                    <button
                        onClick={stopVoiceSession}
                        className="px-8 py-3 rounded-full bg-red-500/10 border border-red-500/50 text-red-500 font-bold flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all"
                    >
                        <MicOff size={18} /> {t('concierge.endCall')}
                    </button>
                </div>
            )}

            {/* --- TEXT MESSAGES AREA --- */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-platinum-50 dark:bg-neutral-900/95">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border ${msg.role === 'user' ? 'bg-platinum-200 dark:bg-neutral-800 border-platinum-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400' : 'bg-gold-500 text-neutral-950 border-gold-400'
                            }`}>
                            {msg.role === 'user' ? <User size={16} /> : <Bot size={18} />}
                        </div>
                        <div className={`max-w-[80%] rounded-2xl p-3.5 text-sm leading-relaxed ${msg.role === 'user'
                            ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-platinum-200 dark:border-neutral-700 text-right'
                            : 'bg-white dark:bg-gradient-to-br dark:from-neutral-950 dark:to-neutral-900 text-neutral-700 dark:text-neutral-200 border border-platinum-200 dark:border-neutral-800 shadow-sm'
                            }`}>
                            {msg.text}
                            <p className={`text-[9px] mt-2 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold-500 text-neutral-950 flex items-center justify-center shrink-0">
                            <Bot size={18} />
                        </div>
                        <div className="bg-white dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 rounded-2xl p-4 flex items-center gap-2 shadow-sm">
                            <Loader2 size={16} className="text-gold-500 animate-spin" />
                            <span className="text-xs text-neutral-500">{t('common.processing')}</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* --- INPUT AREA --- */}
            <div className="p-4 bg-white dark:bg-neutral-950 border-t border-platinum-200 dark:border-neutral-800 shrink-0">
                <div className="relative flex items-center gap-2">
                    <button
                        onClick={startVoiceSession}
                        className="p-3 rounded-xl bg-platinum-100 dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 text-gold-600 dark:text-gold-500 hover:bg-gold-500/10 hover:border-gold-500/50 transition-all group"
                        title={t('concierge.startCall')}
                    >
                        <Headphones size={20} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder={t('concierge.typeMessage')}
                            className="w-full bg-platinum-50 dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl pl-4 pr-10 py-3.5 outline-none focus:border-gold-500/50 focus:bg-white dark:focus:bg-neutral-900/80 transition-all placeholder:text-neutral-500 dark:placeholder:text-neutral-600"
                            autoFocus
                        />
                    </div>
                    <button
                        onClick={handleSendText}
                        disabled={!input.trim() || isLoading}
                        className="p-3 rounded-xl bg-gold-500 text-neutral-950 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>

        </div>
    );
};
