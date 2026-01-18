
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AccountsProvider } from './contexts/AccountsContext';
import { TransactionsProvider } from './contexts/TransactionsContext';
import { BudgetsProvider } from './contexts/BudgetsContext';
import { InvestmentsProvider } from './contexts/InvestmentsContext';
import { BusinessProvider } from './contexts/BusinessContext';
import { AuthProvider } from './contexts/AuthContext';

import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AccountsProvider>
        <TransactionsProvider>
          <BudgetsProvider>
            <InvestmentsProvider>
              <BusinessProvider>
                <App />
              </BusinessProvider>
            </InvestmentsProvider>
          </BudgetsProvider>
        </TransactionsProvider>
      </AccountsProvider>
    </AuthProvider>
  </React.StrictMode>
);
