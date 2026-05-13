import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', ...fontFamily.sans],
      },
      colors: {
        // Brand palette
        navy: {
          50:  '#eef4ff',
          100: '#d9e6ff',
          200: '#bccffe',
          300: '#8eb1fd',
          400: '#5888fa',
          500: '#3163f6',
          600: '#1d43eb',
          700: '#1632d8',
          800: '#182aaf',
          900: '#192889',
          950: '#141a53',
          deep: '#0D1B2A',
          mid:  '#0F2744',
          card: '#132038',
        },
        brand: {
          DEFAULT: '#2563EB',
          light:   '#3B82F6',
          dark:    '#1D4ED8',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger:  '#EF4444',
        info:    '#06B6D4',
        priority: {
          senior:   '#8B5CF6',
          pwd:      '#EC4899',
          pregnant: '#F97316',
          vip:      '#EAB308',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'queue-call': {
          '0%':   { transform: 'scale(1)',    boxShadow: '0 0 0 0 rgba(37,99,235,0.4)' },
          '70%':  { transform: 'scale(1.02)', boxShadow: '0 0 0 16px rgba(37,99,235,0)' },
          '100%': { transform: 'scale(1)',    boxShadow: '0 0 0 0 rgba(37,99,235,0)' },
        },
        'priority-pulse': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(139,92,246,0.5)' },
          '50%':     { boxShadow: '0 0 0 10px rgba(139,92,246,0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'accordion-down':  'accordion-down 0.2s ease-out',
        'accordion-up':    'accordion-up 0.2s ease-out',
        'slide-in-right':  'slide-in-right 0.35s ease-out',
        'fade-in':         'fade-in 0.4s ease both',
        'queue-call':      'queue-call 1s ease-out',
        'priority-pulse':  'priority-pulse 2s infinite',
        shimmer:           'shimmer 1.5s infinite linear',
      },
      backgroundImage: {
        shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
