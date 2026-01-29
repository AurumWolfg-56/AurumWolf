/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                gold: {
                    50: '#FCF9F0',
                    100: '#F7F1DE',
                    200: '#EBDCB8',
                    300: '#DFC28D',
                    400: '#D4AA64',
                    500: '#C5903F', // Richer Gold
                    600: '#A1722D',
                    700: '#7D5721',
                    800: '#5F4118',
                    900: '#452D10',
                },
                platinum: {
                    50: '#F8F9FA',
                    100: '#EAEEF2', // Cooler grey
                    200: '#DCE2E8',
                    300: '#CDD5DE',
                    400: '#9DAAB8',
                    500: '#6C7A89',
                    600: '#4D5966',
                    700: '#343E48',
                    800: '#1D242B',
                    900: '#0F1216', // Deep Blue-Black
                },
                neutral: {
                    800: '#1e293b', // Slate 800 - Richer Blue-Grey
                    900: '#0f172a', // Slate 900 - Deep Night Blue
                    950: '#020617', // Slate 950 - Almost Black Blue
                }
            },
            fontFamily: {
                Display: ['Outfit', 'sans-serif'],
                sans: ['Manrope', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'glass-gradient': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                'gold-gradient': 'linear-gradient(135deg, #DFBD69 0%, #926F34 100%)',
                'aurora': 'conic-gradient(from 0deg at 50% 50%, #020617 0deg, #0f172a 60deg, #1e293b 120deg, #0f172a 180deg, #020617 360deg)',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'aurora-spin': 'spin 20s linear infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                }
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
                'glow': '0 0 20px rgba(197, 144, 63, 0.15)',
                'neon': '0 0 10px rgba(197, 144, 63, 0.5), 0 0 20px rgba(197, 144, 63, 0.3)',
            }
        },
    },
    plugins: [],
}
