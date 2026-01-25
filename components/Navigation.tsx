
import React from 'react';
import { Home, PieChart, Plus, Briefcase, Settings, LogOut, Wallet, History, X, ScanLine, TrendingUp, Menu, FileText, Eye, EyeOff } from 'lucide-react';
import { NavTab } from '../types';
import { Logo } from './Logo';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onNewTransaction: () => void;
  isMobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
  userName?: string;
  userEmail?: string;
  t: (key: string) => string;
  onSignOut: () => void;
  isLoading?: boolean;
  privacyMode?: boolean;
  onTogglePrivacy?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  onNewTransaction,
  isMobileMenuOpen,
  onCloseMobileMenu,
  userName = "Guest",
  userEmail,
  t,
  onSignOut,
  isLoading,
  privacyMode,
  onTogglePrivacy
}) => {
  // Fix: Ensure 't' is always a function to prevent crashes during HMR/loading
  const safeT = t || ((k: string) => k);

  // Full Desktop & Drawer Nav Items
  const fullNavItems = [
    { id: 'home', label: safeT('nav.dashboard'), icon: Home },
    { id: 'transactions', label: safeT('nav.history'), icon: History },
    { id: 'accounts', label: safeT('nav.accounts'), icon: Wallet },
    { id: 'budget', label: safeT('nav.budget'), icon: PieChart },
    { id: 'investments', label: safeT('nav.investments'), icon: TrendingUp },
    { id: 'business', label: safeT('nav.business'), icon: Briefcase },
    { id: 'reports', label: safeT('nav.reports'), icon: FileText },
    { id: 'settings', label: safeT('nav.settings'), icon: Settings },
  ] as const;

  // Mobile Bottom Nav Items (5 specific tabs)
  const mobileNavItems = [
    { id: 'home', label: safeT('nav.dashboard'), icon: Home },
    { id: 'transactions', label: safeT('nav.history'), icon: History },
    { id: 'scan', label: safeT('common.scan'), icon: ScanLine, isAction: true },
    { id: 'business', label: safeT('nav.business'), icon: Briefcase },
    { id: 'settings', label: safeT('nav.settings'), icon: Settings },
  ];

  const handleNavClick = (id: NavTab) => {
    onTabChange(id);
    onCloseMobileMenu();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-neutral-950/50 backdrop-blur-xl border-r border-white/5">
      <div className="p-8 pb-6 flex justify-between items-center shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Logo iconSize="w-10 h-10" textSize="text-xl" />
            {isLoading && (
              <div className="w-2 h-2 rounded-full bg-gold-400 animate-ping" title="Syncing..."></div>
            )}
          </div>
          <p className="text-[10px] text-neutral-500 uppercase tracking-[0.3em] mt-2 ml-1">{safeT('nav.subtitle')}</p>
        </div>
        <button
          onClick={onCloseMobileMenu}
          className="md:hidden p-2 rounded-full text-neutral-500 hover:bg-neutral-800 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
        <div className="mb-6">
          <button
            onClick={() => { onNewTransaction(); onCloseMobileMenu(); }}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gold-500 to-gold-400 hover:to-gold-300 text-neutral-900 font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-gold-500/20 active:scale-95 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="tracking-wide">{safeT('nav.newTransaction')}</span>
          </button>
        </div>

        {fullNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as NavTab)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? 'bg-white/5 border border-white/10 text-gold-400 shadow-[0_0_20px_rgba(197,157,95,0.15)] backdrop-blur-md'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                }`}
            >
              <Icon
                size={20}
                className={`transition-colors duration-300 relative z-10 ${isActive ? 'text-gold-500' : 'group-hover:text-neutral-200'}`}
              />
              <span className={`text-sm font-medium tracking-wide relative z-10 ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold-500 shadow-[0_0_8px_#D4AF37] relative z-10"></div>}
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-neutral-900 mt-auto shrink-0 space-y-4">
        {/* Privacy Toggle (Mobile/Sidebar) */}
        <button
          onClick={onTogglePrivacy}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-900/30 border border-neutral-800/50 hover:bg-neutral-800 transition-colors group"
        >
          <div className="flex items-center gap-3">
            {privacyMode ? <EyeOff size={18} className="text-gold-500" /> : <Eye size={18} className="text-neutral-500" />}
            <span className="text-sm font-medium text-neutral-400 group-hover:text-white">
              {safeT(privacyMode ? 'common.hidden' : 'common.visible') || (privacyMode ? 'Hidden' : 'Visible')} Mode
            </span>
          </div>
          <div className={`w-8 h-4 rounded-full relative transition-colors ${privacyMode ? 'bg-gold-500/20' : 'bg-neutral-800'}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 ${privacyMode ? 'left-4.5 bg-gold-500' : 'left-0.5 bg-neutral-500'}`} style={{ left: privacyMode ? '1.125rem' : '0.125rem' }}></div>
          </div>
        </button>

        <div
          onClick={onSignOut}
          className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:border-gold-500/30 transition-colors cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-600 to-neutral-900 p-[1px]">
            <div className="w-full h-full rounded-full bg-neutral-950 flex items-center justify-center">
              <span className="font-display font-bold text-gold-500">{userName.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold text-neutral-200 truncate group-hover:text-gold-500">{userName}</p>
            <p className="text-xs text-neutral-500 truncate">{userEmail || 'AurumWolf Member'}</p>
          </div>
          <LogOut size={16} className="text-neutral-500 hover:text-red-400 transition-colors" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:block w-72 fixed left-0 top-0 bottom-0 z-50">
        <SidebarContent />
      </aside>

      {/* --- MOBILE DRAWER (Full Menu) --- */}
      <div
        className={`md:hidden fixed inset-0 z-[60] bg-neutral-950/80 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onCloseMobileMenu}
      />
      <div
        className={`md:hidden fixed top-0 bottom-0 left-0 z-[70] w-72 bg-neutral-950 border-r border-neutral-900 transform transition-transform duration-300 ease-out shadow-2xl pt-safe ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <SidebarContent />
      </div>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[80px] glass z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="grid grid-cols-5 h-full relative">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            if (item.id === 'scan') {
              return (
                <div key={item.id} className="relative -top-6 flex justify-center pointer-events-none">
                  <button
                    onClick={() => onTabChange('scan')}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-neutral-950 shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center justify-center transform active:scale-95 transition-all pointer-events-auto hover:scale-105 border-4 border-neutral-950"
                  >
                    <ScanLine size={24} />
                  </button>
                </div>
              )
            }

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as NavTab)}
                className="flex flex-col items-center justify-center gap-1 w-full h-full group"
              >
                <div className={`transition-all duration-300 ${isActive ? 'text-gold-500 -translate-y-1' : 'text-neutral-500 group-hover:text-neutral-300'}`}>
                  <Icon size={isActive ? 24 : 22} />
                </div>
                <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-gold-500' : 'text-neutral-600 group-hover:text-neutral-400'}`}>
                  {item.label}
                </span>
                {isActive && <div className="absolute bottom-2 w-1 h-1 rounded-full bg-gold-500 shadow-[0_0_5px_#D4AF37]"></div>}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
