import { supabase } from './supabase';

type ErrorSeverity = 'info' | 'warn' | 'error' | 'fatal';

interface ErrorContext {
    component?: string;
    userId?: string;
    action?: string;
    [key: string]: any;
}

class ErrorServiceImpl {
    private isInitialized = false;

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log('[ErrorService] Initialized');
    }

    log(error: Error | string, severity: ErrorSeverity = 'error', context: ErrorContext = {}) {
        // 1. Structure the log
        const timestamp = new Date().toISOString();
        const message = error instanceof Error ? error.message : error;
        const stack = error instanceof Error ? error.stack : undefined;

        const payload = {
            timestamp,
            severity,
            message,
            stack,
            context,
        };

        // 2. Log to Console (Dev/Prod)
        // Use consistent formatting so log aggregators can parse it
        if (severity === 'error' || severity === 'fatal') {
            console.error('[ErrorService]', JSON.stringify(payload));
        } else if (severity === 'warn') {
            console.warn('[ErrorService]', JSON.stringify(payload));
        } else {
            console.log('[ErrorService]', JSON.stringify(payload));
        }

        // 3. Send to Supabase (Fire & Forget)
        const getUserId = async () => {
            if (context.userId) return context.userId;
            const { data } = await supabase.auth.getUser();
            return data.user?.id;
        };

        getUserId().then(uid => {
            supabase.from('error_logs').insert({
                severity,
                message,
                context,
                stack,
                user_id: uid
            }).then(({ error: dbError }) => {
                if (dbError) console.error('[ErrorService] Failed to persist log:', dbError);
            });
        });

        // 4. TODO: Send to Sentry / Datadog
        // if (process.env.NODE_ENV === 'production') { Sentry.captureException(error, { extra: context }); }
    }
}

export const ErrorService = new ErrorServiceImpl();
