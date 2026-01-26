import React, { useEffect, useState } from 'react';
import { Lock, EyeOff } from 'lucide-react';
import { useSecurity } from '../contexts/SecurityContext';

export const PrivacyShield: React.FC = () => {
    const { isLocked } = useSecurity();
    const [isBackgrounded, setIsBackgrounded] = useState(document.visibilityState === 'hidden');

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsBackgrounded(document.visibilityState === 'hidden');
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Active Condition: backgrounded ONLY
    // We do NOT include isLocked here because AppLock (zIndex 100) handles the interactive PIN screen.
    // This shield (zIndex 9999) is purely for the visual blur during multitasking/backgrounding.
    const isActive = isBackgrounded;

    if (!isActive) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-neutral-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in">
            <div className="relative">
                <div className="absolute inset-0 bg-gold-500/20 blur-[50px] rounded-full"></div>
                <div className="relative bg-neutral-900 border border-neutral-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-sm">
                    <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center mb-6 text-gold-500">
                        {isLocked ? <Lock size={32} /> : <EyeOff size={32} />}
                    </div>

                    <h2 className="text-xl font-bold text-white mb-2">
                        {isLocked ? "AurumWolf Locked" : "Privacy Shield Active"}
                    </h2>

                    <p className="text-neutral-400 text-sm">
                        {isLocked
                            ? "Session secured. Please authenticate to resume."
                            : "Content hidden for your privacy."}
                    </p>
                </div>
            </div>
        </div>
    );
};
