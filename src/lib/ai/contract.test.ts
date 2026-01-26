
import { describe, it, expect, vi } from 'vitest';

// Use vi.hoisted to ensure mockInvoke is created before the mock factory uses it
const { mockInvoke } = vi.hoisted(() => {
    return { mockInvoke: vi.fn().mockResolvedValue({ data: {}, error: null }) };
});

vi.mock('../supabase', () => {
    return {
        supabase: {
            auth: { getSession: () => ({ data: { session: { access_token: 'fake' } } }) },
            functions: { invoke: mockInvoke }
        }
    };
});

import { aiClient } from './proxy';

describe('AI Contract Verification', () => {
    it('should hoist tools and systemInstruction', async () => {
        await aiClient.generateContent(
            'gemini-2.5-flash',
            [{ parts: [{ text: 'hi' }] }],
            {
                temperature: 0.5,
                systemInstruction: 'Be nice',
                tools: [{ functionDeclarations: [] }]
            }
        );

        const callArg = mockInvoke.mock.calls[0][1];
        console.log("PAYLOAD SENT:", JSON.stringify(callArg.body, null, 2));

        expect(callArg.body).toHaveProperty('systemInstruction');
        expect(callArg.body).toHaveProperty('tools');
        expect(callArg.body.config).not.toHaveProperty('tools');
        expect(callArg.body.config).toHaveProperty('temperature');
    });
});
