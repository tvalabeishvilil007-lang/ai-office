/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      height: {
        screen: '100dvh',
      },
      minHeight: {
        screen: '100dvh',
      },
      maxHeight: {
        screen: '100dvh',
      },
      colors: {
        surface: {
          50:  '#f8f9fc',
          900: '#0a0c14',
          950: '#060810',
        },
        accent: {
          blue:    '#3b82f6',
          indigo:  '#6366f1',
          violet:  '#8b5cf6',
          gold:    '#f59e0b',
          emerald: '#10b981',
          rose:    '#f43f5e',
          sky:     '#0ea5e9',
        },
        status: {
          active:  '#10b981',
          busy:    '#f59e0b',
          idle:    '#6b7280',
          offline: '#374151',
        },
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
        'office-gradient': 'linear-gradient(180deg, #07090f 0%, #0a0d18 50%, #080b15 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
      },
      boxShadow: {
        'glass':      '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-lg':   '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glow-blue':  '0 0 30px rgba(59,130,246,0.25)',
        'glow-violet':'0 0 30px rgba(139,92,246,0.25)',
        'glow-gold':  '0 0 30px rgba(245,158,11,0.25)',
        'card':       '0 2px 8px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)',
        'card-hover': '0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.12)',
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'float':        'float 6s ease-in-out infinite',
        'shimmer':      'shimmer 2.5s linear infinite',
        'fade-in':      'fadeIn 0.5s ease-out',
        'slide-up':     'slideUp 0.4s ease-out',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

