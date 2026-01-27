import React, { memo } from 'react';
import { CreditCard, Wallet, Bitcoin, Snowflake, Briefcase } from 'lucide-react';
import { Account } from '../../types';
import { formatCurrency } from '../../lib/money';

export interface CardVisualProps {
    account: Account;
    showBalances: boolean;
    onClick: () => void;
    variant?: 'small' | 'large';
    t: (key: string) => string;
    linkedBusinessName?: string;
}

export const CardVisual: React.FC<CardVisualProps> = memo(({
    account, showBalances, onClick, variant = 'small', t, linkedBusinessName
}) => {
    const Icon = account.type === 'crypto' ? Bitcoin
        : account.type === 'business' ? Briefcase
            : account.type === 'credit' ? CreditCard
                : Wallet;

    const isCredit = account.type === 'credit';
    const debt = Math.abs(account.balance);
    const limit = account.creditDetails?.limit || 0;
    const available = limit - debt;
    const utilization = limit > 0 ? (debt / limit) * 100 : 0;

    return (
        <div
            onClick={onClick}
            className={`relative w-full ${variant === 'large' ? 'aspect-[2/1] md:aspect-[2.5/1]' : 'aspect-[1.586]'} rounded-2xl p-6 flex flex-col justify-between overflow-hidden shadow-2xl transition-all hover:scale-[1.01] cursor-pointer group ${account.color} border border-white/5`}
        >
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent"></div>

            {account.isFrozen && (
                <div className="absolute inset-0 bg-neutral-950/60 backdrop-blur-[2px] z-20 flex items-center justify-center border-4 border-blue-500/30">
                    <div className="bg-neutral-900/80 p-3 rounded-full text-blue-400 border border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                        <Snowflake size={32} />
                    </div>
                </div>
            )}

            <div className="relative z-10 flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 backdrop-blur-md p-2 rounded-lg border border-white/10">
                        <Icon size={20} className="text-white" />
                    </div>
                    {isCredit && (
                        <div className="flex flex-col">
                            <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{t('common.available')}</span>
                            <span className="text-white font-mono text-xs font-bold">
                                {showBalances ? formatCurrency(available, account.currency) : '••••'}
                            </span>
                        </div>
                    )}
                    {account.type === 'business' && (
                        <span className="bg-gold-500/20 text-gold-200 text-[10px] font-bold px-2 py-1 rounded border border-gold-500/30 uppercase tracking-wider">
                            {t('nav.business')}
                        </span>
                    )}

                    {linkedBusinessName && (
                        <span className="bg-blue-500/20 text-blue-200 text-[10px] font-bold px-2 py-1 rounded border border-blue-500/30 uppercase tracking-wider flex items-center gap-1">
                            {linkedBusinessName}
                        </span>
                    )}
                </div>
                <span className="text-white/60 font-mono text-xs tracking-widest uppercase">{account.institution}</span>
            </div>

            <div className="relative z-10">
                <div className="text-white/80 text-xs uppercase tracking-wider mb-1 font-semibold flex items-center gap-2">
                    {account.name}
                    {isCredit && account.creditDetails && <span className="opacity-50"> • {t('accounts.dueDay')} {account.creditDetails.paymentDueDay}</span>}
                    {account.type === 'business' && account.businessDetails?.entityType && <span className="opacity-50"> • {account.businessDetails.entityType}</span>}
                </div>
                <div className={`${variant === 'large' ? 'text-4xl' : 'text-2xl md:text-3xl'} font-mono font-bold text-white tracking-tight`}>
                    {showBalances
                        ? (isCredit && account.balance > 0 ? '-' : '') + formatCurrency(Math.abs(account.balance), account.currency)
                        : '••••••••'}
                </div>

                {isCredit && limit > 0 && (
                    <div className="mt-3 w-full bg-black/20 h-1.5 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${utilization > 80 ? 'bg-red-400' : utilization > 50 ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                            style={{ width: `${utilization}%` }}
                        ></div>
                    </div>
                )}
            </div>

            <div className="relative z-10 flex justify-between items-end">
                <div className="flex gap-2">
                    <span className="text-white/40 text-[10px]">{account.currency} {t('common.account').toUpperCase()}</span>
                    {isCredit && limit > 0 && (
                        <span className={`text-[10px] font-bold ${utilization > 30 ? 'text-yellow-200' : 'text-white/60'}`}>
                            {utilization.toFixed(0)}% {t('accounts.util')}
                        </span>
                    )}
                </div>
                <div className="font-mono text-white/80 text-sm tracking-widest">
                    •••• {account.last4 || '0000'}
                </div>
            </div>
        </div >
    );
});
