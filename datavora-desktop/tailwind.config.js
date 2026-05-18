/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'app-bg': '#09090B',
        'sidebar-bg': '#111113',
        surface: '#18181B',
        'surface-2': '#27272A',
        'border-soft': 'rgba(255,255,255,0.08)',
        accent: '#7C3AED',
        'accent-hover': '#6D28D9',
        'text-base': '#FAFAFA',
        muted: '#71717A',
        'text-dim': '#3F3F46',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        // Aliases retained for legacy components
        bg: '#09090B',
        elevated: '#18181B',
        border: 'rgba(255,255,255,0.08)',
        accentHover: '#6D28D9',
        text: '#FAFAFA',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'pulse-dot': {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
};
