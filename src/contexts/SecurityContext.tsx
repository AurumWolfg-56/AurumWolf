import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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
    loginWithBiometrics: (email: string) => Promise<void>;
    lastBiometricError: string | null;
    isSecurityBypassed: boolean;
    setSecurityBypass: (enabled: boolean) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const STORAGE_KEYS = {
    PIN_HASH: 'aurum_security_pin',
    BIOMETRICS_ENABLED: 'aurum_security_bio',
    CREDENTIAL_ID: 'aurum_security_cred_id',
    VAULT: 'aurum_vault_data',
    LOCK_TIMEOUT: 'aurum_security_timeout'
};

export function SecurityProvider({ children }: { children: React.ReactNode }) {
    // Current state is memory-only for security
    const [isLocked, setIsLocked] = useState(false);
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
        // Disabled
    };

    const verifyPin = async (inputPin: string): Promise<boolean> => {
        return true;
    };

    const lock = () => {
        // Disabled
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
                // Do NOT set isAuthenticated here blindly, as we might be using this for login
                setLastBiometricError(null);
                setSecurityBypass(false);
                return true;
            }
        } catch (error: any) {
            console.error("Biometrics: Verification failed", error);
            setLastBiometricError(error.name === 'NotAllowedError' ? 'Canceled' : 'Hardware Error');
        } finally {
            setTimeout(() => setSecurityBypass(false), 1000);
        }
        return false;
    };

    const loginWithBiometrics = async (email: string) => {
        const verified = await verifyBiometrics();
        if (!verified) throw new Error("Biometric verification failed");

        const vault = localStorage.getItem(STORAGE_KEYS.VAULT);
        if (!vault) throw new Error("No secure credentials found. Please toggle Biometrics off and on in Settings to reset.");

        try {
            const password = atob(vault); // Simple de-obfuscation
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            setIsAuthenticated(true);
            setIsLocked(false);
        } catch (e: any) {
            console.error("Login failed:", e);
            throw new Error(e.message || "Failed to sign in with stored credentials");
        }
    };

    const toggleBiometrics = async (enabled: boolean) => {
        if (enabled) {
            if (!window.isSecureContext) {
                alert("La seguridad biométrica requiere una conexión HTTPS segura.");
                return;
            }

            // Prompt for password to store in vault
            const password = window.prompt("Para habilitar el inicio de sesión biométrico, ingresa tu contraseña actual:");
            if (!password) return;

            try {
                setSecurityBypass(true);
                console.log("Biometrics: Starting enrollment...");

                // Create local credential to verify device ownership
                const credential = await navigator.credentials.create({
                    publicKey: {
                        challenge: getChallenge(),
                        rp: { name: "AurumWolf", id: window.location.hostname },
                        user: {
                            id: crypto.getRandomValues(new Uint8Array(16)),
                            name: "user@aurumwolf.app",
                            displayName: "AurumWolf User"
                        },
                        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
                        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
                        timeout: 60000
                    }
                }) as PublicKeyCredential;

                if (credential) {
                    localStorage.setItem(STORAGE_KEYS.CREDENTIAL_ID, credential.id);
                    localStorage.setItem(STORAGE_KEYS.VAULT, btoa(password)); // Store obfuscated password
                    setBiometricsEnabled(true);
                    localStorage.setItem(STORAGE_KEYS.BIOMETRICS_ENABLED, 'true');
                    alert("¡Biometría vinculada correctamente!");
                }
            } catch (e: any) {
                console.error("Biometrics: Setup failed", e);
                const msg = e.name === 'NotAllowedError' ? 'Operación cancelada.' : e.message;
                alert(`Error al activar: ${msg}`);
                setLastBiometricError(e.message);
                setBiometricsEnabled(false);
            } finally {
                setTimeout(() => setSecurityBypass(false), 1000);
            }
        } else {
            setBiometricsEnabled(false);
            localStorage.setItem(STORAGE_KEYS.BIOMETRICS_ENABLED, 'false');
            localStorage.removeItem(STORAGE_KEYS.CREDENTIAL_ID);
            localStorage.removeItem(STORAGE_KEYS.VAULT);
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
            loginWithBiometrics,
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
