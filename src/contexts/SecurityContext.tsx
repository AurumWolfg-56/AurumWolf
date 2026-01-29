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
    isSecurityBypassed: boolean;
    setSecurityBypass: (enabled: boolean) => void;
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
    const [isSecurityBypassed, setIsSecurityBypassed] = useState(false);
    const bypassRef = React.useRef(false); // Synchronous ref for event listeners

    // Auto-reset bypass after 60 seconds of inactivity to prevent permanent vulnerability
    const bypassTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const setSecurityBypass = (enabled: boolean) => {
        // CRITICAL: Set ref FIRST (synchronous) before async state update
        bypassRef.current = enabled;
        setIsSecurityBypassed(enabled);

        if (bypassTimeoutRef.current) clearTimeout(bypassTimeoutRef.current);
        if (enabled) {
            // 60s max bypass for safety
            bypassTimeoutRef.current = setTimeout(() => {
                bypassRef.current = false;
                setIsSecurityBypassed(false);
            }, 60000);
        }
    };

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
        localStorage.setItem('aurum_last_active', Date.now().toString());
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
        if (!window.PublicKeyCredential) {
            console.error("Biometrics: WebAuthn not supported");
            return false;
        }

        try {
            setSecurityBypass(true); // Prevent lock during system prompt
            const savedCredentialId = localStorage.getItem(STORAGE_KEYS.CREDENTIAL_ID);
            const allowCredentials: PublicKeyCredentialDescriptor[] = savedCredentialId ? [{
                type: 'public-key',
                id: base64URLStringToBuffer(savedCredentialId),
            }] : [];

            console.log("Biometrics: Triggering verification prompt...");
            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge: getChallenge(),
                    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
                    userVerification: "required",
                    timeout: 60000,
                }
            });

            if (assertion) {
                console.log("Biometrics: Verification successful");
                setIsAuthenticated(true);
                setIsLocked(false);
                setLastBiometricError(null);
                setSecurityBypass(false);
                return true;
            }
        } catch (error: any) {
            console.error("Biometrics: Verification failed", error);
            setLastBiometricError(error.name === 'NotAllowedError' ? 'Canceled' : 'Hardware Error');
        } finally {
            // Longer delay to ensure window regains focus and avoid flicker
            setTimeout(() => setSecurityBypass(false), 3000);
        }
        return false;
    };

    const toggleBiometrics = async (enabled: boolean) => {
        if (enabled) {
            if (!window.isSecureContext) {
                console.error("Biometrics: Not an HTTPS context");
                alert("La seguridad biométrica requiere una conexión HTTPS segura.");
                return;
            }

            try {
                setSecurityBypass(true); // CRITICAL: Stop auto-lock from killing setup
                console.log("Biometrics: Starting enrollment for RP:", window.location.hostname);

                const credential = await navigator.credentials.create({
                    publicKey: {
                        challenge: getChallenge(),
                        rp: {
                            name: "AurumWolf",
                            id: window.location.hostname
                        },
                        user: {
                            id: crypto.getRandomValues(new Uint8Array(16)),
                            name: "user@aurumwolf.app",
                            displayName: "AurumWolf Member"
                        },
                        pubKeyCredParams: [
                            { alg: -7, type: "public-key" }, // ES256 (Common)
                            { alg: -257, type: "public-key" } // RS256 (Older fallback)
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
                    console.log("Biometrics: Setup complete");
                    alert("¡Huella/Rostro vinculado correctamente!");
                }
            } catch (e: any) {
                console.error("Biometrics: Setup failed", e);
                // Help user understand why it failed
                const msg = e.name === 'NotAllowedError' ? 'Operación cancelada o tiempo agotado.' : `Error: ${e.message}`;
                alert(`No se pudo activar: ${msg}`);
                setLastBiometricError(e.message);
            } finally {
                // Longer delay to prevent flicker during enrollment
                setTimeout(() => setSecurityBypass(false), 3000);
            }
        } else {
            setBiometricsEnabled(false);
            localStorage.setItem(STORAGE_KEYS.BIOMETRICS_ENABLED, 'false');
            localStorage.removeItem(STORAGE_KEYS.CREDENTIAL_ID);
            console.log("Biometrics: Disabled");
        }
    };

    const removePin = () => {
        localStorage.removeItem(STORAGE_KEYS.PIN_HASH);
        localStorage.removeItem(STORAGE_KEYS.BIOMETRICS_ENABLED);
        localStorage.removeItem(STORAGE_KEYS.CREDENTIAL_ID);
        localStorage.removeItem('aurum_last_active');
        setHasPin(false);
        setIsLocked(false);
        setBiometricsEnabled(false);
        setLastBiometricError(null);
        setIsAuthenticated(true);
    };

    // --- VISUAL REGRESSION SHIELD ---
    const toggleAppPause = (paused: boolean) => {
        if (paused) document.body.classList.add('app-paused');
        else {
            // Small delay to allow React to render the Lock Screen frame
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    document.body.classList.remove('app-paused');
                });
            });
        }
    };

    // Ensure app is visible when lock state changes (e.g. after mounting Lock Screen)
    useEffect(() => {
        // Force reveal when lock state settles
        const t = setTimeout(() => document.body.classList.remove('app-paused'), 150);
        return () => clearTimeout(t);
    }, [isLocked]);

    // --- CRITICAL: AUTO-LOCK WITH SCANNER PROTECTION ---
    useEffect(() => {
        if (!hasPin) return;

        const enforceLock = () => {
            // Double-check bypass synchronously - critical for preventing flicker
            if (bypassRef.current === true) return;

            // Also check for active scanner
            if (document.querySelector('.scanner-container')) return;

            console.log("Security Event: Locking app");
            lock();
            localStorage.setItem('aurum_last_active', Date.now().toString());
        };

        const reEntryCheck = () => {
            if (bypassRef.current) return;
            if (document.querySelector('.scanner-container')) return;

            const now = Date.now();
            const lastActive = parseInt(localStorage.getItem('aurum_last_active') || '0');

            if (document.visibilityState === 'visible') {
                // RESUMING
                if (lastActive > 0 && now - lastActive > 5000) {
                    // Should Lock
                    enforceLock();
                    // Don't unpause here; let the isLocked effect handle it
                } else {
                    // Safe to reveal
                    toggleAppPause(false);
                }
                localStorage.setItem('aurum_last_active', now.toString());
            } else {
                // HIDING
                // Only lock on visibility hidden if no active operations
                if (!bypassRef.current && !document.querySelector('.scanner-container')) {
                    toggleAppPause(true); // Hide immediately
                    enforceLock();
                }
            }
        };

        const handlePageHide = () => {
            toggleAppPause(true);
            enforceLock();
        };

        document.addEventListener("visibilitychange", reEntryCheck);
        window.addEventListener("pagehide", handlePageHide);
        window.addEventListener("beforeunload", handlePageHide);
        window.addEventListener("focus", reEntryCheck);

        return () => {
            document.removeEventListener("visibilitychange", reEntryCheck);
            window.removeEventListener("pagehide", handlePageHide);
            window.removeEventListener("beforeunload", handlePageHide);
            window.removeEventListener("focus", reEntryCheck);
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
            lastBiometricError,
            isSecurityBypassed,
            setSecurityBypass
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
