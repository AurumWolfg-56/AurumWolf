
import React, { useState, useEffect } from 'react';
import { X, Check, Calculator, Store, Calendar, Tag, AlertTriangle } from 'lucide-react';
import { ScannedReceiptData } from '../hooks/useReceiptScanner';
import { CATEGORIES, CURRENCIES } from '../constants';
import { convertAmount } from '../lib/money';

// This modal allows the user to review the AI-extracted data against the original image
// satisfying the user request "permita comprobar cada elemento"

interface ReceiptReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: ScannedReceiptData) => void;
    initialData: ScannedReceiptData | null;
    imagePreview: string | null;
    isProcessing?: boolean;
}

export const ReceiptReviewModal: React.FC<ReceiptReviewModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    initialData,
    imagePreview,
    isProcessing = false
}) => {
    // Local state for editing fields
    const [amount, setAmount] = useState('');
    const [merchant, setMerchant] = useState('');
    const [date, setDate] = useState('');
    const [category, setCategory] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (isOpen && initialData) {
            setAmount(initialData.amount?.toString() || '');
            setMerchant(initialData.merchant || '');
            setDate(initialData.date || new Date().toISOString().split('T')[0]);
            setCategory(initialData.category || '');
            setCurrency(initialData.currency || 'USD');
            setDescription(initialData.description || '');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm({
            amount: parseFloat(amount) || 0,
            merchant,
            date,
            category,
            currency,
            description
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[80] bg-neutral-950/90 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-8 animate-fade-in">
            <div className="bg-white dark:bg-neutral-900 w-full max-w-5xl h-full md:h-[85vh] rounded-none md:rounded-3xl shadow-2xl flex overflow-hidden border border-neutral-200 dark:border-neutral-800 flex-col md:flex-row safe-pb">

                {/* LEFT: Image Preview (Scrollable/Zoomable ideally, keeping simple for now) */}
                <div className="md:w-1/2 bg-neutral-950 relative flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-neutral-800">
                    {imagePreview ? (
                        <img
                            src={imagePreview}
                            alt="Receipt Preview"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        />
                    ) : (
                        <div className="text-neutral-500 flex flex-col items-center">
                            <AlertTriangle size={48} className="mb-2" />
                            <p>No image preview available</p>
                        </div>
                    )}
                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        Original Image
                    </div>
                </div>

                {/* RIGHT: Form Fields */}
                <div className="md:w-1/2 flex flex-col h-full bg-platinum-50 dark:bg-neutral-900/50">
                    <div className="p-6 border-b border-platinum-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900">
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Verify Receipt</h2>
                            <p className="text-xs text-neutral-500">Please check extracted data against the image.</p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-platinum-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-32 md:pb-6">
                        {/* Amount & Currency */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className="label-text mb-1.5">Currency</label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="input-field"
                                >
                                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="label-text mb-1.5">Total Amount</label>
                                <div className="relative">
                                    <Calculator size={16} className="absolute left-3 top-3.5 text-neutral-500" />
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="input-field pl-10 font-mono font-bold text-lg"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Merchant */}
                        <div>
                            <label className="label-text mb-1.5">Merchant Name</label>
                            <div className="relative">
                                <Store size={16} className="absolute left-3 top-3.5 text-neutral-500" />
                                <input
                                    type="text"
                                    value={merchant}
                                    onChange={(e) => setMerchant(e.target.value)}
                                    className="input-field pl-10"
                                    placeholder="e.g. Starbucks"
                                />
                            </div>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="label-text mb-1.5">Date</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-3.5 text-neutral-500" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="input-field pl-10 [&::-webkit-calendar-picker-indicator]:opacity-0 absolute inset-0 opacity-0 z-10 w-full"
                                />
                                <input
                                    type="text"
                                    value={date}
                                    readOnly
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="label-text mb-1.5">Category</label>
                            <div className="grid grid-cols-2 gap-2">
                                {CATEGORIES.slice(0, 8).map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategory(cat.name)}
                                        className={`p-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-2 ${category === cat.name
                                            ? 'bg-gold-500 text-neutral-950 border-gold-500'
                                            : 'bg-white dark:bg-neutral-950 border-platinum-200 dark:border-neutral-800 text-neutral-500 hover:border-gold-500/50'
                                            }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${cat.color.replace('bg-', 'bg-')}`}></div>
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="label-text mb-1.5">Summary / Items</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="input-field h-24 resize-none"
                                placeholder="Extracted line items..."
                            />
                        </div>
                    </div>

                    <div className="p-6 border-t border-platinum-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-platinum-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold hover:bg-platinum-200 dark:hover:bg-neutral-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!amount || !merchant}
                            className="flex-1 py-3 rounded-xl bg-gold-500 text-neutral-950 font-bold hover:bg-gold-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Check size={18} /> Confirm & Use
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .label-text {
                    @apply block text-xs font-bold text-neutral-500 uppercase tracking-wider;
                }
                .input-field {
                    @apply w-full bg-white dark:bg-neutral-950 border border-platinum-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 transition-all;
                }
            `}</style>
        </div>
    );
};
