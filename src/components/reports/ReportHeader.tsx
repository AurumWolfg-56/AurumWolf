
import React from 'react';
import { Logo } from '../Logo';
import { ReportSnapshot } from '../../lib/reports/types';

interface ReportHeaderProps {
    snapshot: ReportSnapshot;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({ snapshot }) => {
    return (
        <div className="flex justify-between items-start border-b-2 border-gold-500 pb-6 mb-8 relative z-10">
            <div>
                <div className="flex items-center gap-3 text-gold-600 mb-2">
                    <Logo iconSize="w-8 h-8" showText={false} />
                    <span className="font-display font-bold text-2xl tracking-widest text-neutral-900">AURUMWOLF</span>
                </div>
                <p className="text-xs text-neutral-500 uppercase tracking-widest font-bold">Wealth Management Unit</p>
                <div className="mt-2 text-[10px] text-neutral-400">
                    <p>Generated: {new Date(snapshot.generatedAt).toLocaleString()}</p>
                    <p>Currency: {snapshot.currency}</p>
                </div>
            </div>
            <div className="text-right">
                <h1 className="text-4xl font-display font-bold text-neutral-900 mb-1">
                    {snapshot.spec.scope === 'personal' ? 'Personal Financial Report' : 'Business Performance Audit'}
                </h1>
                <p className="text-sm text-neutral-500 font-medium uppercase tracking-wider">
                    {snapshot.spec.period === 'custom' ? 'Custom Period' : snapshot.spec.period}ly Statement
                </p>
                <p className="text-xs text-neutral-400 mt-1 font-mono">
                    {snapshot.dateRange.start} — {snapshot.dateRange.end}
                </p>

                {/* Audit Badges */}
                <div className="flex justify-end gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-neutral-100 text-[10px] text-neutral-500 rounded font-bold">
                        {snapshot.txCount} TXs
                    </span>
                    {snapshot.uncategorizedPercent > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-[10px] text-red-500 rounded font-bold">
                            {snapshot.uncategorizedPercent.toFixed(1)}% Uncategorized
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
