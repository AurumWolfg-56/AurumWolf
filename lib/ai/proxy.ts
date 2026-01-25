
import { supabase } from '../supabase';

/**
 * Valid Gemini Model Names
 */
export type GeminiModel =
    | 'gemini-2.0-flash-exp'
    | 'gemini-2.0-flash'
    | 'gemini-2.5-flash';

export interface GenerationConfig {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: any;
    tools?: any[];
    responseModalities?: string[];
    speechConfig?: any;
    systemInstruction?: string;
}

export interface ContentPart {
    text?: string;
    inlineData?: {
        mimeType: string;
        data: string;
    };
}

export interface Content {
    role?: 'user' | 'model';
    parts: ContentPart[];
}

/**
 * Secure AI Client
 * Proxies requests to Supabase Edge Function 'gemini-proxy'
 * to avoid exposing API Keys in the frontend.
 */
// --- DIRECT CLIENT FALLBACK REMOVED FOR SECURITY ---
// All requests must go through Supabase Edge Function



export class AIError extends Error {
    constructor(
        public message: string,
        public code: 'QUOTA_EXCEEDED' | 'UNAUTHORIZED' | 'SERVER_ERROR' | 'UNKNOWN',
        public retryable: boolean = false
    ) {
        super(message);
        this.name = 'AIError';
    }
}

export const aiClient = {
    /**
     * Generate content (Text, JSON, Audio)
     * Strategy: Try Direct API (if Key exists) -> Fallback to Proxy
     */
    generateContent: async (model: GeminiModel, contents: Content[], config?: GenerationConfig) => {
        // STRATEGY: ALWAYS USE SUPABASE PROXY (Secure)
        // We removed the direct client fallback to prevent API key exposure in the client bundle.

        // 1. Prepare Payload (Common for both)
        const { systemInstruction, tools, ...restConfig } = config || {};

        // Construct standard Gemini REST Request Body
        const payload: any = {
            contents,
            generationConfig: restConfig,
        };
        if (systemInstruction) {
            // Supports both simple string or object format
            payload.systemInstruction = typeof systemInstruction === 'string'
                ? { parts: [{ text: systemInstruction }] }
                : systemInstruction;
        }
        if (tools) payload.tools = tools;


        // 2. STRATEGY: SUPABASE PROXY (Secure)
        // Direct client logic removed to force server-side execution.

        // A. Auth Check
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new AIError("Unauthorized: User must be logged in to use AI.", 'UNAUTHORIZED', false);
        }

        // B. Prepare Proxy Payload
        const proxyPayload = {
            model,
            ...payload,
            config: restConfig
        };

        // C. Invoke Edge Function
        const { data, error } = await supabase.functions.invoke('gemini-proxy', {
            body: proxyPayload
        });

        if (error) {
            console.error("Proxy Error:", error);
            const msg = error.message || '';
            const status = (error as any).context?.status;

            // Check if it's a rate limit error (often hidden in context or status)
            if (msg.includes('429') || status === 429) {
                throw new AIError(
                    "Quota Exceeded: The free AI model is currently busy. Please try again in a minute.",
                    'QUOTA_EXCEEDED',
                    true
                );
            }
            if (msg.includes('500') || status === 500) {
                throw new AIError(
                    "AI Service Unavailable. Please try again later.",
                    'SERVER_ERROR',
                    true
                );
            }
            throw new AIError(`AI Proxy Error: ${msg}. Check Supabase Logs.`, 'UNKNOWN', true);
        }

        return {
            text: () => data.candidates?.[0]?.content?.parts?.[0]?.text || "",
            functionCalls: () => {
                const parts = data.candidates?.[0]?.content?.parts || [];
                return parts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);
            },
            audioData: () => data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data,
            raw: data
        };
    }
};
