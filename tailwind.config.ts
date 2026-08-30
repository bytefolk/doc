import type { Config } from 'tailwindcss'
import uiPreset from '@fullstack-ai-infra/ui/tailwind-preset'

const config = {
  presets: [uiPreset],
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        border: 'var(--ui-border)',
        input: 'var(--ui-border-strong)',
        ring: 'var(--ui-focus)',
        background: 'var(--ui-canvas)',
        foreground: 'var(--ui-foreground)',
        active: 'var(--ui-primary-soft)',
        primary: {
          DEFAULT: 'var(--ui-primary)',
          foreground: 'var(--ui-primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--ui-surface-inset)',
          foreground: 'var(--ui-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--ui-danger)',
          foreground: 'var(--ui-primary-foreground)',
        },
        success: {
          DEFAULT: 'var(--ui-success)',
          foreground: 'var(--ui-primary-foreground)',
        },
        warning: {
          DEFAULT: 'var(--ui-warning)',
          foreground: 'var(--ui-foreground)',
        },
        muted: {
          DEFAULT: 'var(--ui-canvas-subtle)',
          foreground: 'var(--ui-foreground-muted)',
        },
        accent: {
          DEFAULT: 'var(--ui-primary-soft)',
          foreground: 'var(--ui-foreground)',
        },
        popover: {
          DEFAULT: 'var(--ui-surface-raised)',
          foreground: 'var(--ui-foreground)',
        },
        card: {
          DEFAULT: 'var(--ui-surface)',
          foreground: 'var(--ui-foreground)',
        },
      },
      borderRadius: {
        lg: 'var(--ui-radius-lg)',
        md: 'var(--ui-radius-md)',
        sm: 'var(--ui-radius-sm)',
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
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-caret': {
          '0%, 45%': { opacity: '1' },
          '46%, 100%': { opacity: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-caret': 'pulse-caret 1.1s steps(1) infinite',
      },
      // custom tailwindcss typography style
      typography: {
        DEFAULT: {
          css: {
            'h2, h3, h4, h5, ul, ol': {
              'margin-top': '1em',
              'margin-bottom': '0.6em',
            },
            'p, pre, blockquote': {
              'margin-top': '0.6em',
              'margin-bottom': '0.6em',
            },
            li: {
              'margin-top': '0px',
              'margin-bottom': '0px',
            },
            'li > p, li > ul, li > ol ': {
              'margin-top': '0px',
              'margin-bottom': '0px',
            },
            hr: {
              'margin-top': '1em',
              'margin-bottom': '1em',
            },
            img: {
              'margin-top': '0.6em',
              'margin-bottom': '0.6em',
            },
            table: {
              'margin-top': '1em',
              'margin-bottom': '1em',
            },
            'ul>li::marker': {
              color: 'var(--tw-prose-body);',
            },
            'code::before': {
              content: 'none',
            },
            'code::after': {
              content: 'none',
            },
            code: {
              'background-color': 'var(--tw-prose-pre-bg)',
              color: 'var(--tw-prose-pre-code)',
              padding: '0.125em 0.25em',
              margin: '0 0.25em',
              'border-radius': '0.25em',
              'font-weight': 'normal',
            },
            '--tw-prose-invert-pre-bg': 'rgb(255 255 255 / 0.1)',
          },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config

export default config
