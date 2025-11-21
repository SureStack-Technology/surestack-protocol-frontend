/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./shared/**/*.{js,jsx,ts,tsx}",
  ],
  safelist: [
    "bg-gradient-to-r",
    "from-slate-900",
    "via-slate-800",
    "to-slate-900",
    "border",
    "border-slate-700",
    "shadow-xl",
  ],
  theme: {
    extend: {
      colors: {
        // Cyberpunk palette
        void: '#0a0a0f',
        risk: '#ff2d55',
        safe: '#00f5ff',
        warning: '#ffb800',
        neon: {
          DEFAULT: '#00eaff',
          cyan: '#00f5ff',
          pink: '#ff2d55',
          yellow: '#ffb800',
          purple: '#b026ff',
          green: '#00ff88',
        },
        cyber: '#ff00ff',
        border: '#1E293B',
        input: '#334155',
        ring: '#3B82F6',
        background: '#0a0a0f',
        foreground: '#e0e7ff',
        primary: {
          DEFAULT: '#00f5ff',
          foreground: '#0a0a0f',
        },
        secondary: {
          DEFAULT: '#64748B',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#ff2d55',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#ff2d55',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#1a1a2e',
          foreground: '#a0aec0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Orbitron', 'sans-serif'],
        subheading: ['Rajdhani', 'sans-serif'],
        mono: ['Courier New', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-risk': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(255, 45, 85, 0.5)',
            borderColor: 'rgba(255, 45, 85, 0.8)',
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(255, 45, 85, 1)',
            borderColor: 'rgba(255, 45, 85, 1)',
          },
        },
        'pulse-safe': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(0, 245, 255, 0.5)',
            borderColor: 'rgba(0, 245, 255, 0.8)',
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(0, 245, 255, 1)',
            borderColor: 'rgba(0, 245, 255, 1)',
          },
        },
        'glitch': {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'volatility-glow': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out',
        'pulse-risk': 'pulse-risk 2s ease-in-out infinite',
        'pulse-safe': 'pulse-safe 2s ease-in-out infinite',
        'glitch': 'glitch 0.3s infinite',
        'scanline': 'scanline 8s linear infinite',
        'volatility-glow': 'volatility-glow 1.5s ease-in-out infinite',
      },
      boxShadow: {
        'neon-risk': '0 0 20px rgba(255, 45, 85, 0.8), 0 0 40px rgba(255, 45, 85, 0.4)',
        'neon-safe': '0 0 20px rgba(0, 245, 255, 0.8), 0 0 40px rgba(0, 245, 255, 0.4)',
        'neon-warning': '0 0 20px rgba(255, 184, 0, 0.8), 0 0 40px rgba(255, 184, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
