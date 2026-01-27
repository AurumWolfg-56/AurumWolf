import React, { memo } from 'react';
import { Edit2, Plus, Trophy } from 'lucide-react';
import { SavingsGoal } from '../../types';
import { formatCurrency } from '../../lib/money';
import { getIconComponent } from '../../lib/iconMapper';

export interface GoalCardProps {
    goal: SavingsGoal;
    isEditing: boolean;
    onEditClick: (goal: SavingsGoal) => void;
    onDepositClick: (goal: SavingsGoal) => void;
    privacyMode: boolean;
    currencyCode: string;
    t: (key: string) => string;
}

export const GoalCard: React.FC<GoalCardProps> = memo(({
    goal, isEditing, onEditClick, onDepositClick, privacyMode, currencyCode, t
}) => {
    // Safe Icon Resolution
    let Icon = Trophy;
    if (typeof goal.icon === 'string') {
        Icon = getIconComponent(goal.icon);
    } else if (typeof goal.icon === 'function' || typeof goal.icon === 'object') {
        Icon = goal.icon;
    }

    const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div
            onClick={() => isEditing && onEditClick(goal)}
            className={`bg-white dark:bg-neutral-900 border rounded-2xl p-6 flex items-center gap-6 relative overflow-hidden group transition-all shadow-sm dark:shadow-none ${isEditing
                ? 'border-gold-500/50 cursor-pointer bg-platinum-50 dark:bg-neutral-900/80 hover:bg-white dark:hover:bg-neutral-800'
                : 'border-platinum-200 dark:border-neutral-800 hover:border-gold-500/30'
                }`}
        >
            {/* Circular Progress */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r={radius} className="stroke-platinum-200 dark:stroke-neutral-800" strokeWidth="6" fill="none" />
                    <circle
                        cx="40" cy="40" r={radius}
                        stroke={goal.color.replace('bg-', 'text-').replace('500', '400')}
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-1000 ease-out"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">{Math.round(progress)}%</span>
                </div>
            </div>

            <div className="flex-1 z-10">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className="font-bold text-neutral-900 dark:text-white text-sm">{goal.name}</h4>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{goal.deadline ? `${t('budget.due')} ${goal.deadline}` : t('budget.noDeadline')}</p>
                    </div>
                    {isEditing ? (
                        <div className={`p-2 rounded-lg bg-platinum-100 dark:bg-neutral-950 ${goal.color.replace('bg-', 'text-')} bg-opacity-10`}>
                            <Icon size={16} />
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDepositClick(goal); }}
                            className="p-2 rounded-lg bg-gold-500 text-neutral-950 hover:bg-gold-400 transition-colors shadow-lg"
                            title={t('budget.addFunds')}
                        >
                            <Plus size={16} />
                        </button>
                    )}
                </div>

                <div>
                    <p className="text-lg font-mono font-bold text-neutral-900 dark:text-white">{formatCurrency(goal.savedAmount, currencyCode, { privacy: privacyMode })}</p>
                    <p className="text-[10px] text-neutral-500">{t('budget.ofGoal')} {formatCurrency(goal.targetAmount, currencyCode, { privacy: privacyMode })}</p>
                </div>
            </div>

            {isEditing && (
                <div className="absolute inset-0 bg-white/80 dark:bg-neutral-950/60 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full p-2 text-gold-500">
                        <Edit2 size={20} />
                    </div>
                </div>
            )}
        </div>
    );
});
