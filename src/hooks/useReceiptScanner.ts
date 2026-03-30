
import { useState } from 'react';
import { CURRENCIES, CATEGORIES } from '../constants';
import { toast } from 'sonner';
import { localAI, LocalAIError } from '../lib/ai/localAI';

export interface ScannedReceiptData {
    amount?: number;
    currency?: string;
    merchant?: string;
    date?: string;
    category?: string;
    description?: string;
}

interface UseReceiptScannerProps {
    onScanComplete?: (data: ScannedReceiptData) => void;
}

export const useReceiptScanner = ({ onScanComplete }: UseReceiptScannerProps) => {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const scanReceipt = async (file: File) => {
        setIsScanning(true);
        setError(null);

        try {
            // 1. Check if LM Studio is available
            const available = await localAI.isAvailable();
            if (!available) {
                throw new LocalAIError(
                    'LM Studio is not running. Please start LM Studio and load the Qwen2.5 VL model to scan receipts.',
                    'OFFLINE',
                    false
                );
            }

            // 2. Resize image to avoid huge payloads
            const resizedBase64 = await resizeImage(file, 1024);

            // 3. Build the prompt
            const categoryList = CATEGORIES.map(c => c.category).join(', ');
            const prompt = `You are a receipt data extraction assistant. Analyze this receipt image carefully.

Extract the following information and respond ONLY with a JSON object (no markdown, no explanation):

{
  "amount": <number or null>,
  "currency": "<ISO 4217 code like USD, MXN, EUR or null>",
  "merchant": "<store/business name or null>",
  "date": "<YYYY-MM-DD format or null>",
  "category": "<best match from: ${categoryList}, or null>",
  "description": "<brief 3-5 word summary of items or null>"
}

Rules:
- amount must be a number (no currency symbols), use the TOTAL amount
- If you cannot identify a field, set it to null
- Respond with ONLY the JSON object, nothing else`;

            // 4. Call local AI with vision
            const response = await localAI.vision(resizedBase64, prompt, {
                temperature: 0.1,
                max_tokens: 512,
            });

            // 5. Parse response
            if (response.text) {
                const data = localAI.parseJSON<ScannedReceiptData>(response.text);

                // Validate currency against supported list
                if (data.currency) {
                    const supported = CURRENCIES.find(c => c.code === data.currency);
                    if (supported) data.currency = supported.code;
                }

                onScanComplete?.(data);
            } else {
                throw new Error('No response from AI model');
            }

        } catch (err: any) {
            console.error('Receipt scanning failed:', err);
            const msg = err.message || 'Scanning failed';
            setError(msg);

            if (err instanceof LocalAIError) {
                switch (err.code) {
                    case 'OFFLINE':
                        toast.error('🔌 LM Studio no está corriendo. Inicia LM Studio para escanear recibos.');
                        break;
                    case 'TIMEOUT':
                        toast.warning('⏳ El modelo está procesando. Intenta de nuevo en unos segundos.');
                        break;
                    case 'PARSE_ERROR':
                        toast.error('⚠️ No se pudo leer el recibo correctamente. Intenta con una foto más clara.');
                        break;
                    default:
                        toast.error(`Error de AI: ${msg}`);
                }
            } else {
                toast.error('Error procesando recibo: ' + msg);
            }
        } finally {
            setIsScanning(false);
        }
    };

    // Helper: Resize Image
    const resizeImage = (file: File, maxDim: number): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxDim) {
                            height *= maxDim / width;
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width *= maxDim / height;
                            height = maxDim;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataUrl.split(',')[1]); // raw base64 without prefix
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
        });
    };

    return {
        isScanning,
        error,
        scanReceipt
    };
};
