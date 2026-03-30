
import { useMemo } from 'react';
import {
  PersonalLiability, CashFlowMetrics, Transaction, Account, Investment,
  BudgetCategory, InferredAsset, RealAccountAsset, RealInvestmentAsset
} from '../types';
import { convertAmount } from '../lib/money';

// ============================================
// SMART CATEGORY DETECTION
// ============================================

const DEBT_KEYWORDS = [
  'loan', 'mortgage', 'debt', 'credit card payment', 'car payment',
  'auto payment', 'student loan', 'financing', 'installment',
  'préstamo', 'prestamo', 'hipoteca', 'deuda', 'pago de tarjeta',
  'pago del carro', 'pago de auto', 'cuota', 'financiamiento',
  'crédito universitario', 'credito universitario', 'pago universitario'
];

const SAVINGS_INVESTMENT_KEYWORDS = [
  'savings', 'saving', 'investment', 'investing', 'emergency fund',
  'retirement', 'reserve',
  'ahorro', 'inversión', 'inversion', 'fondo de emergencia',
  'retiro', 'reserva'
];

function isDebtCategory(categoryName: string): boolean {
  const lower = categoryName.toLowerCase().trim();
  return DEBT_KEYWORDS.some(kw => lower.includes(kw));
}

function isSavingsOrInvestment(categoryName: string): boolean {
  const lower = categoryName.toLowerCase().trim();
  return SAVINGS_INVESTMENT_KEYWORDS.some(kw => lower.includes(kw));
}

// ============================================
// ASSET INFERENCE FROM LIABILITIES
// ============================================

function inferAssetsFromLiabilities(
  liabilities: PersonalLiability[],
  baseCurrency: string
): InferredAsset[] {
  const inferred: InferredAsset[] = [];

  for (const liability of liabilities) {
    switch (liability.type) {
      case 'mortgage': {
        const estimatedValue = convertAmount(
          liability.currentBalance * 1.2,
          liability.currency,
          baseCurrency
        );
        inferred.push({
          name: liability.name || 'Propiedad / Vivienda',
          type: 'property',
          value: estimatedValue,
          sourceType: 'liability',
          sourceId: liability.id,
          icon: 'Home',
        });
        break;
      }
      case 'auto_loan': {
        const estimatedValue = convertAmount(
          liability.currentBalance * 0.8,
          liability.currency,
          baseCurrency
        );
        inferred.push({
          name: liability.name || 'Vehículo',
          type: 'vehicle',
          value: estimatedValue,
          sourceType: 'liability',
          sourceId: liability.id,
          icon: 'Car',
        });
        break;
      }
      case 'student_loan': {
        inferred.push({
          name: liability.name || 'Educación',
          type: 'education',
          value: 0,
          sourceType: 'liability',
          sourceId: liability.id,
          icon: 'GraduationCap',
        });
        break;
      }
    }
  }

  return inferred;
}

// ============================================
// MONTHLY SNAPSHOT TYPE
// ============================================

export interface MonthlySnapshot {
  month: string;        // "2026-01"
  label: string;        // "Ene 2026"
  monthlyNetIncome: number;
  monthlyTotalExpenses: number;
  monthlyCashFlow: number;
  monthlySavingsInvestment: number;
  monthlyDebtPayments: number;
  savingsRate: number;
  savingsRateStatus: 'alarm' | 'solid' | 'acceleration';
  dti: number;
  dtiStatus: 'high_pressure' | 'acceptable' | 'room';
}

// ============================================
// HELPER: Compute metrics for a date range
// ============================================

const EXCLUDED_CATEGORIES = [
  'Transfer', 'Adjustment', 'Starting Balance',
  'Credit Card Payment', 'Balance Adjustment'
];
const EXCLUDED_NAMES = ['Starting Balance', 'Balance Adjustment'];

