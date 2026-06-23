/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral, premium, architectural surface palette
        chalk: '#FAF9F7',
        paper: '#FFFFFF',
        stone: {
          50: '#F4F2EF',
          100: '#ECE9E4',
          200: '#DED9D2',
          300: '#C8C1B7',
          400: '#A89F92',
          500: '#857C6E',
          600: '#655E52',
        },
        ink: {
          DEFAULT: '#1B1A17',
          soft: '#3A3733',
          muted: '#6E6A62',
          faint: '#9C978D',
        },
        accent: {
          DEFAULT: '#5A5246', // muted graphite-bronze, neutral
          soft: '#7A7264',
        },
        line: '#E4E0D9',
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
      },
      letterSpacing: {
        label: '0.14em',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        panel: '0 1px 2px rgba(27,26,23,0.04), 0 12px 32px -16px rgba(27,26,23,0.18)',
        soft: '0 1px 2px rgba(27,26,23,0.05)',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
