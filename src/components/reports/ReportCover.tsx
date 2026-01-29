import React from 'react';
import { Logo } from '../Logo';
import { ReportSnapshot } from '../../lib/reports/types';

export const ReportCover: React.FC<{ snapshot: ReportSnapshot; userProfile?: { name: string; email?: string } }> = ({ snapshot, userProfile }) => {
    const { start, end } = snapshot.dateRange;

    // Helper for nice date format - append time to force local interpretation or avoid UTC shift
    const formatDate = (d: string) => {
        if (!d) return '';
        // Appending T12:00:00 ensures we are in the middle of the day, avoiding timezone shifts to previous day
        return new Date(d + 'T12:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <div className="w-[210mm] min-h-[297mm] relative bg-white text-neutral-900 flex flex-col items-center justify-between p-[20mm] overflow-hidden print:w-full print:h-auto print:min-h-[100vh] print:bg-white print:text-neutral-900">

            {/* Background Texture - Subtle Light Mode */}
            <div className="absolute inset-0 opacity-40 pointer-events-none">
                <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-gold-400/10 blur-[150px] rounded-full mix-blend-multiply" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-400/5 blur-[130px] rounded-full mix-blend-multiply" />
            </div>

            {/* Top Badge */}
            <div className="w-full flex justify-between items-start z-10 border-b border-neutral-200 pb-6">
                <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-gold-600">
                    Confidential audit
                </div>
                <div className="text-[10px] font-mono text-neutral-500">
                    ID: {snapshot.generatedAt.split('T')[1].replace(/[:.]/g, '').substring(0, 8)}
                </div>
            </div>

            {/* Center Content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center z-10 w-full max-w-2xl">
                <div className="mb-12 transform scale-150 grayscale opacity-80 hover:grayscale-0 transition-all duration-700">
                    <Logo iconSize="w-24 h-24" textSize="text-4xl" showText={false} />
                </div>

                <h1 className="text-5xl md:text-6xl font-display font-bold mb-4 tracking-tight leading-tight text-neutral-900">
                    Financial<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-500 to-gold-700">Performance</span><br />
                    Report
                </h1>

                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent my-8 opacity-60" />

                <div className="space-y-2">
                    <p className="text-sm text-neutral-500 uppercase tracking-widest font-bold">Audit Period</p>
                    <p className="text-xl font-display text-neutral-800">{formatDate(start)} — {formatDate(end)}</p>
                </div>
            </div>

            {/* Footer Content */}
            <div className="w-full z-10 grid grid-cols-2 gap-8 border-t border-neutral-200 pt-8">
                <div>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Prepared For</p>
                    <p className="text-lg font-display text-neutral-900">{userProfile?.name || 'Authorized User'}</p>
                    {userProfile?.email && <p className="text-xs text-neutral-500 font-mono mt-0.5">{userProfile.email}</p>}
                </div>

                <div className="text-right">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Generated On</p>
                    <p className="text-lg font-display text-neutral-900">{new Date(snapshot.generatedAt).toLocaleDateString()}</p>
                    <p className="text-xs text-neutral-500 mt-1">AurumWolf Wealth OS</p>
                </div>
            </div>

        </div>
    );
};
