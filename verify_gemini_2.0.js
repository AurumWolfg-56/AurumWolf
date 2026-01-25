
const SUPABASE_URL = "https://uzdkptbflaelqvusxcha.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZGtwdGJmbGFlbHF2dXN4Y2hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NDE3NDksImV4cCI6MjA4NDExNzc0OX0.yMinyg-B7gqU8_9BvHUrT2HNU8sU6NH8Hhq97bysk4E";
const FUNCTION_NAME = "gemini-proxy";

async function verifyModel(model) {
    const url = `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`;
    console.log(`\n--- Testing Model: ${model} ---`);

    const payload = {
        model: model,
        contents: [{
            parts: [{ text: "Hello, just say OK." }]
        }]
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

        if (!response.ok) {
            const text = await response.text();
            console.log("Error response:", text);
            return false;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("Gemini Success! Response:", text);
        return true;

    } catch (error) {
        console.error("Fetch error:", error);
        return false;
    }
}

async function runTest() {
    console.log("Waiting 20 seconds to clear rate limits...");
    await new Promise(r => setTimeout(r, 20000));

    console.log("Running test for gemini-2.0-flash-exp...");
    await verifyModel("gemini-2.0-flash-exp");
}

runTest();
