/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fixed across every society theme on purpose: a neutral warm background,
        // and status colors that must always mean the same thing regardless of brand.
        cream: { 50: '#FDFBF7', 100: '#FAF6EF', 200: '#F2EBDE', 300: '#E7DECB' },
        // The real Prangan One brand navy, from the official logo files
        // (public/brand/). Fixed, never themed - use this for platform-owned
        // surfaces (owner console, public site, 403/404). It is deliberately
        // NOT the same token as the tenant-themeable `navy` scale below,
        // which starts at a very similar but not identical shade by
        // coincidence, and which a society can change via its theme preset.
        // Do not use `brand-navy` for anything tenant-facing.
        'brand-navy': '#10223F',
        paid: '#16A34A',
        pend: '#D97706',
        over: '#DC2626',
        // Theme-driven: resolved from CSS variables set at runtime per society
        // (see src/lib/theme/apply.ts + src/lib/theme/presets.ts). The `<alpha-value>`
        // placeholder is how Tailwind keeps opacity modifiers like bg-navy-800/50 working
        // even though the color itself now comes from a variable. Defaults in index.css
        // match the original hardcoded values, so nothing changes until a theme is applied.
        navy: {
          50: 'rgb(var(--color-navy-50) / <alpha-value>)',
          100: 'rgb(var(--color-navy-100) / <alpha-value>)',
          300: 'rgb(var(--color-navy-300) / <alpha-value>)',
          400: 'rgb(var(--color-navy-400) / <alpha-value>)',
          600: 'rgb(var(--color-navy-600) / <alpha-value>)',
          700: 'rgb(var(--color-navy-700) / <alpha-value>)',
          800: 'rgb(var(--color-navy-800) / <alpha-value>)',
          900: 'rgb(var(--color-navy-900) / <alpha-value>)',
          950: 'rgb(var(--color-navy-950) / <alpha-value>)',
        },
        saffron: {
          50: 'rgb(var(--color-saffron-50) / <alpha-value>)',
          100: 'rgb(var(--color-saffron-100) / <alpha-value>)',
          300: 'rgb(var(--color-saffron-300) / <alpha-value>)',
          400: 'rgb(var(--color-saffron-400) / <alpha-value>)',
          500: 'rgb(var(--color-saffron-500) / <alpha-value>)',
          600: 'rgb(var(--color-saffron-600) / <alpha-value>)',
          700: 'rgb(var(--color-saffron-700) / <alpha-value>)',
        },
      },
      fontFamily: {
        guj: ['"Noto Sans Gujarati"', 'Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 1px 2px rgba(20,29,48,0.05), 0 4px 18px rgba(20,29,48,0.07)',
        lift: '0 8px 28px rgba(20,29,48,0.12)'
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        // Fast, restrained entrance for transient UI (toasts). ease-out on
        // enter, ~180ms, per the interaction-speed guidance - only opacity and
        // transform so nothing triggers layout.
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        // Skeleton loading shimmer - a sweep of light across a placeholder.
        // Pure transform on a gradient, GPU-friendly, and fully suppressed by
        // the prefers-reduced-motion block in index.css.
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        }
      },
      animation: {
        fadeUp: 'fadeUp .45s cubic-bezier(0.16,1,0.3,1) both',
        fadeIn: 'fadeIn .18s cubic-bezier(0.16,1,0.3,1) both',
        shimmer: 'shimmer 1.4s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
