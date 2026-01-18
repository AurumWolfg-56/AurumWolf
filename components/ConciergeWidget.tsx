
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, Loader2, ChevronDown, Minimize2, Maximize2, Mic, MicOff, Headphones, Activity } from 'lucide-react';
import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage, Modality } from "@google/genai";
import { Transaction, Account, BudgetCategory, NavTab, Investment } from '../types';
import { getLocalDateISO } from '../lib/dates';

interface ConciergeWidgetProps {
    transactions: Transaction[];
    accounts: Account[];
    budgets: BudgetCategory[];
    investments?: Investment[];
    activeTab: NavTab;
    onAddTransactionData?: (tx: Transaction) => void;
    onAddBudget?: (budget: Omit<BudgetCategory, 'id' | 'spent'>) => void;
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

export const ConciergeWidget: React.FC<ConciergeWidgetProps> = ({ transactions, accounts, budgets, investments = [], activeTab, onAddTransactionData, onAddBudget }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState<'connecting' | 'listening' | 'speaking' | 'idle'>('idle');

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            role: 'model',
            text: "Welcome to AurumWolf Concierge. Text me or tap the headphones for a voice call.",
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
                    greeting = "I see you are in the Business Hub. Would you like a P&L analysis or entity performance review?";
                    break;
                case 'budget':
                    greeting = "Reviewing your financial plan. You have some budget categories nearing their limit.";
                    break;
                case 'accounts':
                    greeting = "Asset allocation mode active. I can assist with rebalancing strategies.";
                    break;
                case 'investments':
                    greeting = "Portfolio mode active. I can analyze your active vs. passive strategy positions.";
                    break;
                case 'scan':
                    greeting = "Receipt scanner active. I will auto-extract data from any image you upload.";
                    break;
                default:
                    greeting = "I have your full financial context. How may I assist you today?";
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

    // --- CONTEXT PREPARATION ---
    const getFinancialContext = () => {
        // Summarize data to save tokens
        const accountSummary = accounts.map(a => `${a.name} (${a.type}): $${a.balance} ${a.currency}`).join(', ');
        const budgetSummary = budgets.map(b => `${b.category}: $${b.spent} / $${b.limit}`).join(', ');
        const investmentSummary = investments.length > 0
            ? investments.map(i => `${i.name} (${i.type}): $${i.currentValue} (${i.roiPercent.toFixed(1)}% ROI)`).join(', ')
            : "No investments tracked.";

        // Last 10 Transactions for context
        const recentTx = transactions.slice(0, 10).map(t =>
            `${t.date}: ${t.name} (${t.category}) - ${t.type === 'credit' ? '+' : '-'}${t.amount}`
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

    // --- LIVE API HANDLING ---
    const stopVoiceSession = () => {
        if (liveSession.current) {
            // liveSession.current.close(); // Not always available on the session object depending on SDK version, but dropping refs helps
            liveSession.current = null;
        }

        // Stop Audio Tracks
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }

        // Close Context
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        // Clear Sources
        audioSources.current.forEach(source => source.stop());
        audioSources.current.clear();

        setIsVoiceActive(false);
        setVoiceStatus('idle');
    };

    const startVoiceSession = async () => {
        if (!import.meta.env.VITE_GEMINI_API_KEY) {
            alert("API Key missing");
            return;
        }

        setIsVoiceActive(true);
        setVoiceStatus('connecting');

        try {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
            const context = getFinancialContext();

            // 1. Setup Audio Input
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;

            // 2. Setup Audio Contexts
            // Input: 16kHz for Gemini
            // Output: 24kHz from Gemini
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioContextRef.current = audioCtx;
            nextStartTime.current = audioCtx.currentTime;

            const inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const inputSource = inputAudioCtx.createMediaStreamSource(stream);
            const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: `You are AurumWolf Voice, a sophisticated financial AI. 
                  Data Context: ${context}.
                  Speak concisely. When the user asks to add a transaction, call the tool immediately.
                  Do not use markdown in speech. Be helpful, brief, and professional.`,
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } // Kore is usually a good deep voice
                    },
                    tools: [{ functionDeclarations: [addTransactionTool, searchTransactionsTool, createBudgetTool] }]
                },
                callbacks: {
                    onopen: () => {
                        setVoiceStatus('listening');
                        // Connect Audio Pipeline
                        processor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            // Create Blob from Float32
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) {
                                int16[i] = inputData[i] * 32768;
                            }
                            const b64 = encode(new Uint8Array(int16.buffer));

                            sessionPromise.then(session => {
                                session.sendRealtimeInput({
                                    media: {
                                        mimeType: 'audio/pcm;rate=16000',
                                        data: b64
                                    }
                                });
                            });
                        };
                        inputSource.connect(processor);
                        processor.connect(inputAudioCtx.destination);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        // 1. Handle Audio Output
                        const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (audioData) {
                            setVoiceStatus('speaking');
                            const audioBuffer = await decodeAudioData(
                                decode(audioData),
                                audioCtx,
                                24000,
                                1
                            );

                            const source = audioCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(audioCtx.destination);

                            // Schedule
                            const now = audioCtx.currentTime;
                            const startTime = Math.max(now, nextStartTime.current);
                            source.start(startTime);
                            nextStartTime.current = startTime + audioBuffer.duration;

                            audioSources.current.add(source);
                            source.onended = () => {
                                audioSources.current.delete(source);
                                if (audioSources.current.size === 0) setVoiceStatus('listening');
                            };
                        }

                        // 2. Handle Tool Calls
                        if (msg.toolCall) {
                            for (const fc of msg.toolCall.functionCalls) {
                                if (fc.name === 'addTransaction' && onAddTransactionData) {
                                    const args = fc.args as any;
                                    const newTx: Transaction = {
                                        id: crypto.randomUUID(),
                                        accountId: accounts[0]?.id || '1',
                                        name: args.merchant,
                                        amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(args.amount),
                                        numericAmount: args.amount,
                                        currency: 'USD',


                                        date: args.date || getLocalDateISO(),
                                        category: args.category || 'Uncategorized',
                                        type: args.type,
                                        status: 'completed',
                                        description: 'Added via Voice Concierge'
                                    };

                                    onAddTransactionData(newTx);

                                    // Send Tool Response
                                    sessionPromise.then(session => {
                                        session.sendToolResponse({
                                            functionResponses: {
                                                id: fc.id,
                                                name: fc.name,
                                                response: { result: "ok" }
                                            }
                                        });
                                    });
                                }
                            }
                        }

                        // Handle Search Tool
                        if (msg.toolCall) {
                            for (const fc of msg.toolCall.functionCalls) {
                                if (fc.name === 'searchTransactions') {
                                    const args = fc.args as any;
                                    const query = (args.query || '').toLowerCase();
                                    const results = transactions.filter(t => {
                                        const matchesQuery = !query || t.name.toLowerCase().includes(query) || t.category.toLowerCase().includes(query);
                                        const matchesDate = (!args.startDate || t.date >= args.startDate) && (!args.endDate || t.date <= args.endDate);
                                        return matchesQuery && matchesDate;
                                    }).slice(0, 5); // Limit to 5 for voice brevity

                                    const resultText = results.length > 0
                                        ? results.map(t => `${t.date}: ${t.name} ($${t.numericAmount})`).join(', ')
                                        : "No transactions found.";

                                    sessionPromise.then(session => {
                                        session.sendToolResponse({
                                            functionResponses: {
                                                id: fc.id,
                                                name: fc.name,
                                                response: { result: resultText }
                                            }
                                        });
                                    });
                                }
                                if (fc.name === 'createBudget' && onAddBudget) {
                                    const args = fc.args as any;
                                    onAddBudget({
                                        category: args.category,
                                        limit: args.limit,
                                        currency: 'USD',
                                        period: 'monthly'
                                    });
                                    sessionPromise.then(session => {
                                        session.sendToolResponse({
                                            functionResponses: {
                                                id: fc.id,
                                                name: fc.name,
                                                response: { result: "Budget created successfully" }
                                            }
                                        });
                                    });
                                }
                            }
                        }

                        // 3. Handle Interruption
                        if (msg.serverContent?.interrupted) {
                            audioSources.current.forEach(s => s.stop());
                            audioSources.current.clear();
                            nextStartTime.current = 0;
                            setVoiceStatus('listening');
                        }
                    },
                    onclose: () => {
                        setVoiceStatus('idle');
                        setIsVoiceActive(false);
                    },
                    onerror: (err) => {
                        console.error("Live API Error:", err);
                        stopVoiceSession();
                    }
                }
            });

            liveSession.current = sessionPromise;

        } catch (error) {
            console.error("Voice connection failed", error);
            setIsVoiceActive(false);
        }
    };

    // --- TEXT MODE HANDLER ---
    const handleSendText = async () => {
        if (!input.trim() || !import.meta.env.VITE_GEMINI_API_KEY) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
            const context = getFinancialContext();

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    { role: 'user', parts: [{ text: `Context Data:\n${context}\n\nUser Query: ${userMsg.text}` }] }
                ],
                config: {
                    systemInstruction: "You are the AurumWolf Concierge. Use tools to add transactions if asked. Answer financial questions briefly.",
                    tools: [
                        { functionDeclarations: [addTransactionTool, searchTransactionsTool, createBudgetTool] }
                    ]
                }
            });

            const functionCalls = response.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];
                if (call.name === 'addTransaction' && onAddTransactionData) {
                    const args = call.args as any;
                    const newTx: Transaction = {
                        id: crypto.randomUUID(),
                        accountId: accounts[0]?.id || '1',
                        name: args.merchant,
                        amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(args.amount),
                        numericAmount: args.amount,
                        currency: 'USD',
                        date: args.date || new Date().toISOString().split('T')[0],
                        category: args.category || 'Uncategorized',
                        type: args.type,
                        status: 'completed',
                        description: 'Added via Concierge'
                    };
                    onAddTransactionData(newTx);
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'model',
                        text: `Transaction recorded: ${newTx.name} for ${newTx.amount}.`,
                        timestamp: new Date()
                    }]);
                }
                if (call.name === 'searchTransactions') {
                    const args = call.args as any;
                    const query = (args.query || '').toLowerCase();
                    const results = transactions.filter(t => {
                        const matchesQuery = !query || t.name.toLowerCase().includes(query) || t.category.toLowerCase().includes(query);
                        const matchesDate = (!args.startDate || t.date >= args.startDate) && (!args.endDate || t.date <= args.endDate);
                        return matchesQuery && matchesDate;
                    }).slice(0, 10);

                    const resultText = results.length > 0
                        ? `Found ${results.length} transactions:\n` + results.map(t => `- ${t.date}: ${t.name} (${t.amount})`).join('\n')
                        : "No matching transactions found.";

                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'model',
                        text: resultText,
                        timestamp: new Date()
                    }]);
                }

                if (call.name === 'createBudget' && onAddBudget) {
                    const args = call.args as any;
                    onAddBudget({
                        category: args.category,
                        limit: args.limit,
                        currency: 'USD',
                        period: 'monthly'
                    });
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'model',
                        text: `Budget created: ${args.category} with limit $${args.limit}.`,
                        timestamp: new Date()
                    }]);
                }
            } else {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'model',
                    text: response.text || "I processed that request.",
                    timestamp: new Date()
                }]);
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: `Connection error. Details: ${error instanceof Error ? error.message : String(error)}`,
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
        <div className={`fixed z-50 transition-all duration-300 ease-in-out shadow-2xl overflow-hidden flex flex-col bg-neutral-900 border border-gold-500/30
      ${isExpanded
                ? 'inset-0 md:inset-auto md:bottom-8 md:right-8 md:w-[600px] md:h-[80vh] md:rounded-3xl'
                : 'bottom-24 md:bottom-8 right-4 md:right-8 w-[90vw] md:w-[400px] h-[500px] rounded-3xl'
            }
    `}>

            {/* Header */}
            <div className="h-16 bg-gradient-to-r from-neutral-950 to-neutral-900 border-b border-neutral-800 flex items-center justify-between px-5 shrink-0 relative z-20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-500">
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-display font-bold text-white tracking-wide">Concierge</h3>
                        <p className="text-[10px] text-green-500 font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-neutral-400">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 hover:text-white transition-colors hidden md:block">
                        {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                    <button onClick={() => { setIsOpen(false); stopVoiceSession(); }} className="p-2 hover:text-white transition-colors">
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
                        {voiceStatus === 'connecting' ? 'Connecting...' :
                            voiceStatus === 'listening' ? 'Listening...' :
                                'Speaking...'}
                    </h3>
                    <p className="text-sm text-neutral-500 max-w-xs text-center mb-12">
                        Ask me to add transactions, analyze spending, or check your budget.
                    </p>
                    <button
                        onClick={stopVoiceSession}
                        className="px-8 py-3 rounded-full bg-red-500/10 border border-red-500/50 text-red-500 font-bold flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all"
                    >
                        <MicOff size={18} /> End Call
                    </button>
                </div>
            )}

            {/* --- TEXT MESSAGES AREA --- */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-neutral-900/95">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border ${msg.role === 'user' ? 'bg-neutral-800 border-neutral-700 text-neutral-400' : 'bg-gold-500 text-neutral-950 border-gold-400'
                            }`}>
                            {msg.role === 'user' ? <User size={16} /> : <Bot size={18} />}
                        </div>
                        <div className={`max-w-[80%] rounded-2xl p-3.5 text-sm leading-relaxed ${msg.role === 'user'
                            ? 'bg-neutral-800 text-white border border-neutral-700'
                            : 'bg-gradient-to-br from-neutral-950 to-neutral-900 text-neutral-200 border border-neutral-800 shadow-sm'
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
                        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex items-center gap-2">
                            <Loader2 size={16} className="text-gold-500 animate-spin" />
                            <span className="text-xs text-neutral-500">Processing...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* --- INPUT AREA --- */}
            <div className="p-4 bg-neutral-950 border-t border-neutral-800 shrink-0">
                <div className="relative flex items-center gap-2">
                    <button
                        onClick={startVoiceSession}
                        className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-gold-500 hover:bg-gold-500/10 hover:border-gold-500/50 transition-all group"
                        title="Start Voice Call"
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
                            placeholder="Type a message..."
                            className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm rounded-xl pl-4 pr-10 py-3.5 outline-none focus:border-gold-500/50 focus:bg-neutral-900/80 transition-all placeholder:text-neutral-600"
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
