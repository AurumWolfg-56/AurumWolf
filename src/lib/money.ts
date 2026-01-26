
import { FX_RATES, CURRENCIES, BUDGET_MAPPING } from '../constants';
import { Transaction, BudgetCategory, Account } from '../types';

/**
 * Rounds a number to 2 decimal places to minimize floating point errors.
 */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Converts an amount from one currency to another using provided or default FX rates.
 */
export function convertAmount(amount: number, from: string, to: string, rates: Record<string, number> = FX_RATES): number {
  if (from === to) return amount;
  const fromRate = rates[from] || 1;
  const toRate = rates[to] || 1;
  // Convert to base (USD) then to target
  // Rate is 1 USD = X Currency
  const usdValue = amount / fromRate;
  const result = usdValue * toRate;
  return result; // Note: We return float for aggregation precision. Round at display time.
}

/**
 * Determines the settlement currency for a transaction.
 * Prioritizes the account currency if set (foreign transaction settlement), otherwise the transaction currency.
 */
export function getTxSettlementCurrency(tx: Transaction): string {
  return tx.accountCurrency || tx.currency;
}

/**
 * Standardized currency formatter.
 */
export function formatCurrency(
  val: number,
  currencyCode: string = 'USD',
  options: { privacy?: boolean; compact?: boolean; locale?: string } = {}
): string {
  if (options.privacy) return '••••••••';

  if (currencyCode === 'BTC') {
    return `₿${val.toFixed(4)}`;
  }

  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const locale = options.locale || currency.locale;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: options.compact ? 0 : 2,
    maximumFractionDigits: options.compact ? 0 : 2,
    notation: options.compact && Math.abs(val) > 1000000 ? "compact" : "standard",
    compactDisplay: "short"
  }).format(val);
}

/**
 * Gets all mapped categories for a specific budget name.
 */
export const getCategoriesForBudget = (budgetName: string): string[] => {
  const mapped = BUDGET_MAPPING[budgetName];
  if (mapped) return [...mapped, budgetName];
  return [budgetName];
};

/**
 * Recomputes an account's balance based on its initial snapshot and all relevant transactions.
 */
export function reconcileAccountBalance(account: Account, transactions: Transaction[]): number {
  const startBalance = account.initialBalance || 0;

  // Get all transactions for this account
  const accountTxs = transactions.filter(t => t.accountId === account.id);

  // Calculate net change
  // Note: Transaction `numericAmount` is already stored in the Account's currency (Settlement Amount)
  const netChange = accountTxs.reduce((acc, t) => {
    // Credit adds to balance, Debit subtracts
    // This logic works for both positive asset accounts and negative liability accounts (credit cards)
    // e.g. Credit Card Balance -500. Debit Tx (Expense) 50. -500 - 50 = -550. Correct.
    // e.g. Credit Card Balance -550. Credit Tx (Payment) 100. -550 + 100 = -450. Correct.
    if (t.type === 'credit') return acc + t.numericAmount;
    if (t.type === 'debit') return acc - t.numericAmount;
    return acc;
  }, 0);

  return round2(startBalance + netChange);
}
