import React, { createContext, useContext, useEffect, useState } from 'react';

interface SecurityContextType {
    isLocked: boolean;
    isAuthenticated: boolean;
    hasPin: boolean;
    biometricsEnabled: boolean;
    setupPin: (pin: string) => Promise<void>;
    verifyPin: (pin: string) => Promise<boolean>;
    unlock: () => void;
    lock: () => void;
    toggleBiometrics: (enabled: boolean) => Promise<void>;
    removePin: () => void;
    verifyBiometrics: () => Promise<boolean>;
    lastBiometricError: string | null;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const STORAGE_KEYS = {
    PIN_HASH: 'aurum_security_pin',
    BIOMETRICS_ENABLED: 'aurum_security_bio',
    CREDENTIAL_ID: 'aurum_security_cred_id',
    LOCK_TIMEOUT: 'aurum_security_timeout'
};

export function SecurityProvider({ children }: { children: React.ReactNode }) {
    const [isLocked, setIsLocked] = useState(() => {
        // Fix: Synchronous check to prevent "flash of unlocked content"
        const hasPin = !!localStorage.getItem(STORAGE_KEYS.PIN_HASH);
        // If PIN exists, check if we have an active unlocked session
        const sessionUnlocked = sessionStorage.getItem('aurum_unlocked') === 'true';
        // Locked if PIN exists AND session is NOT unlocked
        return hasPin && !sessionUnlocked;
    });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasPin, setHasPin] = useState(() => !!localStorage.getItem(STORAGE_KEYS.PIN_HASH));
    const [biometricsEnabled, setBiometricsEnabled] = useState(false);
    const [lastBiometricError, setLastBiometricError] = useState<string | null>(null);

    useEffect(() => {
        // Only need to sync non-blocking state here
        const bioEnabled = localStorage.getItem(STORAGE_KEYS.BIOMETRICS_ENABLED) === 'true';
        setBiometricsEnabled(bioEnabled);
    }, []);

