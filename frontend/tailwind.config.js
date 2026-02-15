/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'var(--color-border)', /* slate-200 */
        input: 'var(--color-input)', /* slate-200 */
        ring: 'var(--color-ring)', /* violet-600 */
        background: 'var(--color-background)', /* slate-50 */
        foreground: 'var(--color-foreground)', /* slate-900 */
        primary: {
          DEFAULT: 'var(--color-primary)', /* slate-800 */
          foreground: 'var(--color-primary-foreground)' /* white */
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)', /* slate-600 */
          foreground: 'var(--color-secondary-foreground)' /* white */
        },
        accent: {
          DEFAULT: 'var(--color-accent)', /* violet-600 */
          foreground: 'var(--color-accent-foreground)' /* white */
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)', /* red-600 */
          foreground: 'var(--color-destructive-foreground)' /* white */
        },
        success: {
          DEFAULT: 'var(--color-success)', /* emerald-600 */
          foreground: 'var(--color-success-foreground)' /* white */
        },
        warning: {
          DEFAULT: 'var(--color-warning)', /* amber-600 */
          foreground: 'var(--color-warning-foreground)' /* white */
        },
        error: {
          DEFAULT: 'var(--color-error)', /* red-600 */
          foreground: 'var(--color-error-foreground)' /* white */
        },
        muted: {
          DEFAULT: 'var(--color-muted)', /* slate-100 */
          foreground: 'var(--color-muted-foreground)' /* slate-500 */
        },
        card: {
          DEFAULT: 'var(--color-card)', /* white */
          foreground: 'var(--color-card-foreground)' /* slate-800 */
        },
        popover: {
          DEFAULT: 'var(--color-popover)', /* white */
          foreground: 'var(--color-popover-foreground)' /* slate-800 */
        }
      },
      fontFamily: {
        heading: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        body: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        caption: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace']
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '12px',
        md: '12px',
        lg: '18px',
        xl: '24px'
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem'
      },
      maxWidth: {
        'prose': '65ch'
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      transitionDuration: {
        'smooth': '250ms'
      },
      boxShadow: {
        'elevation-sm': '0 1px 3px rgba(15, 23, 42, 0.08)',
        'elevation-md': '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -1px rgba(15, 23, 42, 0.06)',
        'elevation-lg': '0 10px 15px -3px rgba(15, 23, 42, 0.12), 0 4px 6px -2px rgba(15, 23, 42, 0.08)',
        'elevation-xl': '0 20px 40px -8px rgba(15, 23, 42, 0.16)'
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate')
  ]
}