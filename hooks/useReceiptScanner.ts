
import { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { CURRENCIES, CATEGORIES } from '../constants';

export interface ScannedReceiptData {
    amount?: number;
    currency?: string;
    merchant?: string;
    date?: string;
    category?: string;
    description?: string;
}

interface UseReceiptScannerProps {
    apiKey?: string;
    onScanComplete?: (data: ScannedReceiptData) => void;
}

export const useReceiptScanner = ({ apiKey, onScanComplete }: UseReceiptScannerProps) => {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const scanReceipt = async (file: File) => {
        if (!apiKey) {
            const msg = "API Key missing.";
            setError(msg);
            alert(msg);
            return;
        }

        setIsScanning(true);
        setError(null);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const result = reader.result as string;
                const base64Data = result.includes(',') ? result.split(',')[1] : result;
                const ai = new GoogleGenAI({ apiKey });

                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash', // Upgraded to latest fast model
                    contents: {
                        parts: [
                            { inlineData: { mimeType: file.type, data: base64Data } },
                            {
                                text: `Analyze this receipt/invoice image. Extract the following fields strictly as JSON:
                                - amount (number, e.g. 12.50)
                                - currency (ISO code, e.g. USD, EUR, MXN)
                                - merchant (string, store name)
                                - date (YYYY-MM-DD format)
                                - category (Best match from this list: ${CATEGORIES.map(c => c.name).join(', ')})
                                - description (short summary of items purchased)`
                            }
                        ]
                    },
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                amount: { type: Type.NUMBER },
                                currency: { type: Type.STRING },
                                merchant: { type: Type.STRING },
                                date: { type: Type.STRING },
                                category: { type: Type.STRING },
                                description: { type: Type.STRING },
                            }
                        }
                    }
                });

                if (response.text) {
                    const data = JSON.parse(response.text) as ScannedReceiptData;
                    // Normalize currency if possible
                    if (data.currency) {
                        const supported = CURRENCIES.find(c => c.code === data.currency);
                        if (supported) data.currency = supported.code;
                    }
                    onScanComplete?.(data);
                } else {
                    throw new Error("No text returned from AI");
                }
                setIsScanning(false);
            };
            reader.onerror = () => {
                throw new Error("Failed to read file");
            }
        } catch (err: any) {
            console.error("Scanning failed", err);
            setError(err.message || "Scanning failed");
            setIsScanning(false);
            alert("Scanning failed. Please try again.");
        }
    };

    return {
        isScanning,
        error,
        scanReceipt
    };
};
