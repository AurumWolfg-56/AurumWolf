
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY');

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS });
    }

    try {
        if (!GEMINI_API_KEY) {
            throw new Error('Missing GEMINI_API_KEY in server environment');
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        // Verify JWT simply by existence for this "minimal" generic proxy
        // In prod, use Supabase client to getUser() to verify properly.
        // Here we assume the gateway (Supabase) handles checking valid JWT signature if policies are set, 
        // but code-level check:
        // const { data: { user }, error } = await supabase.auth.getUser(token) ...

        // Expecting full object from client
        const { model, contents, config, systemInstruction, tools } = await req.json();

        // --- DEBUG LOGS (TEMPORARY) ---
        console.log("PROXY_DEBUG: SystemInstruction Present:", !!systemInstruction, "Length:", systemInstruction?.length || 0);
        console.log("PROXY_DEBUG: Tools Present:", !!tools, "Count:", tools?.[0]?.functionDeclarations?.length || 0);
        console.log("PROXY_DEBUG: Model:", model);
        // ------------------------------


        // REST API Body Construction
        // https://ai.google.dev/api/rest/v1beta/models/generateContent
        const googleBody: any = {
            contents,
            generationConfig: config
        };

        if (systemInstruction) {
            googleBody.systemInstruction = typeof systemInstruction === 'string'
                ? { parts: [{ text: systemInstruction }] }
                : systemInstruction;
        }

        if (tools) {
            googleBody.tools = tools;
        }

        // Mapping params to Google REST API
        // Doc: https://ai.google.dev/api/rest/v1beta/models/generateContent

        // Default URL for text/multimodal generation
        let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

        // Check if it's Audio generation (TTS) - Different Endpoint? 
        // Usually standard generateContent works if responseModalities is set, but let's stick to standard flow.
        // Code in standard REST API:

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(googleBody)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Gemini API Error:", errText);
            return new Response(errText, {
                status: response.status,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
    }
});
