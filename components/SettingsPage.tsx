
import React, { useEffect, useRef } from 'react';
import {
   User, Shield, Bell, Monitor, Globe, LogOut,
   ChevronRight, ToggleRight, ToggleLeft, Lock, Fingerprint,
   Download, Trash2, Languages, Moon, Sun, FileSpreadsheet, Coins, Upload, HardDrive, RefreshCw
} from 'lucide-react';
import { Transaction, Account, Investment, Language } from '../types';
import { useSecurity } from '../contexts/SecurityContext'; // New import
import { CURRENCIES } from '../constants';
import { getJSON, setJSON, STORAGE_KEYS } from '../lib/storage';
import { z } from 'zod';

// Minimal Zod Schemas for Validation
const AccountSchema = z.object({
   id: z.string(),
   name: z.string(),
   type: z.enum(['checking', 'savings', 'credit', 'investment', 'crypto', 'business']),
   balance: z.number(),
   currency: z.string(),
   institution: z.string().optional(),
   color: z.string().optional(),
}).passthrough();

const TransactionSplitSchema = z.object({
   id: z.union([z.string(), z.number()]),
   category: z.string(),
   amount: z.number(),
}).passthrough();

const TransactionSchema = z.object({
   id: z.string(),
   accountId: z.string(),
   name: z.string(),
   amount: z.string(),
   numericAmount: z.number(),
   currency: z.string(),
   date: z.string(),
   category: z.string(),
   type: z.enum(['credit', 'debit']),
   status: z.enum(['pending', 'completed']),
   splits: z.array(TransactionSplitSchema).optional(),
}).passthrough();

const BudgetCategorySchema = z.object({
   id: z.string(),
   category: z.string(),
   limit: z.number(),
}).passthrough();

const SavingsGoalSchema = z.object({
   id: z.string(),
   name: z.string(),
   targetAmount: z.number(),
}).passthrough();

const InvestmentSchema = z.object({
   id: z.string(),
   name: z.string(),
   type: z.string(),
   quantity: z.number(),
   currentPrice: z.number(),
   currentValue: z.number(),
}).passthrough();

