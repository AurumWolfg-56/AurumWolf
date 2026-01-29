
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env vars
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('Inspecting public.transactions schema...');

    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error selecting from transactions:', error);
    } else {
        console.log('Successfully selected 1 row.');
        if (data && data.length > 0) {
            console.log('Sample Row Keys:', JSON.stringify(Object.keys(data[0])));
            console.log('Sample amount:', data[0].amount, 'Type:', typeof data[0].amount);
        } else {
            console.log('Table is empty.');
        }
    }
}

inspectSchema();
