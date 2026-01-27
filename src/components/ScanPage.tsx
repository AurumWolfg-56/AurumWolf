import React, { useState } from 'react';
import { Transaction } from '../types';
import { DocumentScanner } from './Scanner/DocumentScanner';
import { ScannedReceiptData } from '../hooks/useReceiptScanner';
import { Camera, Upload, Sparkles } from 'lucide-react';

interface ScanPageProps {
  onScanComplete: (data: Partial<Transaction>) => void;
  onCancel: () => void;
  t: (key: string) => string;
}

export const ScanPage: React.FC<ScanPageProps> = ({ onScanComplete, onCancel, t }) => {
  const [showScanner, setShowScanner] = useState(false);

  const handleScanConfirm = (data: ScannedReceiptData) => {
    // Close scanner first
    setShowScanner(false);

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

    // Small delay to ensure scanner is closed before navigation
    setTimeout(() => {
      onScanComplete(result);
    }, 100);
  };

  const handleClose = () => {
    setShowScanner(false);
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto min-h-[80vh] flex flex-col justify-center px-4">
      {/* Header Section */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#d4af37]/20 to-[#d4af37]/5 border border-[#d4af37]/30 mb-6 shadow-lg shadow-[#d4af37]/10">
          <Camera className="w-10 h-10 text-[#d4af37]" />
        </div>
        <h1 className="text-3xl font-display font-bold text-white mb-3">Intelligent Receipts</h1>
        <p className="text-neutral-400 max-w-sm mx-auto leading-relaxed">
          Upload or capture any receipt to automatically extract and categorize your expenses using Aurum AI.
        </p>
      </div>

      {/* Action Cards */}
      <div className="space-y-4 max-w-md mx-auto w-full">
        <button
          onClick={() => setShowScanner(true)}
          className="w-full p-6 rounded-2xl bg-gradient-to-r from-[#d4af37] to-[#c4a030] text-black font-bold text-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-[#d4af37]/30"
        >
          <Camera className="w-6 h-6" />
          Scan Receipt
        </button>

        <button
          onClick={onCancel}
          className="w-full p-4 rounded-xl bg-white/5 text-white/60 font-medium hover:bg-white/10 transition-all border border-white/10"
        >
          Cancel
        </button>
      </div>

      {/* Features */}
      <div className="mt-12 grid grid-cols-3 gap-4 max-w-md mx-auto w-full">
        <div className="text-center p-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">AI Powered</p>
        </div>
        <div className="text-center p-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
            <Upload className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Any Format</p>
        </div>
        <div className="text-center p-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
            <Camera className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Camera Ready</p>
        </div>
      </div>

      {/* Scanner Modal - Only shown when active */}
      {showScanner && (
        <DocumentScanner
          onClose={handleClose}
          onSave={handleScanConfirm}
        />
      )}
    </div>
  );
};
