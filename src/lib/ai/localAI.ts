/**
 * AurumWolf Local AI Client
 * Connects to LM Studio (OpenAI-compatible API) running locally.
 * Replaces the previous Gemini proxy layer entirely.
 */

// ============================================
// CONFIGURATION
// ============================================

const LM_STUDIO_BASE_URL = 'http://localhost:1234/v1';
const DEFAULT_MODEL = 'qwen2.5-vl-7b-instruct';  // Auto-detected by LM Studio
const REQUEST_TIMEOUT_MS = 45_000; // 45s for local models
const VISION_TIMEOUT_MS = 60_000;  // 60s for vision tasks (heavier)

// ============================================
// TYPES
// ============================================

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | ChatContentPart[];
}

export interface ChatContentPart {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
}

export interface AIRequestOptions {
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: 'json_object' | 'text' };
    timeout?: number;
}

export interface AIResponse {
    text: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// ============================================
// ERROR CLASS
// ============================================

export class LocalAIError extends Error {
    constructor(
        message: string,
        public code: 'OFFLINE' | 'TIMEOUT' | 'PARSE_ERROR' | 'MODEL_ERROR' | 'UNKNOWN',
        public retryable: boolean = false
    ) {
        super(message);
        this.name = 'LocalAIError';
    }
}

// ============================================
// FETCH WITH TIMEOUT
// ============================================

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } catch (err: any) {
        if (err.name === 'AbortError') {
            throw new LocalAIError(
                'AI request timed out. The local model may be overloaded.',
                'TIMEOUT',
                true
            );
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ============================================
// LOCAL AI CLIENT
// ============================================

export const localAI = {

    /**
     * Check if LM Studio is running and responsive
     */
    isAvailable: async (): Promise<boolean> => {
        try {
            const res = await fetchWithTimeout(
                `${LM_STUDIO_BASE_URL}/models`,
                { method: 'GET' },
                5000
            );
            return res.ok;
        } catch {
            return false;
        }
    },

    /**
     * Text-only chat completion
     * Used for: portfolio analysis, categorization, insights, digests
     */
    chat: async (
        messages: ChatMessage[],
        options: AIRequestOptions = {}
    ): Promise<AIResponse> => {
        const {
            temperature = 0.3,
            max_tokens = 1024,
            response_format,
            timeout = REQUEST_TIMEOUT_MS,
        } = options;

        try {
            const body: any = {
                model: DEFAULT_MODEL,
                messages,
                temperature,
                max_tokens,
                stream: false,
            };

            if (response_format) {
                body.response_format = response_format;
            }

            const res = await fetchWithTimeout(
                `${LM_STUDIO_BASE_URL}/chat/completions`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                },
                timeout
            );

            if (!res.ok) {
                const errText = await res.text().catch(() => 'Unknown error');
                throw new LocalAIError(
                    `LM Studio returned ${res.status}: ${errText}`,
                    'MODEL_ERROR',
                    res.status >= 500
                );
            }

            const data = await res.json();
            const text = data.choices?.[0]?.message?.content || '';

            return {
                text,
                usage: data.usage,
            };
        } catch (err: any) {
            if (err instanceof LocalAIError) throw err;

            // Connection refused = LM Studio not running
            if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('ERR_CONNECTION_REFUSED')) {
                throw new LocalAIError(
                    'LM Studio is not running. Please start LM Studio and load the Qwen2.5 VL model.',
                    'OFFLINE',
                    false
                );
            }

            throw new LocalAIError(
                `AI Error: ${err.message || 'Unknown'}`,
                'UNKNOWN',
                true
            );
        }
    },

    /**
     * Vision chat completion (image + text)
     * Used for: receipt scanning, document analysis
     */
    vision: async (
        imageBase64: string,
        prompt: string,
        options: AIRequestOptions = {}
    ): Promise<AIResponse> => {
        const {
            temperature = 0.1,
            max_tokens = 1024,
            timeout = VISION_TIMEOUT_MS,
        } = options;

        // Build multimodal message
        const messages: ChatMessage[] = [
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/jpeg;base64,${imageBase64}`,
                        },
                    },
                    {
                        type: 'text',
                        text: prompt,
                    },
                ],
            },
        ];

        try {
            const body: any = {
                model: DEFAULT_MODEL,
                messages,
                temperature,
                max_tokens,
                stream: false,
            };

            const res = await fetchWithTimeout(
                `${LM_STUDIO_BASE_URL}/chat/completions`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                },
                timeout
            );

            if (!res.ok) {
                const errText = await res.text().catch(() => 'Unknown error');
                throw new LocalAIError(
                    `Vision request failed (${res.status}): ${errText}`,
                    'MODEL_ERROR',
                    res.status >= 500
                );
            }

            const data = await res.json();
            const text = data.choices?.[0]?.message?.content || '';

            return {
                text,
                usage: data.usage,
            };
        } catch (err: any) {
            if (err instanceof LocalAIError) throw err;

            if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
                throw new LocalAIError(
                    'LM Studio is not running. Start LM Studio to use the receipt scanner.',
                    'OFFLINE',
                    false
                );
            }

            throw new LocalAIError(
                `Vision Error: ${err.message || 'Unknown'}`,
                'UNKNOWN',
                true
            );
        }
    },

    /**
     * Parse JSON from AI text response (with markdown cleanup)
     */
    parseJSON: <T = any>(text: string): T => {
        // Strip markdown code fences if present
        let cleaned = text.trim();
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
        cleaned = cleaned.replace(/\n?```\s*$/i, '');
        cleaned = cleaned.trim();

        try {
            return JSON.parse(cleaned) as T;
        } catch (err) {
            throw new LocalAIError(
                `Failed to parse AI response as JSON: ${cleaned.substring(0, 200)}...`,
                'PARSE_ERROR',
                false
            );
        }
    },
};
