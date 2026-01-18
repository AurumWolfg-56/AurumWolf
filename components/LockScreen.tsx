
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Delete, Fingerprint, Lock } from 'lucide-react';
import { Logo } from './Logo';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);

  // Auto-simulate biometric scan on load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBiometricScanning(true);
      // Simulate success after scan
      setTimeout(() => {
        setIsBiometricScanning(false);
        onUnlock(); // Auto unlock for demo purposes
      }, 1500);
    }, 1000); // Wait 1s before scanning
    return () => clearTimeout(timer);
  }, [onUnlock]);

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        validatePin(newPin);
      }
    }
  };

  const validatePin = (inputPin: string) => {
    if (inputPin === '0000' || inputPin === '1234') {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 500);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-neutral-950"></div>
      <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent blur-sm"></div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        
        {/* Header */}
        <div className="mb-12 flex flex-col items-center animate-fade-in">
           <div className="mb-6 scale-125">
             <Logo iconSize="w-16 h-16" showText={false} />
           </div>
           <h1 className="font-display font-bold text-2xl tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-white via-gold-200 to-gold-500 mb-2">
             AURUMWOLF
           </h1>
           <p className="text-xs font-mono text-neutral-500 tracking-widest uppercase flex items-center gap-2">
             <Lock size={10} /> Secure Vault Access
           </p>
        </div>

        {/* PIN Indicators */}
        <div className="flex gap-4 mb-12">
           {[...Array(4)].map((_, i) => (
             <div 
               key={i} 
               className={`w-3 h-3 rounded-full transition-all duration-300 border border-gold-500/30 ${
                 i < pin.length 
                   ? error 
                     ? 'bg-red-500 border-red-500 scale-110' 
                     : 'bg-gold-500 border-gold-500 scale-110 shadow-[0_0_10px_#D4AF37]' 
                   : 'bg-transparent'
               }`}
             ></div>
           ))}
        </div>

        {/* Status Text */}
        <div className="h-8 mb-8 flex items-center justify-center">
            {error ? (
                <span className="text-red-500 text-xs font-bold uppercase tracking-widest animate-pulse">Access Denied</span>
            ) : isBiometricScanning ? (
                <span className="text-gold-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 animate-pulse">
                    <Fingerprint size={14} /> Biometric Verify...
                </span>
            ) : (
                <span className="text-neutral-600 text-xs font-bold uppercase tracking-widest">Enter Passcode</span>
            )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
           {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
             <button
               key={num}
               onClick={() => handlePress(num.toString())}
               className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 text-xl font-medium text-white hover:bg-neutral-800 hover:border-gold-500/30 active:scale-95 transition-all focus:outline-none flex items-center justify-center shadow-lg"
             >
               {num}
             </button>
           ))}
           <div className="flex items-center justify-center">
               <button 
                onClick={() => setIsBiometricScanning(true)}
                className="text-gold-500 hover:text-white transition-colors p-4"
               >
                   <Fingerprint size={32} />
               </button>
           </div>
           <button
             onClick={() => handlePress('0')}
             className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 text-xl font-medium text-white hover:bg-neutral-800 hover:border-gold-500/30 active:scale-95 transition-all focus:outline-none flex items-center justify-center shadow-lg"
           >
             0
           </button>
           <div className="flex items-center justify-center">
              <button 
                onClick={handleDelete}
                className="w-16 h-16 rounded-full flex items-center justify-center text-neutral-500 hover:text-white transition-colors focus:outline-none"
              >
                 <Delete size={24} />
              </button>
           </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-[10px] text-neutral-600 font-mono">v1.1.0 • ENCRYPTED CONNECTION</p>
      </div>
    </div>
  );
};
