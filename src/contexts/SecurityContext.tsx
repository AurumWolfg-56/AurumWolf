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
    // Current state is memory-only for security
    const [isLocked, setIsLocked] = useState(() => {
        const pinExists = !!localStorage.getItem(STORAGE_KEYS.PIN_HASH);
        return pinExists; // Always start locked if a PIN exists
    });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasPin, setHasPin] = useState(() => !!localStorage.getItem(STORAGE_KEYS.PIN_HASH));
    const [biometricsEnabled, setBiometricsEnabled] = useState(() => localStorage.getItem(STORAGE_KEYS.BIOMETRICS_ENABLED) === 'true');
    const [lastBiometricError, setLastBiometricError] = useState<string | null>(null);

    // Helper: Hash PIN using SHA-256
    const hashPin = async (pin: string): Promise<string> => {
        const msgBuffer = new TextEncoder().encode(pin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const setupPin = async (pin: string) => {
        const hash = await hashPin(pin);
        localStorage.setItem(STORAGE_KEYS.PIN_HASH, hash);
        setHasPin(true);
        setIsAuthenticated(true);
        setIsLocked(false);
    };

    const verifyPin = async (inputPin: string): Promise<boolean> => {
        const storedHash = localStorage.getItem(STORAGE_KEYS.PIN_HASH);
        if (!storedHash) return false;

        const inputHash = await hashPin(inputPin);
        if (inputHash === storedHash) {
            setIsAuthenticated(true);
            setIsLocked(false);
            return true;
        }
        return false;
    };

    const lock = () => {
        if (hasPin) {
            setIsLocked(true);
            setIsAuthenticated(false);
        }
    };

    const unlock = () => {
        setIsLocked(false);
        setIsAuthenticated(true);
    };

    // --- BIOMETRIC UTILITIES ---
    const bufferToBase64URLString = (buffer: ArrayBuffer): string => {
        const bytes = new Uint8Array(buffer);
        let str = '';
        for (const charCode of bytes) str += String.fromCharCode(charCode);
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const base64URLStringToBuffer = (base64URL: string): ArrayBuffer => {
        const base64 = base64URL.replace(/-/g, '+').replace(/_/g, '/');
        const padLen = (4 - (base64.length % 4)) % 4;
        const binary = atob(base64 + '='.repeat(padLen));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
    };

    const getChallenge = () => crypto.getRandomValues(new Uint8Array(32));

    const verifyBiometrics = async (): Promise<boolean> => {
        if (!window.PublicKeyCredential) return false;

        try {
            const savedCredentialId = localStorage.getItem(STORAGE_KEYS.CREDENTIAL_ID);
            // Broaden compatibility: removing explicit 'transports' to allow any platform authenticator
            const allowCredentials: PublicKeyCredentialDescriptor[] = savedCredentialId ? [{
                type: 'public-key',
                id: base64URLStringToBuffer(savedCredentialId),
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
                setLastBiometricError(null);
                return true;
            }
        } catch (error: any) {
            console.error("Biometric verification failed", error);
            if (error.name === 'NotAllowedError') {
                setLastBiometricError('Canceled');
            } else {
                setLastBiometricError('Failed');
            }
        }
        return false;
    };

    const toggleBiometrics = async (enabled: boolean) => {
        if (enabled) {
            if (!window.isSecureContext) {
                alert("HTTPS required for biometrics.");
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
                            { alg: -7, type: "public-key" }, // ES256
                            { alg: -257, type: "public-key" } // RS256
                        ],
                        authenticatorSelection: {
                            authenticatorAttachment: "platform",
                            userVerification: "required",
                            residentKey: "discouraged"
                        },
                        timeout: 60000,
                    }
                }) as PublicKeyCredential;

                if (credential) {
                    localStorage.setItem(STORAGE_KEYS.CREDENTIAL_ID, credential.id);
                    setBiometricsEnabled(true);
                    localStorage.setItem(STORAGE_KEYS.BIOMETRICS_ENABLED, 'true');
                }
            } catch (e: any) {
                console.error("Biometric setup failed", e);
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
        localStorage.removeItem('aurum_last_active');
        setHasPin(false);
        setIsLocked(false);
        setBiometricsEnabled(false);
        setLastBiometricError(null);
        setIsAuthenticated(true);
    };

    // --- CRITICAL: TIME-AWARE RE-ENTRY LOCK ---
    useEffect(() => {
        if (!hasPin) return;

        const checkSecurityLifecycle = () => {
            const now = Date.now();
            const lastActive = parseInt(localStorage.getItem('aurum_last_active') || '0');

            if (document.visibilityState === 'hidden' || !document.hasFocus()) {
                // Instantly lock on hide/blur
                lock();
                localStorage.setItem('aurum_last_active', now.toString());
            } else if (document.visibilityState === 'visible') {
                // On foregrounding, check how long we were away
                if (lastActive > 0 && now - lastActive > 5000) {
                    lock();
                }
                localStorage.setItem('aurum_last_active', now.toString());
            }
        };

        // Listen for all possible exit/re-entry vectors
        document.addEventListener("visibilitychange", checkSecurityLifecycle);
        window.addEventListener("pagehide", checkSecurityLifecycle);
        window.addEventListener("pageshow", checkSecurityLifecycle);
        window.addEventListener("blur", checkSecurityLifecycle);
        window.addEventListener("focus", checkSecurityLifecycle);

        return () => {
            document.removeEventListener("visibilitychange", checkSecurityLifecycle);
            window.removeEventListener("pagehide", checkSecurityLifecycle);
            window.removeEventListener("pageshow", checkSecurityLifecycle);
            window.removeEventListener("blur", checkSecurityLifecycle);
            window.removeEventListener("focus", checkSecurityLifecycle);
        };
    }, [hasPin]);

    // Constant heartbeat to keep 'last_active' fresh while app is open
    useEffect(() => {
        if (!hasPin || isLocked) return;
        const interval = setInterval(() => {
            localStorage.setItem('aurum_last_active', Date.now().toString());
        }, 1000);
        return () => clearInterval(interval);
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
    if (!context) throw new Error("useSecurity must be used within SecurityProvider");
    return context;
};