function computePeriodMetrics(
  transactions: Transaction[],
  liabilities: PersonalLiability[],
  periodStart: string,
  periodEnd: string,
  baseCurrency: string,
) {
  const periodTx = transactions.filter(t => {
    if (t.date < periodStart || t.date > periodEnd) return false;
    if (EXCLUDED_CATEGORIES.includes(t.category)) return false;
    if (EXCLUDED_NAMES.includes(t.name)) return false;
    return true;
  });

  const monthlyNetIncome = periodTx
    .filter(t => t.type === 'credit')
    .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

  const monthlyTotalExpenses = periodTx
    .filter(t => t.type === 'debit')
    .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

  const monthlyCashFlow = monthlyNetIncome - monthlyTotalExpenses;

  const monthlySavingsInvestment = periodTx
    .filter(t => t.type === 'debit' && isSavingsOrInvestment(t.category))
    .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

  const debtFromTransactions = periodTx
    .filter(t => t.type === 'debit' && isDebtCategory(t.category))
    .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

  const debtFromLiabilities = liabilities
    .reduce((acc, l) => acc + convertAmount(l.monthlyPayment, l.currency, baseCurrency), 0);

  const monthlyDebtPayments = Math.max(debtFromTransactions, debtFromLiabilities);

  const savingsRate = monthlyNetIncome > 0
    ? monthlySavingsInvestment / monthlyNetIncome
    : 0;

  const savingsRateStatus: MonthlySnapshot['savingsRateStatus'] =
    savingsRate >= 0.30 ? 'acceleration' :
      savingsRate >= 0.15 ? 'solid' : 'alarm';

  const dti = monthlyNetIncome > 0
    ? monthlyDebtPayments / monthlyNetIncome
    : 0;

  const dtiStatus: MonthlySnapshot['dtiStatus'] =
    dti > 0.40 ? 'high_pressure' :
      dti >= 0.20 ? 'acceptable' : 'room';

  return {
    monthlyNetIncome,
    monthlyTotalExpenses,
    monthlyCashFlow,
    monthlySavingsInvestment,
    monthlyDebtPayments,
    savingsRate,
    savingsRateStatus,
    dti,
    dtiStatus,
  };
}

// ============================================
// HOOK
// ============================================

interface UseCashFlowMetricsProps {
  liabilities: PersonalLiability[];
  accounts: Account[];
  transactions: Transaction[];
  investments: Investment[];
  budgets: BudgetCategory[];
  baseCurrency: string;
  periodStart: string;  // ISO date "YYYY-MM-DD"
  periodEnd: string;    // ISO date "YYYY-MM-DD"
  language?: string;
}

export interface CashFlowMetricsResult extends CashFlowMetrics {
  monthlySnapshots: MonthlySnapshot[];
}

