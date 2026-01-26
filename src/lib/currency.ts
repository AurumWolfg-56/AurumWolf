
export interface ExchangeRateResponse {
    result: string;
    provider: string;
    documentation: string;
    terms_of_use: string;
    time_last_update_unix: number;
    time_last_update_utc: string;
    time_next_update_unix: number;
    time_next_update_utc: string;
    time_eol_unix: number;
    base_code: string;
    rates: { [key: string]: number };
}

/**
 * Fetches the latest exchange rates for a given base currency.
 * Uses open.er-api.com (No API Key required).
 */
const CACHE_KEY = 'fx_rates_cache';
const CACHE_TTL = 3600 * 1000; // 1 Hour

export async function fetchExchangeRates(base: string = 'USD'): Promise<ExchangeRateResponse | null> {
    // 1. Check Cache
    try {
        const cached = localStorage.getItem(`${CACHE_KEY}_${base}`);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) {
                // console.log("Using cached FX rates");
                return data;
            }
        }
    } catch (e) {
        // Ignore cache errors
    }

    // 2. Fetch Live
    try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        const data: ExchangeRateResponse = await response.json();

        // 3. Save to Cache
        try {
            localStorage.setItem(`${CACHE_KEY}_${base}`, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn("Failed to cache FX rates", e);
        }

        return data;
    } catch (error) {
        console.error("Failed to fetch exchange rates:", error);
        return null;
    }
}

/**
 * Converts an amount from one currency to another using real-time rates.
 * Fetches the rates for the 'from' currency to ensure accuracy.
 */
export async function convertWithRealRate(amount: number, from: string, to: string): Promise<{ convertedAmount: number, rate: number } | null> {
    if (from === to) {
        return { convertedAmount: amount, rate: 1 };
    }

    const data = await fetchExchangeRates(from);
    if (data && data.rates && data.rates[to]) {
        const rate = data.rates[to];
        return {
            convertedAmount: amount * rate,
            rate: rate
        };
    }

    return null;
}
