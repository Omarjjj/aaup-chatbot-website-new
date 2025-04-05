/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#60a5fa',
          DEFAULT: '#3b82f6',
          dark: '#2563eb',
        },
      },
      fontFamily: {
        heading: ['Outfit', 'system-ui', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            fontFamily: 'var(--font-body)',
            h1: {
              fontFamily: 'var(--font-heading)',
              color: 'inherit',
              marginBottom: '0.5em',
              letterSpacing: '-0.02em',
            },
            h2: {
              fontFamily: 'var(--font-heading)',
              color: 'inherit',
              marginBottom: '0.5em',
              letterSpacing: '-0.02em',
            },
            h3: {
              fontFamily: 'var(--font-heading)',
              color: 'inherit',
              marginBottom: '0.5em',
              letterSpacing: '-0.02em',
            },
            p: {
              fontFamily: 'var(--font-body)',
            },
            a: {
              color: '#3b82f6',
              '&:hover': {
                color: '#2563eb',
              },
            },
            code: {
              color: 'inherit',
              backgroundColor: '#f3f4f6',
              borderRadius: '0.25rem',
              paddingTop: '0.125rem',
              paddingRight: '0.25rem',
              paddingBottom: '0.125rem',
              paddingLeft: '0.25rem',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            blockquote: {
              borderLeftColor: '#3b82f6',
              color: 'inherit',
              fontFamily: 'var(--font-body)',
              fontStyle: 'italic',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 