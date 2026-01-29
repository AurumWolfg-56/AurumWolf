import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, AlertCircle, Loader2, Fingerprint } from 'lucide-react';
import { useSecurity } from '../contexts/SecurityContext';

import { Logo } from './Logo';

interface LoginPageProps {
    t: (key: string) => string;
}

export function LoginPage({ t }: LoginPageProps) {
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
    const [message, setMessage] = useState<string | null>(null);

    // Security Context for Biometrics
    const { biometricsEnabled, verifyBiometrics } = useSecurity();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        }
                    }
                });
                if (error) throw error;
                setMessage('Check your email for the confirmation link!');
            } else if (mode === 'reset') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/`,
                });
                if (error) throw error;
                setMessage('Password reset link sent to your email!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const { loginWithBiometrics } = useSecurity(); // Destructure properly

    const handleBiometricLogin = async () => {
        if (!email) {
            setError("Please enter your email to sign in with biometrics.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await loginWithBiometrics(email);
            setMessage("Login successful. Resuming session...");
            // AuthContext handles redirect
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Biometric login failed. Make sure you have setup biometrics in Settings.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                {/* Background Ambient Glow */}
                <div className="absolute top-[-50%] left-[-20%] w-[300px] h-[300px] bg-gold-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="text-center mb-8 flex flex-col items-center relative z-10">
                    <div className="mb-6 transform hover:scale-105 transition-transform duration-500">
                        {/* Responsive Logo: Smaller on mobile, Larger on desktop */}
                        <Logo iconSize="w-16 h-16 sm:w-20 sm:h-20" textSize="text-xl sm:text-3xl" stacked={true} />
                    </div>
                    <p className="text-slate-400 font-medium tracking-wide text-sm uppercase">
                        {mode === 'signin' ? t('auth.signInTitle') : mode === 'reset' ? 'Reset Password' : t('auth.signUpTitle')}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3 text-emerald-400 text-sm">
                        <AlertCircle size={18} />
                        {message}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    {mode === 'signup' && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('common.fullName')}</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all outline-none"
                                    placeholder="John Doe"
                                    minLength={2}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('common.email')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl pl-11 pr-4 py-3.5 text-slate-200 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all outline-none placeholder:text-slate-600"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    {mode !== 'reset' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('common.password')}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl pl-11 pr-4 py-3.5 text-slate-200 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all outline-none placeholder:text-slate-600"
                                    placeholder={t('auth.passPlaceholder')}
                                    minLength={6}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-2.5 rounded-lg transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : mode === 'signin' ? (
                            t('auth.signIn')
                        ) : mode === 'reset' ? (
                            "Send Reset Link"
                        ) : (
                            t('auth.signUp')
                        )}
                    </button>


                </form>

                {/* Biometric Login Button */}
                {biometricsEnabled && mode === 'signin' && (
                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={handleBiometricLogin}
                            className="w-full bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 border border-slate-700"
                        >
                            <Fingerprint size={20} className="text-amber-500" />
                            {t('auth.biometricSignIn') || "Sign in with Biometrics"}
                        </button>
                    </div>
                )}

                <div className="mt-6 text-center">
                    <div className="flex flex-col gap-3">
                        {mode === 'signin' && (
                            <button
                                type="button"
                                onClick={() => setMode('reset')}
                                className="text-slate-500 hover:text-slate-400 text-sm font-medium transition-colors"
                            >
                                Forgot your password?
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                            className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
                        >
                            {mode === 'signin'
                                ? t('auth.noAccount') + " " + t('auth.signUp')
                                : mode === 'reset'
                                    ? "Back to Sign In"
                                    : t('auth.haveAccount') + " " + t('auth.signIn')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
