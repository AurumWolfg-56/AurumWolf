
import React, { useState, useMemo, useEffect } from 'react';
import {
    ArrowUpRight, ArrowDownRight, Filter,
    Calendar as CalendarIcon, Edit2, Globe,
    LayoutList, ChevronLeft, ChevronRight, X, Plus, ScanLine, Search, Download, SlidersHorizontal,
    Repeat, Briefcase, Trash2, StopCircle
} from 'lucide-react';
import { Transaction, Account } from '../types';
import { CURRENCIES, CATEGORIES, BUSINESS_ENTITIES } from '../constants';
import { useTransactions } from '../contexts/TransactionsContext';
import { useAccounts } from '../contexts/AccountsContext';
import { getLocalDateISO } from '../lib/dates';
import { TransactionFilterDrawer, RecurringTransactionCard, TransactionListItem } from './transactions';

interface TransactionsPageProps {
    onEditTransaction?: (tx: Transaction) => void;
    onNewTransaction?: () => void;
    onDeleteTransaction?: (id: string) => void;
    onScan?: () => void;
    onStopRecurring?: (id: string) => void;
    initialAccountId?: string | null;
    t: (key: string) => string;
}

type ViewMode = 'list' | 'calendar';

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
    onEditTransaction,
    onNewTransaction,
    onDeleteTransaction,
    onScan,
    onStopRecurring,
    initialAccountId,
    t
}) => {
    const { transactions } = useTransactions();
    const { accounts } = useAccounts();

    const [viewMode, setViewMode] = useState<ViewMode>('list');

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // --- ADVANCED FILTER STATE ---
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [localSearch, setLocalSearch] = useState('');

    // Filter Criteria
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });
    const [amountRange, setAmountRange] = useState<{ min: string, max: string }>({ min: '', max: '' });
    const [txType, setTxType] = useState<'all' | 'income' | 'expense' | 'recurring'>('all');

    // Initialize filter from prop if provided
    useEffect(() => {
        if (initialAccountId) {
            setSelectedAccountIds([initialAccountId]);
        }
    }, [initialAccountId]);

    // --- DERIVED DATA ---
    const uniqueAccountIds = useMemo<{ id: string; name: string }[]>(() => {
        if (accounts.length > 0) return accounts.map(a => ({ id: a.id, name: a.name }));
        const ids = Array.from(new Set(transactions.map(t => t.accountId)));
        return ids.map(id => ({ id, name: `Account ${id}` }));
    }, [accounts, transactions]);

    const uniqueCategories = useMemo<string[]>(() => {
        const txCats = new Set(transactions.map(t => t.category));
        CATEGORIES.forEach(c => txCats.add(c.name));
        return Array.from(txCats).sort();
    }, [transactions]);

    // --- FILTER LOGIC ---
    const filteredData = useMemo(() => {
        return transactions.filter(t => {
            if (localSearch) {
                const q = localSearch.toLowerCase();
                const match = t.name.toLowerCase().includes(q) ||
                    t.category.toLowerCase().includes(q) ||
                    (t.description || '').toLowerCase().includes(q);
                if (!match) return false;
            }

            if (txType === 'income' && t.type !== 'credit') return false;
            if (txType === 'expense' && t.type !== 'debit') return false;
            if (txType === 'recurring' && !t.isRecurring) return false;

            if (selectedAccountIds.length > 0 && !selectedAccountIds.includes(t.accountId)) return false;
            if (selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return false;
            if (dateRange.start && t.date < dateRange.start) return false;
            if (dateRange.end && t.date > dateRange.end) return false;

            const val = Math.abs(t.numericAmount);
            if (amountRange.min && val < parseFloat(amountRange.min)) return false;
            if (amountRange.max && val > parseFloat(amountRange.max)) return false;

            return true;
        });
    }, [transactions, localSearch, txType, selectedAccountIds, selectedCategories, dateRange, amountRange]);

    const groupedTransactions = useMemo(() => {
        const sorted = [...filteredData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return sorted.reduce((acc, t) => {

            const today = getLocalDateISO();
            const key = t.date === today ? 'Today' : new Date(t.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

            if (!acc[key]) acc[key] = [];
            acc[key].push(t);
            return acc;
        }, {} as Record<string, Transaction[]>);
    }, [filteredData]);

    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayTxs = filteredData.filter(t => t.date === dateStr);

            const income = dayTxs.filter(t => t.type === 'credit').reduce((acc, t) => acc + t.numericAmount, 0);
            const expense = dayTxs.filter(t => t.type === 'debit').reduce((acc, t) => acc + t.numericAmount, 0);
            const net = income - expense;

            days.push({
                day: i,
                dateStr,
                transactions: dayTxs,
                income,
                expense,
                net
            });
        }
        return days;
    }, [currentDate, filteredData]);

    // --- HANDLERS ---
    const handleExport = () => {
        const headers = ['Date', 'Merchant', 'Category', 'Amount', 'Type', 'Account', 'Notes', 'Recurring'];
        const rows = filteredData.map(t => [
            t.date,
            `"${t.name.replace(/"/g, '""')}"`,
            t.category,
            t.amount,
            t.type,
            t.accountId,
            `"${(t.description || '').replace(/"/g, '""')}"`,
            t.isRecurring ? 'Yes' : 'No'
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `AurumWolf_Export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const clearFilters = () => {
        setSelectedAccountIds([]);
        setSelectedCategories([]);
        setDateRange({ start: '', end: '' });
        setAmountRange({ min: '', max: '' });
        setTxType('all');
        setLocalSearch('');
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm(t('common.confirmDelete'))) {
            onDeleteTransaction?.(id);
        }
    };

    const activeFilterCount =
        (selectedAccountIds.length > 0 ? 1 : 0) +
        (selectedCategories.length > 0 ? 1 : 0) +
        (dateRange.start ? 1 : 0) +
        (amountRange.min ? 1 : 0) +
        (txType !== 'all' ? 1 : 0);

    const formatForeignAmount = (amount?: number, currencyCode?: string) => {
        if (!amount || !currencyCode) return null;
        const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
        return new Intl.NumberFormat(currency.locale, {
            style: 'currency',
            currency: currencyCode,
        }).format(amount);
    };

    const getBusinessName = (id?: string) => {
        if (!id) return null;
        const ent = BUSINESS_ENTITIES.find(e => e.id === id);
        return ent ? ent.name : id;
    };

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

    const handleStopSubscription = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm(t('transactions.stopConfirm'))) {
            onStopRecurring?.(id);
        }
    };

    return (
        <div className="animate-fade-in space-y-6 relative">

            {/* --- DESKTOP HEADER & CONTROLS --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-2 rounded-2xl shadow-sm dark:shadow-none sticky top-20 md:top-0 z-20">

                {/* Quick Type Toggles */}
                <div className="flex p-1 bg-platinum-100 dark:bg-neutral-950 rounded-xl overflow-x-auto custom-scrollbar">
                    {['all', 'income', 'expense', 'recurring'].map((typeKey) => (
                        <button
                            key={typeKey}
                            onClick={() => setTxType(typeKey as any)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize whitespace-nowrap ${txType === typeKey
                                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                                }`}
                        >
                            {t(`transactions.${typeKey}`)}
                        </button>
                    ))}
                </div>

                {/* Search & Tools */}
                <div className="flex items-center gap-3 px-2 w-full md:w-auto">

                    <div className="flex-1 md:flex-none flex items-center bg-platinum-100 dark:bg-neutral-950 px-3 py-2 rounded-lg border border-transparent focus-within:border-gold-500/50 transition-colors md:w-48">
                        <Search size={14} className="text-neutral-500 mr-2" />
                        <input
                            type="text"
                            placeholder={t('common.search')}
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs text-neutral-900 dark:text-white w-full placeholder:text-neutral-500"
                        />
                    </div>

                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className={`p-2 rounded-lg border transition-all flex items-center gap-2 ${activeFilterCount > 0
                            ? 'bg-gold-500/10 border-gold-500/50 text-gold-600 dark:text-gold-500'
                            : 'bg-platinum-100 dark:bg-neutral-950 border-platinum-200 dark:border-neutral-800 text-neutral-500'
                            }`}
                    >
                        <SlidersHorizontal size={16} />
                        {activeFilterCount > 0 && <span className="text-[10px] font-bold bg-gold-500 text-neutral-950 px-1.5 rounded-full">{activeFilterCount}</span>}
                    </button>

                    <button
                        onClick={handleExport}
                        className="p-2 rounded-lg bg-platinum-100 dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                        title={t('transactions.export')}
                    >
                        <Download size={16} />
                    </button>

                    <div className="h-6 w-px bg-platinum-200 dark:bg-neutral-800 hidden md:block"></div>

                    {/* View Toggle */}
                    <div className="hidden md:flex bg-platinum-100 dark:bg-neutral-950 rounded-lg p-1 border border-platinum-200 dark:border-neutral-800">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}
                        >
                            <LayoutList size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}
                        >
                            <CalendarIcon size={16} />
                        </button>
                    </div>

                    {/* Desktop Add Buttons */}
                    <div className="hidden md:flex gap-2">
                        <button
                            onClick={onScan}
                            className="px-4 py-2 bg-platinum-100 dark:bg-neutral-800 hover:bg-platinum-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white border border-platinum-200 dark:border-neutral-700 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
                        >
                            <ScanLine size={14} /> {t('common.scan')}
                        </button>
                        <button
                            onClick={onNewTransaction}
                            className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-neutral-950 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
                        >
                            <Plus size={14} /> {t('common.add')}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- RESULTS SUMMARY --- */}
            <div className="flex items-center justify-between px-2">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    {filteredData.length} {t('transactions.found')}
                </p>
                {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-gold-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1">
                        <X size={12} /> {t('transactions.clearFilters')}
                    </button>
                )}
            </div>

            {/* --- RECURRING MANAGER VIEW --- */}
            {txType === 'recurring' && viewMode === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredData.map(tx => (
                        <RecurringTransactionCard
                            key={tx.id}
                            transaction={tx}
                            onEdit={(tx) => onEditTransaction?.(tx)}
                            onStop={handleStopSubscription}
                            onDelete={handleDeleteClick}
                            t={t}
                        />
                    ))}
                </div>
            ) : viewMode === 'list' ? (
                <div className="space-y-4">
                    {Object.entries(groupedTransactions).map(([dateLabel, items]) => (
                        <div key={dateLabel} className="animate-fade-in">
                            <h3 className="sticky top-32 md:top-14 z-10 bg-platinum-100/95 dark:bg-neutral-950/95 backdrop-blur-md py-2 px-2 text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-platinum-200 dark:border-neutral-800/50">
                                <CalendarIcon size={12} /> {dateLabel}
                            </h3>
                            <div className="space-y-2">
                                {(items as Transaction[]).map(tx => {
                                    const isForeign = tx.accountCurrency && tx.currency !== tx.accountCurrency;
                                    const isAdjustment = tx.category === 'Adjustment' || tx.category === 'Starting Balance' || tx.name.includes('accounts.balanceAdjustment');
                                    const businessName = getBusinessName(tx.business_id);

                                    return (
                                        <div
                                            key={tx.id}
                                            onClick={() => onEditTransaction?.(tx)}
                                            className="glass-card p-4 rounded-2xl flex items-center justify-between hover:border-gold-500/30 cursor-pointer transition-all shadow-sm group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all relative ${isAdjustment ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500' :
                                                    tx.type === 'debit'
                                                        ? 'bg-platinum-50 dark:bg-neutral-950 border-platinum-200 dark:border-neutral-800 text-neutral-400'
                                                        : 'bg-green-500/10 border-green-500/20 text-green-500'
                                                    }`}>
                                                    {isAdjustment ? <SlidersHorizontal size={18} /> : tx.type === 'debit' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}

                                                    {/* Recurring Badge */}
                                                    {tx.isRecurring && (
                                                        <div className="absolute -bottom-1 -right-1 bg-gold-500 text-neutral-950 w-4 h-4 rounded-full flex items-center justify-center border border-neutral-900" title="Recurring">
                                                            <Repeat size={10} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-bold text-neutral-900 dark:text-white leading-tight mb-0.5 truncate group-hover:text-gold-500 transition-colors">
                                                        {tx.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide px-1.5 py-0.5 bg-platinum-100 dark:bg-neutral-800 rounded">
                                                            {tx.category}
                                                        </span>
                                                        {businessName && (
                                                            <span className="text-[10px] font-bold text-gold-600 dark:text-gold-500 uppercase tracking-wide px-1.5 py-0.5 bg-gold-500/10 border border-gold-500/20 rounded flex items-center gap-1">
                                                                <Briefcase size={8} /> {businessName}
                                                            </span>
                                                        )}
                                                        {isForeign && <Globe size={10} className="text-blue-500" />}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <p className={`text-base font-mono font-bold ${isAdjustment ? 'text-neutral-500 dark:text-neutral-500' :
                                                        tx.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-neutral-900 dark:text-white'
                                                        }`}>
                                                        {tx.amount}
                                                    </p>
                                                    {isForeign && tx.foreignAmount && (
                                                        <p className="text-[10px] text-neutral-400 font-mono">
                                                            {formatForeignAmount(tx.foreignAmount, tx.currency)}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onEditTransaction?.(tx); }}
                                                        className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteClick(e, tx.id)}
                                                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {filteredData.length === 0 && (
                        <div className="p-12 text-center text-neutral-500">
                            <Filter size={32} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm">{t('transactions.noMatches')}</p>
                            <button onClick={clearFilters} className="mt-4 text-gold-500 font-bold text-xs underline">{t('transactions.clearFilters')}</button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="animate-fade-in space-y-6">
                    {/* Calendar Controls */}
                    <div className="flex items-center justify-between bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
                        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-platinum-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display uppercase tracking-widest">
                            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-platinum-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-px bg-platinum-200 dark:bg-neutral-800/50 rounded-2xl overflow-hidden border border-platinum-200 dark:border-neutral-800">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="bg-platinum-100 dark:bg-neutral-950 p-2 text-center text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                                {d}
                            </div>
                        ))}

                        {calendarData.map((d, i) => {
                            if (!d) return <div key={`empty-${i}`} className="bg-white dark:bg-neutral-900 h-24 sm:h-32"></div>;

                            const isToday = new Date().toDateString() === new Date(d.dateStr).toDateString();
                            const hasTransactions = d.transactions.length > 0;
                            const isSelected = selectedDate === d.dateStr;

                            return (
                                <div
                                    key={d.dateStr}
                                    onClick={() => hasTransactions && setSelectedDate(isSelected ? null : d.dateStr)}
                                    className={`bg-white dark:bg-neutral-900 p-2 h-24 sm:h-32 flex flex-col justify-between transition-colors relative cursor-pointer group ${isSelected ? 'bg-platinum-50 dark:bg-neutral-800 ring-inset ring-2 ring-gold-500' : 'hover:bg-platinum-50 dark:hover:bg-neutral-800'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-gold-500 text-neutral-950' : 'text-neutral-400'
                                            }`}>
                                            {d.day}
                                        </span>
                                        {hasTransactions && (
                                            <div className="flex gap-1">
                                                {d.transactions.some(t => t.type === 'credit') && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                                                {d.transactions.some(t => t.type === 'debit') && <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>}
                                                {d.transactions.some(t => t.isRecurring) && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                                            </div>
                                        )}
                                    </div>

                                    {hasTransactions && (
                                        <div className="text-right">
                                            {d.net > 0 ? (
                                                <p className="text-[10px] font-mono font-bold text-green-500">
                                                    +{Math.round(d.net).toLocaleString()}
                                                </p>
                                            ) : d.net < 0 ? (
                                                <p className="text-[10px] font-mono font-bold text-neutral-800 dark:text-white/80 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
                                                    {Math.round(d.net).toLocaleString()}
                                                </p>
                                            ) : null}
                                            <p className="text-[9px] text-neutral-600 mt-0.5">{d.transactions.length} {t('transactions.txns')}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {selectedDate && (
                        <div className="fixed inset-0 z-50 flex justify-end">
                            <div className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm" onClick={() => setSelectedDate(null)}></div>
                            <div className="relative w-full max-w-sm bg-white dark:bg-neutral-900 h-full shadow-2xl border-l border-platinum-200 dark:border-neutral-800 flex flex-col animate-fade-in-right">
                                <div className="p-5 border-b border-platinum-200 dark:border-neutral-800 flex justify-between items-center bg-platinum-50 dark:bg-neutral-950">
                                    <div>
                                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display">
                                            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                        </h3>
                                        <p className="text-xs text-neutral-500 uppercase tracking-wider">{t('transactions.dailySummary')}</p>
                                    </div>
                                    <button onClick={() => setSelectedDate(null)} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {filteredData.filter(tx => tx.date === selectedDate).map(tx => (
                                        <div
                                            key={tx.id}
                                            onClick={() => { onEditTransaction?.(tx); setSelectedDate(null); }}
                                            className="p-4 rounded-xl border border-platinum-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-gold-500/30 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${tx.type === 'debit' ? 'bg-platinum-50 dark:bg-neutral-950 border-platinum-200 dark:border-neutral-800 text-neutral-400' : 'bg-green-500/10 border-green-500/20 text-green-500'
                                                    }`}>
                                                    {tx.type === 'debit' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-gold-500 transition-colors">{tx.name}</p>
                                                    <p className="text-xs text-neutral-500">{tx.category}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`font-mono text-sm font-bold block ${tx.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-neutral-900 dark:text-white'}`}>
                                                    {tx.amount}
                                                </span>
                                                <div className="flex justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => handleDeleteClick(e, tx.id)}
                                                        className="text-neutral-500 hover:text-red-500"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- FILTER DRAWER --- */}
            <TransactionFilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                accounts={uniqueAccountIds}
                selectedAccountIds={selectedAccountIds}
                onAccountToggle={(id) => {
                    if (selectedAccountIds.includes(id)) {
                        setSelectedAccountIds(prev => prev.filter(x => x !== id));
                    } else {
                        setSelectedAccountIds(prev => [...prev, id]);
                    }
                }}
                categories={uniqueCategories}
                selectedCategories={selectedCategories}
                onCategoryToggle={(cat) => {
                    if (selectedCategories.includes(cat)) {
                        setSelectedCategories(prev => prev.filter(c => c !== cat));
                    } else {
                        setSelectedCategories(prev => [...prev, cat]);
                    }
                }}
                amountRange={amountRange}
                onAmountRangeChange={setAmountRange}
                onClear={clearFilters}
                t={t}
            />

        </div>
    );
};
