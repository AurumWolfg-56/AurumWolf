
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) env[key.trim()] = val.trim();
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRpc() {
    // Skip fetching accounts (fails with RLS/Anon)
    // Directly call RPC with dummy IDs.
    // Goal: See if error is "Function not found" (FAIL) or "FK Violation/RLS" (PASS/Function Exists)

    console.log("Attempting transfer RPC with dummy IDs (Testing existence)...");
    const dummyId1 = "00000000-0000-0000-0000-000000000001";
    const dummyId2 = "00000000-0000-0000-0000-000000000002";

    const { data, error } = await supabase.rpc('perform_transfer', {
        p_from_account_id: dummyId1,
        p_to_account_id: dummyId2,
        p_amount: 1.00,
        p_date: new Date().toISOString(),
        p_description: 'Test Transfer',
        p_currency: 'USD',
        p_converted_amount: 1.00,
        p_to_currency: 'USD'
    });

    if (error) {
        console.log("RPC Call Result:", error.message);
        if (error.message.includes("does not exist") && error.message.includes("function")) {
            console.error("FAIL: Function perform_transfer does not exist.");
        } else {
            console.log("PASS: Function exists (Error was expected due to dummy IDs/RLS).");
        }
    } else {
        console.log("Unexpected Success (should have failed FK constraints - did you disable constraints?).");
    }
}

verifyRpc();
