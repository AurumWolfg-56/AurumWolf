
import React, { useState, useEffect } from 'react';
import { Navigation } from './Navigation';
import { NavTab, Transaction, Account, BudgetCategory, AppNotification, Investment } from '../types';
import { Menu, Search, Bell, X, ChevronLeft, Eye, EyeOff, Command } from 'lucide-react';
import { Logo } from './Logo';
import { ConciergeWidget } from './ConciergeWidget';
import { NotificationPanel } from './NotificationPanel';
import { CommandPalette } from './CommandPalette';

interface LayoutProps {
  children: React.ReactNode;
  searchQuery?: string;
  onSearch?: (query: string) => void;
  activeTab: NavTab;
  onTabChange: (tab: NavTab, payload?: any) => void;
  onNewTransaction: () => void;
  privacyMode: boolean;
  onTogglePrivacy: () => void;

  // Data for Concierge & Notifications
  transactions: Transaction[];
  accounts: Account[];
  budgets: BudgetCategory[];
  investments?: Investment[];
  notifications?: AppNotification[];
  onClearNotifications?: () => void;
  onAddTransactionData?: (tx: Transaction) => void;
  onAddBudget?: (budget: Omit<BudgetCategory, 'id' | 'spent'>) => void;

  // User
  userName?: string;
  userEmail?: string;