    // Helper: Hash PIN using SHA-256
    const hashPin = async (pin: string): Promise<string> => {
        const msgBuffer = new TextEncoder().encode(pin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    };

    const setupPin = async (pin: string) => {
        const hash = await hashPin(pin);
        localStorage.setItem(STORAGE_KEYS.PIN_HASH, hash);
        setHasPin(true);
        setIsAuthenticated(true);
        setIsLocked(false);
        // Mark session as unlocked
        sessionStorage.setItem('aurum_unlocked', 'true');
    };

    const verifyPin = async (inputPin: string): Promise<boolean> => {
        const storedHash = localStorage.getItem(STORAGE_KEYS.PIN_HASH);
        if (!storedHash) return false;

        const inputHash = await hashPin(inputPin);
        if (inputHash === storedHash) {
            setIsAuthenticated(true);
            setIsLocked(false);
            sessionStorage.setItem('aurum_unlocked', 'true');
            return true;
        }
        return false;
    };


    const lock = () => {
        if (hasPin) {
            setIsLocked(true);
            setIsAuthenticated(false);
            sessionStorage.removeItem('aurum_unlocked');
        }
    };

    const unlock = () => {
        setIsLocked(false);
        setIsAuthenticated(true);
        sessionStorage.setItem('aurum_unlocked', 'true');
    };

    // --- UTILITIES FOR BASE64URL ---
    const bufferToBase64URLString = (buffer: ArrayBuffer): string => {
        const bytes = new Uint8Array(buffer);
        let str = '';
        for (const charCode of bytes) {
            str += String.fromCharCode(charCode);
        }
        const base64 = btoa(str);
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const base64URLStringToBuffer = (base64URL: string): ArrayBuffer => {
        const base64 = base64URL.replace(/-/g, '+').replace(/_/g, '/');
        const padLen = (4 - (base64.length % 4)) % 4;
        const padded = base64 + '='.repeat(padLen);
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    };

    // Helper: Simple Random Challenge
    const getChallenge = () => {
        return crypto.getRandomValues(new Uint8Array(32));
    };

    const verifyBiometrics = async (): Promise<boolean> => {
        if (!window.PublicKeyCredential) return false;

        try {
            const savedCredentialId = localStorage.getItem(STORAGE_KEYS.CREDENTIAL_ID);
            const allowCredentials: PublicKeyCredentialDescriptor[] = savedCredentialId ? [{
                type: 'public-key',
                id: base64URLStringToBuffer(savedCredentialId),
                transports: ['internal']
            }] : [];

            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge: getChallenge(),
                    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
                    userVerification: "required",
                    timeout: 60000,
                }
            });

            if (assertion) {
                setIsAuthenticated(true);
                setIsLocked(false);
                sessionStorage.setItem('aurum_unlocked', 'true');
                setLastBiometricError(null);
                return true;
            }
        } catch (error: any) {
            console.error("Biometric verification failed", error);
            if (error.name === 'NotAllowedError') {
                setLastBiometricError('Verification Canceled');
            } else {
                setLastBiometricError(error.message || 'Verification Failed');
            }
        }
        return false;
    };

    const toggleBiometrics = async (enabled: boolean) => {
        if (enabled) {
            if (!window.isSecureContext) {
                alert("Biometrics require a secure HTTPS connection.");
                return;
            }

            if (!window.PublicKeyCredential) {
                alert("Biometrics not supported on this device.");
                return;
            }

            try {
                const credential = await navigator.credentials.create({
                    publicKey: {
                        challenge: getChallenge(),
                        rp: { name: "AurumWolf", id: window.location.hostname },
                        user: {
                            id: crypto.getRandomValues(new Uint8Array(16)),
                            name: "user@aurumwolf.app",
                            displayName: "AurumWolf Member"
                        },
                        pubKeyCredParams: [
                            { alg: -7, type: "public-key" },
                            { alg: -257, type: "public-key" }
                        ],
                        authenticatorSelection: {
                            authenticatorAttachment: "platform",
                            userVerification: "required",
                            residentKey: "discouraged"
                        },
                        timeout: 60000,
                        attestation: "none"
                    }
                }) as PublicKeyCredential;

                if (credential) {
                    localStorage.setItem(STORAGE_KEYS.CREDENTIAL_ID, credential.id);
                    setBiometricsEnabled(true);
                    localStorage.setItem(STORAGE_KEYS.BIOMETRICS_ENABLED, 'true');
                }
            } catch (e: any) {
                console.error("Biometric enrollment failed", e);
                setLastBiometricError(e.message);
                alert(`Setup Failed: ${e.message}`);
            }
        } else {
            setBiometricsEnabled(false);
            localStorage.setItem(STORAGE_KEYS.BIOMETRICS_ENABLED, 'false');
            localStorage.removeItem(STORAGE_KEYS.CREDENTIAL_ID);
        }
    };

    const removePin = () => {
        localStorage.removeItem(STORAGE_KEYS.PIN_HASH);
        localStorage.removeItem(STORAGE_KEYS.BIOMETRICS_ENABLED);
        setHasPin(false);
        setIsLocked(false);
        setIsLocked(false);
        setBiometricsEnabled(false);
        setLastBiometricError(null);
        setIsAuthenticated(true); // Don't lock them out when removing security
    };

    // --- BACKGROUND LOCKING ---
    useEffect(() => {
        // Financial Grade Security: Lock when app is backgrounded
        let lockTimer: NodeJS.Timeout;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // User left the app. Start a grace timer (e.g. 5 seconds for accidental swipes)
                // If they don't return within 5s, we lock.
                if (hasPin && !isLocked) {
                    // Using a short timeout to allow quick app switching (e.g. to password manager)
                    // but ensuring security. 
                    // User Request: "si sales... estas cerrando". Implies strictness.
                    // Setting to 2 seconds for very strict feel.
                    lockTimer = setTimeout(() => {
                        lock();
                    }, 5000);
                }
            } else {
                // User returned.
                if (lockTimer) {
                    clearTimeout(lockTimer);
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            if (lockTimer) clearTimeout(lockTimer);
        };
    }, [hasPin, isLocked]);

    return (
        <SecurityContext.Provider value={{
            isLocked,
            isAuthenticated,
            hasPin,
            biometricsEnabled,
            setupPin,
            verifyPin,
            unlock,
            lock,
            toggleBiometrics,
            removePin,
            verifyBiometrics,
            lastBiometricError
        }}>
            {children}
        </SecurityContext.Provider>
    );
}

export const useSecurity = () => {
    const context = useContext(SecurityContext);
    if (!context) {
        throw new Error("useSecurity must be used within SecurityProvider");
    }
    return context;
};
