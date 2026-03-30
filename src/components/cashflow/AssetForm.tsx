
import React, { useState } from 'react';
import { X, Save, Trash2, ChevronDown } from 'lucide-react';
import { PersonalAsset, AssetType, AssetCategory, AssetClassification } from '../../types';

interface AssetFormProps {
  initialData?: PersonalAsset | null;
  baseCurrency: string;
  onSave: (asset: PersonalAsset) => void;
  onCancel: () => void;
  onDelete?: () => void;
  t: (key: string) => string;
}

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'liquid', label: 'Liquid' },
  { value: 'financial', label: 'Financial' },
  { value: 'real_physical', label: 'Real / Physical' },
  { value: 'business', label: 'Business' },
  { value: 'other', label: 'Other' },
];

const CATEGORIES_BY_TYPE: Record<AssetType, { value: AssetCategory; label: string }[]> = {
  liquid: [
    { value: 'liquid_cash', label: 'Cash' },
    { value: 'liquid_bank_account', label: 'Bank Account' },
    { value: 'liquid_savings', label: 'High-Yield Savings' },
  ],
  financial: [
    { value: 'financial_long_term', label: 'Long-Term Investment' },
    { value: 'financial_investment', label: 'Investment Account' },
  ],
  real_physical: [
    { value: 'real_housing', label: 'Housing / Primary Residence' },
    { value: 'real_property', label: 'Other Property' },
    { value: 'real_vehicle', label: 'Vehicle' },
    { value: 'real_equipment', label: 'Equipment / Tools' },
    { value: 'real_jewelry', label: 'Jewelry / Valuables' },
  ],
  business: [
    { value: 'business_equity', label: 'Business Equity / Ownership' },
    { value: 'business_inventory', label: 'Business Inventory' },
    { value: 'business_machinery', label: 'Machinery' },
    { value: 'business_other', label: 'Other Business Asset' },
  ],
  other: [
    { value: 'other_convertible', label: 'Convertible to Cash' },
  ],
};

const CLASSIFICATIONS: { value: AssetClassification; label: string; desc: string }[] = [
  { value: 'productive', label: '💰 Productive', desc: 'Generates recurring income (rent, dividends, etc.)' },
  { value: 'defensive', label: '🛡️ Defensive', desc: 'Preserves value, emergency reserves' },
  { value: 'consumption', label: '🏠 Consumption', desc: 'Personal use, depreciates over time' },
  { value: 'intangible', label: '🧠 Intangible', desc: 'Intellectual property, licenses, skills' },
];

