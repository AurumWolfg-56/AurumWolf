
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envPath = path.resolve(__dirname, '../.env.local');
console.log(`Loading env from ${envPath}`);

if (!fs.existsSync(envPath)) {
    console.error("No .env.local found");
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) env[key.trim()] = val.trim();
});

const supabaseUrl = env['VITE_SUPABASE_URL'] || env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
    console.log("Fetching transactions...");
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .limit(1000);

    if (error) {
        console.error("Error fetching transactions:", error);
        return;
    }

    console.log(`Fetched ${transactions.length} transactions.`);
    if (transactions.length > 0) {
        console.log("Sample Transaction Keys:", Object.keys(transactions[0]));
        // Check if numericAmount exists or if it's strictly amount
        console.log("Sample Amount:", transactions[0].amount, " Numeric:", transactions[0].numeric_amount || transactions[0].numericAmount);
    }

    // 1. Orphan Check
    const transfers = transactions.filter(t => t.category === 'Transfer');
    console.log(`Analyzing ${transfers.length} transfers for orphans...`);

    const paired = new Set();
    const orphans = [];

    for (const tx of transfers) {
        if (paired.has(tx.id)) continue;

        // DB usually uses snake_case, let's look for known fields or fallback
        const amt = tx.numeric_amount ?? tx.numericAmount ?? parseFloat(tx.amount.replace(/[^0-9.-]+/g, ""));
        const txDate = new Date(tx.date);
        const targetType = tx.type === 'debit' ? 'credit' : 'debit';

        const candidates = transfers.filter(t =>
            t.id !== tx.id &&
            !paired.has(t.id) &&
            t.type === targetType &&
            Math.abs((t.numeric_amount ?? t.numericAmount ?? 0) - amt) < 0.05 && // Allow small rounding diff
            Math.abs(new Date(t.date).getTime() - txDate.getTime()) < 60000 // 1 minute window
        );

        if (candidates.length > 0) {
            paired.add(tx.id);
            paired.add(candidates[0].id);
        } else {
            orphans.push(tx);
        }
    }

    console.log(`Found ${orphans.length} potential orphans.`);
    if (orphans.length > 0) {
        orphans.forEach(o => console.log(` - Orphan [${o.id}]: ${o.date} ${o.name} (${o.amount})`));
    }
}

runAudit();
