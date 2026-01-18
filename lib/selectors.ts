
import { Account, Investment, Transaction, BudgetCategory, BusinessEntity } from '../types';
import { convertAmount, getCategoriesForBudget } from './money';

/**
 * Computes total Net Worth (Accounts + Investments) in base currency.
 */
export const computeNetWorth = (
  accounts: Account[],
  investments: Investment[],
  baseCurrency: string
): number => {
  const accountsNet = accounts.reduce((acc, curr) => {
      return acc + convertAmount(curr.balance, curr.currency, baseCurrency);
  }, 0);

  const investmentsNet = investments.reduce((acc, curr) => {
      return acc + convertAmount(curr.currentValue, curr.currency || 'USD', baseCurrency);
  }, 0);

  return accountsNet + investmentsNet;
};

/**
 * Computes monthly spend for each budget category.
 * Returns a new array of BudgetCategory with the 'spent' field populated.
 */
export const computeBudgetSpentMonthly = (
  budgets: BudgetCategory[],
  transactions: Transaction[],
  baseCurrency: string
): BudgetCategory[] => {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return budgets.map(budget => {
    const categories = getCategoriesForBudget(budget.category);
    
    const spent = transactions
      .filter(t => {
          if (t.category === 'Transfer') return false;
          
          // Strict matching: Transaction category must be in the mapped list.
          // Removed loose .includes() check to prevent false positives (e.g. "Car" matching "Career").
          const matchesCategory = categories.includes(t.category);
          
          const matchesMonth = t.date.startsWith(currentMonth);
          return matchesCategory && matchesMonth;
      })
      .reduce((acc, t) => {
          const settlementCurrency = t.accountCurrency || t.currency;
          const amountInBase = convertAmount(t.numericAmount || 0, settlementCurrency, baseCurrency);
          
          if (budget.type === 'income') {
              if (t.type === 'credit') return acc + amountInBase;
              if (t.type === 'debit') return acc - amountInBase;
          } else {
              if (t.type === 'debit') return acc + amountInBase;
              if (t.type === 'credit') return acc - amountInBase;
          }
          return acc;
      }, 0);

    return { ...budget, spent: Math.max(0, spent) };
  });
};

/**
 * Computes financial metrics (Revenue, Expenses, Profit, Margin) for business entities.
 * Returns a new array of BusinessEntity with the 'metrics' field populated.
 */
export const computeBusinessMetrics = (
    entities: BusinessEntity[],
    transactions: Transaction[],
    baseCurrency: string
): BusinessEntity[] => {
    return entities.map(entity => {
        const entityTx = transactions.filter(t => t.business_id === entity.id);
        
        const revenue = entityTx
            .filter(t => t.type === 'credit')
            .reduce((acc, t) => {
                return acc + convertAmount(t.numericAmount || 0, t.accountCurrency || t.currency || 'USD', baseCurrency);
            }, 0);

        const expenses = entityTx
            .filter(t => t.type === 'debit')
            .reduce((acc, t) => {
                return acc + convertAmount(t.numericAmount || 0, t.accountCurrency || t.currency || 'USD', baseCurrency);
            }, 0);

        const profit = revenue - expenses;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        
        // Future: Trend calculation could be added here comparing vs previous month
        const trend = 0; 

        return { ...entity, metrics: { revenue, expenses, profit, margin, trend } };
    });
};
