
import { useMemo } from 'react';
import { PersonalAsset, PersonalLiability, CashFlowMetrics, Transaction, Account, Investment } from '../types';
import { convertAmount } from '../lib/money';

interface UseCashFlowMetricsProps {
  assets: PersonalAsset[];
  liabilities: PersonalLiability[];
  accounts: Account[];
  transactions: Transaction[];
  investments: Investment[];
  baseCurrency: string;
}

export const useCashFlowMetrics = ({
  assets,
  liabilities,
  accounts,
  transactions,
  investments,
  baseCurrency,
}: UseCashFlowMetricsProps): CashFlowMetrics => {

  return useMemo(() => {
    // ============================================
    // ASSET TOTALS
    // ============================================

    // From dedicated personal_assets table
    const assetTotalFromRegistry = assets.reduce(
      (acc, a) => acc + convertAmount(a.estimatedValue, a.currency, baseCurrency), 0
    );

    // From existing accounts (positive balances = assets, credit accounts counted separately)
    const accountAssetTotal = accounts
      .filter(a => a.type !== 'credit')
      .reduce((acc, a) => acc + Math.max(0, convertAmount(a.balance, a.currency, baseCurrency)), 0);

    // From existing investments
    const investmentTotal = investments.reduce(
      (acc, inv) => acc + convertAmount(inv.currentValue, inv.currency || 'USD', baseCurrency), 0
    );

    const totalAssets = assetTotalFromRegistry + accountAssetTotal + investmentTotal;

    // ============================================
    // ASSET BREAKDOWN BY TYPE
    // ============================================
    const assetByType = (type: string) => assets
      .filter(a => a.type === type)
      .reduce((acc, a) => acc + convertAmount(a.estimatedValue, a.currency, baseCurrency), 0);

    // Liquid = registered liquid assets + checking/savings accounts
    const registryLiquid = assetByType('liquid');
    const accountLiquid = accounts
      .filter(a => a.type === 'checking' || a.type === 'savings')
      .reduce((acc, a) => acc + Math.max(0, convertAmount(a.balance, a.currency, baseCurrency)), 0);
    const liquidAssets = registryLiquid + accountLiquid;

    // Financial = registered financial + investment accounts + investments
    const registryFinancial = assetByType('financial');
    const accountInvestment = accounts
      .filter(a => a.type === 'investment' || a.type === 'crypto')
      .reduce((acc, a) => acc + Math.max(0, convertAmount(a.balance, a.currency, baseCurrency)), 0);
    const financialAssets = registryFinancial + accountInvestment + investmentTotal;

    const realAssets = assetByType('real_physical');

    // Business = registered business + business accounts
    const registryBusiness = assetByType('business');
    const accountBusiness = accounts
      .filter(a => a.type === 'business')
      .reduce((acc, a) => acc + Math.max(0, convertAmount(a.balance, a.currency, baseCurrency)), 0);
    const businessAssets = registryBusiness + accountBusiness;

    const otherAssets = assetByType('other');

    // ============================================
    // ASSET BREAKDOWN BY CLASSIFICATION
    // ============================================
    const assetByClassification = (cls: string) => assets
      .filter(a => a.classification === cls)
      .reduce((acc, a) => acc + convertAmount(a.estimatedValue, a.currency, baseCurrency), 0);

    const productiveAssets = assetByClassification('productive');
    const defensiveAssets = assetByClassification('defensive');
    const consumptionAssets = assetByClassification('consumption');
    const intangibleAssets = assetByClassification('intangible');

    // ============================================
    // LIABILITY TOTALS
    // ============================================
    const liabilityTotal = liabilities.reduce(
      (acc, l) => acc + convertAmount(l.currentBalance, l.currency, baseCurrency), 0
    );

    // Credit card balances from existing accounts (negative = owed)
    const creditCardDebt = accounts
      .filter(a => a.type === 'credit')
      .reduce((acc, a) => acc + Math.abs(convertAmount(Math.min(0, a.balance), a.currency, baseCurrency)), 0);

    const totalLiabilities = liabilityTotal + creditCardDebt;

    // ============================================
    // NET WORTH
    // ============================================
    const netWorth = totalAssets - totalLiabilities;

    // ============================================
    // MONTHLY CASH FLOW (from transactions, last 30 days)
    // ============================================
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const limitStr = thirtyDaysAgo.toISOString().split('T')[0];

    const recentTx = transactions.filter(t =>
      t.date >= limitStr &&
      t.category !== 'Transfer' &&
      t.category !== 'Credit Card Payment' &&
      t.category !== 'Adjustment' &&
      t.category !== 'Starting Balance' &&
      t.name !== 'Starting Balance' &&
      t.name !== 'Balance Adjustment'
    );

    const monthlyNetIncome = recentTx
      .filter(t => t.type === 'credit')
      .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

    const monthlyTotalExpenses = recentTx
      .filter(t => t.type === 'debit')
      .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

    // Cash Flow = Cobros - Pagos
    const monthlyCashFlow = monthlyNetIncome - monthlyTotalExpenses;

    // Utility = Ingreso - Gastos (same formula, conceptually distinct)
    const monthlyUtility = monthlyNetIncome - monthlyTotalExpenses;

    // Monthly debt payments from liabilities registry
    const monthlyDebtPayments = liabilities.reduce(
      (acc, l) => acc + convertAmount(l.monthlyPayment, l.currency, baseCurrency), 0
    );

    // Savings + Investment = Cash Flow - (if positive, everything not spent is saved/invested)
    // Better: detect explicit investment transactions
    const monthlyInvestmentTransactions = recentTx
      .filter(t =>
        t.type === 'debit' &&
        (t.category === 'Investments' || t.category === 'Savings' || t.category === 'Investment')
      )
      .reduce((acc, t) => acc + convertAmount(t.numericAmount, t.currency || 'USD', baseCurrency), 0);

    // Productive asset income from the registry
    const monthlyAssetIncome = assets.reduce(
      (acc, a) => acc + convertAmount(a.monthlyIncome || 0, a.currency, baseCurrency), 0
    );

    const monthlySavingsInvestment = Math.max(0, monthlyCashFlow) + monthlyInvestmentTransactions;

    // ============================================
    // KEY METRICS
    // ============================================

    // Savings Rate = (Ahorro + Inversión) / Ingreso Neto
    const savingsRate = monthlyNetIncome > 0
      ? monthlySavingsInvestment / monthlyNetIncome
      : 0;

    const savingsRateStatus: CashFlowMetrics['savingsRateStatus'] =
      savingsRate >= 0.30 ? 'acceleration' :
        savingsRate >= 0.15 ? 'solid' : 'alarm';

    // DTI = Pagos mensuales de deuda / Ingreso neto mensual
    const dti = monthlyNetIncome > 0
      ? monthlyDebtPayments / monthlyNetIncome
      : 0;

    const dtiStatus: CashFlowMetrics['dtiStatus'] =
      dti > 0.4 ? 'high_pressure' :
        dti >= 0.2 ? 'acceptable' : 'room';

    // Liquidity Months = Activos líquidos / Gastos mensuales promedio
    const liquidityMonths = monthlyTotalExpenses > 0
      ? liquidAssets / monthlyTotalExpenses
      : liquidAssets > 0 ? 99 : 0;

    const liquidityStatus: CashFlowMetrics['liquidityStatus'] =
      liquidityMonths < 1 ? 'critical' :
        liquidityMonths < 3 ? 'high_risk' :
          liquidityMonths < 6 ? 'healthy' :
            liquidityMonths < 12 ? 'solid' : 'ultra_defensive';

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      liquidAssets,
      financialAssets,
      realAssets,
      businessAssets,
      otherAssets,
      productiveAssets,
      defensiveAssets,
      consumptionAssets,
      intangibleAssets,
      monthlyNetIncome,
      monthlyTotalExpenses,
      monthlyCashFlow,
      monthlyUtility,
      monthlySavingsInvestment,
      monthlyDebtPayments,
      savingsRate,
      savingsRateStatus,
      dti,
      dtiStatus,
      liquidityMonths,
      liquidityStatus,
    };
  }, [assets, liabilities, accounts, transactions, investments, baseCurrency]);
};
