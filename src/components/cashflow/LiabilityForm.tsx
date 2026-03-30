
import React, { useState } from 'react';
import { X, Save, Trash2, Lock, Unlock } from 'lucide-react';
import { PersonalLiability, LiabilityType } from '../../types';

interface LiabilityFormProps {
  initialData?: PersonalLiability | null;
  baseCurrency: string;
  onSave: (liability: PersonalLiability) => void;
  onCancel: () => void;
  onDelete?: () => void;
  t: (key: string) => string;
}

const LIABILITY_TYPES: { value: LiabilityType; label: string }[] = [
  { value: 'credit_card', label: '💳 Credit Card' },
  { value: 'personal_loan', label: '🤝 Personal Loan' },
  { value: 'auto_loan', label: '🚗 Auto Loan' },
  { value: 'mortgage', label: '🏠 Mortgage' },
  { value: 'family_debt', label: '👨‍👩‍👧 Family Debt' },
  { value: 'legal_obligation', label: '⚖️ Legal Obligation' },
  { value: 'contractual', label: '📝 Contractual' },
  { value: 'student_loan', label: '🎓 Student Loan' },
  { value: 'medical_debt', label: '🏥 Medical Debt' },
  { value: 'tax_debt', label: '🏛️ Tax Debt' },
  { value: 'other', label: '📦 Other' },
];



export const LiabilityForm: React.FC<LiabilityFormProps> = ({
  initialData,
  baseCurrency,
  onSave,
  onCancel,
  onDelete,
  t
}) => {
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<LiabilityType>(initialData?.type || 'credit_card');

  const [currentBalance, setCurrentBalance] = useState(initialData?.currentBalance?.toString() || '');
  const [monthlyPayment, setMonthlyPayment] = useState(initialData?.monthlyPayment?.toString() || '');
  const [interestRate, setInterestRate] = useState(initialData?.interestRate?.toString() || '');
  const [remainingTermMonths, setRemainingTermMonths] = useState(initialData?.remainingTermMonths?.toString() || '');
  const [hasCollateral, setHasCollateral] = useState(initialData?.hasCollateral || false);
  const [collateralDescription, setCollateralDescription] = useState(initialData?.collateralDescription || '');
  const [currency, setCurrency] = useState(initialData?.currency || baseCurrency);
  const [startDate, setStartDate] = useState(initialData?.startDate || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleSave = () => {
    if (!name.trim() || !currentBalance) return;

    const liability: PersonalLiability = {
      id: initialData?.id || crypto.randomUUID(),
      name: name.trim(),
      type,
      currentBalance: parseFloat(currentBalance) || 0,
      monthlyPayment: parseFloat(monthlyPayment) || 0,
      interestRate: parseFloat(interestRate) || 0,
      remainingTermMonths: parseInt(remainingTermMonths) || 0,
      hasCollateral,
      collateralDescription: hasCollateral ? collateralDescription.trim() : undefined,
      currency,
      startDate: startDate || undefined,
      notes: notes.trim() || undefined,
    };
    onSave(liability);
  };

  return (
    <div className="min-h-screen bg-neutral-950/50 animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-20 glass border-b border-white/10 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-all">
            <X size={20} />
          </button>
          <h2 className="text-lg font-display font-bold text-white">
            {isEditing ? (t('cashflow.editLiability') || 'Edit Liability') : (t('cashflow.newLiability') || 'New Liability')}
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
            disabled={!name.trim() || !currentBalance}
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
            {t('cashflow.liabilityName') || 'Liability Name'}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Chase Sapphire, Car Loan, Mortgage..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all"
          />
        </div>

        {/* Type */}
        <div>
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
            {t('cashflow.liabilityType') || 'Liability Type'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LIABILITY_TYPES.map(lt => (
              <button
                key={lt.value}
                type="button"
                onClick={() => setType(lt.value)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border ${
                  type === lt.value
                    ? 'bg-gold-500/10 border-gold-500/30 text-gold-500'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                {lt.label}
              </button>
            ))}
          </div>
        </div>



        {/* Financial Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
              {t('cashflow.currentBalance') || 'Current Balance'}
            </label>
            <input
              type="number"
              value={currentBalance}
              onChange={e => setCurrentBalance(e.target.value)}
              placeholder="0.00"
              min="0" step="0.01"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono placeholder:text-neutral-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
              {t('cashflow.monthlyPaymentLabel') || 'Monthly Payment'}
            </label>
            <input
              type="number"
              value={monthlyPayment}
              onChange={e => setMonthlyPayment(e.target.value)}
              placeholder="0.00"
              min="0" step="0.01"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono placeholder:text-neutral-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
              {t('cashflow.interestRate') || 'Interest Rate (APR %)'}
            </label>
            <input
              type="number"
              value={interestRate}
              onChange={e => setInterestRate(e.target.value)}
              placeholder="0.0"
              min="0" max="100" step="0.1"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono placeholder:text-neutral-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
              {t('cashflow.remainingTerm') || 'Remaining Term (Months)'}
            </label>
            <input
              type="number"
              value={remainingTermMonths}
              onChange={e => setRemainingTermMonths(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono placeholder:text-neutral-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none"
            />
          </div>
        </div>

        {/* Currency */}
        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
              {t('cashflow.startDate') || 'Start Date (Optional)'}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none"
            />
          </div>
        </div>

        {/* Collateral */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setHasCollateral(!hasCollateral)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border ${
              hasCollateral
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center gap-3">
              {hasCollateral ? <Lock size={18} className="text-blue-400" /> : <Unlock size={18} className="text-neutral-500" />}
              <div className="text-left">
                <span className={`text-sm font-bold ${hasCollateral ? 'text-blue-400' : 'text-white'}`}>
                  {t('cashflow.hasCollateral') || 'Has Collateral / Guarantee'}
                </span>
                <p className="text-[10px] text-neutral-500">{t('cashflow.collateralDesc') || 'Is this debt backed by an asset?'}</p>
              </div>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${hasCollateral ? 'bg-blue-500' : 'bg-neutral-700'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${hasCollateral ? 'left-5' : 'left-0.5'}`} />
            </div>
          </button>

          {hasCollateral && (
            <input
              type="text"
              value={collateralDescription}
              onChange={e => setCollateralDescription(e.target.value)}
              placeholder="e.g. Property at 123 Main St, Vehicle VIN..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none animate-fade-in"
            />
          )}
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
            placeholder="Additional details about this liability..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
};
