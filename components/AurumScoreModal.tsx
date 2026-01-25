import React from 'react';
import { Shield, TrendingUp, Wallet, PieChart, Activity } from 'lucide-react';
import { HealthBreakdown } from '../types';

interface AurumScoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    breakdown: HealthBreakdown;
    t: (key: string) => string;
}

export const AurumScoreModal: React.FC<AurumScoreModalProps> = ({ isOpen, onClose, breakdown, t }) => {
    if (!isOpen) return null;

    const { score, details, isNew } = breakdown;

    // Determine status text/color
    let statusKey = 'poor';
    let color = 'text-rose-500';
    let bgGradient = 'from-rose-500 to-rose-600';

    if (score >= 80) { statusKey = 'excellent'; color = 'text-emerald-500'; bgGradient = 'from-emerald-500 to-emerald-600'; }
    else if (score >= 60) { statusKey = 'good'; color = 'text-gold-500'; bgGradient = 'from-gold-500 to-gold-600'; }
    else if (score >= 40) { statusKey = 'fair'; color = 'text-amber-500'; bgGradient = 'from-amber-500 to-amber-600'; }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
                    <div>
                        <h2 className="text-xl font-bold font-serif text-white">{t('dashboard.scoreDetail.title')}</h2>
                        <p className="text-sm text-neutral-400 mt-1">{t('dashboard.scoreDetail.description')}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${bgGradient} flex items-center justify-center shadow-lg`}>
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Main Score Display */}
                    <div className="text-center py-4">
                        <div className="text-6xl font-black font-serif text-white tracking-tighter mb-2">
                            {isNew ? '—' : score}
                        </div>
                        <div className={`text-lg font-medium tracking-wide uppercase ${color}`}>
                            {isNew ? t('dashboard.scoreDetail.pending') : t(`dashboard.scoreDetail.${statusKey}`)}
                        </div>
                        {isNew && <p className="text-xs text-neutral-500 mt-2">{t('dashboard.scoreDetail.pendingDesc')}</p>}
                    </div>

                    {/* Pending Data State */}
                    {isNew ? (
                        <div className="bg-neutral-800/50 rounded-xl p-4 text-center border border-neutral-700/50 border-dashed">
                            <Activity className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                            <p className="text-sm text-neutral-400">
                                {t('dashboard.scoreDetail.pendingDesc')}
                            </p>
                        </div>
                    ) : (
                        /* Metrics Grid */
                        <div className="grid grid-cols-2 gap-4">
                            {/* Liquidity */}
                            <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/30">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <Wallet className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <span className="text-xs font-mono text-neutral-500">{details.liquidity}/30</span>
                                </div>
                                <div className="text-2xl font-bold text-white mb-0.5">{details.monthsRunway}mo</div>
                                <div className="text-xs text-neutral-400">{t('dashboard.scoreDetail.liquidity')}</div>
                                <p className="text-[10px] text-neutral-500 mt-1">{t('dashboard.scoreDetail.liquidityDesc')}</p>
                            </div>

                            {/* Savings Rate */}
                            <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/30">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="text-xs font-mono text-neutral-500">{details.savings}/40</span>
                                </div>
                                <div className="text-2xl font-bold text-white mb-0.5">{details.savingsRatePct}%</div>
                                <div className="text-xs text-neutral-400">{t('dashboard.scoreDetail.savings')}</div>
                                <p className="text-[10px] text-neutral-500 mt-1">{t('dashboard.scoreDetail.savingsDesc')}</p>
                            </div>

                            {/* Debt Ratio */}
                            <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/30">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="p-2 bg-rose-500/10 rounded-lg">
                                        <PieChart className="w-4 h-4 text-rose-400" />
                                    </div>
                                    <span className="text-xs font-mono text-neutral-500">{details.debt}/20</span>
                                </div>
                                <div className="text-2xl font-bold text-white mb-0.5">{details.debtRatioPct}%</div>
                                <div className="text-xs text-neutral-400">{t('dashboard.scoreDetail.debt')}</div>
                                <p className="text-[10px] text-neutral-500 mt-1">{t('dashboard.scoreDetail.debtDesc')}</p>
                            </div>

                            {/* Diversity */}
                            <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/30">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="p-2 bg-purple-500/10 rounded-lg">
                                        <Activity className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <span className="text-xs font-mono text-neutral-500">{details.diversity}/10</span>
                                </div>
                                <div className="text-2xl font-bold text-white mb-0.5">{details.classCount}</div>
                                <div className="text-xs text-neutral-400">{t('dashboard.scoreDetail.diversity')}</div>
                                <p className="text-[10px] text-neutral-500 mt-1">{t('dashboard.scoreDetail.diversityDesc')}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-neutral-800 bg-neutral-950/50">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors"
                    >
                        {t('common.back')}
                    </button>
                </div>
            </div>
        </div>
    );
};
