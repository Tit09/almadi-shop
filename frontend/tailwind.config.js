/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette reprise du logo Almadi Shop : noir profond + or.
        ink: {
          DEFAULT: '#0f0f0f',
          50: '#f6f6f6', 100: '#e7e7e7', 200: '#d1d1d1', 300: '#b0b0b0',
          400: '#888888', 500: '#6d6d6d', 600: '#5d5d5d', 700: '#4f4f4f',
          800: '#454545', 900: '#1c1c1c', 950: '#0f0f0f',
        },
        gold: {
          DEFAULT: '#c8a24a',
          50: '#fbf8ef', 100: '#f5eed6', 200: '#ecdcac', 300: '#dfc278',
          400: '#d4ad52', 500: '#c8a24a', 600: '#ab7f37', 700: '#8b612f',
          800: '#744e2d', 900: '#624228', 950: '#382214',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,15,15,.04), 0 8px 24px -12px rgba(15,15,15,.18)',
        lift: '0 12px 40px -12px rgba(15,15,15,.28)',
        gold: '0 10px 30px -12px rgba(200,162,74,.55)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'none' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(.22,1,.36,1) both',
        marquee: 'marquee 28s linear infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
