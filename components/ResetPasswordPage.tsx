import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Logo } from './Logo';

interface ResetPasswordPageProps {
    t: (key: string) => string;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ t }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                window.location.href = '/'; // Reload to clear recovery mode and return to dash
            }, 3000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center animate-fade-in shadow-2xl">
                    <div className="mb-6 flex justify-center text-emerald-500">
                        <CheckCircle size={64} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Password Updated!</h2>
                    <p className="text-slate-400 mb-6">Your password has been reset successfully. Redirecting you to the dashboard...</p>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 animate-[width_3s_linear_forwards] w-0"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <Lock size={120} className="text-white" />
                </div>

                <div className="text-center mb-8 flex flex-col items-center relative z-10">
                    <div className="mb-4">
                        <Logo iconSize="w-12 h-12" textSize="text-2xl" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Reset Password</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Please enter a new password for your account.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm">
                        <AlertTriangle size={18} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4 relative z-10">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">New Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all outline-none"
                                placeholder="Min. 6 characters"
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Confirm Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all outline-none"
                                placeholder="Re-enter password"
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-2.5 rounded-lg transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            "Update Password"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
