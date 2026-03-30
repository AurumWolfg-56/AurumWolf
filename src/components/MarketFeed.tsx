
import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, RefreshCw, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { localAI, LocalAIError } from '../lib/ai/localAI';
import { Investment } from '../types';

interface MarketFeedProps {
    assets: Investment[];
    baseCurrency: string;
}

interface NewsItem {
    title: string;
    source: string;
    url: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    snippet: string;
}

export const MarketFeed: React.FC<MarketFeedProps> = ({ assets, baseCurrency }) => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [error, setError] = useState('');

    const fetchMarketNews = async () => {
        if (assets.length === 0) return;

        setLoading(true);
        setError('');

        try {
            const assetNames = assets.map(a => a.ticker || a.name).slice(0, 5).join(', ');

            const response = await localAI.chat([
                {
                    role: 'system',
                    content: 'You are a financial news analyst. Generate 3 realistic market news summaries based on the given assets. Respond ONLY with a JSON array of objects with keys: title (string), source (string, news outlet name), sentiment ("positive"|"negative"|"neutral"), snippet (string, 1-2 sentences). No markdown, just the JSON array.'
                },
                {
                    role: 'user',
                    content: `Generate market insights for: ${assetNames}`
                }
            ], {
                temperature: 0.6,
                max_tokens: 512,
                response_format: { type: 'json_object' },
            });

            const parsed = localAI.parseJSON<any>(response.text);
            const arr = Array.isArray(parsed) ? parsed : (parsed.news || parsed.data || []);

            const parsedNews: NewsItem[] = arr.map((item: any) => ({
                title: item.title || 'Market Update',
                source: item.source || 'AI Analysis',
                url: '#',
                sentiment: ['positive', 'negative', 'neutral'].includes(item.sentiment) ? item.sentiment : 'neutral',
                snippet: item.snippet || '',
            }));

            setNews(parsedNews);
            setLastUpdated(new Date());

        } catch (err: any) {
            console.warn('Market news fetch failed:', err);
            if (err instanceof LocalAIError && err.code === 'OFFLINE') {
                setError('LM Studio no está corriendo. Inicia LM Studio para ver noticias.');
            } else {
                setError('Unable to fetch market news at this time.');
            }
            setNews([]);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch on mount
    useEffect(() => {
        fetchMarketNews();
    }, [assets.length]); // Re-fetch if asset list size changes significantly

    if (assets.length === 0) {
        return (
            <div className="p-6 text-center text-neutral-500 bg-neutral-900/30 rounded-2xl border border-dashed border-neutral-800">
                <p className="text-xs">Add assets to your portfolio to see tailored market news.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm dark:shadow-none flex flex-col h-full">

            {/* Header */}
            <div className="p-5 border-b border-platinum-200 dark:border-neutral-800 flex justify-between items-center bg-platinum-50 dark:bg-neutral-950/50">
                <div className="flex items-center gap-2">
                    <Newspaper size={16} className="text-gold-500" />
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Market Intelligence</h3>
                </div>
                <button
                    onClick={fetchMarketNews}
                    disabled={loading}
                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-neutral-800 text-neutral-400 hover:text-gold-500 transition-all disabled:animate-spin"
                >
                    {loading ? <Loader2 size={16} /> : <RefreshCw size={16} />}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-5 space-y-4">
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {loading && news.length === 0 ? (
                    <div className="space-y-4 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4">
                                <div className="w-16 h-16 bg-neutral-800 rounded-xl"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-neutral-800 rounded w-3/4"></div>
                                    <div className="h-2 bg-neutral-800 rounded w-full"></div>
                                    <div className="h-2 bg-neutral-800 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    news.map((item, idx) => (
                        <div key={idx} className="group flex flex-col gap-2 pb-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1">
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm font-bold text-neutral-900 dark:text-neutral-200 group-hover:text-gold-500 transition-colors line-clamp-2 leading-snug"
                                    >
                                        {item.title}
                                    </a>
                                    <p className="text-[10px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                                        {item.snippet}
                                    </p>
                                </div>
                                <div className={`p-1.5 rounded-lg shrink-0 ${item.sentiment === 'positive' ? 'bg-green-500/10 text-green-500' :
                                    item.sentiment === 'negative' ? 'bg-red-500/10 text-red-500' :
                                        'bg-neutral-800 text-neutral-400'
                                    }`}>
                                    <TrendingUp size={14} className={item.sentiment === 'negative' ? 'rotate-180' : ''} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                                    {item.source} <ExternalLink size={8} />
                                </span>
                                {idx === 0 && <span className="text-[9px] bg-gold-500/20 text-gold-500 px-1.5 py-0.5 rounded font-bold">Top Story</span>}
                            </div>
                        </div>
                    ))
                )}

                {!loading && news.length === 0 && !error && (
                    <p className="text-xs text-neutral-500 text-center py-8">
                        Tap refresh to load the latest market data for your assets.
                    </p>
                )}
            </div>

            {/* Footer */}
            {lastUpdated && (
                <div className="p-3 bg-platinum-50 dark:bg-neutral-950 border-t border-platinum-200 dark:border-neutral-800 text-center">
                    <p className="text-[9px] text-neutral-500 font-mono">
                        Last Updated: {lastUpdated.toLocaleTimeString()} via Local AI
                    </p>
                </div>
            )}
        </div>
    );
};
