
import React, { useMemo } from 'react';
import { Investment } from '../types';
import { convertAmount, formatCurrency } from '../lib/money';
import { PieChart, Briefcase } from 'lucide-react';

interface PortfolioBreakdownProps {
    investments: Investment[];
    baseCurrency: string;
    t: (key: string) => string;
}

export const PortfolioBreakdown: React.FC<PortfolioBreakdownProps> = ({ investments, baseCurrency, t }) => {

    // Process Data
    const analysis = useMemo(() => {
        const typeMap: Record<string, number> = {};
        let totalValue = 0;

        investments.forEach(inv => {
            const val = convertAmount(inv.currentValue, inv.currency || 'USD', baseCurrency);
            const type = inv.type || 'other';
            typeMap[type] = (typeMap[type] || 0) + val;
            totalValue += val;
        });

        // Colors for Investment Types
        const TYPE_COLORS: Record<string, string> = {
            'stock': '#3b82f6', // blue-500
            'etf': '#8b5cf6', // violet-500
            'crypto': '#f97316', // orange-500
            'real_estate': '#10b981', // emerald-500
            'bond': '#64748b', // slate-500
            'startup': '#ec4899', // pink-500
            'commodity': '#eab308', // gold-500
            'other': '#a3a3a3', // neutral-400
        };

        const categories = Object.entries(typeMap)
            .map(([name, value]) => ({
                name,
                value,
                percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
                color: TYPE_COLORS[name] || TYPE_COLORS['other']
            }))
            .sort((a, b) => b.value - a.value);

        return { totalValue, categories };
    }, [investments, baseCurrency]);

    // Donut Logic
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;

    return (
        <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-[2.5rem] p-8 shadow-xl flex flex-col h-full group transition-colors hover:border-gold-500/20 duration-500">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                    <PieChart size={16} className="text-gold-500" /> Allocation
                </h3>
                <div className="flex bg-white/50 dark:bg-neutral-800/50 backdrop-blur-md rounded-xl p-1 border border-white/20 dark:border-white/5">
                    <span className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-neutral-500">
                        By Type
                    </span>
                </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">

                {/* Visual Chart */}
                <div className="relative flex items-center justify-center">
                    {/* SVG Donut */}
                    <svg viewBox="0 0 120 120" className="w-48 h-48 transform -rotate-90 drop-shadow-xl">
                        {analysis.categories.map((cat, i) => {
                            const dashArray = (cat.percent / 100) * circumference;
                            const offset = currentOffset;
                            currentOffset -= dashArray;

                            return (
                                <circle
                                    key={i}
                                    cx="60" cy="60" r={radius}
                                    fill="transparent"
                                    stroke={cat.color}
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeDasharray={`${dashArray} ${circumference}`}
                                    strokeDashoffset={-Math.abs(currentOffset + dashArray)}
                                    className="transition-all duration-1000 origin-center hover:stroke-width-[14px] hover:opacity-90 cursor-pointer"
                                />
                            );
                        })}
                        {/* Empty State Ring */}
                        {analysis.categories.length === 0 && (
                            <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#e5e5e5" strokeWidth="12" className="dark:stroke-neutral-800" />
                        )}
                    </svg>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-1">Total Value</span>
                        <span className="text-xl font-bold font-mono tracking-tight text-neutral-900 dark:text-white">
                            {formatCurrency(analysis.totalValue, baseCurrency, { compact: true })}
                        </span>
                    </div>
                </div>

                {/* Legend / List */}
                <div className="space-y-4">
                    {/* Top Insight */}
                    {analysis.categories.length > 0 && (
                        <div className="mb-4 pb-4 border-b border-neutral-200/50 dark:border-white/5">
                            <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold mb-1">Top Holding</p>
                            <p className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2 capitalize">
                                <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: analysis.categories[0].color }}></span>
                                {analysis.categories[0].name.replace('_', ' ')} <span className="text-neutral-400 text-xs font-medium ml-auto">({Math.round(analysis.categories[0].percent)}%)</span>
                            </p>
                        </div>
                    )}

                    <div className="max-h-[160px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                        {analysis.categories.length > 0 ? (
                            analysis.categories.map((cat, idx) => (
                                <div key={idx} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full ring-2 ring-white/10 dark:ring-black/10" style={{ backgroundColor: cat.color }}></div>
                                        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 truncate max-w-[100px] group-hover:text-neutral-900 dark:group-hover:text-white transition-colors capitalize">
                                            {cat.name.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="text-right flex items-center gap-3">
                                        <span className="block text-xs font-bold text-neutral-900 dark:text-white font-mono">
                                            {formatCurrency(cat.value, baseCurrency, { compact: true })}
                                        </span>
                                        <span className="text-[10px] text-neutral-400 w-8 text-right">
                                            {Math.round(cat.percent)}%
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-neutral-400 text-xs">
                                No assets found
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
