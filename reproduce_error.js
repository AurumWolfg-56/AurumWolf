
const SUPABASE_URL = "https://uzdkptbflaelqvusxcha.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZGtwdGJmbGFlbHF2dXN4Y2hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NDE3NDksImV4cCI6MjA4NDExNzc0OX0.yMinyg-B7gqU8_9BvHUrT2HNU8sU6NH8Hhq97bysk4E";
const FUNCTION_NAME = "gemini-proxy";

async function reproduceError() {
    const url = `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`;
    console.log(`\n--- Testing Complex Payload with gemini-2.0-flash-exp ---`);

    // Mimic the Receipt Scanner Payload
    const payload = {
        model: "gemini-2.0-flash-exp",
        systemInstruction: {
            parts: [{ text: "You are a financial assistant." }]
        },
        contents: [{
            role: 'user',
            parts: [
                { text: "Analyze this transaction." }
                // Omitting image data for brevity/simplicity to test if systemInstruction is the culprit
            ]
        }],
        config: {
            responseMimeType: "application/json"
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(payload)
        });

        console.log(`Status: ${response.status}`);

        const text = await response.text();
        console.log("Response Body:", text);

    } catch (error) {
        console.error("Fetch error:", error);
    }
}

reproduceError();
