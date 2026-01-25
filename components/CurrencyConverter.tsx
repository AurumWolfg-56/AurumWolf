import React, { useState, useEffect } from 'react';
import { X, RefreshCw, ArrowRight, BrainCircuit, Loader2, TrendingUp } from 'lucide-react';
import { CURRENCIES } from '../constants';
import { convertWithRealRate } from '../lib/currency';
import { formatCurrency } from '../lib/money';

interface CurrencyConverterProps {
    isOpen: boolean;
    onClose: () => void;
    baseCurrency: string;
    t: (key: string) => string;
    language: string;
}

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
    isOpen,
    onClose,
    baseCurrency,
    t,
    language
}) => {
    const locale = language === 'es' ? 'es-MX' : 'en-US';

    const [amount, setAmount] = useState<string>('100');
    const [fromCurrency, setFromCurrency] = useState<string>(baseCurrency);
    const [toCurrency, setToCurrency] = useState<string>(baseCurrency === 'USD' ? 'EUR' : 'USD');
    const [result, setResult] = useState<number | null>(null);
    const [rate, setRate] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // AI Insight State
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleConvert = async () => {
        if (!amount || isNaN(Number(amount))) return;
        setIsLoading(true);
        setAiInsight(null);
        setErrorMsg(null);

        try {
            const data = await convertWithRealRate(Number(amount), fromCurrency, toCurrency);
            if (data) {
                setResult(data.convertedAmount);
                setRate(data.rate);
            } else {
                throw new Error("Invalid response");
            }
        } catch (error) {
            console.error("Conversion failed", error);
            setErrorMsg(t('common.error') || 'Conversion failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const navCurrencies = CURRENCIES.map(c => c.code);

    const handleAskAi = async () => {
        if (!rate) return;
        setIsThinking(true);
        try {
            const { aiClient } = await import('../lib/ai/proxy');

            const prompt = `
                Current exchange rate: 1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}.
                User is converting ${amount} ${fromCurrency}.
                Is this a historically good rate? Provide a very brief (max 15 words) financial insight or tip.
                Respond in ${language === 'es' ? 'Spanish' : 'English'}.
            `;

            const response = await aiClient.generateContent(
                'gemini-2.5-flash',
                [{ role: 'user', parts: [{ text: prompt }] }]
            );

            setAiInsight(response.text());
        } catch (error) {
            console.error("AI Insight failed", error);
            setAiInsight(t('concierge.errorGeneric') || "AI unavailable.");
        } finally {
            setIsThinking(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden relative">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
                    <h3 className="text-xl font-display font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <RefreshCw className="text-gold-500" />
                        {language === 'es' ? 'Conversor Divisas' : 'Currency Converter'}
                    </h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Amount Input */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                            {language === 'es' ? 'Cantidad' : 'Amount'}
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-platinum-100 dark:bg-neutral-800 border-none rounded-xl p-4 text-2xl font-bold font-mono text-neutral-900 dark:text-white focus:ring-2 focus:ring-gold-500 transition-all"
                        />
                    </div>

                    {/* Currencies */}
                    <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                        <select
                            value={fromCurrency}
                            onChange={(e) => setFromCurrency(e.target.value)}
                            className="w-full bg-platinum-100 dark:bg-neutral-800 border-none rounded-xl p-3 font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-gold-500"
                        >
                            {navCurrencies.map(code => <option key={code} value={code}>{code}</option>)}
                        </select>

                        <div className="text-neutral-400">
                            <ArrowRight size={20} />
                        </div>

                        <select
                            value={toCurrency}
                            onChange={(e) => setToCurrency(e.target.value)}
                            className="w-full bg-platinum-100 dark:bg-neutral-800 border-none rounded-xl p-3 font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-gold-500"
                        >
                            {navCurrencies.map(code => <option key={code} value={code}>{code}</option>)}
                        </select>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleConvert}
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl bg-gold-500 text-neutral-950 font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-gold-500/20 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                        {language === 'es' ? 'Convertir Ahora' : 'Convert Now'}
                    </button>

                    {/* Error Message */}
                    {errorMsg && (
                        <div className="text-red-500 text-sm text-center font-medium bg-red-500/10 p-2 rounded-lg animate-pulse">
                            {errorMsg}
                        </div>
                    )}

                    {/* Result Area */}
                    {result !== null && (
                        <div className="bg-platinum-50 dark:bg-white/5 rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 animate-slide-up">
                            <div className="text-center mb-4">
                                <p className="text-sm text-neutral-500 mb-1">1 {fromCurrency} = {rate?.toFixed(4)} {toCurrency}</p>
                                <p className="text-4xl font-display font-bold text-neutral-900 dark:text-white tracking-tight">
                                    {formatCurrency(result, toCurrency, { locale })}
                                </p>
                            </div>

                            {/* AI Advisor Button */}
                            {!aiInsight ? (
                                <button
                                    onClick={handleAskAi}
                                    disabled={isThinking}
                                    className="w-full py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-sm font-bold flex items-center justify-center gap-2 transition-all hover:text-gold-600 dark:hover:text-gold-500"
                                >
                                    {isThinking ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                                    {language === 'es' ? 'Opinión de la IA' : 'AI Rate Analysis'}
                                </button>
                            ) : (
                                <div className="bg-gradient-to-br from-gold-500/10 to-transparent p-4 rounded-xl border border-gold-500/20 flex gap-3 animate-fade-in">
                                    <div className="shrink-0 p-2 bg-gold-500/20 rounded-lg h-fit text-gold-700 dark:text-gold-500">
                                        <BrainCircuit size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gold-700 dark:text-gold-500 uppercase tracking-wide mb-1">
                                            {language === 'es' ? 'Dato del Lobo' : 'Wolf Insight'}
                                        </p>
                                        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
                                            "{aiInsight}"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
