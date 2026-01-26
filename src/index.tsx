import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { AccountsProvider } from './contexts/AccountsContext';
import { TransactionsProvider } from './contexts/TransactionsContext';
import { BudgetsProvider } from './contexts/BudgetsContext';
import { InvestmentsProvider } from './contexts/InvestmentsContext';
import { BusinessProvider } from './contexts/BusinessContext';
import { CategoryProvider } from './contexts/CategoryContext';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AccountsProvider>
        <TransactionsProvider>
          <BusinessProvider>
            <InvestmentsProvider>
              <CategoryProvider>
                <BudgetsProvider>
                  <App />
                </BudgetsProvider>
              </CategoryProvider>
            </InvestmentsProvider>
          </BusinessProvider>
        </TransactionsProvider>
      </AccountsProvider>
    </AuthProvider>
  </React.StrictMode>
);
