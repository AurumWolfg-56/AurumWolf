
import { describe, it, expect } from 'vitest';
import { addDaysToDate, getLocalDateISO } from '../lib/dates';

describe('lib/dates', () => {
    it('addDaysToDate should handle local dates correctly without timezone shift', () => {
        // Input: "2026-01-01"
        // If parsed as UTC (midnight), and user is behind UTC (e.g. Chicago -6), 
        // local representation might be 2025-12-31 18:00

        // We need to ensure logic is safe.
        // Let's test adding 1 day.
        const start = '2026-01-01';
        const next = addDaysToDate(start, 1);
        expect(next).toBe('2026-01-02');
    });

    it('addDaysToDate should handle month crossing', () => {
        const start = '2026-01-31';
        const next = addDaysToDate(start, 1);
        expect(next).toBe('2026-02-01');
    });
});
