import React from 'react';
import { ArrowUpRight, ArrowDownRight, SlidersHorizontal, Edit2, Globe, Briefcase, Repeat, Trash2 } from 'lucide-react';
import { Transaction } from '../../types';

interface TransactionListItemProps {
    transaction: Transaction;
    onClick: (tx: Transaction) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    formatForeignAmount?: (amount?: number, currencyCode?: string) => string | null;
    getBusinessName?: (id?: string) => string | null;
}

export const TransactionListItem: React.FC<TransactionListItemProps> = ({
    transaction: tx,
    onClick,
    onDelete,
    formatForeignAmount,
    getBusinessName
}) => {
    const isForeign = tx.accountCurrency && tx.currency !== tx.accountCurrency;
    const isAdjustment = tx.category === 'Adjustment' || tx.category === 'Starting Balance' || tx.name.includes('accounts.balanceAdjustment');
    const businessName = getBusinessName?.(tx.business_id);

    return (
        <div
            onClick={() => onClick(tx)}
            className="glass-card p-4 rounded-2xl flex items-center justify-between hover:border-gold-500/30 cursor-pointer transition-all shadow-sm group"
        >
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all relative ${isAdjustment ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500' :
                    tx.type === 'debit'
                        ? 'bg-platinum-50 dark:bg-neutral-950 border-platinum-200 dark:border-neutral-800 text-neutral-400'
                        : 'bg-green-500/10 border-green-500/20 text-green-500'
                    }`}>
                    {isAdjustment ? <SlidersHorizontal size={18} /> : tx.type === 'debit' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    {tx.isRecurring && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white dark:border-neutral-900">
                            <Repeat size={8} className="text-white" />
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-gold-500 transition-colors flex items-center gap-2">
                        {tx.name}
                        {tx.status === 'pending' && (
                            <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded">Pending</span>
                        )}
                    </p>
                    <p className="text-xs text-neutral-500 flex items-center gap-2">
                        <span>{tx.category}</span>
                        {businessName && (
                            <>
                                <span className="opacity-30">•</span>
                                <span className="flex items-center gap-1">
                                    <Briefcase size={10} className="opacity-50" />
                                    {businessName}
                                </span>
                            </>
                        )}
                    </p>
                </div>
            </div>
            <div className="text-right flex items-center gap-3">
                <div>
                    <span className={`font-mono text-sm font-bold block ${isAdjustment ? 'text-neutral-500' : tx.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-neutral-900 dark:text-white'}`}>
                        {tx.amount}
                    </span>
                    {isForeign && formatForeignAmount && (
                        <span className="text-[10px] text-neutral-500 flex items-center justify-end gap-1">
                            <Globe size={10} /> {formatForeignAmount(tx.foreignAmount, tx.currency)}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onClick(tx); }} className="p-1.5 rounded-lg text-neutral-400 hover:text-gold-500 hover:bg-gold-500/10 transition-colors">
                        <Edit2 size={14} />
                    </button>
                    <button onClick={(e) => onDelete(e, tx.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
