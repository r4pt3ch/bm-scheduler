/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue'
  ],
  theme: {
    extend: {
      colors: {
        // "brand" now carries the gold accent — used sparingly (active nav,
        // primary buttons, key figures like net pay), never as a body-text color.
        brand: {
          50: '#fbf3df',
          100: '#f3e3b8',
          200: '#e8cd85',
          300: '#d9b35a',
          400: '#c89a3f', // accent, hover states
          500: '#b3852f', // primary gold
          600: '#96702a', // primary action / active state
          700: '#785824',
          800: '#5c441f',
          900: '#3d2e16'
        },
        // "sand" now carries the near-black surfaces and warm-gray text scale.
        sand: {
          50: '#16140f',  // page background (near-black, warm undertone)
          100: '#1e1b15', // card/surface background
          200: '#2c2820'  // borders, dividers, subtle hover fills
        },
        // Warm off-white/gray text scale for legibility on dark surfaces —
        // body copy uses this, never raw gold, so long reading stays comfortable.
        ink: {
          50: '#f7f5f0',
          100: '#e8e3d8',
          300: '#bdb6a6',
          400: '#8f8775', // muted/secondary text
          500: '#6b6456'
        }
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif']
      }
    }
  },
  plugins: []
}
