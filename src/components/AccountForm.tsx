
import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Building, Wallet, CreditCard, Bitcoin, TrendingUp, Palette, ShieldCheck, CalendarClock, Percent, Briefcase, FileText, Landmark } from 'lucide-react';
import { Account, BusinessAccountDetails } from '../types';
import { CURRENCIES } from '../constants';
import { useBusiness } from '../contexts/BusinessContext';


interface AccountFormProps {
  initialData?: Account | null;
  onSave: (account: Account) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}

const ACCOUNT_TYPES = [
  { id: 'checking', label: 'Checking', icon: Wallet },
  { id: 'business', label: 'Business', icon: Briefcase }, // New Business Type
  { id: 'savings', label: 'Savings', icon: Building },
  { id: 'credit', label: 'Credit Card', icon: CreditCard },
  { id: 'investment', label: 'Investment', icon: TrendingUp },
  { id: 'crypto', label: 'Crypto', icon: Bitcoin },
];

const CARD_THEMES = [
  { id: 't1', label: 'Obsidian', class: 'bg-gradient-to-br from-neutral-800 to-neutral-900' },
  { id: 't2', label: 'Midnight', class: 'bg-gradient-to-br from-neutral-900 to-black' },
  { id: 't3', label: 'Gold Standard', class: 'bg-gradient-to-br from-gold-600 to-gold-700' },
  { id: 't4', label: 'Royal Blue', class: 'bg-gradient-to-br from-blue-900 to-neutral-900' },
  { id: 't5', label: 'Crimson', class: 'bg-gradient-to-br from-red-900 to-neutral-900' },
  { id: 't6', label: 'Emerald', class: 'bg-gradient-to-br from-emerald-800 to-neutral-900' },
  { id: 't7', label: 'Bitcoin Orange', class: 'bg-gradient-to-br from-orange-500 to-orange-700' },
  { id: 't8', label: 'Platinum', class: 'bg-gradient-to-br from-neutral-400 to-neutral-600' },
];

