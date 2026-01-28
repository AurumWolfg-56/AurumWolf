
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    FileText, Printer, X, Shield, Briefcase
} from 'lucide-react';
import { Transaction, Account, BusinessEntity, Investment } from '../types';
import { ReportHeader } from './reports/ReportHeader';
import { ExecutiveSummary } from './reports/ExecutiveSummary';
import { PerformanceMatrix, BusinessLedger } from './reports/PerformanceMatrix';
import { ReportEngine } from '../lib/reports/engine';
import { ReportPeriod, ReportScope } from '../lib/reports/types';
import { Logo } from './Logo';
import { ReportCover } from './reports/ReportCover';

interface ReportsPageProps {
    transactions: Transaction[];
    accounts: Account[];
    businessEntities: BusinessEntity[];
    investments: Investment[];
    baseCurrency: string;
    healthScores?: Record<string, any>;
    convertAmount: (amount: number, from: string, to: string) => number;
    t: (key: string) => string;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
    transactions,
    accounts,
    businessEntities,
    investments,
    baseCurrency,
    healthScores,
    convertAmount,
    t
}) => {
    // Top Level State
    const [period, setPeriod] = useState<ReportPeriod>('month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [scope, setScope] = useState<ReportScope>('all'); // Report focus

    // View State
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // --- ENGINE INSTANTIATION ---
    const engine = useMemo(() => new ReportEngine({
        transactions,
        accounts,
        businessEntities,
        investments,
        convertAmount
    }), [transactions, accounts, businessEntities, investments, convertAmount]);

    // --- SNAPSHOT GENERATION ---
    const snapshot = useMemo(() => {
        // If Custom period selected but dates are invalid, return a placeholder or default to today
        if (period === 'custom' && (!customStart || !customEnd)) {
            // SAFE DEFAULT: Generate a dummy "today" snapshot to prevent crashes
            // The UI buttons are disabled anyway, so this is just for render safety.
            return engine.generate({
                id: 'default',
                scope,
                period: 'month', // Fallback
                baseCurrency
            });
        }

        return engine.generate({
            id: 'temp-hash',
            scope,
            period,
            baseCurrency,
            customRange: period === 'custom' ? { start: customStart, end: customEnd } : undefined
        });
    }, [engine, scope, period, baseCurrency, customStart, customEnd]);


    const handlePrint = () => {
        setIsGenerating(true);
        setTimeout(() => {
            window.print();
            setIsGenerating(false);
        }, 500);
    };

    // --- REPORT PREVIEW COMPONENT ---
    const renderPreview = () => {
        if (!isPreviewOpen) return null;

        // Use Portal to move this out of the app root for clean printing
        return createPortal(
            <div id="report-print-portal" className="fixed inset-0 z-[200] bg-neutral-900/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block print:overflow-visible">

                {/* Overlay Controls */}
                <div className="fixed top-4 right-4 flex gap-2 print:hidden z-50">
                    <button onClick={handlePrint} className="px-6 py-3 bg-gold-500 hover:bg-gold-400 text-neutral-950 font-bold rounded-full shadow-lg flex items-center gap-2 transition-all">
                        <Printer size={18} /> Download PDF
                    </button>
                    <button onClick={() => setIsPreviewOpen(false)} className="p-3 bg-neutral-800 text-white rounded-full hover:bg-neutral-700 transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* REPORT CONTAINER - RESET FOR PRINT */}
                <div className="print-reset">

                    {/* PAGE 1: COVER */}
                    <ReportCover
                        snapshot={snapshot}
                        userProfile={{
                            name: "Authorized User", // Ideally pull from AuthContext
                        }}
                    />

                    {/* SUBSEQUENT PAGES: CONTENT */}
                    <div className="w-[210mm] min-h-[297mm] bg-white text-neutral-900 shadow-2xl p-[15mm] print:shadow-none print:w-full print:min-h-0 print:h-auto animate-fade-in relative flex flex-col page-break-before">

                        {/* Watermark */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none print:opacity-[0.02] overflow-hidden">
                            <Logo iconSize="w-[500px] h-[500px]" showText={false} />
                        </div>

                        {/* SECTIONS */}
                        <ReportHeader snapshot={snapshot} />

                        <ExecutiveSummary snapshot={snapshot} />

                        <PerformanceMatrix snapshot={snapshot} />

                        {/* Conditionals */}
                        {snapshot.business && <BusinessLedger snapshot={snapshot} />}

                        {/* Footer */}
                        <div className="mt-auto pt-8 border-t border-neutral-200 flex justify-between items-end text-[10px] text-neutral-400">
                            <div>
                                <p>Generated by AurumWolf Wealth OS</p>
                                <p>CONFIDENTIAL - FOR PERSONAL USE ONLY</p>
                            </div>
                            <div className="text-right">
                                <p>REF: {snapshot.generatedAt.split('T')[1].replace(/[:.]/g, '').substring(0, 8)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    return (
        <div className="animate-fade-in space-y-8 pb-24 md:pb-0">
            {renderPreview()}

            {/* Hero Header */}
            <div className="bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-3xl p-8 relative overflow-hidden shadow-sm dark:shadow-none">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <FileText size={140} className="text-neutral-900 dark:text-white" />
                </div>
                <div className="relative z-10 max-w-xl">
                    <h2 className="text-2xl font-display font-bold text-neutral-900 dark:text-white mb-2">{t('titles.reports')}</h2>
                    <p className="text-neutral-500 mb-6">
                        Generate comprehensive financial snapshots for audit, analysis, or banking requirements.
                    </p>

                    {/* Period Selector */}
                    <div className="flex flex-wrap gap-3 mb-4">
                        {(['month', 'quarter', 'year', 'ytd', 'custom'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${period === p
                                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-black border-neutral-900 dark:border-white shadow-lg'
                                    : 'bg-white dark:bg-neutral-900 text-neutral-500 border-platinum-200 dark:border-neutral-800 hover:border-gold-500/50'
                                    }`}
                            >
                                {p === 'month' ? 'Monthly' :
                                    p === 'quarter' ? 'Quarterly' :
                                        p === 'year' ? 'Annual' :
                                            p === 'custom' ? 'Custom' : 'YTD'}
                            </button>
                        ))}
                    </div>

                    {/* Custom Date Inputs */}
                    {period === 'custom' && (
                        <div className="flex gap-4 animate-fade-in">
                            <div>
                                <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">{t('common.from')}</label>
                                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-platinum-100 dark:bg-neutral-800 border border-platinum-200 dark:border-neutral-700 rounded-lg p-2 text-xs text-neutral-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">{t('common.to')}</label>
                                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-platinum-100 dark:bg-neutral-800 border border-platinum-200 dark:border-neutral-700 rounded-lg p-2 text-xs text-neutral-900 dark:text-white" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Cards (Report Generators) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="group bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl p-6 hover:border-gold-500/30 transition-all cursor-default relative overflow-hidden">
                    <Shield size={32} className="text-gold-500 mb-4" />
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Personal Wealth Audit</h3>
                    <p className="text-sm text-neutral-500 mb-6">Income, expenses, savings rate, and net worth analysis.</p>

                    <button
                        onClick={() => { setScope('personal'); setIsPreviewOpen(true); }}
                        disabled={period === 'custom' && (!customStart || !customEnd)}
                        className="w-full py-3 rounded-xl border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white font-bold text-sm hover:bg-platinum-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <FileText size={16} /> Generate Report
                    </button>
                </div>

                <div className="group bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl p-6 hover:border-gold-500/30 transition-all cursor-default relative overflow-hidden">
                    <Briefcase size={32} className="text-blue-500 mb-4" />
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Business Performance</h3>
                    <p className="text-sm text-neutral-500 mb-6">P&L statements, entity margins, and cash flow.</p>

                    <button
                        onClick={() => { setScope('business'); setIsPreviewOpen(true); }}
                        disabled={period === 'custom' && (!customStart || !customEnd)}
                        className="w-full py-3 rounded-xl border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white font-bold text-sm hover:bg-platinum-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <FileText size={16} /> Generate Report
                    </button>
                </div>

            </div>
        </div>
    );
};
