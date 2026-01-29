
import React, { useState, useMemo, useEffect } from 'react';
import { useInvestments } from '../contexts/InvestmentsContext';
import {
    TrendingUp, TrendingDown, DollarSign, Activity, PieChart,
    ArrowUpRight, ArrowDownRight, Plus, Filter, Wallet, Building,
    Briefcase, Zap, Clock, ChevronRight, X, Trash2, Edit2, Globe, Sparkles
} from 'lucide-react';
import { Investment, InvestmentStrategy, InvestmentType } from '../types';
import { INITIAL_INVESTMENTS, CURRENCIES } from '../constants';
import { MarketFeed } from './MarketFeed';
import { PortfolioBreakdown } from './PortfolioBreakdown';
import { formatCurrency, convertAmount } from '../lib/money';
import { getLocalDateISO } from '../lib/dates';

// --- PRICE HISTORY CHART COMPONENT (Glassmorphism) ---
const PriceHistoryChart: React.FC<{ basePrice: number, currency: string, color?: string }> = ({ basePrice, currency, color }) => {
    const [period, setPeriod] = useState<7 | 30 | 90>(30);

    const data = useMemo(() => {
        const points = [];
        let price = basePrice;
        points.push({ day: 0, value: price });

        for (let i = 1; i < period; i++) {
            // Random volatility between -2.5% and +2.5%
            const change = (Math.random() - 0.5) * 0.05;
            price = price * (1 - change);
            points.push({ day: i, value: price });
        }
        return points.reverse();
    }, [basePrice, period]);

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 100;
    const height = 40;

    const pointsStr = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d.value - min) / range) * height; // Invert Y
        return `${x},${y}`;
    }).join(' ');

    const startPrice = data[0].value;
    const endPrice = data[data.length - 1].value;
    const isUp = endPrice >= startPrice;
    const displayColor = color || (isUp ? '#10B981' : '#EF4444');

    return (
        <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-[2.5rem] p-8 shadow-xl flex flex-col h-full group transition-colors hover:border-gold-500/20 duration-500 relative overflow-hidden">
            {/* Ambient Light */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-400/5 rounded-full blur-3xl pointer-events-none -mt-20 -mr-20"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} className="text-gold-500" /> Performance
                </h3>
                <div className="flex bg-white/50 dark:bg-neutral-800/50 backdrop-blur-md rounded-xl p-1 border border-white/20 dark:border-white/5">
                    {[7, 30, 90].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p as any)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${period === p
                                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                                }`}
                        >
                            {p}D
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative w-full aspect-[3/1] z-10">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible drop-shadow-lg">
                    <defs>
                        <linearGradient id={`gradient-${period}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={displayColor} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={displayColor} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path
                        d={`M 0,${height} ${pointsStr} L ${width},${height} Z`}
                        fill={`url(#gradient-${period})`}
                        className="transition-all duration-500 ease-out"
                    />
                    <polyline
                        points={pointsStr}
                        fill="none"
                        stroke={displayColor}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-500 ease-out"
                    />
                </svg>
                <div className="absolute top-0 right-0 text-[10px] font-mono font-bold text-neutral-500 bg-white/50 dark:bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/10">
                    High: {formatCurrency(max, currency, { compact: true })}
                </div>
            </div>
            <div className="absolute bottom-6 left-8 text-neutral-400 text-xs italic opacity-50">
                Simulated historical data
            </div>
        </div>
    );
};

interface InvestmentsPageProps {
    baseCurrency: string;
    t: (key: string) => string;
}

