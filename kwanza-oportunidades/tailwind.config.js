/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef3fb',
          100: '#d9e5f6',
          500: '#1e4a8c',
          600: '#173b73',
          700: '#112d58',
          900: '#0a1c3a',
        },
        accent: { 500: '#0f9d58', 600: '#0b7d46' },
        gold: { 500: '#c9a227' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
