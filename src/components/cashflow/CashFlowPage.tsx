
import React, { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Plus, Trash2, Edit3, Shield, AlertTriangle, CheckCircle,
  DollarSign, BarChart3, PieChart, Wallet, Building2,
  Car, Home, Gem, Briefcase, Package, CreditCard,
  Activity, Target, Gauge, ChevronRight, Lock, Unlock,
  ArrowRight, Layers, CircleDollarSign, Scale, Banknote,
  X
} from 'lucide-react';
import { useCashFlow } from '../../contexts/CashFlowContext';
import { useAccounts } from '../../contexts/AccountsContext';
import { useTransactions } from '../../contexts/TransactionsContext';
import { useInvestments } from '../../contexts/InvestmentsContext';
import { useCashFlowMetrics } from '../../hooks/useCashFlowMetrics';
import { formatCurrency } from '../../lib/money';
import { PersonalAsset, PersonalLiability } from '../../types';
import { AssetForm } from './AssetForm';
import { LiabilityForm } from './LiabilityForm';

interface CashFlowPageProps {
  baseCurrency: string;
  t: (key: string) => string;
  language?: string;
}

// --- HELPER: Status colors ---
const getMetricColor = (status: string) => {
  switch (status) {
    case 'acceleration': case 'room': case 'ultra_defensive': case 'solid':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' };
    case 'healthy': case 'acceptable':
      return { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', glow: 'shadow-amber-500/10' };
    case 'alarm': case 'high_pressure': case 'critical': case 'high_risk':
      return { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', glow: 'shadow-rose-500/10' };
    default:
      return { bg: 'bg-neutral-500/10', text: 'text-neutral-400', border: 'border-neutral-500/20', glow: '' };
  }
};

const getStatusLabel = (status: string, t: (k: string) => string) => {
  const labels: Record<string, string> = {
    'alarm': t('cashflow.statusAlarm') || '⚠️ Below Target',
    'solid': t('cashflow.statusSolid') || '✅ Solid',
    'acceleration': t('cashflow.statusAcceleration') || '🚀 Strong Acceleration',
    'high_pressure': t('cashflow.statusHighPressure') || '🔴 High Pressure',
    'acceptable': t('cashflow.statusAcceptable') || '🟡 Acceptable',
    'room': t('cashflow.statusRoom') || '🟢 Room Available',
    'critical': t('cashflow.statusCritical') || '🚨 Critical Risk',
    'high_risk': t('cashflow.statusHighRisk') || '🔴 High Risk',
    'healthy': t('cashflow.statusHealthy') || '🟡 Healthy',
    'ultra_defensive': t('cashflow.statusUltraDefensive') || '🛡️ Ultra-Defensive',
  };
  return labels[status] || status;
};

const ASSET_TYPE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  liquid: { label: 'Liquid Assets', icon: Banknote, color: 'from-blue-500 to-cyan-500' },
  financial: { label: 'Financial Assets', icon: TrendingUp, color: 'from-emerald-500 to-teal-500' },
  real_physical: { label: 'Real/Physical Assets', icon: Home, color: 'from-amber-500 to-orange-500' },
  business: { label: 'Business Assets', icon: Briefcase, color: 'from-purple-500 to-indigo-500' },
  other: { label: 'Other Assets', icon: Package, color: 'from-slate-500 to-zinc-500' },
};

const CLASSIFICATION_LABELS: Record<string, { label: string; color: string }> = {
  productive: { label: 'Productive', color: 'bg-emerald-500' },
  defensive: { label: 'Defensive', color: 'bg-blue-500' },
  consumption: { label: 'Consumption', color: 'bg-amber-500' },
  intangible: { label: 'Intangible', color: 'bg-purple-500' },
};

const LIABILITY_TYPE_LABELS: Record<string, string> = {
  credit_card: 'Credit Card',
  personal_loan: 'Personal Loan',
  auto_loan: 'Auto Loan',
  mortgage: 'Mortgage',
  family_debt: 'Family Debt',
  legal_obligation: 'Legal Obligation',
  contractual: 'Contractual',
  student_loan: 'Student Loan',
  medical_debt: 'Medical Debt',
  tax_debt: 'Tax Debt',
  other: 'Other',
};

const EXPENSE_CLASS_LABELS: Record<string, { label: string; color: string }> = {
  fixed: { label: 'Fixed', color: 'bg-blue-500' },
  variable: { label: 'Variable', color: 'bg-amber-500' },
  semi_fixed: { label: 'Semi-Fixed', color: 'bg-cyan-500' },
  operational: { label: 'Operational', color: 'bg-emerald-500' },
  non_operational: { label: 'Non-Operational', color: 'bg-slate-500' },
  unnecessary: { label: 'Unnecessary', color: 'bg-rose-500' },
  discretionary: { label: 'Discretionary', color: 'bg-purple-500' },
};

// --- MINI DONUT CHART ---
const MiniDonut: React.FC<{ segments: { value: number; color: string; label: string }[]; size?: number }> = ({ segments, size = 120 }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full border-4 border-neutral-700/30 flex items-center justify-center">
        <span className="text-xs text-neutral-500">No data</span>
      </div>
    </div>
  );

  let cumulativePercent = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="transform -rotate-90">
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const percent = (seg.value / total) * 100;
        const dashArray = `${(percent / 100) * circumference} ${circumference}`;
        const dashOffset = -((cumulativePercent / 100) * circumference);
        cumulativePercent += percent;

        return (
          <circle
            key={i}
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className={seg.color}
            style={{ transition: 'all 0.8s ease' }}
          />
        );
      })}
    </svg>
  );
};