export const AssetForm: React.FC<AssetFormProps> = ({
  initialData,
  baseCurrency,
  onSave,
  onCancel,
  onDelete,
  t
}) => {
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<AssetType>(initialData?.type || 'liquid');
  const [category, setCategory] = useState<AssetCategory>(initialData?.category || 'liquid_cash');
  const [classification, setClassification] = useState<AssetClassification>(initialData?.classification || 'consumption');
  const [estimatedValue, setEstimatedValue] = useState(initialData?.estimatedValue?.toString() || '');
  const [currency, setCurrency] = useState(initialData?.currency || baseCurrency);
  const [acquisitionDate, setAcquisitionDate] = useState(initialData?.acquisitionDate || '');
  const [monthlyIncome, setMonthlyIncome] = useState(initialData?.monthlyIncome?.toString() || '');
  const [depreciationRate, setDepreciationRate] = useState(initialData?.depreciationRateAnnual?.toString() || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleTypeChange = (newType: AssetType) => {
    setType(newType);
    const cats = CATEGORIES_BY_TYPE[newType];
    if (cats.length > 0) setCategory(cats[0].value);
  };

  const handleSave = () => {
    if (!name.trim() || !estimatedValue) return;

    const asset: PersonalAsset = {
      id: initialData?.id || crypto.randomUUID(),
      name: name.trim(),
      type,
      category,
      classification,
      estimatedValue: parseFloat(estimatedValue) || 0,
      currency,
      acquisitionDate: acquisitionDate || undefined,
      monthlyIncome: parseFloat(monthlyIncome) || 0,
      depreciationRateAnnual: parseFloat(depreciationRate) || 0,
      notes: notes.trim() || undefined,
      lastValuationDate: new Date().toISOString().split('T')[0],
    };
    onSave(asset);
  };

  const availableCategories = CATEGORIES_BY_TYPE[type] || [];

  return (
    <div className="min-h-screen bg-neutral-950/50 animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-20 glass border-b border-white/10 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-all">
            <X size={20} />
          </button>
          <h2 className="text-lg font-display font-bold text-white">
            {isEditing ? (t('cashflow.editAsset') || 'Edit Asset') : (t('cashflow.newAsset') || 'New Asset')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button onClick={onDelete} className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all">
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!name.trim() || !estimatedValue}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-400 text-neutral-900 font-bold rounded-xl shadow-lg shadow-gold-500/20 hover:shadow-gold-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isEditing ? (t('common.save') || 'Save') : (t('common.add') || 'Add')}
          </button>
        </div>
      </div>

      {/* Form Body */}
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Name */}
        <div>
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
            {t('cashflow.assetName') || 'Asset Name'}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Primary Residence, Emergency Fund..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all"
          />
        </div>

        {/* Type */}
        <div>
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
            {t('cashflow.assetType') || 'Asset Type'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {ASSET_TYPES.map(at => (
              <button
                key={at.value}
                type="button"
                onClick={() => handleTypeChange(at.value)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold text-center transition-all border ${
                  type === at.value
                    ? 'bg-gold-500/10 border-gold-500/30 text-gold-500'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                {at.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
            {t('cashflow.category') || 'Category'}
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as AssetCategory)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none appearance-none"
          >
            {availableCategories.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Classification */}
        <div>
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
            {t('cashflow.classification') || 'Classification'}
          </label>
          <div className="space-y-2">
            {CLASSIFICATIONS.map(cls => (
              <button
                key={cls.value}
                type="button"
                onClick={() => setClassification(cls.value)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all border ${
                  classification === cls.value
                    ? 'bg-gold-500/10 border-gold-500/30'
                    : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div>
                  <span className={`text-sm font-bold ${classification === cls.value ? 'text-gold-500' : 'text-white'}`}>{cls.label}</span>
                  <p className="text-[10px] text-neutral-500 mt-0.5">{cls.desc}</p>
                </div>
                {classification === cls.value && (
                  <div className="w-2 h-2 rounded-full bg-gold-500 shadow-[0_0_8px_#D4AF37]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Value & Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
              {t('cashflow.estimatedValue') || 'Estimated Value'}
            </label>
            <input
              type="number"
              value={estimatedValue}
              onChange={e => setEstimatedValue(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono placeholder:text-neutral-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
              {t('cashflow.currency') || 'Currency'}
            </label>
            <input
              type="text"
              value={currency}
              onChange={e => setCurrency(e.target.value.toUpperCase())}
              maxLength={3}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none"
            />
          </div>
        </div>

        {/* Monthly Income (for productive assets) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
              {t('cashflow.monthlyIncomeLabel') || 'Monthly Income (Optional)'}
            </label>
            <input
              type="number"
              value={monthlyIncome}
              onChange={e => setMonthlyIncome(e.target.value)}
              placeholder="Rent, dividends..."
              min="0"
              step="0.01"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono placeholder:text-neutral-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
              {t('cashflow.depreciation') || 'Depreciation Rate/Yr (%)'}
            </label>
            <input
              type="number"
              value={depreciationRate}
              onChange={e => setDepreciationRate(e.target.value)}
              placeholder="0"
              min="0" max="100" step="0.1"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono placeholder:text-neutral-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none"
            />
          </div>
        </div>

        {/* Acquisition Date */}
        <div>
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
            {t('cashflow.acquisitionDate') || 'Acquisition Date (Optional)'}
          </label>
          <input
            type="date"
            value={acquisitionDate}
            onChange={e => setAcquisitionDate(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
            {t('cashflow.notes') || 'Notes (Optional)'}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional details..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
};
