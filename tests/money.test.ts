
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../lib/money';

describe('lib/money', () => {
    it('formatCurrency should show 2 decimals by default', () => {
        const val = 10.5;
        // Current implementation has maximumFractionDigits: 0, so this would be "$11" or "$10" depending on rounding
        // We want "$10.50"
        const formatted = formatCurrency(val, 'USD');
        // We expect it to FAIL initially if logic is not updated
        expect(formatted).toBe('$10.50');
    });

    it('formatCurrency should handle 0 decimals if explicit (simulating compact/integers)', () => {
        // This behavior might be desired for privacy or loose display, but let's stick to default precision
        const val = 1234.56;
        const formatted = formatCurrency(val, 'USD', { compact: false });
        expect(formatted).toBe('$1,234.56');
    });
});
