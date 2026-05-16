/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#8b5cf6',
          dark: '#7c3aed',
          bg: 'rgba(139,92,246,0.1)',
          ring: 'rgba(139,92,246,0.3)',
        },
      },
      fontFamily: {
        mono: ["'SF Mono'", "'Fira Code'", 'monospace'],
      },
      keyframes: {
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.2' } },
        sweep: { '0%': { transform: 'translateX(-200%)' }, '100%': { transform: 'translateX(500%)' } },
        wavebar: { '0%,100%': { transform: 'scaleY(0.3)' }, '50%': { transform: 'scaleY(1)' } },
        'row-pulse': {
          from: { boxShadow: '0 0 0 1px rgba(139,92,246,0.4), 0 0 6px rgba(139,92,246,0.2)' },
          to:   { boxShadow: '0 0 0 1px #8b5cf6, 0 0 20px rgba(139,92,246,0.55), 0 0 36px rgba(139,92,246,0.2)' },
        },
        'flicker-in': {
          '0%': { opacity: '0' }, '20%': { opacity: '1' }, '35%': { opacity: '0.2' },
          '55%': { opacity: '1' }, '70%': { opacity: '0.5' }, '100%': { opacity: '1' },
        },
        'blink-cursor': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
      animation: {
        blink: 'blink 0.7s infinite',
        sweep: 'sweep 1.4s ease-in-out infinite',
        wavebar: 'wavebar 0.7s ease-in-out infinite',
        'row-pulse': 'row-pulse 0.7s ease-in-out infinite alternate',
        'flicker-in': 'flicker-in 0.35s step-end',
        'blink-cursor': 'blink-cursor 1s step-end infinite',
      },
    },
  },
  plugins: [],
}