export const InvestmentsPage: React.FC<InvestmentsPageProps> = ({
    baseCurrency,
    t
}) => {
    const { investments, addInvestment, updateInvestment, deleteInvestment, refreshRealTimeQuotes, loading, error: contextError } = useInvestments();

    const [strategyFilter, setStrategyFilter] = useState<'all' | 'active' | 'passive'>('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

    // Form State
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<InvestmentType>('stock');
    const [newStrategy, setNewStrategy] = useState<InvestmentStrategy>('passive');
    const [newQty, setNewQty] = useState('');
    const [newCost, setNewCost] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newTicker, setNewTicker] = useState('');
    const [newCurrency, setNewCurrency] = useState('USD');

    useEffect(() => {
        if (editingInvestment) {
            setNewName(editingInvestment.name);
            setNewType(editingInvestment.type);
            setNewStrategy(editingInvestment.strategy);
            setNewQty(editingInvestment.quantity.toString());
            setNewCost((editingInvestment.costBasis / editingInvestment.quantity).toFixed(2)); // Avg price
            setNewPrice(editingInvestment.currentPrice.toString());
            setNewTicker(editingInvestment.ticker || '');
            setNewCurrency(editingInvestment.currency || 'USD');
        } else {
            // Reset
            setNewName('');
            setNewType('stock');
            setNewStrategy('passive');
            setNewQty('');
            setNewCost('');
            setNewPrice('');
            setNewTicker('');
            setNewCurrency(baseCurrency);
        }
    }, [editingInvestment, isFormOpen, baseCurrency]);

    // --- AGGREGATIONS (Normalized to Base Currency) ---
    const totalValue = investments.reduce((acc, curr) => {
        return acc + convertAmount(curr.currentValue, curr.currency || 'USD', baseCurrency);
    }, 0);

    const totalCost = investments.reduce((acc, curr) => {
        return acc + convertAmount(curr.costBasis, curr.currency || 'USD', baseCurrency);
    }, 0);

    const totalPnL = totalValue - totalCost;
    const totalROI = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    const filteredInvestments = useMemo(() => {
        if (strategyFilter === 'all') return investments;
        return investments.filter(i => i.strategy === strategyFilter);
    }, [investments, strategyFilter]);

    // --- HANDLERS ---
    const handleSave = () => {
        if (!newName || !newQty || !newCost || !newPrice) return;

        const qty = parseFloat(newQty);
        const costPerUnit = parseFloat(newCost);
        const price = parseFloat(newPrice);
        const costBasis = qty * costPerUnit;
        const currentValue = qty * price;
        const pnl = currentValue - costBasis;
        const roi = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

        // Use editing ID or generate NEW consistent UUID
        const id = editingInvestment ? editingInvestment.id : crypto.randomUUID();

        const investmentData: Investment = {
            id,
            name: newName,
            type: newType,
            strategy: newStrategy,
            quantity: qty,
            costBasis: costBasis,
            currentPrice: price,
            currentValue: currentValue,
            unrealizedPnL: pnl,
            roiPercent: roi,
            currency: newCurrency,
            ticker: newTicker.toUpperCase(),
            lastUpdated: getLocalDateISO()
        };

        if (editingInvestment) {
            updateInvestment(investmentData);
        } else {
            addInvestment(investmentData);
        }

        setIsFormOpen(false);
        setEditingInvestment(null);
    };

    const handleDelete = () => {
        if (editingInvestment) {
            if (window.confirm(t('investments.deleteConfirm'))) {
                deleteInvestment(editingInvestment.id);
                setIsFormOpen(false);
                setEditingInvestment(null);
            }
        }
    };

    const categoryIcon = (type: string) => {
        switch (type) {
            case 'stock': return <TrendingUp size={18} />;
            case 'crypto': return <Zap size={18} />;
            case 'real_estate': return <Building size={18} />;
            case 'etf': return <PieChart size={18} />;
            default: return <Briefcase size={18} />;
        }
    };

    return (
        <div className="animate-fade-in space-y-8 font-sans">


            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-4">
                <div>
                    <span className="text-xs font-bold text-gold-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Sparkles size={14} /> Wealth Management
                    </span>
                    <h1 className="text-4xl font-display font-bold text-neutral-900 dark:text-white tracking-tight">
                        Portfolio Hub
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refreshRealTimeQuotes()}
                        disabled={loading}
                        className="p-2 rounded-xl bg-white/60 dark:bg-neutral-800/60 border border-white/20 dark:border-white/5 text-neutral-500 hover:text-gold-500 transition-colors disabled:opacity-50"
                        title="Simulate Real-Time Market Update"
                    >
                        <Activity size={20} className={loading ? "animate-spin" : ""} />
                    </button>

                    <div className="flex bg-white/60 dark:bg-neutral-800/60 backdrop-blur-md rounded-xl p-1 border border-white/20 dark:border-white/5">
                        {['all', 'passive', 'active'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setStrategyFilter(filter as any)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${strategyFilter === filter
                                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                                    }`}
                            >
                                {filter === 'all' ? 'All Assets' : filter === 'passive' ? t('investments.passive') : t('investments.active')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- TOP ROW: VITALS & CHART --- */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                {/* NET WORTH CARD */}
                <div className="xl:col-span-8 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-xl transition-all hover:border-gold-500/20">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                        <TrendingUp size={160} className="text-neutral-900 dark:text-white" />
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                            {t('investments.portfolioValue')} ({baseCurrency})
                        </h2>
                        <div className="flex items-baseline gap-4">
                            <h1 className="text-5xl md:text-6xl font-display font-bold text-neutral-900 dark:text-white tracking-tighter">
                                {formatCurrency(totalValue, baseCurrency)}
                            </h1>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-4">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md ${totalPnL >= 0
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                }`}>
                                {totalPnL >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                                <span className="font-bold font-mono text-sm">
                                    {formatCurrency(totalPnL, baseCurrency)}
                                </span>
                                <span className="text-xs opacity-80 border-l border-current pl-2 ml-1">
                                    {(totalROI).toFixed(2)}% ROI
                                </span>
                            </div>

                            <div className="flex items-center gap-2 px-4 py-2 rounded-full border bg-neutral-100/50 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-500 backdrop-blur-md">
                                <Wallet size={16} />
                                <span className="text-xs font-bold">{investments.length} Assets</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BREAKDOWN CHART */}
                <div className="xl:col-span-4 h-full min-h-[320px]">
                    <PortfolioBreakdown investments={filteredInvestments} baseCurrency={baseCurrency} t={t} />
                </div>
            </div>

            {/* --- MIDDLE ROW: MARKET CONTEXT & HISTORY --- */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-8">
                    <PriceHistoryChart basePrice={totalValue} currency={baseCurrency} />
                </div>
                <div className="xl:col-span-4">
                    <div className="h-full bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-[2.5rem] p-6 shadow-xl flex flex-col relative overflow-hidden">
                        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2 mb-4 z-10">
                            <Globe size={16} className="text-gold-500" /> Market Feed
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar z-10">
                            <MarketFeed assets={investments} baseCurrency={baseCurrency} />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- BOTTOM ROW: ASSET LIST --- */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest pl-2">
                    Your Assets
                </h3>
                <button
                    onClick={() => { setEditingInvestment(null); setIsFormOpen(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold hover:scale-105 transition-all shadow-lg active:scale-95"
                >
                    <Plus size={18} /> {t('investments.addInvestment')}
                </button>
            </div>

            <div className="space-y-3">
                {filteredInvestments.map(inv => (
                    <div
                        key={inv.id}
                        onClick={() => { setEditingInvestment(inv); setIsFormOpen(true); }}
                        className="group bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-white/40 dark:border-white/5 rounded-3xl p-4 hover:bg-white/60 dark:hover:bg-neutral-800/60 transition-all cursor-pointer flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-lg hover:border-gold-500/30"
                    >
                        {/* Icon & Name */}
                        <div className="flex items-center gap-4 w-full md:w-1/4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${inv.type === 'crypto' ? 'bg-orange-500' :
                                inv.type === 'real_estate' ? 'bg-emerald-500' :
                                    inv.type === 'etf' ? 'bg-violet-500' : 'bg-blue-600'
                                }`}>
                                {categoryIcon(inv.type)}
                            </div>
                            <div>
                                <h4 className="font-bold text-neutral-900 dark:text-white group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
                                    {inv.name}
                                </h4>
                                <span className="text-xs font-mono text-neutral-400 bg-neutral-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                    {inv.ticker || inv.type.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {/* Mid Stats */}
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 w-full text-center md:text-left">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-neutral-400 mb-0.5">{t('investments.holdings')}</p>
                                <p className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
                                    {inv.quantity} <span className="text-[10px] opacity-70">Units</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-neutral-400 mb-0.5">{t('investments.currentPrice')}</p>
                                <p className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
                                    {formatCurrency(inv.currentPrice, inv.currency || 'USD')}
                                </p>
                            </div>
                            <div className="hidden md:block">
                                <p className="text-[10px] uppercase font-bold text-neutral-400 mb-0.5">Basis</p>
                                <p className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
                                    {formatCurrency(inv.costBasis, inv.currency || 'USD')}
                                </p>
                            </div>
                        </div>

                        {/* Right Stats */}
                        <div className="text-right w-full md:w-auto min-w-[140px]">
                            <p className="text-lg font-mono font-bold text-neutral-900 dark:text-white">
                                {formatCurrency(inv.currentValue, inv.currency || 'USD')}
                            </p>
                            <p className={`text-xs font-bold flex items-center justify-end gap-1 ${inv.unrealizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {inv.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(inv.unrealizedPnL, inv.currency || 'USD')}
                                <span className="opacity-70 font-normal ml-1">
                                    ({inv.roiPercent.toFixed(1)}%)
                                </span>
                            </p>
                        </div>
                    </div>
                ))}

                {filteredInvestments.length === 0 && (
                    <div className="text-center py-20 bg-white/20 dark:bg-white/5 rounded-[3rem] border border-dashed border-neutral-300 dark:border-neutral-800">
                        <div className="bg-neutral-100 dark:bg-neutral-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
                            <Wallet size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-500">No assets found</h3>
                        <p className="text-sm text-neutral-400 mb-6">Start building your portfolio today.</p>
                        <button
                            onClick={() => { setEditingInvestment(null); setIsFormOpen(true); }}
                            className="px-6 py-2 bg-gold-500 text-neutral-900 font-bold rounded-lg hover:bg-gold-400"
                        >
                            Add First Asset
                        </button>
                    </div>
                )}
            </div>

            {/* --- ADD/EDIT MODAL (Glass) --- */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md transition-opacity"
                        onClick={() => setIsFormOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className="bg-white dark:bg-neutral-900 border border-white/20 dark:border-white/10 rounded-[2rem] p-8 max-w-lg w-full relative animate-scale-in shadow-2xl overflow-y-auto max-h-[90vh] z-10">
                        <button onClick={() => { setIsFormOpen(false); setEditingInvestment(null); }} className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                            <X size={24} />
                        </button>

                        <h2 className="text-2xl font-display font-bold text-neutral-900 dark:text-white mb-1 flex items-center gap-3">
                            {editingInvestment ? <Edit2 className="text-gold-500" /> : <Sparkles className="text-gold-500" />}
                            {editingInvestment ? t('investments.updateAsset') : t('investments.addInvestment')}
                        </h2>
                        <p className="text-sm text-neutral-500 mb-8">
                            {editingInvestment ? 'Update your position details.' : 'Track a new asset in your portfolio.'}
                        </p>

                        <div className="space-y-6">
                            {/* Inputs Grid */}
                            <div className="grid grid-cols-2 gap-5">
                                <div className="col-span-2">
                                    <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block pl-1">Asset Name</label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. Apple Inc."
                                        autoFocus
                                        className="w-full bg-platinum-100 dark:bg-black/40 border border-transparent focus:border-gold-500 rounded-xl p-4 text-neutral-900 dark:text-white text-base outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block pl-1">Ticker / Symbol</label>
                                    <input
                                        type="text"
                                        value={newTicker}
                                        onChange={(e) => setNewTicker(e.target.value)}
                                        placeholder="AAPL"
                                        className="w-full bg-platinum-100 dark:bg-black/40 border border-transparent focus:border-gold-500 rounded-xl p-4 text-neutral-900 dark:text-white text-base outline-none font-mono uppercase"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block pl-1">Asset Type</label>
                                    <select
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value as any)}
                                        className="w-full bg-platinum-100 dark:bg-black/40 border border-transparent focus:border-gold-500 rounded-xl p-4 text-neutral-900 dark:text-white text-base outline-none appearance-none"
                                    >
                                        <option value="stock">{t('investments.types.stock')}</option>
                                        <option value="etf">{t('investments.types.etf')}</option>
                                        <option value="crypto">{t('investments.types.crypto')}</option>
                                        <option value="real_estate">{t('investments.types.real_estate')}</option>
                                        <option value="bond">{t('investments.types.bond')}</option>
                                        <option value="startup">{t('investments.types.startup')}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block pl-1">Strategy</label>
                                    <select
                                        value={newStrategy}
                                        onChange={(e) => setNewStrategy(e.target.value as any)}
                                        className="w-full bg-platinum-100 dark:bg-black/40 border border-transparent focus:border-gold-500 rounded-xl p-4 text-neutral-900 dark:text-white text-base outline-none appearance-none"
                                    >
                                        <option value="passive">{t('investments.passive')}</option>
                                        <option value="active">{t('investments.active')}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block pl-1">Currency</label>
                                    <select
                                        value={newCurrency}
                                        onChange={(e) => setNewCurrency(e.target.value)}
                                        className="w-full bg-platinum-100 dark:bg-black/40 border border-transparent focus:border-gold-500 rounded-xl p-4 text-neutral-900 dark:text-white text-base outline-none appearance-none"
                                    >
                                        {CURRENCIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.code}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2 grid grid-cols-3 gap-4 bg-platinum-50 dark:bg-white/5 p-4 rounded-2xl border border-platinum-200 dark:border-white/5">
                                    <div>
                                        <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">Quantity</label>
                                        <input
                                            type="number"
                                            value={newQty}
                                            onChange={(e) => setNewQty(e.target.value)}
                                            placeholder="0"
                                            className="w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 py-2 text-neutral-900 dark:text-white font-mono focus:border-gold-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">Avg Cost</label>
                                        <input
                                            type="number"
                                            value={newCost}
                                            onChange={(e) => setNewCost(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 py-2 text-neutral-900 dark:text-white font-mono focus:border-gold-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">Total Value</label>
                                        <div className="py-2 text-neutral-400 font-mono">
                                            {formatCurrency((parseFloat(newQty) || 0) * (parseFloat(newPrice) || 0), newCurrency, { compact: true })}
                                        </div>
                                    </div>
                                    <div className="col-span-3">
                                        <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">Current Price (Market)</label>
                                        <input
                                            type="number"
                                            value={newPrice}
                                            onChange={(e) => setNewPrice(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 py-2 text-2xl font-bold text-neutral-900 dark:text-white font-mono focus:border-gold-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                {editingInvestment && (
                                    <button
                                        onClick={handleDelete}
                                        className="p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                    >
                                        <Trash2 size={24} />
                                    </button>
                                )}
                                <button
                                    onClick={handleSave}
                                    disabled={!newName || !newQty || !newCost || !newPrice}
                                    className="flex-1 py-4 bg-gold-500 text-neutral-950 font-bold rounded-xl hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-gold-500/20 transform hover:scale-[1.02] transition-all"
                                >
                                    {editingInvestment ? t('investments.updateAsset') : t('investments.addToPortfolio')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
