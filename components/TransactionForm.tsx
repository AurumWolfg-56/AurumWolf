
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowUpCircle, ArrowDownCircle, Check, X, Search, Split, Briefcase, Plus, Trash2, Store, Camera, Loader2, Sparkles, Tag, Lightbulb, Repeat, CalendarClock, CalendarOff, FileText, AlertCircle, RefreshCw, MapPin, ExternalLink
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { Account, Transaction, TransactionSplit, RecurringFrequency } from '../types';
import { CATEGORIES, CURRENCIES, FX_RATES } from '../constants';
import { convertAmount } from '../lib/money';
import { getLocalDateISO } from '../lib/dates';
import { CategorySelect } from './CategorySelect';
import { useReceiptScanner, ScannedReceiptData } from '../hooks/useReceiptScanner';
import { ReceiptReviewModal } from './ReceiptReviewModal';
import { useBusiness } from '../contexts/BusinessContext';

// --- SUB-COMPONENTS ---

// (SmartCategorySelect moved to ./CategorySelect.tsx)

// --- MAIN FORM COMPONENT ---

interface TransactionFormProps {
  initialData?: Transaction | null;
  accounts: Account[];
  transactions: Transaction[];
  onSave: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}

interface SplitItem {
  id: number;
  category: string;
  amount: string;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  initialData,
  accounts,
  transactions,
  onSave,
  onDelete,
  onCancel
}) => {
  // --- CORE STATE ---
  const { entities: businessEntities } = useBusiness();
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // FX State
  const [amount, setAmount] = useState(''); // Raw input
  const [currency, setCurrency] = useState('USD'); // Transaction Currency
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [manualRate, setManualRate] = useState(false);

  const [type, setType] = useState<'credit' | 'debit'>('debit');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');


  const [date, setDate] = useState(getLocalDateISO());

  // Logic State
  const [isBusiness, setIsBusiness] = useState(false);
  const [businessEntityId, setBusinessEntityId] = useState('');
  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState<SplitItem[]>([
    { id: 1, category: '', amount: '' },
    { id: 2, category: '', amount: '' }
  ]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [recurringEndDate, setRecurringEndDate] = useState('');

  // UI State
  const [isLocating, setIsLocating] = useState(false);
  const [locationFound, setLocationFound] = useState<{ address: string, uri: string } | null>(null);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [isDescFocused, setIsDescFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Scanner Hook & Modal State
  const [scannedData, setScannedData] = useState<ScannedReceiptData | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);

  const { isScanning, scanReceipt, error: scanError } = useReceiptScanner({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY,
    onScanComplete: (data) => {
      setScannedData(data);
      setReviewModalOpen(true);
    }
  });

  const handleScanConfirm = (data: ScannedReceiptData) => {
    if (data.amount) setAmount(data.amount.toString());
    if (data.currency) {
      const supported = CURRENCIES.find(c => c.code === data.currency);
      if (supported) setCurrency(data.currency);
    }
    if (data.merchant) setMerchant(data.merchant);
    if (data.date) setDate(data.date);
    if (data.category) setCategory(data.category);
    if (data.description) setDescription(data.description);

    // Clear preview
    setScanPreview(null);
  };


  // --- INITIALIZATION ---
  useEffect(() => {
    if (initialData) {
      // Editing Mode
      setAmount(initialData.foreignAmount ? initialData.foreignAmount.toString() : initialData.numericAmount.toString());
      setCurrency(initialData.currency);
      setType(initialData.type);
      setMerchant(initialData.name);
      setDescription(initialData.description || '');
      // Safer date initialization
      setDate(initialData.date || new Date().toISOString().split('T')[0]);
      setSelectedAccountId(initialData.accountId);
      setExchangeRate(initialData.exchangeRate || 1);
      setManualRate(true); // Lock rate to prevent auto-recalc on edit unless changed manually

      if (initialData.splits && initialData.splits.length > 0) {
        setIsSplit(true);
        setSplits(initialData.splits.map(s => ({
          id: typeof s.id === 'string' ? parseInt(s.id) : s.id,
          category: s.category,
          amount: s.amount.toString()
        })));
      } else {
        setCategory(initialData.category);
      }

      if (initialData.business_id) {
        setIsBusiness(true);
        setBusinessEntityId(initialData.business_id);
      }

      if (initialData.isRecurring) {
        setIsRecurring(true);
        if (initialData.recurringFrequency) setFrequency(initialData.recurringFrequency);
        if (initialData.recurringEndDate) setRecurringEndDate(initialData.recurringEndDate);
      }
    } else {
      // New Mode: Default currency to account currency
      if (selectedAccount) {
        setCurrency(selectedAccount.currency);
      }
    }
  }, [initialData]);

  // --- FX RATE CALCULATION ---
  useEffect(() => {
    // If manually set, don't overwrite unless account changes radically or it's new
    if (manualRate) return;
    if (!selectedAccount) return;

    if (currency === selectedAccount.currency) {
      setExchangeRate(1);
    } else {
      // Calculate Rate: How much AccountCurrency is 1 TxCurrency?
      const calculatedAmount = convertAmount(1, currency, selectedAccount.currency);
      setExchangeRate(parseFloat(calculatedAmount.toFixed(4)));
    }
  }, [currency, selectedAccountId, manualRate]); // Recalc when currency or account changes

  // Update currency default when account changes (only if amount is empty to prevent user frustration)
  useEffect(() => {
    if (!initialData && !amount && selectedAccount) {
      setCurrency(selectedAccount.currency);
    }
  }, [selectedAccountId]);

  // --- SMART BUSINESS TOGGLE ---
  // Automatically toggle 'Business Expense' if the selected account is a Business Account
  useEffect(() => {
    if (!initialData && selectedAccount) {
      if (selectedAccount.linked_business_id) {
        // Priority 1: Direct Link
        setIsBusiness(true);
        setBusinessEntityId(selectedAccount.linked_business_id);
      } else if (selectedAccount.type === 'business') {
        // Priority 2: Account Type Hint
        setIsBusiness(true);
        // Leave ID empty to force user selection, or could default to first?
      } else {
        setIsBusiness(false);
        setBusinessEntityId('');
      }
    }
  }, [selectedAccountId]);


  // --- COMPUTED VALUES ---
  const cleanAmountString = amount.replace(/[^0-9.]/g, ''); // Remove currency symbols if user typed them
  const numericRawAmount = parseFloat(cleanAmountString) || 0;

  // Settlement Amount = The amount hitting the account
  const settlementAmount = numericRawAmount * exchangeRate;

  // Split Logic (Splits must sum to the Raw Amount usually, or Settlement? Usually Raw)
  // Let's assume splits are defined in Transaction Currency (Foreign)
  const currentSplitTotal = splits.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const remainingSplit = numericRawAmount - currentSplitTotal;
  // Valid if remaining split is close to 0 OR if we are not in split mode
  const isSplitValid = isSplit ? Math.abs(remainingSplit) < 0.05 : true;

  // --- AI RECEIPT SCANNING ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setScanPreview(previewUrl);

    // Call Hook
    await scanReceipt(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- MERCHANT ENRICHMENT (MAPS GROUNDING) ---
  const handleEnrichMerchant = async () => {
    if (!merchant || !import.meta.env.VITE_GEMINI_API_KEY) return;
    setIsLocating(true);
    setLocationFound(null);

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      // Using gemini-2.5-flash for Maps Grounding support
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Locate this merchant: "${merchant}". Return the official address, full business name, and a suggested transaction category from this list: ${CATEGORIES.map(c => c.name).join(', ')}.`,
        config: {
          tools: [{ googleMaps: {} }],
        }
      });

      // Process Grounding chunks for Maps URI
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const mapChunk = groundingChunks.find(c => c.web?.uri?.includes('google.com/maps') || (c as any).maps); // Check for map data

      // Simple extraction of text response since Maps grounding response is text-heavy + metadata
      const text = response.text || '';

      // Extract address from text using regex heuristic or relying on the model's description in text
      // Note: The model usually returns "I found [Merchant] at [Address]."
      // We will put the whole text summary in the description if it's not too long.
      setDescription(prev => prev ? `${prev}\n\n${text}` : text);

      // Attempt to extract category if model mentioned one
      const matchedCategory = CATEGORIES.find(c => text.includes(c.name));
      if (matchedCategory && !category) {
        setCategory(matchedCategory.name);
        setSuggestedCategory(matchedCategory.name);
      }

      // Check for Map Link
      let mapUri = '';
      if (mapChunk && mapChunk.web && mapChunk.web.uri) {
        mapUri = mapChunk.web.uri;
      }

      if (mapUri) {
        setLocationFound({ address: 'Location Data Added', uri: mapUri });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !merchant) return;
    if (isSplit && !isSplitValid) {
      alert("Split amounts must equal the total transaction amount.");
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
      if (window.confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
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
          {initialData ? 'Edit Transaction' : 'New Transaction'}
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
                <span className="hidden md:inline">{isScanning ? 'Scanning...' : 'Scan Receipt'}</span>
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
            className="p-2 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
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
            Expense
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
            Income
          </button>
        </div>

        {/* 2. Amount Input & Currency */}
        <div className="relative">
          <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider text-center">Amount</label>
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
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">Rate</p>
                  <input
                    type="number"
                    value={exchangeRate}
                    onChange={(e) => { setExchangeRate(parseFloat(e.target.value)); setManualRate(true); }}
                    className="w-16 bg-transparent text-right text-xs text-gold-500 font-mono outline-none border-b border-platinum-300 dark:border-neutral-700 focus:border-gold-500"
                  />
                </div>
                <RefreshCw size={14} className="text-neutral-400 dark:text-neutral-600" />
                <div className="text-left">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">Settlement ({selectedAccount?.currency})</p>
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
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Charge Account</label>
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {accounts.map(acc => (
              <button
                key={acc.id}
                type="button"
                onClick={() => { setSelectedAccountId(acc.id); setManualRate(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all shrink-0 ${selectedAccountId === acc.id
                  ? 'bg-platinum-100 dark:bg-neutral-800 border-gold-500/50 shadow-[0_0_10px_rgba(212,175,55,0.1)]'
                  : 'bg-white dark:bg-neutral-950 border-platinum-200 dark:border-neutral-800 opacity-60 hover:opacity-100'
                  }`}
              >
                <div className={`w-3 h-3 rounded-full ${acc.type === 'credit' ? 'bg-purple-500' :
                  acc.type === 'business' ? 'bg-gold-500' : 'bg-emerald-500'
                  }`}></div>
                <div className="text-left">
                  <p className={`text-sm font-bold ${selectedAccountId === acc.id ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>{acc.name}</p>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    •••• {acc.last4 || 'CASH'} <span className="text-gold-500/50">({acc.currency})</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Core Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Merchant Name with Enrichment */}
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Merchant / Source</label>
            <div className="relative flex gap-2">
              <div className="relative group flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Store size={16} className="text-neutral-500 group-focus-within:text-gold-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="e.g. Starbucks, Uber, Salary"
                  className="w-full bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl focus:ring-1 focus:ring-gold-500 focus:border-gold-500 block pl-11 p-3 transition-all outline-none"
                />
              </div>
              {/* Enrichment Button */}
              <button
                type="button"
                onClick={handleEnrichMerchant}
                disabled={!merchant || isLocating}
                className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 text-gold-500 hover:bg-gold-500/10 hover:border-gold-500 transition-all disabled:opacity-50"
                title="Find Location & Enrich"
              >
                {isLocating ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
              </button>
            </div>
            {locationFound && (
              <a href={locationFound.uri} target="_blank" rel="noreferrer" className="mt-2 text-[10px] text-green-500 flex items-center gap-1 hover:underline">
                <Check size={10} /> Location Found <ExternalLink size={8} />
              </a>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Date</label>
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
          <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Description (Optional)</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FileText size={16} className="text-neutral-500 group-focus-within:text-gold-500 transition-colors" />
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onFocus={() => setIsDescFocused(true)}
              onBlur={() => setTimeout(() => setIsDescFocused(false), 200)}
              placeholder="Add notes..."
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
                <Lightbulb size={10} /> Suggested: {suggestedCategory}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSplit(true)}
              className="absolute top-0 right-0 text-[10px] text-gold-500 hover:text-gold-400 font-bold flex items-center gap-1 mt-1 uppercase tracking-wide transition-colors"
            >
              <Split size={12} /> Split This Transaction
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Split size={16} className="text-gold-500" /> Split Transaction
              </h3>
              <button type="button" onClick={() => setIsSplit(false)} className="text-xs text-red-500 hover:text-red-400 font-medium">Reset</button>
            </div>
            <div className="space-y-3 mb-4">
              {splits.map((split) => (
                <div key={split.id} className="flex gap-2 items-start">
                  <div className="flex-1"><CategorySelect compact value={split.category} onChange={(val) => {
                    const newSplits = splits.map(s => s.id === split.id ? { ...s, category: val } : s);
                    setSplits(newSplits);
                  }} placeholder="Category..." /></div>
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
              <button type="button" onClick={() => setSplits([...splits, { id: Date.now(), category: '', amount: '' }])} className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1"><Plus size={14} /> Add Split</button>
              <p className={`text-xs font-mono font-bold ${Math.abs(remainingSplit) > 0.05 ? 'text-red-500' : 'text-green-500'}`}>
                {remainingSplit > 0 ? 'Remaining: ' : remainingSplit < 0 ? 'Over: ' : 'Matched: '} {currencyObj?.symbol}{Math.abs(remainingSplit).toFixed(2)}
              </p>
            </div>
          </div >
        )}

        {/* 6. Recurring Logic */}
        <div className="bg-platinum-50 dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all">
          <button type="button" onClick={() => setIsRecurring(!isRecurring)} className="w-full p-4 flex items-center justify-between hover:bg-white dark:hover:bg-neutral-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${isRecurring ? 'bg-gold-500 text-neutral-950' : 'bg-platinum-200 dark:bg-neutral-950 text-neutral-500'}`}><Repeat size={18} /></div>
              <div className="text-left"><p className={`text-sm font-bold ${isRecurring ? 'text-gold-500' : 'text-neutral-500 dark:text-neutral-400'}`}>Recurring Payment</p></div>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${isRecurring ? 'bg-gold-500' : 'bg-platinum-300 dark:bg-neutral-800'}`}><div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${isRecurring ? 'left-6' : 'left-1'}`}></div></div>
          </button>
          {isRecurring && (
            <div className="p-4 pt-0 animate-fade-in border-t border-platinum-200 dark:border-neutral-800 mt-2 bg-platinum-100 dark:bg-neutral-900/50">
              <div className="pt-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Frequency</label>
                  <select value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)} className="w-full bg-white dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500">
                    <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">End Date</label>
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
              <div className="text-left"><p className={`text-sm font-bold ${isBusiness ? 'text-gold-500' : 'text-neutral-500 dark:text-neutral-400'}`}>Business Expense</p></div>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${isBusiness ? 'bg-gold-500' : 'bg-platinum-300 dark:bg-neutral-800'}`}><div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${isBusiness ? 'left-6' : 'left-1'}`}></div></div>
          </button>
          {isBusiness && (
            <div className="p-4 pt-0 animate-fade-in border-t border-platinum-200 dark:border-neutral-800 mt-2 bg-platinum-100 dark:bg-neutral-900/50">
              <div className="pt-4">
                <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Assign Entity</label>
                <select value={businessEntityId} onChange={(e) => setBusinessEntityId(e.target.value)} className="w-full bg-white dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500">
                  <option value="">Select Business Unit...</option>
                  <optgroup label="Physical Stores">{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
                  <optgroup label="Digital Channels">{channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-6 flex gap-3 border-t border-neutral-800 mt-6">
          {initialData && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 min-w-[100px] font-bold text-sm"
            >
              <Trash2 size={18} />
              <span>Delete</span>
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-bold text-sm hover:text-neutral-900 dark:hover:text-white hover:bg-platinum-50 dark:hover:bg-neutral-800 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!amount || !merchant || !date || !isSplitValid}
            className="flex-[2] py-3.5 rounded-xl bg-gold-500 text-neutral-950 font-bold text-sm hover:bg-gold-400 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {initialData ? <Check size={18} /> : <Plus size={18} />}
            {initialData ? 'Update Transaction' : 'Add Transaction'}
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