export const AccountForm: React.FC<AccountFormProps> = ({ initialData, onSave, onDelete, onCancel }) => {
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [type, setType] = useState<Account['type']>('checking');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [color, setColor] = useState(CARD_THEMES[0].class);
  const [last4, setLast4] = useState('');

  // Credit Specifics
  const [creditLimit, setCreditLimit] = useState('');
  const [apr, setApr] = useState('');
  const [statementDay, setStatementDay] = useState('1');
  const [dueDay, setDueDay] = useState('25');

  // Business Specifics
  const [taxId, setTaxId] = useState('');
  const [entityType, setEntityType] = useState<BusinessAccountDetails['entityType']>('LLC');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [overdraftLimit, setOverdraftLimit] = useState('');

  // Business Integration
  const { entities: businessEntities } = useBusiness();
  const [linkedBusinessId, setLinkedBusinessId] = useState('');


  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setInstitution(initialData.institution);
      setType(initialData.type);
      setBalance(Math.abs(initialData.balance).toString());
      setCurrency(initialData.currency);
      setColor(initialData.color);
      setLast4(initialData.last4 || '');

      if (initialData.creditDetails) {
        setCreditLimit(initialData.creditDetails.limit.toString());
        setStatementDay(initialData.creditDetails.statementDay.toString());
        setDueDay(initialData.creditDetails.paymentDueDay.toString());
        setApr(initialData.creditDetails.apr ? initialData.creditDetails.apr.toString() : '');
      }

      if (initialData.businessDetails) {
        setTaxId(initialData.businessDetails.taxId || '');
        setEntityType(initialData.businessDetails.entityType);
        setMonthlyFee(initialData.businessDetails.monthlyFee ? initialData.businessDetails.monthlyFee.toString() : '');
        setOverdraftLimit(initialData.businessDetails.overdraftLimit ? initialData.businessDetails.overdraftLimit.toString() : '');
        setLinkedBusinessId(initialData.linked_business_id || '');
      }
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !balance) return;

    const numBalance = parseFloat(balance);
    let finalBalance = numBalance;
    // For credit, usually debt is negative, but allow flexibility
    if (type === 'credit' && numBalance > 0) {
      finalBalance = -numBalance;
    }

    const newAccount: Account = {
      id: initialData ? initialData.id : crypto.randomUUID(),
      name,
      institution: institution || 'Unknown Bank',
      type,
      balance: finalBalance,
      // If editing, preserve the existing initialBalance.
      // If creating, assume the input balance is the initial starting point (snapshot).
      initialBalance: initialData ? initialData.initialBalance : finalBalance,
      currency,
      color,
      last4: last4 || undefined,
      creditDetails: type === 'credit' ? {
        limit: parseFloat(creditLimit) || 0,
        statementDay: parseInt(statementDay),
        paymentDueDay: parseInt(dueDay),
        apr: apr ? parseFloat(apr) : undefined
      } : undefined,
      businessDetails: type === 'business' ? {
        taxId: taxId || undefined,
        entityType: entityType,
        monthlyFee: parseFloat(monthlyFee) || 0,
        overdraftLimit: parseFloat(overdraftLimit) || 0
      } : undefined,
      linked_business_id: linkedBusinessId || undefined
    };

    onSave(newAccount);
  };

  const handleDelete = () => {
    if (initialData && onDelete && window.confirm("Are you sure? This will delete the account.")) {
      onDelete(initialData.id);
    }
  };

  // Helper for Day Options (1-31)
  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-[70] bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto custom-scrollbar">

        <button onClick={onCancel} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-xl font-display font-bold text-white mb-6">
          {initialData ? 'Edit Asset' : 'Add New Asset'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Institution & Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Institution</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. Chase"
                className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 transition-colors"
                autoFocus={!initialData}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Account Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === 'business' ? "e.g. Holdings LLC" : "e.g. Personal Check"}
                className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 transition-colors"
              />
            </div>
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">Asset Type</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {ACCOUNT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id as any)}
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all ${type === t.id
                    ? 'bg-neutral-800 border-gold-500/50 text-gold-500'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-700'
                    }`}
                >
                  <t.icon size={16} />
                  <span className="text-[9px] font-bold text-center">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Balance & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">
                {type === 'credit' ? 'Current Owed' : 'Current Balance'}
              </label>
              <input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 transition-colors font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 transition-colors"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                ))}
              </select>
            </div>
          </div>

          {/* --- BUSINESS ACCOUNT SPECIFIC FIELDS --- */}
          {type === 'business' && (
            <div className="bg-neutral-950/50 rounded-2xl p-4 border border-gold-500/20 space-y-4 animate-fade-in">
              <h3 className="text-xs font-bold text-gold-500 uppercase tracking-wider flex items-center gap-2">
                <Briefcase size={14} /> Business Entity Config
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase flex items-center gap-1">
                    <FileText size={10} /> Tax ID / EIN
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="e.g. 12-3456789"
                    className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase">Entity Type</label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value as any)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500"
                  >
                    <option value="LLC">LLC</option>
                    <option value="Corp">Corporation</option>
                    <option value="Sole Prop">Sole Proprietorship</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase flex items-center gap-1">
                    <Landmark size={10} /> Monthly Fee
                  </label>
                  <input
                    type="number"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase flex items-center gap-1">
                    <ShieldCheck size={10} /> Overdraft Limit
                  </label>
                  <input
                    type="number"
                    value={overdraftLimit}
                    onChange={(e) => setOverdraftLimit(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 transition-colors font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* --- CREDIT CARD SPECIFIC FIELDS --- */}
          {type === 'credit' && (
            <div className="bg-neutral-950/50 rounded-2xl p-4 border border-gold-500/20 space-y-4 animate-fade-in">
              <h3 className="text-xs font-bold text-gold-500 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={14} /> Credit Line Configuration
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase">Credit Limit</label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase flex items-center gap-1">
                    <Percent size={10} /> APR
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={apr}
                    onChange={(e) => setApr(e.target.value)}
                    placeholder="e.g. 24.99"
                    className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase flex items-center gap-1">
                    <CalendarClock size={10} /> Closing Date
                  </label>
                  <select
                    value={statementDay}
                    onChange={(e) => setStatementDay(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500"
                  >
                    {dayOptions.map(d => <option key={d} value={d}>Day {d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 uppercase flex items-center gap-1">
                    <CalendarClock size={10} /> Payment Due
                  </label>
                  <select
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500"
                  >
                    {dayOptions.map(d => <option key={d} value={d}>Day {d}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Last 4 Digits (Optional) */}
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Last 4 Digits (Optional)</label>
            <input
              type="text"
              maxLength={4}
              value={last4}
              onChange={(e) => setLast4(e.target.value)}
              placeholder="e.g. 8821"
              className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 transition-colors font-mono"
            />
          </div>

          {/* Visual Theme Selection */}
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider flex items-center gap-2">
              <Palette size={12} /> Card Theme
            </label>
            <div className="grid grid-cols-4 gap-3">
              {CARD_THEMES.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setColor(theme.class)}
                  className={`h-12 rounded-lg border-2 transition-all ${theme.class} ${color === theme.class ? 'border-white scale-105 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  title={theme.label}
                />
              ))}
            </div>
          </div>


          {/* Business Linking */}
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider flex items-center gap-2">
              <Briefcase size={12} /> Link to Business (Auto-Tagging)
            </label>
            <select
              value={linkedBusinessId}
              onChange={(e) => setLinkedBusinessId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 transition-colors"
            >
              <option value="">-- Independent Asset --</option>
              {businessEntities.map(entity => (
                <option key={entity.id} value={entity.id}>{entity.name} ({entity.type})</option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-500 mt-1">Transactions on this account will automatically be assigned to the selected business.</p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-neutral-800">

            {initialData && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 font-bold hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gold-500 text-neutral-950 font-bold hover:bg-gold-400 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <Check size={18} /> {initialData ? 'Update Asset' : 'Add Asset'}
            </button>
          </div>

        </form>
      </div >
    </div >
  );
};
