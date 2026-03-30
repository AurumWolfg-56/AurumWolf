
import React, { useState } from 'react';
import {
  TrendingUp, ArrowUpRight, ArrowDownRight,
  Plus, Trash2, Edit3, Shield, CheckCircle,
  Activity, Target, Gauge, CreditCard,
  Scale, Banknote, Building2, BarChart3,
  Home, Car, GraduationCap, Wallet,
  PiggyBank, X, Save, ChevronDown,
  Landmark, BadgeInfo
} from 'lucide-react';
import { useCashFlow } from '../../contexts/CashFlowContext';
import { useAccounts } from '../../contexts/AccountsContext';
import { useTransactions } from '../../contexts/TransactionsContext';
import { useInvestments } from '../../contexts/InvestmentsContext';
import { useCashFlowMetrics } from '../../hooks/useCashFlowMetrics';
import { formatCurrency } from '../../lib/money';
import { PersonalLiability, BudgetCategory, LiabilityType } from '../../types';
import { LiabilityForm } from './LiabilityForm';

interface CashFlowPageProps {
  baseCurrency: string;
  t: (key: string) => string;
  language?: string;
  categories?: BudgetCategory[];
}

// --- Status helpers ---
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

const INFERRED_ICON_MAP: Record<string, any> = {
  Home, Car, GraduationCap,
};

// --- Gauge Bar Component ---
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
// MAIN COMPONENT
// ============================================
export const CashFlowPage: React.FC<CashFlowPageProps> = ({
  baseCurrency,
  t,
  language = 'en',
  categories = [],
}) => {
  const locale = language === 'es' ? 'es-MX' : 'en-US';
  const { liabilities, addLiability, updateLiability, deleteLiability, loading } = useCashFlow();
  const { accounts } = useAccounts();
  const { transactions } = useTransactions();
  const { investments } = useInvestments();

  const [showLiabilityForm, setShowLiabilityForm] = useState(false);
  const [editingLiability, setEditingLiability] = useState<PersonalLiability | null>(null);

  const metrics = useCashFlowMetrics({
    liabilities,
    accounts,
    transactions,
    investments,
    budgets: categories,
    baseCurrency,
  });

  const fmt = (val: number) => formatCurrency(val, baseCurrency, { locale });
  const fmtPct = (val: number) => `${(val * 100).toFixed(1)}%`;

  // --- Liability Form Handlers ---
  const handleSaveLiability = (liability: PersonalLiability) => {
    if (editingLiability) {
      updateLiability(liability);
    } else {
      addLiability(liability);
    }
    setShowLiabilityForm(false);
    setEditingLiability(null);
  };

  // Credit card liabilities (from accounts)
  const creditCardAccounts = accounts.filter(a => a.type === 'credit' && a.balance < 0);

  // Avg interest rate
  const avgInterest = liabilities.length > 0
    ? liabilities.reduce((s, l) => s + l.interestRate, 0) / liabilities.length
    : 0;

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

      {/* ========== SECTION 1: MONTHLY DASHBOARD ========== */}
      <div className="glass rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-xl">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-5">
          <Activity size={14} className="text-gold-500" />
          {t('cashflow.monthlyDashboard') || 'Dashboard Mensual'}
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
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                {t('cashflow.cashFlow') || 'Cash Flow'}
              </span>
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
          value={metrics.savingsRate * 100}
          maxValue={50}
          label={t('cashflow.savingsRateLabel') || 'Tasa de Ahorro'}
          displayValue={fmtPct(metrics.savingsRate)}
          status={metrics.savingsRateStatus}
          icon={Target}
          description={t('cashflow.savingsRateDesc') || '(Ahorro + Inversión) / Ingreso Neto'}
          t={t}
        />
        <MetricGauge
          value={metrics.dti * 100}
          maxValue={60}
          label={t('cashflow.dtiLabel') || 'Deuda / Ingreso (DTI)'}
          displayValue={fmtPct(metrics.dti)}
          status={metrics.dtiStatus}
          icon={Scale}
          description={t('cashflow.dtiDesc') || 'Pagos Deuda / Ingreso Neto'}
          t={t}
        />
        <MetricGauge
          value={metrics.liquidityMonths}
          maxValue={15}
          label={t('cashflow.liquidityLabel') || 'Meses de Liquidez'}
          displayValue={`${metrics.liquidityMonths.toFixed(1)} mo`}
          status={metrics.liquidityStatus}
          icon={Shield}
          description={t('cashflow.liquidityDesc') || 'Activos Líquidos / Gastos Mensuales'}
          t={t}
        />
      </div>

      {/* ========== SECTION 3: ASSETS (from real data) ========== */}
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
                <div className="p-1.5 rounded-lg bg-blue-500/10">
                  <Banknote size={14} className="text-blue-400" />
                </div>
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  Activos Líquidos
                </h4>
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
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <TrendingUp size={14} className="text-emerald-400" />
                </div>
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Activos Financieros
                </h4>
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
                <div className="p-1.5 rounded-lg bg-purple-500/10">
                  <Building2 size={14} className="text-purple-400" />
                </div>
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                  Activos de Negocio
                </h4>
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
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <Home size={14} className="text-amber-400" />
                </div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Activos Físicos
                </h4>
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
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Inferido
                        </span>
                      </div>
                      <span className="text-sm font-bold text-white font-mono">~{fmt(asset.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No assets message */}
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

          {/* Total Assets Footer */}
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
          {/* Credit Cards (from accounts) */}
          {creditCardAccounts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-rose-500/10">
                  <CreditCard size={14} className="text-rose-400" />
                </div>
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  Tarjetas de Crédito
                </h4>
              </div>
              <div className="space-y-1.5 pl-8">
                {creditCardAccounts.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-lg border border-white/5">
                    <div>
                      <span className="text-sm text-white font-medium">{acc.name}</span>
                      <span className="text-[10px] text-neutral-500 ml-2">{acc.institution}</span>
                      {acc.last4 && <span className="text-[10px] text-neutral-600 ml-1">****{acc.last4}</span>}
                    </div>
                    <span className="text-sm font-bold text-rose-400 font-mono">
                      {fmt(Math.abs(acc.balance))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registered Liabilities */}
          {liabilities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-orange-500/10">
                  <Landmark size={14} className="text-orange-400" />
                </div>
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                  Deudas Registradas
                </h4>
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

          {/* ========== NET WORTH ========== */}
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
