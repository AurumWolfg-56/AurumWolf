
import React from 'react';
import { Logo } from '../Logo';
import { ReportSnapshot } from '../../lib/reports/types';

export const ReportCover: React.FC<{ snapshot: ReportSnapshot; userProfile?: { name: string; email?: string } }> = ({ snapshot, userProfile }) => {
    const { start, end } = snapshot.dateRange;

    // Helper for nice date format
    const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="w-[210mm] h-[297mm] relative bg-neutral-900 text-white flex flex-col items-center justify-between p-[20mm] page-break-after overflow-hidden print:bg-neutral-900 print:text-white dark:print:bg-black">

            {/* Background Texture */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-gold-500/20 blur-[150px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 blur-[130px] rounded-full mix-blend-screen" />
            </div>

            {/* Top Badge */}
            <div className="w-full flex justify-between items-start z-10 border-b border-white/10 pb-6">
                <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-gold-500">
                    Confidential audit
                </div>
                <div className="text-[10px] font-mono text-neutral-400">
                    ID: {snapshot.generatedAt.split('T')[1].replace(/[:.]/g, '').substring(0, 8)}
                </div>
            </div>

            {/* Center Content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center z-10 w-full max-w-2xl">
                <div className="mb-12 transform scale-150">
                    <Logo iconSize="w-24 h-24" textSize="text-4xl" showText={false} />
                </div>

                <h1 className="text-5xl md:text-6xl font-display font-bold mb-4 tracking-tight leading-tight">
                    Financial<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-600">Performance</span><br />
                    Report
                </h1>

                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-gold-500 to-transparent my-8 opacity-50" />

                <div className="space-y-2">
                    <p className="text-sm text-neutral-400 uppercase tracking-widest font-bold">Audit Period</p>
                    <p className="text-xl font-display">{formatDate(start)} — {formatDate(end)}</p>
                </div>
            </div>

            {/* Footer Content */}
            <div className="w-full z-10 grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
                <div>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Prepared For</p>
                    <p className="text-lg font-display text-white">{userProfile?.name || 'Authorized User'}</p>
                    {userProfile?.email && <p className="text-xs text-neutral-400 font-mono mt-0.5">{userProfile.email}</p>}
                </div>

                <div className="text-right">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Generated On</p>
                    <p className="text-lg font-display text-white">{new Date(snapshot.generatedAt).toLocaleDateString()}</p>
                    <p className="text-xs text-neutral-500 mt-1">AurumWolf Wealth OS</p>
                </div>
            </div>

            {/* Watermark Logo */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 opacity-[0.03] pointer-events-none">
                <Logo iconSize="w-[600px] h-[600px]" showText={false} />
            </div>
        </div>
    );
};
