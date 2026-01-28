import React, { useState, useEffect } from 'react';
import { Lock, Delete, Smartphone, Fingerprint, Unlock } from 'lucide-react';
import { useSecurity } from '../contexts/SecurityContext';

export const AppLock: React.FC = () => {
    const { isLocked, verifyPin, biometricsEnabled, unlock, verifyBiometrics, lastBiometricError } = useSecurity();
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

    useEffect(() => {
        // Check if biometric hardware is available
        if (window.PublicKeyCredential) {
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then(available => setIsBiometricAvailable(available));
        }
    }, []);

    // Auto-unlock removed for reliability (Browsers block it)

    useEffect(() => {
        if (pin.length === 4) {
            handleVerify(pin);
        }
    }, [pin]);

    // Auto-prompt on mount or when coming back to foreground
    useEffect(() => {
        if (isLocked && biometricsEnabled && isBiometricAvailable) {
            // Check if we should prompt immediately
            const timer = setTimeout(() => {
                handleBiometricUnlock();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isBiometricAvailable, biometricsEnabled, isLocked]);

    const handleVerify = async (inputPin: string) => {
        const isValid = await verifyPin(inputPin);
        if (isValid) {
            setPin('');
            setError(false);
        } else {
            setError(true);
            setPin('');
            setTimeout(() => setError(false), 500);
        }
    };

    const handleNumberClick = (num: number) => {
        if (pin.length < 4) {
            setPin(prev => prev + num);
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const [bioMsg, setBioMsg] = useState('');

    const handleBiometricUnlock = async () => {
        setBioMsg('Verifying...');
        const success = await verifyBiometrics();
        if (success) {
            setBioMsg('Success');
            // unlock() is called by context on success, but we can call it here for double safety
            unlock();
        } else {
            console.log("Biometric failure or cancelation");
            setBioMsg(lastBiometricError || 'Retry');
            setTimeout(() => setBioMsg(''), 2500);
        }
    };

    if (!isLocked) return null;

    return (
        <div className="min-h-screen w-full bg-neutral-950 flex flex-col items-center justify-center text-white animate-fade-in px-6">
            <div className="mb-8 flex flex-col items-center gap-4">
                <div className="p-4 bg-gold-500/10 rounded-full text-gold-500 border border-gold-500/20">
                    <Lock size={48} />
                </div>
                <h2 className="text-2xl font-display font-bold">AurumWolf Locked</h2>
                <p className="text-neutral-400 text-sm">Enter PIN or use Biometrics</p>
            </div>

            {/* PIN DOTS */}
            <div className="flex gap-4 mb-10">
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length
                            ? 'bg-gold-500 scale-110 shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                            : 'bg-neutral-800 border border-neutral-700'
                            } ${error ? 'animate-shake bg-red-500' : ''}`}
                    />
                ))}
            </div>

            {/* KEYPAD */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                        key={num}
                        onClick={() => handleNumberClick(num)}
                        className="w-16 h-16 rounded-full bg-neutral-800/50 border border-neutral-700 text-xl font-bold hover:bg-gold-500 hover:text-neutral-900 hover:border-gold-500 transition-all active:scale-95 flex items-center justify-center backdrop-blur-sm"
                    >
                        {num}
                    </button>
                ))}

                <button
                    onClick={() => handleNumberClick(0)}
                    className="col-start-2 w-16 h-16 rounded-full bg-neutral-800/50 border border-neutral-700 text-xl font-bold hover:bg-gold-500 hover:text-neutral-900 hover:border-gold-500 transition-all active:scale-95 flex items-center justify-center backdrop-blur-sm"
                >
                    0
                </button>

                <div className="flex items-center justify-center col-start-3">
                    <button
                        onClick={handleDelete}
                        className="w-16 h-16 rounded-full text-neutral-400 flex items-center justify-center hover:text-white transition-all active:scale-95"
                    >
                        <Delete size={24} />
                    </button>
                </div>
            </div>

            {/* PRIMARY BIOMETRIC BUTTON */}
            {biometricsEnabled && (
                <button
                    onClick={handleBiometricUnlock}
                    className="w-full max-w-[260px] py-4 rounded-2xl bg-gold-500 text-neutral-950 font-bold text-lg flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(212,175,55,0.2)] hover:shadow-[0_0_40px_rgba(212,175,55,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Fingerprint size={24} />
                    {isBiometricAvailable ? 'Authenticate' : 'Re-enable Biometrics'}
                </button>
            )}

            {bioMsg && (
                <div className={`text-sm font-bold mt-4 animate-pulse ${bioMsg === 'Success' ? 'text-green-500' : 'text-gold-500'}`}>
                    {bioMsg}
                </div>
            )}

            {!isBiometricAvailable && biometricsEnabled && (
                <p className="text-[10px] text-neutral-500 mt-4 text-center max-w-[200px]">
                    Biometric hardware temporarily unavailable or permission denied.
                </p>
            )}
        </div>
    );
};