// --- GAUGE COMPONENT ---
const MetricGauge: React.FC<{
  value: number;
  maxValue: number;
  label: string;
  displayValue: string;
  status: string;
  icon: any;
  description: string;
  t: (k: string) => string;
}> = ({ value, maxValue, label, displayValue, status, icon: Icon, description, t }) => {
  const colors = getMetricColor(status);
  const fillPercent = Math.min(100, (value / maxValue) * 100);

  return (
    <div className={`glass rounded-[1.5rem] p-5 md:p-6 shadow-xl ${colors.border} border transition-all hover:scale-[1.01] group`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${colors.bg}`}>
            <Icon size={18} className={colors.text} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{label}</h4>
            <p className="text-[10px] text-neutral-400 mt-0.5">{description}</p>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between mb-3">
        <span className={`text-3xl font-display font-bold tracking-tight ${colors.text}`}>{displayValue}</span>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${colors.bg} ${colors.text} uppercase tracking-wider`}>
          {getStatusLabel(status, t)}
        </span>
      </div>

      <div className="w-full bg-neutral-800/50 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            status === 'alarm' || status === 'high_pressure' || status === 'critical' || status === 'high_risk'
              ? 'bg-gradient-to-r from-rose-600 to-rose-400'
              : status === 'acceptable' || status === 'healthy'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
          }`}
          style={{ width: `${Math.min(100, Math.max(4, fillPercent))}%` }}
        />
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const CashFlowPage: React.FC<CashFlowPageProps> = ({
  baseCurrency,
  t,
  language = 'en'
}) => {
  const locale = language === 'es' ? 'es-MX' : 'en-US';
  const { assets, liabilities, addAsset, updateAsset, deleteAsset, addLiability, updateLiability, deleteLiability, loading } = useCashFlow();
  const { accounts } = useAccounts();
  const { transactions } = useTransactions();
  const { investments } = useInvestments();

  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<PersonalAsset | null>(null);
  const [showLiabilityForm, setShowLiabilityForm] = useState(false);
  const [editingLiability, setEditingLiability] = useState<PersonalLiability | null>(null);
  const [assetView, setAssetView] = useState<'type' | 'classification'>('type');

  const metrics = useCashFlowMetrics({
    assets,
    liabilities,
    accounts,
    transactions,
    investments,
    baseCurrency,
  });

  const fmt = (val: number) => formatCurrency(val, baseCurrency, { locale });
  const fmtPct = (val: number) => `${(val * 100).toFixed(1)}%`;
  const fmtMonths = (val: number) => `${val.toFixed(1)}`;

  // Donut data for assets by type
  const assetTypeDonut = useMemo(() => [
    { value: metrics.liquidAssets, color: 'text-blue-500', label: 'Liquid' },
    { value: metrics.financialAssets, color: 'text-emerald-500', label: 'Financial' },
    { value: metrics.realAssets, color: 'text-amber-500', label: 'Real' },
    { value: metrics.businessAssets, color: 'text-purple-500', label: 'Business' },
    { value: metrics.otherAssets, color: 'text-slate-400', label: 'Other' },
  ], [metrics]);

  const assetClassDonut = useMemo(() => [
    { value: metrics.productiveAssets, color: 'text-emerald-500', label: 'Productive' },
    { value: metrics.defensiveAssets, color: 'text-blue-500', label: 'Defensive' },
    { value: metrics.consumptionAssets, color: 'text-amber-500', label: 'Consumption' },
    { value: metrics.intangibleAssets, color: 'text-purple-500', label: 'Intangible' },
  ], [metrics]);

  // Liability averages
  const avgInterest = liabilities.length > 0
    ? liabilities.reduce((s, l) => s + l.interestRate, 0) / liabilities.length
    : 0;

  // --- FORM HANDLERS ---
  const handleSaveAsset = (asset: PersonalAsset) => {
    if (editingAsset) {
      updateAsset(asset);
    } else {
      addAsset(asset);
    }
    setShowAssetForm(false);
    setEditingAsset(null);
  };

  const handleSaveLiability = (liability: PersonalLiability) => {
    if (editingLiability) {
      updateLiability(liability);
    } else {
      addLiability(liability);
    }
    setShowLiabilityForm(false);
    setEditingLiability(null);
  };

  // --- FORM RENDERS ---
  if (showAssetForm) {
    return (
      <AssetForm
        initialData={editingAsset}
        baseCurrency={baseCurrency}
        onSave={handleSaveAsset}
        onCancel={() => { setShowAssetForm(false); setEditingAsset(null); }}
        onDelete={editingAsset ? () => { deleteAsset(editingAsset.id); setShowAssetForm(false); setEditingAsset(null); } : undefined}
        t={t}
      />
    );
  }

  if (showLiabilityForm) {
    return (
      <LiabilityForm
        initialData={editingLiability}
        baseCurrency={baseCurrency}
        onSave={handleSaveLiability}
        onCancel={() => { setShowLiabilityForm(false); setEditingLiability(null); }}
        onDelete={editingLiability ? () => { deleteLiability(editingLiability.id); setShowLiabilityForm(false); setEditingLiability(null); } : undefined}
        t={t}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* ============ ROW 1: NET WORTH & CASH FLOW ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* NET WORTH HERO */}
        <div className="relative overflow-hidden glass rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 shadow-2xl group transition-transform hover:scale-[1.003]">
          <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
          <div className="absolute top-0 right-0 p-8 opacity-[0.04]">
            <Scale size={200} className="text-white transform rotate-12" />
          </div>

          <div className="relative z-10">
            <h3 className="text-xs font-bold text-gold-600 dark:text-gold-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
              <CircleDollarSign size={14} />
              {t('cashflow.netWorth') || 'Net Worth'}
            </h3>
            <div className="flex items-baseline gap-4 mb-6">
              <span className={`text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tighter ${metrics.netWorth >= 0 ? 'text-white' : 'text-rose-400'}`}>
                {fmt(metrics.netWorth)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/10">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    {t('cashflow.totalAssets') || 'Total Assets'}
                  </span>
                </div>
                <span className="text-xl font-display font-bold text-emerald-400">{fmt(metrics.totalAssets)}</span>
              </div>
              <div className="bg-rose-500/10 rounded-2xl p-4 border border-rose-500/10">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownRight size={14} className="text-rose-500" />
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                    {t('cashflow.totalLiabilities') || 'Total Liabilities'}
                  </span>
                </div>
                <span className="text-xl font-display font-bold text-rose-400">{fmt(metrics.totalLiabilities)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MONTHLY DASHBOARD STRIP */}
        <div className="glass rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 shadow-xl">
          <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-2 mb-5">
            <Activity size={14} className="text-gold-500" />
            {t('cashflow.monthlyDashboard') || 'Monthly Dashboard'}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Net Income */}
            <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10">
              <p className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-wider mb-1">
                {t('cashflow.netIncome') || 'Net Income'}
              </p>
              <p className="text-lg font-bold text-emerald-400 font-mono">{fmt(metrics.monthlyNetIncome)}</p>
            </div>

            {/* Total Expenses */}
            <div className="bg-rose-500/5 rounded-xl p-3 border border-rose-500/10">
              <p className="text-[9px] font-bold text-rose-400/70 uppercase tracking-wider mb-1">
                {t('cashflow.totalExpenses') || 'Total Expenses'}
              </p>
              <p className="text-lg font-bold text-rose-400 font-mono">{fmt(metrics.monthlyTotalExpenses)}</p>
            </div>

            {/* Cash Flow */}
            <div className={`rounded-xl p-3 border ${metrics.monthlyCashFlow >= 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                {t('cashflow.cashFlow') || 'Cash Flow'}
              </p>
              <p className={`text-lg font-bold font-mono ${metrics.monthlyCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {fmt(metrics.monthlyCashFlow)}
              </p>
            </div>

            {/* Savings + Investment */}
            <div className="bg-blue-500/5 rounded-xl p-3 border border-blue-500/10">
              <p className="text-[9px] font-bold text-blue-400/70 uppercase tracking-wider mb-1">
                {t('cashflow.savingsInvestment') || 'Savings + Investment'}
              </p>
              <p className="text-lg font-bold text-blue-400 font-mono">{fmt(metrics.monthlySavingsInvestment)}</p>
            </div>

            {/* Debt Payments */}
            <div className="bg-orange-500/5 rounded-xl p-3 border border-orange-500/10">
              <p className="text-[9px] font-bold text-orange-400/70 uppercase tracking-wider mb-1">
                {t('cashflow.debtPayments') || 'Debt Payments'}
              </p>
              <p className="text-lg font-bold text-orange-400 font-mono">{fmt(metrics.monthlyDebtPayments)}</p>
            </div>

            {/* Savings Rate */}
            <div className={`rounded-xl p-3 border ${getMetricColor(metrics.savingsRateStatus).border} ${getMetricColor(metrics.savingsRateStatus).bg}`}>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                {t('cashflow.savingsRateLabel') || 'Savings Rate'}
              </p>
              <p className={`text-lg font-bold font-mono ${getMetricColor(metrics.savingsRateStatus).text}`}>
                {fmtPct(metrics.savingsRate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============ ROW 2: KEY METRICS GAUGES ============ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <MetricGauge
          value={metrics.savingsRate * 100}
          maxValue={50}
          label={t('cashflow.savingsRateLabel') || 'Savings Rate'}
          displayValue={fmtPct(metrics.savingsRate)}
          status={metrics.savingsRateStatus}
          icon={Target}
          description={t('cashflow.savingsRateDesc') || '(Savings + Investment) / Net Income'}
          t={t}
        />
        <MetricGauge
          value={metrics.dti * 100}
          maxValue={60}
          label={t('cashflow.dtiLabel') || 'Debt-to-Income (DTI)'}
          displayValue={fmtPct(metrics.dti)}
          status={metrics.dtiStatus}
          icon={Scale}
          description={t('cashflow.dtiDesc') || 'Monthly Debt Payments / Net Income'}
          t={t}
        />
        <MetricGauge
          value={metrics.liquidityMonths}
          maxValue={15}
          label={t('cashflow.liquidityLabel') || 'Liquidity Months'}
          displayValue={`${fmtMonths(metrics.liquidityMonths)} mo`}
          status={metrics.liquidityStatus}
          icon={Shield}
          description={t('cashflow.liquidityDesc') || 'Liquid Assets / Monthly Expenses'}
          t={t}
        />
      </div>

      {/* ============ ROW 3: ASSETS BREAKDOWN ============ */}
      <div className="glass rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Layers size={18} className="text-emerald-500" />
              {t('cashflow.assetsTitle') || 'Asset Registry'}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">{assets.length} {t('cashflow.registered') || 'registered'}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-neutral-800/50 rounded-xl p-1">
              <button
                onClick={() => setAssetView('type')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${assetView === 'type' ? 'bg-gold-500/20 text-gold-500' : 'text-neutral-500 hover:text-white'}`}
              >
                {t('cashflow.byType') || 'By Type'}
              </button>
              <button
                onClick={() => setAssetView('classification')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${assetView === 'classification' ? 'bg-gold-500/20 text-gold-500' : 'text-neutral-500 hover:text-white'}`}
              >
                {t('cashflow.byClass') || 'By Class'}
              </button>
            </div>

            <button
              onClick={() => { setEditingAsset(null); setShowAssetForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
            >
              <Plus size={14} /> {t('cashflow.addAsset') || 'Add Asset'}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Donut */}
          <div className="flex flex-col items-center justify-center gap-4 lg:min-w-[180px]">
            <MiniDonut segments={assetView === 'type' ? assetTypeDonut : assetClassDonut} size={140} />
            <div className="flex flex-wrap gap-2 justify-center">
              {(assetView === 'type' ? assetTypeDonut : assetClassDonut).filter(s => s.value > 0).map(seg => (
                <div key={seg.label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${seg.color.replace('text-', 'bg-')}`} />
                  <span className="text-[10px] text-neutral-400 font-medium">{seg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {assets.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <Wallet size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">{t('cashflow.noAssets') || 'No assets registered yet'}</p>
                <p className="text-xs mt-1 opacity-70">{t('cashflow.addFirstAsset') || 'Register your first asset to start tracking'}</p>
              </div>
            ) : (
              assets.map(asset => {
                const typeInfo = ASSET_TYPE_LABELS[asset.type] || ASSET_TYPE_LABELS.other;
                const classInfo = CLASSIFICATION_LABELS[asset.classification];
                const TypeIcon = typeInfo.icon;

                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-gold-500/20 transition-all group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${typeInfo.color} bg-opacity-20`}>
                        <TypeIcon size={16} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{asset.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-neutral-500">{typeInfo.label}</span>
                          {classInfo && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${classInfo.color}/20 ${classInfo.color.replace('bg-', 'text-')}`}>
                              {classInfo.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {asset.monthlyIncome ? (
                        <span className="text-[10px] text-emerald-400 font-mono">+{fmt(asset.monthlyIncome)}/mo</span>
                      ) : null}
                      <span className="text-sm font-bold text-white font-mono">{fmt(asset.estimatedValue)}</span>
                      <button
                        onClick={() => { setEditingAsset(asset); setShowAssetForm(true); }}
                        className="p-1.5 rounded-lg text-neutral-600 hover:text-gold-500 hover:bg-gold-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ============ ROW 4: LIABILITIES ============ */}
      <div className="glass rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <CreditCard size={18} className="text-rose-500" />
              {t('cashflow.liabilitiesTitle') || 'Liabilities & Debts'}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">{liabilities.length} {t('cashflow.registered') || 'registered'}</p>
          </div>

          <button
            onClick={() => { setEditingLiability(null); setShowLiabilityForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-500/20 transition-all border border-rose-500/20"
          >
            <Plus size={14} /> {t('cashflow.addLiability') || 'Add Liability'}
          </button>
        </div>

        {/* Summary Cards */}
        {liabilities.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-rose-500/5 rounded-xl p-3 border border-rose-500/10 text-center">
              <p className="text-[9px] font-bold text-rose-400/60 uppercase tracking-wider">{t('cashflow.totalBalance') || 'Total Balance'}</p>
              <p className="text-lg font-bold text-rose-400 font-mono mt-1">{fmt(metrics.totalLiabilities)}</p>
            </div>
            <div className="bg-orange-500/5 rounded-xl p-3 border border-orange-500/10 text-center">
              <p className="text-[9px] font-bold text-orange-400/60 uppercase tracking-wider">{t('cashflow.totalMonthly') || 'Monthly Payments'}</p>
              <p className="text-lg font-bold text-orange-400 font-mono mt-1">{fmt(metrics.monthlyDebtPayments)}</p>
            </div>
            <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/10 text-center">
              <p className="text-[9px] font-bold text-amber-400/60 uppercase tracking-wider">{t('cashflow.avgRate') || 'Avg Interest Rate'}</p>
              <p className="text-lg font-bold text-amber-400 font-mono mt-1">{avgInterest.toFixed(1)}%</p>
            </div>
          </div>
        )}

        {/* Liability List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {liabilities.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <CheckCircle size={40} className="mx-auto mb-3 text-emerald-500/30" />
              <p className="text-sm font-medium">{t('cashflow.noLiabilities') || 'No liabilities registered'}</p>
              <p className="text-xs mt-1 opacity-70">{t('cashflow.debtFree') || 'Debt-free status!'}</p>
            </div>
          ) : (
            liabilities.map(liability => {
              const expenseInfo = EXPENSE_CLASS_LABELS[liability.expenseClass] || EXPENSE_CLASS_LABELS.fixed;

              return (
                <div
                  key={liability.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-rose-500/20 transition-all group gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-rose-500/10">
                      <CreditCard size={16} className="text-rose-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{liability.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-neutral-500">{LIABILITY_TYPE_LABELS[liability.type]}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${expenseInfo.color}/20 ${expenseInfo.color.replace('bg-', 'text-')}`}>
                          {expenseInfo.label}
                        </span>
                        {liability.hasCollateral && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 flex items-center gap-0.5">
                            <Lock size={8} /> {t('cashflow.guaranteed') || 'Backed'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs text-neutral-500">{t('cashflow.balance') || 'Balance'}</p>
                      <p className="text-sm font-bold text-rose-400 font-mono">{fmt(liability.currentBalance)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">{t('cashflow.monthly') || 'Monthly'}</p>
                      <p className="text-sm font-bold text-orange-400 font-mono">{fmt(liability.monthlyPayment)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">{t('cashflow.rateLabel') || 'Rate'}</p>
                      <p className="text-sm font-bold text-amber-400 font-mono">{liability.interestRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">{t('cashflow.term') || 'Term'}</p>
                      <p className="text-sm font-bold text-neutral-300 font-mono">{liability.remainingTermMonths}mo</p>
                    </div>
                    <button
                      onClick={() => { setEditingLiability(liability); setShowLiabilityForm(true); }}
                      className="p-1.5 rounded-lg text-neutral-600 hover:text-gold-500 hover:bg-gold-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Edit3 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
