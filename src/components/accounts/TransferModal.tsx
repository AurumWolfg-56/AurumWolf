import React from 'react';
import { X, Send, ChevronLeft, ArrowDown } from 'lucide-react';
import { Account } from '../../types';
import { CURRENCIES } from '../../constants';

export interface TransferModalProps {
    accounts: Account[];
    transferFrom: string;
    transferTo: string;
    transferAmount: string;
    transferDate: string;
    onFromChange: (value: string) => void;
    onToChange: (value: string) => void;
    onAmountChange: (value: string) => void;
    onDateChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
    t: (key: string) => string;
}

export const TransferModal: React.FC<TransferModalProps> = ({
    accounts,
    transferFrom,
    transferTo,
    transferAmount,
    transferDate,
    onFromChange,
    onToChange,
    onAmountChange,
    onDateChange,
    onSubmit,
    onClose,
    t
}) => {
    const sourceCurrency = accounts.find(a => a.id === transferFrom)?.currency || 'USD';

    return (
        <div className="fixed inset-0 z-[60] bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl animate-fade-in relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                    <X size={20} />
                </button>

                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-gold-500/10 rounded-lg text-gold-500"><Send size={20} /></div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{t('accounts.transferFunds')}</h3>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    {/* From Account */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">{t('common.from')}</label>
                        <div className="relative">
                            <select
                                value={transferFrom}
                                onChange={(e) => onFromChange(e.target.value)}
                                className="w-full bg-platinum-50 dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 appearance-none"
                            >
                                <option value="">{t('accounts.selectSource')}</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id} disabled={acc.isFrozen}>{acc.name} ({acc.currency}) {acc.isFrozen ? `(${t('accounts.frozen')})` : ''}</option>
                                ))}
                            </select>
                            <ChevronLeft size={16} className="absolute right-3 top-3.5 -rotate-90 text-neutral-500 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex justify-center -my-2 relative z-10">
                        <div className="bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-full p-1.5 text-gold-500">
                            <ArrowDown size={16} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">{t('common.to')}</label>
                        <div className="relative">
                            <select
                                value={transferTo}
                                onChange={(e) => onToChange(e.target.value)}
                                className="w-full bg-platinum-50 dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 appearance-none"
                            >
                                <option value="">{t('accounts.selectDest')}</option>
                                {accounts.filter(a => a.id !== transferFrom).map(acc => (
                                    <option key={acc.id} value={acc.id} disabled={acc.isFrozen}>{acc.name} ({acc.currency}) {acc.isFrozen ? `(${t('accounts.frozen')})` : ''}</option>
                                ))}
                            </select>
                            <ChevronLeft size={16} className="absolute right-3 top-3.5 -rotate-90 text-neutral-500 pointer-events-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">{t('common.amount')}</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={transferAmount}
                                    onChange={(e) => onAmountChange(e.target.value)}
                                    className="w-full bg-platinum-50 dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl p-3 pl-8 outline-none focus:border-gold-500"
                                    placeholder="0.00"
                                />
                                <span className="absolute left-3 top-3 text-neutral-500 text-xs font-bold">{CURRENCIES.find(c => c.code === sourceCurrency)?.symbol}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">{t('common.date')}</label>
                            <input
                                type="date"
                                value={transferDate}
                                onChange={(e) => onDateChange(e.target.value)}
                                className="w-full bg-platinum-50 dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 [&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:invert-0"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!transferFrom || !transferTo || !transferAmount}
                        className="w-full py-4 rounded-xl bg-gold-500 text-neutral-950 font-bold hover:bg-gold-400 transition-all shadow-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('common.transfer')}
                    </button>
                </form>
            </div>
        </div>
    );
};
