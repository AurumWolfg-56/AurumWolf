
import React, { useState, useMemo } from 'react';
import {
  TrendingUp, ArrowUpRight, ArrowDownRight,
  Plus, Trash2, Edit3, Shield, CheckCircle,
  Activity, Target, Gauge, CreditCard,
  Scale, Banknote, Building2, BarChart3,
  Home, Car, GraduationCap, Wallet,
  PiggyBank, X, Save, ChevronDown,
  Landmark, BadgeInfo, Calendar,
  ChevronLeft, ChevronRight, SlidersHorizontal,
  Table2
} from 'lucide-react';
import { useCashFlow } from '../../contexts/CashFlowContext';
import { useAccounts } from '../../contexts/AccountsContext';
import { useTransactions } from '../../contexts/TransactionsContext';
import { useInvestments } from '../../contexts/InvestmentsContext';
import { useCashFlowMetrics, MonthlySnapshot } from '../../hooks/useCashFlowMetrics';
import { formatCurrency } from '../../lib/money';
import { PersonalLiability, BudgetCategory, LiabilityType } from '../../types';
import { LiabilityForm } from './LiabilityForm';

interface CashFlowPageProps {
  baseCurrency: string;
  t: (key: string) => string;
  language?: string;
  categories?: BudgetCategory[];
}

// ============================================
// PERIOD PRESETS
// ============================================
type PeriodPreset = 'this_month' | 'last_month' | 'last_3' | 'last_6' | 'this_year' | 'last_year' | 'custom';

interface PeriodPresetOption {
  key: PeriodPreset;
  label: string;
  labelEs: string;
}

const PERIOD_PRESETS: PeriodPresetOption[] = [
  { key: 'this_month', label: 'This Month', labelEs: 'Este Mes' },
  { key: 'last_month', label: 'Last Month', labelEs: 'Mes Pasado' },
  { key: 'last_3', label: 'Last 3 Months', labelEs: 'Últimos 3 Meses' },
  { key: 'last_6', label: 'Last 6 Months', labelEs: 'Últimos 6 Meses' },
  { key: 'this_year', label: 'This Year', labelEs: 'Este Año' },
  { key: 'last_year', label: 'Last Year', labelEs: 'Año Pasado' },
  { key: 'custom', label: 'Custom', labelEs: 'Personalizado' },
];

function getPresetDates(preset: PeriodPreset): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (preset) {
    case 'this_month':
      return {
        start: `${y}-${String(m + 1).padStart(2, '0')}-01`,
        end: now.toISOString().split('T')[0],
      };
    case 'last_month': {
      const lm = new Date(y, m - 1, 1);
      const lmEnd = new Date(y, m, 0);
      return {
        start: lm.toISOString().split('T')[0],
        end: lmEnd.toISOString().split('T')[0],
      };
    }
    case 'last_3': {
      const s = new Date(y, m - 2, 1);
      return {
        start: s.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      };
    }
    case 'last_6': {
      const s = new Date(y, m - 5, 1);
      return {
        start: s.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      };
    }
    case 'this_year':
      return {
        start: `${y}-01-01`,
        end: now.toISOString().split('T')[0],
      };
    case 'last_year':
      return {
        start: `${y - 1}-01-01`,
        end: `${y - 1}-12-31`,
      };
    default:
      return {
        start: `${y}-${String(m + 1).padStart(2, '0')}-01`,
        end: now.toISOString().split('T')[0],
      };
  }
}

// ============================================
// STATUS HELPERS
// ============================================
const getMetricColor = (status: string) => {
  switch (status) {
    case 'acceleration': case 'room': case 'ultra_defensive': case 'solid':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    case 'healthy': case 'acceptable':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
    case 'alarm': case 'high_pressure': case 'critical': case 'high_risk':
      return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
    default:
      return { bg: 'bg-neutral-500/10', text: 'text-neutral-400', border: 'border-neutral-500/20' };
  }
};

