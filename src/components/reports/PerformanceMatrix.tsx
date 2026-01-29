
import React from 'react';
import { CheckCircle2, ArrowUpRight, ArrowDownRight, Briefcase, ArrowDown, ArrowUp } from 'lucide-react';
import { formatCurrency } from '../../lib/money';
import { ReportSnapshot, MetricValue } from '../../lib/reports/types';

const Delta: React.FC<{ val?: number }> = ({ val }) => {
    if (val === undefined) return <span className="text-neutral-300">-</span>;
    const isPos = val >= 0;
    return (
        <span className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${isPos ? 'text-green-600' : 'text-red-600'}`}>
            {isPos ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(val).toFixed(1)}%
        </span>
    );
};

const Row: React.FC<{ label: string, val: MetricValue, ident?: boolean, bold?: boolean }> = ({ label, val, ident, bold }) => (
    <tr className={`border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 ${bold ? 'font-bold bg-neutral-50/30' : ''}`}>
        <td className={`px-4 py-2 print:py-0.5 ${ident ? 'pl-8 text-neutral-500' : 'text-neutral-700'}`}>{label}</td>
        <td className={`px-4 py-2 print:py-0.5 text-right font-mono ${bold ? 'text-neutral-900' : 'text-neutral-600'}`}>{val.formatted}</td>
        {/* Previous Value Calculation (Derived) */}
        <td className="px-4 py-2 print:py-0.5 text-right font-mono text-neutral-400">
            {val.deltaValue !== undefined ? formatCurrency(val.value - val.deltaValue, val.currency, { compact: false }) : '-'}
        </td>
        <td className="px-4 py-2 print:py-0.5 text-right">
            <Delta val={val.delta} />
        </td>
    </tr>
);

export const PerformanceMatrix: React.FC<{ snapshot: ReportSnapshot }> = ({ snapshot }) => {
    const s = snapshot.summary;
    const b = snapshot.business;

    return (
        <div className="mb-10 print:mb-2 relative z-10 page-break-inside-avoid">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-2 mb-6 print:mb-2 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-gold-500" /> Performance Matrix
            </h2>

            <div className="overflow-hidden rounded-xl border border-neutral-200">
                <table className="w-full text-sm text-left">
                    <thead className="text-[10px] text-neutral-500 uppercase bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-4 py-3 print:py-1.5 font-bold">Metric</th>
                            <th className="px-4 py-3 print:py-1.5 font-bold text-right">Current</th>
                            <th className="px-4 py-3 print:py-1.5 font-bold text-right">Previous</th>
                            <th className="px-4 py-3 print:py-1.5 font-bold text-right">Delta</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Personal P&L */}
                        <tr className="bg-neutral-100/50"><td colSpan={4} className="px-4 py-1.5 print:py-1 text-[10px] font-bold text-neutral-500 uppercase">Personal Flow</td></tr>
                        <Row label="Total Income" val={s.income} />
                        <Row label="Living Expenses" val={s.expense} />
                        <Row label="Net Savings" val={s.net} bold />

                        {/* Business P&L if exists */}
                        {b && (
                            <>
                                <tr className="bg-blue-50/50"><td colSpan={4} className="px-4 py-1.5 print:py-1 text-[10px] font-bold text-blue-600 uppercase mt-4">Business Performance</td></tr>
                                <Row label="Gross Revenue" val={b.revenue} />
                                <Row label="Operating Expenses" val={b.expenses} />
                                <Row label="Net Profit" val={b.netProfit} bold />
                            </>
                        )}

                        {/* Balance Sheet Items */}
                        <tr className="bg-gold-50/30"><td colSpan={4} className="px-4 py-1.5 print:py-1 text-[10px] font-bold text-gold-600 uppercase mt-4">Balance Sheet Snapshot</td></tr>
                        <Row label="Liquid Cash" val={s.liquidAssets} />
                        <Row label="Investments" val={s.investedAssets} />
                        <Row label="Total Net Worth" val={s.netWorth} bold />
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const BusinessLedger: React.FC<{ snapshot: ReportSnapshot }> = ({ snapshot }) => {
    if (!snapshot.business) return null;

    const entities = snapshot.business.byEntity;
    const format = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: snapshot.currency }).format(v);

    return (
        <div className="mb-10 print:mb-4 relative z-10 page-break-inside-avoid">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-2 mb-6 flex items-center gap-2">
                <Briefcase size={16} className="text-gold-500" /> Entity Ledger
            </h2>

            <div className="overflow-hidden rounded-xl border border-neutral-200">
                <table className="w-full text-sm text-left">
                    <thead className="text-[10px] text-neutral-500 uppercase bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-4 py-3 font-bold">Entity</th>
                            <th className="px-4 py-3 font-bold text-right">Revenue</th>
                            <th className="px-4 py-3 font-bold text-right">Expenses</th>
                            <th className="px-4 py-3 font-bold text-right">Net Profit</th>
                            <th className="px-4 py-3 font-bold text-right">Margin</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {entities.map(e => (
                            <tr key={e.id} className="hover:bg-neutral-50/50">
                                <td className="px-4 py-3 font-bold text-neutral-800">{e.name}</td>
                                <td className="px-4 py-3 text-right font-mono text-neutral-600">{format(e.revenue)}</td>
                                <td className="px-4 py-3 text-right font-mono text-neutral-600">{format(e.expense)}</td>
                                <td className={`px-4 py-3 text-right font-mono font-bold ${e.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    {format(e.profit)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${e.profit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {e.margin.toFixed(1)}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
