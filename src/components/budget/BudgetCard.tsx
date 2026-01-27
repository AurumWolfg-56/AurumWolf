import React, { memo } from 'react';
import { Edit2, AlertTriangle } from 'lucide-react';
import { BudgetCategory } from '../../types';
import { formatCurrency } from '../../lib/money';
import { getIconComponent } from '../../lib/iconMapper';

export interface BudgetCardProps {
    item: BudgetCategory;
    spent: number;
    isEditing: boolean;
    onEditClick: (item: BudgetCategory) => void;
    onClick?: (item: BudgetCategory) => void;
    privacyMode: boolean;
    currencyCode: string;
    t: (key: string) => string;
}

export const BudgetCard: React.FC<BudgetCardProps> = memo(({
    item, spent, isEditing, onEditClick, onClick, privacyMode, currencyCode, t
}) => {
    const isIncome = item.type === 'income';
    const Icon = getIconComponent(item.icon_key);

    // --- PACING LOGIC ---
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const monthProgress = currentDay / daysInMonth;

    const isOverLimit = !isIncome && spent > item.limit;
    const isTargetMet = isIncome && spent >= item.limit;

    // --- METRIC CALCULATIONS ---
    const remaining = Math.max(0, item.limit - spent);
    const percentage = item.limit > 0 ? (spent / item.limit) * 100 : 0;
    const percentageRounded = Math.round(percentage);

    // Bar Scaling
    const maxValue = Math.max(item.limit, spent, 1);
    const limitPercent = (item.limit / maxValue) * 100;
    const spentPercent = Math.max(0, (spent / maxValue) * 100);
    const pacingMarkerPercent = ((item.limit * monthProgress) / maxValue) * 100;

    // --- STATUS TEXT & COLOR RESOLUTION ---
    let statusLabel = '';
    let statusColor = '';
    let progressBarColor = '';

    if (isIncome) {
        if (isTargetMet) {
            statusLabel = t('budget.targetMet');
            statusColor = 'text-emerald-500';
            progressBarColor = 'bg-emerald-500';
        } else {
            statusLabel = t('budget.underBudget');
            statusColor = 'text-neutral-500';
            progressBarColor = item.color;
        }
    } else {
        if (isOverLimit) {
            statusLabel = `${t('budget.overBudget')} (${percentageRounded}%)`;
            statusColor = 'text-red-500';
            progressBarColor = 'bg-red-500';
        } else {
            statusLabel = t('budget.withinBudget');
            statusColor = 'text-emerald-500';
            progressBarColor = item.color;
        }
    }

    return (
        <div
            onClick={() => {
                if (isEditing) {
                    onEditClick(item);
                } else if (onClick) {
                    onClick(item);
                }
            }}
            className={`bg-white dark:bg-neutral-900 border rounded-2xl p-5 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[190px] shadow-sm dark:shadow-none ${isEditing
                ? 'border-gold-500/50 bg-platinum-100 dark:bg-neutral-900/80 cursor-pointer hover:bg-white dark:hover:bg-neutral-800'
                : 'border-platinum-200 dark:border-neutral-800 hover:border-platinum-300 dark:hover:border-neutral-700 cursor-pointer hover:shadow-md'
                } ${isOverLimit && !isEditing ? 'bg-red-50 dark:bg-neutral-900 border-red-200 dark:border-neutral-800' : ''}`}
        >
            {isOverLimit && !isEditing && (
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <AlertTriangle size={100} className="text-red-500" />
                </div>
            )}

            {/* Top Section: Icon & Category & STATUS */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-lg shrink-0 text-white ${isOverLimit ? 'bg-red-500 shadow-red-900/20' :
                        isTargetMet ? 'bg-emerald-500 shadow-emerald-900/20' :
                            (item.color || 'bg-neutral-800')
                        }`}>
                        <Icon size={24} />
                    </div>
                    <div className="overflow-hidden flex-1 min-w-0">
                        <h4 className="font-bold text-neutral-900 dark:text-white text-base truncate">{item.category}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isOverLimit ? 'bg-red-500' : isIncome && !isTargetMet ? 'bg-neutral-400' : 'bg-emerald-500'}`}></div>
                            <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${statusColor}`}>
                                {statusLabel}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle Section: Big Numbers (Used vs Limit) */}
            <div className="relative z-10 mb-4">
                <div className="flex items-baseline justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-neutral-500 font-bold">{isIncome ? t('budget.received') : t('budget.used')}</span>
                        <span className={`text-2xl font-display font-bold ${isOverLimit ? 'text-red-500' : 'text-neutral-900 dark:text-white'}`}>
                            {formatCurrency(spent, currencyCode, { privacy: privacyMode })}
                        </span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase text-neutral-500 font-bold">{t('accounts.limit')}</span>
                        <span className="text-lg font-mono text-neutral-400 dark:text-neutral-600">
                            {formatCurrency(item.limit, currencyCode, { privacy: privacyMode })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Progress Bar & Detailed Metrics */}
            <div className="space-y-2 relative z-10 mt-auto">

                {/* Track */}
                <div className="h-4 w-full bg-platinum-200 dark:bg-neutral-950 rounded-full overflow-hidden relative border border-platinum-300 dark:border-neutral-800/50">
                    {/* Pacing Marker (Projected 'Today' line) */}
                    {!isIncome && (
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-neutral-900/30 dark:bg-white/30 z-20"
                            style={{ left: `${pacingMarkerPercent}%` }}
                            title={t('budget.pacingToday')}
                        ></div>
                    )}
                    {/* Limit Marker (Background Fill for Limit) */}
                    <div
                        className={`absolute top-0 bottom-0 left-0 bg-platinum-300 dark:bg-neutral-800/50 z-0 border-r border-dashed border-neutral-400 dark:border-neutral-600`}
                        style={{ width: `${limitPercent}%` }}
                    ></div>

                    {/* Actual Spend Bar */}
                    <div
                        className={`h-full rounded-full transition-all duration-700 relative z-10 ${progressBarColor}`}
                        style={{ width: `${spentPercent}%` }}
                    ></div>
                </div>

                {/* Footer Metrics: Remaining & Percentage */}
                <div className="flex justify-between items-center text-[11px] font-medium">
                    <div className="flex items-center gap-1">
                        <span className="text-neutral-500">{t('budget.remaining')}:</span>
                        <span className={`font-bold ${remaining < 0 ? 'text-red-500' : 'text-neutral-900 dark:text-white'}`}>
                            {formatCurrency(isIncome ? Math.max(0, item.limit - spent) : remaining, currencyCode, { privacy: privacyMode })}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-neutral-500">{t('budget.percentage')}:</span>
                        <span className={`font-bold ${isOverLimit ? 'text-red-500' : 'text-neutral-900 dark:text-white'}`}>
                            {percentageRounded}%
                        </span>
                    </div>
                </div>

            </div>

            {isEditing && (
                <div className="absolute inset-0 bg-white/80 dark:bg-neutral-950/60 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full p-2 text-gold-500">
                        <Edit2 size={24} />
                    </div>
                </div>
            )}
        </div>
    );
});
