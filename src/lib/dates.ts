
/**
 * Date Utilities for consistently handling local dates (YYYY-MM-DD)
 * avoiding UTC shifts that cause "off-by-one-day" errors.
 */

/**
 * Safely parses a YYYY-MM-DD string into a local Date object.
 * new Date("2026-01-01") is UTC. new Date(2026, 0, 1) is Local.
 */
function parseLocalDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

/**
 * Returns the current date as an ISO string (YYYY-MM-DD) in the user's LOCAL timezone.
 * Using native Date.toISOString() returns UTC, which might be yesterday.
 */
export function getLocalDateISO(date: Date = new Date()): string {
    const offset = date.getTimezoneOffset() * 60000;
    const localTime = new Date(date.getTime() - offset);
    return localTime.toISOString().split('T')[0];
}

/**
 * Returns the current month as YYYY-MM in the user's LOCAL timezone.
 */
export function getLocalMonthISO(date: Date = new Date()): string {
    return getLocalDateISO(date).substring(0, 7);
}

/**
 * Adds months to a date safely, handling month overflow.
 * e.g. Jan 31 + 1 month -> Feb 28 (or 29)
 * @param dateStr YYYY-MM-DD string
 * @param months Number of months to add
 */
export function addMonthsToDate(dateStr: string, months: number): string {
    // Correct usage: Use parseLocalDate
    const date = parseLocalDate(dateStr);

    const expectedMonth = (date.getMonth() + months) % 12;
    date.setMonth(date.getMonth() + months);

    // If we skipped a month (e.g. Jan 31 -> Mar 3), roll back to last day of previous month
    if (date.getMonth() !== (expectedMonth + 12) % 12) {
        date.setDate(0);
    }

    return getLocalDateISO(date);
}

/**
 * Adds days to a date string
 */
export function addDaysToDate(dateStr: string, days: number): string {
    const date = parseLocalDate(dateStr);
    date.setDate(date.getDate() + days); // JS handles overflow automatically for days
    return getLocalDateISO(date);
}

/**
 * Adds years to a date string
 */
export function addYearsToDate(dateStr: string, years: number): string {
    // Reuse parseLocalDate logic implicitly (the original split code was actually safe, but let's be consistent)
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y + years, m - 1, d);
    return getLocalDateISO(date);
}
