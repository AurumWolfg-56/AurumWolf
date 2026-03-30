
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
  // English
  'loan', 'mortgage', 'debt', 'credit card payment', 'car payment',
  'auto payment', 'student loan', 'financing', 'installment',
  // Spanish
  'préstamo', 'prestamo', 'hipoteca', 'deuda', 'pago de tarjeta',
  'pago del carro', 'pago de auto', 'cuota', 'financiamiento',
  'crédito universitario', 'credito universitario', 'pago universitario'
];

const SAVINGS_INVESTMENT_KEYWORDS = [
  // English
  'savings', 'saving', 'investment', 'investing', 'emergency fund',
  'retirement', 'reserve',
  // Spanish
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
        // Property value ≈ remaining balance × 1.2 (conservative estimate)
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
        // Vehicle depreciates: current value ≈ balance × 0.8
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
        // Education is intangible, show as informational
        inferred.push({
          name: liability.name || 'Educación',
          type: 'education',
          value: 0, // Not a tangible asset
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
// HOOK
// ============================================

interface UseCashFlowMetricsProps {
  liabilities: PersonalLiability[];
  accounts: Account[];
  transactions: Transaction[];
  investments: Investment[];
  budgets: BudgetCategory[];
  baseCurrency: string;
}

export const useCashFlowMetrics = ({
  liabilities,
  accounts,
  transactions,
  investments,
  budgets,
  baseCurrency,
}: UseCashFlowMetricsProps): CashFlowMetrics => {

  return useMemo(() => {
    // ============================================
    // 1. MONTHLY TRANSACTIONS (current month)
    // ============================================
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split('T')[0];

    const EXCLUDED_CATEGORIES = [
      'Transfer', 'Adjustment', 'Starting Balance',
      'Credit Card Payment', 'Balance Adjustment'
    ];
    const EXCLUDED_NAMES = ['Starting Balance', 'Balance Adjustment'];

    const monthTx = transactions.filter(t => {
      if (t.date < startOfMonth) return false;
      if (EXCLUDED_CATEGORIES.includes(t.category)) return false;
      if (EXCLUDED_NAMES.includes(t.name)) return false;
      return true;
    });

    // --- Net Income (credits this month) ---
    const monthlyNetIncome = monthTx
      .filter(t => t.type === 'credit')
      .reduce((acc, t) => acc + convertAmount(
        t.numericAmount, t.currency || 'USD', baseCurrency
      ), 0);

    // --- Total Expenses (debits this month) ---
    const monthlyTotalExpenses = monthTx
      .filter(t => t.type === 'debit')
      .reduce((acc, t) => acc + convertAmount(
        t.numericAmount, t.currency || 'USD', baseCurrency
      ), 0);

    // --- Cash Flow ---
    const monthlyCashFlow = monthlyNetIncome - monthlyTotalExpenses;

    // --- Savings + Investment (debits to savings/investment categories) ---
    const monthlySavingsInvestment = monthTx
      .filter(t => t.type === 'debit' && isSavingsOrInvestment(t.category))
      .reduce((acc, t) => acc + convertAmount(
        t.numericAmount, t.currency || 'USD', baseCurrency
      ), 0);

    // --- Debt Payments (anti-double-count) ---
    const debtFromTransactions = monthTx
      .filter(t => t.type === 'debit' && isDebtCategory(t.category))
      .reduce((acc, t) => acc + convertAmount(
        t.numericAmount, t.currency || 'USD', baseCurrency
      ), 0);

    const debtFromLiabilities = liabilities
      .reduce((acc, l) => acc + convertAmount(
        l.monthlyPayment, l.currency, baseCurrency
      ), 0);

    // Use the greater of the two to avoid double counting
    const monthlyDebtPayments = Math.max(debtFromTransactions, debtFromLiabilities);

    // ============================================
    // 2. KEY INDICATORS
    // ============================================

    // --- Savings Rate = (Savings + Investment) / Net Income ---
    const savingsRate = monthlyNetIncome > 0
      ? monthlySavingsInvestment / monthlyNetIncome
      : 0;

    const savingsRateStatus: CashFlowMetrics['savingsRateStatus'] =
      savingsRate >= 0.30 ? 'acceleration' :
        savingsRate >= 0.15 ? 'solid' : 'alarm';

    // --- DTI = Monthly Debt Payments / Net Income ---
    const dti = monthlyNetIncome > 0
      ? monthlyDebtPayments / monthlyNetIncome
      : 0;

    const dtiStatus: CashFlowMetrics['dtiStatus'] =
      dti > 0.40 ? 'high_pressure' :
        dti >= 0.20 ? 'acceptable' : 'room';

    // ============================================
    // 3. ASSET BREAKDOWN (from real accounts/investments)
    // ============================================

    // --- Liquid Assets (checking + savings with positive balance) ---
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

    // --- Financial Assets (investment + crypto accounts + portfolio investments) ---
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

    // --- Business Assets ---
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

    // --- Inferred Physical Assets (from liabilities) ---
    const inferredPhysicalAssets = inferAssetsFromLiabilities(liabilities, baseCurrency);
    const inferredPhysicalTotal = inferredPhysicalAssets
      .reduce((acc, a) => acc + a.value, 0);

    // ============================================
    // 4. LIABILITIES
    // ============================================

    // Credit card debt from accounts
    const creditCardDebt = accounts
      .filter(a => a.type === 'credit')
      .reduce((acc, a) => acc + Math.abs(
        convertAmount(Math.min(0, a.balance), a.currency, baseCurrency)
      ), 0);

    // Registered liabilities total
    const registeredLiabilitiesTotal = liabilities.reduce(
      (acc, l) => acc + convertAmount(l.currentBalance, l.currency, baseCurrency), 0
    );

    const totalLiabilities = creditCardDebt + registeredLiabilitiesTotal;

    // ============================================
    // 5. TOTALS
    // ============================================

    const totalAssets = liquidAssets + financialAssets + businessAssets + inferredPhysicalTotal;
    const netWorth = totalAssets - totalLiabilities;

    // ============================================
    // 6. LIQUIDITY MONTHS
    // ============================================

    // Use average monthly expenses for more accurate liquidity calculation.
    // If current month has few data points, use last 3 months average.
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
      .reduce((acc, t) => acc + convertAmount(
        t.numericAmount, t.currency || 'USD', baseCurrency
      ), 0);

    const monthsOfData = Math.max(1, Math.min(3,
      (now.getMonth() - new Date(threeMonthsAgo).getMonth() + 12) % 12 || 3
    ));
    const avgMonthlyExpenses = last3MonthsExpenses / monthsOfData;

    // KEY FIX: if no expenses AND no liquid assets, liquidity = 0, NOT 99
    const liquidityMonths = avgMonthlyExpenses > 0
      ? liquidAssets / avgMonthlyExpenses
      : 0; // No expenses = can't calculate runway meaningfully

    const liquidityStatus: CashFlowMetrics['liquidityStatus'] =
      liquidityMonths < 1 ? 'critical' :
        liquidityMonths < 3 ? 'high_risk' :
          liquidityMonths < 6 ? 'healthy' :
            liquidityMonths < 12 ? 'solid' : 'ultra_defensive';

    return {
      // Monthly Dashboard
      monthlyNetIncome,
      monthlyTotalExpenses,
      monthlyCashFlow,
      monthlySavingsInvestment,
      monthlyDebtPayments,

      // Key Indicators
      savingsRate,
      savingsRateStatus,
      dti,
      dtiStatus,
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
    };
  }, [liabilities, accounts, transactions, investments, budgets, baseCurrency]);
};