interface SettingsPageProps {
   onReset?: () => void;
   onReconcile?: () => void;
   transactions?: Transaction[];
   accounts?: Account[];
   investments?: Investment[];
   baseCurrency: string;
   onCurrencyChange: (code: string) => void;
   onSignOut?: () => void;
   currentLanguage: Language;
   onLanguageChange: (lang: Language) => void;
   userName?: string;
   userEmail?: string;
   t: (key: string) => string;
   notificationsEnabled?: boolean;
   onToggleNotifications?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
   onReset,
   onReconcile,
   transactions = [],
   accounts = [],
   investments = [],
   baseCurrency,
   onCurrencyChange,
   onSignOut,
   currentLanguage,
   onLanguageChange,
   userName = "Guest",
   userEmail,
   t,
   notificationsEnabled = true,
   onToggleNotifications
}) => {
   const { hasPin, biometricsEnabled, toggleBiometrics, setupPin, removePin } = useSecurity(); // Hook usage
   const [isDarkMode, setIsDarkMode] = React.useState(true);
   const fileInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
      // Sync state with DOM on mount
      if (typeof document !== 'undefined') {
         setIsDarkMode(document.documentElement.classList.contains('dark'));
      }
   }, []);

   const toggleTheme = () => {
      if (isDarkMode) {
         document.documentElement.classList.remove('dark');
         setIsDarkMode(false);
         localStorage.setItem('theme', 'light');
      } else {
         document.documentElement.classList.add('dark');
         setIsDarkMode(true);
         localStorage.setItem('theme', 'dark');
      }
   };

   const handleExportCSV = () => {
      // 1. Prepare CSV Content - TRANSACTIONS
      const headers = ['ID', 'Date', 'Name', 'Amount', 'Type', 'Category', 'Account ID', 'Currency', 'Business ID', 'Status', 'Description'];
      const rows = transactions.map(t => [
         t.id,
         t.date,
         `"${t.name.replace(/"/g, '""')}"`, // Escape quotes
         t.numericAmount,
         t.type,
         t.category,
         t.accountId,
         t.currency,
         t.business_id || '',
         t.status,
         `"${(t.description || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = [
         headers.join(','),
         ...rows.map(r => r.join(','))
      ].join('\n');

      // 2. Create Blob and Link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      // 3. Trigger Download
      link.href = url;
      link.setAttribute('download', `Prelude_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
   };

   const handleBackupJSON = () => {
      const backupData = {
         version: '1.2',
         timestamp: new Date().toISOString(),
         baseCurrency,
         accounts: getJSON(STORAGE_KEYS.ACCOUNTS, []),
         transactions: getJSON(STORAGE_KEYS.TRANSACTIONS, []),
         budgets: getJSON(STORAGE_KEYS.BUDGETS, []),
         goals: getJSON(STORAGE_KEYS.GOALS, []),
         investments: getJSON(STORAGE_KEYS.INVESTMENTS, []),
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Prelude_FullBackup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
   };

   const BackupSchema = z.object({
      accounts: z.array(AccountSchema),
      transactions: z.array(TransactionSchema),
      budgets: z.array(BudgetCategorySchema).optional(),
      goals: z.array(SavingsGoalSchema).optional(),
      investments: z.array(InvestmentSchema).optional(),
      baseCurrency: z.string().optional(),
      // We allow other fields like version/timestamp to be loosely present or we can explicitly ignore them
      // strip() is default in Zod object unless strict() is called, but let's be safe.
   }).passthrough();

   const handleRestoreJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
         try {
            const rawData = JSON.parse(event.target?.result as string);

            // VALIDATION STEP
            const result = BackupSchema.safeParse(rawData);

            if (!result.success) {
               console.error("Backup validation failed:", result.error);
               alert(t('settings.alertInvalidBackup'));
               return;
            }

            const data = result.data;

            if (window.confirm(t('settings.alertRestoreWarning'))) {
               setJSON(STORAGE_KEYS.ACCOUNTS, data.accounts);
               setJSON(STORAGE_KEYS.TRANSACTIONS, data.transactions);
               if (data.budgets) setJSON(STORAGE_KEYS.BUDGETS, data.budgets);
               if (data.goals) setJSON(STORAGE_KEYS.GOALS, data.goals);
               if (data.investments) setJSON(STORAGE_KEYS.INVESTMENTS, data.investments);
               if (data.baseCurrency) setJSON(STORAGE_KEYS.BASE_CURRENCY, data.baseCurrency);

               alert(t('settings.alertRestoreSuccess'));
               window.location.reload();
            }
         } catch (err) {
            alert(t('settings.alertParseError'));
            console.error(err);
         }
      };
      reader.readAsText(file);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
   };

   const handleReconcileClick = () => {
      if (onReconcile && window.confirm(t('settings.alertReconcileWarning'))) {
         onReconcile();
         alert(t('settings.alertReconcileSuccess'));
      }
   };

   const currentCurrency = CURRENCIES.find(c => c.code === baseCurrency);

   return (
      <div className="max-w-3xl mx-auto pb-20 md:pb-0 animate-fade-in">
         {/* --- PROFILE HEADER --- */}
         <div className="flex flex-col md:flex-row items-center gap-6 p-8 mb-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600"></div>

            <div className="relative">
               <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold-500 to-neutral-900 p-[2px]">
                  <div className="w-full h-full rounded-full bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center transition-colors">
                     <span className="font-display font-bold text-3xl text-gold-500">{userName.charAt(0).toUpperCase()}</span>
                  </div>
               </div>
               <div className="absolute bottom-0 right-0 bg-neutral-900 rounded-full p-1 border border-neutral-800">
                  <div className="bg-green-500 w-3 h-3 rounded-full border border-neutral-900"></div>
               </div>
            </div>

            <div className="text-center md:text-left flex-1">
               <h2 className="text-2xl font-display font-bold text-neutral-900 dark:text-white transition-colors">{userName}</h2>
               <p className="text-neutral-500 mb-3">{userEmail || 'member@aurumwolf.app'}</p>
               <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  <span className="px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 dark:text-gold-500 text-xs font-bold uppercase tracking-wider transition-colors">
                     {t('settings.premiumMember')}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 text-xs font-bold uppercase tracking-wider transition-colors">
                     {t('settings.earlyAccess')}
                  </span>
               </div>
            </div>

            <button className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-all text-sm font-bold">
               {t('settings.editProfile')}
            </button>
         </div>

         {/* --- SETTINGS GRID --- */}
         <div className="space-y-6">

            {/* Section: App Preferences */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-colors duration-300">
               <div className="p-4 bg-neutral-50 dark:bg-neutral-950/50 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 transition-colors">
                  <Monitor size={16} className="text-gold-500" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider transition-colors">{t('settings.appPreferences')}</h3>
               </div>
               <div className="divide-y divide-neutral-200 dark:divide-neutral-800 transition-colors">

                  {/* Dark Mode Toggle */}
                  <div className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-950 rounded-lg text-neutral-400 transition-colors">
                           {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                        </div>
                        <div>
                           <p className="text-sm font-bold text-neutral-900 dark:text-white transition-colors">{t('settings.darkMode')}</p>
                           <p className="text-xs text-neutral-500">{t('settings.adjustAppearance')}</p>
                        </div>
                     </div>
                     <button onClick={toggleTheme} className="text-neutral-500 hover:text-gold-500 transition-colors">
                        {isDarkMode ? <ToggleRight size={32} className="text-gold-500" /> : <ToggleLeft size={32} className="text-neutral-400" />}
                     </button>
                  </div>

                  {/* Language Selector */}
                  <div className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-950 rounded-lg text-neutral-400 transition-colors"><Languages size={18} /></div>
                        <div>
                           <p className="text-sm font-bold text-neutral-900 dark:text-white transition-colors">{t('settings.language')}</p>
                           <p className="text-xs text-neutral-500">{t('settings.interfaceLanguage')}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-950 rounded-lg p-1 border border-neutral-200 dark:border-neutral-800 transition-colors">
                        <button
                           onClick={() => onLanguageChange('en')}
                           className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${currentLanguage === 'en' ? 'bg-gold-500 text-neutral-950 shadow-md' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                        >
                           English
                        </button>
                        <button
                           onClick={() => onLanguageChange('es')}
                           className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${currentLanguage === 'es' ? 'bg-gold-500 text-neutral-950 shadow-md' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                        >
                           Español
                        </button>
                     </div>
                  </div>

                  {/* Currency Selector */}
                  <div className="p-4 flex flex-col gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-neutral-100 dark:bg-neutral-950 rounded-lg text-neutral-400 transition-colors"><Coins size={18} /></div>
                           <div>
                              <p className="text-sm font-bold text-neutral-900 dark:text-white transition-colors">{t('settings.baseCurrency')}</p>
                              <p className="text-xs text-neutral-500">{t('settings.baseCurrencyDesc')}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 text-gold-500 font-bold text-sm">
                           <span>{currentCurrency?.code} ({currentCurrency?.symbol})</span>
                        </div>
                     </div>

                     {/* Currency Pills */}
                     <div className="flex flex-wrap gap-2 pl-12">
                        {CURRENCIES.map(c => (
                           <button
                              key={c.code}
                              onClick={() => onCurrencyChange(c.code)}
                              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${baseCurrency === c.code
                                 ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-black shadow-lg'
                                 : 'bg-neutral-100 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-gold-500/50'
                                 }`}
                           >
                              <span className="opacity-50">{c.symbol}</span>
                              <span>{c.code}</span>
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-950 rounded-lg text-neutral-400 transition-colors"><Bell size={18} /></div>
                        <div>
                           <p className="text-sm font-bold text-neutral-900 dark:text-white transition-colors">{t('settings.notifications')}</p>
                           <p className="text-xs text-neutral-500">{t('settings.notificationsDesc')}</p>
                        </div>
                     </div>
                     <button onClick={onToggleNotifications}>
                        {notificationsEnabled ? (
                           <ToggleRight size={32} className="text-gold-500" />
                        ) : (
                           <ToggleLeft size={32} className="text-neutral-400" />
                        )}
                     </button>
                  </div>
               </div>
            </div>

            {/* Section: Security */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-colors duration-300">
               <div className="p-4 bg-neutral-50 dark:bg-neutral-950/50 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 transition-colors">
                  <Shield size={16} className="text-gold-500" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider transition-colors">{t('settings.security')}</h3>
               </div>
               <div className="divide-y divide-neutral-200 dark:divide-neutral-800 transition-colors">

                  <div className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-950 rounded-lg text-neutral-400 transition-colors"><Fingerprint size={18} /></div>
                        <div>
                           <p className="text-sm font-bold text-neutral-900 dark:text-white transition-colors">{t('settings.biometric')}</p>
                           <p className="text-xs text-neutral-500">{t('settings.biometricDesc')}</p>
                        </div>
                     </div>
                     <button onClick={() => toggleBiometrics(!biometricsEnabled)}>
                        {biometricsEnabled ? (
                           <ToggleRight size={32} className="text-gold-500" />
                        ) : (
                           <ToggleLeft size={32} className="text-neutral-400" />
                        )}
                     </button>
                  </div>
                  <button
                     onClick={() => {
                        if (hasPin) {
                           if (window.confirm("Disable Security PIN?")) {
                              removePin();
                           }
                        } else {
                           const newPin = window.prompt("Set 4-digit PIN");
                           if (newPin?.length === 4 && !isNaN(Number(newPin))) {
                              setupPin(newPin);
                              alert("PIN Set Successfully");
                           } else if (newPin) {
                              alert("PIN must be 4 digits");
                           }
                        }
                     }}
                     className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors text-left"
                  >
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-950 rounded-lg text-neutral-400 transition-colors"><Lock size={18} /></div>
                        <div>
                           <p className="text-sm font-bold text-neutral-900 dark:text-white transition-colors">
                              {hasPin ? "Remove PIN" : "Set Setup PIN"}
                           </p>
                           <p className="text-xs text-neutral-500">
                              {hasPin ? "Tap to disable App Lock" : "Tap to enable App Lock"}
                           </p>
                        </div>
                     </div>
                     <div className='flex items-center gap-2 text-gold-500'>
                        {hasPin && <span className="text-xs font-mono bg-gold-500/10 px-2 py-1 rounded">ACTIVE</span>}
                        <ChevronRight size={16} className="text-neutral-500" />
                     </div>
                  </button>
               </div>
            </div>

            {/* Section: Data Sovereignty */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-colors duration-300">
               <div className="p-4 bg-neutral-50 dark:bg-neutral-950/50 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 transition-colors">
                  <HardDrive size={16} className="text-gold-500" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider transition-colors">{t('settings.dataSovereignty')}</h3>
               </div>
               <div className="divide-y divide-neutral-200 dark:divide-neutral-800 transition-colors">

                  {/* RECONCILE BUTTON */}
                  <button
                     onClick={handleReconcileClick}
                     className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors text-left group"
                  >
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-950 rounded-lg text-neutral-400 group-hover:text-gold-500 group-hover:bg-gold-500/10 transition-colors">
                           <RefreshCw size={18} />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-neutral-900 dark:text-white transition-colors group-hover:text-gold-500">{t('settings.termReconcile')}</p>
                           <p className="text-xs text-neutral-500">{t('settings.termReconcileDesc')}</p>
                        </div>
                     </div>
                     <ChevronRight size={16} className="text-neutral-400" />
                  </button>

                  {/* BACKUP */}
                  <button
                     onClick={handleBackupJSON}
                     className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors text-left group"
                  >
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-950 rounded-lg text-neutral-400 group-hover:text-gold-500 group-hover:bg-gold-500/10 transition-colors">
                           <Download size={18} />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-neutral-900 dark:text-white transition-colors group-hover:text-gold-500">{t('settings.backup')}</p>
                           <p className="text-xs text-neutral-500">{t('settings.backupDesc')}</p>
                        </div>
                     </div>
                     <ChevronRight size={16} className="text-neutral-400" />
                  </button>

                  {/* RESTORE */}
                  <div className="relative">
                     <input
                        type="file"
                        ref={fileInputRef}
                        accept=".json"
                        className="hidden"
                        onChange={handleRestoreJSON}
                     />
                     <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors text-left group"
                     >
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-neutral-100 dark:bg-neutral-950 rounded-lg text-neutral-400 group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-colors">
                              <Upload size={18} />
                           </div>
                           <div>
                              <p className="text-sm font-bold text-neutral-900 dark:text-white transition-colors group-hover:text-blue-500">{t('settings.restore')}</p>
                              <p className="text-xs text-neutral-500">{t('settings.restoreDesc')}</p>
                           </div>
                        </div>
                        <ChevronRight size={16} className="text-neutral-400" />
                     </button>
                  </div>

                  {/* CSV EXPORT */}
                  <button
                     onClick={handleExportCSV}
                     className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors text-left group"
                  >
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-950 rounded-lg text-neutral-400 group-hover:text-green-500 group-hover:bg-green-500/10 transition-colors">
                           <FileSpreadsheet size={18} />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-neutral-900 dark:text-white transition-colors group-hover:text-green-500">{t('settings.exportCsv')}</p>
                           <p className="text-xs text-neutral-500">{t('settings.exportCsvDesc')}</p>
                        </div>
                     </div>
                     <ChevronRight size={16} className="text-neutral-400" />
                  </button>

                  {/* RESET */}
                  <button
                     onClick={onReset}
                     className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors text-left group"
                  >
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-950 rounded-lg text-red-500 dark:text-red-400/20 dark:text-red-400 group-hover:bg-red-50 dark:group-hover:bg-red-400/20 transition-colors"><Trash2 size={18} /></div>
                        <div>
                           <p className="text-sm font-bold text-red-600 dark:text-red-400 transition-colors">{t('settings.factoryReset')}</p>
                           <p className="text-xs text-neutral-500">{t('settings.factoryResetDesc')}</p>
                        </div>
                     </div>
                  </button>
               </div>
            </div>

            <button
               onClick={onSignOut}
               className="w-full py-4 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all text-sm font-bold flex items-center justify-center gap-2"
            >
               <LogOut size={16} /> {t('settings.signOut')}
            </button>

            <p className="text-center text-[10px] text-neutral-500 font-mono pt-4">
               AurumWolf v1.4.0 • Encrypted
            </p>

         </div >
      </div >
   );
};
