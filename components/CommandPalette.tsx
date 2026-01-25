
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, ArrowRight, CreditCard, Wallet, PieChart,
  Briefcase, Settings, Plus, ScanLine, ArrowUpRight,
  Home, History, Command, X, ChevronRight, Hash, TrendingUp
} from 'lucide-react';
import { Account, Transaction, NavTab } from '../types';
import { CURRENCIES } from '../constants';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  onAction: (action: string, payload?: any) => void; // action: 'new_tx' | 'scan' | 'transfer'
  accounts: Account[];
  transactions: Transaction[];
}

type PaletteItem = {
  id: string;
  type: 'nav' | 'action' | 'account' | 'transaction';
  label: string;
  subLabel?: string;
  icon: any;
  action: () => void;
  color?: string;
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onAction,
  accounts,
  transactions
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // --- GENERATE ITEMS ---
  const allItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];

    // 1. Navigation
    items.push(
      { id: 'nav-home', type: 'nav', label: 'Dashboard', icon: Home, action: () => onNavigate('home') },
      { id: 'nav-tx', type: 'nav', label: 'Transactions', icon: History, action: () => onNavigate('transactions') },
      { id: 'nav-acc', type: 'nav', label: 'Accounts & Assets', icon: Wallet, action: () => onNavigate('accounts') },
      { id: 'nav-bud', type: 'nav', label: 'Budget & Goals', icon: PieChart, action: () => onNavigate('budget') },
      { id: 'nav-biz', type: 'nav', label: 'Business Hub', icon: Briefcase, action: () => onNavigate('business') },
      { id: 'nav-inv', type: 'nav', label: 'Investments', icon: TrendingUp, action: () => onNavigate('investments') },
      { id: 'nav-set', type: 'nav', label: 'Settings', icon: Settings, action: () => onNavigate('settings') },
    );

    // 2. Actions
    items.push(
      { id: 'act-new', type: 'action', label: 'New Transaction', subLabel: 'Record expense or income', icon: Plus, action: () => onAction('new_tx'), color: 'text-gold-500' },
      { id: 'act-scan', type: 'action', label: 'Scan Receipt', subLabel: 'AI extraction', icon: ScanLine, action: () => onAction('scan'), color: 'text-blue-400' },
      { id: 'act-trans', type: 'action', label: 'Transfer Funds', subLabel: 'Move money between accounts', icon: ArrowUpRight, action: () => onAction('transfer'), color: 'text-green-400' },
    );

    // 3. Accounts
    accounts.forEach(acc => {
      items.push({
        id: `acc-${acc.id}`,
        type: 'account',
        label: acc.name,
        subLabel: `${acc.institution} • ${acc.currency} ${acc.balance.toLocaleString()}`,
        icon: acc.type === 'crypto' ? Hash : CreditCard,
        action: () => { onNavigate('accounts'); /* In real app, focus specific account */ },
      });
    });

    // 4. Recent Transactions (Top 5)
    transactions.slice(0, 5).forEach(tx => {
      items.push({
        id: `tx-${tx.id}`,
        type: 'transaction',
        label: tx.name,
        subLabel: `${tx.date} • ${tx.amount}`,
        icon: History,
        action: () => { onNavigate('transactions'); /* In real app, open edit modal */ }
      });
    });

    return items;
  }, [accounts, transactions, onNavigate, onAction]);

  // --- FILTERING ---
  const filteredItems = useMemo(() => {
    if (!query) return allItems;
    const lowerQuery = query.toLowerCase();
    return allItems.filter(item =>
      item.label.toLowerCase().includes(lowerQuery) ||
      (item.subLabel && item.subLabel.toLowerCase().includes(lowerQuery))
    );
  }, [query, allItems]);

  // --- KEYBOARD HANDLING ---
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      // Focus input after render
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen, query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
        // Scroll into view logic could go here
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filteredItems[selectedIndex];
        if (item) {
          item.action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Palette Container */}
      <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[60vh]">

        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-platinum-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <Search size={20} className="text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-lg text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 outline-none"
            autoComplete="off"
          />
          <button onClick={onClose} className="p-1 bg-platinum-100 dark:bg-neutral-800 rounded text-[10px] text-neutral-500 dark:text-neutral-400 font-bold border border-platinum-200 dark:border-neutral-700">ESC</button>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              <p className="text-sm">No results found.</p>
            </div>
          ) : (
            <>
              {/* Group by Type roughly for display, but list is flat for navigation */}
              {filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => { item.action(); onClose(); }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${isSelected
                        ? 'bg-gold-500 text-neutral-950 shadow-lg'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                  >
                    <div className={`p-2 rounded-lg flex items-center justify-center transition-colors ${isSelected
                        ? 'bg-neutral-950/20 text-neutral-900'
                        : 'bg-platinum-100 dark:bg-neutral-800 border border-platinum-200 dark:border-neutral-700 ' + (item.color || 'text-neutral-400')
                      }`}>
                      <item.icon size={18} />
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${isSelected ? 'text-neutral-950' : 'text-neutral-900 dark:text-white'}`}>
                          {item.label}
                        </span>
                        {item.type === 'nav' && isSelected && (
                          <span className="text-[10px] font-mono opacity-60">Go to</span>
                        )}
                        {item.type === 'action' && isSelected && (
                          <span className="text-[10px] font-mono opacity-60">Run</span>
                        )}
                      </div>
                      {item.subLabel && (
                        <p className={`text-xs truncate ${isSelected ? 'text-neutral-800' : 'text-neutral-500 dark:text-neutral-600'}`}>
                          {item.subLabel}
                        </p>
                      )}
                    </div>

                    {isSelected && <ArrowRight size={16} className="opacity-60" />}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-platinum-200 dark:border-neutral-800 bg-platinum-50 dark:bg-neutral-950/50 flex justify-between items-center text-[10px] text-neutral-500 px-4">
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><span className="bg-white dark:bg-neutral-800 border border-platinum-200 dark:border-transparent px-1 rounded shadow-sm">↑</span> <span className="bg-white dark:bg-neutral-800 border border-platinum-200 dark:border-transparent px-1 rounded shadow-sm">↓</span> to navigate</span>
            <span className="flex items-center gap-1"><span className="bg-white dark:bg-neutral-800 border border-platinum-200 dark:border-transparent px-1 rounded shadow-sm">↵</span> to select</span>
          </div>
          <span className="font-mono text-neutral-400">OMNI-COMMAND</span>
        </div>

      </div>
    </div>
  );
};
