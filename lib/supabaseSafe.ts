import { z, ZodSchema } from 'zod';

/**
 * Safely parses a list of data from Supabase.
 * Logs errors for invalid items but returns the valid ones (or fallback).
 */
export function parseSupabaseData<T>(
    schema: ZodSchema<T>,
    data: any,
    fallback: T[] = []
): T[] {
    if (!data || !Array.isArray(data)) {
        console.warn(`[SupabaseSafe] Expected array but got ${typeof data}`, data);
        return fallback;
    }

    const validItems: T[] = [];
    const errors: any[] = [];

    data.forEach((item, index) => {
        const result = schema.safeParse(item);
        if (result.success) {
            validItems.push(result.data);
        } else {
            errors.push({ index, error: result.error.format() });
        }
    });

    if (errors.length > 0) {
        // Only log detailed errors in development
        if (import.meta.env.DEV) {
            console.error(
                `[SupabaseSafe] Skipped ${errors.length} invalid items out of ${data.length}. Sample Error:`,
                JSON.stringify(errors[0].error, null, 2),
                "Sample Data:",
                data[errors[0].index]
            );
        } else {
            console.warn(`[SupabaseSafe] Skipped ${errors.length} invalid items.`);
        }
    }

    return validItems;
}

/**
 * Safely parses a single object from Supabase.
 * Returns null if validation fails.
 */
export function parseSupabaseSingle<T>(
    schema: ZodSchema<T>,
    data: any
): T | null {
    if (!data) return null;

    const result = schema.safeParse(data);
    if (result.success) {
        return result.data;
    } else {
        if (import.meta.env.DEV) {
            console.error(`[SupabaseSafe] Invalid single item:`, result.error.format());
        }
        return null;
    }
}
