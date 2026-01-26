
import { useState } from 'react';
import { Type } from "@google/genai";
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
        setIsScanning(true);
        setError(null);

        try {
            // 1. Resize Image to avoid Payload Limits (Max 1024px)
            const resizedBase64 = await resizeImage(file, 1024);

            // 2. Use Proxy Client
            const { aiClient } = await import('../lib/ai/proxy');

            // 3. Call AI
            const response = await aiClient.generateContent(
                'gemini-2.0-flash',
                [
                    {
                        role: 'user',
                        parts: [
                            { inlineData: { mimeType: 'image/jpeg', data: resizedBase64 } },
                            {
                                text: `Analyze this receipt image. Extract as many details as possible:
                                - Total Amount (number only)
                                - Currency Code (ISO format like USD, MXN)
                                - Merchant Name
                                - Date (YYYY-MM-DD)
                                - Category (Choose best from: ${CATEGORIES.map(c => c.category).join(', ')})
                                - Description (Brief summary of items)
                                
                                Return null for any field that cannot be clearly identified.`
                            }
                        ]
                    }
                ],
                {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            amount: { type: "NUMBER", description: "Total transaction amount", nullable: true },
                            currency: { type: "STRING", description: "ISO 4217 currency code", nullable: true },
                            merchant: { type: "STRING", description: "Name of the merchant or business", nullable: true },
                            date: { type: "STRING", description: "Transaction date in YYYY-MM-DD format", nullable: true },
                            category: { type: "STRING", description: "Best matching category", nullable: true },
                            description: { type: "STRING", description: "Short description of purchased items", nullable: true }
                        }
                        // removed required array to allow partial extraction
                    }
                }
            );

            const text = response.text();
            if (text) {
                // Sanitize Markdown
                const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
                const data = JSON.parse(cleanText) as ScannedReceiptData;

                if (data.currency) {
                    const supported = CURRENCIES.find(c => c.code === data.currency);
                    if (supported) data.currency = supported.code;
                }
                onScanComplete?.(data);
            } else {
                throw new Error("No text returned from AI");
            }

        } catch (err: any) {
            console.error("Scanning failed", err);
            const msg = err.message || "Scanning failed";
            setError(msg);

            // Handle Rate Limiting specifically
            if (msg.includes("429") || msg.includes("Quota") || msg.includes("limit")) {
                alert("⏳ AI Traffic High (Rate Limit)\n\nGoogle's free AI service is busy. Please wait 30-60 seconds and try again.");
            } else {
                alert("Error processing receipt: " + msg);
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
                    // Return raw base64 string (no data:image/jpeg;base64, prefix) for Gemini
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataUrl.split(',')[1]);
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
