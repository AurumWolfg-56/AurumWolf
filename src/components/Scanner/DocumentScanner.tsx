
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { useReceiptScanner, ScannedReceiptData } from '../../hooks/useReceiptScanner';
import { useSecurity } from '../../contexts/SecurityContext';

interface DocumentScannerProps {
    onClose: () => void;
    onSave: (data: ScannedReceiptData) => void;
}

// Memoized Field component to prevent re-renders
const Field = React.memo(({ label, value }: { label: string, value: string }) => (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1 font-bold">{label}</p>
        <p className="text-base text-white font-medium">{value}</p>
    </div>
));

Field.displayName = 'Field';

export const DocumentScanner: React.FC<DocumentScannerProps> = ({ onClose, onSave }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [scannedData, setScannedData] = useState<ScannedReceiptData | null>(null);
    const { setSecurityBypass } = useSecurity();

    // Track if we initiated file selection to prevent flicker
    const isSelectingFileRef = useRef(false);

    const handleScanComplete = useCallback((data: ScannedReceiptData) => {
        setScannedData(data);
    }, []);

    const { isScanning, scanReceipt, error } = useReceiptScanner({
        onScanComplete: handleScanComplete
    });

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            isSelectingFileRef.current = false;
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
            scanReceipt(file);
        } else {
            // User cancelled file selection - reset bypass after delay
            setTimeout(() => {
                isSelectingFileRef.current = false;
                setSecurityBypass(false);
            }, 500);
        }
    }, [scanReceipt, setSecurityBypass]);

    const triggerScanner = useCallback((useCamera: boolean) => {
        if (fileInputRef.current) {
            // Set bypass BEFORE triggering file dialog
            isSelectingFileRef.current = true;
            setSecurityBypass(true);

            if (useCamera) {
                fileInputRef.current.setAttribute('capture', 'environment');
            } else {
                fileInputRef.current.removeAttribute('capture');
            }

            // Small delay to ensure bypass is set before focus leaves
            requestAnimationFrame(() => {
                fileInputRef.current?.click();
            });
        }
    }, [setSecurityBypass]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
            scanReceipt(file);
        }
    }, [scanReceipt]);

    const handleClose = useCallback(() => {
        setSecurityBypass(false);
        onClose();
    }, [setSecurityBypass, onClose]);

    const handleReset = useCallback(() => {
        setPreview(null);
        setScannedData(null);
    }, []);

    const handleConfirm = useCallback(() => {
        if (scannedData) {
            onSave(scannedData);
        }
    }, [scannedData, onSave]);

    // Memoize results section to prevent unnecessary re-renders
    const ResultsSection = useMemo(() => {
        if (error) {
            return (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-200/80">{error}</p>
                </div>
            );
        }

        if (scannedData) {
            return (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Amount" value={scannedData.amount ? `$${scannedData.amount.toLocaleString()}` : '—'} />
                        <Field label="Date" value={scannedData.date || '—'} />
                    </div>
                    <Field label="Merchant" value={scannedData.merchant || '—'} />
                    <Field label="Category" value={scannedData.category || '—'} />

                    <div className="pt-2">
                        <div className="flex items-center gap-2 text-[9px] text-[#d4af37] mb-3 font-bold uppercase tracking-[0.2em]">
                            <CheckCircle2 className="w-3 h-3" />
                            Securely Verified
                        </div>
                        <button
                            onClick={handleConfirm}
                            className="w-full py-4 bg-[#d4af37] text-black font-bold rounded-xl hover:bg-[#c4a030] transition-all transform active:scale-95 shadow-lg shadow-[#d4af37]/20 flex items-center justify-center gap-2"
                        >
                            Confirm Transaction <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                <Loader2 className="w-6 h-6 text-white/10 animate-spin mb-3" />
                <p className="text-[10px] text-white/20 uppercase tracking-[0.1em]">Awaiting Data...</p>
            </div>
        );
    }, [error, scannedData, handleConfirm]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm scanner-container">
            <div className="bg-[#0a0a0a] border border-[#d4af37]/20 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-[#d4af37]/5">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-[#d4af37]/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#d4af37]/20 flex items-center justify-center">
                            <Camera className="w-5 h-5 text-[#d4af37]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-cinzel font-bold text-white">Intelligent Scanner</h2>
                            <p className="text-xs text-white/40 uppercase tracking-widest font-medium">AI-Powered Data Extraction</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                <div className="p-4 md:p-8 max-h-[75vh] md:max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {!preview ? (
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            className="group border-2 border-dashed border-white/10 rounded-2xl p-6 md:p-12 flex flex-col items-center justify-center gap-4 md:gap-6 hover:border-[#d4af37]/50 hover:bg-[#d4af37]/5 transition-all text-center"
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept="image/*,application/pdf"
                            />

                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Upload className="w-8 h-8 md:w-10 md:h-10 text-white/20 group-hover:text-[#d4af37]" />
                            </div>

                            <div className="space-y-1">
                                <p className="text-lg md:text-xl font-medium text-white">Capture Receipt</p>
                                <p className="text-xs md:text-sm text-white/40 max-w-xs mx-auto">Upload an image or use your camera to extract financial details instantly.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                                <button
                                    onClick={() => triggerScanner(true)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-[#d4af37] text-black font-bold py-3 rounded-xl hover:bg-[#c4a030] transition-all active:scale-95"
                                >
                                    <Camera size={18} /> Open Camera
                                </button>
                                <button
                                    onClick={() => triggerScanner(false)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-all border border-white/10 active:scale-95"
                                >
                                    <Upload size={18} /> Upload Image
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <span className="px-2 py-0.5 rounded-full bg-white/5 text-[9px] text-white/40 border border-white/10 uppercase tracking-tighter">JPG/PNG</span>
                                <span className="px-2 py-0.5 rounded-full bg-white/5 text-[9px] text-white/40 border border-white/10 uppercase tracking-tighter">PDF</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 md:gap-8">
                            {/* Preview - stable key prevents remounting */}
                            <div className="space-y-4">
                                <div className="aspect-video lg:aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-black relative group shadow-inner no-flicker">
                                    <img
                                        key="preview-image"
                                        src={preview}
                                        alt="Scan Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center overflow-hidden transition-opacity duration-300 ${isScanning ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                        <div className="w-full h-1 bg-[#d4af37] absolute top-0 shadow-[0_0_20px_#d4af37] animate-scan" />
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
                                            <p className="text-[#d4af37] font-bold tracking-[0.2em] text-[10px] uppercase animate-pulse">Extracting Intelligence</p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleReset}
                                    className="w-full py-2 text-[10px] uppercase tracking-widest font-bold text-white/40 hover:text-[#d4af37] transition-colors"
                                >
                                    Change Source
                                </button>
                            </div>

                            {/* Data Extraction */}
                            <div className="flex flex-col h-full space-y-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
                                    <h3 className="text-xs font-bold text-white/80 uppercase tracking-widest">Analysis Results</h3>
                                </div>
                                {ResultsSection}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center">
                    <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">AurumWolf Financial Encryption Active</p>
                </div>
            </div>
        </div>
    );
};
