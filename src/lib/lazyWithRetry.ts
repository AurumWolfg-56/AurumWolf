
import { lazy, ComponentType, LazyExoticComponent } from 'react';

/**
 * A wrapper around React.lazy that attempts to reload the page exactly once
 * if a ChunkLoadError occurs (e.g., after a new deployment).
 */
export const lazyWithRetry = <T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> => {
    return lazy(async () => {
        try {
            return await factory();
        } catch (error: any) {
            // Check if the error is related to loading a chunk
            const isChunkError =
                error?.name === 'ChunkLoadError' ||
                error?.message?.includes('Failed to fetch dynamically imported module') ||
                error?.message?.includes('Importing a module script failed');

            if (isChunkError) {
                // Check if we've already tried to reload
                const hasReloaded = sessionStorage.getItem('chunk_retry_reload');

                if (!hasReloaded) {
                    sessionStorage.setItem('chunk_retry_reload', 'true');
                    window.location.reload();
                    // Return a never-resolving promise to wait for reload
                    return new Promise(() => { });
                }
            }

            // If not a chunk error or we already reloaded, rethrow
            throw error;
        }
    });
};
