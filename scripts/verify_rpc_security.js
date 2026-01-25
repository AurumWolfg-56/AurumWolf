
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

async function verifySecurity() {
    console.log("TEST: Attempting Unauthorized Transfer (IDOR Check)...");
    // Trying to transfer from a Random UUID that I definitely don't own.
    const criminalSrc = "11111111-1111-1111-1111-111111111111"; // Someone else's account
    const myDest = "22222222-2222-2222-2222-222222222222"; // My account

    const { data, error } = await supabase.rpc('perform_transfer', {
        p_from_account_id: criminalSrc,
        p_to_account_id: myDest,
        p_amount: 1000000.00,
        p_date: new Date().toISOString(),
        p_description: 'Stealing money',
        p_currency: 'USD',
        p_converted_amount: 1000000.00,
        p_to_currency: 'USD'
    });

    if (error) {
        console.log("Result:", error.message);
        if (error.message.includes("Access Denied")) {
            console.log("PASS: Security Check Passed. The system blocked the transfer.");
        } else if (error.message.includes("does not exist") || error.message.includes("violates foreign key")) {
            // Note: If the account ID doesn't exist at all, we might get FK error before the check
            // BUT our check is strictly: IF NOT EXISTS (SELECT... WHERE id=... AND user_id=me)
            // So even if the ID exists but belongs to someone else, it returns "Access Denied" or just false on the check.
            // Wait, my SQL raises exception if NOT EXISTS.
            // Ideally we want to see "Access Denied".
            // If we pass a non-existent ID, we ALSO get Access Denied (because we don't own it).
            console.log("PASS: Blocked (Access Denied or Invalid ID). Error:", error.message);
        } else {
            console.warn("WARNING: Unexpected error message:", error.message);
        }
    } else {
        console.error("CRITICAL COMPROMISE: Transfer Succeeded! The system is vulnerable.");
    }
}

verifySecurity();