export const useCashFlowMetrics = ({
  liabilities,
  accounts,
  transactions,
  investments,
  budgets,
  baseCurrency,
  periodStart,
  periodEnd,
  language = 'en',
}: UseCashFlowMetricsProps): CashFlowMetricsResult => {

  return useMemo(() => {
    const locale = language === 'es' ? 'es-MX' : 'en-US';

    // ============================================
    // 1. PERIOD-BASED METRICS
    // ============================================
    const periodData = computePeriodMetrics(
      transactions, liabilities, periodStart, periodEnd, baseCurrency
    );

    // ============================================
    // 2. ASSET BREAKDOWN (always current state)
    // ============================================

    // Liquid Assets
    const liquidAccountsList: RealAccountAsset[] = accounts
      .filter(a => (a.type === 'checking' || a.type === 'savings') && a.balance > 0)
      .map(a => ({
        id: a.id,
        name: a.name,
        institution: a.institution,
        balance: convertAmount(a.balance, a.currency, baseCurrency),
        currency: a.currency,
        accountType: a.type,
      }));
    const liquidAssets = liquidAccountsList.reduce((acc, a) => acc + a.balance, 0);

    // Financial Assets
    const financialAccountsList: RealAccountAsset[] = accounts
      .filter(a => (a.type === 'investment' || a.type === 'crypto') && a.balance > 0)
      .map(a => ({
        id: a.id,
        name: a.name,
        institution: a.institution,
        balance: convertAmount(a.balance, a.currency, baseCurrency),
        currency: a.currency,
        accountType: a.type,
      }));

    const financialInvestmentsList: RealInvestmentAsset[] = investments.map(inv => ({
      id: inv.id,
      name: inv.name,
      ticker: inv.ticker,
      currentValue: convertAmount(inv.currentValue, inv.currency || 'USD', baseCurrency),
      currency: inv.currency,
      investmentType: inv.type,
    }));

    const financialAssets = financialAccountsList.reduce((acc, a) => acc + a.balance, 0)
      + financialInvestmentsList.reduce((acc, i) => acc + i.currentValue, 0);

    // Business Assets
    const businessAccountsList: RealAccountAsset[] = accounts
      .filter(a => a.type === 'business' && a.balance > 0)
      .map(a => ({
        id: a.id,
        name: a.name,
        institution: a.institution,
        balance: convertAmount(a.balance, a.currency, baseCurrency),
        currency: a.currency,
        accountType: a.type,
      }));
    const businessAssets = businessAccountsList.reduce((acc, a) => acc + a.balance, 0);

    // Inferred Physical Assets
    const inferredPhysicalAssets = inferAssetsFromLiabilities(liabilities, baseCurrency);
    const inferredPhysicalTotal = inferredPhysicalAssets.reduce((acc, a) => acc + a.value, 0);

    // ============================================
    // 3. LIABILITIES
    // ============================================
    const creditCardDebt = accounts
      .filter(a => a.type === 'credit')
      .reduce((acc, a) => acc + Math.abs(
        convertAmount(Math.min(0, a.balance), a.currency, baseCurrency)
      ), 0);

    const registeredLiabilitiesTotal = liabilities.reduce(
      (acc, l) => acc + convertAmount(l.currentBalance, l.currency, baseCurrency), 0
    );

    const totalLiabilities = creditCardDebt + registeredLiabilitiesTotal;

    // ============================================
    // 4. TOTALS
    // ============================================
    const totalAssets = liquidAssets + financialAssets + businessAssets + inferredPhysicalTotal;
    const netWorth = totalAssets - totalLiabilities;

    // ============================================
    // 5. LIQUIDITY MONTHS (using period data or 3mo avg)
    // ============================================
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      .toISOString().split('T')[0];

    const last3MonthsExpenses = transactions
      .filter(t => {
        if (t.date < threeMonthsAgo) return false;
        if (t.type !== 'debit') return false;
        if (EXCLUDED_CATEGORIES.includes(t.category)) return false;
        if (EXCLUDED_NAMES.includes(t.name)) return false;
        return true;
      })
      .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

    const monthsOfData = Math.max(1, Math.min(3,
      (now.getMonth() - new Date(threeMonthsAgo).getMonth() + 12) % 12 || 3
    ));
    const avgMonthlyExpenses = last3MonthsExpenses / monthsOfData;

    const liquidityMonths = avgMonthlyExpenses > 0
      ? liquidAssets / avgMonthlyExpenses
      : 0;

    const liquidityStatus: CashFlowMetrics['liquidityStatus'] =
      liquidityMonths < 1 ? 'critical' :
        liquidityMonths < 3 ? 'high_risk' :
          liquidityMonths < 6 ? 'healthy' :
            liquidityMonths < 12 ? 'solid' : 'ultra_defensive';

    // ============================================
    // 6. MONTHLY SNAPSHOTS (for comparison view)
    // ============================================
    const monthlySnapshots: MonthlySnapshot[] = [];
    const startDate = new Date(periodStart + 'T00:00:00');
    const endDate = new Date(periodEnd + 'T00:00:00');

    // Generate each month in the range
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (cursor <= lastMonth) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const monthStart = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const monthEndDate = new Date(y, m + 1, 0); // last day of month
      const monthEnd = `${y}-${String(m + 1).padStart(2, '0')}-${String(monthEndDate.getDate()).padStart(2, '0')}`;
      const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;

      const monthLabel = new Date(y, m, 15).toLocaleDateString(locale, {
        month: 'short',
        year: 'numeric'
      });

      const snap = computePeriodMetrics(
        transactions, liabilities, monthStart, monthEnd, baseCurrency
      );

      monthlySnapshots.push({
        month: monthKey,
        label: monthLabel,
        ...snap,
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return {
      // Period metrics
      ...periodData,

      // Liquidity
      liquidityMonths,
      liquidityStatus,

      // Asset Breakdown
      liquidAssets,
      liquidAccountsList,
      financialAssets,
      financialAccountsList,
      financialInvestmentsList,
      businessAssets,
      businessAccountsList,
      inferredPhysicalAssets,

      // Totals
      totalAssets,
      totalLiabilities,
      netWorth,

      // Monthly comparison
      monthlySnapshots,
    };
  }, [liabilities, accounts, transactions, investments, budgets, baseCurrency, periodStart, periodEnd, language]);
};
