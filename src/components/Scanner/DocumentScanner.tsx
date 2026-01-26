
import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { useReceiptScanner, ScannedReceiptData } from '../../hooks/useReceiptScanner';

interface DocumentScannerProps {
    onClose: () => void;
    onSave: (data: ScannedReceiptData) => void;
}

export const DocumentScanner: React.FC<DocumentScannerProps> = ({ onClose, onSave }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [scannedData, setScannedData] = useState<ScannedReceiptData | null>(null);

    const { isScanning, scanReceipt, error } = useReceiptScanner({
        onScanComplete: (data) => {
            setScannedData(data);
        }
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
            scanReceipt(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
            scanReceipt(file);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
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
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                <div className="p-8">
                    {!preview ? (
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className="group border-2 border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-[#d4af37]/50 hover:bg-[#d4af37]/5 transition-all cursor-pointer"
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept="image/*"
                                capture="environment"
                            />
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Upload className="w-8 h-8 text-white/20 group-hover:text-[#d4af37]" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-medium text-white mb-1">Upload or Capture</p>
                                <p className="text-sm text-white/40">Drop your document here or click to scan</p>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] text-white/40 border border-white/10">JPG</span>
                                <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] text-white/40 border border-white/10">PNG</span>
                                <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] text-white/40 border border-white/10">WEBP</span>
                            </div>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                            {/* Preview */}
                            <div className="space-y-4">
                                <div className="aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-black relative group">
                                    <img src={preview} alt="Scan Preview" className="w-full h-full object-cover" />
                                    {isScanning && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center overflow-hidden">
                                            <div className="w-full h-1 bg-[#d4af37]/50 absolute top-0 shadow-[0_0_20px_#d4af37] animate-scan" />
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
                                                <p className="text-[#d4af37] font-medium tracking-widest text-xs uppercase animate-pulse">Analyzing...</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => { setPreview(null); setScannedData(null); }}
                                    className="w-full py-2 text-xs text-white/40 hover:text-white transition-colors"
                                >
                                    Select different image
                                </button>
                            </div>

                            {/* Data Extraction */}
                            <div className="flex flex-col h-full">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
                                        <h3 className="text-sm font-semibold text-white/80">Extracted Foundation</h3>
                                    </div>

                                    {error ? (
                                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start">
                                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-200/80">{error}</p>
                                        </div>
                                    ) : scannedData ? (
                                        <div className="space-y-3 animate-in fade-in duration-500">
                                            <Field label="Amount" value={scannedData.amount ? `$${scannedData.amount.toLocaleString()}` : '—'} />
                                            <Field label="Merchant" value={scannedData.merchant || '—'} />
                                            <Field label="Date" value={scannedData.date || '—'} />
                                            <Field label="Category" value={scannedData.category || '—'} />
                                            <div className="pt-4">
                                                <div className="flex items-center gap-2 text-[10px] text-[#d4af37] mb-2 font-bold uppercase tracking-widest">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Verified by AI
                                                </div>
                                                <button
                                                    onClick={() => onSave(scannedData)}
                                                    className="w-full py-3 bg-[#d4af37] text-black font-bold rounded-xl hover:bg-[#c4a030] transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-[#d4af37]/20"
                                                >
                                                    Continue with these details
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-48 border border-dashed border-white/5 rounded-xl">
                                            <Loader2 className="w-6 h-6 text-white/10 animate-spin mb-2" />
                                            <p className="text-xs text-white/20">Waiting for extraction...</p>
                                        </div>
                                    )}
                                </div>
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

const Field = ({ label, value }: { label: string, value: string }) => (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1 font-bold">{label}</p>
        <p className="text-base text-white font-medium">{value}</p>
    </div>
);
