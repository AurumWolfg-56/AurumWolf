/** @type {import('tailwindcss').Config} */
module.exports = {
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
                    50: '#FBF8F3',
                    100: '#F5EFE4',
                    200: '#EBDDC3',
                    300: '#DFC8A1',
                    400: '#D2B27E',
                    500: '#C59D5F', // Primary Gold
                    600: '#9E7D4C',
                    700: '#765E39',
                    800: '#4F3F26',
                    900: '#271F13',
                },
                platinum: {
                    50: '#F8F9FA',
                    100: '#E9ECEF',
                    200: '#DEE2E6',
                    300: '#CED4DA',
                    400: '#ADB5BD',
                    500: '#6C757D',
                    600: '#495057',
                    700: '#343A40',
                    800: '#212529',
                    900: '#151719', // Darkest
                }
            },
            fontFamily: {
                Display: ['Outfit', 'sans-serif'],
                sans: ['Inter', 'sans-serif'],
                mono: ['Space Mono', 'monospace'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                }
            }
        },
    },
    plugins: [],
}