const getStatusLabel = (status: string, t: (k: string) => string) => {
  const labels: Record<string, string> = {
    'alarm': t('cashflow.statusAlarm') || '⚠️ Por Debajo',
    'solid': t('cashflow.statusSolid') || '✅ Sólido',
    'acceleration': t('cashflow.statusAcceleration') || '🚀 Fuerte',
    'high_pressure': t('cashflow.statusHighPressure') || '🔴 Alta Presión',
    'acceptable': t('cashflow.statusAcceptable') || '🟡 Aceptable',
    'room': t('cashflow.statusRoom') || '🟢 Espacio',
    'critical': t('cashflow.statusCritical') || '🚨 Riesgo Crítico',
    'high_risk': t('cashflow.statusHighRisk') || '🔴 Riesgo Alto',
    'healthy': t('cashflow.statusHealthy') || '🟡 Saludable',
    'ultra_defensive': t('cashflow.statusUltraDefensive') || '🛡️ Ultra-Defensivo',
  };
  return labels[status] || status;
};

const LIABILITY_TYPE_LABELS: Record<string, string> = {
  credit_card: 'Tarjeta de Crédito',
  personal_loan: 'Préstamo Personal',
  auto_loan: 'Préstamo Vehicular',
  mortgage: 'Hipoteca',
  family_debt: 'Deuda Familiar',
  legal_obligation: 'Obligación Legal',
  contractual: 'Contractual',
  student_loan: 'Crédito Universitario',
  medical_debt: 'Deuda Médica',
  tax_debt: 'Deuda Fiscal',
  other: 'Otro',
};

const INFERRED_ICON_MAP: Record<string, any> = { Home, Car, GraduationCap };

