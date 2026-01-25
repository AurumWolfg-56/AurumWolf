/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./**/*.{js,ts,jsx,tsx}",
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
                    // Overriding default neutral for a better dark mode
                    800: '#1F2937', // Default tailwind cool gray 800
                    900: '#111827', // Default tailwind cool gray 900
                    950: '#030712', // Obsidian
                }
            },
            fontFamily: {
                Display: ['Outfit', 'sans-serif'],
                sans: ['Inter', 'sans-serif'],
                mono: ['Space Mono', 'monospace'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'glass-gradient': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                'gold-gradient': 'linear-gradient(135deg, #DFBD69 0%, #926F34 100%)',
            },
            animation: {
                'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'scale(0.98)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(15px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                }
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                'glow': '0 0 15px rgba(197, 144, 63, 0.3)',
            }
        },
    },
    plugins: [],
}
