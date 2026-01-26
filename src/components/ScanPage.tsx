import React from 'react';
import { Transaction } from '../types';
import { DocumentScanner } from './Scanner/DocumentScanner';
import { ScannedReceiptData } from '../hooks/useReceiptScanner';

interface ScanPageProps {
  onScanComplete: (data: Partial<Transaction>) => void;
  onCancel: () => void;
  t: (key: string) => string;
}

export const ScanPage: React.FC<ScanPageProps> = ({ onScanComplete, onCancel, t }) => {
  const handleScanConfirm = (data: ScannedReceiptData) => {
    // Map to Partial<Transaction>
    const result: Partial<Transaction> = {
      amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency || 'USD' }).format(data.amount || 0),
      numericAmount: data.amount || 0,
      currency: data.currency,
      name: data.merchant,
      date: data.date,
      category: data.category,
      description: data.description
    };
    onScanComplete(result);
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto h-[80vh] flex flex-col justify-center">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-display font-bold text-white mb-3">Intelligent Receipts</h1>
        <p className="text-neutral-500 max-w-sm mx-auto">Upload or capture any receipt to automatically extract and categorize your expenses using Aurum AI.</p>
      </div>

      {/* Re-use the unified Intelligent Scanner component */}
      <DocumentScanner
        onClose={onCancel}
        onSave={handleScanConfirm}
      />
    </div>
  );
};
