import React from 'react';
import { Repeat, StopCircle, Trash2 } from 'lucide-react';
import { Transaction } from '../../types';

interface RecurringTransactionCardProps {
    transaction: Transaction;
    onEdit: (tx: Transaction) => void;
    onStop: (e: React.MouseEvent, id: string) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    t: (key: string) => string;
}

export const RecurringTransactionCard: React.FC<RecurringTransactionCardProps> = ({
    transaction: tx,
    onEdit,
    onStop,
    onDelete,
    t
}) => {
    return (
        <div className="glass-card rounded-2xl p-5 relative group hover:border-gold-500/30 transition-all shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                        <Repeat size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-neutral-900 dark:text-white text-sm">{tx.name}</h4>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
                            {tx.recurringFrequency || t('transactions.unknown')} {t('transactions.cycle')}
                        </p>
                    </div>
                </div>
                <span className="font-mono font-bold text-neutral-900 dark:text-white text-lg">{tx.amount}</span>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">{t('transactions.nextDue')}:</span>
                    <span className="text-neutral-900 dark:text-white font-bold">{tx.nextRecurringDate}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">{t('common.category')}:</span>
                    <span className="text-neutral-700 dark:text-neutral-300">{tx.category}</span>
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => onEdit(tx)}
                    className="flex-1 py-2 rounded-lg bg-platinum-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-bold hover:bg-platinum-200 dark:hover:bg-neutral-700 transition-colors"
                >
                    {t('common.edit')}
                </button>
                <button
                    onClick={(e) => onStop(e, tx.id)}
                    className="flex-1 py-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1"
                >
                    <StopCircle size={12} /> {t('transactions.stopSubscription')}
                </button>
                <button
                    onClick={(e) => onDelete(e, tx.id)}
                    className="p-2 rounded-lg bg-platinum-100 dark:bg-neutral-800 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};