  // Translation
  t: (key: string) => string;
  onSignOut: () => void;
  language: string;
  isLoading?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  searchQuery = '',
  onSearch,
  activeTab,
  onTabChange,
  onNewTransaction,
  privacyMode,
  onTogglePrivacy,
  transactions,
  accounts,
  budgets,
  investments = [],
  notifications = [],
  onClearNotifications,
  onAddTransactionData,
  onAddBudget,
  userName = "Guest",
  userEmail,
  t,
  onSignOut,
  language,
  isLoading
}) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- KEYBOARD SHORTCUT LISTENER ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePaletteAction = (action: string) => {
    if (action === 'new_tx') onNewTransaction();
    if (action === 'scan') onTabChange('scan');
    if (action === 'transfer') onTabChange('accounts');
  };

  const getPageTitle = (tab: NavTab) => {
    switch (tab) {
      case 'home': return t('titles.dashboard');
      case 'transactions': return t('titles.transactionHistory');
      case 'scan': return t('titles.receiptScanner');
      case 'business': return t('titles.businessHub');
      case 'settings': return t('titles.preferences');
      case 'accounts': return t('titles.accountsAssets');
      case 'budget': return t('titles.financialPlan');
      case 'investments': return t('titles.investmentPortfolio');
      case 'reports': return t('titles.reports');
      default: return '';
    }
  };

  return (
    <div className="bg-platinum-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-200 font-sans selection:bg-gold-500/30 selection:text-gold-100 transition-colors duration-300 pb-safe relative isolate">
      {/* Ambient Background Glows */}
      {/* Ambient Background Glows */}

      {/* Mobile Top Bar */}
      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-[safe-area-inset-top+64px] pb-2 pt-safe glass border-b border-white/10 z-[60] flex items-end px-5 transition-all duration-300 shadow-sm dark:shadow-none">

        {isMobileSearchOpen ? (
          <div className="flex items-center w-full gap-3 animate-fade-in pb-2" role="search">
            <button
              type="button"
              onClick={() => {
                setIsMobileSearchOpen(false);
                onSearch?.('');
              }}
              className="p-2 -ml-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              aria-label="Close search"
            >
              <ChevronLeft size={24} aria-hidden="true" />
            </button>
            <div className="flex-1 relative">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => onSearch?.(e.target.value)}
                placeholder="Search..."
                className="w-full bg-platinum-100 dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-200 text-sm rounded-2xl focus:ring-1 focus:ring-gold-500 focus:border-gold-500 block pl-4 pr-10 py-3 outline-none placeholder:text-neutral-500 dark:placeholder:text-neutral-600 transition-shadow shadow-inner"
                aria-label="Search transactions"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearch?.('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 p-1 hover:text-neutral-900 dark:hover:text-white"
                  aria-label="Clear search query"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full h-14 pb-1">
            {/* Branding & Menu Trigger */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -ml-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors active:scale-95"
              >
                <Menu size={26} strokeWidth={1.5} />
              </button>
              <div onClick={() => onTabChange('home')} className="active:opacity-80 transition-opacity pt-1">
                <Logo iconSize="w-8 h-8" textSize="text-lg" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-gold-500 transition-colors"
                aria-label="Open command palette"
              >
                <Search size={22} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setIsNotificationOpen(true)}
                className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-gold-500 transition-colors relative flex-shrink-0"
                aria-label="Notifications"
              >
                <Bell size={22} strokeWidth={2} aria-hidden="true" />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-neutral-950 animate-pulse"></span>
                )}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Navigation Layer */}
      <Navigation
        activeTab={activeTab}
        onTabChange={onTabChange}
        onNewTransaction={onNewTransaction}
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
        onSignOut={onSignOut}
        isLoading={isLoading}
        t={t}
        userName={userName}
        userEmail={userEmail}
        privacyMode={privacyMode}
        onTogglePrivacy={onTogglePrivacy}
      />

      {/* Main Content Area */}
      <main className="
        relative 
        md:ml-72 
        transition-all 
        duration-300 
        ease-in-out
      ">
        {/* Desktop Sticky Header */}
        <header className="
          hidden md:flex 
          sticky top-0 z-30 
          items-center justify-between 
          h-20
          px-8
          glass
          border-b border-white/10
          transition-colors duration-300
        ">
          <div className="flex items-center text-sm font-medium text-neutral-500">
            <span className="uppercase tracking-widest text-xs font-semibold text-neutral-500 transition-colors">
              {new Date().toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* Privacy Toggle */}
            <button
              onClick={onTogglePrivacy}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-platinum-100 dark:bg-neutral-900 border border-transparent hover:border-gold-500/50 transition-all group"
              title={privacyMode ? "Show Balances" : "Hide Balances"}
            >
              {privacyMode ? <EyeOff size={16} className="text-gold-500" /> : <Eye size={16} className="text-neutral-400 group-hover:text-white" />}
              <span className="text-xs font-bold text-neutral-500 group-hover:text-white">
                {privacyMode ? 'Hidden' : 'Visible'}
              </span>
            </button>

            {/* Omni-Search Bar */}
            <div
              className="relative group w-80 lg:w-96 cursor-text"
              onClick={() => setIsCommandPaletteOpen(true)}
              role="button"
            >
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-neutral-500 group-hover:text-gold-500 transition-colors" aria-hidden="true" />
              </div>
              <div className="w-full bg-platinum-100/50 dark:bg-neutral-900/50 border border-transparent dark:border-white/10 text-neutral-500 dark:text-neutral-400 text-sm rounded-xl py-2.5 pl-10 pr-12 transition-all shadow-sm group-hover:border-gold-500/30 group-hover:bg-white dark:group-hover:bg-neutral-800 flex items-center">
                <span className="opacity-70">{t('common.search')}</span>
              </div>
              {/* Keyboard Hint */}
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                <kbd className="hidden lg:flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-neutral-500 bg-white dark:bg-neutral-800 rounded-md border border-platinum-200 dark:border-neutral-700">
                  <Command size={10} /> K
                </kbd>
              </div>
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setIsNotificationOpen(true)}
              className="relative p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors group"
              aria-label="Notifications"
            >
              <div className="absolute inset-0 bg-platinum-100 dark:bg-neutral-800 rounded-full opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300"></div>
              <Bell size={20} className="relative z-10" aria-hidden="true" />
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-neutral-950 z-20 animate-pulse"></span>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="pt-20 md:pt-8 pb-20 md:pb-12 px-4 md:px-8 max-w-7xl mx-auto animate-fade-in">

          {/* Page Title Section */}
          <div className="hidden md:block mb-10">
            <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white tracking-tight drop-shadow-sm">
              {getPageTitle(activeTab)}
            </h1>
            <p className="text-neutral-500 mt-2 text-sm">{t('titles.welcome')}, {userName}</p>
          </div>

          {children}
        </div>
      </main>

      {/* Global Concierge Widget */}
      <ConciergeWidget
        transactions={transactions}
        accounts={accounts}
        budgets={budgets}
        investments={investments}
        activeTab={activeTab}
        onAddTransactionData={onAddTransactionData}
        onAddBudget={onAddBudget}
        t={t}
        language={language}
        privacyMode={privacyMode}
      />

      {/* Notification Panel (Global) */}
      <NotificationPanel
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        onAction={(tab, payload) => {
          onTabChange(tab, payload);
          setIsNotificationOpen(false);
        }}
        onClearAll={() => onClearNotifications?.()}
      />

      {/* Omni-Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={onTabChange}
        onAction={handlePaletteAction}
        accounts={accounts}
        transactions={transactions}
      />
    </div>
  );
};