// ============================================
// GAUGE BAR COMPONENT
// ============================================
const MetricGauge: React.FC<{
  value: number; maxValue: number; label: string;
  displayValue: string; status: string; icon: any;
  description: string; t: (k: string) => string;
}> = ({ value, maxValue, label, displayValue, status, icon: Icon, description, t }) => {
  const colors = getMetricColor(status);
  const fillPercent = Math.min(100, (value / maxValue) * 100);

  return (
    <div className={`glass rounded-2xl p-5 shadow-xl ${colors.border} border transition-all hover:scale-[1.01]`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${colors.bg}`}>
            <Icon size={16} className={colors.text} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{label}</h4>
            <p className="text-[10px] text-neutral-500 mt-0.5">{description}</p>
          </div>
        </div>
      </div>
      <div className="flex items-end justify-between mb-3">
        <span className={`text-2xl font-display font-bold tracking-tight ${colors.text}`}>{displayValue}</span>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${colors.bg} ${colors.text} uppercase tracking-wider`}>
          {getStatusLabel(status, t)}
        </span>
      </div>
      <div className="w-full bg-neutral-800/50 h-1.5 rounded-full overflow-hidden">
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
// COMPARISON MINI-BAR (for table cells)
// ============================================
const MiniBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => {
  const pct = max > 0 ? Math.min(100, (Math.abs(value) / max) * 100) : 0;
  return (
    <div className="w-full bg-neutral-800/30 h-1 rounded-full mt-1">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, pct)}%` }} />
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const CashFlowPage: React.FC<CashFlowPageProps> = ({
  baseCurrency,
  t,
  language = 'en',
  categories = [],
}) => {
  const locale = language === 'es' ? 'es-MX' : 'en-US';
  const isEs = language === 'es';
  const { liabilities, addLiability, updateLiability, deleteLiability, loading } = useCashFlow();
  const { accounts } = useAccounts();
  const { transactions } = useTransactions();
  const { investments } = useInvestments();

  // --- Period State ---
  const [activePreset, setActivePreset] = useState<PeriodPreset>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const { start: periodStart, end: periodEnd } = useMemo(() => {
    if (activePreset === 'custom' && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    return getPresetDates(activePreset);
  }, [activePreset, customStart, customEnd]);

  // --- Quick month navigation ---
  const navigateMonth = (direction: -1 | 1) => {
    const current = new Date(periodStart + 'T00:00:00');
    const newMonth = new Date(current.getFullYear(), current.getMonth() + direction, 1);
    const newEnd = new Date(newMonth.getFullYear(), newMonth.getMonth() + 1, 0);
    const now = new Date();

    setActivePreset('custom');
    setCustomStart(newMonth.toISOString().split('T')[0]);
    setCustomEnd(newEnd > now ? now.toISOString().split('T')[0] : newEnd.toISOString().split('T')[0]);
  };

  const [showLiabilityForm, setShowLiabilityForm] = useState(false);
  const [editingLiability, setEditingLiability] = useState<PersonalLiability | null>(null);

  const metrics = useCashFlowMetrics({
    liabilities,
    accounts,
    transactions,
    investments,
    budgets: categories,
    baseCurrency,
    periodStart,
    periodEnd,
    language,
  });

  const fmt = (val: number) => formatCurrency(val, baseCurrency, { locale });
  const fmtPct = (val: number) => `${(val * 100).toFixed(1)}%`;
  const fmtCompact = (val: number) => formatCurrency(val, baseCurrency, { locale, compact: true });

  // --- Comparison helpers ---
  const snapshots = metrics.monthlySnapshots;
  const showComparison = snapshots.length > 1;
  const maxIncome = Math.max(...snapshots.map(s => s.monthlyNetIncome), 1);
  const maxExpense = Math.max(...snapshots.map(s => s.monthlyTotalExpenses), 1);

  // --- Liability Form Handlers ---
  const handleSaveLiability = (liability: PersonalLiability) => {
    if (editingLiability) updateLiability(liability);
    else addLiability(liability);
    setShowLiabilityForm(false);
    setEditingLiability(null);
  };

  const creditCardAccounts = accounts.filter(a => a.type === 'credit' && a.balance < 0);

  // Period label
  const periodLabel = useMemo(() => {
    const s = new Date(periodStart + 'T00:00:00');
    const e = new Date(periodEnd + 'T00:00:00');
    const fmtDate = (d: Date) => d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });

    // If same month, just show month name
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return s.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    }
    return `${fmtDate(s)} — ${fmtDate(e)}`;
  }, [periodStart, periodEnd, locale]);

  // --- RENDER FORM ---
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

      {/* ========== PERIOD SELECTOR ========== */}
      <div className="glass rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col gap-3">
          {/* Top row: navigation + current period */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-center min-w-[180px]">
                <p className="text-sm font-bold text-white capitalize">{periodLabel}</p>
              </div>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <button
              onClick={() => setShowPresets(!showPresets)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                showPresets
                  ? 'bg-gold-500/10 border-gold-500/30 text-gold-500'
                  : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal size={14} />
              {isEs ? 'Periodo' : 'Period'}
            </button>
          </div>

          {/* Preset buttons (toggleable) */}
          {showPresets && (
            <div className="animate-fade-in space-y-3">
              <div className="flex flex-wrap gap-2">
                {PERIOD_PRESETS.filter(p => p.key !== 'custom').map(preset => (
                  <button
                    key={preset.key}
                    onClick={() => { setActivePreset(preset.key); setShowPresets(false); }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                      activePreset === preset.key
                        ? 'bg-gold-500/10 border-gold-500/30 text-gold-500'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    {isEs ? preset.labelEs : preset.label}
                  </button>
                ))}
              </div>

              {/* Custom date range */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Calendar size={14} className="text-neutral-500 flex-shrink-0" />
                  <input
                    type="date"
                    value={customStart || periodStart}
                    onChange={e => { setActivePreset('custom'); setCustomStart(e.target.value); }}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none"
                  />
                </div>
                <span className="text-neutral-600 text-xs">—</span>
                <div className="flex-1">
                  <input
                    type="date"
                    value={customEnd || periodEnd}
                    onChange={e => { setActivePreset('custom'); setCustomEnd(e.target.value); }}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== SECTION 1: DASHBOARD KPIs ========== */}
      <div className="glass rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-xl">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-5">
          <Activity size={14} className="text-gold-500" />
          {t('cashflow.monthlyDashboard') || 'Dashboard del Periodo'}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Net Income */}
          <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight size={14} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider">
                {t('cashflow.netIncome') || 'Ingreso Neto'}
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-400 font-mono">{fmt(metrics.monthlyNetIncome)}</p>
          </div>

          {/* Total Expenses */}
          <div className="bg-rose-500/5 rounded-xl p-4 border border-rose-500/10">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight size={14} className="text-rose-500" />
              <span className="text-[10px] font-bold text-rose-400/70 uppercase tracking-wider">
                {t('cashflow.totalExpenses') || 'Gastos Totales'}
              </span>
            </div>
            <p className="text-xl font-bold text-rose-400 font-mono">{fmt(metrics.monthlyTotalExpenses)}</p>
          </div>

          {/* Cash Flow */}
          <div className={`rounded-xl p-4 border ${metrics.monthlyCashFlow >= 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className={metrics.monthlyCashFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Cash Flow</span>
            </div>
            <p className={`text-xl font-bold font-mono ${metrics.monthlyCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {fmt(metrics.monthlyCashFlow)}
            </p>
          </div>

          {/* Savings + Investment */}
          <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/10">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank size={14} className="text-blue-500" />
              <span className="text-[10px] font-bold text-blue-400/70 uppercase tracking-wider">
                {t('cashflow.savingsInvestment') || 'Ahorro + Inversión'}
              </span>
            </div>
            <p className="text-xl font-bold text-blue-400 font-mono">{fmt(metrics.monthlySavingsInvestment)}</p>
          </div>

          {/* Debt Payments */}
          <div className="bg-orange-500/5 rounded-xl p-4 border border-orange-500/10">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={14} className="text-orange-500" />
              <span className="text-[10px] font-bold text-orange-400/70 uppercase tracking-wider">
                {t('cashflow.debtPayments') || 'Pagos de Deuda'}
              </span>
            </div>
            <p className="text-xl font-bold text-orange-400 font-mono">{fmt(metrics.monthlyDebtPayments)}</p>
          </div>

          {/* Savings Rate */}
          <div className={`rounded-xl p-4 border ${getMetricColor(metrics.savingsRateStatus).border} ${getMetricColor(metrics.savingsRateStatus).bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className={getMetricColor(metrics.savingsRateStatus).text} />
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                {t('cashflow.savingsRateLabel') || 'Tasa de Ahorro'}
              </span>
            </div>
            <div className="flex items-end gap-2">
              <p className={`text-xl font-bold font-mono ${getMetricColor(metrics.savingsRateStatus).text}`}>
                {fmtPct(metrics.savingsRate)}
              </p>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${getMetricColor(metrics.savingsRateStatus).bg} ${getMetricColor(metrics.savingsRateStatus).text} mb-0.5`}>
                {getStatusLabel(metrics.savingsRateStatus, t)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========== SECTION 2: KEY INDICATORS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricGauge
          value={metrics.savingsRate * 100} maxValue={50}
          label={t('cashflow.savingsRateLabel') || 'Tasa de Ahorro'}
          displayValue={fmtPct(metrics.savingsRate)}
          status={metrics.savingsRateStatus} icon={Target}
          description={t('cashflow.savingsRateDesc') || '(Ahorro + Inversión) / Ingreso Neto'}
          t={t}
        />
        <MetricGauge
          value={metrics.dti * 100} maxValue={60}
          label={t('cashflow.dtiLabel') || 'Deuda / Ingreso (DTI)'}
          displayValue={fmtPct(metrics.dti)}
          status={metrics.dtiStatus} icon={Scale}
          description={t('cashflow.dtiDesc') || 'Pagos Deuda / Ingreso Neto'}
          t={t}
        />
        <MetricGauge
          value={metrics.liquidityMonths} maxValue={15}
          label={t('cashflow.liquidityLabel') || 'Meses de Liquidez'}
          displayValue={`${metrics.liquidityMonths.toFixed(1)} mo`}
          status={metrics.liquidityStatus} icon={Shield}
          description={t('cashflow.liquidityDesc') || 'Activos Líquidos / Gastos Mensuales'}
          t={t}
        />
      </div>

      {/* ========== SECTION 2.5: MONTHLY COMPARISON TABLE ========== */}
      {showComparison && (
        <div className="glass rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-xl">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-5">
            <Table2 size={14} className="text-blue-400" />
            {isEs ? 'Comparación Mensual' : 'Monthly Comparison'}
          </h3>

          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-2 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                    {isEs ? 'Métrica' : 'Metric'}
                  </th>
                  {snapshots.map(s => (
                    <th key={s.month} className="text-right py-2 px-2 text-neutral-400 font-bold capitalize text-[10px]">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Net Income */}
                <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-2 text-emerald-400 font-medium flex items-center gap-1.5">
                    <ArrowUpRight size={12} /> {isEs ? 'Ingreso Neto' : 'Net Income'}
                  </td>
                  {snapshots.map(s => (
                    <td key={s.month} className="py-2.5 px-2 text-right font-mono text-white">
                      {fmtCompact(s.monthlyNetIncome)}
                      <MiniBar value={s.monthlyNetIncome} max={maxIncome} color="bg-emerald-500" />
                    </td>
                  ))}
                </tr>

                {/* Total Expenses */}
                <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-2 text-rose-400 font-medium flex items-center gap-1.5">
                    <ArrowDownRight size={12} /> {isEs ? 'Gastos' : 'Expenses'}
                  </td>
                  {snapshots.map(s => (
                    <td key={s.month} className="py-2.5 px-2 text-right font-mono text-white">
                      {fmtCompact(s.monthlyTotalExpenses)}
                      <MiniBar value={s.monthlyTotalExpenses} max={maxExpense} color="bg-rose-500" />
                    </td>
                  ))}
                </tr>

                {/* Cash Flow */}
                <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-2 text-neutral-300 font-medium flex items-center gap-1.5">
                    <TrendingUp size={12} /> Cash Flow
                  </td>
                  {snapshots.map(s => (
                    <td key={s.month} className={`py-2.5 px-2 text-right font-mono font-bold ${s.monthlyCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {fmtCompact(s.monthlyCashFlow)}
                    </td>
                  ))}
                </tr>

                {/* Savings + Investment */}
                <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-2 text-blue-400 font-medium flex items-center gap-1.5">
                    <PiggyBank size={12} /> {isEs ? 'Ahorro + Inv.' : 'Savings + Inv.'}
                  </td>
                  {snapshots.map(s => (
                    <td key={s.month} className="py-2.5 px-2 text-right font-mono text-blue-400">
                      {fmtCompact(s.monthlySavingsInvestment)}
                    </td>
                  ))}
                </tr>

                {/* Debt Payments */}
                <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-2 text-orange-400 font-medium flex items-center gap-1.5">
                    <CreditCard size={12} /> {isEs ? 'Pago Deuda' : 'Debt Pay'}
                  </td>
                  {snapshots.map(s => (
                    <td key={s.month} className="py-2.5 px-2 text-right font-mono text-orange-400">
                      {fmtCompact(s.monthlyDebtPayments)}
                    </td>
                  ))}
                </tr>

                {/* Savings Rate */}
                <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-2 text-neutral-300 font-medium flex items-center gap-1.5">
                    <Target size={12} /> {isEs ? 'Tasa Ahorro' : 'Savings Rate'}
                  </td>
                  {snapshots.map(s => {
                    const c = getMetricColor(s.savingsRateStatus);
                    return (
                      <td key={s.month} className="py-2.5 px-2 text-right">
                        <span className={`font-mono font-bold ${c.text}`}>{fmtPct(s.savingsRate)}</span>
                        <div className={`text-[9px] mt-0.5 ${c.text} opacity-70`}>
                          {getStatusLabel(s.savingsRateStatus, t)}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* DTI */}
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-2 text-neutral-300 font-medium flex items-center gap-1.5">
                    <Scale size={12} /> DTI
                  </td>
                  {snapshots.map(s => {
                    const c = getMetricColor(s.dtiStatus);
                    return (
                      <td key={s.month} className="py-2.5 px-2 text-right">
                        <span className={`font-mono font-bold ${c.text}`}>{fmtPct(s.dti)}</span>
                        <div className={`text-[9px] mt-0.5 ${c.text} opacity-70`}>
                          {getStatusLabel(s.dtiStatus, t)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== SECTION 3: ASSETS ========== */}
      <div className="glass rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-6">
          <BarChart3 size={18} className="text-emerald-500" />
          {t('cashflow.totalAssets') || 'Activos'}
        </h3>

        <div className="space-y-5">
          {/* Liquid Assets */}
          {metrics.liquidAccountsList.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-blue-500/10"><Banknote size={14} className="text-blue-400" /></div>
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Activos Líquidos</h4>
                <span className="text-xs text-neutral-500 font-mono ml-auto">{fmt(metrics.liquidAssets)}</span>
              </div>
              <div className="space-y-1.5 pl-8">
                {metrics.liquidAccountsList.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-lg border border-white/5">
                    <div>
                      <span className="text-sm text-white font-medium">{acc.name}</span>
                      <span className="text-[10px] text-neutral-500 ml-2">{acc.institution}</span>
                    </div>
                    <span className="text-sm font-bold text-white font-mono">{fmt(acc.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Assets */}
          {(metrics.financialAccountsList.length > 0 || metrics.financialInvestmentsList.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/10"><TrendingUp size={14} className="text-emerald-400" /></div>
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Activos Financieros</h4>
                <span className="text-xs text-neutral-500 font-mono ml-auto">{fmt(metrics.financialAssets)}</span>
              </div>
              <div className="space-y-1.5 pl-8">
                {metrics.financialAccountsList.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-lg border border-white/5">
                    <div>
                      <span className="text-sm text-white font-medium">{acc.name}</span>
                      <span className="text-[10px] text-neutral-500 ml-2">{acc.institution}</span>
                    </div>
                    <span className="text-sm font-bold text-white font-mono">{fmt(acc.balance)}</span>
                  </div>
                ))}
                {metrics.financialInvestmentsList.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-lg border border-white/5">
                    <div>
                      <span className="text-sm text-white font-medium">{inv.name}</span>
                      {inv.ticker && <span className="text-[10px] text-emerald-400 ml-2 font-mono">{inv.ticker}</span>}
                    </div>
                    <span className="text-sm font-bold text-white font-mono">{fmt(inv.currentValue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Business Assets */}
          {metrics.businessAccountsList.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-purple-500/10"><Building2 size={14} className="text-purple-400" /></div>
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">Activos de Negocio</h4>
                <span className="text-xs text-neutral-500 font-mono ml-auto">{fmt(metrics.businessAssets)}</span>
              </div>
              <div className="space-y-1.5 pl-8">
                {metrics.businessAccountsList.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-lg border border-white/5">
                    <div>
                      <span className="text-sm text-white font-medium">{acc.name}</span>
                      <span className="text-[10px] text-neutral-500 ml-2">{acc.institution}</span>
                    </div>
                    <span className="text-sm font-bold text-white font-mono">{fmt(acc.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inferred Physical Assets */}
          {metrics.inferredPhysicalAssets.filter(a => a.value > 0).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-amber-500/10"><Home size={14} className="text-amber-400" /></div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Activos Físicos</h4>
                <span className="text-xs text-neutral-500 font-mono ml-auto">
                  ~{fmt(metrics.inferredPhysicalAssets.reduce((s, a) => s + a.value, 0))}
                </span>
              </div>
              <div className="space-y-1.5 pl-8">
                {metrics.inferredPhysicalAssets.filter(a => a.value > 0).map((asset, i) => {
                  const InfIcon = INFERRED_ICON_MAP[asset.icon] || Home;
                  return (
                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-lg border border-white/5">
                      <div className="flex items-center gap-2">
                        <InfIcon size={14} className="text-amber-400" />
                        <span className="text-sm text-white font-medium">{asset.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Inferido</span>
                      </div>
                      <span className="text-sm font-bold text-white font-mono">~{fmt(asset.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No assets */}
          {metrics.liquidAccountsList.length === 0 &&
           metrics.financialAccountsList.length === 0 &&
           metrics.financialInvestmentsList.length === 0 &&
           metrics.businessAccountsList.length === 0 &&
           metrics.inferredPhysicalAssets.length === 0 && (
            <div className="text-center py-10 text-neutral-500">
              <Wallet size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No hay activos registrados</p>
              <p className="text-xs mt-1 opacity-70">Agrega cuentas en el módulo de Cuentas para ver tus activos aquí</p>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Activos</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{fmt(metrics.totalAssets)}</span>
          </div>
        </div>
      </div>

      {/* ========== SECTION 4: LIABILITIES + NET WORTH ========== */}
      <div className="glass rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CreditCard size={18} className="text-rose-500" />
            {t('cashflow.totalLiabilities') || 'Pasivos'}
          </h3>
          <button
            onClick={() => { setEditingLiability(null); setShowLiabilityForm(true); }}
            className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-500/20 transition-all border border-rose-500/20"
          >
            <Plus size={14} /> {t('cashflow.addLiability') || 'Agregar Pasivo'}
          </button>
        </div>

        <div className="space-y-5">
          {/* Credit Cards */}
          {creditCardAccounts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-rose-500/10"><CreditCard size={14} className="text-rose-400" /></div>
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Tarjetas de Crédito</h4>
              </div>
              <div className="space-y-1.5 pl-8">
                {creditCardAccounts.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-lg border border-white/5">
                    <div>
                      <span className="text-sm text-white font-medium">{acc.name}</span>
                      <span className="text-[10px] text-neutral-500 ml-2">{acc.institution}</span>
                      {acc.last4 && <span className="text-[10px] text-neutral-600 ml-1">****{acc.last4}</span>}
                    </div>
                    <span className="text-sm font-bold text-rose-400 font-mono">{fmt(Math.abs(acc.balance))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registered Liabilities */}
          {liabilities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-orange-500/10"><Landmark size={14} className="text-orange-400" /></div>
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Deudas Registradas</h4>
              </div>
              <div className="space-y-2 pl-8">
                {liabilities.map(liability => (
                  <div
                    key={liability.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white/[0.03] rounded-lg border border-white/5 hover:border-rose-500/20 transition-all group gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{liability.name}</p>
                      <span className="text-[10px] text-neutral-500">{LIABILITY_TYPE_LABELS[liability.type] || liability.type}</span>
                    </div>
                    <div className="flex items-center gap-4 text-right flex-shrink-0">
                      <div>
                        <p className="text-[9px] text-neutral-500 uppercase">Saldo</p>
                        <p className="text-sm font-bold text-rose-400 font-mono">{fmt(liability.currentBalance)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-neutral-500 uppercase">Cuota</p>
                        <p className="text-sm font-bold text-orange-400 font-mono">{fmt(liability.monthlyPayment)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-neutral-500 uppercase">Tasa</p>
                        <p className="text-sm font-bold text-amber-400 font-mono">{liability.interestRate}%</p>
                      </div>
                      <button
                        onClick={() => { setEditingLiability(liability); setShowLiabilityForm(true); }}
                        className="p-1.5 rounded-lg text-neutral-600 hover:text-gold-500 hover:bg-gold-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {creditCardAccounts.length === 0 && liabilities.length === 0 && (
            <div className="text-center py-10 text-neutral-500">
              <CheckCircle size={36} className="mx-auto mb-3 text-emerald-500/30" />
              <p className="text-sm font-medium">{t('cashflow.noLiabilities') || 'No hay pasivos registrados'}</p>
              <p className="text-xs mt-1 opacity-70">{t('cashflow.debtFree') || '¡Libre de deudas!'}</p>
            </div>
          )}

          {/* Total Liabilities */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Pasivos</span>
            <span className="text-lg font-bold text-rose-400 font-mono">{fmt(metrics.totalLiabilities)}</span>
          </div>

          {/* Net Worth */}
          <div className={`rounded-2xl p-5 border-2 ${metrics.netWorth >= 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] mb-1">
                  {t('cashflow.netWorth') || 'Patrimonio Neto'}
                </h3>
                <p className="text-[10px] text-neutral-500">Activos − Pasivos</p>
              </div>
              <span className={`text-3xl md:text-4xl font-display font-bold tracking-tighter ${metrics.netWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {fmt(metrics.netWorth)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
