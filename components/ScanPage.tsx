import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, Camera, FileText, Loader2, CheckCircle2, X, Image as ImageIcon,
  Zap, ArrowRight, ScanLine, FileCheck
} from 'lucide-react';
import { Transaction } from '../types';
import { CATEGORIES } from '../constants';
import { useReceiptScanner, ScannedReceiptData } from '../hooks/useReceiptScanner';
import { ReceiptReviewModal } from './ReceiptReviewModal';

interface ScanPageProps {
  onScanComplete: (data: Partial<Transaction>) => void;
  onCancel: () => void;
  t: (key: string) => string;
}

export const ScanPage: React.FC<ScanPageProps> = ({ onScanComplete, onCancel, t }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);



  // Unified Scanner Hook
  const [scannedData, setScannedData] = useState<ScannedReceiptData | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);

  const { isScanning: isProcessing, scanReceipt } = useReceiptScanner({
    onScanComplete: (data) => {
      setScannedData(data);
      setReviewModalOpen(true);
      // Wait for user confirmation in modal
    }
  });

  const processFile = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setScanPreview(previewUrl);
    await scanReceipt(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
    setReviewModalOpen(false);
    setScanPreview(null);
  };

  // --- DRAG & DROP HANDLERS ---
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto pb-20 md:pb-0 h-[85vh] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <ScanLine size={24} className="text-gold-500" /> {t('scan.title')}
          </h1>
          <p className="text-neutral-500 text-sm">{t('scan.subtitle')}</p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Drop Zone */}
      <div
        className={`
            relative flex-1 rounded-[1.5rem] md:rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden group
            ${isDragging
            ? 'border-gold-500 bg-gold-500/10 scale-[1.02]'
            : 'border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-700'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,application/pdf"
          onChange={handleFileInput}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center z-10">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gold-500 blur-xl opacity-20 animate-pulse"></div>
              <ScanLine size={64} className="text-gold-500 animate-pulse relative z-10" />
              {/* Scanning Line Animation */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gold-400 shadow-[0_0_15px_#D4AF37] animate-[scan_2s_ease-in-out_infinite]"></div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t('scan.analyzing')}</h3>
            <p className="text-neutral-500 text-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> {t('scan.extracting')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center z-10 pointer-events-none">
            <div className={`
                    w-20 h-20 rounded-3xl bg-neutral-950 border border-neutral-800 flex items-center justify-center mb-6 shadow-2xl transition-transform duration-500
                    ${isDragging ? 'scale-110 border-gold-500 text-gold-500' : 'text-neutral-500 group-hover:text-white group-hover:border-neutral-600'}
                 `}>
              <Upload size={32} />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              {isDragging ? t('scan.dragDrop') : t('scan.tapDrop')}
            </h3>
            <p className="text-neutral-500 text-sm max-w-xs text-center mb-8">
              {t('scan.supports')}
            </p>

            <div className="flex gap-4 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture'); // Reset first
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-neutral-950 font-bold text-sm flex items-center gap-2 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
              >
                <Camera size={16} /> {t('scan.openCamera')}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm flex items-center gap-2 border border-neutral-700 transition-all"
              >
                <ImageIcon size={16} /> {t('scan.uploadFile')}
              </button>
            </div>
          </div>
        )}

        {/* Background Grid Decoration */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
        </div>
      </div>

      {/* Recent Activity Footer - Only show if we have history (Server side TODO) */}
      {/* Recent Activity Footer - Removed Mock Data */}

      <style>{`
        @keyframes scan {
            0% { top: 0; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
      `}</style>

      {/* Verification Modal */}
      <ReceiptReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onConfirm={handleScanConfirm}
        initialData={scannedData}
        imagePreview={scanPreview}
      />
    </div>
  );
};