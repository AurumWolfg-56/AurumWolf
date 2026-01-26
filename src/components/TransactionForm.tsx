
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Check, Plus, Trash2, Repeat, Briefcase,
  ArrowUpCircle, ArrowDownCircle, RefreshCw,
  Wallet, CreditCard, PiggyBank, TrendingUp, Bitcoin,
  Store, MapPin, Loader2, ExternalLink, FileText,
  Lightbulb, Split, Camera
} from 'lucide-react';
import { Account, Transaction, RecurringFrequency, TransactionSplit } from '../types';
import { CURRENCIES } from '../constants';
import { CategorySelect } from './CategorySelect';
import { ReceiptReviewModal } from './ReceiptReviewModal';
import { aiClient } from '../lib/ai/proxy';
import { useCategories } from '../contexts/CategoryContext'; // Corrected import
import { useBusiness } from '../contexts/BusinessContext'; // Needed for stores/channels
import { useReceiptScanner, ScannedReceiptData } from '../hooks/useReceiptScanner';

interface TransactionFormProps {
  initialData?: Transaction | null;
  accounts: Account[];
  transactions: Transaction[];
  onSave: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  t: (key: string) => string;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  initialData,
  accounts,
  transactions,
  onSave,
  onDelete,
  onCancel,
  t
}) => {
  const { categories } = useCategories();
  const { entities: businessEntities } = useBusiness(); // Fetch entities for dropdown

  // State Declarations (restoring what might have been lost or ensuring it exists)
  const [amount, setAmount] = useState(
    initialData?.numericAmount !== undefined
      ? initialData.numericAmount.toString()
      : (initialData?.amount ? initialData.amount.replace(/[^0-9.]/g, '') : '')
  );
  const [description, setDescription] = useState(initialData?.description || '');
  const [merchant, setMerchant] = useState(initialData?.name || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'credit' | 'debit'>((initialData?.type as 'credit' | 'debit') || 'debit');
  const [category, setCategory] = useState(initialData?.category || '');
  const [selectedAccountId, setSelectedAccountId] = useState(initialData?.accountId || accounts[0]?.id || '');

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // Additional State
  const [currency, setCurrency] = useState(initialData?.currency || selectedAccount?.currency || 'USD');
  const [exchangeRate, setExchangeRate] = useState(initialData?.exchangeRate || 1);
  const [manualRate, setManualRate] = useState(!!initialData?.exchangeRate); // If editing and had rate, assume manual or fetched

  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [frequency, setFrequency] = useState<RecurringFrequency>(initialData?.recurringFrequency || 'monthly');
  const [recurringEndDate, setRecurringEndDate] = useState(initialData?.recurringEndDate || '');

  const [isBusiness, setIsBusiness] = useState(!!initialData?.business_id);
  const [businessEntityId, setBusinessEntityId] = useState(initialData?.business_id || '');

  const [isSplit, setIsSplit] = useState(!!initialData?.splits);
  const [splits, setSplits] = useState<{ id: string | number; category: string; amount: string }[]>(
    initialData?.splits?.map(s => ({ ...s, amount: s.amount.toString() })) || []
  );

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedReceiptData | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isScanning, scanReceipt } = useReceiptScanner({
    onScanComplete: (data) => {
      setScannedData(data);
      setReviewModalOpen(true);
    }
  });

  const [isLocating, setIsLocating] = useState(false);
  const [locationFound, setLocationFound] = useState<{ address: string, uri: string } | null>(null);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [isDescFocused, setIsDescFocused] = useState(false);

  // Derived
  const numericRawAmount = parseFloat(amount) || 0;
  const settlementAmount = currency === selectedAccount?.currency
    ? numericRawAmount
    : numericRawAmount * exchangeRate; // Simplified logic, real app might be divide/multiply based on direction

  const totalSplitAmount = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const remainingSplit = numericRawAmount - totalSplitAmount;
  const isSplitValid = !isSplit || Math.abs(remainingSplit) < 0.01;

  // Effects
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) setSelectedAccountId(accounts[0].id);
  }, [accounts, selectedAccountId]);


  const handleEnrichMerchant = async () => {
    if (!merchant) return;
    setIsLocating(true);
    setLocationFound(null);
    setSuggestedCategory(null);

    try {
      const response = await aiClient.generateContent(
        'gemini-2.0-flash',
        [{
          role: 'user',
          parts: [{ text: `Locate this merchant: "${merchant}". Return the official address, full business name, and a suggested transaction category from this list: ${categories.map(c => c.category).join(', ')}.` }]
        }],
        {
          tools: [{ google_search_retrieval: { dynamic_retrieval_config: { mode: "MODE_DYNAMIC", dynamic_threshold: 0.3 } } }],
        }
      );

      const text = response.text();
      // Try to find grounding metadata for maps/links
      const grounding = response.raw?.candidates?.[0]?.groundingMetadata;
      const mapChunk = grounding?.searchEntryPoint; // Simplified access

      // Attempt to extract category if model mentioned one
      const matchedCategory = categories.find(c => text.includes(c.category));
      if (matchedCategory && !category) {
        setCategory(matchedCategory.category);
        setSuggestedCategory(matchedCategory.category);
      }

      // Check for Map Link (Grounding)
      let mapUri = '';
      if (grounding?.groundingChunks?.[0]?.web?.uri) {
        mapUri = grounding.groundingChunks[0].web.uri;
      }

      if (text) {
        // Using the text as address for now if structured data isn't parsed
        const firstLine = text.split('\n')[0];
        setLocationFound({ address: firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : ''), uri: mapUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(merchant)}` });
      }

    } catch (error) {
      console.error("Enrichment failed", error);
    } finally {
      setIsLocating(false);
    }
  };

  const calculateNextDate = (startDate: string, freq: RecurringFrequency): string => {
    const d = new Date(startDate);
    if (freq === 'daily') d.setDate(d.getDate() + 1);
    if (freq === 'weekly') d.setDate(d.getDate() + 7);
    if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
    if (freq === 'yearly') d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScanPreview(URL.createObjectURL(file));
      scanReceipt(file);
    }
  };

  const handleScanConfirm = (data: ScannedReceiptData) => {
    // V3 Scanner returns null for missing fields, so we check != null (covers null and undefined)
    if (data.amount != null) setAmount(data.amount.toString());
    if (data.merchant) setMerchant(data.merchant);
    if (data.date) setDate(data.date);
    if (data.category && categories.some(c => c.category === data.category)) setCategory(data.category);
    if (data.description) setDescription(data.description);
    if (data.currency) setCurrency(data.currency);
    setReviewModalOpen(false);
    setScannedData(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !merchant) return;
    if (isSplit && !isSplitValid) {
      alert(t('transactionForm.splitError') || "Split amounts must equal the total transaction amount.");
      return;
    }

    // We store the Settlement Amount as the main "amount" string for consistency in lists (e.g. "-$50.00")
    // But we also store foreignAmount for detail views.
    const settlementFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency', currency: selectedAccount?.currency || 'USD'
    }).format(settlementAmount);

    const finalCategory = isSplit ? 'Split Transaction' : category;
    const finalSplits: TransactionSplit[] | undefined = isSplit
      ? splits.map(s => ({ id: s.id, category: s.category, amount: parseFloat(s.amount) || 0 }))
      : undefined;
    const finalDescription = description || (isSplit ? splits.map(s => `${s.category}: ${s.amount}`).join(', ') : '');

    const transactionData: Transaction = {
      id: initialData ? initialData.id : crypto.randomUUID(),
      accountId: selectedAccountId,
      name: merchant,

      // Core Amounts
      amount: settlementFormatted, // Display amount in Account Currency
      numericAmount: parseFloat(settlementAmount.toFixed(2)), // Impact on Balance

      // FX Data
      currency: currency, // The original currency
      foreignAmount: numericRawAmount,
      exchangeRate: exchangeRate,
      accountCurrency: selectedAccount?.currency,

      date: date,
      category: finalCategory,
      splits: finalSplits,
      description: finalDescription,
      type: type,
      status: 'completed',
      business_id: isBusiness ? businessEntityId : undefined,
      isRecurring: isRecurring,
      recurringFrequency: isRecurring ? frequency : undefined,
      nextRecurringDate: isRecurring ? calculateNextDate(date, frequency) : undefined,
      recurringEndDate: isRecurring && recurringEndDate ? recurringEndDate : undefined,
    };

    onSave(transactionData);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    // Ensure we have an ID and the handler
    if (initialData && initialData.id && onDelete) {
      if (window.confirm(t('common.confirmDelete'))) {
        // Explicitly cast to Number to match interface and store
        onDelete(initialData.id);
      }
    }
  };

  const currencyObj = CURRENCIES.find(c => c.code === currency);
  const stores = businessEntities.filter(e => e.type === 'store' || e.type === 'real_estate' || e.type === 'service');
  const channels = businessEntities.filter(e => e.type === 'channel' || e.type === 'subsidiary');

  // Logic to show suggestion
  const descriptionSuggestions = useMemo(() => {
    const allDescriptions = Array.from(new Set(transactions.map(t => t.description).filter(Boolean) as string[]));
    if (!description) return allDescriptions.slice(0, 5);
    return allDescriptions
      .filter(d => d.toLowerCase().includes(description.toLowerCase()) && d !== description)
      .slice(0, 5);
  }, [transactions, description]);

  return (
    <div className="max-w-2xl mx-auto pb-20 md:pb-0">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
          {initialData ? t('transactionForm.titleEdit') : t('transactionForm.titleNew')}
        </h2>
        <div className="flex gap-2">
          {!initialData && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="p-2 px-4 rounded-full bg-gold-500 hover:bg-gold-400 text-neutral-950 font-bold transition-all flex items-center gap-2 shadow-lg"
              >
                {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                <span className="hidden md:inline">{isScanning ? t('transactionForm.scanning') : t('transactionForm.scanReceipt')}</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
              />
            </>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-full bg-platinum-100 dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">

        {/* 1. Type Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-platinum-100 dark:bg-neutral-900 p-1.5 rounded-2xl border border-platinum-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setType('debit')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${type === 'debit'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-lg'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'
              }`}
          >
            <ArrowUpCircle size={18} className={type === 'debit' ? 'text-red-500' : ''} />
            {t('transactionForm.expense')}
          </button>
          <button
            type="button"
            onClick={() => setType('credit')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${type === 'credit'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-lg'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'
              }`}
          >
            <ArrowDownCircle size={18} className={type === 'credit' ? 'text-green-500' : ''} />
            {t('transactionForm.income')}
          </button>
        </div>

        {/* 2. Amount Input & Currency */}
        <div className="relative">
          <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">{t('transactionForm.amount')}</label>
          <div className="flex items-center justify-center gap-2">
            {/* Currency Selector */}
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => { setCurrency(e.target.value); setManualRate(false); }}
                className="appearance-none bg-transparent text-2xl md:text-3xl font-mono font-bold text-gold-500 border-none outline-none text-right pr-6 cursor-pointer"
              >
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol}</option>)}
              </select>
              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-neutral-600 pointer-events-none">▼</span>
            </div>

            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-48 md:w-64 bg-transparent border-none text-center text-4xl sm:text-5xl md:text-6xl font-mono font-bold text-neutral-900 dark:text-white placeholder-platinum-300 dark:placeholder-neutral-800 focus:ring-0 outline-none p-0"
              autoFocus={!initialData}
            />
          </div>

          {/* FX Conversion Preview */}
          {currency !== selectedAccount?.currency && amount && (
            <div className="mt-4 flex flex-col items-center justify-center animate-fade-in">
              <div className="flex items-center gap-3 px-4 py-2 bg-platinum-100 dark:bg-neutral-900 rounded-xl border border-platinum-200 dark:border-neutral-800">
                <div className="text-right">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">{t('transactionForm.rate')}</p>
                  <input
                    type="number"
                    value={exchangeRate}
                    onChange={(e) => { setExchangeRate(parseFloat(e.target.value)); setManualRate(true); }}
                    className="w-16 bg-transparent text-right text-xs text-gold-500 font-mono outline-none border-b border-platinum-300 dark:border-neutral-700 focus:border-gold-500"
                  />
                </div>
                <RefreshCw size={14} className="text-neutral-400 dark:text-neutral-600" />
                <div className="text-left">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">{t('transactionForm.settlement')} ({selectedAccount?.currency})</p>
                  <p className="text-sm text-neutral-900 dark:text-white font-bold font-mono">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedAccount?.currency || 'USD' }).format(settlementAmount)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Account Selector */}
        <div className="bg-platinum-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-platinum-200 dark:border-neutral-800 flex flex-col gap-3">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('transactionForm.chargeAccount')}</label>
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {accounts.map(acc => {
              // Map Account Type to Icon
              let TypeIcon = Wallet;
              if (acc.type === 'credit') TypeIcon = CreditCard;
              else if (acc.type === 'business') TypeIcon = Briefcase;
              else if (acc.type === 'savings') TypeIcon = PiggyBank;
              else if (acc.type === 'investment') TypeIcon = TrendingUp;
              else if (acc.type === 'crypto') TypeIcon = Bitcoin;

              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => { setSelectedAccountId(acc.id); setManualRate(false); }}
                  className={`relative flex flex-col justify-between p-4 rounded-2xl border transition-all shrink-0 w-44 h-28 overflow-hidden group ${selectedAccountId === acc.id
                    ? 'shadow-xl scale-105 ring-2 ring-offset-2 ring-gold-500 dark:ring-offset-neutral-950'
                    : 'opacity-70 hover:opacity-100 hover:scale-[1.02]'
                    } ${acc.color && acc.color.includes('gradient') ? acc.color : 'bg-neutral-900'}`}
                  style={!acc.color?.includes('gradient') && acc.color ? { backgroundColor: acc.color } : {}}
                >
                  {/* Card Visuals */}
                  {selectedAccountId !== acc.id && <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />}

                  {/* Top Row: Icon & Institution */}
                  <div className="flex justify-between items-start z-0 text-white/90">
                    <TypeIcon size={18} className="drop-shadow-md" />
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{acc.institution || 'Bank'}</span>
                  </div>

                  {/* Bottom Row: Name & Balance */}
                  <div className="text-left z-0 text-white">
                    <p className="text-xs font-medium opacity-90 truncate">{acc.name}</p>
                    <p className="text-[10px] font-mono opacity-70">•••• {acc.last4 || '****'}</p>
                    {selectedAccountId === acc.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-white text-gold-600 rounded-full flex items-center justify-center shadow-lg animate-fade-in">
                        <Check size={12} strokeWidth={4} />
                      </div>
                    )}
                  </div>

                  {/* Decorative Circle */}
                  <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Core Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Merchant Name with Enrichment */}
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">{t('transactionForm.merchantSource')}</label>
            <div className="relative flex gap-2">
              <div className="relative group flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Store size={16} className="text-neutral-500 group-focus-within:text-gold-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder={t('transactionForm.merchantPlaceholder')}
                  className="w-full bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl focus:ring-1 focus:ring-gold-500 focus:border-gold-500 block pl-11 p-3 transition-all outline-none"
                />
              </div>
              {/* Enrichment Button */}
              <button
                type="button"
                onClick={handleEnrichMerchant}
                disabled={!merchant || isLocating}
                className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 text-gold-500 hover:bg-gold-500/10 hover:border-gold-500 transition-all disabled:opacity-50"
                title={t('transactionForm.findLocation')}
              >
                {isLocating ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
              </button>
            </div>
            {locationFound && (
              <a href={locationFound.uri} target="_blank" rel="noreferrer" className="mt-2 text-[10px] text-green-500 flex items-center gap-1 hover:underline">
                <Check size={10} /> {t('transactionForm.locationFound')} <ExternalLink size={8} />
              </a>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">{t('transactionForm.date')}</label>
            <div className="relative group">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max="2099-12-31"
                className="w-full bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl focus:ring-1 focus:ring-gold-500 focus:border-gold-500 block px-4 p-3 transition-all outline-none [&::-webkit-calendar-picker-indicator]:invert-0 dark:[&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
          </div>
        </div>

        {/* Description Field */}
        <div className="relative z-20">
          <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">{t('transactionForm.description')}</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FileText size={16} className="text-neutral-500 group-focus-within:text-gold-500 transition-colors" />
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onFocus={() => setIsDescFocused(true)}
              onBlur={() => setTimeout(() => setIsDescFocused(false), 200)}
              placeholder={t('transactionForm.descriptionPlaceholder')}
              rows={2}
              className="w-full bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl focus:ring-1 focus:ring-gold-500 focus:border-gold-500 block pl-11 p-3 transition-all outline-none resize-none"
            />
          </div>
        </div>

        {/* 5. Category Selection */}
        {!isSplit ? (
          <div className="relative">
            <CategorySelect value={category} onChange={setCategory} />
            {suggestedCategory && suggestedCategory !== category && (
              <button
                type="button"
                onClick={() => setCategory(suggestedCategory)}
                className="absolute right-0 -top-8 bg-gold-500/10 border border-gold-500/20 text-gold-500 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 hover:bg-gold-500/20 transition-all animate-fade-in"
              >
                <Lightbulb size={10} /> {t('transactionForm.suggested')}: {suggestedCategory}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSplit(true)}
              className="absolute top-0 right-0 text-[10px] text-gold-500 hover:text-gold-400 font-bold flex items-center gap-1 mt-1 uppercase tracking-wide transition-colors"
            >
              <Split size={12} /> {t('transactionForm.splitTransaction')}
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Split size={16} className="text-gold-500" /> {t('transactionForm.splitTitle')}
              </h3>
              <button type="button" onClick={() => setIsSplit(false)} className="text-xs text-red-500 hover:text-red-400 font-medium">{t('transactionForm.reset')}</button>
            </div>
            <div className="space-y-3 mb-4">
              {splits.map((split) => (
                <div key={split.id} className="flex gap-2 items-start">
                  <div className="flex-1"><CategorySelect compact value={split.category} onChange={(val) => {
                    const newSplits = splits.map(s => s.id === split.id ? { ...s, category: val } : s);
                    setSplits(newSplits);
                  }} placeholder={t('transactionForm.selectCategory')} /></div>
                  <div className="w-24 relative">
                    <span className="absolute left-2 top-2 text-neutral-500 text-xs">{currencyObj?.symbol}</span>
                    <input type="number" value={split.amount} onChange={(e) => {
                      const newSplits = splits.map(s => s.id === split.id ? { ...s, amount: e.target.value } : s);
                      setSplits(newSplits);
                    }} className="w-full bg-platinum-100 dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 rounded-xl py-2 pl-5 pr-2 text-xs text-neutral-900 dark:text-white focus:border-gold-500 outline-none text-right" />
                  </div>
                  <button type="button" onClick={() => setSplits(splits.filter(s => s.id !== split.id))} className="p-2 text-neutral-500 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-platinum-200 dark:border-neutral-800 pt-3">
              <button type="button" onClick={() => setSplits([...splits, { id: Date.now(), category: '', amount: '' }])} className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1"><Plus size={14} /> {t('transactionForm.addSplit')}</button>
              <p className={`text-xs font-mono font-bold ${Math.abs(remainingSplit) > 0.05 ? 'text-red-500' : 'text-green-500'}`}>
                {remainingSplit > 0 ? t('transactionForm.remaining') + ': ' : remainingSplit < 0 ? t('transactionForm.over') + ': ' : t('transactionForm.matched') + ': '} {currencyObj?.symbol}{Math.abs(remainingSplit).toFixed(2)}
              </p>
            </div>
          </div >
        )}

        {/* 6. Recurring Logic */}
        <div className="bg-platinum-50 dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all">
          <button type="button" onClick={() => setIsRecurring(!isRecurring)} className="w-full p-4 flex items-center justify-between hover:bg-white dark:hover:bg-neutral-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${isRecurring ? 'bg-gold-500 text-neutral-950' : 'bg-platinum-200 dark:bg-neutral-950 text-neutral-500'}`}><Repeat size={18} /></div>
              <div className="text-left"><p className={`text-sm font-bold ${isRecurring ? 'text-gold-500' : 'text-neutral-500 dark:text-neutral-400'}`}>{t('transactionForm.recurringPayment')}</p></div>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${isRecurring ? 'bg-gold-500' : 'bg-platinum-300 dark:bg-neutral-800'}`}><div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${isRecurring ? 'left-6' : 'left-1'}`}></div></div>
          </button>
          {isRecurring && (
            <div className="p-4 pt-0 animate-fade-in border-t border-platinum-200 dark:border-neutral-800 mt-2 bg-platinum-100 dark:bg-neutral-900/50">
              <div className="pt-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">{t('transactionForm.frequency')}</label>
                  <select value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)} className="w-full bg-white dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500">
                    <option value="daily">{t('common.frequencies.daily')}</option>
                    <option value="weekly">{t('common.frequencies.weekly')}</option>
                    <option value="monthly">{t('common.frequencies.monthly')}</option>
                    <option value="yearly">{t('common.frequencies.yearly')}</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">{t('transactionForm.endDate')}</label>
                  <input type="date" value={recurringEndDate} min={date} onChange={(e) => setRecurringEndDate(e.target.value)} className="w-full bg-white dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 [&::-webkit-calendar-picker-indicator]:invert-0 dark:[&::-webkit-calendar-picker-indicator]:invert" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 7. Business Toggle */}
        <div className="bg-platinum-50 dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all">
          <button type="button" onClick={() => setIsBusiness(!isBusiness)} className="w-full p-4 flex items-center justify-between hover:bg-white dark:hover:bg-neutral-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${isBusiness ? 'bg-gold-500 text-neutral-950' : 'bg-platinum-200 dark:bg-neutral-950 text-neutral-500'}`}><Briefcase size={18} /></div>
              <div className="text-left"><p className={`text-sm font-bold ${isBusiness ? 'text-gold-500' : 'text-neutral-500 dark:text-neutral-400'}`}>{t('transactionForm.businessExpense')}</p></div>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${isBusiness ? 'bg-gold-500' : 'bg-platinum-300 dark:bg-neutral-800'}`}><div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${isBusiness ? 'left-6' : 'left-1'}`}></div></div>
          </button>
          {isBusiness && (
            <div className="p-4 pt-0 animate-fade-in border-t border-platinum-200 dark:border-neutral-800 mt-2 bg-platinum-100 dark:bg-neutral-900/50">
              <div className="pt-4">
                <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">{t('transactionForm.assignEntity')}</label>
                <select value={businessEntityId} onChange={(e) => setBusinessEntityId(e.target.value)} className="w-full bg-white dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500">
                  <option value="">{t('transactionForm.selectBusiness')}</option>
                  <optgroup label="Physical Stores">{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
                  <optgroup label="Digital Channels">{channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-6 flex gap-3 border-t border-platinum-200 dark:border-neutral-800 mt-6">
          {initialData && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 min-w-[100px] font-bold text-sm"
            >
              <Trash2 size={18} />
              <span>{t('transactionForm.delete')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-bold text-sm hover:text-neutral-900 dark:hover:text-white hover:bg-platinum-50 dark:hover:bg-neutral-800 transition-all"
          >
            {t('transactionForm.cancel')}
          </button>
          <button
            type="submit"
            disabled={!amount || !merchant || !date || !isSplitValid}
            className="flex-[2] py-3.5 rounded-xl bg-gold-500 text-neutral-950 font-bold text-sm hover:bg-gold-400 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {initialData ? <Check size={18} /> : <Plus size={18} />}
            {initialData ? t('transactionForm.update') : t('transactionForm.add')}
          </button>
        </div>

      </form>

      {/* Verification Modal */}
      <ReceiptReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onConfirm={handleScanConfirm}
        initialData={scannedData}
        imagePreview={scanPreview}
      />
    </div>
  );
};
