
import React, { useRef, useState } from 'react';
import { Activity, Briefcase, TrendingUp, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ReportSnapshot, MetricValue } from '../../lib/reports/types';

// --- CHART COMPONENT (Inline for simplicity of export) ---
// Reuse the existing robust chart logic but strictly typed
interface ChartProps {
    data: { date: string; value: number }[];
    color?: string;
}

const SimpleSparkline: React.FC<ChartProps> = ({ data, color = "#D4AF37" }) => {
    if (!data || data.length < 2) return null;

    // Normalize simple chart
    const width = 300;
    const height = 60;
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const getX = (i: number) => (i / (data.length - 1)) * width;
    const getY = (v: number) => height - ((v - min) / range) * height;

    const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
            <circle cx={getX(data.length - 1)} cy={getY(data[data.length - 1].value)} r="3" fill={color} />
        </svg>
    )
}

const MetricCard: React.FC<{
    label: string,
    metric: MetricValue,
    icon: any,
    accent?: string
}> = ({ label, metric, icon: Icon, accent = "text-neutral-900" }) => (
    <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] text-neutral-500 font-bold uppercase">{label}</p>
            <div className="p-1.5 bg-white rounded-full border border-neutral-200 text-neutral-400">
                <Icon size={14} />
            </div>
        </div>
        <div>
            <p className={`text-xl font-display font-bold ${accent}`}>{metric.formatted}</p>
            {metric.delta !== undefined && (
                <div className={`flex items-center gap-1 text-[10px] font-bold ${metric.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {metric.delta >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {Math.abs(metric.delta).toFixed(1)}% vs prev
                </div>
            )}
        </div>
    </div>
);

export const ExecutiveSummary: React.FC<{ snapshot: ReportSnapshot }> = ({ snapshot }) => {
    const s = snapshot.summary;

    return (
        <div className="mb-10 print:mb-4 relative z-10 page-break-inside-avoid">
            <div className="flex justify-between items-center border-b border-neutral-200 pb-2 mb-6 print:mb-2">
                <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} className="text-gold-500" /> Executive Summary
                </h2>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6 print:mb-4">
                <MetricCard label="Net Worth" metric={s.netWorth} icon={TrendingUp} />
                <MetricCard label="Net Income" metric={s.net} icon={PieChart} accent={s.net.value >= 0 ? 'text-green-700' : 'text-red-600'} />
                <MetricCard label="Liquid Assets" metric={s.liquidAssets} icon={Briefcase} />
                {snapshot.business ? (
                    <MetricCard label="Business Profit" metric={snapshot.business.netProfit} icon={Activity} accent="text-blue-600" />
                ) : (
                    <MetricCard label="Savings Rate" metric={s.savingsRate} icon={PieChart} accent="text-green-600" />
                )}
            </div>

            {/* Trends Section */}
            <div className="bg-neutral-50 rounded-xl p-6 print:p-4 border border-neutral-100 flex gap-8">
                <div className="flex-1">
                    <p className="text-xs font-bold text-neutral-500 uppercase mb-4 print:mb-2">Capital Trend</p>
                    <div className="h-24 print:h-20 w-full">
                        {/* Placeholder for complex chart, using simple renderer for now */}
                        <SimpleSparkline data={snapshot.trends.netWorth} />
                    </div>
                </div>
                {/* Insights Side Panel */}
                <div className="w-1/3 border-l border-neutral-200 pl-6 print:pl-4">
                    <p className="text-xs font-bold text-neutral-500 uppercase mb-2">Key Insights</p>
                    <ul className="space-y-2">
                        {snapshot.dataQuality.warnings.length > 0 ? (
                            snapshot.dataQuality.warnings.slice(0, 3).map((w, i) => (
                                <li key={i} className="text-[10px] text-red-500 flex gap-2">
                                    <span>•</span> {w}
                                </li>
                            ))
                        ) : (
                            <li className="text-[10px] text-neutral-500 flex gap-2">
                                <span>•</span> System Audit: Data integrity nominal.
                            </li>
                        )}
                        <li className="text-[10px] text-neutral-500 flex gap-2">
                            <span>•</span> Savings Rate is {s.savingsRate?.value.toFixed(1)}%.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
